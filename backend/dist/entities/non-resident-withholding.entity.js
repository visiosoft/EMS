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
exports.NonResidentWithholding = void 0;
const typeorm_1 = require("typeorm");
let NonResidentWithholding = class NonResidentWithholding {
    withholdingId;
    withholdingTaxRate;
    dmaid;
    taxAgencyId;
    withholdingLinkId;
    artistWaiverInstructionsId;
    iaeWaiverInstructionsId;
    withholdingArea;
    withholdingAgencyName;
    withholdingPayee;
    paymentMethod;
    formToAttractionUrl;
    formToMunicipalityUrl;
    quickBooksNumber;
    canApplyForWaiver;
    iaeWaiverInstructionsText;
    completedWaiverUrl;
    iaeWaiverSubmissionDate;
    iaeWaiverAppNumber;
    iaeWaiverUrl;
    tourWaiverUrl;
    exceptionsNotes;
};
exports.NonResidentWithholding = NonResidentWithholding;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'WithholdingID', type: 'int' }),
    __metadata("design:type", Number)
], NonResidentWithholding.prototype, "withholdingId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'WithholdingTaxRate',
        type: 'decimal',
        precision: 18,
        scale: 6,
    }),
    __metadata("design:type", String)
], NonResidentWithholding.prototype, "withholdingTaxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TaxAgencyID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "taxAgencyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'WithholdingLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "withholdingLinkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ArtistWaiverInstructionsID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "artistWaiverInstructionsId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IAEWaiverInstructionsID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "iaeWaiverInstructionsId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'WithholdingArea', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "withholdingArea", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'WithholdingAgencyName', type: 'nvarchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "withholdingAgencyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'WithholdingPayee', type: 'nvarchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "withholdingPayee", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PaymentMethod', type: 'nvarchar', length: 300, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FormToAttractionURL', type: 'nvarchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "formToAttractionUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FormToMunicipalityURL', type: 'nvarchar', length: 1000, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "formToMunicipalityUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'QuickBooksNumber', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "quickBooksNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CanApplyForWaiver', type: 'bit', nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "canApplyForWaiver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IAEWaiverInstructions', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "iaeWaiverInstructionsText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CompletedWaiverURL', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "completedWaiverUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IAEWaiverSubmissionDate', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "iaeWaiverSubmissionDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IAEWaiverAppNumber', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "iaeWaiverAppNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IAEWaiverURL', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "iaeWaiverUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourWaiverURL', type: 'nvarchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "tourWaiverUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ExceptionsNotes', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], NonResidentWithholding.prototype, "exceptionsNotes", void 0);
exports.NonResidentWithholding = NonResidentWithholding = __decorate([
    (0, typeorm_1.Entity)({ name: 'NonResidentWithholding', schema: 'dbo' })
], NonResidentWithholding);
//# sourceMappingURL=non-resident-withholding.entity.js.map