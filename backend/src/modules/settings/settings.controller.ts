import {
  Controller, Get, Put, Post,
  Body, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get()
  getSettings() { return this.svc.getSettings(); }

  @Put()
  @RequirePermission('settings', 'update')
  updateSettings(@Body() dto: UpdateSettingsDto) { return this.svc.updateSettings(dto); }

  @Post('logo')
  @RequirePermission('settings', 'update')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(@UploadedFile() file: Express.Multer.File) { return this.svc.uploadLogo(file); }
}
