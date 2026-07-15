"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditRequestContext = void 0;
const node_async_hooks_1 = require("node:async_hooks");
const common_1 = require("@nestjs/common");
let AuditRequestContext = class AuditRequestContext {
    storage = new node_async_hooks_1.AsyncLocalStorage();
    run(store, callback) {
        return this.storage.run(store, callback);
    }
    getUserOid() {
        return this.storage.getStore()?.userOid ?? null;
    }
    getUserDisplayName() {
        return this.storage.getStore()?.userDisplayName ?? null;
    }
    getUserEmail() {
        return this.storage.getStore()?.userEmail ?? null;
    }
    getUserEmailCandidates() {
        return this.storage.getStore()?.userEmailCandidates ?? [];
    }
    getGraphAccessToken() {
        return this.storage.getStore()?.graphAccessToken ?? null;
    }
};
exports.AuditRequestContext = AuditRequestContext;
exports.AuditRequestContext = AuditRequestContext = __decorate([
    (0, common_1.Injectable)()
], AuditRequestContext);
//# sourceMappingURL=audit-request-context.service.js.map