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
exports.SelfProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_request_context_service_1 = require("../audit/audit-request-context.service");
const admin_users_service_1 = require("./admin-users.service");
const employee_experience_service_1 = require("./employee-experience.service");
const employee_health_insurance_service_1 = require("./employee-health-insurance.service");
const employee_certifications_service_1 = require("./employee-certifications.service");
const STATIC_DESK_PHONE_NUMBER = '(312) 274-1800';
let SelfProfileService = class SelfProfileService {
    dataSource;
    auditContext;
    healthInsuranceService;
    experienceService;
    certificationsService;
    adminUsersService;
    constructor(dataSource, auditContext, healthInsuranceService, experienceService, certificationsService, adminUsersService) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
        this.healthInsuranceService = healthInsuranceService;
        this.experienceService = experienceService;
        this.certificationsService = certificationsService;
        this.adminUsersService = adminUsersService;
    }
    async getMyFullProfile() {
        const emails = this.signedInEmailCandidates();
        if (emails.length === 0)
            return { linked: false };
        const base = await this.resolveInternalContact(emails);
        if (!base)
            return { linked: false };
        return this.buildFullProfile(base, { isSelf: true, isAdmin: true });
    }
    async getEmployeeProfileForViewer(targetContactId) {
        if (!Number.isFinite(targetContactId) || targetContactId <= 0) {
            return { linked: false };
        }
        const target = await this.resolveInternalContactById(targetContactId);
        if (!target)
            return { linked: false };
        const viewerEmails = this.signedInEmailCandidates();
        const viewer = viewerEmails.length
            ? await this.resolveInternalContact(viewerEmails)
            : null;
        const isSelf = viewer?.contactId === target.contactId;
        const isAdmin = isSelf
            ? true
            : viewer
                ? await this.isAccessLevelAdmin(viewer.contactId)
                : false;
        return this.buildFullProfile(target, { isSelf: Boolean(isSelf), isAdmin });
    }
    async buildFullProfile(base, viewer) {
        const { contactId, contactAssignmentId } = base;
        const hasEmployeeProfile = await this.tableExists('EmployeeProfile');
        const profileRow = hasEmployeeProfile
            ? (await this.dataSource.query(`SELECT TOP 1 * FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]))[0]
            : undefined;
        const homeAddress = await this.loadAddress(readNumber(profileRow, 'HomeAddressID'));
        const officeAddress = await this.loadAddress(readNumber(profileRow, 'OfficeAddressID'));
        const emergencyContacts = await this.loadEmergencyContacts(contactId);
        const equipment = await this.loadEquipment(contactAssignmentId);
        const healthInsurance = await this.safe(() => this.healthInsuranceService.getHealthInsurance(base.email));
        const experience = await this.safe(() => this.experienceService.getExperience(base.email));
        const certifications = await this.safe(() => this.certificationsService.getCertifications(base.email));
        const entraJob = viewer.isSelf
            ? await this.loadEntraJobInfo()
            : { title: base.role, office: '' };
        const microsoftOfficeLicenses = (await this.safe(() => this.adminUsersService.getUserLicenses(base.email))) ?? [];
        const microsoftGroups = (await this.safe(() => this.adminUsersService.getUserGroups(base.email))) ??
            [];
        const dateOfBirth = readDateString(profileRow, 'DateOfBirth');
        const startDate = readDateString(profileRow, 'StartDate');
        const profile = {
            linked: true,
            visibility: viewer.isSelf || viewer.isAdmin ? 'full' : 'limited',
            identity: {
                contactId,
                contactInfoId: base.contactInfoId,
                contactAssignmentId,
            },
            basics: {
                firstName: base.firstName,
                middleName: readString(profileRow, 'MiddleName'),
                lastName: base.lastName,
                email: base.email,
                personalEmail: readString(profileRow, 'PersonalEmail'),
                cellPhone: base.cellPhone,
                workPhone: base.workPhone,
                department: base.department,
                role: base.role,
                company: base.company,
            },
            personal: {
                dateOfBirth,
                age: computeAge(dateOfBirth),
                gender: readString(profileRow, 'Gender'),
                maritalStatus: readString(profileRow, 'MaritalStatus'),
                ethnicity: readString(profileRow, 'Ethnicity'),
                ssnLast4: readString(profileRow, 'SSNLast4'),
            },
            homeAddress,
            emergencyContacts,
            employment: {
                title: entraJob.title,
                office: entraJob.office,
                accessLevel: readString(profileRow, 'AccessLevel'),
                workAuthorization: readString(profileRow, 'WorkAuthorization'),
                startDate,
                yearsOfService: computeYearsOfService(startDate),
                hireDate: readDateString(profileRow, 'HireDate'),
                terminationDate: readDateString(profileRow, 'TerminationDate'),
                employmentStatus: readString(profileRow, 'EmploymentStatus'),
                employmentType: readString(profileRow, 'EmploymentType'),
                payType: readString(profileRow, 'PayType'),
                payRate: readString(profileRow, 'PayRate'),
                supervisor: readString(profileRow, 'Supervisor'),
                ptoAccrualRate: readString(profileRow, 'PTOAccrualRate'),
                employmentAgreement: readString(profileRow, 'EmploymentAgreement'),
                rampAccount: readString(profileRow, 'RampAccount'),
                rampCreditCard: readString(profileRow, 'RampCreditCard'),
                workstation: readString(profileRow, 'Workstation'),
            },
            officeAddress,
            equipment: { deskPhoneNumber: STATIC_DESK_PHONE_NUMBER, ...equipment },
            entra: { microsoftOfficeLicenses, microsoftGroups },
            healthInsurance,
            experience,
            certifications,
        };
        return this.applyVisibility(profile, viewer);
    }
    applyVisibility(profile, viewer) {
        if (viewer.isSelf || viewer.isAdmin)
            return profile;
        return {
            ...profile,
            basics: { ...profile.basics, personalEmail: '' },
            personal: {
                ...profile.personal,
                age: null,
                ssnLast4: '',
                gender: '',
                maritalStatus: '',
                ethnicity: '',
            },
            homeAddress: null,
            emergencyContacts: [],
            employment: {
                ...profile.employment,
                accessLevel: '',
                workAuthorization: '',
                payType: '',
                payRate: '',
                ptoAccrualRate: '',
                employmentAgreement: '',
                rampAccount: '',
                rampCreditCard: '',
            },
            equipment: {
                ...profile.equipment,
                deskPhoneMac: '',
                deskPhoneBrand: '',
                deskPhoneModel: '',
                pcBrand: '',
                pcModel: '',
                pcServiceTag: '',
                bluetoothStatus: '',
                pcWindowsName: '',
            },
            entra: { ...profile.entra, microsoftOfficeLicenses: [] },
            healthInsurance: null,
        };
    }
    async isAccessLevelAdmin(contactId) {
        if (!(await this.tableExists('EmployeeProfile')))
            return false;
        const rows = (await this.dataSource.query(`SELECT TOP 1 AccessLevel FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]));
        const accessLevel = readString(rows[0], 'AccessLevel').toLowerCase();
        return accessLevel === 'administrator' || accessLevel === 'super admin';
    }
    async safe(fn) {
        try {
            return await fn();
        }
        catch {
            return null;
        }
    }
    async loadEntraJobInfo() {
        const token = this.auditContext.getGraphAccessToken();
        if (!token)
            return { title: '', office: '' };
        try {
            const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=jobTitle,officeLocation', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok)
                return { title: '', office: '' };
            const data = (await res.json());
            return {
                title: String(data.jobTitle ?? '').trim(),
                office: String(data.officeLocation ?? '').trim(),
            };
        }
        catch {
            return { title: '', office: '' };
        }
    }
    signedInEmailCandidates() {
        return Array.from(new Set(this.auditContext
            .getUserEmailCandidates()
            .map(normalizeEmail)
            .filter(Boolean)));
    }
    async resolveInternalContact(emails) {
        if (emails.length === 0)
            return null;
        const placeholders = emails.map((_, index) => `@${index}`).join(', ');
        return this.resolveContactByWhere(`LOWER(LTRIM(RTRIM(ci.Email))) IN (${placeholders})`, emails);
    }
    async resolveInternalContactById(contactId) {
        return this.resolveContactByWhere('c.ContactID = @0', [contactId]);
    }
    async resolveContactByWhere(whereClause, params) {
        const rows = await this.dataSource.query(`
      SELECT TOP 1
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ca.ContactAssignmentID AS contactAssignmentId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        COALESCE(ci.CellPhone, '') AS cellPhone,
        COALESCE(ci.WorkPhone, '') AS workPhone,
        COALESCE(d.DepartmentName, '') AS department,
        COALESCE(r.RoleName, '') AS role,
        COALESCE(co.CompanyName, '') AS company
      FROM dbo.ContactAssignment ca
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      LEFT JOIN dbo.Department d ON d.DepartmentID = ca.DepartmentID
      LEFT JOIN dbo.Role r ON r.RoleID = ca.RoleID
      WHERE ${whereClause}
      ORDER BY ca.ContactAssignmentID
      `, params);
        const r = rows[0];
        if (!r)
            return null;
        const contactId = readNumber(r, 'contactId');
        if (contactId == null)
            return null;
        return {
            contactId,
            contactInfoId: readNumber(r, 'contactInfoId') ?? 0,
            contactAssignmentId: readNumber(r, 'contactAssignmentId') ?? 0,
            firstName: readString(r, 'firstName'),
            lastName: readString(r, 'lastName'),
            email: readString(r, 'email'),
            cellPhone: readString(r, 'cellPhone'),
            workPhone: readString(r, 'workPhone'),
            department: readString(r, 'department'),
            role: readString(r, 'role'),
            company: readString(r, 'company'),
        };
    }
    async loadAddress(addressId) {
        if (!addressId)
            return null;
        const rows = await this.dataSource.query(`SELECT TOP 1 * FROM dbo.Address WHERE AddressID = @0`, [addressId]);
        const r = rows[0];
        if (!r)
            return null;
        const address = {
            line1: readString(r, 'AddressLine1'),
            line2: readString(r, 'AddressLine2'),
            city: readString(r, 'City'),
            stateProvince: readString(r, 'StateProvince'),
            postalCode: readString(r, 'PostalCode'),
            country: readString(r, 'Country'),
        };
        const hasAny = Object.values(address).some((value) => value !== '');
        return hasAny ? address : null;
    }
    async loadEmergencyContacts(contactId) {
        if (!(await this.tableExists('EmergencyContact')))
            return [];
        const rows = (await this.dataSource.query(`
      SELECT FullName, Relationship, PhoneNumber, Email, IsPrimary
      FROM dbo.EmergencyContact
      WHERE ContactID = @0
      ORDER BY IsPrimary DESC, EmergencyContactID
      `, [contactId]));
        return rows.map((r) => ({
            fullName: readString(r, 'FullName'),
            relationship: readString(r, 'Relationship'),
            phoneNumber: readString(r, 'PhoneNumber'),
            email: readString(r, 'Email'),
            isPrimary: Boolean(r['IsPrimary']),
        }));
    }
    async loadEquipment(contactAssignmentId) {
        const empty = {
            deskPhoneExtension: '',
            deskPhoneMac: '',
            deskPhoneBrand: '',
            deskPhoneModel: '',
            pcBrand: '',
            pcModel: '',
            pcServiceTag: '',
            bluetoothStatus: '',
            pcWindowsName: '',
        };
        if (!contactAssignmentId)
            return empty;
        const needed = [
            'EmployeePhoneExtension',
            'PhoneExtension',
            'PhoneExtensionDevice',
            'EquipmentPhone',
            'EmployeeComputer',
            'EquipmentComputer',
        ];
        for (const table of needed) {
            if (!(await this.tableExists(table)))
                return empty;
        }
        const rows = (await this.dataSource.query(`
      SELECT TOP 1
        COALESCE(pe.ExtensionNumber, '') AS deskPhoneExtension,
        COALESCE(eqp.MACAddress, '') AS deskPhoneMac,
        COALESCE(eqp.Make, '') AS deskPhoneBrand,
        COALESCE(eqp.Model, '') AS deskPhoneModel,
        COALESCE(eqc.Make, '') AS pcBrand,
        COALESCE(eqc.Model, '') AS pcModel,
        COALESCE(eqc.AssetID, '') AS pcServiceTag,
        COALESCE(eqc.BluetoothStatus, '') AS bluetoothStatus,
        COALESCE(eqc.PCName, '') AS pcWindowsName
      FROM dbo.ContactAssignment ca
      LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ContactAssignmentID = ca.ContactAssignmentID AND epe.IsCurrent = 1
      LEFT JOIN dbo.PhoneExtension pe ON pe.ExtensionID = epe.ExtensionID
      LEFT JOIN dbo.PhoneExtensionDevice ped ON ped.ExtensionID = epe.ExtensionID AND ped.IsCurrent = 1
      LEFT JOIN dbo.EquipmentPhone eqp ON eqp.PhoneID = ped.PhoneID
      LEFT JOIN dbo.EmployeeComputer ec ON ec.ContactAssignmentID = ca.ContactAssignmentID AND ec.IsCurrent = 1
      LEFT JOIN dbo.EquipmentComputer eqc ON eqc.ComputerID = ec.ComputerID
      WHERE ca.ContactAssignmentID = @0
      `, [contactAssignmentId]));
        const r = rows[0];
        if (!r)
            return empty;
        return {
            deskPhoneExtension: readString(r, 'deskPhoneExtension'),
            deskPhoneMac: readString(r, 'deskPhoneMac'),
            deskPhoneBrand: readString(r, 'deskPhoneBrand'),
            deskPhoneModel: readString(r, 'deskPhoneModel'),
            pcBrand: readString(r, 'pcBrand'),
            pcModel: readString(r, 'pcModel'),
            pcServiceTag: readString(r, 'pcServiceTag'),
            bluetoothStatus: readString(r, 'bluetoothStatus'),
            pcWindowsName: readString(r, 'pcWindowsName'),
        };
    }
    async tableExists(tableName) {
        const rows = await this.dataSource.query(`SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`, [tableName]);
        return rows.length > 0;
    }
};
exports.SelfProfileService = SelfProfileService;
exports.SelfProfileService = SelfProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        audit_request_context_service_1.AuditRequestContext,
        employee_health_insurance_service_1.EmployeeHealthInsuranceService,
        employee_experience_service_1.EmployeeExperienceService,
        employee_certifications_service_1.EmployeeCertificationsService,
        admin_users_service_1.AdminUsersService])
], SelfProfileService);
function normalizeEmail(value) {
    const email = String(value ?? '')
        .trim()
        .toLowerCase();
    return email.includes('@') ? email : '';
}
function readString(row, ...keys) {
    if (!row)
        return '';
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null) {
            return String(value).trim().replace(/\s+/g, ' ');
        }
    }
    return '';
}
function readNumber(row, ...keys) {
    if (!row)
        return null;
    for (const key of keys) {
        const value = row[key];
        if (value === undefined || value === null)
            continue;
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
            return isNaN(value.getTime()) ? null : formatLocalYmd(value);
        }
        const str = String(value).trim();
        if (!str)
            continue;
        const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(str);
        if (isoMatch)
            return isoMatch[1];
        const d = new Date(str);
        if (!isNaN(d.getTime()))
            return formatLocalYmd(d);
    }
    return null;
}
function formatLocalYmd(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function computeAge(dateOfBirth) {
    if (!dateOfBirth)
        return null;
    const dob = new Date(`${dateOfBirth}T00:00:00`);
    if (isNaN(dob.getTime()))
        return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDelta = now.getMonth() - dob.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
        age -= 1;
    }
    return age >= 0 && age < 150 ? age : null;
}
function computeYearsOfService(startDate) {
    if (!startDate)
        return '';
    const start = new Date(`${startDate}T00:00:00`);
    if (isNaN(start.getTime()))
        return '';
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate())
        months -= 1;
    if (months < 0)
        return '';
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const parts = [];
    if (years > 0)
        parts.push(`${years} year${years === 1 ? '' : 's'}`);
    parts.push(`${remMonths} month${remMonths === 1 ? '' : 's'}`);
    return parts.join(' ');
}
//# sourceMappingURL=self-profile.service.js.map