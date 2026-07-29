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
exports.VenueBrand = void 0;
const typeorm_1 = require("typeorm");
const brand_entity_1 = require("./brand.entity");
const venue_entity_1 = require("./venue.entity");
let VenueBrand = class VenueBrand {
    venueCompanyId;
    brandId;
    venue;
    brand;
};
exports.VenueBrand = VenueBrand;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'VenueCompanyID', type: 'int' }),
    __metadata("design:type", Number)
], VenueBrand.prototype, "venueCompanyId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'BrandID', type: 'int' }),
    __metadata("design:type", Number)
], VenueBrand.prototype, "brandId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_entity_1.Venue),
    (0, typeorm_1.JoinColumn)({ name: 'VenueCompanyID' }),
    __metadata("design:type", venue_entity_1.Venue)
], VenueBrand.prototype, "venue", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => brand_entity_1.Brand),
    (0, typeorm_1.JoinColumn)({ name: 'BrandID' }),
    __metadata("design:type", brand_entity_1.Brand)
], VenueBrand.prototype, "brand", void 0);
exports.VenueBrand = VenueBrand = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueBrand', schema: 'dbo' })
], VenueBrand);
//# sourceMappingURL=venue-brand.entity.js.map