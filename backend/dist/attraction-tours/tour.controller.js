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
exports.TourController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const create_tour_dto_1 = require("./dto/create-tour.dto");
const update_tour_dto_1 = require("./dto/update-tour.dto");
const tour_banner_multer_config_1 = require("./tour-banner-multer.config");
const tour_service_1 = require("./tour.service");
let TourController = class TourController {
    tourService;
    constructor(tourService) {
        this.tourService = tourService;
    }
    list(offset, limit, q, sortBy, sortDir) {
        return this.tourService.listPaginated(offset, limit, q, sortBy, sortDir);
    }
    listAgeRanges() {
        return this.tourService.listAgeRanges();
    }
    listAdvertisingSubTypes() {
        return this.tourService.listAdvertisingSubTypes();
    }
    create(dto, bannerImage) {
        return this.tourService.create(dto, bannerImage);
    }
    update(id, dto, bannerImage) {
        return this.tourService.update(id, dto, bannerImage);
    }
    remove(id) {
        return this.tourService.remove(id);
    }
};
exports.TourController = TourController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('sortBy')),
    __param(4, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String]),
    __metadata("design:returntype", void 0)
], TourController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('age-ranges'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TourController.prototype, "listAgeRanges", null);
__decorate([
    (0, common_1.Get)('advertising-sub-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TourController.prototype, "listAdvertisingSubTypes", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('bannerImage', (0, tour_banner_multer_config_1.tourBannerMulterOptions)())),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tour_dto_1.CreateTourDto, Object]),
    __metadata("design:returntype", void 0)
], TourController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('bannerImage', (0, tour_banner_multer_config_1.tourBannerMulterOptions)())),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_tour_dto_1.UpdateTourDto, Object]),
    __metadata("design:returntype", void 0)
], TourController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TourController.prototype, "remove", null);
exports.TourController = TourController = __decorate([
    (0, common_1.Controller)('tours'),
    __metadata("design:paramtypes", [tour_service_1.TourService])
], TourController);
//# sourceMappingURL=tour.controller.js.map