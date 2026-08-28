import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { join } from 'path';
import { getUploadRoot } from '../common/upload-path';

export const DRAFTED_OFFER_UPLOAD_DIR = join(
  getUploadRoot(),
  'drafted-offers',
);

export const IN_CONSIDERATION_OFFER_UPLOAD_DIR = join(
  getUploadRoot(),
  'in-consideration-offers',
);

function offerLinkMulterOptions(uploadDir: string) {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, uploadDir);
      },
      filename: (_req, _file, cb) => {
        cb(null, `${randomUUID()}.pdf`);
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

export function draftedOfferMulterOptions() {
  return offerLinkMulterOptions(DRAFTED_OFFER_UPLOAD_DIR);
}

export function inConsiderationOfferMulterOptions() {
  return offerLinkMulterOptions(IN_CONSIDERATION_OFFER_UPLOAD_DIR);
}
