import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/** Extensions accepted for document-library uploads. */
const ALLOWED_EXT = /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|txt|csv|zip)$/i;

/** Mimetypes accepted for document-library uploads (some browsers send generic types for Office docs). */
const ALLOWED_MIME = [
  /^application\/pdf$/i,
  /^application\/msword$/i,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i,
  /^application\/vnd\.ms-excel$/i,
  /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/i,
  /^application\/vnd\.ms-powerpoint$/i,
  /^application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation$/i,
  /^image\/(png|jpeg|gif|webp)$/i,
  /^text\/(plain|csv)$/i,
  /^application\/(zip|x-zip-compressed)$/i,
];

/**
 * Multer options for document uploads. Keeps the file in memory (memoryStorage) so the
 * buffer can be streamed straight to Microsoft Graph without touching disk — important
 * on ephemeral/scaled hosts. Files stream to Graph via simple upload, so 100 MB is safe.
 */
export function documentUploadMulterOptions() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const okMime = ALLOWED_MIME.some((re) => re.test(file.mimetype));
      const okExt = ALLOWED_EXT.test(file.originalname ?? '');
      if (okMime || okExt) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            'Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, images, text, or zip.',
          ),
          false,
        );
      }
    },
  };
}
