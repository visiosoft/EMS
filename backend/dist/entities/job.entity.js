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
exports.Job = void 0;
const typeorm_1 = require("typeorm");
let Job = class Job {
    jobId;
    jobName;
    jobCode;
    isActive;
};
exports.Job = Job;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'JobID' }),
    __metadata("design:type", Number)
], Job.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'JobName', type: 'nvarchar', length: 255 }),
    __metadata("design:type", String)
], Job.prototype, "jobName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'JobCode', type: 'nvarchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "jobCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsActive', type: 'bit' }),
    __metadata("design:type", Boolean)
], Job.prototype, "isActive", void 0);
exports.Job = Job = __decorate([
    (0, typeorm_1.Entity)({ name: 'Job', schema: 'dbo' })
], Job);
//# sourceMappingURL=job.entity.js.map