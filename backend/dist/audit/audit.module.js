"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const entra_token_verifier_service_1 = require("../auth/entra-token-verifier.service");
const audit_context_middleware_1 = require("./audit-context.middleware");
const audit_request_context_service_1 = require("./audit-request-context.service");
let AuditModule = class AuditModule {
};
exports.AuditModule = AuditModule;
exports.AuditModule = AuditModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [audit_request_context_service_1.AuditRequestContext, audit_context_middleware_1.AuditContextMiddleware, entra_token_verifier_service_1.EntraTokenVerifier],
        exports: [audit_request_context_service_1.AuditRequestContext, audit_context_middleware_1.AuditContextMiddleware, entra_token_verifier_service_1.EntraTokenVerifier],
    })
], AuditModule);
//# sourceMappingURL=audit.module.js.map