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
exports.VenueComplexMember = void 0;
const typeorm_1 = require("typeorm");
const venue_entity_1 = require("./venue.entity");
const venue_complex_entity_1 = require("./venue-complex.entity");
let VenueComplexMember = class VenueComplexMember {
    venueCompanyId;
    complexCompanyId;
    venue;
    complex;
};
exports.VenueComplexMember = VenueComplexMember;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'VenueCompanyID', type: 'int' }),
    __metadata("design:type", Number)
], VenueComplexMember.prototype, "venueCompanyId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'ComplexCompanyID', type: 'int' }),
    __metadata("design:type", Number)
], VenueComplexMember.prototype, "complexCompanyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_entity_1.Venue),
    (0, typeorm_1.JoinColumn)({ name: 'VenueCompanyID' }),
    __metadata("design:type", venue_entity_1.Venue)
], VenueComplexMember.prototype, "venue", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_complex_entity_1.VenueComplex),
    (0, typeorm_1.JoinColumn)({ name: 'ComplexCompanyID' }),
    __metadata("design:type", venue_complex_entity_1.VenueComplex)
], VenueComplexMember.prototype, "complex", void 0);
exports.VenueComplexMember = VenueComplexMember = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueComplexMember', schema: 'dbo' })
], VenueComplexMember);
//# sourceMappingURL=venue-complex-member.entity.js.map