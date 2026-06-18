import { IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const toNum = ({ value }: { value: any }) => parseFloat(value) ?? 0;

export class UpdatePayslipDto {
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  tds?: number;

  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  penaltyDeduction?: number;

  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  advanceDeduction?: number;
}
