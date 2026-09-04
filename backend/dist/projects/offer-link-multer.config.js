"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IN_CONSIDERATION_OFFER_UPLOAD_DIR = exports.DRAFTED_OFFER_UPLOAD_DIR = void 0;
exports.draftedOfferMulterOptions = draftedOfferMulterOptions;
exports.inConsiderationOfferMulterOptions = inConsiderationOfferMulterOptions;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const multer_1 = require("multer");
const path_1 = require("path");
const upload_path_1 = require("../common/upload-path");
exports.DRAFTED_OFFER_UPLOAD_DIR = (0, path_1.join)((0, upload_path_1.getUploadRoot)(), 'drafted-offers');
exports.IN_CONSIDERATION_OFFER_UPLOAD_DIR = (0, path_1.join)((0, upload_path_1.getUploadRoot)(), 'in-consideration-offers');
function offerLinkMulterOptions(uploadDir) {
    return {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, uploadDir);
            },
            filename: (_req, _file, cb) => {
                cb(null, `${(0, crypto_1.randomUUID)()}.pdf`);
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
function draftedOfferMulterOptions() {
    return offerLinkMulterOptions(exports.DRAFTED_OFFER_UPLOAD_DIR);
}
function inConsiderationOfferMulterOptions() {
    return offerLinkMulterOptions(exports.IN_CONSIDERATION_OFFER_UPLOAD_DIR);
}
//# sourceMappingURL=offer-link-multer.config.js.map