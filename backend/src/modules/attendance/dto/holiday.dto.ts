import { IsString, IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { HolidayType } from '@prisma/client';

export class CreateHolidayDto {
  @IsString()            name: string;
  @IsDateString()        date: string;      // "YYYY-MM-DD"
  @IsEnum(HolidayType)   type: HolidayType;
  @IsInt()               year: number;
  @IsOptional() @IsString() siteId?: string;  // null/omitted = all sites
}
