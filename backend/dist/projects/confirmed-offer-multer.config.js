"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIRMED_OFFER_UPLOAD_DIR = void 0;
exports.confirmedOfferMulterOptions = confirmedOfferMulterOptions;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const multer_1 = require("multer");
const path_1 = require("path");
exports.CONFIRMED_OFFER_UPLOAD_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'confirmed-offers');
function confirmedOfferMulterOptions() {
    return {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, exports.CONFIRMED_OFFER_UPLOAD_DIR);
            },
            filename: (_req, file, cb) => {
                const ext = '.pdf';
                cb(null, `${(0, crypto_1.randomUUID)()}${ext}`);
            },
        }),
        limits: { fileSize: 50 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (/\.pdf$/i.test(file.originalname) ||
                /^application\/pdf$/i.test(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only PDF files are accepted.'), false);
            }
        },
    };
}
//# sourceMappingURL=confirmed-offer-multer.config.js.map