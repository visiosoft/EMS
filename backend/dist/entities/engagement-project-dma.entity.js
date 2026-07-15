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
exports.EngagementProjectDma = void 0;
const typeorm_1 = require("typeorm");
let EngagementProjectDma = class EngagementProjectDma {
    engagementProjectDmaId;
    engagementProjectId;
    dmaid;
};
exports.EngagementProjectDma = EngagementProjectDma;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'EngagementProjectDMAID' }),
    __metadata("design:type", Number)
], EngagementProjectDma.prototype, "engagementProjectDmaId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'EngagementProjectID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementProjectDma.prototype, "engagementProjectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DMAID', type: 'int' }),
    __metadata("design:type", Number)
], EngagementProjectDma.prototype, "dmaid", void 0);
exports.EngagementProjectDma = EngagementProjectDma = __decorate([
    (0, typeorm_1.Entity)({ name: 'EngagementProjectDMA', schema: 'dbo' })
], EngagementProjectDma);
//# sourceMappingURL=engagement-project-dma.entity.js.map