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
exports.EntraTokenVerifier = void 0;
exports.getBearerToken = getBearerToken;
exports.getOptionalBearerToken = getOptionalBearerToken;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
const jwksCache = new Map();
let EntraTokenVerifier = class EntraTokenVerifier {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    async verify(token) {
        const tenantId = this.getTenantId();
        const audiences = this.getAudienceCandidates();
        if (!tenantId || audiences.length === 0) {
            throw new common_1.ServiceUnavailableException('Entra user directory is not configured. Set ENTRA_TENANT_ID and ENTRA_CLIENT_ID on the backend.');
        }
        const jwks = getJwks(tenantId);
        const issuers = [
            `https://login.microsoftonline.com/${tenantId}/v2.0`,
            `https://sts.windows.net/${tenantId}/`,
        ];
        let payload;
        let lastError;
        for (const iss of issuers) {
            for (const aud of audiences) {
                try {
                    ({ payload } = await (0, jose_1.jwtVerify)(token, jwks, {
                        issuer: iss,
                        audience: aud,
                        algorithms: ['RS256'],
                    }));
                    break;
                }
                catch (err) {
                    lastError = err;
                }
            }
            if (payload)
                break;
        }
        if (!payload)
            throw lastError;
        return {
            ...payload,
            name: typeof payload.name === 'string' ? payload.name : undefined,
            oid: typeof payload.oid === 'string' ? payload.oid : undefined,
            email: typeof payload.email === 'string' ? payload.email : undefined,
            preferred_username: typeof payload.preferred_username === 'string'
                ? payload.preferred_username
                : undefined,
            upn: typeof payload.upn === 'string' ? payload.upn : undefined,
            roles: Array.isArray(payload.roles)
                ? payload.roles.filter((value) => typeof value === 'string')
                : [],
        };
    }
    buildTokenValidationDetail(token, error) {
        const tenantId = this.getTenantId();
        const expectedAudiences = this.getAudienceCandidates();
        const expectedIssuers = [
            `https://login.microsoftonline.com/${tenantId}/v2.0`,
            `https://sts.windows.net/${tenantId}/`,
        ];
        try {
            const decoded = (0, jose_1.decodeJwt)(token);
            const actualAudience = Array.isArray(decoded.aud)
                ? decoded.aud.join(', ')
                : (decoded.aud ?? '(missing)');
            const actualRoles = Array.isArray(decoded.roles)
                ? decoded.roles.join(', ')
                : '(none)';
            const actualScopes = typeof decoded.scp === 'string' ? decoded.scp : '(none)';
            const errorMessage = error instanceof Error ? error.message : 'Unknown JWT validation error';
            return [
                `Expected issuer: ${expectedIssuers.join(' or ')}`,
                `Actual issuer: ${decoded.iss ?? '(missing)'}`,
                `Expected audience: ${expectedAudiences.join(' or ')}`,
                `Actual audience: ${actualAudience}`,
                `Scopes: ${actualScopes}`,
                `Roles: ${actualRoles}`,
                `JWT validation error: ${errorMessage}`,
            ].join(' | ');
        }
        catch {
            return [
                `Expected issuer: ${expectedIssuers.join(' or ')}`,
                `Expected audience: ${expectedAudiences.join(' or ')}`,
                `JWT validation error: ${error instanceof Error ? error.message : 'Unknown JWT validation error'}`,
            ].join(' | ');
        }
    }
    getConfigValue(...keys) {
        for (const key of keys) {
            const value = this.configService.get(key)?.trim();
            if (value)
                return value;
        }
        return '';
    }
    getTenantId() {
        return this.getConfigValue('ENTRA_TENANT_ID', 'VITE_ENTRA_TENANT_ID');
    }
    getClientId() {
        return this.getConfigValue('ENTRA_CLIENT_ID', 'VITE_ENTRA_CLIENT_ID');
    }
    getAudienceCandidates() {
        const values = new Set();
        const add = (value) => {
            const trimmed = value.trim();
            if (!trimmed)
                return;
            values.add(trimmed);
            values.add(trimmed.replace(/^api:\/\//, ''));
        };
        add(this.getConfigValue('ENTRA_API_AUDIENCE'));
        const clientId = this.getClientId();
        add(clientId);
        if (clientId)
            add(`api://${clientId}`);
        return [...values];
    }
};
exports.EntraTokenVerifier = EntraTokenVerifier;
exports.EntraTokenVerifier = EntraTokenVerifier = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EntraTokenVerifier);
function getBearerToken(headerValue) {
    const token = getOptionalBearerToken(headerValue);
    if (!token) {
        throw new Error('Missing or invalid bearer token.');
    }
    return token;
}
function getOptionalBearerToken(headerValue) {
    const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!header)
        return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}
function getJwks(tenantId) {
    const cached = jwksCache.get(tenantId);
    if (cached)
        return cached;
    const jwks = (0, jose_1.createRemoteJWKSet)(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));
    jwksCache.set(tenantId, jwks);
    return jwks;
}
//# sourceMappingURL=entra-token-verifier.service.js.map