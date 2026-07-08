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
exports.AccessLevelGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const access_level_enum_1 = require("./access-level.enum");
const access_level_service_1 = require("./access-level.service");
const require_access_level_decorator_1 = require("./require-access-level.decorator");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
let AccessLevelGuard = class AccessLevelGuard {
    reflector;
    accessLevelService;
    auditContext;
    constructor(reflector, accessLevelService, auditContext) {
        this.reflector = reflector;
        this.accessLevelService = accessLevelService;
        this.auditContext = auditContext;
    }
    async canActivate(context) {
        const requiredLevel = this.reflector.get(require_access_level_decorator_1.ACCESS_LEVEL_KEY, context.getHandler()) ??
            this.reflector.get(require_access_level_decorator_1.ACCESS_LEVEL_KEY, context.getClass());
        if (!requiredLevel)
            return true;
        const request = context.switchToHttp().getRequest();
        const email = this.auditContext.getUserEmail() ??
            request.user?.email ??
            request.user?.preferred_username ??
            request.user?.upn ??
            (typeof request.header === 'function'
                ? request.header('x-user-email')
                : undefined) ??
            '';
        const userLevel = await this.accessLevelService.resolveAccessLevel(email);
        if ((0, access_level_enum_1.meetsAccessLevel)(userLevel, requiredLevel))
            return true;
        throw new common_1.ForbiddenException(`This action requires ${requiredLevel} access or higher.`);
    }
};
exports.AccessLevelGuard = AccessLevelGuard;
exports.AccessLevelGuard = AccessLevelGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        access_level_service_1.AccessLevelService,
        audit_request_context_service_1.AuditRequestContext])
], AccessLevelGuard);
//# sourceMappingURL=access-level.guard.js.map