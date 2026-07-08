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
exports.AdminRoleGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AdminRoleGuard = class AdminRoleGuard {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const configuredRole = this.configService.get('ENTRA_ADMIN_ROLE')?.trim() || 'Admin';
        const roles = request.user?.roles ?? [];
        if (roles.includes(configuredRole))
            return true;
        throw new common_1.ForbiddenException('Only Entra admins can view the full user directory.');
    }
};
exports.AdminRoleGuard = AdminRoleGuard;
exports.AdminRoleGuard = AdminRoleGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AdminRoleGuard);
//# sourceMappingURL=admin-role.guard.js.map