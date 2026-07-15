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
exports.InternalEmployeesController = void 0;
const common_1 = require("@nestjs/common");
const internal_access_guard_1 = require("../internal-access/internal-access.guard");
const internal_employees_service_1 = require("./internal-employees.service");
let InternalEmployeesController = class InternalEmployeesController {
    internalEmployeesService;
    constructor(internalEmployeesService) {
        this.internalEmployeesService = internalEmployeesService;
    }
    findStaff(departmentId) {
        if (departmentId) {
            return this.internalEmployeesService.listEmployeesByDepartment(Number(departmentId));
        }
        return this.internalEmployeesService.listStaffEmployees();
    }
};
exports.InternalEmployeesController = InternalEmployeesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InternalEmployeesController.prototype, "findStaff", null);
exports.InternalEmployeesController = InternalEmployeesController = __decorate([
    (0, common_1.UseGuards)(internal_access_guard_1.InternalAccessGuard),
    (0, common_1.Controller)('internal/iae-employees'),
    __metadata("design:paramtypes", [internal_employees_service_1.InternalEmployeesService])
], InternalEmployeesController);
//# sourceMappingURL=internal-employees.controller.js.map