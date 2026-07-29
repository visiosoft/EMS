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
exports.FileFormatOption = void 0;
const typeorm_1 = require("typeorm");
let FileFormatOption = class FileFormatOption {
    fileFormatOptionId;
    fileFormatName;
    isActive;
    sortOrder;
};
exports.FileFormatOption = FileFormatOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'FileFormatOptionID' }),
    __metadata("design:type", Number)
], FileFormatOption.prototype, "fileFormatOptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'FileFormatName', type: 'nvarchar', length: 50 }),
    __metadata("design:type", String)
], FileFormatOption.prototype, "fileFormatName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsActive', type: 'bit' }),
    __metadata("design:type", Boolean)
], FileFormatOption.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SortOrder', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], FileFormatOption.prototype, "sortOrder", void 0);
exports.FileFormatOption = FileFormatOption = __decorate([
    (0, typeorm_1.Entity)({ name: 'FileFormatOption', schema: 'dbo' })
], FileFormatOption);
//# sourceMappingURL=file-format-option.entity.js.map