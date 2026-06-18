import { SetMetadata, applyDecorators } from '@nestjs/common';
import { CrudAction, AppModule } from './permissions.service';
import { PERM_MODULE_KEY, PERM_ACTION_KEY } from './permissions.guard';

/**
 * Mark a route as requiring a specific permission.
 * PermissionsGuard (registered as APP_GUARD) reads this metadata.
 *
 * @example
 *   @RequirePermission('employees', 'delete')
 *   @Delete(':id')
 *   remove(...) {}
 */
export const RequirePermission = (module: AppModule, action: CrudAction) =>
  applyDecorators(
    SetMetadata(PERM_MODULE_KEY, module),
    SetMetadata(PERM_ACTION_KEY, action),
  );
