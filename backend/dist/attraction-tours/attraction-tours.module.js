"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttractionToursModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const attraction_entity_1 = require("../entities/attraction.entity");
const age_range_entity_1 = require("../entities/age-range.entity");
const class_entity_1 = require("../entities/class.entity");
const company_entity_1 = require("../entities/company.entity");
const company_type_entity_1 = require("../entities/company-type.entity");
const contact_entity_1 = require("../entities/contact.entity");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_project_entity_1 = require("../entities/engagement-project.entity");
const link_entity_1 = require("../entities/link.entity");
const tour_entity_1 = require("../entities/tour.entity");
const job_entity_1 = require("../entities/job.entity");
const tour_audience_age_range_entity_1 = require("../entities/tour-audience-age-range.entity");
const tour_talent_agent_entity_1 = require("../entities/tour-talent-agent.entity");
const venue_type_entity_1 = require("../entities/venue-type.entity");
const attraction_controller_1 = require("./attraction.controller");
const attraction_service_1 = require("./attraction.service");
const ems_app_created_store_1 = require("./ems-app-created.store");
const tour_controller_1 = require("./tour.controller");
const tour_service_1 = require("./tour.service");
let AttractionToursModule = class AttractionToursModule {
};
exports.AttractionToursModule = AttractionToursModule;
exports.AttractionToursModule = AttractionToursModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                attraction_entity_1.Attraction,
                age_range_entity_1.AgeRange,
                link_entity_1.Link,
                tour_entity_1.Tour,
                job_entity_1.Job,
                tour_audience_age_range_entity_1.TourAudienceAgeRange,
                class_entity_1.Class,
                venue_type_entity_1.VenueType,
                company_entity_1.Company,
                company_type_entity_1.CompanyType,
                contact_entity_1.Contact,
                contact_assignment_entity_1.ContactAssignment,
                tour_talent_agent_entity_1.TourTalentAgent,
                engagement_entity_1.Engagement,
                engagement_project_entity_1.EngagementProject,
            ]),
        ],
        controllers: [attraction_controller_1.AttractionController, tour_controller_1.TourController],
        providers: [attraction_service_1.AttractionService, tour_service_1.TourService, ems_app_created_store_1.EmsAppCreatedStore],
        exports: [attraction_service_1.AttractionService, tour_service_1.TourService, ems_app_created_store_1.EmsAppCreatedStore],
    })
], AttractionToursModule);
//# sourceMappingURL=attraction-tours.module.js.map