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
exports.Attraction = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
let Attraction = class Attraction extends audit_columns_1.AuditColumns {
    attractionId;
    attractionName;
    attractionManagementLinkId;
};
exports.Attraction = Attraction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'AttractionID' }),
    __metadata("design:type", Number)
], Attraction.prototype, "attractionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AttractionName', type: 'nvarchar', length: 200 }),
    __metadata("design:type", String)
], Attraction.prototype, "attractionName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AttractionManagementLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Attraction.prototype, "attractionManagementLinkId", void 0);
exports.Attraction = Attraction = __decorate([
    (0, typeorm_1.Entity)({ name: 'Attraction', schema: 'dbo' })
], Attraction);
//# sourceMappingURL=attraction.entity.js.map