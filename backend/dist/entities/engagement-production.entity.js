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
exports.EngagementProduction = void 0;
const typeorm_1 = require("typeorm");
let EngagementProduction = class EngagementProduction {
    productionId;
    engagementId;
    rehearsalDate;
    loadInDate;
    announcementDate;
};
exports.EngagementProduction = EngagementProduction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ProductionID' }),
    __metadata("design:type", Number)
], EngagementProduction.prototype, "productionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementProduction.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RehearsalDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], EngagementProduction.prototype, "rehearsalDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LoadInDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], EngagementProduction.prototype, "loadInDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AnnouncementDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], EngagementProduction.prototype, "announcementDate", void 0);
exports.EngagementProduction = EngagementProduction = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementProduction', schema: 'dbo' })
], EngagementProduction);
//# sourceMappingURL=engagement-production.entity.js.map