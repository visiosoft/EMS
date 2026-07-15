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
exports.EngagementProject = void 0;
const typeorm_1 = require("typeorm");
const tour_entity_1 = require("./tour.entity");
let EngagementProject = class EngagementProject {
    engagementProjectId;
    tourId;
    tour;
    projectStage;
    offerReviewStatus;
    confirmedOfferLinkId;
    createdDate;
    createdBy;
};
exports.EngagementProject = EngagementProject;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'EngagementProjectID' }),
    __metadata("design:type", Number)
], EngagementProject.prototype, "engagementProjectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementProject.prototype, "tourId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tour_entity_1.Tour),
    (0, typeorm_1.JoinColumn)({ name: 'TourID' }),
    __metadata("design:type", tour_entity_1.Tour)
], EngagementProject.prototype, "tour", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'OfferCreationStatus', type: 'nvarchar', length: 50 }),
    __metadata("design:type", String)
], EngagementProject.prototype, "projectStage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'OfferReviewStatus',
        type: 'nvarchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementProject.prototype, "offerReviewStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'ConfirmedOfferLinkID',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], EngagementProject.prototype, "confirmedOfferLinkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CreatedDate', type: 'datetime2' }),
    __metadata("design:type", Date)
], EngagementProject.prototype, "createdDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CreatedBy', type: 'nvarchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], EngagementProject.prototype, "createdBy", void 0);
exports.EngagementProject = EngagementProject = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementProject', schema: 'dbo' })
], EngagementProject);
//# sourceMappingURL=engagement-project.entity.js.map