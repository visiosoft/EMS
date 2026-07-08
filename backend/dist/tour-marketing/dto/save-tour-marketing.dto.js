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
exports.MediaMixInputDto = exports.SaveTourMarketingDto = exports.TourTicketingOfferCodeDto = exports.OFFER_CODE_PURPOSE_VALUES = exports.OFFER_CODE_IAESMS_VALUES = exports.OFFER_CODE_ASSIGNED_TO_VALUES = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.OFFER_CODE_ASSIGNED_TO_VALUES = [
    'IAE - Sign Up',
    'IAE - Full List',
];
exports.OFFER_CODE_IAESMS_VALUES = [
    'Venue - Members',
    'Venue - Full List',
    'Artist',
    'Bookstore',
    'Media Partner',
    'Open',
];
exports.OFFER_CODE_PURPOSE_VALUES = [
    'Presale',
    'Presale Discount',
    'Discount',
];
class TourTicketingOfferCodeDto {
    offerCodeId;
    code;
    assignedTo;
    iaeSms;
    purpose;
}
exports.TourTicketingOfferCodeDto = TourTicketingOfferCodeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], TourTicketingOfferCodeDto.prototype, "offerCodeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], TourTicketingOfferCodeDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.OFFER_CODE_ASSIGNED_TO_VALUES),
    __metadata("design:type", Object)
], TourTicketingOfferCodeDto.prototype, "assignedTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.OFFER_CODE_IAESMS_VALUES),
    __metadata("design:type", Object)
], TourTicketingOfferCodeDto.prototype, "iaeSms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.OFFER_CODE_PURPOSE_VALUES),
    __metadata("design:type", Object)
], TourTicketingOfferCodeDto.prototype, "purpose", void 0);
class SaveTourMarketingDto {
    audienceGender;
    audienceAgeRangeIds;
    mediaMix;
    offerCodes;
}
exports.SaveTourMarketingDto = SaveTourMarketingDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], SaveTourMarketingDto.prototype, "audienceGender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    __metadata("design:type", Array)
], SaveTourMarketingDto.prototype, "audienceAgeRangeIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MediaMixInputDto),
    __metadata("design:type", Array)
], SaveTourMarketingDto.prototype, "mediaMix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TourTicketingOfferCodeDto),
    __metadata("design:type", Array)
], SaveTourMarketingDto.prototype, "offerCodes", void 0);
class MediaMixInputDto {
    advertisingSubTypeId;
    companyId;
}
exports.MediaMixInputDto = MediaMixInputDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], MediaMixInputDto.prototype, "advertisingSubTypeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], MediaMixInputDto.prototype, "companyId", void 0);
//# sourceMappingURL=save-tour-marketing.dto.js.map