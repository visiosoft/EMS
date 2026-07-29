"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersController = void 0;
const common_1 = require("@nestjs/common");
const admin_users_service_1 = require("./admin-users.service");
const employee_certifications_service_1 = require("./employee-certifications.service");
const employee_employment_service_1 = require("./employee-employment.service");
const employee_experience_service_1 = require("./employee-experience.service");
const employee_health_insurance_service_1 = require("./employee-health-insurance.service");
const employee_profile_service_1 = require("./employee-profile.service");
const entra_auth_guard_1 = require("./entra-auth.guard");
const internal_contact_sync_service_1 = require("./internal-contact-sync.service");
const user_profile_service_1 = require("./user-profile.service");
const access_level_service_1 = require("../common/access-level.service");
const access_level_guard_1 = require("../common/access-level.guard");
const access_level_enum_1 = require("../common/access-level.enum");
const require_access_level_decorator_1 = require("../common/require-access-level.decorator");
const admin_or_self_guard_1 = require("../common/admin-or-self.guard");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
let AdminUsersController = class AdminUsersController {
    accessLevelService;
    adminUsersService;
    auditContext;
    employeeCertificationsService;
    employeeEmploymentService;
    employeeExperienceService;
    employeeHealthInsuranceService;
    employeeProfileService;
    internalContactSyncService;
    userProfileService;
    constructor(accessLevelService, adminUsersService, auditContext, employeeCertificationsService, employeeEmploymentService, employeeExperienceService, employeeHealthInsuranceService, employeeProfileService, internalContactSyncService, userProfileService) {
        this.accessLevelService = accessLevelService;
        this.adminUsersService = adminUsersService;
        this.auditContext = auditContext;
        this.employeeCertificationsService = employeeCertificationsService;
        this.employeeEmploymentService = employeeEmploymentService;
        this.employeeExperienceService = employeeExperienceService;
        this.employeeHealthInsuranceService = employeeHealthInsuranceService;
        this.employeeProfileService = employeeProfileService;
        this.internalContactSyncService = internalContactSyncService;
        this.userProfileService = userProfileService;
    }
    async getMyAccessLevel() {
        const email = this.auditContext.getUserEmail();
        const accessLevel = await this.accessLevelService.resolveAccessLevel(email);
        return { accessLevel };
    }
    async listUsers(graphAccessToken) {
        return this.adminUsersService.listUsers(graphAccessToken);
    }
    async listRawUsers(graphAccessToken) {
        return this.adminUsersService.listRawUsers(graphAccessToken);
    }
    async getMyProfile() {
        return this.userProfileService.getMyProfile();
    }
    async updateMyProfile(dto) {
        return this.userProfileService.updateMyProfile(dto);
    }
    async getPersonalProfile(email) {
        return this.employeeProfileService.getPersonalProfile(email);
    }
    async updatePersonalProfile(email, dto) {
        return this.employeeProfileService.updatePersonalProfile(email, dto);
    }
    async getEmploymentProfile(email) {
        return this.employeeEmploymentService.getEmploymentProfile(email);
    }
    async getAllAccessLevels() {
        return this.employeeEmploymentService.getAllAccessLevels();
    }
    async updateEmploymentProfile(email, dto) {
        return this.employeeEmploymentService.updateEmploymentProfile(email, dto);
    }
    async getExperience(email) {
        return this.employeeExperienceService.getExperience(email);
    }
    async getCertifications(email) {
        return this.employeeCertificationsService.getCertifications(email);
    }
    async getHealthInsurance(email) {
        return this.employeeHealthInsuranceService.getHealthInsurance(email);
    }
    async updateHealthInsurance(email, dto) {
        return this.employeeHealthInsuranceService.updateHealthInsurance(email, dto);
    }
    async listWorkstations() {
        return this.employeeEmploymentService.listWorkstations();
    }
    async listPhoneExtensions() {
        return this.employeeEmploymentService.listPhoneExtensions();
    }
    async listPhoneDevices() {
        return this.employeeEmploymentService.listPhoneDevices();
    }
    async listPcDevices() {
        return this.employeeEmploymentService.listPcDevices();
    }
    async getUserLicenses(email, graphAccessToken) {
        return this.adminUsersService.getUserLicenses(email, graphAccessToken);
    }
    async getUserGroups(email, graphAccessToken) {
        return this.adminUsersService.getUserGroups(email, graphAccessToken);
    }
    async previewInternalContactSync(graphAccessToken) {
        return this.internalContactSyncService.previewInternalContactSync(graphAccessToken);
    }
    async previewEntraToEmsContactSync(graphAccessToken) {
        return this.internalContactSyncService.previewEntraToEmsContactSync(graphAccessToken);
    }
    async applyEntraToEmsContactSync(dto, graphAccessToken) {
        return this.internalContactSyncService.applyEntraToEmsContactSync(dto, graphAccessToken);
    }
    async previewEmsToEntraContactSync(graphAccessToken) {
        return this.internalContactSyncService.previewEmsToEntraContactSync(graphAccessToken);
    }
    async applyEmsToEntraContactSync(dto, graphAccessToken) {
        return this.internalContactSyncService.applyEmsToEntraContactSync(dto, graphAccessToken);
    }
    async applyInternalContactSync(dto, graphAccessToken) {
        return this.internalContactSyncService.applyInternalContactSync(dto, graphAccessToken);
    }
};
exports.AdminUsersController = AdminUsersController;
__decorate([
    (0, common_1.Get)('me/access-level'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getMyAccessLevel", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('users/entra-raw'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "listRawUsers", null);
__decorate([
    (0, common_1.Get)('me/profile'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Patch)('me/profile'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Get)('users/:email/personal-profile'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getPersonalProfile", null);
__decorate([
    (0, common_1.Patch)('users/:email/personal-profile'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_profile_service_1.UpdateEmployeePersonalProfileDto]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "updatePersonalProfile", null);
__decorate([
    (0, common_1.Get)('users/:email/employment-profile'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getEmploymentProfile", null);
__decorate([
    (0, common_1.Get)('access-levels'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getAllAccessLevels", null);
__decorate([
    (0, common_1.Patch)('users/:email/employment-profile'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Param)('email')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_employment_service_1.UpdateEmployeeEmploymentProfileDto]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "updateEmploymentProfile", null);
__decorate([
    (0, common_1.Get)('users/:email/experience'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getExperience", null);
__decorate([
    (0, common_1.Get)('users/:email/certifications'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getCertifications", null);
__decorate([
    (0, common_1.Get)('users/:email/health-insurance'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getHealthInsurance", null);
__decorate([
    (0, common_1.Patch)('users/:email/health-insurance'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_health_insurance_service_1.UpdateEmployeeHealthInsuranceDto]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "updateHealthInsurance", null);
__decorate([
    (0, common_1.Get)('workstations'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "listWorkstations", null);
__decorate([
    (0, common_1.Get)('phone-extensions'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "listPhoneExtensions", null);
__decorate([
    (0, common_1.Get)('phone-devices'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "listPhoneDevices", null);
__decorate([
    (0, common_1.Get)('pc-devices'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "listPcDevices", null);
__decorate([
    (0, common_1.Get)('users/:email/licenses'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __param(1, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getUserLicenses", null);
__decorate([
    (0, common_1.Get)('users/:email/groups'),
    (0, common_1.UseGuards)(admin_or_self_guard_1.AdminOrSelfGuard),
    __param(0, (0, common_1.Param)('email')),
    __param(1, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getUserGroups", null);
__decorate([
    (0, common_1.Post)('internal-contact-sync/preview'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "previewInternalContactSync", null);
__decorate([
    (0, common_1.Post)('internal-contact-sync/entra-to-ems/preview'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "previewEntraToEmsContactSync", null);
__decorate([
    (0, common_1.Post)('internal-contact-sync/entra-to-ems/apply'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "applyEntraToEmsContactSync", null);
__decorate([
    (0, common_1.Post)('internal-contact-sync/ems-to-entra/preview'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "previewEmsToEntraContactSync", null);
__decorate([
    (0, common_1.Post)('internal-contact-sync/ems-to-entra/apply'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "applyEmsToEntraContactSync", null);
__decorate([
    (0, common_1.Post)('internal-contact-sync/apply'),
    (0, require_access_level_decorator_1.RequireAccessLevel)(access_level_enum_1.AccessLevel.Administrator),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "applyInternalContactSync", null);
exports.AdminUsersController = AdminUsersController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(entra_auth_guard_1.EntraAuthGuard, access_level_guard_1.AccessLevelGuard),
    __metadata("design:paramtypes", [access_level_service_1.AccessLevelService,
        admin_users_service_1.AdminUsersService,
        audit_request_context_service_1.AuditRequestContext,
        employee_certifications_service_1.EmployeeCertificationsService,
        employee_employment_service_1.EmployeeEmploymentService,
        employee_experience_service_1.EmployeeExperienceService,
        employee_health_insurance_service_1.EmployeeHealthInsuranceService,
        employee_profile_service_1.EmployeeProfileService,
        internal_contact_sync_service_1.InternalContactSyncService,
        user_profile_service_1.UserProfileService])
], AdminUsersController);
//# sourceMappingURL=admin-users.controller.js.map