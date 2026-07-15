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
exports.Venue = void 0;
const typeorm_1 = require("typeorm");
const address_entity_1 = require("./address.entity");
const company_entity_1 = require("./company.entity");
const non_resident_withholding_entity_1 = require("./non-resident-withholding.entity");
const seating_type_entity_1 = require("./seating-type.entity");
const venue_type_entity_1 = require("./venue-type.entity");
let Venue = class Venue {
    companyId;
    company;
    venueName;
    seatingCapacity;
    salesTaxType;
    salesTaxRate;
    taxInCart;
    insuranceLanguage;
    insurancePolicyCopyRequirements;
    venueRelationshipIae;
    venueTypeId;
    venueType;
    seatingTypeId;
    seatingType;
    loadDockAddressId;
    loadDockAddress;
    nonResidentWithholdingId;
    nonResidentWithholding;
    stageDimensions;
    flySystemSpecs;
    stageType;
    seatingChartLinkId;
};
exports.Venue = Venue;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'CompanyID', type: 'int' }),
    __metadata("design:type", Number)
], Venue.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'CompanyID' }),
    __metadata("design:type", company_entity_1.Company)
], Venue.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueName', type: 'nvarchar', length: 200 }),
    __metadata("design:type", String)
], Venue.prototype, "venueName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SeatingCapacity', type: 'int' }),
    __metadata("design:type", Number)
], Venue.prototype, "seatingCapacity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'SalesTaxType',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Venue.prototype, "salesTaxType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'SalesTaxRate',
        type: 'decimal',
        precision: 18,
        scale: 6,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Venue.prototype, "salesTaxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TaxInCart', type: 'bit' }),
    __metadata("design:type", Boolean)
], Venue.prototype, "taxInCart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'InsuranceLanguage', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "insuranceLanguage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'InsurancePolicyCopyRequirements',
        type: 'text',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Venue.prototype, "insurancePolicyCopyRequirements", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueRelationshipIAE', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], Venue.prototype, "venueRelationshipIae", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueTypeID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "venueTypeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_type_entity_1.VenueType),
    (0, typeorm_1.JoinColumn)({ name: 'VenueTypeID' }),
    __metadata("design:type", Object)
], Venue.prototype, "venueType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SeatingTypeID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "seatingTypeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => seating_type_entity_1.SeatingType),
    (0, typeorm_1.JoinColumn)({ name: 'SeatingTypeID' }),
    __metadata("design:type", Object)
], Venue.prototype, "seatingType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LoadDockAddressID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "loadDockAddressId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => address_entity_1.Address),
    (0, typeorm_1.JoinColumn)({ name: 'LoadDockAddressID' }),
    __metadata("design:type", Object)
], Venue.prototype, "loadDockAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'NonResidentWithholdingID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "nonResidentWithholdingId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => non_resident_withholding_entity_1.NonResidentWithholding),
    (0, typeorm_1.JoinColumn)({ name: 'NonResidentWithholdingID' }),
    __metadata("design:type", Object)
], Venue.prototype, "nonResidentWithholding", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'StageDimensions', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "stageDimensions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FlySystemSpecs', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "flySystemSpecs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'StageType', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "stageType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SeatingChartLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Venue.prototype, "seatingChartLinkId", void 0);
exports.Venue = Venue = __decorate([
    (0, typeorm_1.Entity)({ name: 'Venue', schema: 'dbo' })
], Venue);
//# sourceMappingURL=venue.entity.js.map