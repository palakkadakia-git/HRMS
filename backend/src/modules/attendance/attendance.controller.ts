import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe,
  Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { AttendanceService } from './attendance.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { CreateHolidayDto } from './dto/holiday.dto';
import { CreateLeaveRecordDto, AllocateLeaveDto, AccruePLDto } from './dto/leave.dto';
import { RunAutoFillDto } from './dto/run-autofill.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  // ── Shifts ──────────────────────────────────────────────────────────────────

  @Get('shifts')
  findAllShifts() { return this.svc.findAllShifts(); }

  @Post('shifts')
  @RequirePermission('attendance', 'create')
  createShift(@Body() dto: CreateShiftDto) { return this.svc.createShift(dto); }

  @Patch('shifts/:id')
  @RequirePermission('attendance', 'update')
  updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) { return this.svc.updateShift(id, dto); }

  @Delete('shifts/:id')
  @RequirePermission('attendance', 'delete')
  removeShift(@Param('id') id: string) { return this.svc.removeShift(id); }

  // ── Holidays ────────────────────────────────────────────────────────────────

  @Get('holidays')
  findHolidays(
    @Query('year', ParseIntPipe) year: number,
    @Query('siteId') siteId?: string,
  ) { return this.svc.findHolidaysByYear(year, siteId); }

  @Post('holidays')
  @RequirePermission('attendance', 'create')
  createHoliday(@Body() dto: CreateHolidayDto) { return this.svc.createHoliday(dto); }

  @Patch('holidays/:id')
  @RequirePermission('attendance', 'update')
  updateHoliday(@Param('id') id: string, @Body() dto: CreateHolidayDto) { return this.svc.updateHoliday(id, dto); }

  @Delete('holidays/:id')
  @RequirePermission('attendance', 'delete')
  removeHoliday(@Param('id') id: string) { return this.svc.removeHoliday(id); }

  // ── Leave Records ───────────────────────────────────────────────────────────

  @Get('leave-records')
  getLeaveRecords(
    @Query('employeeId') employeeId: string,
    @Query('month')  month?:  string,
    @Query('year')   year?:   string,
  ) {
    return this.svc.getLeaveRecords(
      employeeId,
      month  ? parseInt(month,  10) : undefined,
      year   ? parseInt(year,   10) : undefined,
    );
  }

  @Post('leave-records')
  @RequirePermission('leave', 'create')
  createLeaveRecord(@Body() dto: CreateLeaveRecordDto) { return this.svc.createLeaveRecord(dto); }

  @Patch('leave-records/:id')
  @RequirePermission('leave', 'update')
  updateLeaveRecord(@Param('id') id: string, @Body() dto: CreateLeaveRecordDto) { return this.svc.updateLeaveRecord(id, dto); }

  @Delete('leave-records/:id')
  @RequirePermission('leave', 'delete')
  removeLeaveRecord(@Param('id') id: string) { return this.svc.removeLeaveRecord(id); }

  // ── Leave Balances ──────────────────────────────────────────────────────────

  @Get('leave-balances')
  getAllLeaveBalances(@Query('year', ParseIntPipe) year: number) { return this.svc.getAllLeaveBalances(year); }

  @Get('leave-balances/:employeeId')
  getLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Query('year', ParseIntPipe) year: number,
  ) { return this.svc.getLeaveBalance(employeeId, year); }

  @Post('leave-balances/allocate')
  @RequirePermission('leave', 'create')
  allocateLeaves(@Body() dto: AllocateLeaveDto) { return this.svc.allocateAnnualLeaves(dto.year); }

  @Post('leave-balances/accrue-pl')
  @RequirePermission('leave', 'create')
  accruePL(@Body() dto: AccruePLDto) { return this.svc.accrueMonthlyPL(dto.month, dto.year); }

  // ── Monthly Attendance ──────────────────────────────────────────────────────

  @Get('monthly')
  getMonthly(
    @Query('month', ParseIntPipe) month: number,
    @Query('year',  ParseIntPipe) year:  number,
    @Query('employeeId') employeeId?: string,
  ) { return this.svc.getMonthlyAttendance(month, year, employeeId); }

  @Patch('monthly/:id')
  @RequirePermission('attendance', 'update')
  updateMonthly(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) { return this.svc.updateMonthlyAttendance(id, dto); }

  // ── Auto-fill ───────────────────────────────────────────────────────────────

  @Post('autofill')
  @RequirePermission('attendance', 'create')
  runAutoFill(@Body() dto: RunAutoFillDto) { return this.svc.runAutoFill(dto); }

  // ── Excel Export ────────────────────────────────────────────────────────────

  @Get('export')
  async exportExcel(
    @Query('month', ParseIntPipe) month: number,
    @Query('year',  ParseIntPipe) year:  number,
    @Res() res: Response,
  ) {
    const buffer   = await this.svc.exportAttendanceExcel(month, year);
    const filename = `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`;
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buffer.length,
    });
    res.end(buffer);
  }

  // ── Excel Import ────────────────────────────────────────────────────────────

  @Post('import')
  @RequirePermission('attendance', 'update')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @Query('month', ParseIntPipe) month: number,
    @Query('year',  ParseIntPipe) year:  number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file uploaded');
    return this.svc.importAttendanceExcel(month, year, file.buffer);
  }
}
