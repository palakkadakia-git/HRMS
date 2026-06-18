import { Module } from '@nestjs/common';
import { EmployeeSitesController } from './employee-sites.controller';
import { EmployeeSitesService } from './employee-sites.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeSitesController],
  providers: [EmployeeSitesService],
  exports: [EmployeeSitesService],
})
export class EmployeeSitesModule {}
