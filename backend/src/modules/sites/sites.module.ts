import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SitesController],
})
export class SitesModule {}
