"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const audit_module_1 = require("../audit/audit.module");
const attraction_tours_module_1 = require("../attraction-tours/attraction-tours.module");
const document_library_module_1 = require("../document-library/document-library.module");
const attraction_entity_1 = require("../entities/attraction.entity");
const company_entity_1 = require("../entities/company.entity");
const contact_entity_1 = require("../entities/contact.entity");
const contact_info_entity_1 = require("../entities/contact-info.entity");
const department_entity_1 = require("../entities/department.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_iae_contact_entity_1 = require("../entities/engagement-iae-contact.entity");
const link_entity_1 = require("../entities/link.entity");
const engagement_finance_entity_1 = require("../entities/engagement-finance.entity");
const engagement_link_entity_1 = require("../entities/engagement-link.entity");
const engagement_production_entity_1 = require("../entities/engagement-production.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const engagement_xref_entity_1 = require("../entities/engagement-xref.entity");
const non_resident_withholding_entity_1 = require("../entities/non-resident-withholding.entity");
const artist_finance_entity_1 = require("../entities/artist-finance.entity");
const settlement_finance_entity_1 = require("../entities/settlement-finance.entity");
const performance_entity_1 = require("../entities/performance.entity");
const performance_ticketing_entity_1 = require("../entities/performance-ticketing.entity");
const role_entity_1 = require("../entities/role.entity");
const ticketing_sales_entity_1 = require("../entities/ticketing-sales.entity");
const tour_entity_1 = require("../entities/tour.entity");
const venue_entity_1 = require("../entities/venue.entity");
const venue_service_provider_entity_1 = require("../entities/venue-service-provider.entity");
const service_provided_entity_1 = require("../entities/service-provided.entity");
const company_service_entity_1 = require("../entities/company-service.entity");
const engagement_controller_1 = require("./engagement.controller");
const engagement_service_1 = require("./engagement.service");
const engagement_travel_entity_1 = require("../entities/engagement-travel.entity");
const engagement_travel_car_service_entity_1 = require("../entities/engagement-travel-car-service.entity");
const engagement_travel_hotel_entity_1 = require("../entities/engagement-travel-hotel.entity");
const engagement_partner_entity_1 = require("../entities/engagement-partner.entity");
const performance_contract_entity_1 = require("../entities/performance-contract.entity");
const contract_extraction_service_1 = require("./contract-extraction.service");
const contract_llm_client_1 = require("./contract-llm.client");
let EngagementsModule = class EngagementsModule {
};
exports.EngagementsModule = EngagementsModule;
exports.EngagementsModule = EngagementsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            audit_module_1.AuditModule,
            typeorm_1.TypeOrmModule.forFeature([
                engagement_entity_1.Engagement,
                link_entity_1.Link,
                engagement_finance_entity_1.EngagementFinances,
                engagement_link_entity_1.EngagementLink,
                engagement_venue_entity_1.EngagementVenue,
                engagement_xref_entity_1.EngagementXref,
                engagement_production_entity_1.EngagementProduction,
                performance_entity_1.Performance,
                performance_ticketing_entity_1.PerformanceTicketing,
                ticketing_sales_entity_1.TicketingSales,
                attraction_entity_1.Attraction,
                tour_entity_1.Tour,
                venue_entity_1.Venue,
                company_entity_1.Company,
                venue_service_provider_entity_1.VenueServiceProvider,
                service_provided_entity_1.ServiceProvided,
                company_service_entity_1.CompanyService,
                non_resident_withholding_entity_1.NonResidentWithholding,
                artist_finance_entity_1.ArtistFinance,
                settlement_finance_entity_1.SettlementFinance,
                engagement_iae_contact_entity_1.EngagementIAEContact,
                contact_entity_1.Contact,
                contact_info_entity_1.ContactInfo,
                role_entity_1.Role,
                department_entity_1.Department,
                engagement_travel_entity_1.EngagementTravel,
                engagement_travel_car_service_entity_1.EngagementTravelCarService,
                engagement_travel_hotel_entity_1.EngagementTravelHotel,
                engagement_partner_entity_1.EngagementPartner,
                performance_contract_entity_1.PerformanceContract,
            ]),
            attraction_tours_module_1.AttractionToursModule,
            document_library_module_1.DocumentLibraryModule,
        ],
        controllers: [engagement_controller_1.EngagementController],
        providers: [engagement_service_1.EngagementService, contract_extraction_service_1.ContractExtractionService, contract_llm_client_1.ContractLlmClient],
        exports: [engagement_service_1.EngagementService],
    })
], EngagementsModule);
//# sourceMappingURL=engagements.module.js.map