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
exports.AddressPayloadDto = exports.AddressFieldsDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const country_name_regex_1 = require("../constants/country-name.regex");
class AddressFieldsDto {
    addressLine1;
    addressLine2;
    city;
    stateProvince;
    postalCode;
    country;
}
exports.AddressFieldsDto = AddressFieldsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], AddressFieldsDto.prototype, "addressLine1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", Object)
], AddressFieldsDto.prototype, "addressLine2", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(country_name_regex_1.COUNTRY_NAME_REGEX, { message: country_name_regex_1.CITY_FIELD_VALIDATION_MESSAGE }),
    __metadata("design:type", String)
], AddressFieldsDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(country_name_regex_1.COUNTRY_NAME_REGEX, {
        message: country_name_regex_1.STATE_PROVINCE_FIELD_VALIDATION_MESSAGE,
    }),
    __metadata("design:type", String)
], AddressFieldsDto.prototype, "stateProvince", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], AddressFieldsDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(country_name_regex_1.COUNTRY_NAME_REGEX, { message: country_name_regex_1.COUNTRY_NAME_VALIDATION_MESSAGE }),
    __metadata("design:type", String)
], AddressFieldsDto.prototype, "country", void 0);
class AddressPayloadDto {
    physical;
    mailingSameAsPhysical;
    mailing;
}
exports.AddressPayloadDto = AddressPayloadDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AddressFieldsDto),
    __metadata("design:type", AddressFieldsDto)
], AddressPayloadDto.prototype, "physical", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AddressPayloadDto.prototype, "mailingSameAsPhysical", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AddressFieldsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", AddressFieldsDto)
], AddressPayloadDto.prototype, "mailing", void 0);
//# sourceMappingURL=address-fields.dto.js.map