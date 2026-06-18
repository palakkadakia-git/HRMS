import { Module } from '@nestjs/common';
import { MinimumWagesService } from './minimum-wages.service';
import { MinimumWagesController } from './minimum-wages.controller';

@Module({
  controllers: [MinimumWagesController],
  providers:   [MinimumWagesService],
})
export class MinimumWagesModule {}
