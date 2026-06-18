import { Module } from '@nestjs/common';
import { DesignationMasterService } from './designation-master.service';
import { DesignationMasterController } from './designation-master.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DesignationMasterController],
  providers: [DesignationMasterService],
  exports: [DesignationMasterService],
})
export class DesignationMasterModule {}
