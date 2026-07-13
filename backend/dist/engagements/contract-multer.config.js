"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTRACT_UPLOAD_DIR = void 0;
exports.contractMulterOptions = contractMulterOptions;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const multer_1 = require("multer");
const path_1 = require("path");
const upload_path_1 = require("../common/upload-path");
exports.CONTRACT_UPLOAD_DIR = (0, path_1.join)((0, upload_path_1.getUploadRoot)(), 'contracts');
function contractMulterOptions() {
    return {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, exports.CONTRACT_UPLOAD_DIR);
            },
            filename: (_req, file, cb) => {
                const ext = file.originalname?.match(/\.[^.]+$/)?.[0] ?? '.pdf';
                cb(null, `${(0, crypto_1.randomUUID)()}${ext}`);
            },
        }),
        limits: { fileSize: 25 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const okMime = /^application\/pdf$/i.test(file.mimetype) ||
                /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(file.mimetype);
            const okExt = /\.(pdf|docx)$/i.test(file.originalname ?? '');
            if (okMime || okExt) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only PDF or Word (.docx) files are allowed.'), false);
            }
        },
    };
}
//# sourceMappingURL=contract-multer.config.js.map