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
exports.EngagementProductionEquipmentRental = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
let EngagementProductionEquipmentRental = class EngagementProductionEquipmentRental extends audit_columns_1.AuditColumns {
    engagementProductionEquipmentRentalId;
    productionId;
    equipmentRentalTypeId;
    budgetAmount;
    notes;
    otherDescription;
};
exports.EngagementProductionEquipmentRental = EngagementProductionEquipmentRental;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'EngagementProductionEquipmentRentalID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementProductionEquipmentRental.prototype, "engagementProductionEquipmentRentalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ProductionID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementProductionEquipmentRental.prototype, "productionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EquipmentRentalTypeID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementProductionEquipmentRental.prototype, "equipmentRentalTypeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'BudgetAmount', type: 'decimal', precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], EngagementProductionEquipmentRental.prototype, "budgetAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], EngagementProductionEquipmentRental.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OtherDescription', type: 'nvarchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], EngagementProductionEquipmentRental.prototype, "otherDescription", void 0);
exports.EngagementProductionEquipmentRental = EngagementProductionEquipmentRental = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementProductionEquipmentRental', schema: 'dbo' })
], EngagementProductionEquipmentRental);
//# sourceMappingURL=engagement-production-equipment-rental.entity.js.map