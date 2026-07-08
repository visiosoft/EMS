"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationChartModule = void 0;
const common_1 = require("@nestjs/common");
const admin_users_module_1 = require("../admin-users/admin-users.module");
const organization_chart_controller_1 = require("./organization-chart.controller");
const internal_organization_chart_controller_1 = require("./internal-organization-chart.controller");
const organization_chart_service_1 = require("./organization-chart.service");
const audit_module_1 = require("../audit/audit.module");
let OrganizationChartModule = class OrganizationChartModule {
};
exports.OrganizationChartModule = OrganizationChartModule;
exports.OrganizationChartModule = OrganizationChartModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_users_module_1.AdminUsersModule, audit_module_1.AuditModule],
        controllers: [organization_chart_controller_1.OrganizationChartController, internal_organization_chart_controller_1.InternalOrganizationChartController],
        providers: [organization_chart_service_1.OrganizationChartService],
        exports: [organization_chart_service_1.OrganizationChartService],
    })
], OrganizationChartModule);
//# sourceMappingURL=organization-chart.module.js.map