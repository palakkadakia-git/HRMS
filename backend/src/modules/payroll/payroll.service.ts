import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RunPayrollDto } from './dto/run-payroll.dto';
import { UpdatePayslipDto } from './dto/update-payslip.dto';

// ─── Utility helpers ─────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Round up to next multiple of ₹0.50 (as required for ESI) */
function roundUpTo50p(amount: number): number {
  return Math.ceil(amount * 2) / 2;
}

/** Professional Tax (monthly) — state-wise slabs */
function calcPT(grossMonthly: number, ptState: string, month: number): number {
  switch (ptState) {
    case 'MH': {
      if (grossMonthly <= 7500)  return 0;
      if (grossMonthly <= 10000) return 175;
      return month === 2 ? 300 : 200;   // Feb → ₹300 to make annual = ₹2,500
    }
    case 'KA': return grossMonthly > 15000 ? 200 : 0;
    case 'WB': {
      if (grossMonthly <= 10000) return 0;
      if (grossMonthly <= 15000) return 110;
      if (grossMonthly <= 25000) return 130;
      if (grossMonthly <= 40000) return 150;
      return 200;
    }
    case 'TN': return grossMonthly > 21000 ? 208 : 0; // ₹2,500/yr ÷ 12 ≈ ₹208
    default:   return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  // ── Run / generate ──────────────────────────────────────────────────────────

  async runPayroll(dto: RunPayrollDto) {
    const { month, year } = dto;

    // If a DRAFT run already exists for this month, delete it and re-generate
    const existing = await this.prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
    });
    if (existing) {
      if (existing.status !== 'DRAFT') {
        throw new ConflictException(
          `Payroll for ${month}/${year} is already ${existing.status} and cannot be re-generated.`,
        );
      }
      await this.prisma.payrollRun.delete({ where: { id: existing.id } });
    }

    // ── Fetch all data needed ──────────────────────────────────────────────
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0); // last day of month

    const [settings, employees, attendanceRows, advanceRows] = await Promise.all([
      this.prisma.companySettings.findUnique({ where: { id: 'singleton' } }),
      this.prisma.employee.findMany({
        where: { status: { not: 'INACTIVE' } },
        include: {
          siteAssignments: {
            where:   { isPrimary: true },
            include: { site: { select: { id: true, name: true, esiApplicable: true } } },
            take: 1,
          },
          shift: { select: { shiftHours: true } },
          salaryRevisions: {
            where: { effectiveTo: null },
            take: 1,
          },
        },
      }),
      this.prisma.attendance.findMany({ where: { month, year } }),
      // Fetch active ADHOC advances + WEEKLY advances disbursed in this month
      this.prisma.employeeAdvance.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { type: 'ADHOC' },
            {
              type:        'WEEKLY',
              disbursedOn: { gte: monthStart, lte: monthEnd },
            },
          ],
        },
      }),
    ]);

    const pfCeiling  = settings?.pfCeiling  ?? 15000;
    const esiCeiling = settings?.esiCeiling ?? 21000;

    // Index attendance by employeeId for O(1) lookup
    const attMap = new Map(attendanceRows.map((a) => [a.employeeId, a]));

    // Index advances by employeeId
    const advanceMap = new Map<string, typeof advanceRows>();
    for (const adv of advanceRows) {
      if (!advanceMap.has(adv.employeeId)) advanceMap.set(adv.employeeId, []);
      advanceMap.get(adv.employeeId)!.push(adv);
    }

    // ── Create payroll run ────────────────────────────────────────────────
    const run = await this.prisma.payrollRun.create({
      data: { month, year, status: 'DRAFT' },
    });

    // ── Compute payslip for each employee ─────────────────────────────────
    const payslipData: Parameters<typeof this.prisma.payslip.create>[0]['data'][] = [];

    for (const emp of employees) {
      const salary = emp.salaryRevisions[0];
      if (!salary) continue; // no salary revision → skip

      const att = attMap.get(emp.id);
      if (!att) continue;   // no attendance record → skip

      const workingDays = att.workingDays;
      const presentDays = Number(att.presentDays);
      const lopDays     = Number(att.lopDays);
      const otHours     = Number(att.otHours);

      // Pro-rate ratio
      const ratio = workingDays > 0 ? presentDays / workingDays : 0;

      const gross0        = Number(salary.grossSalary);
      const basic0        = Number(salary.basic);
      const hra0          = Number(salary.hra);
      const medical0      = Number(salary.medical);
      const conveyance0   = Number(salary.conveyance);
      const bonus0        = Number(salary.bonus);
      const leaveAllow0   = Number(salary.leaveAllowance);
      const otherAllow0   = Number(salary.otherAllowance);
      const otMultiplier  = Number(salary.otMultiplier ?? 1.5);
      const shiftHours    = emp.shift?.shiftHours ?? 8;

      // Pro-rated earnings
      const basic          = r2(basic0        * ratio);
      const hra            = r2(hra0          * ratio);
      const medical        = r2(medical0      * ratio);
      const conveyance     = r2(conveyance0   * ratio);
      const bonus          = r2(bonus0        * ratio);
      const leaveAllowance = r2(leaveAllow0   * ratio);
      const otherAllowance = r2(otherAllow0   * ratio);

      // OT pay: hourly basic rate × multiplier × OT hours
      //   hourly basic = basic0 / (26 * shiftHours)  [uses full monthly basic]
      const hourlyBasic = basic0 / (26 * shiftHours);
      const otPay       = r2(hourlyBasic * otMultiplier * otHours);

      const gross = r2(basic + hra + medical + conveyance + bonus + leaveAllowance + otherAllowance + otPay);

      // ── EPF ────────────────────────────────────────────────────────────
      let empPF = 0, emplPF = 0, edli = 0, epfAdmin = 0;
      if (!emp.pfExempt) {
        const pfBase = Math.min(basic, pfCeiling); // cap at pfCeiling
        empPF    = r2(pfBase * 0.12);               // employee: 12%
        emplPF   = r2(pfBase * 0.12);               // employer: 12% (3.67% EPF + 8.33% EPS)
        edli     = r2(pfBase * 0.005);              // employer EDLI charge: 0.5%
        epfAdmin = r2(pfBase * 0.005);              // employer admin charge: 0.5%
      }

      // ── ESI ────────────────────────────────────────────────────────────
      const primarySiteForEsi = emp.siteAssignments[0]?.site;
      const esiApplicable = primarySiteForEsi?.esiApplicable ?? true;
      let empESI = 0, emplESI = 0;
      if (esiApplicable && gross <= esiCeiling) {
        empESI  = roundUpTo50p(gross * 0.0075);   // employee: 0.75%
        emplESI = roundUpTo50p(gross * 0.0325);   // employer: 3.25%
      }

      // ── PT ─────────────────────────────────────────────────────────────
      const pt = calcPT(gross, emp.ptState, month);

      // ── Advances ────────────────────────────────────────────────────────
      const empAdvances = advanceMap.get(emp.id) ?? [];
      let advanceDeduction = 0;
      for (const adv of empAdvances) {
        if (adv.type === 'WEEKLY') {
          advanceDeduction += Number(adv.amount); // recover full weekly amount
        } else {
          // ADHOC — recover the installment (capped at remaining balance)
          const installment = Math.min(
            Number(adv.installmentAmount ?? adv.balanceAmount),
            Number(adv.balanceAmount),
          );
          advanceDeduction += installment;
        }
      }
      advanceDeduction = r2(advanceDeduction);

      // ── Totals ─────────────────────────────────────────────────────────
      const tds              = 0;  // TDS computed separately / manually adjusted
      const penaltyDeduction = 0;
      const totalDed = r2(empPF + empESI + pt + tds + penaltyDeduction + advanceDeduction);
      const net      = r2(gross - totalDed);

      payslipData.push({
        payrollRunId: run.id,
        employeeId:   emp.id,
        workingDays,
        presentDays,
        lopDays,
        otHours,
        basic,
        hra,
        medical,
        conveyance,
        bonus,
        leaveAllowance,
        otherAllowance,
        otPay,
        gross,
        empPF,
        empESI,
        pt,
        tds,
        penaltyDeduction,
        advanceDeduction,
        totalDed,
        emplPF,
        emplESI,
        edli,
        epfAdmin,
        net,
      });
    }

    // Bulk insert payslips
    await this.prisma.payslip.createMany({ data: payslipData as any });

    // ── Record advance recoveries ─────────────────────────────────────────
    const createdPayslips = await this.prisma.payslip.findMany({
      where:  { payrollRunId: run.id },
      select: { id: true, employeeId: true, advanceDeduction: true },
    });
    const payslipByEmp = new Map(createdPayslips.map(ps => [ps.employeeId, ps]));

    for (const [empId, advances] of advanceMap.entries()) {
      const ps = payslipByEmp.get(empId);
      if (!ps) continue;

      for (const adv of advances) {
        let recoveryAmount: number;
        if (adv.type === 'WEEKLY') {
          recoveryAmount = Number(adv.amount);
        } else {
          recoveryAmount = Math.min(
            Number(adv.installmentAmount ?? adv.balanceAmount),
            Number(adv.balanceAmount),
          );
        }

        const newBalance = r2(Number(adv.balanceAmount) - recoveryAmount);

        // Create recovery record
        await this.prisma.advanceRecovery.create({
          data: {
            advanceId:    adv.id,
            amount:       recoveryAmount,
            month,
            year,
            payrollRunId: run.id,
            note:         adv.type === 'WEEKLY' ? 'Weekly advance recovery' : 'Installment recovery',
          },
        });

        // Update advance balance and status
        await this.prisma.employeeAdvance.update({
          where: { id: adv.id },
          data: {
            balanceAmount: newBalance,
            status: newBalance <= 0 ? 'RECOVERED' : 'ACTIVE',
          },
        });
      }
    }

    // ── Compute site allocations for each payslip ─────────────────────────
    const allPayslips = await this.prisma.payslip.findMany({
      where: { payrollRunId: run.id },
      include: {
        employee: {
          select: {
            pfExempt: true, ptState: true,
            siteAssignments: { where: { isPrimary: true }, include: { site: true }, take: 1 },
          },
        },
      },
    });

    const siteSummaries = await this.prisma.attendanceSiteSummary.findMany({
      where: { month, year },
      include: { site: { select: { id: true, name: true, state: true, esiApplicable: true } } },
    });
    const summaryMap = new Map<string, typeof siteSummaries>();
    for (const s of siteSummaries) {
      if (!summaryMap.has(s.employeeId)) summaryMap.set(s.employeeId, []);
      summaryMap.get(s.employeeId)!.push(s);
    }

    const allocationData: any[] = [];

    for (const ps of allPayslips) {
      const salary = employees.find((e) => e.id === ps.employeeId)?.salaryRevisions[0];
      if (!salary) continue;

      const att = attMap.get(ps.employeeId);
      if (!att) continue;

      const workingDays    = att.workingDays;
      const totalPresent   = Number(att.presentDays);
      const otMultiplier   = Number(salary.otMultiplier ?? 1.5);
      const shiftHours     = employees.find((e) => e.id === ps.employeeId)?.shift?.shiftHours ?? 8;
      const empPfExempt    = ps.employee.pfExempt;
      const primarySite    = ps.employee.siteAssignments[0]?.site;

      const siteSummary    = summaryMap.get(ps.employeeId) ?? [];

      // Days with no site captured → allocate to primary site (null key in siteSummary)
      // We produce one PayslipSiteAllocation per site that had logged days
      // If no site summaries at all → one row for primary site with full days
      const allocations: { siteId: string | null; siteName: string | null; siteState: string | null; esiApplicable: boolean; presentDays: number; otHours: number }[] = [];

      if (siteSummary.length === 0) {
        allocations.push({
          siteId: primarySite?.id ?? null,
          siteName: primarySite?.name ?? null,
          siteState: primarySite?.state ?? null,
          esiApplicable: primarySite?.esiApplicable ?? true,
          presentDays: totalPresent,
          otHours: Number(att.otHours),
        });
      } else {
        let allocatedDays = 0;
        for (const s of siteSummary) {
          const site = s.site ?? primarySite;
          allocations.push({
            siteId:        s.siteId ?? primarySite?.id ?? null,
            siteName:      site?.name ?? null,
            siteState:     site?.state ?? null,
            esiApplicable: site?.esiApplicable ?? true,
            presentDays:   Number(s.presentDays),
            otHours:       Number(s.otHours),
          });
          allocatedDays += Number(s.presentDays);
        }
        // Any gap (leaves / manual days not captured at a site) → primary site
        const unallocated = Math.max(0, totalPresent - allocatedDays);
        if (unallocated > 0) {
          const existing = allocations.find((a) => a.siteId === (primarySite?.id ?? null));
          if (existing) {
            existing.presentDays += unallocated;
          } else {
            allocations.push({
              siteId: primarySite?.id ?? null,
              siteName: primarySite?.name ?? null,
              siteState: primarySite?.state ?? null,
              esiApplicable: primarySite?.esiApplicable ?? true,
              presentDays: unallocated,
              otHours: 0,
            });
          }
        }
      }

      // Re-calculate per site
      for (const alloc of allocations) {
        if (alloc.presentDays <= 0 && alloc.otHours <= 0) continue;

        const ratio = workingDays > 0 ? alloc.presentDays / workingDays : 0;

        const basic          = r2(Number(salary.basic)          * ratio);
        const hra            = r2(Number(salary.hra)            * ratio);
        const medical        = r2(Number(salary.medical)        * ratio);
        const conveyance     = r2(Number(salary.conveyance)     * ratio);
        const bonus          = r2(Number(salary.bonus)          * ratio);
        const leaveAllowance = r2(Number(salary.leaveAllowance) * ratio);
        const otherAllowance = r2(Number(salary.otherAllowance) * ratio);

        const hourlyBasic = Number(salary.basic) / (26 * shiftHours);
        const otPay       = r2(hourlyBasic * otMultiplier * alloc.otHours);
        const gross       = r2(basic + hra + medical + conveyance + bonus + leaveAllowance + otherAllowance + otPay);

        let empPF = 0, emplPF = 0, edli = 0, epfAdmin = 0;
        if (!empPfExempt) {
          const pfBase = Math.min(basic, pfCeiling);
          empPF    = r2(pfBase * 0.12);
          emplPF   = r2(pfBase * 0.12);
          edli     = r2(pfBase * 0.005);
          epfAdmin = r2(pfBase * 0.005);
        }

        let empESI = 0, emplESI = 0;
        if (alloc.esiApplicable && gross <= esiCeiling) {
          empESI  = roundUpTo50p(gross * 0.0075);
          emplESI = roundUpTo50p(gross * 0.0325);
        }

        const pt = calcPT(gross, alloc.siteState ?? ps.employee.ptState, month);

        const totalCost = r2(gross + emplPF + emplESI + edli + epfAdmin);

        allocationData.push({
          payslipId:     ps.id,
          siteId:        alloc.siteId,
          siteName:      alloc.siteName,
          presentDays:   alloc.presentDays,
          otHours:       alloc.otHours,
          basic, hra, medical, conveyance, bonus, leaveAllowance, otherAllowance, otPay, gross,
          empPF, empESI, pt,
          emplPF, emplESI, edli, epfAdmin,
          totalCost,
        });
      }
    }

    if (allocationData.length > 0) {
      await this.prisma.payslipSiteAllocation.createMany({ data: allocationData });
    }

    return this.prisma.payrollRun.findUnique({
      where: { id: run.id },
      include: { _count: { select: { payslips: true } } },
    });
  }

  // ── List runs ───────────────────────────────────────────────────────────────

  findAllRuns() {
    return this.prisma.payrollRun.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: { _count: { select: { payslips: true } } },
    });
  }

  async findRunById(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { _count: { select: { payslips: true } } },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  // ── Payslips for a run ──────────────────────────────────────────────────────

  async findPayslips(runId: string) {
    await this.findRunById(runId);
    return this.prisma.payslip.findMany({
      where: { payrollRunId: runId },
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            designation: true, pfExempt: true, ptState: true,
            bankAccount: true, bankName: true, ifsc: true,
            siteAssignments: {
              where: { isPrimary: true },
              include: { site: { select: { name: true, city: true, esiApplicable: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { employee: { employeeCode: 'asc' } },
    });
  }

  // ── Single payslip ──────────────────────────────────────────────────────────

  async findPayslip(id: string) {
    const ps = await this.prisma.payslip.findUnique({
      where: { id },
      include: {
        payrollRun: true,
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            designation: true, pfExempt: true, ptState: true,
            bankAccount: true, bankName: true, ifsc: true,
            epfNumber: true, uanNumber: true, esiNumber: true, panNumber: true,
            siteAssignments: {
              where: { isPrimary: true },
              include: { site: { select: { name: true, city: true, esiApplicable: true } } },
              take: 1,
            },
          },
        },
      },
    });
    if (!ps) throw new NotFoundException('Payslip not found');
    return ps;
  }

  // ── Update payslip (manual adjustments) ────────────────────────────────────

  async updatePayslip(id: string, dto: UpdatePayslipDto) {
    const ps = await this.prisma.payslip.findUnique({ where: { id } });
    if (!ps) throw new NotFoundException('Payslip not found');

    const run = await this.prisma.payrollRun.findUnique({ where: { id: ps.payrollRunId } });
    if (run?.status !== 'DRAFT') {
      throw new BadRequestException('Cannot edit a payslip once payroll is no longer in DRAFT status.');
    }

    const tds              = dto.tds              ?? Number(ps.tds);
    const penaltyDeduction = dto.penaltyDeduction ?? Number(ps.penaltyDeduction);
    const advanceDeduction = dto.advanceDeduction ?? Number(ps.advanceDeduction);

    const totalDed = r2(
      Number(ps.empPF) + Number(ps.empESI) + Number(ps.pt) +
      tds + penaltyDeduction + advanceDeduction,
    );
    const net = r2(Number(ps.gross) - totalDed);

    return this.prisma.payslip.update({
      where: { id },
      data: { tds, penaltyDeduction, advanceDeduction, totalDed, net },
    });
  }

  // ── Finalize / status transitions ───────────────────────────────────────────

  async finalizeRun(id: string) {
    const run = await this.findRunById(id);
    if (run.status !== 'DRAFT') {
      throw new BadRequestException(`Run is already ${run.status}.`);
    }
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'PROCESSED' },
    });
  }

  async approveRun(id: string) {
    const run = await this.findRunById(id);
    if (run.status !== 'PROCESSED') {
      throw new BadRequestException(`Run must be PROCESSED before approval (current: ${run.status}).`);
    }
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async markPaid(id: string) {
    const run = await this.findRunById(id);
    if (run.status !== 'APPROVED') {
      throw new BadRequestException(`Run must be APPROVED before marking PAID (current: ${run.status}).`);
    }
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'PAID' },
    });
  }

  // ── Delete DRAFT run ────────────────────────────────────────────────────────

  async deleteRun(id: string) {
    const run = await this.findRunById(id);
    if (run.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT payroll runs can be deleted.');
    }

    // Reverse any advance recoveries tied to this run
    const recoveries = await this.prisma.advanceRecovery.findMany({
      where: { payrollRunId: id },
    });
    for (const rec of recoveries) {
      await this.prisma.employeeAdvance.update({
        where: { id: rec.advanceId },
        data: {
          balanceAmount: { increment: Number(rec.amount) },
          status: 'ACTIVE',
        },
      });
    }

    await this.prisma.payrollRun.delete({ where: { id } });
    return { message: 'Payroll run deleted.' };
  }

  // ── Site cost report ────────────────────────────────────────────────────────

  async getSiteCostReport(runId: string) {
    await this.findRunById(runId);
    const allocations = await this.prisma.payslipSiteAllocation.findMany({
      where: { payslip: { payrollRunId: runId } },
      include: {
        payslip: {
          select: {
            employee: {
              select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true },
            },
          },
        },
      },
      orderBy: [{ siteName: 'asc' }, { payslip: { employee: { employeeCode: 'asc' } } }],
    });

    // Group by site for summary totals
    const siteTotals = new Map<string, {
      siteName: string | null;
      count: number;
      totalGross: number;
      totalEmpPF: number;
      totalEmpESI: number;
      totalPT: number;
      totalEmplPF: number;
      totalEmplESI: number;
      totalEdli: number;
      totalEpfAdmin: number;
      totalCost: number;
    }>();

    for (const a of allocations) {
      const key = a.siteId ?? '__unallocated__';
      if (!siteTotals.has(key)) {
        siteTotals.set(key, {
          siteName: a.siteName, count: 0,
          totalGross: 0, totalEmpPF: 0, totalEmpESI: 0, totalPT: 0,
          totalEmplPF: 0, totalEmplESI: 0, totalEdli: 0, totalEpfAdmin: 0, totalCost: 0,
        });
      }
      const t = siteTotals.get(key)!;
      t.count++;
      t.totalGross   += Number(a.gross);
      t.totalEmpPF   += Number(a.empPF);
      t.totalEmpESI  += Number(a.empESI);
      t.totalPT      += Number(a.pt);
      t.totalEmplPF  += Number(a.emplPF);
      t.totalEmplESI += Number(a.emplESI);
      t.totalEdli    += Number(a.edli);
      t.totalEpfAdmin+= Number(a.epfAdmin);
      t.totalCost    += Number(a.totalCost);
    }

    return {
      allocations,
      siteSummaries: [...siteTotals.entries()].map(([siteId, t]) => ({
        siteId: siteId === '__unallocated__' ? null : siteId,
        ...t,
      })),
    };
  }

  // ── Summary stats for a run ─────────────────────────────────────────────────

  async getRunSummary(id: string) {
    await this.findRunById(id);
    const payslips = await this.prisma.payslip.findMany({ where: { payrollRunId: id } });

    const sum = (key: keyof typeof payslips[0]) =>
      payslips.reduce((acc, p) => acc + Number(p[key]), 0);

    return {
      count:           payslips.length,
      totalGross:      r2(sum('gross')),
      totalEmpPF:      r2(sum('empPF')),
      totalEmpESI:     r2(sum('empESI')),
      totalPT:         r2(sum('pt')),
      totalTDS:        r2(sum('tds')),
      totalPenalty:    r2(sum('penaltyDeduction')),
      totalAdvance:    r2(sum('advanceDeduction')),
      totalDeductions: r2(sum('totalDed')),
      totalNet:        r2(sum('net')),
      totalEmplPF:     r2(sum('emplPF')),
      totalEmplESI:    r2(sum('emplESI')),
      totalEdli:       r2(sum('edli')),
      totalEpfAdmin:   r2(sum('epfAdmin')),
    };
  }
}
