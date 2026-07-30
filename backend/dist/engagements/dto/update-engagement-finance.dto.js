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
exports.UpdateEngagementFinanceDto = void 0;
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
function toOptionalBool(v) {
    if (v === null)
        return null;
    if (v === undefined)
        return undefined;
    if (typeof v === 'boolean')
        return v;
    if (v === 'true' || v === 1 || v === '1')
        return true;
    if (v === 'false' || v === 0 || v === '0')
        return false;
    return undefined;
}
class UpdateEngagementFinanceDto {
    estimatedBreakeven;
    sellableCapacity;
    grossPotential;
    grossMarketingBudget;
    netMarketingBudget;
    salesRevenueGoal;
    tourSplitPoint;
    announcementDate;
    promoterProfit;
    venueDealType;
    thirdPartyPartnerDealStructure;
    venueDealTypeId;
    venueTerms;
    confirmationPacketApproved;
    iaeWaiverApplicationConfirmationNumber;
    iaeWaiverApplicationSubmissionDate;
    iaeApplicationWaiverStatus;
    dateFundsReceived;
    fundsDue;
    fundsWithheld;
    fundsOwed;
    receivableBankAccount;
    requiredNonResidentWithholdingId;
    artistFinanceId;
    settlementFinanceId;
    artistDealType;
    artistGuarantee;
    artistMiddleMoney;
    artistRoyaltyVariableFee;
    artistRoyaltyRatePercent;
    artistRoyaltyBasedOn;
    artistBackEndTerms;
    artistVersusPercent;
    overagePercent;
    artistPromoterProfitPercent;
    artistBackendPercent;
    finalAcceptedOfferLink;
    settlementFileSharePointLink;
    artistSettlementStatus;
    venueSettlementStatus;
    subscriptionSalesRevenueTotal;
    seasonTicketSalesByIae;
    seasonTicketFundsTransferred;
    netBoxOfficeFundsDepositedAccount;
    hstCollectedFromTicketSales;
    hstPaidOnTourPayments;
    hstPaidOnShowExpenses;
    hstPaidOnVenueExpenses;
    artistGrossTaxableCompensation;
    amountDueToDeptOfRevenue;
    checkNumberOrConfOfWithholdingPayment;
    promoterPartnerCompanyId;
    promoterPartnerContactId;
    tourManagerContactId;
    attractionContractSharePointLink;
    partiallyExecutedAttractionContractSharePointLink;
    fullyExecutedAttractionContractSharePointLink;
    eventBusinessManagerContactId;
    eventBusinessAssistantManagerContactId;
    venueSettlementContactId;
    venueSettlementFileSharePointLink;
    partnerSettlementFileSharePointLink;
    salesTaxRemittedBy;
    fexVenueAgreementLink;
    venueDepositRequired;
    withholdingPayee;
    withholdingPaymentMethod;
    withholdingFormToAttractionLink;
    withholdingFormToMunicipalityLink;
    withholdingQuickbooksNumber;
    withholdingWaiver;
    withholdingCompletedWaiverLink;
    tourWaiverLink;
    withholdingExceptions;
    compensationRoyaltyAmount;
    compensationOverageAmount;
    compensationBuyouts;
    compensationDirectCharges;
    compensationReimbursibles;
    financeJob;
    financeCustomer;
    artistDepositRequired;
    artistPartOfCollateralizedDeal;
    artistFexPerformanceAgreementLink;
    artistTourOfferLink;
    artistOverageAmount;
    artistBuyouts;
    finalGuaranteeAmount;
    finalRoyaltyAmount;
    finalOverageAmount;
    finalBuyoutAmount;
    finalDirectCompanyCharges;
    finalReimbursables;
}
exports.UpdateEngagementFinanceDto = UpdateEngagementFinanceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "estimatedBreakeven", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "sellableCapacity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "grossPotential", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "grossMarketingBudget", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "netMarketingBudget", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "salesRevenueGoal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "tourSplitPoint", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "announcementDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "promoterProfit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "venueDealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "thirdPartyPartnerDealStructure", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "venueDealTypeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "venueTerms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalBool(value)),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "confirmationPacketApproved", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "iaeWaiverApplicationConfirmationNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "iaeWaiverApplicationSubmissionDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "iaeApplicationWaiverStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "dateFundsReceived", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "fundsDue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "fundsWithheld", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "fundsOwed", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "receivableBankAccount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "requiredNonResidentWithholdingId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistFinanceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "settlementFinanceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistDealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistGuarantee", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistMiddleMoney", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistRoyaltyVariableFee", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistRoyaltyRatePercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistRoyaltyBasedOn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistBackEndTerms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistVersusPercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "overagePercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistPromoterProfitPercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistBackendPercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "finalAcceptedOfferLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "settlementFileSharePointLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistSettlementStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "venueSettlementStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "subscriptionSalesRevenueTotal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "seasonTicketSalesByIae", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "seasonTicketFundsTransferred", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "netBoxOfficeFundsDepositedAccount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "hstCollectedFromTicketSales", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "hstPaidOnTourPayments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "hstPaidOnShowExpenses", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "hstPaidOnVenueExpenses", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistGrossTaxableCompensation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "amountDueToDeptOfRevenue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "checkNumberOrConfOfWithholdingPayment", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "promoterPartnerCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "promoterPartnerContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "tourManagerContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "attractionContractSharePointLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "partiallyExecutedAttractionContractSharePointLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "fullyExecutedAttractionContractSharePointLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "eventBusinessManagerContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "eventBusinessAssistantManagerContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "venueSettlementContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "venueSettlementFileSharePointLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "partnerSettlementFileSharePointLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "salesTaxRemittedBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "fexVenueAgreementLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "venueDepositRequired", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingPayee", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingPaymentMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingFormToAttractionLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingFormToMunicipalityLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingQuickbooksNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingWaiver", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingCompletedWaiverLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "tourWaiverLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "withholdingExceptions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "compensationRoyaltyAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "compensationOverageAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "compensationBuyouts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "compensationDirectCharges", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "compensationReimbursibles", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "financeJob", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "financeCustomer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistDepositRequired", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistPartOfCollateralizedDeal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistFexPerformanceAgreementLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistTourOfferLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistOverageAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "artistBuyouts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "finalGuaranteeAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "finalRoyaltyAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "finalOverageAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "finalBuyoutAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "finalDirectCompanyCharges", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalNumber(value)),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Object)
], UpdateEngagementFinanceDto.prototype, "finalReimbursables", void 0);
//# sourceMappingURL=update-engagement-finance.dto.js.map