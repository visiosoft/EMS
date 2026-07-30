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
exports.VIPPackageBenefit = void 0;
const typeorm_1 = require("typeorm");
let VIPPackageBenefit = class VIPPackageBenefit {
    vipPackageId;
    vipBenefitId;
};
exports.VIPPackageBenefit = VIPPackageBenefit;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'VIPPackageID', type: 'int' }),
    __metadata("design:type", Number)
], VIPPackageBenefit.prototype, "vipPackageId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'VIPBenefitID', type: 'int' }),
    __metadata("design:type", Number)
], VIPPackageBenefit.prototype, "vipBenefitId", void 0);
exports.VIPPackageBenefit = VIPPackageBenefit = __decorate([
    (0, typeorm_1.Entity)({ name: 'VIPPackageBenefit', schema: 'dbo' })
], VIPPackageBenefit);
//# sourceMappingURL=vip-package-benefit.entity.js.map