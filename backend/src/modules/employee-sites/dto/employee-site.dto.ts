import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddEmployeeSiteDto {
  @IsString()
  siteId: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class SetPrimarySiteDto {
  @IsString()
  siteId: string;
}
