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
exports.UpdateVenueDetailsDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const update_venue_profile_dto_1 = require("./update-venue-profile.dto");
class ContactDraftDto {
    fullName;
    email;
    phone;
    cellPhone;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactDraftDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactDraftDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactDraftDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContactDraftDto.prototype, "cellPhone", void 0);
class LinkDraftDto {
    linkId;
    linkType;
    linkUrl;
    linkName;
    linkPath;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], LinkDraftDto.prototype, "linkId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LinkDraftDto.prototype, "linkType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LinkDraftDto.prototype, "linkUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LinkDraftDto.prototype, "linkName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LinkDraftDto.prototype, "linkPath", void 0);
class NonResidentWithholdingDraftDto {
    withholdingTaxRate;
    dmaid;
    taxAgencyId;
    withholdingLink;
    artistWaiverInstructions;
    iaeWaiverInstructions;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], NonResidentWithholdingDraftDto.prototype, "withholdingTaxRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], NonResidentWithholdingDraftDto.prototype, "dmaid", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], NonResidentWithholdingDraftDto.prototype, "taxAgencyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LinkDraftDto),
    __metadata("design:type", Object)
], NonResidentWithholdingDraftDto.prototype, "withholdingLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LinkDraftDto),
    __metadata("design:type", Object)
], NonResidentWithholdingDraftDto.prototype, "artistWaiverInstructions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LinkDraftDto),
    __metadata("design:type", Object)
], NonResidentWithholdingDraftDto.prototype, "iaeWaiverInstructions", void 0);
class UpdateVenueDetailsDto {
    venueProfile;
    brandIds;
    taxIds;
    stagehandProviderCompanyId;
    nonResidentWithholdingId;
    hasStateTaxOnTickets;
    hasCityTaxOnTickets;
    financeDirectors;
    settlementManagers;
    marketingDirectors;
    technicalDirectors;
    ticketingManagers;
    stagehandProviderContacts;
    financeDirector;
    settlementManager;
    marketingDirector;
    technicalDirector;
    ticketingManager;
    bookingDirectors;
    rentalManagers;
    calendarManagers;
    contractManagers;
    bookingDirector;
    rentalManager;
    calendarManager;
    contractManager;
    stagehandProviderContact;
    nonResidentWithholding;
}
exports.UpdateVenueDetailsDto = UpdateVenueDetailsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => update_venue_profile_dto_1.UpdateVenueProfileDto),
    __metadata("design:type", update_venue_profile_dto_1.UpdateVenueProfileDto)
], UpdateVenueDetailsDto.prototype, "venueProfile", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "brandIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "taxIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateVenueDetailsDto.prototype, "stagehandProviderCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateVenueDetailsDto.prototype, "nonResidentWithholdingId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], UpdateVenueDetailsDto.prototype, "hasStateTaxOnTickets", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], UpdateVenueDetailsDto.prototype, "hasCityTaxOnTickets", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "financeDirectors", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "settlementManagers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "marketingDirectors", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "technicalDirectors", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "ticketingManagers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "stagehandProviderContacts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "financeDirector", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "settlementManager", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "marketingDirector", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "technicalDirector", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "ticketingManager", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "bookingDirectors", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "rentalManagers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "calendarManagers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", Array)
], UpdateVenueDetailsDto.prototype, "contractManagers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "bookingDirector", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "rentalManager", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "calendarManager", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "contractManager", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContactDraftDto),
    __metadata("design:type", ContactDraftDto)
], UpdateVenueDetailsDto.prototype, "stagehandProviderContact", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => NonResidentWithholdingDraftDto),
    __metadata("design:type", NonResidentWithholdingDraftDto)
], UpdateVenueDetailsDto.prototype, "nonResidentWithholding", void 0);
//# sourceMappingURL=update-venue-details.dto.js.map