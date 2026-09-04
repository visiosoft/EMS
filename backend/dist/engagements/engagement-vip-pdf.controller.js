"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementVipPdfController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const tour_profile_file_multer_config_1 = require("../attraction-tours/tour-profile-file-multer.config");
const engagement_vip_pdf_service_1 = require("./engagement-vip-pdf.service");
class UpdateEngagementVipPdfDto {
    vipPdfUrl;
    vipPdfName;
    removeVipPdf;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementVipPdfDto.prototype, "vipPdfUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementVipPdfDto.prototype, "vipPdfName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    __metadata("design:type", Boolean)
], UpdateEngagementVipPdfDto.prototype, "removeVipPdf", void 0);
let EngagementVipPdfController = class EngagementVipPdfController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    get(id) {
        return this.svc.get(id);
    }
    update(id, dto, vipPdfFile) {
        return this.svc.update(id, {
            vipPdfUrl: dto.vipPdfUrl,
            vipPdfName: dto.vipPdfName,
            removeVipPdf: dto.removeVipPdf,
            uploadedFile: vipPdfFile,
        });
    }
};
exports.EngagementVipPdfController = EngagementVipPdfController;
__decorate([
    (0, common_1.Get)(':id/vip-pdf'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EngagementVipPdfController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id/vip-pdf'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('vipPdfFile', (0, tour_profile_file_multer_config_1.tourProfileFileMulterOptions)())),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateEngagementVipPdfDto, Object]),
    __metadata("design:returntype", void 0)
], EngagementVipPdfController.prototype, "update", null);
exports.EngagementVipPdfController = EngagementVipPdfController = __decorate([
    (0, common_1.Controller)('engagements'),
    __metadata("design:paramtypes", [engagement_vip_pdf_service_1.EngagementVipPdfService])
], EngagementVipPdfController);
//# sourceMappingURL=engagement-vip-pdf.controller.js.map