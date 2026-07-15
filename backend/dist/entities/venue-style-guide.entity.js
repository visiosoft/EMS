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
exports.VenueStyleGuide = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
let VenueStyleGuide = class VenueStyleGuide extends audit_columns_1.AuditColumns {
    venueStyleGuideId;
    font;
    primaryColors;
    accentColors;
    notes;
    logoLinkId;
};
exports.VenueStyleGuide = VenueStyleGuide;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'VenueStyleGuideID' }),
    __metadata("design:type", Number)
], VenueStyleGuide.prototype, "venueStyleGuideId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Font', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VenueStyleGuide.prototype, "font", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PrimaryColors', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VenueStyleGuide.prototype, "primaryColors", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'AccentColors', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VenueStyleGuide.prototype, "accentColors", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Notes', type: 'nvarchar', length: 'max', nullable: true }),
    __metadata("design:type", Object)
], VenueStyleGuide.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LogoLinkID', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], VenueStyleGuide.prototype, "logoLinkId", void 0);
exports.VenueStyleGuide = VenueStyleGuide = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueStyleGuide', schema: 'dbo' })
], VenueStyleGuide);
//# sourceMappingURL=venue-style-guide.entity.js.map