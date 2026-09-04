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
exports.EngagementBuyout = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
let EngagementBuyout = class EngagementBuyout extends audit_columns_1.AuditColumns {
    engagementBuyoutId;
    productionId;
    buyoutDescription;
    buyoutBudgetAmount;
};
exports.EngagementBuyout = EngagementBuyout;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'EngagementBuyoutID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementBuyout.prototype, "engagementBuyoutId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ProductionID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementBuyout.prototype, "productionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'BuyoutDescription', type: 'nvarchar', length: 500 }),
    __metadata("design:type", String)
], EngagementBuyout.prototype, "buyoutDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'BuyoutBudgetAmount', type: 'decimal', precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], EngagementBuyout.prototype, "buyoutBudgetAmount", void 0);
exports.EngagementBuyout = EngagementBuyout = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementBuyout', schema: 'dbo' })
], EngagementBuyout);
//# sourceMappingURL=engagement-buyout.entity.js.map