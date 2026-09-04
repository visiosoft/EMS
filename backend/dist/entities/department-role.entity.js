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
exports.DepartmentRole = void 0;
const typeorm_1 = require("typeorm");
let DepartmentRole = class DepartmentRole {
    departmentRoleId;
    departmentId;
    roleId;
};
exports.DepartmentRole = DepartmentRole;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'DepartmentRoleID' }),
    __metadata("design:type", Number)
], DepartmentRole.prototype, "departmentRoleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'DepartmentID', type: 'int' }),
    __metadata("design:type", Number)
], DepartmentRole.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'RoleID', type: 'int' }),
    __metadata("design:type", Number)
], DepartmentRole.prototype, "roleId", void 0);
exports.DepartmentRole = DepartmentRole = __decorate([
    (0, typeorm_1.Entity)({ name: 'DepartmentRole', schema: 'dbo' })
], DepartmentRole);
//# sourceMappingURL=department-role.entity.js.map