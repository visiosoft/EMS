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
exports.PerformanceContract = void 0;
const typeorm_1 = require("typeorm");
let PerformanceContract = class PerformanceContract {
    contractId;
    createdAt;
    engagementId;
    agency;
    agent;
    attraction;
    venueName;
    venueAddress;
    venueCity;
    venueState;
    venueCountry;
    producer;
    producerAddress;
    producerFedId;
    guaranteeAmount;
    guaranteeCurrency;
    depositAmount;
    depositDueDate;
    balanceAmount;
    balanceDueDate;
    royaltyDescription;
    overageDescription;
    paymentTerms;
    paymentMethodType;
    paymentPayableTo;
    paymentBankName;
    performances;
    additionallyInsured;
    annotatedPdfBlobName;
    originalFilename;
    oneDrivePdfUrl;
};
exports.PerformanceContract = PerformanceContract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ContractID' }),
    __metadata("design:type", Number)
], PerformanceContract.prototype, "contractId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CreatedAt', type: 'datetime2', default: () => 'GETDATE()' }),
    __metadata("design:type", Date)
], PerformanceContract.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Agency', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "agency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Agent', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "agent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Attraction', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "attraction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueName', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "venueName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueAddress', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "venueAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueCity', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "venueCity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueState', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "venueState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueCountry', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "venueCountry", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Producer', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "producer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ProducerAddress', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "producerAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ProducerFedID', type: 'nvarchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "producerFedId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'GuaranteeAmount', type: 'decimal', precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "guaranteeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'GuaranteeCurrency', type: 'nvarchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "guaranteeCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DepositAmount', type: 'decimal', precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "depositAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DepositDueDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "depositDueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'BalanceAmount', type: 'decimal', precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "balanceAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'BalanceDueDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "balanceDueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RoyaltyDescription', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "royaltyDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OverageDescription', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "overageDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PaymentTerms', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "paymentTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PaymentMethodType', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "paymentMethodType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PaymentPayableTo', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "paymentPayableTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PaymentBankName', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "paymentBankName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Performances', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "performances", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AdditionallyInsured', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "additionallyInsured", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AnnotatedPdfBlobName', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "annotatedPdfBlobName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OriginalFilename', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "originalFilename", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OneDrivePdfUrl', type: 'nvarchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], PerformanceContract.prototype, "oneDrivePdfUrl", void 0);
exports.PerformanceContract = PerformanceContract = __decorate([
    (0, typeorm_1.Entity)({ name: 'PerformanceContracts', schema: 'dbo' })
], PerformanceContract);
//# sourceMappingURL=performance-contract.entity.js.map