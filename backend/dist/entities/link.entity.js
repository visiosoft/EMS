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
exports.Link = void 0;
const typeorm_1 = require("typeorm");
let Link = class Link {
    linkId;
    linkType;
    linkUrl;
    linkName;
    linkPath;
};
exports.Link = Link;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'LinkID' }),
    __metadata("design:type", Number)
], Link.prototype, "linkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LinkType', type: 'nvarchar', length: 50 }),
    __metadata("design:type", String)
], Link.prototype, "linkType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LinkURL', type: 'nvarchar', length: 2048 }),
    __metadata("design:type", String)
], Link.prototype, "linkUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LinkName', type: 'nvarchar', length: 255 }),
    __metadata("design:type", String)
], Link.prototype, "linkName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'LinkPath', type: 'nvarchar', length: 1024 }),
    __metadata("design:type", String)
], Link.prototype, "linkPath", void 0);
exports.Link = Link = __decorate([
    (0, typeorm_1.Entity)({ name: 'Link', schema: 'dbo' })
], Link);
//# sourceMappingURL=link.entity.js.map