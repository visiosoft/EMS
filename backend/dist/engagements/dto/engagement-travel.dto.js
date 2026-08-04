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
exports.UpdateEngagementTravelCarServiceDto = exports.CreateEngagementTravelCarServiceDto = exports.UpdateEngagementTravelHotelDto = exports.CreateEngagementTravelHotelDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const BOOKED_BY_VALUES = ['IAE', 'Venue', 'Talent Agency', 'Tour Management'];
function toOptionalInt(v) {
    if (v === null || v === '')
        return null;
    if (v === undefined)
        return undefined;
    if (typeof v === 'number' && Number.isInteger(v))
        return v;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : undefined;
}
class AddressDto {
    addressLine1;
    addressLine2;
    city;
    stateProvince;
    postalCode;
    country;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], AddressDto.prototype, "addressLine1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", Object)
], AddressDto.prototype, "addressLine2", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AddressDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AddressDto.prototype, "stateProvince", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], AddressDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AddressDto.prototype, "country", void 0);
class CreateEngagementTravelHotelDto {
    bookedBy;
    hotelCompanyId;
    numberOfRooms;
    roomTypes;
    checkInDate;
    checkOutDate;
    occupantContactId;
}
exports.CreateEngagementTravelHotelDto = CreateEngagementTravelHotelDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(BOOKED_BY_VALUES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementTravelHotelDto.prototype, "bookedBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateEngagementTravelHotelDto.prototype, "hotelCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateEngagementTravelHotelDto.prototype, "numberOfRooms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], CreateEngagementTravelHotelDto.prototype, "roomTypes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], CreateEngagementTravelHotelDto.prototype, "checkInDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], CreateEngagementTravelHotelDto.prototype, "checkOutDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateEngagementTravelHotelDto.prototype, "occupantContactId", void 0);
class UpdateEngagementTravelHotelDto extends CreateEngagementTravelHotelDto {
}
exports.UpdateEngagementTravelHotelDto = UpdateEngagementTravelHotelDto;
class CreateEngagementTravelCarServiceDto {
    bookedBy;
    originAddressId;
    originAddress;
    destinationAddressId;
    destinationAddress;
    pickupDateTime;
}
exports.CreateEngagementTravelCarServiceDto = CreateEngagementTravelCarServiceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(BOOKED_BY_VALUES),
    __metadata("design:type", Object)
], CreateEngagementTravelCarServiceDto.prototype, "bookedBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateEngagementTravelCarServiceDto.prototype, "originAddressId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AddressDto),
    __metadata("design:type", Object)
], CreateEngagementTravelCarServiceDto.prototype, "originAddress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateEngagementTravelCarServiceDto.prototype, "destinationAddressId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AddressDto),
    __metadata("design:type", Object)
], CreateEngagementTravelCarServiceDto.prototype, "destinationAddress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateEngagementTravelCarServiceDto.prototype, "pickupDateTime", void 0);
class UpdateEngagementTravelCarServiceDto extends CreateEngagementTravelCarServiceDto {
}
exports.UpdateEngagementTravelCarServiceDto = UpdateEngagementTravelCarServiceDto;
//# sourceMappingURL=engagement-travel.dto.js.map