import {
  Controller, Get, Post, Patch, Delete,
  Param, Body,
} from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { PayrollService } from './payroll.service';
import { RunPayrollDto } from './dto/run-payroll.dto';
import { UpdatePayslipDto } from './dto/update-payslip.dto';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  // ── Payroll runs ────────────────────────────────────────────────────────────

  @Post('run')
  @RequirePermission('payroll', 'create')
  runPayroll(@Body() dto: RunPayrollDto) { return this.svc.runPayroll(dto); }

  @Get('runs')
  findAllRuns() { return this.svc.findAllRuns(); }

  @Get('runs/:id')
  findRun(@Param('id') id: string) { return this.svc.findRunById(id); }

  @Get('runs/:id/payslips')
  findPayslips(@Param('id') id: string) { return this.svc.findPayslips(id); }

  @Get('runs/:id/summary')
  getSummary(@Param('id') id: string) { return this.svc.getRunSummary(id); }

  @Get('runs/:id/site-cost')
  getSiteCost(@Param('id') id: string) { return this.svc.getSiteCostReport(id); }

  @Post('runs/:id/finalize')
  @RequirePermission('payroll', 'update')
  finalizeRun(@Param('id') id: string) { return this.svc.finalizeRun(id); }

  @Post('runs/:id/approve')
  @RequirePermission('payroll', 'update')
  approveRun(@Param('id') id: string) { return this.svc.approveRun(id); }

  @Post('runs/:id/pay')
  @RequirePermission('payroll', 'update')
  markPaid(@Param('id') id: string) { return this.svc.markPaid(id); }

  @Delete('runs/:id')
  @RequirePermission('payroll', 'delete')
  deleteRun(@Param('id') id: string) { return this.svc.deleteRun(id); }

  // ── Individual payslips ─────────────────────────────────────────────────────

  @Get('payslips/:id')
  findPayslip(@Param('id') id: string) { return this.svc.findPayslip(id); }

  @Patch('payslips/:id')
  @RequirePermission('payroll', 'update')
  updatePayslip(@Param('id') id: string, @Body() dto: UpdatePayslipDto) {
    return this.svc.updatePayslip(id, dto);
  }
}
