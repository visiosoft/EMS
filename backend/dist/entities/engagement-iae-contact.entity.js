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
exports.EngagementIAEContact = void 0;
const typeorm_1 = require("typeorm");
let EngagementIAEContact = class EngagementIAEContact {
    engagementIaeContactId;
    engagementId;
    contactId;
    roleId;
    departmentId;
    isPrimary;
    notes;
    createdDate;
};
exports.EngagementIAEContact = EngagementIAEContact;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'EngagementIAEContactID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementIAEContact.prototype, "engagementIaeContactId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementIAEContact.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ContactID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementIAEContact.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RoleID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementIAEContact.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DepartmentID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementIAEContact.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsPrimary', type: 'bit', default: () => '(0)' }),
    __metadata("design:type", Boolean)
], EngagementIAEContact.prototype, "isPrimary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], EngagementIAEContact.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CreatedDate', type: 'datetime' }),
    __metadata("design:type", Date)
], EngagementIAEContact.prototype, "createdDate", void 0);
exports.EngagementIAEContact = EngagementIAEContact = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementIAEContact', schema: 'dbo' })
], EngagementIAEContact);
//# sourceMappingURL=engagement-iae-contact.entity.js.map