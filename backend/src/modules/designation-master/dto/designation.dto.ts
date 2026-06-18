import { IsString, IsEnum } from 'class-validator';

export enum SkillLevel {
  STAFF        = 'STAFF',
  SKILLED      = 'SKILLED',
  SEMI_SKILLED = 'SEMI_SKILLED',
  UNSKILLED    = 'UNSKILLED',
}

export class CreateDesignationDto {
  @IsString() designation: string;
  @IsEnum(SkillLevel) skillLevel: SkillLevel;
}

export class UpdateDesignationDto {
  @IsString() designation: string;
  @IsEnum(SkillLevel) skillLevel: SkillLevel;
}
