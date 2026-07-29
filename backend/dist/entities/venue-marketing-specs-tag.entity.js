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
exports.VenueMarketingSpecsTag = void 0;
const typeorm_1 = require("typeorm");
const venue_marketing_specs_entity_1 = require("./venue-marketing-specs.entity");
const tag_option_entity_1 = require("./tag-option.entity");
let VenueMarketingSpecsTag = class VenueMarketingSpecsTag {
    id;
    venueMarketingSpecsId;
    spec;
    tagOptionId;
    tagOption;
};
exports.VenueMarketingSpecsTag = VenueMarketingSpecsTag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'VenueMarketingSpecsTagID' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsTag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueMarketingSpecsID', type: 'int' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsTag.prototype, "venueMarketingSpecsId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_marketing_specs_entity_1.VenueMarketingSpecs, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'VenueMarketingSpecsID' }),
    __metadata("design:type", venue_marketing_specs_entity_1.VenueMarketingSpecs)
], VenueMarketingSpecsTag.prototype, "spec", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TagOptionID', type: 'int' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsTag.prototype, "tagOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tag_option_entity_1.TagOption),
    (0, typeorm_1.JoinColumn)({ name: 'TagOptionID' }),
    __metadata("design:type", tag_option_entity_1.TagOption)
], VenueMarketingSpecsTag.prototype, "tagOption", void 0);
exports.VenueMarketingSpecsTag = VenueMarketingSpecsTag = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueMarketingSpecsTag', schema: 'dbo' })
], VenueMarketingSpecsTag);
//# sourceMappingURL=venue-marketing-specs-tag.entity.js.map