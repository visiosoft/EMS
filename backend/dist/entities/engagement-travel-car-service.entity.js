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
exports.EngagementTravelCarService = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
let EngagementTravelCarService = class EngagementTravelCarService extends audit_columns_1.AuditColumns {
    carServiceTravelId;
    engagementTravelId;
    originAddressId;
    destinationAddressId;
    pickupDateTime;
};
exports.EngagementTravelCarService = EngagementTravelCarService;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'CarServiceTravelID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementTravelCarService.prototype, "carServiceTravelId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementTravelID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementTravelCarService.prototype, "engagementTravelId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OriginAddressID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelCarService.prototype, "originAddressId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DestinationAddressID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelCarService.prototype, "destinationAddressId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PickupDateTime', type: 'datetime2', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelCarService.prototype, "pickupDateTime", void 0);
exports.EngagementTravelCarService = EngagementTravelCarService = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementTravelCarService', schema: 'dbo' })
], EngagementTravelCarService);
//# sourceMappingURL=engagement-travel-car-service.entity.js.map