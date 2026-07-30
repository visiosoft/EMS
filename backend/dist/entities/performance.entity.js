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
exports.Performance = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const engagement_entity_1 = require("./engagement.entity");
let Performance = class Performance extends audit_columns_1.AuditColumns {
    performanceId;
    engagementId;
    engagement;
    performanceStatus;
    performanceDate;
    performanceTime;
};
exports.Performance = Performance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'PerformanceID' }),
    __metadata("design:type", Number)
], Performance.prototype, "performanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementID', type: 'int' }),
    __metadata("design:type", Number)
], Performance.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => engagement_entity_1.Engagement),
    (0, typeorm_1.JoinColumn)({ name: 'EngagementID' }),
    __metadata("design:type", engagement_entity_1.Engagement)
], Performance.prototype, "engagement", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TicketingStatus', type: 'nvarchar', length: 50 }),
    __metadata("design:type", String)
], Performance.prototype, "performanceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PerformanceDate', type: 'date' }),
    __metadata("design:type", String)
], Performance.prototype, "performanceDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PerformanceTime', type: 'time' }),
    __metadata("design:type", String)
], Performance.prototype, "performanceTime", void 0);
exports.Performance = Performance = __decorate([
    (0, typeorm_1.Entity)({ name: 'Performance', schema: 'dbo' })
], Performance);
//# sourceMappingURL=performance.entity.js.map