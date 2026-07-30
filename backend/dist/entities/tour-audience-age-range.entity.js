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
exports.TourAudienceAgeRange = void 0;
const typeorm_1 = require("typeorm");
const age_range_entity_1 = require("./age-range.entity");
const tour_entity_1 = require("./tour.entity");
let TourAudienceAgeRange = class TourAudienceAgeRange {
    tourId;
    ageRangeId;
    tour;
    ageRange;
};
exports.TourAudienceAgeRange = TourAudienceAgeRange;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'TourID', type: 'int' }),
    __metadata("design:type", Number)
], TourAudienceAgeRange.prototype, "tourId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'AgeRangeID', type: 'int' }),
    __metadata("design:type", Number)
], TourAudienceAgeRange.prototype, "ageRangeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tour_entity_1.Tour),
    (0, typeorm_1.JoinColumn)({ name: 'TourID' }),
    __metadata("design:type", tour_entity_1.Tour)
], TourAudienceAgeRange.prototype, "tour", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => age_range_entity_1.AgeRange),
    (0, typeorm_1.JoinColumn)({ name: 'AgeRangeID' }),
    __metadata("design:type", age_range_entity_1.AgeRange)
], TourAudienceAgeRange.prototype, "ageRange", void 0);
exports.TourAudienceAgeRange = TourAudienceAgeRange = __decorate([
    (0, typeorm_1.Entity)({ name: 'TourAudienceAgeRange', schema: 'dbo' })
], TourAudienceAgeRange);
//# sourceMappingURL=tour-audience-age-range.entity.js.map