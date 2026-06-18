import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveType } from '@prisma/client';
import { CreateShiftDto } from './dto/shift.dto';
import { CreateHolidayDto } from './dto/holiday.dto';
import { CreateLeaveRecordDto } from './dto/leave.dto';
import { RunAutoFillDto } from './dto/run-autofill.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import ExcelJS from 'exceljs';

// ── Date helpers ──────────────────────────────────────────────────────────────

/** UTC midnight Date for a given year/month/day */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** "YYYY-MM-DD" string from a Date */
function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Days in a given month */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add N calendar months to a date, return UTC midnight */
function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCMonth(result.getUTCMonth() + n);
  result.setUTCDate(1); // normalise to 1st to avoid day-overflow
  return result;
}

// ── Auto-fill engine ──────────────────────────────────────────────────────────

interface DayResult {
  present: number;  // 0, 0.5, or 1
  ot: number;       // hours
}

function computeSundayOT(loggedHours: number, shiftHours: number): number {
  if (loggedHours <= 0) return 0;
  if (loggedHours < 6) return loggedHours;
  return shiftHours + (loggedHours - 6);
}

function computeRegularDay(loggedHours: number, shiftHours: number): DayResult {
  const halfShift = shiftHours / 2;
  const fullGrace = shiftHours - 0.5;

  if (loggedHours >= fullGrace) {
    return { present: 1, ot: Math.max(0, loggedHours - shiftHours) };
  }
  if (loggedHours >= halfShift) {
    return { present: 0.5, ot: 0 };
  }
  return { present: 0, ot: 0 };
}

