import {
  IsString, IsOptional, IsEnum, IsBoolean,
  IsDateString, MaxLength, MinLength, Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum Sex        { MALE = 'MALE', FEMALE = 'FEMALE', OTHER = 'OTHER' }
export enum BloodGroup { A_POS = 'A_POS', A_NEG = 'A_NEG', B_POS = 'B_POS', B_NEG = 'B_NEG', O_POS = 'O_POS', O_NEG = 'O_NEG', AB_POS = 'AB_POS', AB_NEG = 'AB_NEG' }
export enum EmpType    { INTERN = 'INTERN', ON_ROLLS = 'ON_ROLLS', ON_CONTRACT = 'ON_CONTRACT' }
export enum EmpStatus  { ACTIVE = 'ACTIVE', PROBATION = 'PROBATION', NOTICE_PERIOD = 'NOTICE_PERIOD', INACTIVE = 'INACTIVE' }
export enum TaxRegime  { NEW = 'NEW', OLD = 'OLD' }

export class CreateEmployeeDto {
  // Personal
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEnum(Sex) sex: Sex;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(BloodGroup) bloodGroup?: BloodGroup;
  @IsOptional() @IsString() fathersName?: string;

  // Address
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() stateName?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() @MaxLength(10) pincode?: string;

  // Employment
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEnum(EmpType) type?: EmpType;
  @IsOptional() @IsEnum(EmpStatus) status?: EmpStatus;
  @IsOptional() @IsDateString() dateOfJoining?: string;
  @IsOptional() @IsDateString() dateOfExit?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean() isBlacklisted?: boolean;
  @IsOptional() @IsString() shiftId?: string;  // attendance shift (site assignments managed via /employees/:id/sites)

  // Statutory
  @IsOptional() @IsString() @MinLength(12) @MaxLength(12) aadhaarNumber?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, { message: 'Invalid PAN format' }) panNumber?: string;
  @IsOptional() @IsString() epfNumber?: string;
  @IsOptional() @IsString() uanNumber?: string;
  @IsOptional() @IsString() esiNumber?: string;
  @IsOptional() @IsEnum(TaxRegime) taxRegime?: TaxRegime;
  @IsOptional() @IsString() ptState?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean() pfExempt?: boolean;

  // Bank
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() ifsc?: string;
  @IsOptional() @IsString() bankName?: string;
}
