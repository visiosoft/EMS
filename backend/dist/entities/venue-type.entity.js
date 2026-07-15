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
exports.VenueType = void 0;
const typeorm_1 = require("typeorm");
let VenueType = class VenueType {
    venueTypeId;
    venueTypeName;
};
exports.VenueType = VenueType;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'VenueTypeID' }),
    __metadata("design:type", Number)
], VenueType.prototype, "venueTypeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'VenueTypeName', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], VenueType.prototype, "venueTypeName", void 0);
exports.VenueType = VenueType = __decorate([
    (0, typeorm_1.Entity)({ name: 'VenueType', schema: 'dbo' })
], VenueType);
//# sourceMappingURL=venue-type.entity.js.map