function loggedHours(punchIn: Date | null, punchOut: Date | null): number {
  if (!punchIn || !punchOut) return 0;
  return (punchOut.getTime() - punchIn.getTime()) / 3_600_000;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // ── Shifts ────────────────────────────────────────────────────────────────

  async createShift(dto: CreateShiftDto) {
    return this.prisma.shift.create({ data: dto });
  }

  async findAllShifts() {
    return this.prisma.shift.findMany({ orderBy: { shiftHours: 'asc' } });
  }

  async updateShift(id: string, dto: Partial<CreateShiftDto>) {
    await this.getShift(id);
    return this.prisma.shift.update({ where: { id }, data: dto });
  }

  async removeShift(id: string) {
    await this.getShift(id);
    return this.prisma.shift.delete({ where: { id } });
  }

  private async getShift(id: string) {
    const s = await this.prisma.shift.findUnique({ where: { id } });
    if (!s) throw new NotFoundException(`Shift ${id} not found`);
    return s;
  }

  // ── Holidays ──────────────────────────────────────────────────────────────

  async createHoliday(dto: CreateHolidayDto) {
    return this.prisma.holiday.create({
      data: { ...dto, date: new Date(dto.date) },
    });
  }

  async findHolidaysByYear(year: number, siteId?: string) {
    const where: any = { year };
    if (siteId) {
      // Return holidays that apply to this site: global (null) OR site-specific
      where.OR = [{ siteId: null }, { siteId }];
    }
    return this.prisma.holiday.findMany({
      where,
      include: { site: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });
  }

  async updateHoliday(id: string, dto: Partial<CreateHolidayDto>) {
    await this.getHoliday(id);
    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.holiday.update({ where: { id }, data });
  }

  async removeHoliday(id: string) {
    await this.getHoliday(id);
    return this.prisma.holiday.delete({ where: { id } });
  }

  private async getHoliday(id: string) {
    const h = await this.prisma.holiday.findUnique({ where: { id } });
    if (!h) throw new NotFoundException(`Holiday ${id} not found`);
    return h;
  }

  // ── Leave Records ─────────────────────────────────────────────────────────

  async createLeaveRecord(dto: CreateLeaveRecordDto) {
    return this.prisma.leaveRecord.create({
      data: { ...dto, date: new Date(dto.date) },
    });
  }

  async getLeaveRecords(employeeId: string, month?: number, year?: number) {
    const where: any = { employeeId };
    if (month && year) {
      const start = utcDate(year, month, 1);
      const end   = utcDate(year, month, daysInMonth(year, month));
      where.date  = { gte: start, lte: end };
    }
    return this.prisma.leaveRecord.findMany({ where, orderBy: { date: 'asc' } });
  }

  async updateLeaveRecord(id: string, dto: Partial<CreateLeaveRecordDto>) {
    const rec = await this.prisma.leaveRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException(`Leave record ${id} not found`);
    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.leaveRecord.update({ where: { id }, data });
  }

  async removeLeaveRecord(id: string) {
    const rec = await this.prisma.leaveRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException(`Leave record ${id} not found`);
    return this.prisma.leaveRecord.delete({ where: { id } });
  }

  // ── Leave Balances ────────────────────────────────────────────────────────

  /** Compute available balances (allocated minus used-from-records) for display */
  async getLeaveBalance(employeeId: string, year: number) {
    const balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId, year } },
    });

    const usedAgg = await this.prisma.leaveRecord.groupBy({
      by: ['leaveType'],
      where: { employeeId, date: { gte: utcDate(year, 1, 1), lte: utcDate(year, 12, 31) } },
      _sum: { days: true },
    });

    const used = { PL: 0, CL: 0, SL: 0, LWP: 0 };
    for (const row of usedAgg) {
      used[row.leaveType] = Number(row._sum.days ?? 0);
    }

    return {
      year,
      plAccrued:    Number(balance?.plAccrued   ?? 0),
      clAllocated:  Number(balance?.clAllocated ?? 0),
      slAllocated:  Number(balance?.slAllocated ?? 0),
      plAvailable:  Math.max(0, Number(balance?.plAccrued   ?? 0) - used.PL),
      clAvailable:  Math.max(0, Number(balance?.clAllocated ?? 0) - used.CL),
      slAvailable:  Math.max(0, Number(balance?.slAllocated ?? 0) - used.SL),
      lwpDays:      used.LWP,
    };
  }

  async getAllLeaveBalances(year: number) {
    const employees = await this.prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] } },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true,
                dateOfJoining: true },
      orderBy: { firstName: 'asc' },
    });

    return Promise.all(
      employees.map(async (e) => ({
        employee: e,
        balance: await this.getLeaveBalance(e.id, year),
      })),
    );
  }

  /**
   * Allocate annual CL and SL for all STAFF employees.
   * Pro-rated (ceiling) for joiners mid-year.
   * PL starts at 0 — it accrues monthly via accrueMonthlyPL().
   * Should be run once at the start of each year (Jan 1), or when a new employee joins.
   */
  async allocateAnnualLeaves(year: number) {
    const staffDesignations = await this.prisma.designationMaster.findMany({
      where: { skillLevel: 'STAFF' },
      select: { designation: true },
    });
    const staffDesigSet = new Set(staffDesignations.map((d) => d.designation));

    const employees = await this.prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] } },
      select: { id: true, designation: true, dateOfJoining: true },
    });

    const results: any[] = [];
    for (const emp of employees) {
      if (!emp.designation || !staffDesigSet.has(emp.designation)) continue;

      // Months remaining in the year from join date (or full year if joined before)
      const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
      const joinYear  = joinDate?.getUTCFullYear() ?? year - 1;
      const joinMonth = joinDate?.getUTCMonth() ?? 0; // 0-indexed

      let monthsRemaining = 12;
      if (joinYear === year) {
        monthsRemaining = 12 - joinMonth; // months from join month to Dec
      }

      const clAllocated = Math.ceil((10 * monthsRemaining) / 12);
      const slAllocated = Math.ceil((5  * monthsRemaining) / 12);

      const result = await this.prisma.leaveBalance.upsert({
        where: { employeeId_year: { employeeId: emp.id, year } },
        create: { employeeId: emp.id, year, clAllocated, slAllocated, plAccrued: 0 },
        update: { clAllocated, slAllocated },
      });
      results.push(result);
    }

    return { year, allocated: results.length };
  }

  /**
   * Accrue 1.25 PL at end of each month for STAFF employees.
   * Skips employees in their first month (accrual starts from the month AFTER joining).
   * PL is only usable after 3 calendar months from DOJ.
   */
  async accrueMonthlyPL(month: number, year: number) {
    const staffDesignations = await this.prisma.designationMaster.findMany({
      where: { skillLevel: 'STAFF' },
      select: { designation: true },
    });
    const staffDesigSet = new Set(staffDesignations.map((d) => d.designation));

    const employees = await this.prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] } },
      select: { id: true, designation: true, dateOfJoining: true },
    });

    let accrued = 0;
    for (const emp of employees) {
      if (!emp.designation || !staffDesigSet.has(emp.designation)) continue;
      if (!emp.dateOfJoining) continue;

      const doj = new Date(emp.dateOfJoining);
      // Accrual starts the month AFTER joining — skip if current month is same as join month in join year
      const joinYear  = doj.getUTCFullYear();
      const joinMonth = doj.getUTCMonth() + 1; // 1-indexed
      if (year === joinYear && month <= joinMonth) continue;

      await this.prisma.leaveBalance.upsert({
        where: { employeeId_year: { employeeId: emp.id, year } },
        create: { employeeId: emp.id, year, plAccrued: 1.25, clAllocated: 0, slAllocated: 0 },
        update: { plAccrued: { increment: 1.25 } },
      });
      accrued++;
    }

    return { month, year, accrued };
  }

  // ── Monthly Attendance View / Edit ────────────────────────────────────────

  async getMonthlyAttendance(month: number, year: number, employeeId?: string) {
    const where: any = { month, year };
    if (employeeId) where.employeeId = employeeId;

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            designation: true, shift: { select: { name: true, shiftHours: true } },
          },
        },
      },
      orderBy: { employee: { firstName: 'asc' } },
    });
  }

  async updateMonthlyAttendance(id: string, dto: UpdateAttendanceDto) {
    const rec = await this.prisma.attendance.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException(`Attendance record ${id} not found`);
    return this.prisma.attendance.update({ where: { id }, data: dto });
  }

  // ── Excel Export ──────────────────────────────────────────────────────────

  /**
   * Generate an Excel workbook for a given month/year.
   * One row per employee × site combination.
   * Columns: EmpCode | Name | Designation | Site | WorkingDays | PresentDays | OTHours | LopDays
   */
  async exportAttendanceExcel(month: number, year: number): Promise<Buffer> {
    // Fetch all AttendanceSiteSummary rows for the period
    const summaries = await this.prisma.attendanceSiteSummary.findMany({
      where: { month, year },
      include: {
        employee: {
          select: {
            employeeCode: true, firstName: true, lastName: true, designation: true,
            siteAssignments: { include: { site: { select: { name: true } } } },
          },
        },
        site: { select: { name: true } },
      },
      orderBy: [
        { employee: { firstName: 'asc' } },
        { site: { name: 'asc' } },
      ],
    });

    // Also fetch aggregate Attendance for workingDays / lopDays (per-employee, not per-site)
    const attendanceRows = await this.prisma.attendance.findMany({
      where: { month, year },
      select: { employeeId: true, workingDays: true, lopDays: true },
    });
    const attMap = new Map(attendanceRows.map((a) => [a.employeeId, a]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator  = 'HRMS';
    workbook.created  = new Date();

    const ws = workbook.addWorksheet(`Attendance ${month}-${year}`);

    // Header row
    ws.columns = [
      { header: 'EmpCode',     key: 'empCode',     width: 14 },
      { header: 'Name',        key: 'name',         width: 26 },
      { header: 'Designation', key: 'designation',  width: 22 },
      { header: 'Site',        key: 'site',         width: 24 },
      { header: 'WorkingDays', key: 'workingDays',  width: 14 },
      { header: 'PresentDays', key: 'presentDays',  width: 14 },
      { header: 'OTHours',     key: 'otHours',      width: 12 },
      { header: 'LopDays',     key: 'lopDays',      width: 12 },
    ];

    // Style the header
    const headerRow = ws.getRow(1);
    headerRow.font   = { bold: true };
    headerRow.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    headerRow.border = {
      bottom: { style: 'thin', color: { argb: 'FF999999' } },
    };

    for (const s of summaries) {
      const emp  = s.employee;
      const att  = attMap.get(s.employeeId);
      ws.addRow({
        empCode:     emp.employeeCode,
        name:        `${emp.firstName} ${emp.lastName}`,
        designation: emp.designation ?? '',
        site:        s.site?.name ?? '(Unassigned)',
        workingDays: att ? Number(att.workingDays) : 26,
        presentDays: Number(s.presentDays),
        otHours:     Number(s.otHours),
        lopDays:     att ? Number(att.lopDays) : '',
      });
    }

    // Freeze header
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  }

  // ── Excel Import ──────────────────────────────────────────────────────────

  /**
   * Parse an uploaded Excel file and update AttendanceSiteSummary rows.
   * After updating site summaries, re-aggregates the Attendance table.
   * Returns { updated, skipped, errors }.
   */
  async importAttendanceExcel(
    month: number,
    year: number,
    fileBuffer: Buffer,
  ): Promise<{ updated: number; skipped: number; errors: string[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const ws = workbook.worksheets[0];
    if (!ws) throw new BadRequestException('No worksheet found in uploaded file');

    // Build lookup maps
    const empByCode = new Map<string, string>(); // empCode → employeeId
    const employees = await this.prisma.employee.findMany({
      select: { id: true, employeeCode: true },
    });
    for (const e of employees) empByCode.set(e.employeeCode, e.id);

    const siteByName = new Map<string, string>(); // siteName (lowercase) → siteId
    const sites = await this.prisma.site.findMany({ select: { id: true, name: true } });
    for (const s of sites) siteByName.set(s.name.toLowerCase().trim(), s.id);

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Row 1 is the header — skip it
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const empCode    = String(row.getCell(1).value ?? '').trim();
      const siteName   = String(row.getCell(4).value ?? '').trim();
      const presentDaysRaw = row.getCell(6).value;
      const otHoursRaw     = row.getCell(7).value;

      if (!empCode) { skipped++; return; }

      const employeeId = empByCode.get(empCode);
      if (!employeeId) {
        errors.push(`Row ${rowNumber}: Employee code "${empCode}" not found`);
        skipped++;
        return;
      }

      // Resolve siteId — null for "(Unassigned)"
      let siteId: string | null = null;
      if (siteName && siteName !== '(Unassigned)') {
        siteId = siteByName.get(siteName.toLowerCase().trim()) ?? null;
        if (!siteId) {
          errors.push(`Row ${rowNumber}: Site "${siteName}" not found`);
          skipped++;
          return;
        }
      }

      const presentDays = presentDaysRaw != null ? Number(presentDaysRaw) : NaN;
      const otHours     = otHoursRaw     != null ? Number(otHoursRaw)     : NaN;

      if (isNaN(presentDays) || presentDays < 0) {
        errors.push(`Row ${rowNumber}: Invalid PresentDays "${presentDaysRaw}"`);
        skipped++;
        return;
      }

      // Queue the upsert (we run them sequentially after to avoid overwhelming prisma)
      // Using a synchronous counter approach — actual upserts are done below
      updated++; // optimistic count — decremented on error
    });

    // Second pass: actually run the upserts (eachRow is synchronous but prisma is async)
    const upsertTasks: Array<{
      employeeId: string;
      siteId: string | null;
      presentDays: number;
      otHours: number;
      rowNumber: number;
    }> = [];

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const empCode  = String(row.getCell(1).value ?? '').trim();
      const siteName = String(row.getCell(4).value ?? '').trim();
      const presentDaysRaw = row.getCell(6).value;
      const otHoursRaw     = row.getCell(7).value;

      if (!empCode) return;
      const employeeId = empByCode.get(empCode);
      if (!employeeId) return;

      let siteId: string | null = null;
      if (siteName && siteName !== '(Unassigned)') {
        siteId = siteByName.get(siteName.toLowerCase().trim()) ?? null;
        if (!siteId) return;
      }

      const presentDays = presentDaysRaw != null ? Number(presentDaysRaw) : NaN;
      const otHours     = otHoursRaw     != null ? Number(otHoursRaw)     : 0;

      if (isNaN(presentDays) || presentDays < 0) return;

      upsertTasks.push({ employeeId, siteId, presentDays, otHours: isNaN(otHours) ? 0 : otHours, rowNumber });
    });

    // Reset counter from first pass (second pass is the real count)
    updated = 0;
    skipped = 0;

    for (const task of upsertTasks) {
      try {
        await this.prisma.attendanceSiteSummary.upsert({
          where: {
            employeeId_siteId_month_year: {
              employeeId: task.employeeId,
              siteId: task.siteId as any,
              month,
              year,
            },
          },
          create: {
            employeeId: task.employeeId,
            siteId: task.siteId,
            month,
            year,
            presentDays: task.presentDays,
            otHours: task.otHours,
          },
          update: {
            presentDays: task.presentDays,
            otHours: task.otHours,
          },
        });
        updated++;
      } catch (e: any) {
        errors.push(`Row ${task.rowNumber}: DB error — ${e?.message ?? 'unknown'}`);
        skipped++;
      }
    }

    // Re-aggregate AttendanceSiteSummary → Attendance for affected employees
    const affectedEmployeeIds = [...new Set(upsertTasks.map((t) => t.employeeId))];
    for (const employeeId of affectedEmployeeIds) {
      const sums = await this.prisma.attendanceSiteSummary.findMany({
        where: { employeeId, month, year },
      });
      const totalPresent = sums.reduce((acc, s) => acc + Number(s.presentDays), 0);
      const totalOT      = sums.reduce((acc, s) => acc + Number(s.otHours), 0);
      const lopDays      = Math.max(0, 26 - totalPresent);

      await this.prisma.attendance.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        create: { employeeId, month, year, workingDays: 26, presentDays: totalPresent, lopDays, otHours: totalOT },
        update: { workingDays: 26, presentDays: totalPresent, lopDays, otHours: totalOT },
      });
    }

    return { updated, skipped, errors };
  }

  // ── Auto-fill Engine ──────────────────────────────────────────────────────

  async runAutoFill(dto: RunAutoFillDto) {
    const { month, year } = dto;

    const monthStart = utcDate(year, month, 1);
    const monthEnd   = utcDate(year, month, daysInMonth(year, month));
    const totalDays  = daysInMonth(year, month);

    // 1. Eligible employees (with multi-site assignments)
    const employees = await this.prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] } },
      include: {
        shift: true,
        leaveBalances: { where: { year } },
        siteAssignments: { select: { siteId: true, isPrimary: true } },
      },
    });

    // 2. Holidays for the month — split into global and per-site sets
    const allHolidays = await this.prisma.holiday.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    });
    // Dates that apply to every site regardless
    const globalHolidaySet = new Set(
      allHolidays.filter((h) => !h.siteId).map((h) => dateKey(h.date)),
    );
    // Dates keyed by siteId for site-specific holidays
    const siteHolidayMap = new Map<string, Set<string>>();
    for (const h of allHolidays.filter((h) => h.siteId)) {
      if (!siteHolidayMap.has(h.siteId!)) siteHolidayMap.set(h.siteId!, new Set());
      siteHolidayMap.get(h.siteId!)!.add(dateKey(h.date));
    }

    // 3. Staff designations (for PL usability)
    const staffDesignations = await this.prisma.designationMaster.findMany({
      where: { skillLevel: 'STAFF' },
      select: { designation: true },
    });
    const staffDesigSet = new Set(staffDesignations.map((d) => d.designation));

    const results: any[] = [];

    for (const emp of employees) {
      const shiftHours = emp.shift?.shiftHours ?? 12;

      // Build this employee's holiday set: global + union of all their assigned sites
      const empSiteIds = emp.siteAssignments.map((s) => s.siteId);
      const empHolidaySet = new Set([
        ...globalHolidaySet,
        ...empSiteIds.flatMap((sid) => [...(siteHolidayMap.get(sid) ?? [])]),
      ]);

      // Attendance logs for the month
      const logs = await this.prisma.attendanceLog.findMany({
        where: { employeeId: emp.id, date: { gte: monthStart, lte: monthEnd } },
      });
      const logMap = new Map(logs.map((l) => [dateKey(l.date), l]));

      // Leave records for the month
      const leaveRecs = await this.prisma.leaveRecord.findMany({
        where: { employeeId: emp.id, date: { gte: monthStart, lte: monthEnd } },
      });
      const leaveMap = new Map(leaveRecs.map((l) => [dateKey(l.date), l]));

      // Leave balance — allocated amounts
      const balanceRow = emp.leaveBalances[0] ?? null;

      // Leaves already used in this year BEFORE this month (from LeaveRecord)
      const priorLeaveAgg = await this.prisma.leaveRecord.groupBy({
        by: ['leaveType'],
        where: {
          employeeId: emp.id,
          date: { gte: utcDate(year, 1, 1), lt: monthStart },
        },
        _sum: { days: true },
      });
      const priorUsed: Record<string, number> = { PL: 0, CL: 0, SL: 0 };
      for (const row of priorLeaveAgg) {
        priorUsed[row.leaveType] = Number(row._sum.days ?? 0);
      }

      // In-month running usage (incremented as we process days)
      const monthUsed: Record<string, number> = { PL: 0, CL: 0, SL: 0 };

      // PL usability date
      const isStaff = emp.designation && staffDesigSet.has(emp.designation);
      const plUsableFrom = emp.dateOfJoining
        ? addMonths(new Date(emp.dateOfJoining), 3)
        : null;

      let totalPresent = 0;
      let totalOT      = 0;

      for (let day = 1; day <= totalDays; day++) {
        const d   = utcDate(year, month, day);
        const key = dateKey(d);
        const dow = d.getUTCDay(); // 0=Sun

        // ── Sunday ────────────────────────────────────────────────────────
        if (dow === 0) {
          const log = logMap.get(key);
          const hrs = loggedHours(log?.punchIn ?? null, log?.punchOut ?? null);
          totalOT += computeSundayOT(hrs, shiftHours);
          continue;
        }

        // ── Holiday ───────────────────────────────────────────────────────
        if (empHolidaySet.has(key)) {
          totalPresent += 1; // paid holiday
          const log = logMap.get(key);
          const hrs = loggedHours(log?.punchIn ?? null, log?.punchOut ?? null);
          totalOT += hrs; // actual hours as OT
          continue;
        }

        // ── Leave Record ──────────────────────────────────────────────────
        if (leaveMap.has(key)) {
          const leave     = leaveMap.get(key)!;
          const leaveDays = Number(leave.days);

          if (leave.leaveType === LeaveType.LWP) {
            // Explicit LWP — absent
          } else if (!isStaff) {
            // Labour employees get no paid leave — auto-LWP
          } else {
            const lt  = leave.leaveType as 'PL' | 'CL' | 'SL';
            const allocated =
              lt === 'PL' ? Number(balanceRow?.plAccrued  ?? 0) :
              lt === 'CL' ? Number(balanceRow?.clAllocated ?? 0) :
                            Number(balanceRow?.slAllocated ?? 0);

            const used      = priorUsed[lt] + monthUsed[lt];
            const available = allocated - used;

            // Extra PL usability check
            const plUsable  = lt !== 'PL' || (plUsableFrom != null && d >= plUsableFrom);

            if (plUsable && available >= leaveDays) {
              totalPresent    += leaveDays;
              monthUsed[lt]   += leaveDays;
            }
            // else: insufficient balance → auto-LWP (absent)
          }
          continue;
        }

        // ── Regular Working Day (Mon–Sat, non-holiday, no leave) ──────────
        const log = logMap.get(key);
        const hrs = loggedHours(log?.punchIn ?? null, log?.punchOut ?? null);
        const { present, ot } = computeRegularDay(hrs, shiftHours);
        totalPresent += present;
        totalOT      += ot;
      }

      const lopDays = Math.max(0, 26 - totalPresent);

      await this.prisma.attendance.upsert({
        where: { employeeId_month_year: { employeeId: emp.id, month, year } },
        create: {
          employeeId: emp.id, month, year,
          workingDays: 26,
          presentDays: totalPresent,
          lopDays,
          otHours: totalOT,
        },
        update: {
          workingDays: 26,
          presentDays: totalPresent,
          lopDays,
          otHours: totalOT,
        },
      });

      // ── Populate AttendanceSiteSummary from AttendanceLogs ──────────────
      // Group logs by siteId for per-site cost reporting
      const siteTotals = new Map<string | null, { presentDays: number; otHours: number }>();
      for (const log of logs) {
        const sid = log.siteId ?? null;
        const existing = siteTotals.get(sid) ?? { presentDays: 0, otHours: 0 };
        const hrs = loggedHours(log.punchIn, log.punchOut);
        const { present, ot } = log.status === 'PRESENT' || log.status === 'HALF_DAY'
          ? computeRegularDay(hrs, shiftHours)
          : { present: 0, ot: 0 };
        siteTotals.set(sid, {
          presentDays: existing.presentDays + present,
          otHours:     existing.otHours + ot,
        });
      }

      // Upsert one row per site (null = unallocated)
      for (const [sid, totals] of siteTotals.entries()) {
        await this.prisma.attendanceSiteSummary.upsert({
          where: { employeeId_siteId_month_year: { employeeId: emp.id, siteId: sid as any, month, year } },
          create: { employeeId: emp.id, siteId: sid, month, year, ...totals },
          update: totals,
        });
      }

      results.push({
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        presentDays: totalPresent,
        lopDays,
        otHours: Math.round(totalOT * 100) / 100,
      });
    }

    return { month, year, processed: results.length, results };
  }
}
