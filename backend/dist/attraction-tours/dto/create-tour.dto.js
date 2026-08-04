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
exports.CreateTourDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
function parseOptionalPositiveId(value) {
    if (value === undefined || value === '' || value === null)
        return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
}
function parsePositiveIdArray(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    const raw = typeof value === 'string'
        ? (() => {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : value.split(',');
            }
            catch {
                return value.split(',');
            }
        })()
        : value;
    if (!Array.isArray(raw))
        return raw;
    return [
        ...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
    ];
}
class CreateTourDto {
    tourName;
    attractionId;
    classId;
    ascap;
    bmi;
    sesac;
    gmr;
    talentAgencyCompanyId;
    talentAgentContactIds;
    tourStartDate;
    tourEndDate;
    audienceGender;
    audienceAgeRangeIds;
    jobName;
    tourInsuranceLanguage;
    venueTypePreferenceId;
    techRiderLinkId;
}
exports.CreateTourDto = CreateTourDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateTourDto.prototype, "tourName", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTourDto.prototype, "attractionId", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTourDto.prototype, "classId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined || value === '')
            return undefined;
        if (value === true || value === 'true' || value === '1')
            return true;
        if (value === false || value === 'false' || value === '0')
            return false;
        return value;
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTourDto.prototype, "ascap", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined || value === '')
            return undefined;
        if (value === true || value === 'true' || value === '1')
            return true;
        if (value === false || value === 'false' || value === '0')
            return false;
        return value;
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTourDto.prototype, "bmi", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined || value === '')
            return undefined;
        if (value === true || value === 'true' || value === '1')
            return true;
        if (value === false || value === 'false' || value === '0')
            return false;
        return value;
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTourDto.prototype, "sesac", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined || value === '')
            return undefined;
        if (value === true || value === 'true' || value === '1')
            return true;
        if (value === false || value === 'false' || value === '0')
            return false;
        return value;
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTourDto.prototype, "gmr", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => parseOptionalPositiveId(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTourDto.prototype, "talentAgencyCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parsePositiveIdArray(value)),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], CreateTourDto.prototype, "talentAgentContactIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreateTourDto.prototype, "tourStartDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreateTourDto.prototype, "tourEndDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['All', 'Male', 'Female']),
    __metadata("design:type", Object)
], CreateTourDto.prototype, "audienceGender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parsePositiveIdArray(value)),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], CreateTourDto.prototype, "audienceAgeRangeIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], CreateTourDto.prototype, "jobName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", Object)
], CreateTourDto.prototype, "tourInsuranceLanguage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseOptionalPositiveId(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateTourDto.prototype, "venueTypePreferenceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseOptionalPositiveId(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateTourDto.prototype, "techRiderLinkId", void 0);
//# sourceMappingURL=create-tour.dto.js.map