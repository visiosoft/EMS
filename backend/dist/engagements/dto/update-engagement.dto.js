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
exports.UpdateEngagementDto = void 0;
const class_validator_1 = require("class-validator");
const create_engagement_dto_1 = require("./create-engagement.dto");
class UpdateEngagementDto {
    engagementStatus;
    engagementScaling;
    tourId;
    primaryVenueCompanyId;
    sellableCapacity;
    grossPotential;
    tourManagerContactId;
    rehearsalDate;
    rehearsalTime;
    loadInDate;
    loadInTime;
}
exports.UpdateEngagementDto = UpdateEngagementDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    (0, class_validator_1.IsIn)(create_engagement_dto_1.ENGAGEMENT_STATUS_VALUES),
    __metadata("design:type", String)
], UpdateEngagementDto.prototype, "engagementStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "engagementScaling", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateEngagementDto.prototype, "tourId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateEngagementDto.prototype, "primaryVenueCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "sellableCapacity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, {
        message: 'grossPotential must be a valid number with up to 2 decimal places.',
    }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "grossPotential", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v != null),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "tourManagerContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "rehearsalDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}(:\d{2})?$/),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "rehearsalTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "loadInDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}(:\d{2})?$/),
    __metadata("design:type", Object)
], UpdateEngagementDto.prototype, "loadInTime", void 0);
//# sourceMappingURL=update-engagement.dto.js.map