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
exports.VIPPackage = void 0;
const typeorm_1 = require("typeorm");
let VIPPackage = class VIPPackage {
    vipPackageId;
    performanceId;
    isOffered;
    packageName;
};
exports.VIPPackage = VIPPackage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'VIPPackageID', type: 'int' }),
    __metadata("design:type", Number)
], VIPPackage.prototype, "vipPackageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PerformanceID', type: 'int' }),
    __metadata("design:type", Number)
], VIPPackage.prototype, "performanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsOffered', type: 'bit' }),
    __metadata("design:type", Boolean)
], VIPPackage.prototype, "isOffered", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PackageName', type: 'nvarchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VIPPackage.prototype, "packageName", void 0);
exports.VIPPackage = VIPPackage = __decorate([
    (0, typeorm_1.Entity)({ name: 'VIPPackage', schema: 'dbo' })
], VIPPackage);
//# sourceMappingURL=vip-package.entity.js.map