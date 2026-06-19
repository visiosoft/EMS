import { Module } from '@nestjs/common';
import { DocumentLibraryController } from './document-library.controller';
import { DocumentLibraryService } from './document-library.service';

@Module({
  controllers: [DocumentLibraryController],
  providers: [DocumentLibraryService],
  exports: [DocumentLibraryService],
})
export class DocumentLibraryModule {}
