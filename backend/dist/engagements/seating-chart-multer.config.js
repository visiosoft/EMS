"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEATING_CHART_UPLOAD_DIR = void 0;
exports.seatingChartMulterOptions = seatingChartMulterOptions;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const multer_1 = require("multer");
const path_1 = require("path");
exports.SEATING_CHART_UPLOAD_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'seating-charts');
const MIME_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
};
function seatingChartMulterOptions() {
    return {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, exports.SEATING_CHART_UPLOAD_DIR);
            },
            filename: (_req, file, cb) => {
                const mime = (file.mimetype || '').toLowerCase();
                const ext = MIME_EXT[mime] ?? '.jpg';
                cb(null, `${(0, crypto_1.randomUUID)()}${ext}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (/^(image\/(jpeg|png|gif|webp)|application\/pdf)$/i.test(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only JPEG, PNG, WebP, GIF images or PDF files are allowed.'), false);
            }
        },
    };
}
//# sourceMappingURL=seating-chart-multer.config.js.map