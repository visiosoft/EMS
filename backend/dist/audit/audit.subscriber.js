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
exports.AuditSubscriber = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("./audit-columns");
const audit_request_context_service_1 = require("./audit-request-context.service");
let AuditSubscriber = class AuditSubscriber {
    auditContext;
    constructor(dataSource, auditContext) {
        this.auditContext = auditContext;
        dataSource.subscribers.push(this);
    }
    beforeInsert(event) {
        this.apply(event, 'insert');
    }
    beforeUpdate(event) {
        this.apply(event, 'update');
    }
    apply(event, mode) {
        const flags = this.getAuditColumnFlags(event);
        if (!Object.values(flags).some(Boolean))
            return;
        (0, audit_columns_1.applyAuditColumns)(event.entity, flags, mode, this.auditContext.getUserOid(), new Date());
    }
    getAuditColumnFlags(event) {
        const has = (propertyName) => event.metadata.columns.some((column) => column.propertyName === propertyName);
        return {
            createdBy: has('createdBy'),
            createdAt: has('createdAt'),
            modifiedBy: has('modifiedBy'),
            modifiedAt: has('modifiedAt'),
        };
    }
};
exports.AuditSubscriber = AuditSubscriber;
exports.AuditSubscriber = AuditSubscriber = __decorate([
    (0, common_1.Injectable)(),
    (0, typeorm_1.EventSubscriber)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        audit_request_context_service_1.AuditRequestContext])
], AuditSubscriber);
//# sourceMappingURL=audit.subscriber.js.map