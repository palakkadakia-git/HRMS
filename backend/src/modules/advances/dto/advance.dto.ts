import {
  IsString, IsNumber, IsDateString, IsOptional,
  IsEnum, IsArray, Min,
} from 'class-validator';
import { AdvanceType } from '@prisma/client';

export class CreateAdvanceDto {
  @IsString()
  employeeId: string;

  @IsEnum(AdvanceType)
  type: AdvanceType;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsDateString()
  disbursedOn: string;

  @IsOptional()
  @IsString()
  reason?: string;

  /** Required for ADHOC — monthly recovery amount */
  @IsOptional()
  @IsNumber()
  @Min(1)
  installmentAmount?: number;
}

export class BulkWeeklyAdvanceDto {
  /** Employee IDs to issue ₹1,000 weekly advance to */
  @IsArray()
  @IsString({ each: true })
  employeeIds: string[];

  /** The Sunday date (ISO string) the advance was given */
  @IsDateString()
  disbursedOn: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
