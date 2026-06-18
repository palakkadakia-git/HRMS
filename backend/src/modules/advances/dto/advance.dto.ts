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

  @IsOptional()
  @IsString()
  approvedBy?: string;

  /** Required for ADHOC — monthly recovery amount */
  @IsOptional()
  @IsNumber()
  @Min(1)
  installmentAmount?: number;
}

export class BulkWeeklyAdvanceDto {
  @IsArray()
  @IsString({ each: true })
  employeeIds: string[];

  @IsDateString()
  disbursedOn: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
