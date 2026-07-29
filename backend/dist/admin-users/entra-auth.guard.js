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
exports.EntraAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const entra_token_verifier_service_1 = require("../auth/entra-token-verifier.service");
let EntraAuthGuard = class EntraAuthGuard {
    tokenVerifier;
    constructor(tokenVerifier) {
        this.tokenVerifier = tokenVerifier;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = (0, entra_token_verifier_service_1.getOptionalBearerToken)(request.headers.authorization);
        if (!token) {
            throw new common_1.UnauthorizedException(request.headers.authorization
                ? 'Authorization header must use Bearer token format.'
                : 'Missing Authorization header.');
        }
        try {
            request.user = await this.tokenVerifier.verify(token);
            return true;
        }
        catch (error) {
            if (error instanceof common_1.ServiceUnavailableException)
                throw error;
            throw new common_1.UnauthorizedException({
                message: 'Invalid or expired Microsoft Entra access token.',
                detail: this.tokenVerifier.buildTokenValidationDetail(token, error),
            });
        }
    }
};
exports.EntraAuthGuard = EntraAuthGuard;
exports.EntraAuthGuard = EntraAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [entra_token_verifier_service_1.EntraTokenVerifier])
], EntraAuthGuard);
//# sourceMappingURL=entra-auth.guard.js.map