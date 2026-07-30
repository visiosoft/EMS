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
exports.UpdatePerformanceTicketingDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
function toOptionalNumber(v) {
    if (v === null || v === '')
        return null;
    if (v === undefined)
        return undefined;
    if (typeof v === 'number')
        return Number.isFinite(v) ? v : undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
function toOptionalInt(v) {
    if (v === null || v === '')
        return null;
    if (v === undefined)
        return undefined;
    if (typeof v === 'number' && Number.isInteger(v))
        return v;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : undefined;
}
class UpdatePerformanceTicketingDto {
    ticketingStatus;
    onSaleDate;
    preSaleDate;
    vipPackagedOffer;
    preSaleSpecialPrices;
    kidsTicketsPrices;
    ticketingLinkId;
    ticketingLinkUrl;
    grossTicketSales;
    totalComps;
    totalTickets;
    totalAdmissions;
    sellableCapacity;
    grossPotentialRevenue;
    ticketingSystemCompanyId;
    ticketingAdministrator;
    boxOfficeLaborStaffingRequired;
    facilityFeeType;
    facilityFeeAmount;
    dynamicPricingMode;
    rebateAmount;
    bumpAmount;
    creditCardFeesType;
    creditCardFeesAmountPercent;
    salesTaxType;
    salesTaxAmountPercent;
    ticketingAdminContactId;
    ticketingAdminCompanyId;
    publicSaleLinkUrl;
    preSaleEndDate;
    preSaleRegistrationStartDate;
    preSaleRegistrationEndDate;
    isIAETMDeal;
    presalePassword;
    presalePasswordDateStart;
    presalePasswordDateEnd;
    presaleSpecialPricePassword;
    presaleSpecialPricePasswordDateStart;
    presaleSpecialPricePasswordDateEnd;
    presaleSpecialPriceDiscountType;
    presaleSpecialPriceDiscountAmount;
    publicSaleSpecialPricePassword;
    publicSaleSpecialPricePasswordDateStart;
    publicSaleSpecialPricePasswordDateEnd;
    publicSaleSpecialPriceDiscountType;
    publicSaleSpecialPriceDiscountAmount;
    vipPackageOffered;
    vipPackageName;
    vipPackageBenefits;
    compTicketForm;
    compTicketExcelSheet;
    engagementScaling;
}
exports.UpdatePerformanceTicketingDto = UpdatePerformanceTicketingDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "ticketingStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "onSaleDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "preSaleDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "vipPackagedOffer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "preSaleSpecialPrices", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "kidsTicketsPrices", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "ticketingLinkId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "ticketingLinkUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "grossTicketSales", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2_000_000_000),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "totalComps", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2_000_000_000),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "totalTickets", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2_000_000_000),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "totalAdmissions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2_000_000_000),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "sellableCapacity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "grossPotentialRevenue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "ticketingSystemCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "ticketingAdministrator", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined)
            return undefined;
        if (value === null)
            return null;
        if (typeof value === 'boolean')
            return value;
        if (value === 'true' || value === 1 || value === '1')
            return true;
        if (value === 'false' || value === 0 || value === '0')
            return false;
        return undefined;
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "boxOfficeLaborStaffingRequired", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "facilityFeeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "facilityFeeAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "dynamicPricingMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "rebateAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "bumpAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "creditCardFeesType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "creditCardFeesAmountPercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "salesTaxType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 6 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "salesTaxAmountPercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "ticketingAdminContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "ticketingAdminCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "publicSaleLinkUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "preSaleEndDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "preSaleRegistrationStartDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "preSaleRegistrationEndDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === undefined ? undefined : value === null ? null : Boolean(value)),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "isIAETMDeal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presalePassword", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presalePasswordDateStart", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presalePasswordDateEnd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presaleSpecialPricePassword", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presaleSpecialPricePasswordDateStart", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presaleSpecialPricePasswordDateEnd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presaleSpecialPriceDiscountType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "presaleSpecialPriceDiscountAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "publicSaleSpecialPricePassword", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "publicSaleSpecialPricePasswordDateStart", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "publicSaleSpecialPricePasswordDateEnd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "publicSaleSpecialPriceDiscountType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "publicSaleSpecialPriceDiscountAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === undefined ? undefined : value === null ? null : Boolean(value)),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "vipPackageOffered", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "vipPackageName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "vipPackageBenefits", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "compTicketForm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "compTicketExcelSheet", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdatePerformanceTicketingDto.prototype, "engagementScaling", void 0);
//# sourceMappingURL=update-performance-ticketing.dto.js.map