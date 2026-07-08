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
exports.VenueTax = void 0;
const typeorm_1 = require("typeorm");
const tax_entity_1 = require("./tax.entity");
const venue_entity_1 = require("./venue.entity");
let VenueTax = class VenueTax {
    venueCompanyId;
    taxId;
    venue;
    tax;
};
exports.VenueTax = VenueTax;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'VenueCompanyID', type: 'int' }),
    __metadata("design:type", Number)
], VenueTax.prototype, "venueCompanyId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'TaxID', type: 'int' }),
    __metadata("design:type", Number)
], VenueTax.prototype, "taxId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_entity_1.Venue),
    (0, typeorm_1.JoinColumn)({ name: 'VenueCompanyID' }),
    __metadata("design:type", venue_entity_1.Venue)
], VenueTax.prototype, "venue", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tax_entity_1.Tax),
    (0, typeorm_1.JoinColumn)({ name: 'TaxID' }),
    __metadata("design:type", tax_entity_1.Tax)
], VenueTax.prototype, "tax", void 0);
exports.VenueTax = VenueTax = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueTax', schema: 'dbo' })
], VenueTax);
//# sourceMappingURL=venue-tax.entity.js.map