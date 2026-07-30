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
exports.VenueMarketingSpecsFileSpec = void 0;
const typeorm_1 = require("typeorm");
const venue_marketing_specs_entity_1 = require("./venue-marketing-specs.entity");
const file_spec_option_entity_1 = require("./file-spec-option.entity");
let VenueMarketingSpecsFileSpec = class VenueMarketingSpecsFileSpec {
    id;
    venueMarketingSpecsId;
    spec;
    fileSpecOptionId;
    fileSpecOption;
    customValue;
};
exports.VenueMarketingSpecsFileSpec = VenueMarketingSpecsFileSpec;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'VenueMarketingSpecsFileSpecID' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsFileSpec.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueMarketingSpecsID', type: 'int' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsFileSpec.prototype, "venueMarketingSpecsId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_marketing_specs_entity_1.VenueMarketingSpecs, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'VenueMarketingSpecsID' }),
    __metadata("design:type", venue_marketing_specs_entity_1.VenueMarketingSpecs)
], VenueMarketingSpecsFileSpec.prototype, "spec", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FileSpecOptionID', type: 'int' }),
    __metadata("design:type", Number)
], VenueMarketingSpecsFileSpec.prototype, "fileSpecOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => file_spec_option_entity_1.FileSpecOption),
    (0, typeorm_1.JoinColumn)({ name: 'FileSpecOptionID' }),
    __metadata("design:type", file_spec_option_entity_1.FileSpecOption)
], VenueMarketingSpecsFileSpec.prototype, "fileSpecOption", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CustomValue', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecsFileSpec.prototype, "customValue", void 0);
exports.VenueMarketingSpecsFileSpec = VenueMarketingSpecsFileSpec = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueMarketingSpecsFileSpec', schema: 'dbo' })
], VenueMarketingSpecsFileSpec);
//# sourceMappingURL=venue-marketing-specs-file-spec.entity.js.map