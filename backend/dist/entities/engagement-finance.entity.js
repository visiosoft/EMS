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
exports.EngagementFinances = void 0;
const typeorm_1 = require("typeorm");
const engagement_entity_1 = require("./engagement.entity");
let EngagementFinances = class EngagementFinances {
    financeId;
    engagementId;
    engagement;
    estimatedBreakeven;
    promoterProfit;
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
    isCanadaEngagement;
    salesTaxRemittedBy;
    venueSettlementFileSharePointLink;
    partnerSettlementFileSharePointLink;
};
exports.EngagementFinances = EngagementFinances;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'FinanceID' }),
    __metadata("design:type", Number)
], EngagementFinances.prototype, "financeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementID', type: 'int', unique: true }),
    __metadata("design:type", Number)
], EngagementFinances.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => engagement_entity_1.Engagement),
    (0, typeorm_1.JoinColumn)({ name: 'EngagementID' }),
    __metadata("design:type", engagement_entity_1.Engagement)
], EngagementFinances.prototype, "engagement", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'EstimatedBreakeven',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "estimatedBreakeven", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'PromoterProfit',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "promoterProfit", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'VenueTerms',
        type: 'nvarchar',
        length: 'max',
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "venueTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ConfirmationPacketApproved', type: 'bit', nullable: true }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "confirmationPacketApproved", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'IAEWaiverApplicationConfirmationNumber',
        type: 'nvarchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "iaeWaiverApplicationConfirmationNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'IAEWaiverApplicationSubmissionDate',
        type: 'date',
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "iaeWaiverApplicationSubmissionDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'IAEApplicationWaiverStatus',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "iaeApplicationWaiverStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DateFundsReceived', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "dateFundsReceived", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'FundsDue',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "fundsDue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'FundsWithheld',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "fundsWithheld", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'FundsOwed',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "fundsOwed", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ReceivableBankAccount',
        type: 'nvarchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "receivableBankAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'RequiredNonResidentWithholdingID',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "requiredNonResidentWithholdingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ArtistFinanceID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "artistFinanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SettlementFinanceID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "settlementFinanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsCanadaEngagement', type: 'bit', nullable: true }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "isCanadaEngagement", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'SalesTaxRemittedBy',
        type: 'nvarchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "salesTaxRemittedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'VenueSettlementFileSharePointLink',
        type: 'nvarchar',
        length: 2048,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "venueSettlementFileSharePointLink", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'PartnerSettlementFileSharePointLink',
        type: 'nvarchar',
        length: 2048,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementFinances.prototype, "partnerSettlementFileSharePointLink", void 0);
exports.EngagementFinances = EngagementFinances = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementFinances', schema: 'dbo' })
], EngagementFinances);
//# sourceMappingURL=engagement-finance.entity.js.map