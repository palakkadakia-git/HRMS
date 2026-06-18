import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { EmpStatus, EmpType } from './create-employee.dto';

/** Convert empty string query params to undefined so @IsOptional works correctly */
const emptyToUndefined = ({ value }: { value: any }) =>
  value === '' || value == null ? undefined : value;

export class QueryEmployeeDto {
  @IsOptional() @IsString() search?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(EmpStatus)
  status?: EmpStatus;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(EmpType)
  type?: EmpType;

  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Transform(({ value }) => parseInt(value)) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
