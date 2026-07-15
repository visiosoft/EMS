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
exports.CreateEngagementIaeContactDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
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
function toOptionalBool(v) {
    if (v === null)
        return null;
    if (v === undefined)
        return undefined;
    if (typeof v === 'boolean')
        return v;
    if (v === 'true' || v === 1 || v === '1')
        return true;
    if (v === 'false' || v === 0 || v === '0')
        return false;
    return undefined;
}
class CreateEngagementIaeContactDto {
    contactId;
    roleId;
    departmentId;
    isPrimary;
    notes;
}
exports.CreateEngagementIaeContactDto = CreateEngagementIaeContactDto;
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateEngagementIaeContactDto.prototype, "contactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateEngagementIaeContactDto.prototype, "roleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalInt(value)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateEngagementIaeContactDto.prototype, "departmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => toOptionalBool(value)),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Object)
], CreateEngagementIaeContactDto.prototype, "isPrimary", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], CreateEngagementIaeContactDto.prototype, "notes", void 0);
//# sourceMappingURL=create-engagement-iae-contact.dto.js.map