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
exports.News = void 0;
const typeorm_1 = require("typeorm");
let News = class News {
    id;
    title;
    summary;
    body;
    createdBy;
    createdAt;
    modifiedBy;
    modifiedAt;
};
exports.News = News;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'id', type: 'uniqueidentifier' }),
    __metadata("design:type", String)
], News.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title', type: 'nvarchar', length: 120 }),
    __metadata("design:type", String)
], News.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'summary', type: 'nvarchar', length: 220 }),
    __metadata("design:type", String)
], News.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'body', type: 'nvarchar', length: 'MAX' }),
    __metadata("design:type", String)
], News.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'nvarchar', length: 150, nullable: true }),
    __metadata("design:type", Object)
], News.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], News.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'modified_by',
        type: 'nvarchar',
        length: 150,
        nullable: true,
    }),
    __metadata("design:type", Object)
], News.prototype, "modifiedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'modified_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], News.prototype, "modifiedAt", void 0);
exports.News = News = __decorate([
    (0, typeorm_1.Entity)({ name: 'News', schema: 'dbo' })
], News);
//# sourceMappingURL=news.entity.js.map