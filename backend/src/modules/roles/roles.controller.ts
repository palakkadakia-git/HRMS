import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { RolesService } from './roles.service';
import { IsString, MinLength } from 'class-validator';

class CreateRoleDto {
  @IsString() @MinLength(1) name:  string;
  @IsString()               label: string;
}

@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private roles: RolesService) {}

  /** List all roles (needed for the Create User form's role selector). */
  @Get()
  findAll() {
    return this.roles.findAll();
  }

  /** Create a new custom role. */
  @Post()
  @RequirePermission('settings', 'create')
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto.name, dto.label);
  }

  /** Delete a custom role (system roles are protected in the service). */
  @Delete(':name')
  @HttpCode(204)
  @RequirePermission('settings', 'delete')
  delete(@Param('name') name: string) {
    return this.roles.delete(name);
  }
}
