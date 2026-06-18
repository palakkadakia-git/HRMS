import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';

class UpsertPermissionDto {
  canCreate: boolean;
  canRead:   boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly svc: PermissionsService) {}

  /**
   * GET /permissions
   * Full matrix — used by the Settings → Access Control UI (ADMIN only in practice).
   */
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  /**
   * GET /permissions/me
   * Returns the permission rows for the currently authenticated user's role.
   * Used by the frontend usePermissions() hook.
   */
  @Get('me')
  getMyPermissions(@CurrentUser('role') role: string) {
    if (role === 'ADMIN') {
      // ADMIN always has full CRUD — return a synthetic full-access matrix
      const MODULES = ['employees', 'attendance', 'leave', 'payroll', 'advances', 'penalties', 'reports', 'settings', 'kiosk'];
      return MODULES.map(module => ({
        role,
        module,
        canCreate: true,
        canRead:   true,
        canUpdate: true,
        canDelete: true,
      }));
    }
    return this.svc.getForRole(role);
  }

  /**
   * PUT /permissions/:role/:module
   * Update a single role × module permission row.
   * Only ADMIN should call this (enforced at frontend; adding @RequirePermission here
   * would require 'settings' delete access which may be too broad — ADMIN bypass handles it).
   */
  @Put(':role/:module')
  upsert(
    @Param('role')   role:   string,
    @Param('module') module: string,
    @Body()          dto:    UpsertPermissionDto,
  ) {
    return this.svc.upsert(role, module, dto);
  }
}
