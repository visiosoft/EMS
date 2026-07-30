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
exports.PerformanceTicketing = void 0;
const typeorm_1 = require("typeorm");
let PerformanceTicketing = class PerformanceTicketing {
    ticketingId;
    performanceId;
    ticketingStatus;
    onSaleDate;
    preSaleDate;
    vipPackagedOffer;
    preSaleSpecialPrices;
    kidsTicketsPrices;
    ticketingLinkId;
    grossTicketSales;
    totalComps;
    totalTickets;
    totalAdmissions;
};
exports.PerformanceTicketing = PerformanceTicketing;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'TicketingID', type: 'int' }),
    __metadata("design:type", Number)
], PerformanceTicketing.prototype, "ticketingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PerformanceID', type: 'int' }),
    __metadata("design:type", Number)
], PerformanceTicketing.prototype, "performanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'TicketingStatus',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "ticketingStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OnSaleDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "onSaleDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PreSaleDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "preSaleDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'VIPPackagedOffer',
        type: 'nvarchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "vipPackagedOffer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'PreSaleSpecialPrices',
        type: 'nvarchar',
        length: 'max',
        nullable: true,
    }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "preSaleSpecialPrices", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'KidsTicketsPrices',
        type: 'nvarchar',
        length: 'max',
        nullable: true,
    }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "kidsTicketsPrices", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TicketingLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "ticketingLinkId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'GrossTicketSales',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "grossTicketSales", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TotalComps', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "totalComps", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TotalTickets', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "totalTickets", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TotalAdmissions', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PerformanceTicketing.prototype, "totalAdmissions", void 0);
exports.PerformanceTicketing = PerformanceTicketing = __decorate([
    (0, typeorm_1.Entity)({ name: 'PerformanceTicketing', schema: 'dbo' })
], PerformanceTicketing);
//# sourceMappingURL=performance-ticketing.entity.js.map