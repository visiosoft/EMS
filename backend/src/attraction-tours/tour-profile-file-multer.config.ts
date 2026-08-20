import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { join } from 'path';
import { getUploadRoot } from '../common/upload-path';

export const TOUR_PROFILE_FILE_UPLOAD_DIR = join(
  getUploadRoot(),
  'tour-profile-files',
);

const MIME_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'text/plain': '.txt',
};

const ALLOWED_MIME = new Set(Object.keys(MIME_EXT));

/** Multer config for the tour-profile file fields (Deal Sheet, VIP PDF, etc.). */
export function tourProfileFileMulterOptions() {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, TOUR_PROFILE_FILE_UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        const ext = MIME_EXT[mime] ?? '.bin';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const mime = (file.mimetype || '').toLowerCase();
      if (ALLOWED_MIME.has(mime)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            'Unsupported file type. Allowed: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, images (JPG/PNG/WebP), TXT.',
          ),
          false,
        );
      }
    },
  };
}

/** Field names the multipart handler accepts, matching Tour profile fields. */
export const TOUR_PROFILE_FILE_FIELDS = [
  { name: 'techRiderFile', maxCount: 1 },
  { name: 'dealSheetFile', maxCount: 1 },
  { name: 'agencySalesFile', maxCount: 1 },
  { name: 'marketingManualFile', maxCount: 1 },
  { name: 'marketingMaterialFile', maxCount: 1 },
  { name: 'vipPdfFile', maxCount: 1 },
] as const;

export type TourProfileFileKey =
  (typeof TOUR_PROFILE_FILE_FIELDS)[number]['name'];
