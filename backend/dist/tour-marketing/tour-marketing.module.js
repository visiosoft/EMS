"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TourMarketingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tour_entity_1 = require("../entities/tour.entity");
const tour_ticketing_offer_code_entity_1 = require("../entities/tour-ticketing-offer-code.entity");
const tour_marketing_controller_1 = require("./tour-marketing.controller");
const tour_marketing_service_1 = require("./tour-marketing.service");
let TourMarketingModule = class TourMarketingModule {
};
exports.TourMarketingModule = TourMarketingModule;
exports.TourMarketingModule = TourMarketingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([tour_entity_1.Tour, tour_ticketing_offer_code_entity_1.TourTicketingOfferCode]),
        ],
        controllers: [tour_marketing_controller_1.TourMarketingController],
        providers: [tour_marketing_service_1.TourMarketingService],
        exports: [tour_marketing_service_1.TourMarketingService],
    })
], TourMarketingModule);
//# sourceMappingURL=tour-marketing.module.js.map