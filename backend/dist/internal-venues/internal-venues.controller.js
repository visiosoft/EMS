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
exports.InternalVenuesController = void 0;
const common_1 = require("@nestjs/common");
const internal_access_guard_1 = require("../internal-access/internal-access.guard");
const internal_venues_service_1 = require("./internal-venues.service");
let InternalVenuesController = class InternalVenuesController {
    internalVenuesService;
    constructor(internalVenuesService) {
        this.internalVenuesService = internalVenuesService;
    }
    suggest(query = '', limit) {
        const safeLimit = Math.min(20, Math.max(1, limit));
        return this.internalVenuesService.suggestVenues(query, safeLimit);
    }
    list(offset, limit, query) {
        const safeLimit = Math.min(50, Math.max(1, limit));
        return this.internalVenuesService.listVenues(Math.max(0, offset), safeLimit, query);
    }
};
exports.InternalVenuesController = InternalVenuesController;
__decorate([
    (0, common_1.Get)('suggestions'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(8), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], InternalVenuesController.prototype, "suggest", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], InternalVenuesController.prototype, "list", null);
exports.InternalVenuesController = InternalVenuesController = __decorate([
    (0, common_1.UseGuards)(internal_access_guard_1.InternalAccessGuard),
    (0, common_1.Controller)('internal/venues'),
    __metadata("design:paramtypes", [internal_venues_service_1.InternalVenuesService])
], InternalVenuesController);
//# sourceMappingURL=internal-venues.controller.js.map