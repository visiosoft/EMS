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
exports.PerformancePromoPassword = void 0;
const typeorm_1 = require("typeorm");
let PerformancePromoPassword = class PerformancePromoPassword {
    promoPasswordId;
    performanceId;
    passwordType;
    password;
    activeDateStart;
    activeDateEnd;
    discountType;
    discountAmount;
};
exports.PerformancePromoPassword = PerformancePromoPassword;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'PromoPasswordID', type: 'int' }),
    __metadata("design:type", Number)
], PerformancePromoPassword.prototype, "promoPasswordId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PerformanceID', type: 'int' }),
    __metadata("design:type", Number)
], PerformancePromoPassword.prototype, "performanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PasswordType', type: 'nvarchar', length: 50 }),
    __metadata("design:type", String)
], PerformancePromoPassword.prototype, "passwordType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Password', type: 'nvarchar', length: 500 }),
    __metadata("design:type", String)
], PerformancePromoPassword.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ActiveDateStart', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PerformancePromoPassword.prototype, "activeDateStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ActiveDateEnd', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], PerformancePromoPassword.prototype, "activeDateEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DiscountType', type: 'nvarchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], PerformancePromoPassword.prototype, "discountType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'DiscountAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PerformancePromoPassword.prototype, "discountAmount", void 0);
exports.PerformancePromoPassword = PerformancePromoPassword = __decorate([
    (0, typeorm_1.Entity)({ name: 'PerformancePromoPassword', schema: 'dbo' })
], PerformancePromoPassword);
//# sourceMappingURL=performance-promo-password.entity.js.map