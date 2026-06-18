import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the current authenticated user (or a specific field) from the request.
 *
 * Usage:
 *   @CurrentUser() user: User
 *   @CurrentUser('id') userId: string
 *   @CurrentUser('role') role: UserRole
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
