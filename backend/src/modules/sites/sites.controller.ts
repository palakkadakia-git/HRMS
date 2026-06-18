import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';

@Controller('sites')
export class SitesController {
  constructor(private prisma: PrismaService) {}

  /** GET /sites  — returns all sites (active + inactive) */
  @Get()
  findAll() {
    return this.prisma.site.findMany({ orderBy: { name: 'asc' } });
  }

  /** POST /sites */
  @Post()
  @RequirePermission('settings', 'create')
  create(@Body() dto: CreateSiteDto) {
    return this.prisma.site.create({ data: dto });
  }

  /** PATCH /sites/:id */
  @Patch(':id')
  @RequirePermission('settings', 'update')
  async update(@Param('id') id: string, @Body() dto: UpdateSiteDto) {
    await this.findOrFail(id);
    return this.prisma.site.update({ where: { id }, data: dto });
  }

  /** DELETE /sites/:id — blocked if employees are assigned */
  @Delete(':id')
  @RequirePermission('settings', 'delete')
  async remove(@Param('id') id: string) {
    await this.findOrFail(id);
    const count = await this.prisma.employeeSite.count({ where: { siteId: id } });
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete site — ${count} employee assignment(s) exist. Remove them first.`,
      );
    }
    await this.prisma.site.delete({ where: { id } });
    return { message: 'Site deleted.' };
  }

  private async findOrFail(id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException(`Site ${id} not found`);
    return site;
  }
}
