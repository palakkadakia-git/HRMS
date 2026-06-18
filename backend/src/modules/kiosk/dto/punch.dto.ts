import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class PunchDto {
  @IsString()
  employeeId: string;

  @IsOptional() @IsNumber() @Min(-90)  @Max(90)  lat?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
}
