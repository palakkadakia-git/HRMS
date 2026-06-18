import { Controller, Get, Post, Delete, Patch, Param, Body } from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { EmployeeSitesService } from './employee-sites.service';
import { AddEmployeeSiteDto, SetPrimarySiteDto } from './dto/employee-site.dto';

@Controller('employees/:employeeId/sites')
export class EmployeeSitesController {
  constructor(private readonly svc: EmployeeSitesService) {}

  @Get()
  findAll(@Param('employeeId') employeeId: string) {
    return this.svc.findAll(employeeId);
  }

  @Post()
  @RequirePermission('employees', 'update')
  add(@Param('employeeId') employeeId: string, @Body() dto: AddEmployeeSiteDto) {
    return this.svc.add(employeeId, dto);
  }

  @Delete(':siteId')
  @RequirePermission('employees', 'update')
  remove(@Param('employeeId') employeeId: string, @Param('siteId') siteId: string) {
    return this.svc.remove(employeeId, siteId);
  }

  @Patch('primary')
  @RequirePermission('employees', 'update')
  setPrimary(@Param('employeeId') employeeId: string, @Body() dto: SetPrimarySiteDto) {
    return this.svc.setPrimary(employeeId, dto);
  }
}
