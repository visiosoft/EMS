"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentUploadMulterOptions = documentUploadMulterOptions;
const common_1 = require("@nestjs/common");
const multer_1 = require("multer");
const ALLOWED_EXT = /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|txt|csv|zip)$/i;
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
function documentUploadMulterOptions() {
    return {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 100 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const okMime = ALLOWED_MIME.some((re) => re.test(file.mimetype));
            const okExt = ALLOWED_EXT.test(file.originalname ?? '');
            if (okMime || okExt) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, images, text, or zip.'), false);
            }
        },
    };
}
//# sourceMappingURL=document-upload-multer.config.js.map