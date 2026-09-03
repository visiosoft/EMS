import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { linkFileMulterOptions } from './link-file-multer.config';

@Controller('link-files')
@UseGuards(InternalAccessGuard)
export class LinkFileController {
  @Post()
  @UseInterceptors(FileInterceptor('file', linkFileMulterOptions()))
  upload(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/uploads/link-files/${file.filename}`,
      name: file.originalname,
    };
  }
}