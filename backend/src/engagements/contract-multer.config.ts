import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { join } from 'path';

export const CONTRACT_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'contracts',
);

export function contractMulterOptions() {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, CONTRACT_UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const ext = file.originalname?.match(/\.[^.]+$/)?.[0] ?? '.pdf';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      // Gate by mimetype OR extension — some browsers send a generic
      // (or empty) mimetype for .docx uploads.
      const okMime =
        /^application\/pdf$/i.test(file.mimetype) ||
        /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(
          file.mimetype,
        );
      const okExt = /\.(pdf|docx)$/i.test(file.originalname ?? '');
      if (okMime || okExt) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException('Only PDF or Word (.docx) files are allowed.'),
          false,
        );
      }
    },
  };
}
