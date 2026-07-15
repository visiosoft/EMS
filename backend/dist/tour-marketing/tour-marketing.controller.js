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
exports.TourMarketingController = void 0;
const common_1 = require("@nestjs/common");
const tour_marketing_service_1 = require("./tour-marketing.service");
const save_tour_marketing_dto_1 = require("./dto/save-tour-marketing.dto");
let TourMarketingController = class TourMarketingController {
    tourMarketingService;
    constructor(tourMarketingService) {
        this.tourMarketingService = tourMarketingService;
    }
    getOfferCodeOptions() {
        return this.tourMarketingService.getOfferCodeOptions();
    }
    getTourMarketing(tourId) {
        return this.tourMarketingService.getTourMarketing(tourId);
    }
    saveTourMarketing(tourId, dto) {
        return this.tourMarketingService.saveTourMarketing(tourId, dto);
    }
    deleteOfferCode(tourId, offerCodeId) {
        return this.tourMarketingService.deleteOfferCode(tourId, offerCodeId);
    }
};
exports.TourMarketingController = TourMarketingController;
__decorate([
    (0, common_1.Get)('lookups/offer-code-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TourMarketingController.prototype, "getOfferCodeOptions", null);
__decorate([
    (0, common_1.Get)(':tourId'),
    __param(0, (0, common_1.Param)('tourId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TourMarketingController.prototype, "getTourMarketing", null);
__decorate([
    (0, common_1.Post)(':tourId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('tourId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, save_tour_marketing_dto_1.SaveTourMarketingDto]),
    __metadata("design:returntype", void 0)
], TourMarketingController.prototype, "saveTourMarketing", null);
__decorate([
    (0, common_1.Delete)(':tourId/offer-codes/:offerCodeId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('tourId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('offerCodeId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], TourMarketingController.prototype, "deleteOfferCode", null);
exports.TourMarketingController = TourMarketingController = __decorate([
    (0, common_1.Controller)('tour-marketing'),
    __metadata("design:paramtypes", [tour_marketing_service_1.TourMarketingService])
], TourMarketingController);
//# sourceMappingURL=tour-marketing.controller.js.map