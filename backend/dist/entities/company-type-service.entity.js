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
exports.CompanyTypeService = void 0;
const typeorm_1 = require("typeorm");
const company_type_entity_1 = require("./company-type.entity");
const service_provided_entity_1 = require("./service-provided.entity");
let CompanyTypeService = class CompanyTypeService {
    companyTypeServiceId;
    companyTypeId;
    companyType;
    serviceProvidedId;
    serviceProvided;
};
exports.CompanyTypeService = CompanyTypeService;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'CompanyTypeServiceID' }),
    __metadata("design:type", Number)
], CompanyTypeService.prototype, "companyTypeServiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CompanyTypeID', type: 'int' }),
    __metadata("design:type", Number)
], CompanyTypeService.prototype, "companyTypeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_type_entity_1.CompanyType),
    (0, typeorm_1.JoinColumn)({ name: 'CompanyTypeID' }),
    __metadata("design:type", company_type_entity_1.CompanyType)
], CompanyTypeService.prototype, "companyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ServiceProvidedID', type: 'int' }),
    __metadata("design:type", Number)
], CompanyTypeService.prototype, "serviceProvidedId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => service_provided_entity_1.ServiceProvided),
    (0, typeorm_1.JoinColumn)({ name: 'ServiceProvidedID' }),
    __metadata("design:type", service_provided_entity_1.ServiceProvided)
], CompanyTypeService.prototype, "serviceProvided", void 0);
exports.CompanyTypeService = CompanyTypeService = __decorate([
    (0, typeorm_1.Entity)({ name: 'CompanyTypeService', schema: 'dbo' })
], CompanyTypeService);
//# sourceMappingURL=company-type-service.entity.js.map