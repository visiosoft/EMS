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
exports.InternalMarketsController = void 0;
const common_1 = require("@nestjs/common");
const internal_access_guard_1 = require("../internal-access/internal-access.guard");
const internal_markets_service_1 = require("./internal-markets.service");
let InternalMarketsController = class InternalMarketsController {
    internalMarketsService;
    constructor(internalMarketsService) {
        this.internalMarketsService = internalMarketsService;
    }
    suggest(query = '', limit) {
        const safeLimit = Math.min(20, Math.max(1, limit));
        return this.internalMarketsService.suggestMarkets(query, safeLimit);
    }
    venues(dmaid, offset, limit) {
        const safeLimit = Math.min(100, Math.max(1, limit));
        return this.internalMarketsService.listVenuesForMarket(dmaid, Math.max(0, offset), safeLimit);
    }
    list(offset, limit, query) {
        const safeLimit = Math.min(50, Math.max(1, limit));
        return this.internalMarketsService.listMarkets(Math.max(0, offset), safeLimit, query);
    }
};
exports.InternalMarketsController = InternalMarketsController;
__decorate([
    (0, common_1.Get)('suggestions'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(8), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], InternalMarketsController.prototype, "suggest", null);
__decorate([
    (0, common_1.Get)('venues'),
    __param(0, (0, common_1.Query)('dmaid', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", void 0)
], InternalMarketsController.prototype, "venues", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], InternalMarketsController.prototype, "list", null);
exports.InternalMarketsController = InternalMarketsController = __decorate([
    (0, common_1.UseGuards)(internal_access_guard_1.InternalAccessGuard),
    (0, common_1.Controller)('internal/markets'),
    __metadata("design:paramtypes", [internal_markets_service_1.InternalMarketsService])
], InternalMarketsController);
//# sourceMappingURL=internal-markets.controller.js.map