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
exports.CreateEngagementDto = exports.ENGAGEMENT_STATUS_VALUES = void 0;
const class_validator_1 = require("class-validator");
const engagement_status_util_1 = require("../engagement-status.util");
Object.defineProperty(exports, "ENGAGEMENT_STATUS_VALUES", { enumerable: true, get: function () { return engagement_status_util_1.ENGAGEMENT_STATUS_VALUES; } });
class CreateEngagementDto {
    engagementStatus;
    openingShowDate;
    openingShowTime;
    tourId;
    primaryVenueCompanyId;
    secondaryVenueCompanyIds;
    bookerId;
    showDate;
    dealType;
    guarantee;
    splitPct;
    breakeven;
    projectedGross;
    projectedMargin;
    overviewNotes;
    workflows;
    cancellationReason;
}
exports.CreateEngagementDto = CreateEngagementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    (0, class_validator_1.IsIn)(engagement_status_util_1.ENGAGEMENT_STATUS_VALUES),
    __metadata("design:type", String)
], CreateEngagementDto.prototype, "engagementStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], CreateEngagementDto.prototype, "openingShowDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}(:\d{2})?$/),
    __metadata("design:type", String)
], CreateEngagementDto.prototype, "openingShowTime", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateEngagementDto.prototype, "tourId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateEngagementDto.prototype, "primaryVenueCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], CreateEngagementDto.prototype, "secondaryVenueCompanyIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "bookerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "showDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "dealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "guarantee", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "splitPct", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "breakeven", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "projectedGross", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "projectedMargin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "overviewNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "workflows", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateEngagementDto.prototype, "cancellationReason", void 0);
//# sourceMappingURL=create-engagement.dto.js.map