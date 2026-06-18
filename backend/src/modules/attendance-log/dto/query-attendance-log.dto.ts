import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryAttendanceLogDto {
  @IsOptional() @IsString()            siteId?: string;
  @IsOptional() @IsString()            employeeId?: string;
  @IsOptional() @IsDateString()        date?: string;   // YYYY-MM-DD  — daily view

  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(1) @Max(12)
  month?: number;

  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(2020)
  year?: number;
}
