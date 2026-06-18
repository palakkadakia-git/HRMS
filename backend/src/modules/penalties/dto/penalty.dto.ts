import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreatePenaltyDto {
  @IsString()
  employeeId: string;

  @IsString()
  witnessId: string;

  @IsString()
  siteId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  reason: string;

  @IsDateString()
  date: string;
}

export class CancelPenaltyDto {
  @IsString()
  cancelledBy: string;

  @IsString()
  cancelReason: string;
}
