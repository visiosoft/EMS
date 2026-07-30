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
exports.AuditColumns = void 0;
exports.applyAuditColumns = applyAuditColumns;
const typeorm_1 = require("typeorm");
class AuditColumns {
    createdBy;
    createdAt;
    modifiedBy;
    modifiedAt;
}
exports.AuditColumns = AuditColumns;
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], AuditColumns.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], AuditColumns.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'modified_by', type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], AuditColumns.prototype, "modifiedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'modified_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], AuditColumns.prototype, "modifiedAt", void 0);
function applyAuditColumns(entity, flags, mode, userOid, now) {
    if (!entity)
        return;
    const row = entity;
    if (mode === 'insert') {
        if (flags.createdAt && row.createdAt == null)
            row.createdAt = now;
        if (flags.createdBy && userOid)
            row.createdBy = userOid;
    }
    if (flags.modifiedAt)
        row.modifiedAt = now;
    if (flags.modifiedBy && userOid)
        row.modifiedBy = userOid;
}
//# sourceMappingURL=audit-columns.js.map