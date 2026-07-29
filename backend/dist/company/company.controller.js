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
exports.ContactsController = exports.ContactAssignmentsController = exports.CompanyController = void 0;
const common_1 = require("@nestjs/common");
const company_service_1 = require("./company.service");
const create_company_contact_dto_1 = require("./dto/create-company-contact.dto");
const manage_contact_dto_1 = require("./dto/manage-contact.dto");
const create_company_dto_1 = require("./dto/create-company.dto");
const update_company_dto_1 = require("./dto/update-company.dto");
const update_venue_ticketing_dto_1 = require("./dto/update-venue-ticketing.dto");
const update_venue_profile_dto_1 = require("./dto/update-venue-profile.dto");
const update_venue_details_dto_1 = require("./dto/update-venue-details.dto");
let CompanyController = class CompanyController {
    companyService;
    constructor(companyService) {
        this.companyService = companyService;
    }
    findAll(offset, limit, q, companyType, sortBy, sortDir) {
        return this.companyService.findAllPaginated(offset, limit, q, companyType, sortBy, sortDir);
    }
    create(dto) {
        return this.companyService.create(dto);
    }
    listContacts(id, roleIdRaw, roleName) {
        const roleId = roleIdRaw != null && String(roleIdRaw).trim().length > 0
            ? Number(roleIdRaw)
            : undefined;
        return this.companyService.listContacts(id, {
            roleId: roleId != null && Number.isInteger(roleId) && roleId > 0
                ? roleId
                : undefined,
            roleName,
        });
    }
    listLinkedVenueContacts(id) {
        return this.companyService.listLinkedVenueContactsForComplex(id);
    }
    addContact(id, dto) {
        return this.companyService.addContact(id, dto);
    }
    listEngagements(id) {
        return this.companyService.listEngagements(id);
    }
    getCompanyLinks(id) {
        return this.companyService.getCompanyLinks(id);
    }
    getVenueTicketing(id) {
        return this.companyService.getVenueTicketing(id);
    }
    updateVenueTicketing(id, dto) {
        return this.companyService.updateVenueTicketing(id, dto);
    }
    getVenueProfile(id) {
        return this.companyService.getVenueProfile(id);
    }
    provisionVenueProfile(id) {
        return this.companyService.provisionVenueProfile(id);
    }
    updateVenueProfile(id, dto) {
        return this.companyService.updateVenueProfile(id, dto);
    }
    getVenueDetails(id) {
        return this.companyService.getVenueDetails(id);
    }
    updateVenueDetails(id, dto) {
        return this.companyService.updateVenueDetails(id, dto);
    }
    findOne(id) {
        return this.companyService.findOne(id);
    }
    update(id, dto) {
        return this.companyService.update(id, dto);
    }
    remove(id) {
        return this.companyService.remove(id);
    }
};
exports.CompanyController = CompanyController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('companyType')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortDir')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id/contacts'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('roleId')),
    __param(2, (0, common_1.Query)('roleName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "listContacts", null);
__decorate([
    (0, common_1.Get)(':id/contacts/linked-venues'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "listLinkedVenueContacts", null);
__decorate([
    (0, common_1.Post)(':id/contacts'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_company_contact_dto_1.CreateCompanyContactDto]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "addContact", null);
__decorate([
    (0, common_1.Get)(':id/engagements'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "listEngagements", null);
__decorate([
    (0, common_1.Get)(':id/links'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "getCompanyLinks", null);
__decorate([
    (0, common_1.Get)(':id/venue-ticketing'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "getVenueTicketing", null);
__decorate([
    (0, common_1.Patch)(':id/venue-ticketing'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_venue_ticketing_dto_1.UpdateVenueTicketingDto]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "updateVenueTicketing", null);
__decorate([
    (0, common_1.Get)(':id/venue-profile'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "getVenueProfile", null);
__decorate([
    (0, common_1.Post)(':id/venue-profile/provision'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "provisionVenueProfile", null);
__decorate([
    (0, common_1.Patch)(':id/venue-profile'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_venue_profile_dto_1.UpdateVenueProfileDto]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "updateVenueProfile", null);
__decorate([
    (0, common_1.Get)(':id/venue-details'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "getVenueDetails", null);
__decorate([
    (0, common_1.Patch)(':id/venue-details'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_venue_details_dto_1.UpdateVenueDetailsDto]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "updateVenueDetails", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_company_dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompanyController.prototype, "remove", null);
exports.CompanyController = CompanyController = __decorate([
    (0, common_1.Controller)('companies'),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], CompanyController);
let ContactAssignmentsController = class ContactAssignmentsController {
    companyService;
    constructor(companyService) {
        this.companyService = companyService;
    }
    updateContact(assignmentId, dto) {
        return this.companyService.updateContact(assignmentId, dto);
    }
    removeContact(assignmentId) {
        return this.companyService.removeContactCompletely(assignmentId);
    }
};
exports.ContactAssignmentsController = ContactAssignmentsController;
__decorate([
    (0, common_1.Patch)(':assignmentId'),
    __param(0, (0, common_1.Param)('assignmentId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_company_contact_dto_1.UpdateCompanyContactDto]),
    __metadata("design:returntype", void 0)
], ContactAssignmentsController.prototype, "updateContact", null);
__decorate([
    (0, common_1.Delete)(':assignmentId'),
    __param(0, (0, common_1.Param)('assignmentId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ContactAssignmentsController.prototype, "removeContact", null);
exports.ContactAssignmentsController = ContactAssignmentsController = __decorate([
    (0, common_1.Controller)('contact-assignments'),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], ContactAssignmentsController);
let ContactsController = class ContactsController {
    companyService;
    constructor(companyService) {
        this.companyService = companyService;
    }
    list(offset, limit, q, companyIdRaw) {
        const companyId = companyIdRaw != null && String(companyIdRaw).trim()
            ? Number(companyIdRaw)
            : undefined;
        return this.companyService.listManagedContacts(offset, limit, q, companyId != null && Number.isInteger(companyId) && companyId > 0
            ? companyId
            : undefined);
    }
    create(dto) {
        return this.companyService.createManagedContact(dto);
    }
    update(id, dto) {
        return this.companyService.updateManagedContact(id, dto);
    }
    getConnections(id) {
        return this.companyService.getContactConnections(id);
    }
    remove(id) {
        return this.companyService.removeManagedContact(id);
    }
};
exports.ContactsController = ContactsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(25), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [manage_contact_dto_1.ManageContactDto]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, manage_contact_dto_1.UpdateManagedContactDto]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/connections'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "getConnections", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "remove", null);
exports.ContactsController = ContactsController = __decorate([
    (0, common_1.Controller)('contacts'),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], ContactsController);
//# sourceMappingURL=company.controller.js.map