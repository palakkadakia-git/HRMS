import { IsString, IsDateString, IsEnum, IsNumber, IsInt, Min, Max, IsOptional } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveRecordDto {
  @IsString()           employeeId: string;
  @IsDateString()       date: string;           // "YYYY-MM-DD"
  @IsEnum(LeaveType)    leaveType: LeaveType;
  @IsNumber()  @Min(0.5) @Max(1) days: number; // 0.5 or 1
  @IsOptional() @IsString() remarks?: string;
}

export class AllocateLeaveDto {
  @IsInt()   year: number;
}

export class AccruePLDto {
  @IsInt() month: number;
  @IsInt() year: number;
}

