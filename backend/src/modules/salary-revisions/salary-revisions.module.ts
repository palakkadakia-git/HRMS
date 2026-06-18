import { Module } from '@nestjs/common';
import { SalaryRevisionsController } from './salary-revisions.controller';
import { SalaryRevisionsService } from './salary-revisions.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalaryRevisionsController],
  providers: [SalaryRevisionsService],
  exports: [SalaryRevisionsService],
})
export class SalaryRevisionsModule {}
