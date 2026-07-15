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
exports.ContactInfo = void 0;
const typeorm_1 = require("typeorm");
let ContactInfo = class ContactInfo {
    contactInfoId;
    firstName;
    lastName;
    email;
    cellPhone;
    workPhone;
};
exports.ContactInfo = ContactInfo;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ContactInfoID' }),
    __metadata("design:type", Number)
], ContactInfo.prototype, "contactInfoId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FirstName', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], ContactInfo.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LastName', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], ContactInfo.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Email', type: 'nvarchar', length: 254 }),
    __metadata("design:type", String)
], ContactInfo.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'CellPhone', type: 'nvarchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], ContactInfo.prototype, "cellPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'WorkPhone', type: 'nvarchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], ContactInfo.prototype, "workPhone", void 0);
exports.ContactInfo = ContactInfo = __decorate([
    (0, typeorm_1.Entity)({ name: 'ContactInfo', schema: 'dbo' })
], ContactInfo);
//# sourceMappingURL=contact-info.entity.js.map