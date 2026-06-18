import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KioskController } from './kiosk.controller';
import { KioskService } from './kiosk.service';
import { KioskGuard } from '../../common/guards/kiosk.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret_change_in_prod',
    }),
  ],
  controllers: [KioskController],
  providers: [KioskService, KioskGuard],
})
export class KioskModule {}
