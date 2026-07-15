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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminOrSelfGuard = void 0;
const common_1 = require("@nestjs/common");
const access_level_enum_1 = require("./access-level.enum");
const access_level_service_1 = require("./access-level.service");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
let AdminOrSelfGuard = class AdminOrSelfGuard {
    accessLevelService;
    auditContext;
    constructor(accessLevelService, auditContext) {
        this.accessLevelService = accessLevelService;
        this.auditContext = auditContext;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const loggedInEmail = (this.auditContext.getUserEmail() ??
            request.user?.email ??
            request.user?.preferred_username ??
            request.user?.upn ??
            (typeof request.header === 'function'
                ? request.header('x-user-email')
                : undefined) ??
            '').trim().toLowerCase();
        const targetEmail = (request.params?.email ?? '').trim().toLowerCase();
        if (loggedInEmail && targetEmail && loggedInEmail === targetEmail) {
            return true;
        }
        const userLevel = await this.accessLevelService.resolveAccessLevel(loggedInEmail);
        if ((0, access_level_enum_1.meetsAccessLevel)(userLevel, access_level_enum_1.AccessLevel.Administrator)) {
            return true;
        }
        throw new common_1.ForbiddenException('You can only access your own profile, or you need Administrator access.');
    }
};
exports.AdminOrSelfGuard = AdminOrSelfGuard;
exports.AdminOrSelfGuard = AdminOrSelfGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_level_service_1.AccessLevelService,
        audit_request_context_service_1.AuditRequestContext])
], AdminOrSelfGuard);
//# sourceMappingURL=admin-or-self.guard.js.map