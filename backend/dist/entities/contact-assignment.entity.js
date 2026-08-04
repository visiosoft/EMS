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
exports.ContactAssignment = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const company_entity_1 = require("./company.entity");
const contact_entity_1 = require("./contact.entity");
const department_entity_1 = require("./department.entity");
const role_entity_1 = require("./role.entity");
let ContactAssignment = class ContactAssignment extends audit_columns_1.AuditColumns {
    contactAssignmentId;
    contactId;
    contact;
    companyId;
    company;
    roleId;
    role;
    departmentId;
    department;
};
exports.ContactAssignment = ContactAssignment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ContactAssignmentID' }),
    __metadata("design:type", Number)
], ContactAssignment.prototype, "contactAssignmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ContactID', type: 'int' }),
    __metadata("design:type", Number)
], ContactAssignment.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_entity_1.Contact),
    (0, typeorm_1.JoinColumn)({ name: 'ContactID' }),
    __metadata("design:type", contact_entity_1.Contact)
], ContactAssignment.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CompanyID', type: 'int' }),
    __metadata("design:type", Number)
], ContactAssignment.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'CompanyID' }),
    __metadata("design:type", company_entity_1.Company)
], ContactAssignment.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RoleID', type: 'int' }),
    __metadata("design:type", Number)
], ContactAssignment.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => role_entity_1.Role),
    (0, typeorm_1.JoinColumn)({ name: 'RoleID' }),
    __metadata("design:type", role_entity_1.Role)
], ContactAssignment.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DepartmentID', type: 'int' }),
    __metadata("design:type", Number)
], ContactAssignment.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => department_entity_1.Department),
    (0, typeorm_1.JoinColumn)({ name: 'DepartmentID' }),
    __metadata("design:type", department_entity_1.Department)
], ContactAssignment.prototype, "department", void 0);
exports.ContactAssignment = ContactAssignment = __decorate([
    (0, typeorm_1.Entity)({ name: 'ContactAssignment', schema: 'dbo' })
], ContactAssignment);
//# sourceMappingURL=contact-assignment.entity.js.map