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
exports.CompanyService = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const service_provided_entity_1 = require("./service-provided.entity");
let CompanyService = class CompanyService {
    companyServiceId;
    companyId;
    serviceProvidedId;
    company;
    serviceProvided;
};
exports.CompanyService = CompanyService;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'CompanyServiceID' }),
    __metadata("design:type", Number)
], CompanyService.prototype, "companyServiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CompanyID', type: 'int' }),
    __metadata("design:type", Number)
], CompanyService.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ServiceProvidedID', type: 'int' }),
    __metadata("design:type", Number)
], CompanyService.prototype, "serviceProvidedId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'CompanyID' }),
    __metadata("design:type", company_entity_1.Company)
], CompanyService.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => service_provided_entity_1.ServiceProvided),
    (0, typeorm_1.JoinColumn)({ name: 'ServiceProvidedID' }),
    __metadata("design:type", service_provided_entity_1.ServiceProvided)
], CompanyService.prototype, "serviceProvided", void 0);
exports.CompanyService = CompanyService = __decorate([
    (0, typeorm_1.Entity)({ name: 'CompanyService', schema: 'dbo' })
], CompanyService);
//# sourceMappingURL=company-service.entity.js.map