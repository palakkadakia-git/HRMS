import { IsString, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { SkillLevel } from '@prisma/client';

export class CreateMinimumWageDto {
  @IsString()
  siteId: string;

  @IsEnum(SkillLevel)
  skillLevel: SkillLevel;

  @IsNumber()
  @Min(0)
  monthlyWage: number;

  @IsDateString()
  effectiveFrom: string;
}
