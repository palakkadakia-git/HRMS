import { Module } from '@nestjs/common';
import { AttendanceLogController } from './attendance-log.controller';
import { AttendanceLogService } from './attendance-log.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceLogController],
  providers: [AttendanceLogService],
})
export class AttendanceLogModule {}
