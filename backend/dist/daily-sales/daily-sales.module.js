"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailySalesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const address_entity_1 = require("../entities/address.entity");
const attraction_entity_1 = require("../entities/attraction.entity");
const class_entity_1 = require("../entities/class.entity");
const company_entity_1 = require("../entities/company.entity");
const contact_entity_1 = require("../entities/contact.entity");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const contact_info_entity_1 = require("../entities/contact-info.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const performance_entity_1 = require("../entities/performance.entity");
const performance_ticketing_entity_1 = require("../entities/performance-ticketing.entity");
const ticketing_sales_entity_1 = require("../entities/ticketing-sales.entity");
const tour_entity_1 = require("../entities/tour.entity");
const venue_entity_1 = require("../entities/venue.entity");
const audit_module_1 = require("../audit/audit.module");
const engagements_module_1 = require("../engagements/engagements.module");
const daily_sales_controller_1 = require("./daily-sales.controller");
const daily_sales_service_1 = require("./daily-sales.service");
let DailySalesModule = class DailySalesModule {
};
exports.DailySalesModule = DailySalesModule;
exports.DailySalesModule = DailySalesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            audit_module_1.AuditModule,
            engagements_module_1.EngagementsModule,
            typeorm_1.TypeOrmModule.forFeature([
                ticketing_sales_entity_1.TicketingSales,
                performance_entity_1.Performance,
                performance_ticketing_entity_1.PerformanceTicketing,
                engagement_entity_1.Engagement,
                tour_entity_1.Tour,
                attraction_entity_1.Attraction,
                class_entity_1.Class,
                engagement_venue_entity_1.EngagementVenue,
                venue_entity_1.Venue,
                company_entity_1.Company,
                contact_assignment_entity_1.ContactAssignment,
                contact_entity_1.Contact,
                contact_info_entity_1.ContactInfo,
                address_entity_1.Address,
            ]),
        ],
        controllers: [daily_sales_controller_1.DailySalesController],
        providers: [daily_sales_service_1.DailySalesService],
    })
], DailySalesModule);
//# sourceMappingURL=daily-sales.module.js.map