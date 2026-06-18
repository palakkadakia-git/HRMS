import { Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Month label helper ───────────────────────────────────────────────────────
const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthLabel(month: number, year: number) {
  return `${MONTHS[month] ?? month} ${year}`;
}

// ─── Excel styling helpers ────────────────────────────────────────────────────

/** Set column widths on a worksheet */
function setCols(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(wch => ({ wch }));
}

/** Create a workbook and stream as buffer */
function toBuffer(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ── Shared: fetch payslips with employee detail ──────────────────────────────

  private async getPayslips(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');

    const payslips = await this.prisma.payslip.findMany({
      where:   { payrollRunId: runId },
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName:    true,
            lastName:     true,
            designation:  true,
            epfNumber:    true,
            uanNumber:    true,
            esiNumber:    true,
            panNumber:    true,
            bankName:     true,
            bankAccount:  true,
            ifsc:         true,
            pfExempt:     true,
            ptState:      true,
            siteAssignments: {
              where:   { isPrimary: true },
              include: { site: { select: { name: true, esiApplicable: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ employee: { employeeCode: 'asc' } }],
    });

    return { run, payslips };
  }

  // ── 1. Salary Register ───────────────────────────────────────────────────────

  async salaryRegister(runId: string): Promise<Buffer> {
    const { run, payslips } = await this.getPayslips(runId);
    const label = monthLabel(run.month, run.year);

    const headers = [
      'S.No', 'Emp Code', 'Employee Name', 'Designation', 'Site',
      'Working Days', 'Present Days', 'LOP Days', 'OT Hours',
      // Earnings
      'Basic', 'HRA', 'Medical', 'Conveyance', 'Bonus', 'Leave Allow.',
      'Other Allow.', 'OT Pay', 'Gross',
      // Deductions
      'Emp PF', 'Emp ESI', 'Prof. Tax', 'TDS', 'Penalty', 'Advance',
      'Total Deductions',
      // Net
      'Net Pay',
    ];

    const rows = payslips.map((p, i) => {
      const emp     = p.employee;
      const site    = emp.siteAssignments[0]?.site?.name ?? '—';
      const name    = `${emp.firstName} ${emp.lastName}`;

      return [
        i + 1,
        emp.employeeCode,
        name,
        emp.designation ?? '—',
        site,
        p.workingDays,
        Number(p.presentDays),
        Number(p.lopDays),
        Number(p.otHours),
        // Earnings
        Number(p.basic),
        Number(p.hra),
        Number(p.medical),
        Number(p.conveyance),
        Number(p.bonus),
        Number(p.leaveAllowance),
        Number(p.otherAllowance),
        Number(p.otPay),
        Number(p.gross),
        // Deductions
        Number(p.empPF),
        Number(p.empESI),
        Number(p.pt),
        Number(p.tds),
        Number(p.penaltyDeduction),
        Number(p.advanceDeduction),
        Number(p.totalDed),
        // Net
        Number(p.net),
      ];
    });

    // Totals row
    const totals: (string | number)[] = ['', '', '', '', '', '', '', '', ''];
    const numCols = headers.length - 9; // numeric columns from index 9
    for (let c = 9; c < headers.length; c++) {
      const colTotal = payslips.reduce((sum, p) => {
        const keys: (keyof typeof p)[] = [
          'basic', 'hra', 'medical', 'conveyance', 'bonus',
          'leaveAllowance', 'otherAllowance', 'otPay', 'gross',
          'empPF', 'empESI', 'pt', 'tds', 'penaltyDeduction',
          'advanceDeduction', 'totalDed', 'net',
        ];
        return sum + Number(p[keys[c - 9]]);
      }, 0);
      totals.push(Math.round(colTotal * 100) / 100);
    }

    const ws = XLSX.utils.aoa_to_sheet([
      [`SALARY REGISTER — ${label}`],
      [],
      headers,
      ...rows,
      totals.map((v, i) => (i === 0 ? 'TOTAL' : v)),
    ]);

    setCols(ws, [5, 12, 22, 18, 16, 10, 10, 8, 8,
      10, 8, 8, 10, 8, 10, 10, 8, 10,
      8, 8, 8, 6, 8, 8, 12, 10]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Register');
    return toBuffer(wb);
  }

  // ── 2. Bank Transfer Statement ───────────────────────────────────────────────

  async bankStatement(runId: string): Promise<Buffer> {
    const { run, payslips } = await this.getPayslips(runId);
    const label = monthLabel(run.month, run.year);

    const headers = [
      'S.No', 'Emp Code', 'Employee Name', 'Bank Name',
      'Account Number', 'IFSC Code', 'Net Amount (₹)',
    ];

    const rows = payslips.map((p, i) => {
      const emp  = p.employee;
      const name = `${emp.firstName} ${emp.lastName}`;
      return [
        i + 1,
        emp.employeeCode,
        name,
        emp.bankName    ?? '',
        emp.bankAccount ?? '',
        emp.ifsc        ?? '',
        Number(p.net),
      ];
    });

    const totalNet = payslips.reduce((s, p) => s + Number(p.net), 0);

    const ws = XLSX.utils.aoa_to_sheet([
      [`BANK TRANSFER STATEMENT — ${label}`],
      [],
      headers,
      ...rows,
      ['', '', 'TOTAL', '', '', '', Math.round(totalNet * 100) / 100],
    ]);

    setCols(ws, [5, 12, 22, 18, 20, 14, 14]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Transfer');
    return toBuffer(wb);
  }

  // ── 3. PF Contribution Statement ─────────────────────────────────────────────

  async pfStatement(runId: string): Promise<Buffer> {
    const { run, payslips } = await this.getPayslips(runId);
    const label = monthLabel(run.month, run.year);

    // Only employees who are NOT PF-exempt
    const pfPayslips = payslips.filter(p => !p.employee.pfExempt);

    const settings = await this.prisma.companySettings.findUnique({
      where: { id: 'singleton' },
      select: { pfCeiling: true },
    });
    const pfCeiling = settings?.pfCeiling ?? 15000;

    const headers = [
      'S.No', 'UAN', 'Emp Code', 'Employee Name', 'Designation',
      'EPF Wages', 'EPS Wages',
      'Emp EPF (12%)', 'Empl EPF (3.67%)', 'EPS (8.33%)',
      'EDLI (0.5%)', 'Admin (0.5%)',
      'Total Empl', 'Total Contribution',
    ];

    const rows = pfPayslips.map((p, i) => {
      const emp      = p.employee;
      const name     = `${emp.firstName} ${emp.lastName}`;
      const epfWages = Math.min(Number(p.basic), pfCeiling);
      const epsWages = Math.min(epfWages, 15000); // EPS capped at ₹15,000

      const empEPF   = Number(p.empPF);           // 12%
      const emplEPF  = Number(p.emplPF);          // 12% employer
      const eps      = Math.round(epsWages * 0.0833 * 100) / 100;   // 8.33%
      const epfOnly  = Math.round((emplEPF - eps) * 100) / 100;     // 3.67% diff
      const edli     = Number(p.edli);
      const admin    = Number(p.epfAdmin);
      const totalEmpl = Math.round((emplEPF + edli + admin) * 100) / 100;
      const totalContrib = Math.round((empEPF + totalEmpl) * 100) / 100;

      return [
        i + 1,
        emp.uanNumber    ?? '',
        emp.employeeCode,
        name,
        emp.designation  ?? '—',
        epfWages,
        epsWages,
        empEPF,
        epfOnly,
        eps,
        edli,
        admin,
        totalEmpl,
        totalContrib,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      [`PF CONTRIBUTION STATEMENT — ${label}`],
      [`PF Ceiling: ₹${pfCeiling}`],
      [],
      headers,
      ...rows,
    ]);

    setCols(ws, [5, 14, 12, 22, 18, 10, 10, 12, 13, 10, 10, 10, 10, 14]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PF Statement');
    return toBuffer(wb);
  }

  // ── 4. ESI Contribution Statement ────────────────────────────────────────────

  async esiStatement(runId: string): Promise<Buffer> {
    const { run, payslips } = await this.getPayslips(runId);
    const label = monthLabel(run.month, run.year);

    // Only employees with ESI deducted (empESI > 0)
    const esiPayslips = payslips.filter(p => Number(p.empESI) > 0);

    const headers = [
      'S.No', 'ESI Number', 'Emp Code', 'Employee Name', 'Designation', 'Site',
      'IP Wages (Gross)', 'Emp ESI (0.75%)', 'Empl ESI (3.25%)', 'Total ESI',
    ];

    const rows = esiPayslips.map((p, i) => {
      const emp      = p.employee;
      const name     = `${emp.firstName} ${emp.lastName}`;
      const site     = emp.siteAssignments[0]?.site?.name ?? '—';
      const empESI   = Number(p.empESI);
      const emplESI  = Number(p.emplESI);
      const total    = Math.round((empESI + emplESI) * 100) / 100;

      return [
        i + 1,
        emp.esiNumber ?? '',
        emp.employeeCode,
        name,
        emp.designation ?? '—',
        site,
        Number(p.gross),
        empESI,
        emplESI,
        total,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      [`ESI CONTRIBUTION STATEMENT — ${label}`],
      [],
      headers,
      ...rows,
    ]);

    setCols(ws, [5, 16, 12, 22, 18, 16, 14, 14, 14, 10]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ESI Statement');
    return toBuffer(wb);
  }
}
