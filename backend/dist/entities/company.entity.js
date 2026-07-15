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
exports.Company = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const address_entity_1 = require("./address.entity");
const company_type_entity_1 = require("./company-type.entity");
const dma_entity_1 = require("./dma.entity");
let Company = class Company extends audit_columns_1.AuditColumns {
    companyId;
    companyTypeId;
    companyType;
    companyName;
    physicalAddressId;
    physicalAddress;
    mailingAddressId;
    mailingAddress;
    dmaid;
    dma;
    isInternal;
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'CompanyID' }),
    __metadata("design:type", Number)
], Company.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CompanyTypeID', type: 'int' }),
    __metadata("design:type", Number)
], Company.prototype, "companyTypeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_type_entity_1.CompanyType),
    (0, typeorm_1.JoinColumn)({ name: 'CompanyTypeID' }),
    __metadata("design:type", company_type_entity_1.CompanyType)
], Company.prototype, "companyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CompanyName', type: 'nvarchar', length: 200 }),
    __metadata("design:type", String)
], Company.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PhysicalAddressID', type: 'int' }),
    __metadata("design:type", Number)
], Company.prototype, "physicalAddressId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => address_entity_1.Address),
    (0, typeorm_1.JoinColumn)({ name: 'PhysicalAddressID' }),
    __metadata("design:type", address_entity_1.Address)
], Company.prototype, "physicalAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'MailingAddressID', type: 'int' }),
    __metadata("design:type", Number)
], Company.prototype, "mailingAddressId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => address_entity_1.Address),
    (0, typeorm_1.JoinColumn)({ name: 'MailingAddressID' }),
    __metadata("design:type", address_entity_1.Address)
], Company.prototype, "mailingAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DMAID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Company.prototype, "dmaid", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => dma_entity_1.Dma),
    (0, typeorm_1.JoinColumn)({ name: 'DMAID' }),
    __metadata("design:type", dma_entity_1.Dma)
], Company.prototype, "dma", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_internal', type: 'bit' }),
    __metadata("design:type", Boolean)
], Company.prototype, "isInternal", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)({ name: 'Company', schema: 'dbo' })
], Company);
//# sourceMappingURL=company.entity.js.map