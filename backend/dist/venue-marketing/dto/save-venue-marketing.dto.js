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
exports.SaveVenueMarketingDto = exports.VenueMarketingSpecRowDto = exports.SpecFileSpecDto = exports.SpecTagDto = exports.SpecLocalizationDto = exports.VenueStyleGuideDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class VenueStyleGuideDto {
    font;
    primaryColors;
    accentColors;
    notes;
    logoUrl;
}
exports.VenueStyleGuideDto = VenueStyleGuideDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], VenueStyleGuideDto.prototype, "font", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], VenueStyleGuideDto.prototype, "primaryColors", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], VenueStyleGuideDto.prototype, "accentColors", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], VenueStyleGuideDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], VenueStyleGuideDto.prototype, "logoUrl", void 0);
class SpecLocalizationDto {
    localizationOptionId;
    customValue;
}
exports.SpecLocalizationDto = SpecLocalizationDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SpecLocalizationDto.prototype, "localizationOptionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], SpecLocalizationDto.prototype, "customValue", void 0);
class SpecTagDto {
    tagOptionId;
}
exports.SpecTagDto = SpecTagDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SpecTagDto.prototype, "tagOptionId", void 0);
class SpecFileSpecDto {
    fileSpecOptionId;
    customValue;
}
exports.SpecFileSpecDto = SpecFileSpecDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SpecFileSpecDto.prototype, "fileSpecOptionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], SpecFileSpecDto.prototype, "customValue", void 0);
class VenueMarketingSpecRowDto {
    venueMarketingSpecsId;
    fileName;
    placementCategoryId;
    graphicSizeHorizontal;
    graphicSizeVertical;
    fileFormatOptionId;
    notes;
    localizations;
    tags;
    fileSpecs;
}
exports.VenueMarketingSpecRowDto = VenueMarketingSpecRowDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], VenueMarketingSpecRowDto.prototype, "venueMarketingSpecsId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], VenueMarketingSpecRowDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], VenueMarketingSpecRowDto.prototype, "placementCategoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], VenueMarketingSpecRowDto.prototype, "graphicSizeHorizontal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], VenueMarketingSpecRowDto.prototype, "graphicSizeVertical", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], VenueMarketingSpecRowDto.prototype, "fileFormatOptionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], VenueMarketingSpecRowDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SpecLocalizationDto),
    __metadata("design:type", Array)
], VenueMarketingSpecRowDto.prototype, "localizations", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SpecTagDto),
    __metadata("design:type", Array)
], VenueMarketingSpecRowDto.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SpecFileSpecDto),
    __metadata("design:type", Array)
], VenueMarketingSpecRowDto.prototype, "fileSpecs", void 0);
class SaveVenueMarketingDto {
    styleGuideEnabled;
    styleGuide;
    specs;
}
exports.SaveVenueMarketingDto = SaveVenueMarketingDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveVenueMarketingDto.prototype, "styleGuideEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => VenueStyleGuideDto),
    __metadata("design:type", Object)
], SaveVenueMarketingDto.prototype, "styleGuide", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => VenueMarketingSpecRowDto),
    __metadata("design:type", Array)
], SaveVenueMarketingDto.prototype, "specs", void 0);
//# sourceMappingURL=save-venue-marketing.dto.js.map