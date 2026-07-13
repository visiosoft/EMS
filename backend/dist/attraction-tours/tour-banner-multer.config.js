"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOUR_BANNER_UPLOAD_DIR = void 0;
exports.tourBannerMulterOptions = tourBannerMulterOptions;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const multer_1 = require("multer");
const path_1 = require("path");
const upload_path_1 = require("../common/upload-path");
exports.TOUR_BANNER_UPLOAD_DIR = (0, path_1.join)((0, upload_path_1.getUploadRoot)(), 'tour-banners');
const MIME_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};
function tourBannerMulterOptions() {
    return {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, exports.TOUR_BANNER_UPLOAD_DIR);
            },
            filename: (_req, file, cb) => {
                const mime = (file.mimetype || '').toLowerCase();
                const ext = MIME_EXT[mime] ?? '.jpg';
                cb(null, `${(0, crypto_1.randomUUID)()}${ext}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only JPEG, PNG, WebP, or GIF images are allowed.'), false);
            }
        },
    };
}
//# sourceMappingURL=tour-banner-multer.config.js.map