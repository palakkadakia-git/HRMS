import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService, CrudAction } from './permissions.service';

export const PERM_MODULE_KEY = 'perm_module';
export const PERM_ACTION_KEY = 'perm_action';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Read metadata set by @RequirePermission — handler takes precedence over class
    const module = this.reflector.getAllAndOverride<string>(PERM_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No annotation → not a permission-guarded route; let it pass
    if (!module) return true;

    const action = this.reflector.getAllAndOverride<CrudAction>(PERM_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user    = request.user;

    // Should never happen (JwtAuthGuard runs first), but defensive check
    if (!user) return false;

    return this.permissionsService.can(user.role, module, action);
  }
}
