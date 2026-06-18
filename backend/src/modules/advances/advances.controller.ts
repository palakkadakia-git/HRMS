import {
  Controller, Get, Post, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import { AdvanceStatus, AdvanceType } from '@prisma/client';
import { AdvancesService } from './advances.service';
import { CreateAdvanceDto, BulkWeeklyAdvanceDto } from './dto/advance.dto';
import { RequirePermission } from '../permissions/require-permission.decorator';

@Controller('advances')
export class AdvancesController {
  constructor(private readonly svc: AdvancesService) {}

  @Get()
  @RequirePermission('advances', 'read')
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('type')       type?:       AdvanceType,
    @Query('status')     status?:     AdvanceStatus,
    @Query('siteId')     siteId?:     string,
  ) {
    return this.svc.findAll({ employeeId, type, status, siteId });
  }

  @Post()
  @RequirePermission('advances', 'create')
  create(@Body() dto: CreateAdvanceDto) {
    return this.svc.create(dto);
  }

  @Post('bulk-weekly')
  @RequirePermission('advances', 'create')
  bulkWeekly(@Body() dto: BulkWeeklyAdvanceDto) {
    return this.svc.bulkWeekly(dto);
  }

  @Delete(':id')
  @RequirePermission('advances', 'delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
