import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { CreateEmployeeDto, EmpStatus } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class UpdateStatusDto {
  @IsEnum(EmpStatus)
  status: EmpStatus;

  @IsOptional()
  @IsDateString()
  dateOfExit?: string;
}
