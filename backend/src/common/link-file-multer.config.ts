import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { getUploadRoot } from './upload-path';

export const LINK_FILE_UPLOAD_DIR = join(getUploadRoot(), 'link-files');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.txt',
]);

export function linkFileMulterOptions() {
  return {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        callback(null, LINK_FILE_UPLOAD_DIR);
      },
      filename: (_req, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        callback(null, `${randomUUID()}${extension}`);
      },
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const extension = extname(file.originalname).toLowerCase();
      if (ALLOWED_EXTENSIONS.has(extension)) {
        callback(null, true);
        return;
      }
      callback(
        new BadRequestException(
          'Unsupported file type. Allowed: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG/JPEG, PNG, WebP, and TXT.',
        ),
        false,
      );
    },
  };
}