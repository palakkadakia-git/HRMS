import { IsString, IsEmail, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()  email:    string;
  @IsString() name:     string;
  @IsString() role:     string;
  @IsString() @MinLength(6) password: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?:     string;
  @IsOptional() @IsString() role?:     string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() isActive?: boolean;
}
