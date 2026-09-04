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
exports.EngagementRehearsal = void 0;
const typeorm_1 = require("typeorm");
let EngagementRehearsal = class EngagementRehearsal {
    rehearsalId;
    engagementId;
    rehearsalDate;
    rehearsalTime;
};
exports.EngagementRehearsal = EngagementRehearsal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'RehearsalID' }),
    __metadata("design:type", Number)
], EngagementRehearsal.prototype, "rehearsalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementRehearsal.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RehearsalDate', type: 'date' }),
    __metadata("design:type", String)
], EngagementRehearsal.prototype, "rehearsalDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RehearsalTime', type: 'time', nullable: true }),
    __metadata("design:type", Object)
], EngagementRehearsal.prototype, "rehearsalTime", void 0);
exports.EngagementRehearsal = EngagementRehearsal = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementRehearsal', schema: 'dbo' })
], EngagementRehearsal);
//# sourceMappingURL=engagement-rehearsal.entity.js.map