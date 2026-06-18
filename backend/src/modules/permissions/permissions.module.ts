import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from './permissions.guard';

@Global()   // Makes PermissionsService injectable everywhere without explicit imports
@Module({
  imports:     [PrismaModule],
  controllers: [PermissionsController],
  providers:   [PermissionsService, PermissionsGuard],
  exports:     [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
