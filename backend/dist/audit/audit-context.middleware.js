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
exports.AuditContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const entra_token_verifier_service_1 = require("../auth/entra-token-verifier.service");
const audit_request_context_service_1 = require("./audit-request-context.service");
let AuditContextMiddleware = class AuditContextMiddleware {
    auditContext;
    tokenVerifier;
    constructor(auditContext, tokenVerifier) {
        this.auditContext = auditContext;
        this.tokenVerifier = tokenVerifier;
    }
    async use(req, _res, next) {
        const token = (0, entra_token_verifier_service_1.getOptionalBearerToken)(req.headers.authorization);
        const graphAccessToken = req.header('x-entra-graph-access-token') ?? null;
        let userOid = readAuditUserOidHeader(req);
        let userDisplayName = readAuditUserNameHeader(req);
        let userEmailCandidates = readAuditUserEmailHeaderCandidates(req);
        if (token) {
            try {
                const user = await this.tokenVerifier.verify(token);
                userOid = normalizeAuditUserOid(user.oid) ?? userOid;
                userDisplayName =
                    normalizeAuditUserName(user.name) ??
                        normalizeAuditUserName(user.preferred_username) ??
                        userDisplayName;
                const tokenEmailCandidates = [
                    normalizeAuditUserEmail(user.email),
                    normalizeAuditUserEmail(user.preferred_username),
                    normalizeAuditUserEmail(user.upn),
                ].filter((value) => value != null);
                if (tokenEmailCandidates.length > 0) {
                    userEmailCandidates = dedupeStrings([
                        ...tokenEmailCandidates,
                        ...userEmailCandidates,
                    ]);
                }
            }
            catch {
                userOid = readAuditUserOidHeader(req);
                userDisplayName = readAuditUserNameHeader(req);
                userEmailCandidates = readAuditUserEmailHeaderCandidates(req);
            }
        }
        this.auditContext.run({
            userOid,
            userDisplayName,
            userEmail: userEmailCandidates[0] ?? null,
            userEmailCandidates,
            graphAccessToken,
        }, next);
    }
};
exports.AuditContextMiddleware = AuditContextMiddleware;
exports.AuditContextMiddleware = AuditContextMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_request_context_service_1.AuditRequestContext,
        entra_token_verifier_service_1.EntraTokenVerifier])
], AuditContextMiddleware);
function dedupeStrings(values) {
    return Array.from(new Set(values));
}
function readAuditUserOidHeader(req) {
    return (normalizeAuditUserOid(req.header('x-user-oid')) ??
        normalizeAuditUserOid(req.header('x-entra-oid')) ??
        normalizeAuditUserOid(req.header('x-ms-client-principal-id')) ??
        null);
}
function readAuditUserNameHeader(req) {
    return (normalizeAuditUserName(req.header('x-user-name')) ??
        normalizeAuditUserName(req.header('x-entra-name')) ??
        normalizeAuditUserName(req.header('x-ms-client-principal-name')) ??
        null);
}
function normalizeAuditUserOid(value) {
    const oid = String(value ?? '').trim();
    if (!oid || oid.length > 150)
        return null;
    if (Array.from(oid).some((char) => {
        const code = char.charCodeAt(0);
        return code <= 31 || code === 127;
    })) {
        return null;
    }
    return oid;
}
function readAuditUserEmailHeaderCandidates(req) {
    return dedupeStrings([
        normalizeAuditUserEmail(req.header('x-user-email')),
        normalizeAuditUserEmail(req.header('x-entra-email')),
    ].filter((value) => value != null));
}
function normalizeAuditUserEmail(value) {
    const email = String(value ?? '')
        .trim()
        .toLowerCase();
    if (!email || email.length > 254)
        return null;
    if (!email.includes('@'))
        return null;
    return email;
}
function normalizeAuditUserName(value) {
    const name = String(value ?? '').trim();
    if (!name || name.length > 200)
        return null;
    if (Array.from(name).some((char) => {
        const code = char.charCodeAt(0);
        return code <= 31 || code === 127;
    })) {
        return null;
    }
    return name;
}
//# sourceMappingURL=audit-context.middleware.js.map