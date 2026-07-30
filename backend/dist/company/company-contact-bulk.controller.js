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
exports.CompanyContactBulkController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const libphonenumber_js_1 = require("libphonenumber-js");
const contact_info_entity_1 = require("../entities/contact-info.entity");
const contact_entity_1 = require("../entities/contact.entity");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const company_entity_1 = require("../entities/company.entity");
const role_entity_1 = require("../entities/role.entity");
const department_entity_1 = require("../entities/department.entity");
const create_company_contact_bulk_dto_1 = require("./dto/create-company-contact-bulk.dto");
function assertOptionalE164Phone(value, field) {
    if (value == null)
        return;
    const t = value.trim();
    if (!t)
        return;
    if (!(0, libphonenumber_js_1.isValidPhoneNumber)(t)) {
        throw new common_1.BadRequestException({
            statusCode: common_1.HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: `Invalid ${field}. Use a full international number (E.164, e.g. +1 415 555 1234) or leave the field empty.`,
        });
    }
}
function uniquePositiveInts(values) {
    return Array.from(new Set((values ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0)));
}
function getRaw(row, key) {
    if (row[key] !== undefined && row[key] !== null)
        return row[key];
    const lower = key.toLowerCase();
    for (const k of Object.keys(row))
        if (k.toLowerCase() === lower)
            return row[k];
    return undefined;
}
let CompanyContactBulkController = class CompanyContactBulkController {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async addContactBulk(companyId, dto) {
        const roleIds = uniquePositiveInts(dto.roleIds);
        const departmentIds = uniquePositiveInts(dto.departmentIds);
        if (roleIds.length === 0)
            throw new common_1.BadRequestException({ message: 'Select at least one role.' });
        if (departmentIds.length === 0)
            throw new common_1.BadRequestException({
                message: 'Select at least one department.',
            });
        assertOptionalE164Phone(dto.workPhone ?? null, 'work phone');
        assertOptionalE164Phone(dto.cellPhone ?? null, 'cell phone');
        return this.dataSource.transaction(async (em) => {
            const company = await em.findOne(company_entity_1.Company, { where: { companyId } });
            if (!company)
                throw new common_1.BadRequestException({
                    message: `Company #${companyId} does not exist.`,
                });
            const [roles, departments] = await Promise.all([
                em.find(role_entity_1.Role, { where: { roleId: (0, typeorm_2.In)(roleIds) } }),
                em.find(department_entity_1.Department, { where: { departmentId: (0, typeorm_2.In)(departmentIds) } }),
            ]);
            if (roles.length !== roleIds.length)
                throw new common_1.BadRequestException({
                    message: 'One or more selected roles are invalid.',
                });
            if (departments.length !== departmentIds.length)
                throw new common_1.BadRequestException({
                    message: 'One or more selected departments are invalid.',
                });
            const savedContact = await this.getOrCreateContact(em, dto);
            const createdIds = [];
            const skipped = [];
            for (const roleId of roleIds) {
                for (const departmentId of departmentIds) {
                    const existing = await em.findOne(contact_assignment_entity_1.ContactAssignment, {
                        where: {
                            companyId,
                            contactId: savedContact.contactId,
                            roleId,
                            departmentId,
                        },
                    });
                    if (existing) {
                        skipped.push(`${roleId}:${departmentId}`);
                        continue;
                    }
                    const saved = await em.save(contact_assignment_entity_1.ContactAssignment, em.create(contact_assignment_entity_1.ContactAssignment, {
                        contactId: savedContact.contactId,
                        companyId,
                        roleId,
                        departmentId,
                    }));
                    createdIds.push(saved.contactAssignmentId);
                }
            }
            if (createdIds.length === 0) {
                throw new common_1.ConflictException({
                    statusCode: common_1.HttpStatus.CONFLICT,
                    error: 'Conflict',
                    message: 'This contact is already linked to this company for all selected role and department combinations.',
                    detail: skipped.join(', '),
                });
            }
            return this.getRowsByAssignmentIds(em, createdIds);
        });
    }
    async getOrCreateContact(em, dto) {
        const email = dto.email.trim();
        const existingInfo = await em
            .createQueryBuilder(contact_info_entity_1.ContactInfo, 'ci')
            .where('LOWER(ci.email) = LOWER(:email)', { email })
            .getOne();
        const info = existingInfo
            ? await em.save(contact_info_entity_1.ContactInfo, Object.assign(existingInfo, {
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                email,
                cellPhone: dto.cellPhone !== undefined
                    ? dto.cellPhone?.trim() || null
                    : existingInfo.cellPhone,
                workPhone: dto.workPhone !== undefined
                    ? dto.workPhone?.trim() || null
                    : existingInfo.workPhone,
            }))
            : await em.save(contact_info_entity_1.ContactInfo, em.create(contact_info_entity_1.ContactInfo, {
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                email,
                cellPhone: dto.cellPhone?.trim() || null,
                workPhone: dto.workPhone?.trim() || null,
            }));
        const existingContact = await em.findOne(contact_entity_1.Contact, {
            where: { contactInfoId: info.contactInfoId },
        });
        return (existingContact ??
            em.save(contact_entity_1.Contact, em.create(contact_entity_1.Contact, { contactInfoId: info.contactInfoId })));
    }
    async getRowsByAssignmentIds(em, ids) {
        const rows = await em
            .getRepository(contact_assignment_entity_1.ContactAssignment)
            .createQueryBuilder('ca')
            .innerJoin('ca.contact', 'ct')
            .innerJoin('ct.contactInfo', 'ci')
            .innerJoin('ca.role', 'r')
            .innerJoin('ca.department', 'd')
            .where('ca.contactAssignmentId IN (:...ids)', { ids })
            .select([
            'ca.contactAssignmentId AS contactAssignmentId',
            'ca.contactId AS contactId',
            'ci.contactInfoId AS contactInfoId',
            'ci.firstName AS firstName',
            'ci.lastName AS lastName',
            'ci.email AS email',
            'ci.cellPhone AS cellPhone',
            'ci.workPhone AS workPhone',
            'r.roleId AS roleId',
            'r.roleName AS roleName',
            'd.departmentId AS departmentId',
            'd.departmentName AS departmentName',
        ])
            .orderBy('ca.contactAssignmentId', 'ASC')
            .getRawMany();
        return rows.map((row) => ({
            contactAssignmentId: Number(getRaw(row, 'contactAssignmentId')),
            contactId: Number(getRaw(row, 'contactId')),
            contactInfoId: Number(getRaw(row, 'contactInfoId')),
            firstName: String(getRaw(row, 'firstName') ?? ''),
            lastName: String(getRaw(row, 'lastName') ?? ''),
            email: String(getRaw(row, 'email') ?? ''),
            cellPhone: getRaw(row, 'cellPhone') == null
                ? null
                : String(getRaw(row, 'cellPhone')),
            workPhone: getRaw(row, 'workPhone') == null
                ? null
                : String(getRaw(row, 'workPhone')),
            roleId: Number(getRaw(row, 'roleId')),
            roleName: String(getRaw(row, 'roleName') ?? ''),
            departmentId: Number(getRaw(row, 'departmentId')),
            departmentName: String(getRaw(row, 'departmentName') ?? ''),
        }));
    }
};
exports.CompanyContactBulkController = CompanyContactBulkController;
__decorate([
    (0, common_1.Post)(':id/contacts/bulk'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_company_contact_bulk_dto_1.CreateCompanyContactBulkDto]),
    __metadata("design:returntype", Promise)
], CompanyContactBulkController.prototype, "addContactBulk", null);
exports.CompanyContactBulkController = CompanyContactBulkController = __decorate([
    (0, common_1.Controller)('companies'),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], CompanyContactBulkController);
//# sourceMappingURL=company-contact-bulk.controller.js.map