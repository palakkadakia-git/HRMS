import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Sex } from '../../employees/dto/create-employee.dto';

export enum Relationship {
  SPOUSE  = 'SPOUSE',
  CHILD   = 'CHILD',
  PARENT  = 'PARENT',
  SIBLING = 'SIBLING',
  OTHER   = 'OTHER',
}

export class CreateDependentDto {
  @IsString()             firstName: string;
  @IsString()             lastName: string;
  @IsEnum(Sex)            sex: Sex;
  @IsEnum(Relationship)   relationship: Relationship;
  @IsOptional() @IsDateString() dateOfBirth?: string;
}
