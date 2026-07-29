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
exports.Tour = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const attraction_entity_1 = require("./attraction.entity");
const class_entity_1 = require("./class.entity");
const company_entity_1 = require("./company.entity");
const job_entity_1 = require("./job.entity");
const venue_type_entity_1 = require("./venue-type.entity");
let Tour = class Tour extends audit_columns_1.AuditColumns {
    tourId;
    tourName;
    audienceGender;
    audienceAgeRange;
    ascap;
    bmi;
    sesac;
    gmr;
    tourInsuranceLanguage;
    attractionId;
    attraction;
    talentAgencyCompanyId;
    talentAgencyCompany;
    tourManagementCompanyId;
    tourManagementCompany;
    jobId;
    job;
    classId;
    class;
    techRiderLinkId;
    bannerLinkId;
    venueTypePreferenceId;
    venueTypePreference;
    tourStartDate;
    tourEndDate;
};
exports.Tour = Tour;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'TourID' }),
    __metadata("design:type", Number)
], Tour.prototype, "tourId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourName', type: 'nvarchar', length: 200 }),
    __metadata("design:type", String)
], Tour.prototype, "tourName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'AudienceGender',
        type: 'nvarchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Tour.prototype, "audienceGender", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'AudienceAgeRange',
        type: 'nvarchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Tour.prototype, "audienceAgeRange", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ASCAP', type: 'bit' }),
    __metadata("design:type", Boolean)
], Tour.prototype, "ascap", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'BMI', type: 'bit' }),
    __metadata("design:type", Boolean)
], Tour.prototype, "bmi", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SESAC', type: 'bit' }),
    __metadata("design:type", Boolean)
], Tour.prototype, "sesac", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'GMR', type: 'bit' }),
    __metadata("design:type", Boolean)
], Tour.prototype, "gmr", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'TourInsuranceLanguage',
        type: 'nvarchar',
        length: 'max',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Tour.prototype, "tourInsuranceLanguage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AttractionID', type: 'int' }),
    __metadata("design:type", Number)
], Tour.prototype, "attractionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => attraction_entity_1.Attraction),
    (0, typeorm_1.JoinColumn)({ name: 'AttractionID' }),
    __metadata("design:type", attraction_entity_1.Attraction)
], Tour.prototype, "attraction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TalentAgencyCompanyID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "talentAgencyCompanyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'TalentAgencyCompanyID' }),
    __metadata("design:type", Object)
], Tour.prototype, "talentAgencyCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourManagementCompanyID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "tourManagementCompanyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'TourManagementCompanyID' }),
    __metadata("design:type", Object)
], Tour.prototype, "tourManagementCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'JobID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'JobID' }),
    __metadata("design:type", Object)
], Tour.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ClassID', type: 'int' }),
    __metadata("design:type", Number)
], Tour.prototype, "classId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => class_entity_1.Class),
    (0, typeorm_1.JoinColumn)({ name: 'ClassID' }),
    __metadata("design:type", class_entity_1.Class)
], Tour.prototype, "class", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TechRiderLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "techRiderLinkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'BannerLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "bannerLinkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueTypePreferenceID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "venueTypePreferenceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => venue_type_entity_1.VenueType, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'VenueTypePreferenceID' }),
    __metadata("design:type", Object)
], Tour.prototype, "venueTypePreference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourStartDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "tourStartDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourEndDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Tour.prototype, "tourEndDate", void 0);
exports.Tour = Tour = __decorate([
    (0, typeorm_1.Entity)({ name: 'Tour', schema: 'dbo' })
], Tour);
//# sourceMappingURL=tour.entity.js.map