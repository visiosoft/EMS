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
exports.EngagementLink = void 0;
const typeorm_1 = require("typeorm");
const link_entity_1 = require("./link.entity");
let EngagementLink = class EngagementLink {
    engagementLinkId;
    engagementId;
    linkId;
    link;
    linkPurpose;
};
exports.EngagementLink = EngagementLink;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'EngagementLinkID' }),
    __metadata("design:type", Number)
], EngagementLink.prototype, "engagementLinkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementLink.prototype, "engagementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LinkID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementLink.prototype, "linkId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => link_entity_1.Link, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'LinkID' }),
    __metadata("design:type", link_entity_1.Link)
], EngagementLink.prototype, "link", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LinkPurpose', type: 'nvarchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], EngagementLink.prototype, "linkPurpose", void 0);
exports.EngagementLink = EngagementLink = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementLink', schema: 'dbo' })
], EngagementLink);
//# sourceMappingURL=engagement-link.entity.js.map