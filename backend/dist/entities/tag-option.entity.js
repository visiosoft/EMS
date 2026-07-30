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
exports.TagOption = void 0;
const typeorm_1 = require("typeorm");
let TagOption = class TagOption {
    tagOptionId;
    tagName;
    isActive;
    sortOrder;
};
exports.TagOption = TagOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'TagOptionID' }),
    __metadata("design:type", Number)
], TagOption.prototype, "tagOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TagName', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], TagOption.prototype, "tagName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsActive', type: 'bit' }),
    __metadata("design:type", Boolean)
], TagOption.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SortOrder', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], TagOption.prototype, "sortOrder", void 0);
exports.TagOption = TagOption = __decorate([
    (0, typeorm_1.Entity)({ name: 'TagOption', schema: 'dbo' })
], TagOption);
//# sourceMappingURL=tag-option.entity.js.map