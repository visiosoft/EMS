"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const engagements_module_1 = require("../engagements/engagements.module");
const address_entity_1 = require("../entities/address.entity");
const attraction_entity_1 = require("../entities/attraction.entity");
const company_type_entity_1 = require("../entities/company-type.entity");
const company_entity_1 = require("../entities/company.entity");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const contact_info_entity_1 = require("../entities/contact-info.entity");
const contact_entity_1 = require("../entities/contact.entity");
const department_entity_1 = require("../entities/department.entity");
const dma_entity_1 = require("../entities/dma.entity");
const engagement_project_venue_entity_1 = require("../entities/engagement-project-venue.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const role_entity_1 = require("../entities/role.entity");
const non_resident_withholding_entity_1 = require("../entities/non-resident-withholding.entity");
const seating_type_entity_1 = require("../entities/seating-type.entity");
const tour_entity_1 = require("../entities/tour.entity");
const class_entity_1 = require("../entities/class.entity");
const venue_type_entity_1 = require("../entities/venue-type.entity");
const venue_entity_1 = require("../entities/venue.entity");
const venue_complex_entity_1 = require("../entities/venue-complex.entity");
const venue_complex_member_entity_1 = require("../entities/venue-complex-member.entity");
const brand_entity_1 = require("../entities/brand.entity");
const venue_brand_entity_1 = require("../entities/venue-brand.entity");
const tax_entity_1 = require("../entities/tax.entity");
const venue_tax_entity_1 = require("../entities/venue-tax.entity");
const service_provided_entity_1 = require("../entities/service-provided.entity");
const company_service_entity_1 = require("../entities/company-service.entity");
const company_service_area_entity_1 = require("../entities/company-service-area.entity");
const company_type_service_entity_1 = require("../entities/company-type-service.entity");
const venue_service_provider_entity_1 = require("../entities/venue-service-provider.entity");
const link_entity_1 = require("../entities/link.entity");
const lookups_controller_1 = require("../lookups/lookups.controller");
const lookups_service_1 = require("../lookups/lookups.service");
const entra_auth_guard_1 = require("../admin-users/entra-auth.guard");
const hubspot_module_1 = require("../hubspot/hubspot.module");
const company_controller_1 = require("./company.controller");
const company_contact_bulk_controller_1 = require("./company-contact-bulk.controller");
const contact_assignment_bulk_update_controller_1 = require("./contact-assignment-bulk-update.controller");
const company_service_1 = require("./company.service");
const entities = [
    address_entity_1.Address,
    company_type_entity_1.CompanyType,
    company_entity_1.Company,
    dma_entity_1.Dma,
    link_entity_1.Link,
    contact_info_entity_1.ContactInfo,
    contact_entity_1.Contact,
    contact_assignment_entity_1.ContactAssignment,
    role_entity_1.Role,
    department_entity_1.Department,
    venue_entity_1.Venue,
    venue_complex_entity_1.VenueComplex,
    venue_complex_member_entity_1.VenueComplexMember,
    brand_entity_1.Brand,
    venue_brand_entity_1.VenueBrand,
    tax_entity_1.Tax,
    venue_tax_entity_1.VenueTax,
    service_provided_entity_1.ServiceProvided,
    company_service_entity_1.CompanyService,
    company_type_service_entity_1.CompanyTypeService,
    company_service_area_entity_1.CompanyServiceArea,
    venue_service_provider_entity_1.VenueServiceProvider,
    engagement_venue_entity_1.EngagementVenue,
    engagement_project_venue_entity_1.EngagementProjectVenue,
    engagement_entity_1.Engagement,
    tour_entity_1.Tour,
    attraction_entity_1.Attraction,
    seating_type_entity_1.SeatingType,
    venue_type_entity_1.VenueType,
    non_resident_withholding_entity_1.NonResidentWithholding,
    class_entity_1.Class,
];
let CompanyModule = class CompanyModule {
};
exports.CompanyModule = CompanyModule;
exports.CompanyModule = CompanyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature(entities),
            engagements_module_1.EngagementsModule,
            hubspot_module_1.HubSpotModule,
        ],
        controllers: [
            company_controller_1.CompanyController,
            company_controller_1.ContactsController,
            company_controller_1.ContactAssignmentsController,
            company_contact_bulk_controller_1.CompanyContactBulkController,
            contact_assignment_bulk_update_controller_1.ContactAssignmentBulkUpdateController,
            lookups_controller_1.LookupsController,
        ],
        providers: [company_service_1.CompanyService, lookups_service_1.LookupsService, entra_auth_guard_1.EntraAuthGuard],
        exports: [company_service_1.CompanyService, lookups_service_1.LookupsService],
    })
], CompanyModule);
//# sourceMappingURL=company.module.js.map