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
exports.VenueMarketingController = void 0;
const common_1 = require("@nestjs/common");
const venue_marketing_service_1 = require("./venue-marketing.service");
const save_venue_marketing_dto_1 = require("./dto/save-venue-marketing.dto");
let VenueMarketingController = class VenueMarketingController {
    venueMarketingService;
    constructor(venueMarketingService) {
        this.venueMarketingService = venueMarketingService;
    }
    getPlacementCategories() {
        return this.venueMarketingService.getPlacementCategories();
    }
    getMediums() {
        return this.venueMarketingService.getMediums();
    }
    getLocalizationOptions() {
        return this.venueMarketingService.getLocalizationOptions();
    }
    getTagOptions() {
        return this.venueMarketingService.getTagOptions();
    }
    getFileSpecOptions() {
        return this.venueMarketingService.getFileSpecOptions();
    }
    getFileFormatOptions() {
        return this.venueMarketingService.getFileFormatOptions();
    }
    getVenueMarketing(venueId) {
        return this.venueMarketingService.getVenueMarketing(venueId);
    }
    saveVenueMarketing(venueId, dto) {
        return this.venueMarketingService.saveVenueMarketing(venueId, dto);
    }
    deleteSpec(venueId, specId) {
        return this.venueMarketingService.deleteSpec(venueId, specId);
    }
};
exports.VenueMarketingController = VenueMarketingController;
__decorate([
    (0, common_1.Get)('lookups/placement-categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "getPlacementCategories", null);
__decorate([
    (0, common_1.Get)('lookups/mediums'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "getMediums", null);
__decorate([
    (0, common_1.Get)('lookups/localization-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "getLocalizationOptions", null);
__decorate([
    (0, common_1.Get)('lookups/tag-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "getTagOptions", null);
__decorate([
    (0, common_1.Get)('lookups/file-spec-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "getFileSpecOptions", null);
__decorate([
    (0, common_1.Get)('lookups/file-format-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "getFileFormatOptions", null);
__decorate([
    (0, common_1.Get)(':venueId'),
    __param(0, (0, common_1.Param)('venueId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "getVenueMarketing", null);
__decorate([
    (0, common_1.Post)(':venueId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('venueId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, save_venue_marketing_dto_1.SaveVenueMarketingDto]),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "saveVenueMarketing", null);
__decorate([
    (0, common_1.Delete)(':venueId/specs/:specId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('venueId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('specId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], VenueMarketingController.prototype, "deleteSpec", null);
exports.VenueMarketingController = VenueMarketingController = __decorate([
    (0, common_1.Controller)('venue-marketing'),
    __metadata("design:paramtypes", [venue_marketing_service_1.VenueMarketingService])
], VenueMarketingController);
//# sourceMappingURL=venue-marketing.controller.js.map