import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { DayStatus } from '@prisma/client';

export class UpdateAttendanceLogDto {
  @IsOptional() @IsDateString() punchIn?: string;
  @IsOptional() @IsDateString() punchOut?: string;
  @IsOptional() @IsEnum(DayStatus) status?: DayStatus;
  @IsOptional() @IsString() remarks?: string;
}
