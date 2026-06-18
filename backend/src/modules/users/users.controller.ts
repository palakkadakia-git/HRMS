import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Post()
  @RequirePermission('settings', 'create')
  create(@Body() dto: CreateUserDto) { return this.svc.create(dto); }

  @Patch(':id')
  @RequirePermission('settings', 'update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.svc.updateUser(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('settings', 'delete')
  remove(@Param('id') id: string, @CurrentUser('id') requesterId: string) {
    return this.svc.deleteUser(id, requesterId);
  }
}
