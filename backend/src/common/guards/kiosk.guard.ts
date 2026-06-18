import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface KioskSession {
  siteId: string;
}

/**
 * Guard for kiosk-only endpoints.
 * Validates a Bearer token whose payload contains `{ type: 'kiosk', siteId }`.
 * Attaches `{ siteId }` to `request.kioskSession`.
 */
@Injectable()
export class KioskGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kiosk token missing');
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwtService.verify<any>(token, {
        secret: process.env.JWT_SECRET || 'fallback_secret_change_in_prod',
      });

      if (payload?.type !== 'kiosk' || !payload?.siteId) {
        throw new UnauthorizedException('Not a kiosk token');
      }

      request['kioskSession'] = { siteId: payload.siteId } satisfies KioskSession;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired kiosk token');
    }
  }
}
