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
exports.Tax = void 0;
const typeorm_1 = require("typeorm");
let Tax = class Tax {
    taxId;
    taxName;
    taxRate;
    taxJurisdictionType;
};
exports.Tax = Tax;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'TaxID' }),
    __metadata("design:type", Number)
], Tax.prototype, "taxId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TaxName', type: 'nvarchar', length: 150 }),
    __metadata("design:type", String)
], Tax.prototype, "taxName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TaxRate', type: 'decimal', precision: 18, scale: 6 }),
    __metadata("design:type", String)
], Tax.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TaxJurisdictionType', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], Tax.prototype, "taxJurisdictionType", void 0);
exports.Tax = Tax = __decorate([
    (0, typeorm_1.Entity)({ name: 'Tax', schema: 'dbo' })
], Tax);
//# sourceMappingURL=tax.entity.js.map