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
exports.EngagementTravelHotel = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
let EngagementTravelHotel = class EngagementTravelHotel extends audit_columns_1.AuditColumns {
    hotelTravelId;
    engagementTravelId;
    hotelCompanyId;
    numberOfRooms;
    roomTypes;
    checkInDate;
    checkOutDate;
    occupantContactId;
};
exports.EngagementTravelHotel = EngagementTravelHotel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'HotelTravelID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementTravelHotel.prototype, "hotelTravelId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementTravelID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementTravelHotel.prototype, "engagementTravelId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'HotelCompanyID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelHotel.prototype, "hotelCompanyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'NumberOfRooms', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelHotel.prototype, "numberOfRooms", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RoomTypes', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelHotel.prototype, "roomTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CheckInDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelHotel.prototype, "checkInDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CheckOutDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelHotel.prototype, "checkOutDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OccupantContactID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementTravelHotel.prototype, "occupantContactId", void 0);
exports.EngagementTravelHotel = EngagementTravelHotel = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementTravelHotel', schema: 'dbo' })
], EngagementTravelHotel);
//# sourceMappingURL=engagement-travel-hotel.entity.js.map