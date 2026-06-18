import {
  Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { SalaryRevisionsService } from './salary-revisions.service';
import { CreateSalaryRevisionDto } from './dto/create-salary-revision.dto';

@Controller()
export class SalaryRevisionsController {
  constructor(private readonly svc: SalaryRevisionsService) {}

  // GET /api/employees/:employeeId/salary-revisions
  @Get('employees/:employeeId/salary-revisions')
  findAll(@Param('employeeId') employeeId: string) {
    return this.svc.findAllForEmployee(employeeId);
  }

  // GET /api/employees/:employeeId/salary-revisions/active
  @Get('employees/:employeeId/salary-revisions/active')
  findActive(@Param('employeeId') employeeId: string) {
    return this.svc.findActive(employeeId);
  }

  // GET /api/employees/:employeeId/salary-revisions/preview?grossSalary=50000
  @Get('employees/:employeeId/salary-revisions/preview')
  preview(
    @Param('employeeId') employeeId: string,
    @Query('grossSalary') gross: string,
  ) {
    return this.svc.previewForEmployee(employeeId, parseFloat(gross) || 0);
  }

  // POST /api/employees/:employeeId/salary-revisions
  @Post('employees/:employeeId/salary-revisions')
  @RequirePermission('employees', 'update')
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateSalaryRevisionDto,
  ) {
    return this.svc.create(employeeId, dto);
  }
}
