import { IsDateString, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

const toNum = ({ value }: { value: any }) => parseFloat(value) || 0;

export class CreateSalaryRevisionDto {
  @IsDateString()
  effectiveFrom: string;

  /** Gross salary entered by HR — all components are auto-derived */
  @Transform(toNum) @IsNumber() @Min(0)
  grossSalary: number;

  /** OT rate multiplier — default 1.5× (time-and-a-half), 2× for double time */
  @IsOptional() @Transform(toNum) @IsNumber() @Min(1) @Max(3)
  otMultiplier?: number;

  @IsOptional() @IsString()
  remarks?: string;
}
