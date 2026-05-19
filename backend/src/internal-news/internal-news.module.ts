import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { InternalNewsController } from './internal-news.controller';
import { InternalNewsService } from './internal-news.service';

@Module({
  imports: [AdminUsersModule],
  controllers: [InternalNewsController],
  providers: [InternalNewsService],
  exports: [InternalNewsService],
})
export class InternalNewsModule {}
