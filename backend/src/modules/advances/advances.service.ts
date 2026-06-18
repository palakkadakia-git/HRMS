import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { AdvanceStatus, AdvanceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdvanceDto, BulkWeeklyAdvanceDto } from './dto/advance.dto';

@Injectable()
export class AdvancesService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────────

  async findAll(filters: {
    employeeId?: string;
    type?: AdvanceType;
    status?: AdvanceStatus;
    siteId?: string;
  }) {
    return this.prisma.employeeAdvance.findMany({
      where: {
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.type       && { type:       filters.type }),
        ...(filters.status     && { status:     filters.status }),
        ...(filters.siteId && {
          employee: {
            siteAssignments: {
              some: { siteId: filters.siteId, isPrimary: true },
            },
          },
        }),
      },
      include: {
        employee: {
          select: {
            id:           true,
            employeeCode: true,
            firstName:    true,
            lastName:     true,
            designation:  true,
            siteAssignments: {
              where:   { isPrimary: true },
              include: { site: { select: { id: true, name: true } } },
              take: 1,
            },
          },
        },
        recoveries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { disbursedOn: 'desc' },
    });
  }

  // ── Create single advance ─────────────────────────────────────────────────────

  async create(dto: CreateAdvanceDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (dto.type === AdvanceType.ADHOC && !dto.installmentAmount) {
      throw new BadRequestException(
        'installmentAmount is required for ADHOC advances',
      );
    }

    return this.prisma.employeeAdvance.create({
      data: {
        employeeId:        dto.employeeId,
        type:              dto.type,
        amount:            dto.amount,
        disbursedOn:       new Date(dto.disbursedOn),
        reason:            dto.reason ?? null,
        installmentAmount: dto.installmentAmount ?? null,
        balanceAmount:     dto.amount,
        status:            AdvanceStatus.ACTIVE,
      },
    });
  }

  // ── Bulk weekly advances ──────────────────────────────────────────────────────

  async bulkWeekly(dto: BulkWeeklyAdvanceDto) {
    if (!dto.employeeIds.length) {
      throw new BadRequestException('No employees specified');
    }

    // Verify all employees exist
    const found = await this.prisma.employee.findMany({
      where: { id: { in: dto.employeeIds } },
      select: { id: true },
    });
    if (found.length !== dto.employeeIds.length) {
      throw new NotFoundException('One or more employees not found');
    }

    const disbursedOn = new Date(dto.disbursedOn);
    const WEEKLY_AMOUNT = 1000;

    const created = await this.prisma.$transaction(
      dto.employeeIds.map(empId =>
        this.prisma.employeeAdvance.create({
          data: {
            employeeId:    empId,
            type:          AdvanceType.WEEKLY,
            amount:        WEEKLY_AMOUNT,
            disbursedOn,
            reason:        dto.reason ?? 'Weekly advance',
            balanceAmount: WEEKLY_AMOUNT,
            status:        AdvanceStatus.ACTIVE,
          },
        }),
      ),
    );

    return { created: created.length };
  }

  // ── Delete (only if no recoveries yet) ───────────────────────────────────────

  async remove(id: string) {
    const advance = await this.prisma.employeeAdvance.findUnique({
      where: { id },
      include: { recoveries: { take: 1 } },
    });
    if (!advance) throw new NotFoundException('Advance not found');
    if (advance.recoveries.length > 0) {
      throw new BadRequestException(
        'Cannot delete an advance that already has recoveries',
      );
    }
    return this.prisma.employeeAdvance.delete({ where: { id } });
  }
}
