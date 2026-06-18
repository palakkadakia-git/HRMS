import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateShiftDto {
  @IsString() name: string;
  @IsInt() @Min(1) @Max(24) shiftHours: number;
}

export class UpdateShiftDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(24) shiftHours?: number;
}
