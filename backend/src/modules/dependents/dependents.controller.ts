import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { DependentsService } from './dependents.service';
import { CreateDependentDto } from './dto/create-dependent.dto';

// All routes are nested: /api/employees/:employeeId/dependents
@Controller('employees/:employeeId/dependents')
export class DependentsController {
  constructor(private dependentsService: DependentsService) {}

  @Get()
  findAll(@Param('employeeId') employeeId: string) {
    return this.dependentsService.findAll(employeeId);
  }

  @Post()
  @RequirePermission('employees', 'create')
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateDependentDto,
  ) {
    return this.dependentsService.create(employeeId, dto);
  }

  @Put(':dependentId')
  @RequirePermission('employees', 'update')
  update(
    @Param('employeeId') employeeId: string,
    @Param('dependentId') dependentId: string,
    @Body() dto: Partial<CreateDependentDto>,
  ) {
    return this.dependentsService.update(employeeId, dependentId, dto);
  }

  @Delete(':dependentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('employees', 'delete')
  remove(
    @Param('employeeId') employeeId: string,
    @Param('dependentId') dependentId: string,
  ) {
    return this.dependentsService.remove(employeeId, dependentId);
  }
}
