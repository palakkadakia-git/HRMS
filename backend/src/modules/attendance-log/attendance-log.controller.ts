import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { AttendanceLogService } from './attendance-log.service';
import { QueryAttendanceLogDto } from './dto/query-attendance-log.dto';
import { UpdateAttendanceLogDto } from './dto/update-attendance-log.dto';

@Controller('attendance-logs')
export class AttendanceLogController {
  constructor(private readonly service: AttendanceLogService) {}

  /** Daily / monthly log list (HR view) */
  @Get()
  findAll(@Query() query: QueryAttendanceLogDto) {
    return this.service.findAll(query);
  }

  /** Monthly summary for one employee */
  @Get('summary')
  summary(
    @Query('employeeId') employeeId: string,
    @Query('month') month: string,
    @Query('year')  year:  string,
  ) {
    return this.service.monthlySummary(employeeId, parseInt(month), parseInt(year));
  }

  /** HR manual correction of an existing log */
  @Patch(':id')
  @RequirePermission('attendance', 'update')
  update(@Param('id') id: string, @Body() dto: UpdateAttendanceLogDto) {
    return this.service.update(id, dto);
  }

  /** HR manual entry for an employee on a date */
  @Post('manual')
  @RequirePermission('attendance', 'create')
  manualEntry(
    @Body('employeeId') employeeId: string,
    @Body('siteId')     siteId:     string,
    @Body('date')       date:        string,
    @Body()             dto:         UpdateAttendanceLogDto,
  ) {
    return this.service.manualEntry(employeeId, siteId, date, dto);
  }
}
