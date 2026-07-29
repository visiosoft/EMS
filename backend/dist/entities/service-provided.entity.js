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
exports.ServiceProvided = void 0;
const typeorm_1 = require("typeorm");
let ServiceProvided = class ServiceProvided {
    serviceProvidedId;
    serviceName;
};
exports.ServiceProvided = ServiceProvided;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'ServiceProvidedID' }),
    __metadata("design:type", Number)
], ServiceProvided.prototype, "serviceProvidedId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ServiceName', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], ServiceProvided.prototype, "serviceName", void 0);
exports.ServiceProvided = ServiceProvided = __decorate([
    (0, typeorm_1.Entity)({ name: 'ServiceProvided', schema: 'dbo' })
], ServiceProvided);
//# sourceMappingURL=service-provided.entity.js.map