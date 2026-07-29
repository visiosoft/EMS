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
exports.VenueMarketingSpecsLocalization = void 0;
const typeorm_1 = require("typeorm");
const venue_marketing_specs_entity_1 = require("./venue-marketing-specs.entity");
const localization_option_entity_1 = require("./localization-option.entity");
let VenueMarketingSpecsLocalization = class VenueMarketingSpecsLocalization {
    id;
    venueMarketingSpecsId;
    spec;
    localizationOptionId;
    localizationOption;
    customValue;
};
exports.VenueMarketingSpecsLocalization = VenueMarketingSpecsLocalization;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'VenueMarketingSpecsLocalizationID' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsLocalization.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueMarketingSpecsID', type: 'int' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsLocalization.prototype, "venueMarketingSpecsId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_marketing_specs_entity_1.VenueMarketingSpecs, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'VenueMarketingSpecsID' }),
    __metadata("design:type", venue_marketing_specs_entity_1.VenueMarketingSpecs)
], VenueMarketingSpecsLocalization.prototype, "spec", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LocalizationOptionID', type: 'int' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsLocalization.prototype, "localizationOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => localization_option_entity_1.LocalizationOption),
    (0, typeorm_1.JoinColumn)({ name: 'LocalizationOptionID' }),
    __metadata("design:type", localization_option_entity_1.LocalizationOption)
], VenueMarketingSpecsLocalization.prototype, "localizationOption", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CustomValue', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecsLocalization.prototype, "customValue", void 0);
exports.VenueMarketingSpecsLocalization = VenueMarketingSpecsLocalization = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueMarketingSpecsLocalization', schema: 'dbo' })
], VenueMarketingSpecsLocalization);
//# sourceMappingURL=venue-marketing-specs-localization.entity.js.map