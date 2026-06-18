import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() cin?: string;
  @IsOptional() @IsString() tan?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() state?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt() @Min(0) @Max(1_000_000)
  pfCeiling?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt() @Min(0) @Max(1_000_000)
  esiCeiling?: number;
}
