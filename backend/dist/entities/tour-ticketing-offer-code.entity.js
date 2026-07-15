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
exports.TourTicketingOfferCode = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const tour_entity_1 = require("./tour.entity");
let TourTicketingOfferCode = class TourTicketingOfferCode extends audit_columns_1.AuditColumns {
    offerCodeId;
    tourId;
    tour;
    code;
    assignedTo;
    iaeSms;
    purpose;
};
exports.TourTicketingOfferCode = TourTicketingOfferCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'OfferCodeID' }),
    __metadata("design:type", Number)
], TourTicketingOfferCode.prototype, "offerCodeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourID', type: 'int' }),
    __metadata("design:type", Number)
], TourTicketingOfferCode.prototype, "tourId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tour_entity_1.Tour),
    (0, typeorm_1.JoinColumn)({ name: 'TourID' }),
    __metadata("design:type", tour_entity_1.Tour)
], TourTicketingOfferCode.prototype, "tour", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Code', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], TourTicketingOfferCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AssignedTo', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], TourTicketingOfferCode.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IAESMS', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], TourTicketingOfferCode.prototype, "iaeSms", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Purpose', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], TourTicketingOfferCode.prototype, "purpose", void 0);
exports.TourTicketingOfferCode = TourTicketingOfferCode = __decorate([
    (0, typeorm_1.Entity)({ name: 'TourTicketingOfferCode', schema: 'dbo' })
], TourTicketingOfferCode);
//# sourceMappingURL=tour-ticketing-offer-code.entity.js.map