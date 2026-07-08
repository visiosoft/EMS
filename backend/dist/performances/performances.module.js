"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformancesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const address_entity_1 = require("../entities/address.entity");
const attraction_entity_1 = require("../entities/attraction.entity");
const company_entity_1 = require("../entities/company.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const performance_entity_1 = require("../entities/performance.entity");
const tour_entity_1 = require("../entities/tour.entity");
const venue_entity_1 = require("../entities/venue.entity");
const performances_controller_1 = require("./performances.controller");
const performances_service_1 = require("./performances.service");
let PerformancesModule = class PerformancesModule {
};
exports.PerformancesModule = PerformancesModule;
exports.PerformancesModule = PerformancesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                performance_entity_1.Performance,
                engagement_entity_1.Engagement,
                tour_entity_1.Tour,
                attraction_entity_1.Attraction,
                engagement_venue_entity_1.EngagementVenue,
                venue_entity_1.Venue,
                company_entity_1.Company,
                address_entity_1.Address,
            ]),
        ],
        controllers: [performances_controller_1.PerformancesController],
        providers: [performances_service_1.PerformancesService],
        exports: [performances_service_1.PerformancesService],
    })
], PerformancesModule);
//# sourceMappingURL=performances.module.js.map