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
exports.ArtistFinance = void 0;
const typeorm_1 = require("typeorm");
let ArtistFinance = class ArtistFinance {
    artistFinanceId;
    artistDealType;
    artistMiddleMoney;
    artistGuarantee;
    artistRoyaltyVariableFee;
    artistBackEndTerms;
    overagePercent;
    royaltyRate;
    royaltyBasis;
    isCollateralizedDeal;
    buyoutAmount;
    tourOfferLinkId;
};
exports.ArtistFinance = ArtistFinance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ArtistFinanceID', type: 'int' }),
    __metadata("design:type", Number)
], ArtistFinance.prototype, "artistFinanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ArtistDealType',
        type: 'nvarchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "artistDealType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ArtistMiddleMoney',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "artistMiddleMoney", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ArtistGuarantee',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "artistGuarantee", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ArtistRoyaltyVariableFee',
        type: 'nvarchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "artistRoyaltyVariableFee", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ArtistBackEndTerms',
        type: 'nvarchar',
        length: 'max',
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "artistBackEndTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'OveragePercent',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "overagePercent", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'RoyaltyRate',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "royaltyRate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'RoyaltyBasis',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "royaltyBasis", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'IsCollateralizedDeal',
        type: 'bit',
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "isCollateralizedDeal", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'BuyoutAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "buyoutAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourOfferLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], ArtistFinance.prototype, "tourOfferLinkId", void 0);
exports.ArtistFinance = ArtistFinance = __decorate([
    (0, typeorm_1.Entity)({ name: 'ArtistFinance', schema: 'dbo' })
], ArtistFinance);
//# sourceMappingURL=artist-finance.entity.js.map