import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SetupKioskDto } from './dto/setup-kiosk.dto';
import { PunchDto } from './dto/punch.dto';

// ── Haversine distance ─────────────────────────────────────────────────────────
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── IST date helper ────────────────────────────────────────────────────────────
// Returns a Date whose UTC midnight represents the current IST calendar date.
function getISTDate(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // UTC+5:30
  const istNow = new Date(now.getTime() + istOffset);
  return new Date(istNow.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

@Injectable()
export class KioskService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ── Setup: HR activates kiosk for a site ───────────────────────────────────

  async setupKiosk(dto: SetupKioskDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException(`Site ${dto.siteId} not found`);
    if (!site.isActive) throw new ForbiddenException('Site is inactive');

    if (site.lat != null && site.lng != null) {
      // Site already has a registered location — verify device is within geofence
      const dist = haversineMetres(site.lat, site.lng, dto.lat, dto.lng);
      if (dist > site.geofenceRadius) {
        throw new ForbiddenException(
          `Device is ${Math.round(dist)}m from site centre. Geofence radius is ${site.geofenceRadius}m.`,
        );
      }
    } else {
      // First-time setup — register site location from device GPS
      await this.prisma.site.update({
        where: { id: dto.siteId },
        data: { lat: dto.lat, lng: dto.lng },
      });
    }

    // Issue a long-lived kiosk JWT (1 year — device token, not user session)
    const token = this.jwtService.sign(
      { type: 'kiosk', siteId: dto.siteId },
      { subject: dto.siteId, expiresIn: '365d' },
    );

    return {
      kioskToken: token,
      site: { id: site.id, name: site.name, city: site.city, geofenceRadius: site.geofenceRadius },
    };
  }

  // ── Employees list (with face descriptors so kiosk can build FaceMatcher) ──

  async getEmployees(siteId: string) {
    // Employees assigned to this site (via EmployeeSite many-to-many)
    const assignments = await this.prisma.employeeSite.findMany({
      where: {
        siteId,
        employee: { status: { not: 'INACTIVE' } },
      },
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true,
            lastName: true, designation: true, photoPath: true, faceDescriptor: true,
          },
        },
      },
      orderBy: { employee: { firstName: 'asc' } },
    });
    const employees = assignments.map((a) => a.employee).filter(Boolean);


    // Include today's punch status so the kiosk can show PUNCHED_IN / NOT_PUNCHED
    const today = getISTDate();
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        siteId,
        date: today,
        employeeId: { in: employees.map((e) => e.id) },
      },
      select: { employeeId: true, punchIn: true, punchOut: true, status: true },
    });

    const logMap = new Map(logs.map((l) => [l.employeeId, l]));

    return employees.map((e) => ({
      ...e,
      todayLog: logMap.get(e.id) ?? null,
    }));
  }

  // ── Punch in / out ─────────────────────────────────────────────────────────

  async punch(siteId: string, dto: PunchDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Verify employee is assigned to this site
    const assignment = await this.prisma.employeeSite.findUnique({
      where: { employeeId_siteId: { employeeId: dto.employeeId, siteId } },
    });
    if (!assignment) {
      throw new ForbiddenException('Employee is not assigned to this kiosk site');
    }

    const today = getISTDate();
    const now = new Date();

    // Determine whether device is on-site
    let onSite = true;
    if (dto.lat != null && dto.lng != null) {
      const site = await this.prisma.site.findUnique({ where: { id: siteId } });
      if (site?.lat != null && site?.lng != null) {
        const dist = haversineMetres(site.lat, site.lng, dto.lat, dto.lng);
        onSite = dist <= site.geofenceRadius;
      }
    }

    console.log(`[Kiosk Punch] ${employee.firstName} ${employee.lastName} | date=${today.toISOString()} | siteId=${siteId}`);

    try {
      const existing = await this.prisma.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId: dto.employeeId, date: today } },
      });
      console.log(`[Kiosk Punch] existing=`, existing ? `id=${existing.id} punchIn=${existing.punchIn} punchOut=${existing.punchOut}` : 'null');

      if (!existing) {
        // First punch of the day → Punch In
        const log = await this.prisma.attendanceLog.create({
          data: {
            employeeId: dto.employeeId,
            siteId,
            date: today,
            punchIn: now,
            lat: dto.lat,
            lng: dto.lng,
            onSite,
            source: 'KIOSK',
            status: 'PRESENT',
          },
        });
        return {
          action: 'PUNCH_IN' as const,
          time: now,
          employee: { id: employee.id, name: `${employee.firstName} ${employee.lastName}` },
          log,
        };
      }

      if (existing.punchIn && !existing.punchOut) {
        // Enforce minimum 2-hour shift before allowing punch-out
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const elapsed = now.getTime() - new Date(existing.punchIn).getTime();
        if (elapsed < TWO_HOURS_MS) {
          const fmt = (d: Date) =>
            d.toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
            });
          const earliest = new Date(new Date(existing.punchIn).getTime() + TWO_HOURS_MS);
          throw new BadRequestException(
            `Minimum 2-hour shift not completed. Punched in at ${fmt(new Date(existing.punchIn))}. Earliest punch-out: ${fmt(earliest)}.`,
          );
        }

        // Second punch of the day → Punch Out
        const log = await this.prisma.attendanceLog.update({
          where: { id: existing.id },
          data: { punchOut: now, lat: dto.lat, lng: dto.lng },
        });
        return {
          action: 'PUNCH_OUT' as const,
          time: now,
          employee: { id: employee.id, name: `${employee.firstName} ${employee.lastName}` },
          log,
        };
      }

      throw new BadRequestException(
        `${employee.firstName} ${employee.lastName} has already punched out today.`,
      );
    } catch (e: any) {
      // Re-throw NestJS HTTP exceptions as-is
      if (e?.status) throw e;
      // Unique constraint → attendance already recorded (race condition / double-tap)
      if (e?.code === 'P2002') {
        console.error('[Kiosk Punch] P2002 – duplicate attendance record', e?.meta);
        throw new ConflictException('Attendance already recorded for today');
      }
      console.error('[Kiosk Punch Error]', e?.code, e?.message, e?.meta);
      throw new BadRequestException(e?.message ?? 'Punch failed');
    }
  }

  // ── Site info ──────────────────────────────────────────────────────────────

  async getSiteInfo(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException(`Site ${siteId} not found`);
    return site;
  }
}
