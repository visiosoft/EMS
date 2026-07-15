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
exports.DownloadQueryDto = exports.UploadBodyDto = exports.FolderQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class FolderQueryDto {
    path;
    source;
    shared;
    self;
}
exports.FolderQueryDto = FolderQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FolderQueryDto.prototype, "path", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['sharepoint', 'onedrive']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FolderQueryDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    __metadata("design:type", Boolean)
], FolderQueryDto.prototype, "shared", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    __metadata("design:type", Boolean)
], FolderQueryDto.prototype, "self", void 0);
class UploadBodyDto {
    path;
    source;
}
exports.UploadBodyDto = UploadBodyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadBodyDto.prototype, "path", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['sharepoint', 'onedrive']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadBodyDto.prototype, "source", void 0);
class DownloadQueryDto {
    id;
    source;
    self;
}
exports.DownloadQueryDto = DownloadQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DownloadQueryDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['sharepoint', 'onedrive']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DownloadQueryDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    __metadata("design:type", Boolean)
], DownloadQueryDto.prototype, "self", void 0);
//# sourceMappingURL=document-query.dto.js.map