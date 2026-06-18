import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { DesignationMasterService } from './designation-master.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';

@Controller('designation-master')
export class DesignationMasterController {
  constructor(private readonly svc: DesignationMasterService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Post()
  @RequirePermission('settings', 'create')
  create(@Body() dto: CreateDesignationDto) { return this.svc.create(dto); }

  @Patch(':id')
  @RequirePermission('settings', 'update')
  update(@Param('id') id: string, @Body() dto: UpdateDesignationDto) { return this.svc.update(id, dto); }

  @Delete(':id')
  @RequirePermission('settings', 'delete')
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  // ── Excel template download ──────────────────────────────────────────────────
  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.svc.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="designation-bulk-upload-template.xlsx"',
    });
    res.send(buffer);
  }

  // ── Bulk upload ──────────────────────────────────────────────────────────────
  @Post('bulk')
  @RequirePermission('settings', 'create')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  bulkUpload(@UploadedFile() file: Express.Multer.File) {
    return this.svc.bulkUpload(file.buffer);
  }
}
