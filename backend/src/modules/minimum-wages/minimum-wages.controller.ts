import {
  Controller, Get, Post, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { MinimumWagesService } from './minimum-wages.service';
import { CreateMinimumWageDto } from './dto/minimum-wage.dto';

@Controller('minimum-wages')
export class MinimumWagesController {
  constructor(private readonly svc: MinimumWagesService) {}

  // GET /api/minimum-wages?siteId=xxx&active=true
  @Get()
  findAll(
    @Query('siteId') siteId?: string,
    @Query('active')  active?: string,
  ) {
    return this.svc.findAll(siteId, active === 'true');
  }

  // POST /api/minimum-wages
  @Post()
  @RequirePermission('settings', 'create')
  create(@Body() dto: CreateMinimumWageDto) {
    return this.svc.create(dto);
  }

  // DELETE /api/minimum-wages/:id
  @Delete(':id')
  @RequirePermission('settings', 'delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
