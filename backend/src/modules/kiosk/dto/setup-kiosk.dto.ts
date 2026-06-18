import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class SetupKioskDto {
  @IsString()
  siteId: string;

  @IsNumber()
  @Min(-90) @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180) @Max(180)
  lng: number;
}
