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
exports.InternalBenefitsController = void 0;
const common_1 = require("@nestjs/common");
const internal_access_guard_1 = require("../internal-access/internal-access.guard");
const internal_benefits_service_1 = require("./internal-benefits.service");
let InternalBenefitsController = class InternalBenefitsController {
    internalBenefitsService;
    constructor(internalBenefitsService) {
        this.internalBenefitsService = internalBenefitsService;
    }
    getMyInsurance() {
        return this.internalBenefitsService.getMyInsurance();
    }
    listPlans() {
        return this.internalBenefitsService.listPlans();
    }
};
exports.InternalBenefitsController = InternalBenefitsController;
__decorate([
    (0, common_1.Get)('my-insurance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InternalBenefitsController.prototype, "getMyInsurance", null);
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InternalBenefitsController.prototype, "listPlans", null);
exports.InternalBenefitsController = InternalBenefitsController = __decorate([
    (0, common_1.UseGuards)(internal_access_guard_1.InternalAccessGuard),
    (0, common_1.Controller)('internal/benefits'),
    __metadata("design:paramtypes", [internal_benefits_service_1.InternalBenefitsService])
], InternalBenefitsController);
//# sourceMappingURL=internal-benefits.controller.js.map