import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAttendanceLogDto } from './dto/query-attendance-log.dto';
import { UpdateAttendanceLogDto } from './dto/update-attendance-log.dto';
import { DayStatus, PunchSource } from '@prisma/client';

function getISTDate(offset = 0): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset + offset * 86_400_000);
  return new Date(istNow.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

@Injectable()
export class AttendanceLogService {
  constructor(private prisma: PrismaService) {}

  // ── List daily logs ────────────────────────────────────────────────────────

  async findAll(query: QueryAttendanceLogDto) {
    const { siteId, employeeId, date, month, year } = query;

    let dateFilter: any = {};

    if (date) {
      const d = new Date(date + 'T00:00:00.000Z');
      dateFilter = { date: d };
    } else if (month && year) {
      const from = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
      const to = new Date(year, month, 1); // first of next month
      dateFilter = { date: { gte: from, lt: to } };
    } else {
      // Default to today (IST)
      dateFilter = { date: getISTDate() };
    }

    return this.prisma.attendanceLog.findMany({
      where: {
        ...(siteId && { siteId }),
        ...(employeeId && { employeeId }),
        ...dateFilter,
      },
      orderBy: [{ date: 'desc' }, { punchIn: 'asc' }],
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true },
        },
        site: { select: { id: true, name: true, city: true } },
      },
    });
  }

  // ── Monthly summary per employee ───────────────────────────────────────────

  async monthlySummary(employeeId: string, month: number, year: number) {
    const from = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
    const to = new Date(year, month, 1);

    const logs = await this.prisma.attendanceLog.findMany({
      where: { employeeId, date: { gte: from, lt: to } },
      orderBy: { date: 'asc' },
    });

    const presentDays = logs.filter((l) => l.status === DayStatus.PRESENT).length;
    const halfDays    = logs.filter((l) => l.status === DayStatus.HALF_DAY).length;
    const leaveDays   = logs.filter((l) => l.status === DayStatus.LEAVE).length;
    const absentDays  = logs.filter((l) => l.status === DayStatus.ABSENT).length;

    return { employeeId, month, year, logs, presentDays, halfDays, leaveDays, absentDays };
  }

  // ── Manual entry / HR correction ──────────────────────────────────────────

  async manualEntry(
    employeeId: string,
    siteId: string,
    date: string,
    dto: UpdateAttendanceLogDto,
  ) {
    const d = new Date(date + 'T00:00:00.000Z');
    const existing = await this.prisma.attendanceLog.findUnique({
      where: { employeeId_date: { employeeId, date: d } },
    });

    if (existing) {
      return this.prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          ...(dto.punchIn  && { punchIn:  new Date(dto.punchIn)  }),
          ...(dto.punchOut && { punchOut: new Date(dto.punchOut) }),
          ...(dto.status   && { status: dto.status }),
          ...(dto.remarks  && { remarks: dto.remarks }),
          source: PunchSource.MANUAL,
        },
      });
    }

    return this.prisma.attendanceLog.create({
      data: {
        employeeId,
        siteId,
        date: d,
        punchIn:  dto.punchIn  ? new Date(dto.punchIn)  : undefined,
        punchOut: dto.punchOut ? new Date(dto.punchOut) : undefined,
        status:   dto.status ?? DayStatus.PRESENT,
        remarks:  dto.remarks,
        source:   PunchSource.MANUAL,
        onSite:   false,
      },
    });
  }

  async update(id: string, dto: UpdateAttendanceLogDto) {
    const log = await this.prisma.attendanceLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Attendance log ${id} not found`);

    return this.prisma.attendanceLog.update({
      where: { id },
      data: {
        ...(dto.punchIn  && { punchIn:  new Date(dto.punchIn)  }),
        ...(dto.punchOut && { punchOut: new Date(dto.punchOut) }),
        ...(dto.status   && { status: dto.status }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
        source: PunchSource.MANUAL,
      },
    });
  }
}
