import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePenaltyDto, CancelPenaltyDto } from './dto/penalty.dto';

@Injectable()
export class PenaltiesService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────────

  async findAll(filters: {
    employeeId?: string;
    siteId?:     string;
    month?:      number;
    year?:       number;
    status?:     string;
  }) {
    return this.prisma.penalty.findMany({
      where: {
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.siteId     && { siteId:     filters.siteId }),
        ...(filters.month      && { month:       filters.month }),
        ...(filters.year       && { year:        filters.year }),
        ...(filters.status     && { status:      filters.status as any }),
      },
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            designation: true,
            siteAssignments: {
              where:   { isPrimary: true },
              include: { site: { select: { id: true, name: true } } },
              take: 1,
            },
          },
        },
        witness: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true },
        },
        site: { select: { id: true, name: true, city: true, state: true } },
        recoveries: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { date: 'desc' },
    });
  }

  // ── Staff employees for witness dropdown ──────────────────────────────────────

  async findStaff() {
    return this.prisma.employee.findMany({
      where: {
        status: { not: 'INACTIVE' },
        designation: {
          in: await this.prisma.designationMaster
            .findMany({ where: { skillLevel: 'STAFF' }, select: { designation: true } })
            .then(rows => rows.map(r => r.designation)),
        },
      },
      select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true },
      orderBy: { firstName: 'asc' },
    });
  }

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(dto: CreatePenaltyDto) {
    const [employee, witness, site] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: dto.employeeId } }),
      this.prisma.employee.findUnique({ where: { id: dto.witnessId  } }),
      this.prisma.site.findUnique({ where: { id: dto.siteId } }),
    ]);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!witness)  throw new NotFoundException('Witness not found');
    if (!site)     throw new NotFoundException('Site not found');

    const date  = new Date(dto.date);
    const month = date.getMonth() + 1;
    const year  = date.getFullYear();

    return this.prisma.penalty.create({
      data: {
        employeeId:    dto.employeeId,
        witnessId:     dto.witnessId,
        siteId:        dto.siteId,
        amount:        dto.amount,
        balanceAmount: dto.amount,
        reason:        dto.reason,
        date,
        month,
        year,
      },
    });
  }

  // ── Cancel (soft delete with audit trail) ────────────────────────────────────

  async cancel(id: string, dto: CancelPenaltyDto) {
    const penalty = await this.prisma.penalty.findUnique({ where: { id } });
    if (!penalty) throw new NotFoundException('Penalty not found');
    if (penalty.status === 'CANCELLED') {
      throw new BadRequestException('Penalty is already cancelled');
    }
    if (penalty.status === 'RECOVERED') {
      throw new BadRequestException('Cannot cancel a fully recovered penalty');
    }

    return this.prisma.penalty.update({
      where: { id },
      data: {
        status:       'CANCELLED',
        cancelledBy:  dto.cancelledBy,
        cancelReason: dto.cancelReason,
        cancelledAt:  new Date(),
      },
    });
  }
}
