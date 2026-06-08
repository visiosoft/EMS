import { Module } from '@nestjs/common';
import { InternalHandbookController } from './internal-handbook.controller';
import { InternalHandbookService } from './internal-handbook.service';

@Module({
  controllers: [InternalHandbookController],
  providers: [InternalHandbookService],
  exports: [InternalHandbookService],
})
export class InternalHandbookModule {}
