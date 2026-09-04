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
exports.TourProfileFilesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const update_tour_profile_files_dto_1 = require("./dto/update-tour-profile-files.dto");
const tour_profile_file_multer_config_1 = require("./tour-profile-file-multer.config");
const tour_profile_files_service_1 = require("./tour-profile-files.service");
let TourProfileFilesController = class TourProfileFilesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    get(id) {
        return this.svc.get(id);
    }
    update(id, dto, files) {
        return this.svc.update(id, dto, files ?? {});
    }
};
exports.TourProfileFilesController = TourProfileFilesController;
__decorate([
    (0, common_1.Get)(':id/profile-files'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TourProfileFilesController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id/profile-files'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)(tour_profile_file_multer_config_1.TOUR_PROFILE_FILE_FIELDS, (0, tour_profile_file_multer_config_1.tourProfileFileMulterOptions)())),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_tour_profile_files_dto_1.UpdateTourProfileFilesDto, Object]),
    __metadata("design:returntype", void 0)
], TourProfileFilesController.prototype, "update", null);
exports.TourProfileFilesController = TourProfileFilesController = __decorate([
    (0, common_1.Controller)('tours'),
    __metadata("design:paramtypes", [tour_profile_files_service_1.TourProfileFilesService])
], TourProfileFilesController);
//# sourceMappingURL=tour-profile-files.controller.js.map