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
exports.SelfProfileController = void 0;
const common_1 = require("@nestjs/common");
const entra_profile_sync_service_1 = require("./entra-profile-sync.service");
const self_profile_service_1 = require("./self-profile.service");
let SelfProfileController = class SelfProfileController {
    selfProfileService;
    entraProfileSyncService;
    constructor(selfProfileService, entraProfileSyncService) {
        this.selfProfileService = selfProfileService;
        this.entraProfileSyncService = entraProfileSyncService;
    }
    async getMyProfile() {
        return this.selfProfileService.getMyFullProfile();
    }
    getEmployeeProfile(contactId) {
        return this.selfProfileService.getEmployeeProfileForViewer(contactId);
    }
    async previewSyncFromEntra(graphAccessToken) {
        const email = this.selfProfileService.getSignedInEmail();
        const isAdmin = await this.selfProfileService.isSignedInUserAdmin();
        const result = await this.entraProfileSyncService.previewSingleUserFromEntra(email, graphAccessToken);
        if (!isAdmin) {
            result.changes = result.changes.filter((c) => entra_profile_sync_service_1.EMPLOYEE_SYNCABLE_FIELDS.has(c.field));
        }
        return result;
    }
    async debugEntraCsa(email) {
        return this.entraProfileSyncService.debugFetchEntraProfile(email);
    }
    async syncMyProfileFromEntra(graphAccessToken) {
        const email = this.selfProfileService.getSignedInEmail();
        const isAdmin = await this.selfProfileService.isSignedInUserAdmin();
        if (!isAdmin) {
            const allFields = [...entra_profile_sync_service_1.EMPLOYEE_SYNCABLE_FIELDS];
            return this.entraProfileSyncService.syncSelectedFieldsFromEntra(email, allFields, graphAccessToken);
        }
        return this.entraProfileSyncService.syncSingleUserFromEntra(email, graphAccessToken);
    }
    async applySelectedSync(body, graphAccessToken) {
        const email = this.selfProfileService.getSignedInEmail();
        const isAdmin = await this.selfProfileService.isSignedInUserAdmin();
        const fields = isAdmin
            ? body.fields ?? []
            : (body.fields ?? []).filter((f) => entra_profile_sync_service_1.EMPLOYEE_SYNCABLE_FIELDS.has(f));
        return this.entraProfileSyncService.syncSelectedFieldsFromEntra(email, fields, graphAccessToken);
    }
    async updateMyProfile(body) {
        return this.selfProfileService.updateMyProfile(body);
    }
    async updateEmployeeProfile(contactId, body) {
        return this.selfProfileService.updateEmployeeProfile(contactId, body);
    }
};
exports.SelfProfileController = SelfProfileController;
__decorate([
    (0, common_1.Get)('my-profile'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SelfProfileController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('employees/:contactId/profile'),
    __param(0, (0, common_1.Param)('contactId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], SelfProfileController.prototype, "getEmployeeProfile", null);
__decorate([
    (0, common_1.Post)('my-profile/sync-from-entra/preview'),
    __param(0, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SelfProfileController.prototype, "previewSyncFromEntra", null);
__decorate([
    (0, common_1.Get)('debug/entra-csa'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SelfProfileController.prototype, "debugEntraCsa", null);
__decorate([
    (0, common_1.Post)('my-profile/sync-from-entra'),
    __param(0, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SelfProfileController.prototype, "syncMyProfileFromEntra", null);
__decorate([
    (0, common_1.Post)('my-profile/sync-from-entra/apply-selected'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-entra-graph-access-token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SelfProfileController.prototype, "applySelectedSync", null);
__decorate([
    (0, common_1.Patch)('my-profile'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SelfProfileController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Patch)('employees/:contactId/profile'),
    __param(0, (0, common_1.Param)('contactId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], SelfProfileController.prototype, "updateEmployeeProfile", null);
exports.SelfProfileController = SelfProfileController = __decorate([
    (0, common_1.Controller)('internal'),
    __metadata("design:paramtypes", [self_profile_service_1.SelfProfileService,
        entra_profile_sync_service_1.EntraProfileSyncService])
], SelfProfileController);
//# sourceMappingURL=self-profile.controller.js.map