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
exports.VenueMarketingSpecs = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const placement_category_entity_1 = require("./placement-category.entity");
const file_format_option_entity_1 = require("./file-format-option.entity");
const venue_style_guide_entity_1 = require("./venue-style-guide.entity");
let VenueMarketingSpecs = class VenueMarketingSpecs extends audit_columns_1.AuditColumns {
    venueMarketingSpecsId;
    venueId;
    styleGuideEnabled;
    venueStyleGuideId;
    venueStyleGuide;
    fileName;
    placementCategoryId;
    placementCategory;
    graphicSizeHorizontal;
    graphicSizeVertical;
    fileFormatOptionId;
    fileFormat;
    notes;
};
exports.VenueMarketingSpecs = VenueMarketingSpecs;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'VenueMarketingSpecsID' }),
    __metadata("design:type", Number)
], VenueMarketingSpecs.prototype, "venueMarketingSpecsId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueID', type: 'int' }),
    __metadata("design:type", Number)
], VenueMarketingSpecs.prototype, "venueId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'StyleGuideEnabled', type: 'bit' }),
    __metadata("design:type", Boolean)
], VenueMarketingSpecs.prototype, "styleGuideEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueStyleGuideID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "venueStyleGuideId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_style_guide_entity_1.VenueStyleGuide, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'VenueStyleGuideID' }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "venueStyleGuide", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FileName', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PlacementCategoryID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "placementCategoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => placement_category_entity_1.PlacementCategory, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'PlacementCategoryID' }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "placementCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'GraphicSizeHorizontal', type: 'nvarchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "graphicSizeHorizontal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'GraphicSizeVertical', type: 'nvarchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "graphicSizeVertical", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FileFormatOptionID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "fileFormatOptionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => file_format_option_entity_1.FileFormatOption, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'FileFormatOptionID' }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "fileFormat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Notes', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], VenueMarketingSpecs.prototype, "notes", void 0);
exports.VenueMarketingSpecs = VenueMarketingSpecs = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueMarketingSpecs', schema: 'dbo' })
], VenueMarketingSpecs);
//# sourceMappingURL=venue-marketing-specs.entity.js.map