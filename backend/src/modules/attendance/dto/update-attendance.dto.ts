import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional() @IsNumber() @Min(0) @Max(26) presentDays?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(26) lopDays?: number;
  @IsOptional() @IsNumber() @Min(0)          otHours?: number;
}
