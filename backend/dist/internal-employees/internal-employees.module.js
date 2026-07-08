"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalEmployeesModule = void 0;
const common_1 = require("@nestjs/common");
const admin_users_module_1 = require("../admin-users/admin-users.module");
const internal_employees_controller_1 = require("./internal-employees.controller");
const internal_employees_service_1 = require("./internal-employees.service");
let InternalEmployeesModule = class InternalEmployeesModule {
};
exports.InternalEmployeesModule = InternalEmployeesModule;
exports.InternalEmployeesModule = InternalEmployeesModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_users_module_1.AdminUsersModule],
        controllers: [internal_employees_controller_1.InternalEmployeesController],
        providers: [internal_employees_service_1.InternalEmployeesService],
    })
], InternalEmployeesModule);
//# sourceMappingURL=internal-employees.module.js.map