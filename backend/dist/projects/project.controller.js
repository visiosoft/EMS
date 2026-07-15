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
exports.ProjectController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs_1 = require("fs");
const confirmed_offer_multer_config_1 = require("./confirmed-offer-multer.config");
const add_performance_option_dto_1 = require("./dto/add-performance-option.dto");
const add_project_venue_dto_1 = require("./dto/add-project-venue.dto");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_performance_option_dto_1 = require("./dto/update-performance-option.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const update_project_venue_dto_1 = require("./dto/update-project-venue.dto");
const project_service_1 = require("./project.service");
let ProjectController = class ProjectController {
    projectService;
    constructor(projectService) {
        this.projectService = projectService;
    }
    projectStagesMeta() {
        return this.projectService.getProjectStageMeta();
    }
    offerReviewStatusesMeta() {
        return this.projectService.getOfferReviewStatusMeta();
    }
    venueStatusesMeta() {
        return this.projectService.getVenueStatusMeta();
    }
    optionStatusesMeta() {
        return this.projectService.getOptionStatusMeta();
    }
    list(offset, limit, q, projectStage, sortBy, sortDir) {
        return this.projectService.listPaginated(offset, limit, q, projectStage, sortBy, sortDir);
    }
    getOne(id) {
        return this.projectService.getOne(id);
    }
    create(dto) {
        return this.projectService.create(dto);
    }
    update(id, dto) {
        return this.projectService.update(id, dto);
    }
    remove(id) {
        return this.projectService.remove(id);
    }
    addVenue(id, dto) {
        return this.projectService.addVenue(id, dto);
    }
    updateVenue(id, venueId, dto) {
        return this.projectService.updateVenue(id, venueId, dto);
    }
    removeVenue(id, venueId) {
        return this.projectService.removeVenue(id, venueId);
    }
    addPerformanceOption(id, dto) {
        return this.projectService.addPerformanceOption(id, dto);
    }
    updatePerformanceOption(id, optionId, dto) {
        return this.projectService.updatePerformanceOption(id, optionId, dto);
    }
    removePerformanceOption(id, optionId) {
        return this.projectService.removePerformanceOption(id, optionId);
    }
    uploadConfirmedOfferPdf(id, file) {
        if (!file) {
            throw new common_1.BadRequestException('No file was provided.');
        }
        return this.projectService.uploadConfirmedOfferPdf(id, file);
    }
    async downloadConfirmedOfferPdf(id, res) {
        const { filePath, linkName } = await this.projectService.getConfirmedOfferPdfPath(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${encodeURIComponent(linkName)}"`,
        });
        const stream = (0, fs_1.createReadStream)(filePath);
        return new common_1.StreamableFile(stream);
    }
};
exports.ProjectController = ProjectController;
__decorate([
    (0, common_1.Get)('meta/project-stages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "projectStagesMeta", null);
__decorate([
    (0, common_1.Get)('meta/offer-review-statuses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "offerReviewStatusesMeta", null);
__decorate([
    (0, common_1.Get)('meta/venue-statuses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "venueStatusesMeta", null);
__decorate([
    (0, common_1.Get)('meta/option-statuses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "optionStatusesMeta", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('projectStage')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_project_dto_1.UpdateProjectDto]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/venues'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, add_project_venue_dto_1.AddProjectVenueDto]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "addVenue", null);
__decorate([
    (0, common_1.Patch)(':id/venues/:venueId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('venueId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_project_venue_dto_1.UpdateProjectVenueDto]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "updateVenue", null);
__decorate([
    (0, common_1.Delete)(':id/venues/:venueId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('venueId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "removeVenue", null);
__decorate([
    (0, common_1.Post)(':id/performance-options'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, add_performance_option_dto_1.AddPerformanceOptionDto]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "addPerformanceOption", null);
__decorate([
    (0, common_1.Patch)(':id/performance-options/:optionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('optionId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_performance_option_dto_1.UpdatePerformanceOptionDto]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "updatePerformanceOption", null);
__decorate([
    (0, common_1.Delete)(':id/performance-options/:optionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('optionId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "removePerformanceOption", null);
__decorate([
    (0, common_1.Post)(':id/confirmed-offer-pdf'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', (0, confirmed_offer_multer_config_1.confirmedOfferMulterOptions)())),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "uploadConfirmedOfferPdf", null);
__decorate([
    (0, common_1.Get)(':id/confirmed-offer-pdf'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "downloadConfirmedOfferPdf", null);
exports.ProjectController = ProjectController = __decorate([
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [project_service_1.ProjectService])
], ProjectController);
//# sourceMappingURL=project.controller.js.map