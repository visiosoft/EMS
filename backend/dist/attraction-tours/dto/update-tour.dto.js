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
exports.UpdateTourDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
function parseMediaMix(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    let raw = value;
    if (typeof value === 'string') {
        try {
            raw = JSON.parse(value);
        }
        catch {
            return undefined;
        }
    }
    if (!Array.isArray(raw))
        return raw;
    const out = [];
    const seen = new Set();
    for (const item of raw) {
        if (!item || typeof item !== 'object')
            continue;
        const o = item;
        const ast = Number(o.advertisingSubTypeId);
        if (!Number.isInteger(ast) || ast < 1)
            continue;
        const cid = Number(o.companyId);
        const companyId = o.companyId == null ||
            o.companyId === '' ||
            !Number.isInteger(cid) ||
            cid < 1
            ? null
            : cid;
        const key = `${ast}:${companyId ?? 0}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push({ advertisingSubTypeId: ast, companyId });
    }
    return out;
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
class UpdateTourDto {
    tourName;
    attractionId;
    classId;
    ascap;
    bmi;
    sesac;
    gmr;
    talentAgencyCompanyId;
    tourManagementCompanyId;
    talentAgentContactIds;
    audienceGender;
    audienceAgeRangeIds;
    audienceAgeRange;
    jobName;
    tourInsuranceLanguage;
    venueTypePreferenceId;
    removeBanner;
    mediaMix;
    tourStartDate;
    tourEndDate;
}
exports.UpdateTourDto = UpdateTourDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateTourDto.prototype, "tourName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === '' || value === null || value === undefined
        ? undefined
        : Number(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateTourDto.prototype, "attractionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === '' || value === null || value === undefined
        ? undefined
        : Number(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateTourDto.prototype, "classId", void 0);
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
], UpdateTourDto.prototype, "ascap", void 0);
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
], UpdateTourDto.prototype, "bmi", void 0);
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
], UpdateTourDto.prototype, "sesac", void 0);
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
], UpdateTourDto.prototype, "gmr", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined)
            return undefined;
        if (value === '' || value === null)
            return null;
        return Number(value);
    }),
    (0, class_validator_1.ValidateIf)((_, v) => v != null),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "talentAgencyCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined)
            return undefined;
        if (value === '' || value === null)
            return null;
        return Number(value);
    }),
    (0, class_validator_1.ValidateIf)((_, v) => v != null),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "tourManagementCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parsePositiveIdArray(value)),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], UpdateTourDto.prototype, "talentAgentContactIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsIn)(['All', 'Male', 'Female']),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "audienceGender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parsePositiveIdArray(value)),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], UpdateTourDto.prototype, "audienceAgeRangeIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "audienceAgeRange", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "jobName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "tourInsuranceLanguage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined)
            return undefined;
        if (value === '' || value === null)
            return null;
        const n = Number(value);
        return Number.isFinite(n) && n >= 1 ? n : null;
    }),
    (0, class_validator_1.ValidateIf)((_, v) => v != null),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "venueTypePreferenceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTourDto.prototype, "removeBanner", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseMediaMix(value)),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpdateTourDto.prototype, "mediaMix", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "tourStartDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", Object)
], UpdateTourDto.prototype, "tourEndDate", void 0);
//# sourceMappingURL=update-tour.dto.js.map