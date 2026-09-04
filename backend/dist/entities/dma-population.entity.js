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
exports.DmaPopulation = void 0;
const typeorm_1 = require("typeorm");
let DmaPopulation = class DmaPopulation {
    nielsenCode;
    rank;
    metro12PlusPopulation;
    hispanic12PlusPopulation;
    black12PlusPopulation;
    dataAsOfYear;
    marketName;
};
exports.DmaPopulation = DmaPopulation;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'NielsenCode', type: 'int' }),
    __metadata("design:type", Number)
], DmaPopulation.prototype, "nielsenCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Rank', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DmaPopulation.prototype, "rank", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Metro12PlusPopulation', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DmaPopulation.prototype, "metro12PlusPopulation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Hispanic12PlusPopulation', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DmaPopulation.prototype, "hispanic12PlusPopulation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'Black12PlusPopulation', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DmaPopulation.prototype, "black12PlusPopulation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DataAsOfYear', type: 'smallint', nullable: true }),
    __metadata("design:type", Object)
], DmaPopulation.prototype, "dataAsOfYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'MarketName', type: 'nvarchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], DmaPopulation.prototype, "marketName", void 0);
exports.DmaPopulation = DmaPopulation = __decorate([
    (0, typeorm_1.Entity)({ name: 'DMAPopulation', schema: 'dbo' })
], DmaPopulation);
//# sourceMappingURL=dma-population.entity.js.map