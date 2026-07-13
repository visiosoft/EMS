"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const path_2 = require("path");
const upload_path_1 = require("../common/upload-path");
const internal_access_guard_js_1 = require("../internal-access/internal-access.guard.js");
const learning_dto_js_1 = require("./dto/learning.dto.js");
const learning_service_js_1 = require("./learning.service.js");
const CERTIFICATE_UPLOAD_DIR = (0, path_2.join)((0, upload_path_1.getUploadRoot)(), 'certificates');
fs.mkdirSync(CERTIFICATE_UPLOAD_DIR, { recursive: true });
const certificateUploadOptions = () => ({
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => {
            fs.mkdirSync(CERTIFICATE_UPLOAD_DIR, { recursive: true });
            cb(null, CERTIFICATE_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = (0, path_1.extname)(file.originalname).toLowerCase();
        if (allowed.includes(ext))
            cb(null, true);
        else
            cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
    },
});
let LearningController = class LearningController {
    learningService;
    constructor(learningService) {
        this.learningService = learningService;
    }
    getPlatforms() {
        return this.learningService.getPlatforms();
    }
    getCertifications(departmentId, status, level, platformId) {
        return this.learningService.getCertifications(departmentId, status, level, platformId);
    }
    getCertificationById(id) {
        return this.learningService.getCertificationById(id);
    }
    createCertification(dto) {
        return this.learningService.createCertification(dto);
    }
    updateCertification(id, dto) {
        return this.learningService.updateCertification(id, dto);
    }
    toggleCertificationStatus(id) {
        return this.learningService.toggleCertificationStatus(id);
    }
    getSubmissions(departmentId, contactId, status, search) {
        return this.learningService.getSubmissions(departmentId, contactId, status, search);
    }
    getSubmissionById(id) {
        return this.learningService.getSubmissionById(id);
    }
    createSubmission(dto, certificateFile) {
        return this.learningService.createSubmission(dto, certificateFile);
    }
    reviewSubmission(id, dto) {
        return this.learningService.reviewSubmission(id, dto);
    }
    getEmployeeScores(departmentId) {
        return this.learningService.getEmployeeScores(departmentId);
    }
    getMyScore(contactId, departmentId) {
        return this.learningService.getMyScore(contactId, departmentId);
    }
    getProgress(contactId, departmentId) {
        return this.learningService.getProgress(contactId, departmentId);
    }
    getPointTiers() {
        return this.learningService.getPointTiers();
    }
    getOverview(departmentId) {
        return this.learningService.getOverview(departmentId);
    }
};
exports.LearningController = LearningController;
__decorate([
    (0, common_1.Get)('platforms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getPlatforms", null);
__decorate([
    (0, common_1.Get)('certifications'),
    __param(0, (0, common_1.Query)('departmentId', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('status', new common_1.DefaultValuePipe('all'))),
    __param(2, (0, common_1.Query)('level', new common_1.DefaultValuePipe('all'))),
    __param(3, (0, common_1.Query)('platformId', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getCertifications", null);
__decorate([
    (0, common_1.Get)('certifications/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getCertificationById", null);
__decorate([
    (0, common_1.Post)('certifications'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [learning_dto_js_1.CreateCertificationDto]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "createCertification", null);
__decorate([
    (0, common_1.Patch)('certifications/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, learning_dto_js_1.UpdateCertificationDto]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "updateCertification", null);
__decorate([
    (0, common_1.Patch)('certifications/:id/toggle-status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "toggleCertificationStatus", null);
__decorate([
    (0, common_1.Get)('submissions'),
    __param(0, (0, common_1.Query)('departmentId', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('contactId', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('status', new common_1.DefaultValuePipe(''))),
    __param(3, (0, common_1.Query)('search', new common_1.DefaultValuePipe(''))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getSubmissions", null);
__decorate([
    (0, common_1.Get)('submissions/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getSubmissionById", null);
__decorate([
    (0, common_1.Post)('submissions'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('certificateFile', certificateUploadOptions())),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [learning_dto_js_1.CreateSubmissionDto, Object]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "createSubmission", null);
__decorate([
    (0, common_1.Patch)('submissions/:id/review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, learning_dto_js_1.ReviewSubmissionDto]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "reviewSubmission", null);
__decorate([
    (0, common_1.Get)('scores'),
    __param(0, (0, common_1.Query)('departmentId', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getEmployeeScores", null);
__decorate([
    (0, common_1.Get)('scores/my'),
    __param(0, (0, common_1.Query)('contactId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('departmentId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getMyScore", null);
__decorate([
    (0, common_1.Get)('progress'),
    __param(0, (0, common_1.Query)('contactId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('departmentId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Get)('tiers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getPointTiers", null);
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, common_1.Query)('departmentId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LearningController.prototype, "getOverview", null);
exports.LearningController = LearningController = __decorate([
    (0, common_1.UseGuards)(internal_access_guard_js_1.InternalAccessGuard),
    (0, common_1.Controller)('internal/learning'),
    __metadata("design:paramtypes", [learning_service_js_1.LearningService])
], LearningController);
//# sourceMappingURL=learning.controller.js.map