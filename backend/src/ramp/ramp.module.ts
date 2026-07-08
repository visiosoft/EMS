import { Module } from '@nestjs/common';
import { RampController } from './ramp.controller';
import { RampService } from './ramp.service';

@Module({
  controllers: [RampController],
  providers: [RampService],
  exports: [RampService],
})
export class RampModule {}
