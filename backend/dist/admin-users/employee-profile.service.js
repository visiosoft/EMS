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
exports.EmployeeProfileService = exports.UpdateEmployeePersonalProfileDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const class_validator_1 = require("class-validator");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
class UpdateEmployeePersonalProfileDto {
    middleName;
    personalEmail;
    birthDate;
    ssn;
    homeStreet;
    homeAddress2;
    homeCity;
    homeState;
    homePostalCode;
    homeCountry;
    emergencyFirstName;
    emergencyLastName;
    emergencyEmail;
    emergencyCellPhone;
}
exports.UpdateEmployeePersonalProfileDto = UpdateEmployeePersonalProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "middleName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "personalEmail", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "birthDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "ssn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "homeStreet", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "homeAddress2", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "homeCity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "homeState", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "homePostalCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "homeCountry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "emergencyFirstName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "emergencyLastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "emergencyEmail", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateEmployeePersonalProfileDto.prototype, "emergencyCellPhone", void 0);
let EmployeeProfileService = class EmployeeProfileService {
    dataSource;
    auditContext;
    constructor(dataSource, auditContext) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
    }
    async getPersonalProfile(userEmail) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        return this.loadPersonalProfile(email);
    }
    async updatePersonalProfile(userEmail, dto) {
        const email = normalizeEmail(userEmail);
        if (!email) {
            throw new common_1.BadRequestException('A valid email address is required.');
        }
        const current = await this.loadPersonalProfile(email);
        const modifiedBy = this.auditContext.getUserOid() ?? this.auditContext.getUserEmail() ?? email;
        await this.dataSource.transaction(async (manager) => {
            const epExists = await manager.query(`SELECT 1 AS found FROM dbo.EmployeeProfile WHERE ContactID = @0`, [current.contactId]);
            console.log('[PersonalProfile] contactId:', current.contactId, 'epExists:', epExists.length > 0);
            console.log('[PersonalProfile] dto.birthDate:', dto.birthDate, '→ nullableDate:', nullableDate(dto.birthDate));
            console.log('[PersonalProfile] dto.ssn:', dto.ssn, '→ ssnLast4:', ssnLast4(dto.ssn));
            if (epExists.length > 0) {
                await manager.query(`
          UPDATE dbo.EmployeeProfile
          SET DateOfBirth   = @0,
              SSNLast4      = @1,
              MiddleName    = @2,
              PersonalEmail = @3,
              UpdatedBy     = @4,
              UpdatedAt     = SYSUTCDATETIME()
          WHERE ContactID = @5
          `, [
                    nullableDate(dto.birthDate),
                    ssnLast4(dto.ssn),
                    nullableText(dto.middleName),
                    nullableText(dto.personalEmail),
                    modifiedBy,
                    current.contactId,
                ]);
            }
            else {
                await manager.query(`
          INSERT INTO dbo.EmployeeProfile
            (ContactID, DateOfBirth, SSNLast4, MiddleName, PersonalEmail, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
          VALUES
            (@0, @1, @2, @3, @4, @5, SYSUTCDATETIME(), @5, SYSUTCDATETIME())
          `, [
                    current.contactId,
                    nullableDate(dto.birthDate),
                    ssnLast4(dto.ssn),
                    nullableText(dto.middleName),
                    nullableText(dto.personalEmail),
                    modifiedBy,
                ]);
            }
            const hasHomeAddressFields = dto.homeStreet != null ||
                dto.homeAddress2 != null ||
                dto.homeCity != null ||
                dto.homeState != null ||
                dto.homePostalCode != null ||
                dto.homeCountry != null;
            if (hasHomeAddressFields) {
                if (current.homeAddressId) {
                    await manager.query(`
            UPDATE dbo.Address
            SET AddressLine1  = @0,
                AddressLine2  = @1,
                City          = @2,
                StateProvince = @3,
                PostalCode    = @4,
                Country       = @5
            WHERE AddressID = @6
            `, [
                        cleanText(dto.homeStreet) || current.homeStreet || '',
                        nullableText(dto.homeAddress2),
                        cleanText(dto.homeCity) || current.homeCity || '',
                        cleanText(dto.homeState) || current.homeState || '',
                        cleanText(dto.homePostalCode) || current.homePostalCode || '',
                        cleanText(dto.homeCountry) || current.homeCountry || '',
                        current.homeAddressId,
                    ]);
                }
                else {
                    const street = cleanText(dto.homeStreet) || '';
                    const city = cleanText(dto.homeCity) || '';
                    const state = cleanText(dto.homeState) || '';
                    const postalCode = cleanText(dto.homePostalCode) || '';
                    const country = cleanText(dto.homeCountry) || '';
                    const address2 = nullableText(dto.homeAddress2);
                    const existingAddr = await manager.query(`SELECT TOP 1 AddressID AS addressId FROM dbo.Address
             WHERE AddressLine1 = @0 AND City = @1 AND StateProvince = @2 AND Country = @3 AND PostalCode = @4`, [street, city, state, country, postalCode]);
                    let newAddressId = null;
                    if (existingAddr.length > 0) {
                        newAddressId = readNumber(existingAddr[0], 'addressId', 'AddressID');
                        if (newAddressId) {
                            await manager.query(`UPDATE dbo.Address SET AddressLine2 = @0 WHERE AddressID = @1`, [address2, newAddressId]);
                        }
                    }
                    else {
                        const addrRows = await manager.query(`
              INSERT INTO dbo.Address (AddressLine1, AddressLine2, City, StateProvince, PostalCode, Country)
              OUTPUT INSERTED.AddressID AS addressId
              VALUES (@0, @1, @2, @3, @4, @5)
              `, [street, address2, city, state, postalCode, country]);
                        newAddressId = readNumber(addrRows[0], 'addressId', 'AddressID');
                    }
                    if (newAddressId) {
                        await manager.query(`UPDATE dbo.EmployeeProfile SET HomeAddressID = @0 WHERE ContactID = @1`, [newAddressId, current.contactId]);
                    }
                }
            }
            const hasEmergencyFields = dto.emergencyFirstName != null ||
                dto.emergencyLastName != null ||
                dto.emergencyEmail != null ||
                dto.emergencyCellPhone != null;
            if (hasEmergencyFields) {
                console.log('[PersonalProfile] emergencyContactId:', current.emergencyContactId);
                console.log('[PersonalProfile] emergency payload:', { firstName: dto.emergencyFirstName, lastName: dto.emergencyLastName, email: dto.emergencyEmail, cellPhone: dto.emergencyCellPhone });
                if (current.emergencyContactId) {
                    await manager.query(`
            UPDATE dbo.EmergencyContact
            SET FullName    = @0,
                Email       = @1,
                PhoneNumber = @2,
                UpdatedBy   = @3,
                UpdatedAt   = SYSUTCDATETIME()
            WHERE EmergencyContactID = @4
            `, [
                        [cleanText(dto.emergencyFirstName) || current.emergencyFirstName || '', cleanText(dto.emergencyLastName) || current.emergencyLastName || ''].filter(Boolean).join(' '),
                        nullableText(dto.emergencyEmail),
                        nullableText(dto.emergencyCellPhone),
                        modifiedBy,
                        current.emergencyContactId,
                    ]);
                }
                else {
                    const rows = await manager.query(`
            INSERT INTO dbo.EmergencyContact
              (ContactID, FullName, Email, PhoneNumber, IsPrimary, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
            OUTPUT INSERTED.EmergencyContactID AS emergencyContactId
            VALUES (@0, @1, @2, @3, 1, @4, SYSUTCDATETIME(), @4, SYSUTCDATETIME())
            `, [
                        current.contactId,
                        [cleanText(dto.emergencyFirstName) || '', cleanText(dto.emergencyLastName) || ''].filter(Boolean).join(' '),
                        nullableText(dto.emergencyEmail),
                        nullableText(dto.emergencyCellPhone),
                        modifiedBy,
                    ]);
                    void rows;
                }
            }
        });
        return this.loadPersonalProfile(email);
    }
    async loadPersonalProfile(email) {
        const hasEpTable = await this.tableExists('EmployeeProfile');
        const hasEcTable = await this.tableExists('EmergencyContact');
        let epJoin = '';
        let epSelect = "CAST('' AS nvarchar(100)) AS middleName, CAST('' AS nvarchar(254)) AS personalEmail, CAST(NULL AS date) AS birthDate, CAST('' AS nvarchar(20)) AS ssn, CAST(NULL AS int) AS homeAddressId";
        if (hasEpTable) {
            epJoin =
                'LEFT JOIN dbo.EmployeeProfile ep ON ep.ContactID = c.ContactID LEFT JOIN dbo.Address ha ON ha.AddressID = ep.HomeAddressID';
            epSelect =
                "COALESCE(ep.MiddleName, '') AS middleName, COALESCE(ep.PersonalEmail, '') AS personalEmail, ep.DateOfBirth AS birthDate, COALESCE(ep.SSNLast4, '') AS ssn, ep.HomeAddressID AS homeAddressId";
        }
        let ecJoin = '';
        let ecSelect = "CAST(NULL AS int) AS emergencyContactId, CAST('' AS nvarchar(100)) AS emergencyFirstName, CAST('' AS nvarchar(100)) AS emergencyLastName, CAST('' AS nvarchar(254)) AS emergencyEmail, CAST('' AS nvarchar(30)) AS emergencyCellPhone";
        if (hasEcTable) {
            ecJoin =
                'LEFT JOIN dbo.EmergencyContact ec ON ec.ContactID = c.ContactID';
            ecSelect =
                "ec.EmergencyContactID AS emergencyContactId, " +
                    "COALESCE(LEFT(ec.FullName, CASE WHEN CHARINDEX(' ', ec.FullName) > 0 THEN CHARINDEX(' ', ec.FullName) - 1 ELSE LEN(ec.FullName) END), '') AS emergencyFirstName, " +
                    "COALESCE(CASE WHEN CHARINDEX(' ', ec.FullName) > 0 THEN SUBSTRING(ec.FullName, CHARINDEX(' ', ec.FullName) + 1, LEN(ec.FullName)) ELSE '' END, '') AS emergencyLastName, " +
                    "COALESCE(ec.Email, '') AS emergencyEmail, " +
                    "COALESCE(ec.PhoneNumber, '') AS emergencyCellPhone";
        }
        const rows = await this.dataSource.query(`
      SELECT TOP 1
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        COALESCE(ci.CellPhone, '') AS cellPhone,
        ${epSelect},
        ${ecSelect},
        ${hasEpTable ? "COALESCE(ha.AddressLine1, '') AS homeStreet, COALESCE(ha.AddressLine2, '') AS homeAddress2, COALESCE(ha.City, '') AS homeCity, COALESCE(ha.StateProvince, '') AS homeState, COALESCE(ha.PostalCode, '') AS homePostalCode, COALESCE(ha.Country, '') AS homeCountry" : "CAST('' AS nvarchar(200)) AS homeStreet, CAST('' AS nvarchar(200)) AS homeAddress2, CAST('' AS nvarchar(100)) AS homeCity, CAST('' AS nvarchar(100)) AS homeState, CAST('' AS nvarchar(20)) AS homePostalCode, CAST('' AS nvarchar(100)) AS homeCountry"}
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      ${epJoin}
      ${ecJoin}
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `, [email]);
        if (rows.length === 0) {
            throw new common_1.NotFoundException(`No internal employee profile found for ${email}. Run Entra → EMS sync first.`);
        }
        const r = rows[0];
        return {
            contactId: readNumber(r, 'contactId', 'ContactID') ?? 0,
            contactInfoId: readNumber(r, 'contactInfoId', 'ContactInfoID') ?? 0,
            firstName: readString(r, 'firstName', 'FirstName'),
            lastName: readString(r, 'lastName', 'LastName'),
            email: readString(r, 'email', 'Email'),
            cellPhone: readString(r, 'cellPhone', 'CellPhone'),
            middleName: readString(r, 'middleName', 'MiddleName'),
            personalEmail: readString(r, 'personalEmail', 'PersonalEmail'),
            birthDate: readDateString(r, 'birthDate', 'BirthDate'),
            ssn: readString(r, 'ssn', 'SSN'),
            homeAddressId: readNumber(r, 'homeAddressId', 'HomeAddressID'),
            homeStreet: readString(r, 'homeStreet'),
            homeAddress2: readString(r, 'homeAddress2'),
            homeCity: readString(r, 'homeCity'),
            homeState: readString(r, 'homeState'),
            homePostalCode: readString(r, 'homePostalCode'),
            homeCountry: readString(r, 'homeCountry'),
            emergencyContactId: readNumber(r, 'emergencyContactId', 'EmergencyContactID'),
            emergencyFirstName: readString(r, 'emergencyFirstName'),
            emergencyLastName: readString(r, 'emergencyLastName'),
            emergencyEmail: readString(r, 'emergencyEmail'),
            emergencyCellPhone: readString(r, 'emergencyCellPhone'),
        };
    }
    async tableExists(tableName) {
        const rows = await this.dataSource.query(`
      SELECT 1 AS found
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0
      `, [tableName]);
        return rows.length > 0;
    }
};
exports.EmployeeProfileService = EmployeeProfileService;
exports.EmployeeProfileService = EmployeeProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext])
], EmployeeProfileService);
function normalizeEmail(value) {
    const email = cleanText(value).toLowerCase();
    return email.includes('@') ? email : '';
}
function cleanText(value) {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ');
}
function nullableText(value) {
    const cleaned = cleanText(value);
    return cleaned || null;
}
function ssnLast4(value) {
    const cleaned = cleanText(value)?.replace(/\D/g, '');
    if (!cleaned)
        return null;
    return cleaned.slice(-4);
}
function nullableDate(value) {
    if (!value)
        return null;
    const cleaned = cleanText(value);
    if (!cleaned)
        return null;
    const d = new Date(cleaned);
    if (isNaN(d.getTime()))
        return null;
    return d.toISOString().slice(0, 10);
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
function readDateString(row, ...keys) {
    if (!row)
        return null;
    for (const key of keys) {
        const value = row[key];
        if (value === null || value === undefined)
            continue;
        if (value instanceof Date) {
            if (isNaN(value.getTime()))
                return null;
            const y = value.getFullYear();
            const m = String(value.getMonth() + 1).padStart(2, '0');
            const d = String(value.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const str = String(value).trim();
        if (!str)
            continue;
        const parsed = new Date(str + 'T00:00:00');
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }
    return null;
}
//# sourceMappingURL=employee-profile.service.js.map