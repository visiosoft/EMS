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
exports.InternalAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
let InternalAccessGuard = class InternalAccessGuard {
    auditContext;
    constructor(auditContext) {
        this.auditContext = auditContext;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const email = this.auditContext.getUserEmail() ??
            request.user?.email ??
            request.user?.preferred_username ??
            request.user?.upn ??
            (typeof request.header === 'function'
                ? request.header('x-user-email')
                : undefined) ??
            '';
        if (!email.trim()) {
            throw new common_1.ForbiddenException('Authentication required to access Company Hub.');
        }
        return true;
    }
};
exports.InternalAccessGuard = InternalAccessGuard;
exports.InternalAccessGuard = InternalAccessGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_request_context_service_1.AuditRequestContext])
], InternalAccessGuard);
//# sourceMappingURL=internal-access.guard.js.map