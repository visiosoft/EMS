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
exports.UserProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const internal_contact_sync_service_1 = require("./internal-contact-sync.service");
let UserProfileService = class UserProfileService {
    dataSource;
    auditContext;
    internalContactSyncService;
    constructor(dataSource, auditContext, internalContactSyncService) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
        this.internalContactSyncService = internalContactSyncService;
    }
    async getMyProfile() {
        const emails = this.getSignedInEmailCandidates();
        return this.loadMyInternalProfile(emails);
    }
    async updateMyProfile(dto) {
        const emails = this.getSignedInEmailCandidates();
        const current = await this.loadMyInternalProfile(emails);
        const next = normalizeProfileUpdate(dto, current);
        const profilePayload = {
            displayName: `${next.firstName} ${next.lastName}`.trim() || current.email,
            givenName: next.firstName || null,
            surname: next.lastName || null,
            department: next.departmentName || null,
        };
        const phonePayload = {
            mobilePhone: next.cellPhone || null,
            businessPhones: next.workPhone ? [next.workPhone] : [],
        };
        if (current.jobTitleColumnAvailable) {
            profilePayload.jobTitle = next.jobTitle || null;
        }
        await this.dataSource.transaction(async (manager) => {
            if (current.jobTitleColumnAvailable) {
                await manager.query(`
          UPDATE dbo.ContactInfo
          SET FirstName = @0,
              LastName = @1,
              CellPhone = @2,
              WorkPhone = @3,
              JobTitle = @4
          WHERE ContactInfoID = @5
          `, [
                    next.firstName,
                    next.lastName,
                    nullableText(next.cellPhone),
                    nullableText(next.workPhone),
                    nullableText(next.jobTitle),
                    current.contactInfoId,
                ]);
            }
            else {
                await manager.query(`
          UPDATE dbo.ContactInfo
          SET FirstName = @0,
              LastName = @1,
              CellPhone = @2,
              WorkPhone = @3
          WHERE ContactInfoID = @4
          `, [
                    next.firstName,
                    next.lastName,
                    nullableText(next.cellPhone),
                    nullableText(next.workPhone),
                    current.contactInfoId,
                ]);
            }
            const departmentId = await this.findOrCreateDepartment(manager, next.departmentName);
            await manager.query(`
        UPDATE dbo.ContactAssignment
        SET DepartmentID = @0,
            modified_by = @1,
            modified_at = SYSUTCDATETIME()
        WHERE ContactID = @2
          AND CompanyID = @3
        `, [
                departmentId,
                this.auditContext.getUserEmail() ?? 'self profile',
                current.contactId,
                current.internalCompanyId,
            ]);
        });
        const entraSyncWarnings = await this.syncProfileToEntra(this.auditContext.getUserOid() || current.email, { ...profilePayload, ...phonePayload });
        return {
            ...(await this.loadMyInternalProfile([next.email])),
            ...(entraSyncWarnings.length ? { entraSyncWarnings } : {}),
        };
    }
    async syncProfileToEntra(userIdentifier, payload) {
        const warnings = [];
        try {
            await this.internalContactSyncService.updateAndVerifyEntraUserByIdentifier(userIdentifier, payload);
        }
        catch (error) {
            warnings.push(`EMS profile saved. ${readErrorMessage(error, 'Microsoft Entra did not persist one or more profile fields.')}`);
        }
        return warnings;
    }
    getSignedInEmailCandidates() {
        const emails = Array.from(new Set(this.auditContext
            .getUserEmailCandidates()
            .map(normalizeEmail)
            .filter(Boolean)));
        if (emails.length === 0) {
            throw new common_1.UnauthorizedException('Signed-in user email was not found.');
        }
        return emails;
    }
    async loadMyInternalProfile(emails) {
        const jobTitleColumnAvailable = await this.hasContactInfoJobTitleColumn();
        const jobTitleSelect = jobTitleColumnAvailable
            ? 'ci.JobTitle AS jobTitle'
            : "CAST('' AS nvarchar(150)) AS jobTitle";
        const placeholders = emails.map((_, index) => `@${index}`).join(', ');
        const rows = await this.dataSource.query(`
      SELECT
        co.CompanyID AS internalCompanyId,
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        ci.CellPhone AS cellPhone,
        ci.WorkPhone AS workPhone,
        ${jobTitleSelect},
        COALESCE(d.DepartmentName, '') AS departmentName,
        COALESCE(r.RoleName, '') AS roleName
      FROM dbo.ContactAssignment ca
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      LEFT JOIN dbo.Department d ON d.DepartmentID = ca.DepartmentID
      LEFT JOIN dbo.Role r ON r.RoleID = ca.RoleID
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) IN (${placeholders})
      ORDER BY ca.ContactAssignmentID
      `, emails);
        if (rows.length === 0) {
            throw new common_1.NotFoundException('Your EMS internal contact profile was not found. Run Entra to EMS sync first.');
        }
        const contactIds = Array.from(new Set(rows
            .map((row) => readNumber(row, 'contactId', 'ContactID'))
            .filter((id) => id != null)));
        if (contactIds.length !== 1) {
            throw new common_1.BadRequestException('More than one EMS internal contact uses your email. Resolve duplicates before editing your profile.');
        }
        const first = rows[0];
        const departments = uniqueClean(rows.map((row) => readString(row, 'departmentName', 'DepartmentName')));
        const roles = uniqueClean(rows.map((row) => readString(row, 'roleName', 'RoleName')));
        return {
            internalCompanyId: readNumber(first, 'internalCompanyId', 'CompanyID') ?? 0,
            contactId: contactIds[0],
            contactInfoId: readNumber(first, 'contactInfoId', 'ContactInfoID') ?? 0,
            firstName: readString(first, 'firstName', 'FirstName'),
            lastName: readString(first, 'lastName', 'LastName'),
            email: readString(first, 'email', 'Email'),
            cellPhone: readString(first, 'cellPhone', 'CellPhone'),
            workPhone: readString(first, 'workPhone', 'WorkPhone'),
            departmentName: departments[0] ?? '',
            roleNames: roles,
            jobTitle: readString(first, 'jobTitle', 'JobTitle'),
            jobTitleColumnAvailable,
        };
    }
    async hasContactInfoJobTitleColumn() {
        const rows = await this.dataSource.query(`
      SELECT 1 AS hasColumn
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'ContactInfo'
        AND COLUMN_NAME = 'JobTitle'
      `);
        return rows.length > 0;
    }
    async findOrCreateDepartment(manager, value) {
        const departmentName = cleanText(value);
        if (!departmentName) {
            throw new common_1.BadRequestException('Department is required.');
        }
        const existingRows = await manager.query(`
      SELECT TOP 1 DepartmentID AS departmentId
      FROM dbo.Department
      WHERE LOWER(LTRIM(RTRIM(DepartmentName))) = LOWER(LTRIM(RTRIM(@0)))
      `, [departmentName]);
        const existingId = readNumber(existingRows[0], 'departmentId', 'DepartmentID');
        if (existingId)
            return existingId;
        const rows = await manager.query(`
      INSERT INTO dbo.Department (DepartmentName)
      OUTPUT INSERTED.DepartmentID AS departmentId
      VALUES (@0)
      `, [trimToMax(departmentName, 100)]);
        const departmentId = readNumber(rows[0], 'departmentId', 'DepartmentID');
        if (!departmentId) {
            throw new common_1.BadRequestException('Unable to create EMS department.');
        }
        return departmentId;
    }
};
exports.UserProfileService = UserProfileService;
exports.UserProfileService = UserProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext,
        internal_contact_sync_service_1.InternalContactSyncService])
], UserProfileService);
function normalizeProfileUpdate(dto, current) {
    const firstName = trimToMax(dto.firstName ?? current.firstName, 100);
    const lastName = trimToMax(dto.lastName ?? current.lastName, 100);
    const departmentName = trimToMax(dto.departmentName ?? current.departmentName, 100);
    if (!firstName)
        throw new common_1.BadRequestException('First name is required.');
    if (!departmentName)
        throw new common_1.BadRequestException('Department is required.');
    return {
        ...current,
        firstName,
        lastName,
        cellPhone: trimToMax(dto.cellPhone ?? current.cellPhone, 30),
        workPhone: trimToMax(dto.workPhone ?? current.workPhone, 30),
        departmentName,
        jobTitle: current.jobTitleColumnAvailable
            ? trimToMax(dto.jobTitle ?? current.jobTitle, 150)
            : current.jobTitle,
    };
}
function normalizeEmail(value) {
    const email = cleanText(value).toLowerCase();
    return email.includes('@') ? email : '';
}
function uniqueClean(values) {
    return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}
function cleanText(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
}
function nullableText(value) {
    const cleaned = cleanText(value);
    return cleaned || null;
}
function trimToMax(value, maxLength) {
    return cleanText(value).slice(0, maxLength);
}
function readString(row, ...keys) {
    if (!row)
        return '';
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null)
            return cleanText(String(value));
    }
    return '';
}
function readNumber(row, ...keys) {
    if (!row)
        return null;
    for (const key of keys) {
        const value = row[key];
        const numberValue = Number(value);
        if (Number.isFinite(numberValue))
            return numberValue;
    }
    return null;
}
function readErrorMessage(error, fallback) {
    if (error instanceof Error && error.message)
        return error.message;
    if (typeof error === 'object' && error !== null) {
        const response = 'getResponse' in error
            ? error.getResponse?.()
            : undefined;
        if (typeof response === 'string' && response.trim())
            return response.trim();
        if (response && typeof response === 'object') {
            const message = response.message;
            if (typeof message === 'string' && message.trim())
                return message.trim();
        }
    }
    return fallback;
}
//# sourceMappingURL=user-profile.service.js.map