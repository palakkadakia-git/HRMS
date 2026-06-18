import { Injectable, NotFoundException } from '@nestjs/common';
import { SkillLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMinimumWageDto } from './dto/minimum-wage.dto';

@Injectable()
export class MinimumWagesService {
  constructor(private prisma: PrismaService) {}

  /** List wages. Optionally filter by site and/or only show currently-active rows. */
  findAll(siteId?: string, activeOnly = false) {
    return this.prisma.minimumWage.findMany({
      where: {
        ...(siteId      ? { siteId }          : {}),
        ...(activeOnly  ? { effectiveTo: null } : {}),
      },
      include: { site: { select: { id: true, name: true, city: true } } },
      orderBy: [{ siteId: 'asc' }, { skillLevel: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  /**
   * Create a new minimum-wage entry for a site × skill-level pair.
   * Automatically closes the currently-active record (sets effectiveTo = effectiveFrom − 1 day).
   */
  async create(dto: CreateMinimumWageDto) {
    const effectiveFrom = new Date(dto.effectiveFrom);

    // Close the existing active record if present
    const active = await this.prisma.minimumWage.findFirst({
      where: { siteId: dto.siteId, skillLevel: dto.skillLevel as SkillLevel, effectiveTo: null },
    });
    if (active) {
      const dayBefore = new Date(effectiveFrom);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await this.prisma.minimumWage.update({
        where: { id: active.id },
        data:  { effectiveTo: dayBefore },
      });
    }

    return this.prisma.minimumWage.create({
      data: {
        siteId:       dto.siteId,
        skillLevel:   dto.skillLevel as SkillLevel,
        monthlyWage:  dto.monthlyWage,
        effectiveFrom,
        effectiveTo:  null,
      },
      include: { site: { select: { id: true, name: true, city: true } } },
    });
  }

  /**
   * Delete a minimum-wage record.
   * If the deleted record was the active one, re-activates the most-recent previous entry
   * so the history chain stays valid.
   */
  async remove(id: string) {
    const row = await this.prisma.minimumWage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Minimum wage ${id} not found`);

    await this.prisma.minimumWage.delete({ where: { id } });

    // If we just deleted the active entry, re-open the most-recent previous one
    if (!row.effectiveTo) {
      const prev = await this.prisma.minimumWage.findFirst({
        where:   { siteId: row.siteId, skillLevel: row.skillLevel },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (prev) {
        await this.prisma.minimumWage.update({
          where: { id: prev.id },
          data:  { effectiveTo: null },
        });
      }
    }

    return { message: 'Minimum wage deleted.' };
  }
}
