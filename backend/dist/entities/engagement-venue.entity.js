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
exports.EngagementVenue = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
let EngagementVenue = class EngagementVenue extends audit_columns_1.AuditColumns {
    engagementId;
    venueCompanyId;
    isPrimary;
    venueBookingManagerContactId;
};
exports.EngagementVenue = EngagementVenue;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'EngagementID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementVenue.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'VenueCompanyID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementVenue.prototype, "venueCompanyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsPrimary', type: 'bit' }),
    __metadata("design:type", Boolean)
], EngagementVenue.prototype, "isPrimary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueBookingManagerContactID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], EngagementVenue.prototype, "venueBookingManagerContactId", void 0);
exports.EngagementVenue = EngagementVenue = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementVenue', schema: 'dbo' })
], EngagementVenue);
//# sourceMappingURL=engagement-venue.entity.js.map