import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { News } from '../entities/news.entity';
import { InternalNewsController } from './internal-news.controller';
import { InternalNewsService } from './internal-news.service';

@Module({
  imports: [TypeOrmModule.forFeature([News])],
  controllers: [InternalNewsController],
  providers: [InternalNewsService],
  exports: [InternalNewsService],
})
export class InternalNewsModule {}
