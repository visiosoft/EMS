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
exports.InternalHandbookController = void 0;
const common_1 = require("@nestjs/common");
const internal_access_guard_1 = require("../internal-access/internal-access.guard");
const internal_handbook_service_1 = require("./internal-handbook.service");
const section_query_dto_1 = require("./dto/section-query.dto");
let InternalHandbookController = class InternalHandbookController {
    internalHandbookService;
    constructor(internalHandbookService) {
        this.internalHandbookService = internalHandbookService;
    }
    findAllSections() {
        return this.internalHandbookService.findAllSections();
    }
    findSection(query) {
        const sectionId = query.sectionId ?? query.title;
        if (!sectionId) {
            return this.internalHandbookService.findAllSections();
        }
        return this.internalHandbookService.findSectionBySectionId(sectionId);
    }
};
exports.InternalHandbookController = InternalHandbookController;
__decorate([
    (0, common_1.Get)('sections'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InternalHandbookController.prototype, "findAllSections", null);
__decorate([
    (0, common_1.Get)('section'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [section_query_dto_1.SectionQueryDto]),
    __metadata("design:returntype", void 0)
], InternalHandbookController.prototype, "findSection", null);
exports.InternalHandbookController = InternalHandbookController = __decorate([
    (0, common_1.UseGuards)(internal_access_guard_1.InternalAccessGuard),
    (0, common_1.Controller)('internal/handbook'),
    __metadata("design:paramtypes", [internal_handbook_service_1.InternalHandbookService])
], InternalHandbookController);
//# sourceMappingURL=internal-handbook.controller.js.map