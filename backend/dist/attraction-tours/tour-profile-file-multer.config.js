"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOUR_PROFILE_FILE_FIELDS = exports.TOUR_PROFILE_FILE_UPLOAD_DIR = void 0;
exports.tourProfileFileMulterOptions = tourProfileFileMulterOptions;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const multer_1 = require("multer");
const path_1 = require("path");
const upload_path_1 = require("../common/upload-path");
exports.TOUR_PROFILE_FILE_UPLOAD_DIR = (0, path_1.join)((0, upload_path_1.getUploadRoot)(), 'tour-profile-files');
const MIME_EXT = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'text/plain': '.txt',
};
const ALLOWED_MIME = new Set(Object.keys(MIME_EXT));
function tourProfileFileMulterOptions() {
    return {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, exports.TOUR_PROFILE_FILE_UPLOAD_DIR);
            },
            filename: (_req, file, cb) => {
                const mime = (file.mimetype || '').toLowerCase();
                const ext = MIME_EXT[mime] ?? '.bin';
                cb(null, `${(0, crypto_1.randomUUID)()}${ext}`);
            },
        }),
        limits: { fileSize: 25 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const mime = (file.mimetype || '').toLowerCase();
            if (ALLOWED_MIME.has(mime)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Unsupported file type. Allowed: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, images (JPG/PNG/WebP), TXT.'), false);
            }
        },
    };
}
exports.TOUR_PROFILE_FILE_FIELDS = [
    { name: 'techRiderFile', maxCount: 1 },
    { name: 'dealSheetFile', maxCount: 1 },
    { name: 'agencySalesFile', maxCount: 1 },
    { name: 'stagehandListFile', maxCount: 1 },
    { name: 'linesetScheduleFile', maxCount: 1 },
    { name: 'cateringRiderFile', maxCount: 1 },
    { name: 'stageDimensionsFile', maxCount: 1 },
    { name: 'travelRequirementsFile', maxCount: 1 },
    { name: 'soundRequirementsFile', maxCount: 1 },
    { name: 'videoRequirementsFile', maxCount: 1 },
    { name: 'lightingRequirementsFile', maxCount: 1 },
    { name: 'heavyEquipmentRequirementsFile', maxCount: 1 },
    { name: 'marketingManualFile', maxCount: 1 },
    { name: 'marketingMaterialFile', maxCount: 1 },
    { name: 'vipPdfFile', maxCount: 1 },
];
//# sourceMappingURL=tour-profile-file-multer.config.js.map