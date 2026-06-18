import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSiteDto {
  @IsString() name: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() isActive?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() esiApplicable?: boolean;
  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(50) geofenceRadius?: number;
}

export class UpdateSiteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() isActive?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() esiApplicable?: boolean;
  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(50) geofenceRadius?: number;
}
