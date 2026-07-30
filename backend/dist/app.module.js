"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const audit_context_middleware_1 = require("./audit/audit-context.middleware");
const audit_module_1 = require("./audit/audit.module");
const audit_subscriber_1 = require("./audit/audit.subscriber");
const attraction_tours_module_1 = require("./attraction-tours/attraction-tours.module");
const company_module_1 = require("./company/company.module");
const engagements_module_1 = require("./engagements/engagements.module");
const performances_module_1 = require("./performances/performances.module");
const projects_module_1 = require("./projects/projects.module");
const daily_sales_module_1 = require("./daily-sales/daily-sales.module");
const venue_directory_module_1 = require("./venue-directory/venue-directory.module");
const admin_users_module_1 = require("./admin-users/admin-users.module");
const internal_news_module_1 = require("./internal-news/internal-news.module");
const internal_employees_module_1 = require("./internal-employees/internal-employees.module");
const internal_benefits_module_1 = require("./internal-benefits/internal-benefits.module");
const internal_markets_module_1 = require("./internal-markets/internal-markets.module");
const internal_venues_module_1 = require("./internal-venues/internal-venues.module");
const internal_attractions_module_1 = require("./internal-attractions/internal-attractions.module");
const internal_handbook_module_1 = require("./internal-handbook/internal-handbook.module");
const hubspot_module_1 = require("./hubspot/hubspot.module");
const venue_marketing_module_1 = require("./venue-marketing/venue-marketing.module");
const tour_marketing_module_1 = require("./tour-marketing/tour-marketing.module");
const document_library_module_1 = require("./document-library/document-library.module");
const organization_chart_module_1 = require("./organization-chart/organization-chart.module");
const ramp_module_1 = require("./ramp/ramp.module");
const learning_module_1 = require("./learning/learning.module");
const common_module_1 = require("./common/common.module");
const parseBoolean = (value, fallback) => {
    if (!value)
        return fallback;
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};
const parseNumber = (value, fallback) => {
    if (value == null)
        return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(audit_context_middleware_1.AuditContextMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', 'backend/.env'],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mssql',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: Number(configService.get('DB_PORT', '1433')),
                    username: configService.get('DB_USERNAME', 'SA'),
                    password: configService.get('DB_PASSWORD'),
                    database: configService.get('DB_NAME', 'master'),
                    synchronize: false,
                    autoLoadEntities: true,
                    retryAttempts: parseNumber(configService.get('DB_RETRY_ATTEMPTS'), 10),
                    retryDelay: parseNumber(configService.get('DB_RETRY_DELAY_MS'), 3000),
                    options: {
                        encrypt: parseBoolean(configService.get('DB_ENCRYPT'), true),
                        trustServerCertificate: parseBoolean(configService.get('DB_TRUST_SERVER_CERT'), true),
                    },
                    extra: {
                        connectionTimeout: parseNumber(configService.get('DB_CONNECTION_TIMEOUT_MS'), 30000),
                        requestTimeout: parseNumber(configService.get('DB_REQUEST_TIMEOUT_MS'), 30000),
                        pool: {
                            max: parseNumber(configService.get('DB_POOL_MAX'), 10),
                            min: parseNumber(configService.get('DB_POOL_MIN'), 0),
                            idleTimeoutMillis: parseNumber(configService.get('DB_POOL_IDLE_TIMEOUT_MS'), 30000),
                        },
                    },
                }),
            }),
            audit_module_1.AuditModule,
            common_module_1.CommonModule,
            company_module_1.CompanyModule,
            attraction_tours_module_1.AttractionToursModule,
            engagements_module_1.EngagementsModule,
            projects_module_1.ProjectsModule,
            performances_module_1.PerformancesModule,
            daily_sales_module_1.DailySalesModule,
            venue_directory_module_1.VenueDirectoryModule,
            admin_users_module_1.AdminUsersModule,
            internal_news_module_1.InternalNewsModule,
            internal_employees_module_1.InternalEmployeesModule,
            internal_benefits_module_1.InternalBenefitsModule,
            internal_markets_module_1.InternalMarketsModule,
            internal_venues_module_1.InternalVenuesModule,
            internal_attractions_module_1.InternalAttractionsModule,
            internal_handbook_module_1.InternalHandbookModule,
            hubspot_module_1.HubSpotModule,
            venue_marketing_module_1.VenueMarketingModule,
            tour_marketing_module_1.TourMarketingModule,
            document_library_module_1.DocumentLibraryModule,
            organization_chart_module_1.OrganizationChartModule,
            ramp_module_1.RampModule,
            learning_module_1.LearningModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, audit_subscriber_1.AuditSubscriber],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map