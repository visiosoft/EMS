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
exports.ContactAssignmentBulkUpdateController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const typeorm_2 = require("typeorm");
const libphonenumber_js_1 = require("libphonenumber-js");
const contact_assignment_entity_1 = require("../entities/contact-assignment.entity");
const contact_info_entity_1 = require("../entities/contact-info.entity");
const contact_entity_1 = require("../entities/contact.entity");
const role_entity_1 = require("../entities/role.entity");
const department_entity_1 = require("../entities/department.entity");
class UpdateContactAssignmentBulkDto {
    firstName;
    lastName;
    email;
    cellPhone;
    workPhone;
    roleIds;
    departmentIds;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateContactAssignmentBulkDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateContactAssignmentBulkDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], UpdateContactAssignmentBulkDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", Object)
], UpdateContactAssignmentBulkDto.prototype, "cellPhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", Object)
], UpdateContactAssignmentBulkDto.prototype, "workPhone", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], UpdateContactAssignmentBulkDto.prototype, "roleIds", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    __metadata("design:type", Array)
], UpdateContactAssignmentBulkDto.prototype, "departmentIds", void 0);
function assertOptionalE164Phone(value, field) {
    if (value == null)
        return;
    const t = String(value).trim();
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
let ContactAssignmentBulkUpdateController = class ContactAssignmentBulkUpdateController {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async updateContactBulk(assignmentId, dto) {
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
            const assignmentRepo = em.getRepository(contact_assignment_entity_1.ContactAssignment);
            const infoRepo = em.getRepository(contact_info_entity_1.ContactInfo);
            const contactRepo = em.getRepository(contact_entity_1.Contact);
            const currentAssignment = await assignmentRepo.findOne({
                where: { contactAssignmentId: assignmentId },
                relations: { contact: { contactInfo: true } },
            });
            if (!currentAssignment)
                throw new common_1.NotFoundException(`Contact assignment ${assignmentId} not found`);
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
            const companyId = currentAssignment.companyId;
            const oldContactId = currentAssignment.contactId;
            const oldContactInfoId = currentAssignment.contact.contactInfoId;
            const currentInfo = currentAssignment.contact.contactInfo;
            const currentEmail = String(currentInfo.email ?? '')
                .trim()
                .toLowerCase();
            const nextEmail = dto.email?.trim();
            const emailChanged = nextEmail !== undefined && nextEmail.toLowerCase() !== currentEmail;
            let targetContactId = oldContactId;
            let targetInfo = currentInfo;
            if (emailChanged && nextEmail) {
                const existingInfo = await infoRepo
                    .createQueryBuilder('ci')
                    .where('LOWER(ci.email) = LOWER(:email)', { email: nextEmail })
                    .getOne();
                if (existingInfo) {
                    targetInfo = existingInfo;
                    if (dto.firstName !== undefined)
                        targetInfo.firstName = dto.firstName.trim();
                    if (dto.lastName !== undefined)
                        targetInfo.lastName = dto.lastName.trim();
                    targetInfo.email = nextEmail;
                    if (dto.cellPhone !== undefined)
                        targetInfo.cellPhone = dto.cellPhone?.trim() || null;
                    if (dto.workPhone !== undefined)
                        targetInfo.workPhone = dto.workPhone?.trim() || null;
                    await infoRepo.save(targetInfo);
                    let targetContact = await contactRepo.findOne({
                        where: { contactInfoId: targetInfo.contactInfoId },
                    });
                    if (!targetContact) {
                        targetContact = await contactRepo.save(contactRepo.create({ contactInfoId: targetInfo.contactInfoId }));
                    }
                    targetContactId = targetContact.contactId;
                }
                else {
                    targetInfo = await infoRepo.save(infoRepo.create({
                        firstName: dto.firstName !== undefined
                            ? dto.firstName.trim()
                            : currentInfo.firstName,
                        lastName: dto.lastName !== undefined
                            ? dto.lastName.trim()
                            : currentInfo.lastName,
                        email: nextEmail,
                        cellPhone: dto.cellPhone !== undefined
                            ? dto.cellPhone?.trim() || null
                            : currentInfo.cellPhone,
                        workPhone: dto.workPhone !== undefined
                            ? dto.workPhone?.trim() || null
                            : currentInfo.workPhone,
                    }));
                    const targetContact = await contactRepo.save(contactRepo.create({ contactInfoId: targetInfo.contactInfoId }));
                    targetContactId = targetContact.contactId;
                }
            }
            else {
                if (dto.firstName !== undefined)
                    targetInfo.firstName = dto.firstName.trim();
                if (dto.lastName !== undefined)
                    targetInfo.lastName = dto.lastName.trim();
                if (dto.email !== undefined)
                    targetInfo.email = dto.email.trim();
                if (dto.cellPhone !== undefined)
                    targetInfo.cellPhone = dto.cellPhone?.trim() || null;
                if (dto.workPhone !== undefined)
                    targetInfo.workPhone = dto.workPhone?.trim() || null;
                await infoRepo.save(targetInfo);
            }
            if (targetContactId !== oldContactId) {
                await assignmentRepo.delete({ companyId, contactId: oldContactId });
            }
            await assignmentRepo.delete({ companyId, contactId: targetContactId });
            const createdIds = [];
            for (const roleId of roleIds) {
                for (const departmentId of departmentIds) {
                    const saved = await assignmentRepo.save(assignmentRepo.create({
                        companyId,
                        contactId: targetContactId,
                        roleId,
                        departmentId,
                    }));
                    createdIds.push(saved.contactAssignmentId);
                }
            }
            if (targetContactId !== oldContactId) {
                const remainingForOldContact = await assignmentRepo.count({
                    where: { contactId: oldContactId },
                });
                if (remainingForOldContact === 0) {
                    await contactRepo.delete({ contactId: oldContactId });
                    const stillUsesOldInfo = await contactRepo.count({
                        where: { contactInfoId: oldContactInfoId },
                    });
                    if (stillUsesOldInfo === 0)
                        await infoRepo.delete({ contactInfoId: oldContactInfoId });
                }
            }
            return this.getRowsByAssignmentIds(em, createdIds);
        });
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
exports.ContactAssignmentBulkUpdateController = ContactAssignmentBulkUpdateController;
__decorate([
    (0, common_1.Patch)(':assignmentId/bulk'),
    __param(0, (0, common_1.Param)('assignmentId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateContactAssignmentBulkDto]),
    __metadata("design:returntype", Promise)
], ContactAssignmentBulkUpdateController.prototype, "updateContactBulk", null);
exports.ContactAssignmentBulkUpdateController = ContactAssignmentBulkUpdateController = __decorate([
    (0, common_1.Controller)('contact-assignments'),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], ContactAssignmentBulkUpdateController);
//# sourceMappingURL=contact-assignment-bulk-update.controller.js.map