import { Controller, Get, Param, Query, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sendExcel(res: Response, buffer: Buffer, filename: string) {
  res.set({
    'Content-Type': XLSX_MIME,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  // GET /api/reports/form-xxi?siteId=&month=&year=
  @Get('form-xxi')
  formXXI(
    @Query('siteId') siteId: string,
    @Query('month')  month:  string,
    @Query('year')   year:   string,
  ) {
    if (!siteId || !month || !year) {
      throw new BadRequestException('siteId, month, and year are required');
    }
    return this.svc.formXXI(siteId, parseInt(month), parseInt(year));
  }

  // GET /api/reports/runs/:id/salary-register
  @Get('runs/:id/salary-register')
  async salaryRegister(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.svc.salaryRegister(id);
    sendExcel(res, buf, `salary-register-${id}.xlsx`);
  }

  // GET /api/reports/runs/:id/bank-statement
  @Get('runs/:id/bank-statement')
  async bankStatement(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.svc.bankStatement(id);
    sendExcel(res, buf, `bank-statement-${id}.xlsx`);
  }

  // GET /api/reports/runs/:id/pf-statement
  @Get('runs/:id/pf-statement')
  async pfStatement(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.svc.pfStatement(id);
    sendExcel(res, buf, `pf-statement-${id}.xlsx`);
  }

  // GET /api/reports/runs/:id/esi-statement
  @Get('runs/:id/esi-statement')
  async esiStatement(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.svc.esiStatement(id);
    sendExcel(res, buf, `esi-statement-${id}.xlsx`);
  }
}
