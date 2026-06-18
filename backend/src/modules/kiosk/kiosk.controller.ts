import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { KioskService } from './kiosk.service';
import { SetupKioskDto } from './dto/setup-kiosk.dto';
import { PunchDto } from './dto/punch.dto';
import { KioskGuard, KioskSession } from '../../common/guards/kiosk.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('kiosk')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  /**
   * HR activates a kiosk for a site.
   * Requires a valid HR JWT (handled by global JwtAuthGuard).
   * Returns a long-lived kiosk-specific JWT.
   */
  @Post('session')
  setupKiosk(@Body() dto: SetupKioskDto) {
    return this.kioskService.setupKiosk(dto);
  }

  /**
   * Returns employees at the kiosk's site, including face descriptors.
   * Authenticated by kiosk JWT only (not the regular HR JWT).
   */
  @Public()                    // bypass global JwtAuthGuard …
  @UseGuards(KioskGuard)       // … use KioskGuard instead
  @Get('employees')
  getEmployees(@Req() req: Request) {
    const { siteId } = req['kioskSession'] as KioskSession;
    return this.kioskService.getEmployees(siteId);
  }

  /**
   * Record a punch-in or punch-out.
   * Face matching happens client-side; this endpoint just records the result.
   */
  @Public()
  @UseGuards(KioskGuard)
  @Post('punch')
  punch(@Req() req: Request, @Body() dto: PunchDto) {
    const { siteId } = req['kioskSession'] as KioskSession;
    return this.kioskService.punch(siteId, dto);
  }

  /**
   * Kiosk page polls this to show site name in the header.
   */
  @Public()
  @UseGuards(KioskGuard)
  @Get('site')
  getSiteInfo(@Req() req: Request) {
    const { siteId } = req['kioskSession'] as KioskSession;
    return this.kioskService.getSiteInfo(siteId);
  }
}
