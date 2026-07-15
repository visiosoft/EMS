"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_users_module_1 = require("../admin-users/admin-users.module");
const attraction_tours_module_1 = require("../attraction-tours/attraction-tours.module");
const attraction_entity_1 = require("../entities/attraction.entity");
const company_entity_1 = require("../entities/company.entity");
const engagement_entity_1 = require("../entities/engagement.entity");
const engagement_project_entity_1 = require("../entities/engagement-project.entity");
const engagement_project_dma_entity_1 = require("../entities/engagement-project-dma.entity");
const engagement_project_performance_option_entity_1 = require("../entities/engagement-project-performance-option.entity");
const engagement_project_venue_entity_1 = require("../entities/engagement-project-venue.entity");
const engagement_venue_entity_1 = require("../entities/engagement-venue.entity");
const engagement_xref_entity_1 = require("../entities/engagement-xref.entity");
const link_entity_1 = require("../entities/link.entity");
const performance_entity_1 = require("../entities/performance.entity");
const tour_entity_1 = require("../entities/tour.entity");
const venue_entity_1 = require("../entities/venue.entity");
const project_controller_1 = require("./project.controller");
const project_service_1 = require("./project.service");
let ProjectsModule = class ProjectsModule {
};
exports.ProjectsModule = ProjectsModule;
exports.ProjectsModule = ProjectsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            admin_users_module_1.AdminUsersModule,
            attraction_tours_module_1.AttractionToursModule,
            typeorm_1.TypeOrmModule.forFeature([
                engagement_project_entity_1.EngagementProject,
                engagement_project_dma_entity_1.EngagementProjectDma,
                engagement_project_venue_entity_1.EngagementProjectVenue,
                engagement_project_performance_option_entity_1.EngagementProjectPerformanceOption,
                engagement_entity_1.Engagement,
                engagement_venue_entity_1.EngagementVenue,
                engagement_xref_entity_1.EngagementXref,
                performance_entity_1.Performance,
                tour_entity_1.Tour,
                attraction_entity_1.Attraction,
                venue_entity_1.Venue,
                company_entity_1.Company,
                link_entity_1.Link,
            ]),
        ],
        controllers: [project_controller_1.ProjectController],
        providers: [project_service_1.ProjectService],
        exports: [project_service_1.ProjectService],
    })
], ProjectsModule);
//# sourceMappingURL=projects.module.js.map