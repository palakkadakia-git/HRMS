import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { PenaltiesService } from './penalties.service';
import { CreatePenaltyDto, CancelPenaltyDto } from './dto/penalty.dto';
import { RequirePermission } from '../permissions/require-permission.decorator';

@Controller('penalties')
export class PenaltiesController {
  constructor(private readonly svc: PenaltiesService) {}

  @Get()
  @RequirePermission('penalties', 'read')
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('siteId')     siteId?:     string,
    @Query('month')      month?:      string,
    @Query('year')       year?:       string,
    @Query('status')     status?:     string,
  ) {
    return this.svc.findAll({
      employeeId,
      siteId,
      month: month ? parseInt(month) : undefined,
      year:  year  ? parseInt(year)  : undefined,
      status,
    });
  }

  @Get('staff')
  @RequirePermission('penalties', 'read')
  findStaff() {
    return this.svc.findStaff();
  }

  @Post()
  @RequirePermission('penalties', 'create')
  create(@Body() dto: CreatePenaltyDto) {
    return this.svc.create(dto);
  }

  @Patch(':id/cancel')
  @RequirePermission('penalties', 'delete')
  cancel(@Param('id') id: string, @Body() dto: CancelPenaltyDto) {
    return this.svc.cancel(id, dto);
  }
}
