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
exports.CreateProjectDto = exports.CreateProjectVenueDto = exports.ProjectOpeningPerformanceDto = exports.CreatePerformanceOptionDto = exports.OPTION_STATUS_VALUES = exports.VENUE_STATUS_VALUES = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const project_stage_constants_1 = require("../project-stage.constants");
exports.VENUE_STATUS_VALUES = [
    'Confirmed',
    'Pending',
    'Inactive',
];
exports.OPTION_STATUS_VALUES = [
    'Confirmed',
    'Pending',
    'Inactive',
];
class CreatePerformanceOptionDto {
    proposedDate;
    proposedTime;
    optionStatus;
}
exports.CreatePerformanceOptionDto = CreatePerformanceOptionDto;
__decorate([
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreatePerformanceOptionDto.prototype, "proposedDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}(:\d{2})?$/),
    __metadata("design:type", Object)
], CreatePerformanceOptionDto.prototype, "proposedTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreatePerformanceOptionDto.prototype, "optionStatus", void 0);
class ProjectOpeningPerformanceDto {
    performanceDate;
    performanceTime;
    performanceStatus;
}
exports.ProjectOpeningPerformanceDto = ProjectOpeningPerformanceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], ProjectOpeningPerformanceDto.prototype, "performanceDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2}:\d{2}(:\d{2})?$/),
    __metadata("design:type", String)
], ProjectOpeningPerformanceDto.prototype, "performanceTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], ProjectOpeningPerformanceDto.prototype, "performanceStatus", void 0);
class CreateProjectVenueDto {
    venueCompanyId;
    venueStatus;
    performanceOptions;
    configName;
    dealType;
    guarantee;
    splitPct;
    breakeven;
    marketingCoOp;
}
exports.CreateProjectVenueDto = CreateProjectVenueDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateProjectVenueDto.prototype, "venueCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateProjectVenueDto.prototype, "venueStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePerformanceOptionDto),
    __metadata("design:type", Array)
], CreateProjectVenueDto.prototype, "performanceOptions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectVenueDto.prototype, "configName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectVenueDto.prototype, "dealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectVenueDto.prototype, "guarantee", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectVenueDto.prototype, "splitPct", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectVenueDto.prototype, "breakeven", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectVenueDto.prototype, "marketingCoOp", void 0);
class CreateProjectDto {
    tourId;
    projectStage;
    offerReviewStatus;
    talentAgencyCompanyId;
    createdBy;
    tourStartDate;
    tourEndDate;
    venues;
    dmaIds;
    openingPerformances;
    name;
    bookerId;
    agentContactId;
    targetOnSale;
    notes;
}
exports.CreateProjectDto = CreateProjectDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateProjectDto.prototype, "tourId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)([...project_stage_constants_1.PROJECT_STAGE_VALUES]),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "projectStage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)([...project_stage_constants_1.OFFER_REVIEW_STATUS_VALUES]),
    __metadata("design:type", Object)
], CreateProjectDto.prototype, "offerReviewStatus", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateProjectDto.prototype, "talentAgencyCompanyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", Object)
], CreateProjectDto.prototype, "createdBy", void 0);
__decorate([
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "tourStartDate", void 0);
__decorate([
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "tourEndDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateProjectVenueDto),
    __metadata("design:type", Array)
], CreateProjectDto.prototype, "venues", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], CreateProjectDto.prototype, "dmaIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ProjectOpeningPerformanceDto),
    __metadata("design:type", Array)
], CreateProjectDto.prototype, "openingPerformances", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectDto.prototype, "bookerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectDto.prototype, "agentContactId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateProjectDto.prototype, "targetOnSale", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(8000),
    __metadata("design:type", Object)
], CreateProjectDto.prototype, "notes", void 0);
//# sourceMappingURL=create-project.dto.js.map