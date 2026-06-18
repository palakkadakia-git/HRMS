import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddEmployeeSiteDto, SetPrimarySiteDto } from './dto/employee-site.dto';

@Injectable()
export class EmployeeSitesService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId: string) {
    await this.requireEmployee(employeeId);
    return this.prisma.employeeSite.findMany({
      where: { employeeId },
      include: { site: { select: { id: true, name: true, city: true, state: true, esiApplicable: true } } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async add(employeeId: string, dto: AddEmployeeSiteDto) {
    await this.requireEmployee(employeeId);

    // If marking as primary, clear existing primary first
    if (dto.isPrimary) {
      await this.prisma.employeeSite.updateMany({
        where: { employeeId, isPrimary: true },
        data:  { isPrimary: false },
      });
    }

    // If no primary exists yet, auto-set this one as primary
    const existingCount = await this.prisma.employeeSite.count({ where: { employeeId } });

    return this.prisma.employeeSite.upsert({
      where: { employeeId_siteId: { employeeId, siteId: dto.siteId } },
      create: {
        employeeId,
        siteId:    dto.siteId,
        isPrimary: dto.isPrimary ?? existingCount === 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
      },
      update: {
        isPrimary: dto.isPrimary ?? undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },
      include: { site: { select: { id: true, name: true, city: true } } },
    });
  }

  async remove(employeeId: string, siteId: string) {
    const assignment = await this.prisma.employeeSite.findUnique({
      where: { employeeId_siteId: { employeeId, siteId } },
    });
    if (!assignment) throw new NotFoundException('Site assignment not found.');

    if (assignment.isPrimary) {
      const total = await this.prisma.employeeSite.count({ where: { employeeId } });
      if (total > 1) {
        throw new BadRequestException(
          'Cannot remove the primary site. Set another site as primary first.',
        );
      }
    }

    await this.prisma.employeeSite.delete({
      where: { employeeId_siteId: { employeeId, siteId } },
    });
    return { message: 'Site assignment removed.' };
  }

  async setPrimary(employeeId: string, dto: SetPrimarySiteDto) {
    await this.requireEmployee(employeeId);
    const assignment = await this.prisma.employeeSite.findUnique({
      where: { employeeId_siteId: { employeeId, siteId: dto.siteId } },
    });
    if (!assignment) throw new NotFoundException('Site assignment not found.');

    await this.prisma.employeeSite.updateMany({
      where: { employeeId, isPrimary: true },
      data:  { isPrimary: false },
    });
    return this.prisma.employeeSite.update({
      where: { employeeId_siteId: { employeeId, siteId: dto.siteId } },
      data:  { isPrimary: true },
      include: { site: { select: { id: true, name: true, city: true } } },
    });
  }

  // ── Helper used by other services to resolve primary site ──────────────────
  async getPrimarySite(employeeId: string) {
    return this.prisma.employeeSite.findFirst({
      where: { employeeId, isPrimary: true },
      include: { site: { select: { id: true, name: true, city: true, state: true, esiApplicable: true } } },
    });
  }

  private async requireEmployee(employeeId: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);
  }
}
