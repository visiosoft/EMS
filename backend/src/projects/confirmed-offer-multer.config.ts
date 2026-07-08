import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { join } from 'path';

export const CONFIRMED_OFFER_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'confirmed-offers',
);

export function confirmedOfferMulterOptions() {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, CONFIRMED_OFFER_UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const ext = '.pdf';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (
        /\.pdf$/i.test(file.originalname) ||
        /^application\/pdf$/i.test(file.mimetype)
      ) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only PDF files are accepted.'), false);
      }
    },
  };
}
