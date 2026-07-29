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
exports.AgeRange = void 0;
const typeorm_1 = require("typeorm");
let AgeRange = class AgeRange {
    ageRangeId;
    ageRangeLabel;
    sortOrder;
};
exports.AgeRange = AgeRange;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'AgeRangeID' }),
    __metadata("design:type", Number)
], AgeRange.prototype, "ageRangeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AgeRangeLabel', type: 'nvarchar', length: 20 }),
    __metadata("design:type", String)
], AgeRange.prototype, "ageRangeLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SortOrder', type: 'int' }),
    __metadata("design:type", Number)
], AgeRange.prototype, "sortOrder", void 0);
exports.AgeRange = AgeRange = __decorate([
    (0, typeorm_1.Entity)({ name: 'AgeRange', schema: 'dbo' })
], AgeRange);
//# sourceMappingURL=age-range.entity.js.map