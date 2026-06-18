import { Injectable, NotFoundException } from '@nestjs/common';
import { SkillLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalaryRevisionDto } from './dto/create-salary-revision.dto';

// ─── Salary calculation engine ────────────────────────────────────────────────
//
//  Rules:
//    basic          = round(max(gross × 0.50, min_wage_for_site_and_skill))
//    bonus          = round(basic × 0.0833)            ← Payment of Bonus Act, always
//    leaveAllow     = round(basic × 0.05)
//    avail₁         = gross − basic − bonus − leaveAllow   ← gross remaining after mandatory items
//    hra            = round(max(min(basic × 0.40, avail₁), 0))
//    avail₂         = avail₁ − hra
//    medical        = round(max(min(1250, avail₂), 0))
//    avail₃         = avail₂ − medical
//    conveyance     = round(max(min(1600, avail₃), 0))
//    otherAllowance = gross − basic − bonus − leaveAllow − hra − medical − conveyance
//
//  Note: when minWage > gross × 0.50 (minimum wage is binding), avail₁ will be small
//  or zero, so HRA / medical / conveyance / otherAllowance naturally collapse to 0.
//
//  minWage defaults to 0 when the employee has no primary site, no designation,
//  or no minimum wage entry for the combination — basic = gross × 0.50 in that case.

export interface SalaryComponents {
  grossSalary:    number;
  basic:          number;
  hra:            number;
  medical:        number;
  conveyance:     number;
  bonus:          number;
  leaveAllowance: number;
  otherAllowance: number;
}

export function calcSalaryComponents(gross: number, minWage = 0): SalaryComponents {
  const basic        = Math.round(Math.max(gross * 0.50, minWage));
  const bonus        = Math.round(basic * 0.0833);
  const leaveAllow   = Math.round(basic * 0.05);
  // Remainder of gross after allocating mandatory items — this is what's available
  // for HRA, medical, conveyance.  Using (gross − basic − bonus − leaveAllow) instead
  // of (basic − bonus − leaveAllow) ensures that when minWage forces basic above 50%
  // of gross the remaining allowances gracefully collapse to zero rather than
  // overflowing into a negative otherAllowance.
  const avail1       = gross - basic - bonus - leaveAllow;
  const hra          = Math.round(Math.max(Math.min(basic * 0.40, avail1), 0));
  const avail2       = avail1 - hra;
  const medical      = Math.round(Math.max(Math.min(1250, avail2), 0));
  const avail3       = avail2 - medical;
  const conveyance   = Math.round(Math.max(Math.min(1600, avail3), 0));
  const otherAllow   = gross - basic - bonus - leaveAllow - hra - medical - conveyance;

  return {
    grossSalary:    gross,
    basic,
    hra,
    medical,
    conveyance,
    bonus,
    leaveAllowance: leaveAllow,
    otherAllowance: otherAllow,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SalaryRevisionsService {
  constructor(private prisma: PrismaService) {}

  async findAllForEmployee(employeeId: string) {
    await this.requireEmployee(employeeId);
    return this.prisma.salaryRevision.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async findActive(employeeId: string) {
    await this.requireEmployee(employeeId);
    return this.prisma.salaryRevision.findFirst({
      where: { employeeId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /** Preview breakdown for a specific employee (uses their site + designation for minWage). */
  async previewForEmployee(employeeId: string, grossSalary: number): Promise<SalaryComponents> {
    await this.requireEmployee(employeeId);
    const minWage = await this.resolveMinWage(employeeId);
    return calcSalaryComponents(grossSalary, minWage);
  }

  /** Generic preview with an explicit minWage (or 0 if omitted). */
  previewRaw(grossSalary: number, minWage = 0): SalaryComponents {
    return calcSalaryComponents(grossSalary, minWage);
  }

  async create(employeeId: string, dto: CreateSalaryRevisionDto) {
    await this.requireEmployee(employeeId);
    const effectiveFrom = new Date(dto.effectiveFrom);

    // Resolve minimum wage for this employee's site + designation
    const minWage = await this.resolveMinWage(employeeId);
    const comps   = calcSalaryComponents(dto.grossSalary, minWage);

    // Close the currently-active revision (set effectiveTo to the day before new one)
    const active = await this.prisma.salaryRevision.findFirst({
      where: { employeeId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (active) {
      const dayBefore = new Date(effectiveFrom);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await this.prisma.salaryRevision.update({
        where: { id: active.id },
        data:  { effectiveTo: dayBefore },
      });
    }

    return this.prisma.salaryRevision.create({
      data: {
        employeeId,
        effectiveFrom,
        effectiveTo:    null,
        grossSalary:    comps.grossSalary,
        basic:          comps.basic,
        hra:            comps.hra,
        medical:        comps.medical,
        conveyance:     comps.conveyance,
        bonus:          comps.bonus,
        leaveAllowance: comps.leaveAllowance,
        otherAllowance: comps.otherAllowance,
        otMultiplier:   dto.otMultiplier ?? 1.5,
        remarks:        dto.remarks ?? null,
      },
    });
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  /**
   * Resolve the applicable minimum monthly wage for an employee.
   * Returns 0 if any piece of data is missing (graceful fallback → basic = gross × 0.50).
   */
  private async resolveMinWage(employeeId: string): Promise<number> {
    // 1. Get primary site and designation string
    const emp = await this.prisma.employee.findUnique({
      where:  { id: employeeId },
      select: {
        designation:     true,
        siteAssignments: {
          where:  { isPrimary: true },
          take:   1,
          select: { siteId: true },
        },
      },
    });

    const siteId      = emp?.siteAssignments[0]?.siteId ?? null;
    const designation = emp?.designation ?? null;
    if (!siteId || !designation) return 0;

    // 2. Look up skill level from designation master
    const desigRow = await this.prisma.designationMaster.findFirst({
      where:  { designation },
      select: { skillLevel: true },
    });
    const skillLevel: SkillLevel | null = desigRow?.skillLevel ?? null;
    if (!skillLevel) return 0;

    // 3. Find the currently-active minimum wage (effectiveTo = null)
    const mw = await this.prisma.minimumWage.findFirst({
      where:   { siteId, skillLevel, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
      select:  { monthlyWage: true },
    });

    return mw ? Number(mw.monthlyWage) : 0;
  }

  private async requireEmployee(employeeId: string) {
    const emp = await this.prisma.employee.findUnique({
      where:  { id: employeeId },
      select: { id: true },
    });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);
  }
}
