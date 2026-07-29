"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const audit_module_1 = require("../audit/audit.module");
const admin_users_controller_1 = require("./admin-users.controller");
const admin_users_service_1 = require("./admin-users.service");
const employee_certifications_service_1 = require("./employee-certifications.service");
const employee_employment_service_1 = require("./employee-employment.service");
const employee_experience_service_1 = require("./employee-experience.service");
const employee_health_insurance_service_1 = require("./employee-health-insurance.service");
const employee_profile_service_1 = require("./employee-profile.service");
const entra_auth_guard_1 = require("./entra-auth.guard");
const internal_contact_sync_service_1 = require("./internal-contact-sync.service");
const self_profile_controller_1 = require("./self-profile.controller");
const self_profile_service_1 = require("./self-profile.service");
const user_profile_service_1 = require("./user-profile.service");
let AdminUsersModule = class AdminUsersModule {
};
exports.AdminUsersModule = AdminUsersModule;
exports.AdminUsersModule = AdminUsersModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, audit_module_1.AuditModule],
        controllers: [admin_users_controller_1.AdminUsersController, self_profile_controller_1.SelfProfileController],
        providers: [
            admin_users_service_1.AdminUsersService,
            employee_certifications_service_1.EmployeeCertificationsService,
            employee_employment_service_1.EmployeeEmploymentService,
            employee_experience_service_1.EmployeeExperienceService,
            employee_health_insurance_service_1.EmployeeHealthInsuranceService,
            employee_profile_service_1.EmployeeProfileService,
            entra_auth_guard_1.EntraAuthGuard,
            internal_contact_sync_service_1.InternalContactSyncService,
            self_profile_service_1.SelfProfileService,
            user_profile_service_1.UserProfileService,
        ],
        exports: [admin_users_service_1.AdminUsersService, entra_auth_guard_1.EntraAuthGuard],
    })
], AdminUsersModule);
//# sourceMappingURL=admin-users.module.js.map