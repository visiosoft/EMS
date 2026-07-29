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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalAttractionsService = void 0;
const common_1 = require("@nestjs/common");
const attraction_service_1 = require("../attraction-tours/attraction.service");
const tour_service_1 = require("../attraction-tours/tour.service");
let InternalAttractionsService = class InternalAttractionsService {
    attractionService;
    tourService;
    constructor(attractionService, tourService) {
        this.attractionService = attractionService;
        this.tourService = tourService;
    }
    listAttractions(offset, limit, query) {
        return this.attractionService.listPaginated(offset, limit, query?.trim() ?? '');
    }
    async suggestAttractions(query, limit) {
        const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
        const { data } = await this.attractionService.listPaginated(0, safeLimit, query.trim());
        return data;
    }
    listTours(attractionId, offset, limit) {
        return this.tourService.listByAttractionPaginated(attractionId, offset, limit);
    }
};
exports.InternalAttractionsService = InternalAttractionsService;
exports.InternalAttractionsService = InternalAttractionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attraction_service_1.AttractionService,
        tour_service_1.TourService])
], InternalAttractionsService);
//# sourceMappingURL=internal-attractions.service.js.map