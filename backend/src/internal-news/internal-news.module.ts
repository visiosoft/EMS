import { Module } from '@nestjs/common';
import { InternalNewsController } from './internal-news.controller';
import { InternalNewsService } from './internal-news.service';

@Module({
  controllers: [InternalNewsController],
  providers: [InternalNewsService],
  exports: [InternalNewsService],
})
export class InternalNewsModule {}
