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
exports.Contact = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const contact_info_entity_1 = require("./contact-info.entity");
let Contact = class Contact extends audit_columns_1.AuditColumns {
    contactId;
    contactInfoId;
    contactInfo;
};
exports.Contact = Contact;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ContactID' }),
    __metadata("design:type", Number)
], Contact.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ContactInfoID', type: 'int' }),
    __metadata("design:type", Number)
], Contact.prototype, "contactInfoId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_info_entity_1.ContactInfo, { eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'ContactInfoID' }),
    __metadata("design:type", contact_info_entity_1.ContactInfo)
], Contact.prototype, "contactInfo", void 0);
exports.Contact = Contact = __decorate([
    (0, typeorm_1.Entity)({ name: 'Contact', schema: 'dbo' })
], Contact);
//# sourceMappingURL=contact.entity.js.map