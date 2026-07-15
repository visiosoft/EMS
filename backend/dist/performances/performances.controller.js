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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformancesController = void 0;
const common_1 = require("@nestjs/common");
const performances_service_1 = require("./performances.service");
let PerformancesController = class PerformancesController {
    performancesService;
    constructor(performancesService) {
        this.performancesService = performancesService;
    }
    findPaged(year, month, offset, limit, visibility, sortBy, sortDir) {
        const visList = visibility
            ? Array.isArray(visibility)
                ? visibility
                : visibility
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
            : ['Unknown', 'Private', 'Public'];
        const safeLimit = Math.min(10_000, Math.max(1, limit));
        const safeOffset = Math.max(0, offset);
        return this.performancesService.findAllPaginated(year, month, safeOffset, safeLimit, visList, sortBy, sortDir);
    }
    findAll(year, month) {
        return this.performancesService.findAll(year ? Number(year) : undefined, month ? Number(month) : undefined);
    }
};
exports.PerformancesController = PerformancesController;
__decorate([
    (0, common_1.Get)('paged'),
    __param(0, (0, common_1.Query)('year', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('month', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('visibility')),
    __param(5, (0, common_1.Query)('sortBy')),
    __param(6, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Number, Object, String, String]),
    __metadata("design:returntype", void 0)
], PerformancesController.prototype, "findPaged", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PerformancesController.prototype, "findAll", null);
exports.PerformancesController = PerformancesController = __decorate([
    (0, common_1.Controller)('performances'),
    __metadata("design:paramtypes", [performances_service_1.PerformancesService])
], PerformancesController);
//# sourceMappingURL=performances.controller.js.map