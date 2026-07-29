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
exports.SettlementFinance = void 0;
const typeorm_1 = require("typeorm");
let SettlementFinance = class SettlementFinance {
    settlementFinanceId;
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
    finalGuaranteeAmount;
    finalRoyaltyAmount;
    finalOverageAmount;
    finalBuyoutAmount;
    directCompanyCharges;
    reimbursables;
};
exports.SettlementFinance = SettlementFinance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'SettlementFinanceID', type: 'int' }),
    __metadata("design:type", Number)
], SettlementFinance.prototype, "settlementFinanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ArtistSettlementStatus',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "artistSettlementStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'VenueSettlementStatus',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "venueSettlementStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'SubscriptionSalesRevenueTotal',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "subscriptionSalesRevenueTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'SeasonTicketSalesByIAE',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "seasonTicketSalesByIae", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'SeasonTicketFundsTransferred',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "seasonTicketFundsTransferred", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'NetBoxOfficeFundsDepositedAccount',
        type: 'nvarchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "netBoxOfficeFundsDepositedAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'HSTCollectedFromTicketSales',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "hstCollectedFromTicketSales", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'HSTPaidOnTourPayments',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "hstPaidOnTourPayments", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'HSTPaidOnShowExpenses',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "hstPaidOnShowExpenses", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'HSTPaidOnVenueExpenses',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "hstPaidOnVenueExpenses", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ArtistGrossTaxableCompensation',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "artistGrossTaxableCompensation", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'AmountDueToDeptOfRevenue',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "amountDueToDeptOfRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'CheckNumberOrConfOfWithholdingPayment',
        type: 'nvarchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "checkNumberOrConfOfWithholdingPayment", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'FinalGuaranteeAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "finalGuaranteeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'FinalRoyaltyAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "finalRoyaltyAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'FinalOverageAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "finalOverageAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'FinalBuyoutAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "finalBuyoutAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'DirectCompanyCharges',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "directCompanyCharges", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'Reimbursables',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], SettlementFinance.prototype, "reimbursables", void 0);
exports.SettlementFinance = SettlementFinance = __decorate([
    (0, typeorm_1.Entity)({ name: 'SettlementFinance', schema: 'dbo' })
], SettlementFinance);
//# sourceMappingURL=settlement-finance.entity.js.map