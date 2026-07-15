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
exports.Engagement = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const tour_entity_1 = require("./tour.entity");
let Engagement = class Engagement extends audit_columns_1.AuditColumns {
    engagementId;
    engagementStatus;
    engagementScaling;
    tourId;
    sellableCapacity;
    grossPotential;
    tourManagerContactId;
    tour;
};
exports.Engagement = Engagement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'EngagementID' }),
    __metadata("design:type", Number)
], Engagement.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementStatus', type: 'nvarchar', length: 50 }),
    __metadata("design:type", String)
], Engagement.prototype, "engagementStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'EngagementScaling',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Engagement.prototype, "engagementScaling", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourID', type: 'int' }),
    __metadata("design:type", Number)
], Engagement.prototype, "tourId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SellableCapacity', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Engagement.prototype, "sellableCapacity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'GrossPotential',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Engagement.prototype, "grossPotential", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourManagerContactID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Engagement.prototype, "tourManagerContactId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tour_entity_1.Tour),
    (0, typeorm_1.JoinColumn)({ name: 'TourID' }),
    __metadata("design:type", tour_entity_1.Tour)
], Engagement.prototype, "tour", void 0);
exports.Engagement = Engagement = __decorate([
    (0, typeorm_1.Entity)({ name: 'Engagement', schema: 'dbo' })
], Engagement);
//# sourceMappingURL=engagement.entity.js.map