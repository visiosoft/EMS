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
exports.VenueServiceProvider = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const service_provided_entity_1 = require("./service-provided.entity");
const venue_entity_1 = require("./venue.entity");
let VenueServiceProvider = class VenueServiceProvider {
    venueCompanyId;
    serviceId;
    providerCompanyId;
    venue;
    service;
    providerCompany;
};
exports.VenueServiceProvider = VenueServiceProvider;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'VenueCompanyID', type: 'int' }),
    __metadata("design:type", Number)
], VenueServiceProvider.prototype, "venueCompanyId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'ServiceID', type: 'int' }),
    __metadata("design:type", Number)
], VenueServiceProvider.prototype, "serviceId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'ProviderCompanyID', type: 'int' }),
    __metadata("design:type", Number)
], VenueServiceProvider.prototype, "providerCompanyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_entity_1.Venue),
    (0, typeorm_1.JoinColumn)({ name: 'VenueCompanyID' }),
    __metadata("design:type", venue_entity_1.Venue)
], VenueServiceProvider.prototype, "venue", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => service_provided_entity_1.ServiceProvided),
    (0, typeorm_1.JoinColumn)({ name: 'ServiceID' }),
    __metadata("design:type", service_provided_entity_1.ServiceProvided)
], VenueServiceProvider.prototype, "service", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'ProviderCompanyID' }),
    __metadata("design:type", company_entity_1.Company)
], VenueServiceProvider.prototype, "providerCompany", void 0);
exports.VenueServiceProvider = VenueServiceProvider = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueServiceProvider', schema: 'dbo' })
], VenueServiceProvider);
//# sourceMappingURL=venue-service-provider.entity.js.map