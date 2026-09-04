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
const entra_profile_sync_service_1 = require("./entra-profile-sync.service");
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
    entraProfileSyncService;
    constructor(dataSource, auditContext, healthInsuranceService, experienceService, certificationsService, adminUsersService, entraProfileSyncService) {
        this.dataSource = dataSource;
        this.auditContext = auditContext;
        this.healthInsuranceService = healthInsuranceService;
        this.experienceService = experienceService;
        this.certificationsService = certificationsService;
        this.adminUsersService = adminUsersService;
        this.entraProfileSyncService = entraProfileSyncService;
    }
    async getMyFullProfile() {
        const emails = this.signedInEmailCandidates();
        if (emails.length === 0)
            return { linked: false };
        const base = await this.resolveInternalContact(emails);
        if (!base)
            return { linked: false };
        const isAdmin = await this.isAccessLevelAdmin(base.contactId);
        return this.buildFullProfile(base, { isSelf: true, isAdmin });
    }
    getSignedInEmail() {
        const emails = this.signedInEmailCandidates();
        if (emails.length === 0) {
            throw new Error('Signed-in user email was not found.');
        }
        return emails[0];
    }
    async isSignedInUserAdmin() {
        const emails = this.signedInEmailCandidates();
        if (emails.length === 0)
            return false;
        const base = await this.resolveInternalContact(emails);
        if (!base)
            return false;
        return this.isAccessLevelAdmin(base.contactId);
    }
    async updateMyProfile(dto) {
        const emails = this.signedInEmailCandidates();
        if (emails.length === 0)
            throw new Error('Signed-in user email was not found.');
        const base = await this.resolveInternalContact(emails);
        if (!base)
            throw new Error('Employee profile not found for the signed-in user.');
        const isAdmin = await this.isAccessLevelAdmin(base.contactId);
        const safeDto = isAdmin ? dto : this.stripAdminOnlyFields(dto);
        return this.applyProfileUpdate(base, safeDto);
    }
    async updateEmployeeProfile(targetContactId, dto) {
        const viewerEmails = this.signedInEmailCandidates();
        if (viewerEmails.length === 0)
            throw new Error('Signed-in user email was not found.');
        const viewer = await this.resolveInternalContact(viewerEmails);
        if (!viewer)
            throw new Error('Viewer profile not found.');
        const isAdmin = await this.isAccessLevelAdmin(viewer.contactId);
        if (!isAdmin)
            throw new Error('Only Administrators can edit other employee profiles.');
        const target = await this.resolveInternalContactById(targetContactId);
        if (!target)
            throw new Error('Target employee not found.');
        return this.applyProfileUpdate(target, dto);
    }
    async applyProfileUpdate(base, dto) {
        const { contactId, contactInfoId, contactAssignmentId } = base;
        if (dto.cellPhone !== undefined || dto.workPhone !== undefined) {
            const sets = [];
            const params = [];
            let idx = 0;
            if (dto.cellPhone !== undefined) {
                sets.push(`CellPhone = @${idx}`);
                params.push(dto.cellPhone);
                idx++;
            }
            if (dto.workPhone !== undefined) {
                sets.push(`WorkPhone = @${idx}`);
                params.push(dto.workPhone);
                idx++;
            }
            params.push(contactInfoId);
            await this.dataSource.query(`UPDATE dbo.ContactInfo SET ${sets.join(', ')} WHERE ContactInfoID = @${idx}`, params);
        }
        if (dto.workstation !== undefined) {
            if (await this.tableExists('EmployeeProfile')) {
                const exists = await this.dataSource.query(`SELECT 1 AS found FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
                if (exists.length > 0) {
                    await this.dataSource.query(`UPDATE dbo.EmployeeProfile SET Workstation = @0 WHERE ContactID = @1`, [dto.workstation, contactId]);
                }
                else {
                    await this.dataSource.query(`INSERT INTO dbo.EmployeeProfile (ContactID, Workstation) VALUES (@0, @1)`, [contactId, dto.workstation]);
                }
            }
        }
        if (dto.workAuthorizationLinkUrl !== undefined) {
            const workAuthLinkColumn = await this.getWorkAuthorizationLinkColumn();
            if (await this.tableExists('EmployeeProfile') && workAuthLinkColumn) {
                const linkId = await this.upsertWorkAuthLink(dto.workAuthorizationLinkUrl, contactId);
                const exists = await this.dataSource.query(`SELECT 1 AS found FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
                if (exists.length > 0) {
                    await this.dataSource.query(`UPDATE dbo.EmployeeProfile SET ${workAuthLinkColumn} = @0 WHERE ContactID = @1`, [linkId, contactId]);
                }
                else {
                    await this.dataSource.query(`INSERT INTO dbo.EmployeeProfile (ContactID, ${workAuthLinkColumn}) VALUES (@0, @1)`, [contactId, linkId]);
                }
            }
        }
        if (dto.homeAddress) {
            await this.upsertHomeAddress(contactId, dto.homeAddress);
        }
        if (dto.emergencyContacts !== undefined) {
            await this.replaceEmergencyContacts(contactId, dto.emergencyContacts);
        }
        if (dto.deskPhoneExtensionId !== undefined) {
            if (dto.deskPhoneExtensionId) {
                const extInUse = await this.dataSource.query(`SELECT ci.FirstName + ' ' + ci.LastName AS AssignedTo
           FROM dbo.EmployeePhoneExtension epe
           INNER JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = epe.ContactAssignmentID
           INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
           INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
           WHERE epe.ExtensionID = @0 AND epe.IsCurrent = 1 AND epe.ContactAssignmentID <> @1`, [dto.deskPhoneExtensionId, contactAssignmentId]);
                if (extInUse.length > 0) {
                    const name = readString(extInUse[0], 'AssignedTo');
                    throw new common_1.BadRequestException(`This phone extension is already assigned to ${name || 'another employee'}.`);
                }
            }
            await this.dataSource.query(`UPDATE dbo.EmployeePhoneExtension SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date)
         WHERE ContactAssignmentID = @0 AND IsCurrent = 1`, [contactAssignmentId]);
            if (dto.deskPhoneExtensionId) {
                await this.dataSource.query(`INSERT INTO dbo.EmployeePhoneExtension (ContactAssignmentID, ExtensionID, AssignedDate, IsCurrent, AssignedBy)
           VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`, [contactAssignmentId, dto.deskPhoneExtensionId, 'WMS profile update']);
            }
        }
        if (dto.deskPhoneId !== undefined) {
            if (dto.deskPhoneId) {
                const phoneInUse = await this.dataSource.query(`SELECT ci.FirstName + ' ' + ci.LastName AS AssignedTo
           FROM dbo.PhoneExtensionDevice ped
           INNER JOIN dbo.EmployeePhoneExtension epe ON epe.ExtensionID = ped.ExtensionID AND epe.IsCurrent = 1
           INNER JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = epe.ContactAssignmentID
           INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
           INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
           WHERE ped.PhoneID = @0 AND ped.IsCurrent = 1 AND epe.ContactAssignmentID <> @1`, [dto.deskPhoneId, contactAssignmentId]);
                if (phoneInUse.length > 0) {
                    const name = readString(phoneInUse[0], 'AssignedTo');
                    throw new common_1.BadRequestException(`This desk phone is already assigned to ${name || 'another employee'}.`);
                }
            }
            const activeExtRows = await this.dataSource.query(`SELECT ExtensionID FROM dbo.EmployeePhoneExtension
         WHERE ContactAssignmentID = @0 AND IsCurrent = 1`, [contactAssignmentId]);
            const activeExtId = activeExtRows.length > 0 ? readNumber(activeExtRows[0], 'ExtensionID') : null;
            if (activeExtId) {
                await this.dataSource.query(`UPDATE dbo.PhoneExtensionDevice SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date)
           WHERE ExtensionID = @0 AND IsCurrent = 1`, [activeExtId]);
                if (dto.deskPhoneId) {
                    await this.dataSource.query(`INSERT INTO dbo.PhoneExtensionDevice (ExtensionID, PhoneID, AssignedDate, IsCurrent, AssignedBy)
             VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`, [activeExtId, dto.deskPhoneId, 'WMS profile update']);
                }
            }
        }
        if (dto.pcComputerId !== undefined) {
            if (dto.pcComputerId) {
                const pcInUse = await this.dataSource.query(`SELECT ci.FirstName + ' ' + ci.LastName AS AssignedTo
           FROM dbo.EmployeeComputer ec
           INNER JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = ec.ContactAssignmentID
           INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
           INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
           WHERE ec.ComputerID = @0 AND ec.IsCurrent = 1 AND ec.ContactAssignmentID <> @1`, [dto.pcComputerId, contactAssignmentId]);
                if (pcInUse.length > 0) {
                    const name = readString(pcInUse[0], 'AssignedTo');
                    throw new common_1.BadRequestException(`This computer is already assigned to ${name || 'another employee'}.`);
                }
            }
            await this.dataSource.query(`UPDATE dbo.EmployeeComputer SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date)
         WHERE ContactAssignmentID = @0 AND IsCurrent = 1`, [contactAssignmentId]);
            if (dto.pcComputerId) {
                await this.dataSource.query(`INSERT INTO dbo.EmployeeComputer (ContactAssignmentID, ComputerID, AssignedDate, IsCurrent, AssignedBy)
           VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`, [contactAssignmentId, dto.pcComputerId, 'WMS profile update']);
            }
        }
        let entraSyncWarningCode = null;
        let entraSyncWarning = null;
        try {
            const pushResult = await this.entraProfileSyncService
                .applyEmsToEntraProfileSync(undefined, base.email);
            if (pushResult.errors > 0 || pushResult.updated === 0) {
                console.error('[WMS→Entra]', base.email, JSON.stringify(pushResult.rows.map(r => ({ status: r.status, error: r.error, changes: r.changes.length }))));
            }
            const syncErrors = pushResult.rows
                .map((row) => row.error)
                .filter((message) => Boolean(message));
            if (syncErrors.some((message) => this.isEntraPermissionRestrictedMessage(message))) {
                const reason = this.formatEntraSyncReason();
                entraSyncWarningCode = 'permissionRestricted';
                entraSyncWarning = `Data saved in database, but not updated in Entra. Reason: ${reason}`;
            }
            else if (syncErrors.length > 0) {
                entraSyncWarningCode = 'syncFailed';
                entraSyncWarning = `Data saved in database, but not updated in Entra. Reason: ${this.formatEntraSyncReason()}`;
            }
        }
        catch (err) {
            console.error('[WMS→Entra] Exception for', base.email, err?.message ?? err);
            const errText = err?.message ?? String(err ?? 'Unknown error');
            if (this.isEntraPermissionRestrictedMessage(errText)) {
                const reason = this.formatEntraSyncReason();
                entraSyncWarningCode = 'permissionRestricted';
                entraSyncWarning = `Data saved in database, but not updated in Entra. Reason: ${reason}`;
            }
            else {
                entraSyncWarningCode = 'syncFailed';
                entraSyncWarning = `Data saved in database, but not updated in Entra. Reason: ${this.formatEntraSyncReason()}`;
            }
        }
        if (entraSyncWarning) {
            return {
                success: true,
                entraSyncWarningCode: entraSyncWarningCode ?? 'syncFailed',
                entraSyncWarning,
            };
        }
        return { success: true };
    }
    isEntraPermissionRestrictedMessage(error) {
        const text = typeof error === 'string'
            ? error
            : error instanceof Error
                ? error.message
                : String(error ?? '');
        return /403|forbidden|insufficient privileges|authorization_requestdenied|user administrator|permission/i.test(text);
    }
    formatEntraSyncReason() {
        return 'Entra denied this profile update. Likely causes: missing Graph permission/consent, Guest/B2B account, or protected admin account.';
    }
    async upsertHomeAddress(contactId, addr) {
        if (!(await this.tableExists('EmployeeProfile')))
            return;
        const line1 = addr.line1 ?? '';
        const line2 = addr.line2 ?? '';
        const city = addr.city ?? '';
        const stateProvince = addr.stateProvince ?? '';
        const postalCode = addr.postalCode ?? '';
        const country = addr.country ?? '';
        const matchRows = await this.dataSource.query(`SELECT TOP 1 AddressID FROM dbo.Address
       WHERE COALESCE(AddressLine1, '') = @0
         AND COALESCE(AddressLine2, '') = @1
         AND COALESCE(City, '') = @2
         AND COALESCE(StateProvince, '') = @3
         AND COALESCE(PostalCode, '') = @4
         AND COALESCE(Country, '') = @5`, [line1, line2, city, stateProvince, postalCode, country]);
        let addressId = matchRows?.[0]?.AddressID;
        if (!addressId) {
            const insertResult = await this.dataSource.query(`INSERT INTO dbo.Address (AddressLine1, AddressLine2, City, StateProvince, PostalCode, Country) OUTPUT INSERTED.AddressID VALUES (@0, @1, @2, @3, @4, @5)`, [line1, line2, city, stateProvince, postalCode, country]);
            addressId = insertResult[0]?.AddressID;
        }
        if (addressId) {
            const profileRows = await this.dataSource.query(`SELECT HomeAddressID FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
            const profileRow = profileRows[0];
            if (profileRow) {
                await this.dataSource.query(`UPDATE dbo.EmployeeProfile SET HomeAddressID = @0 WHERE ContactID = @1`, [addressId, contactId]);
            }
            else {
                await this.dataSource.query(`INSERT INTO dbo.EmployeeProfile (ContactID, HomeAddressID) VALUES (@0, @1)`, [contactId, addressId]);
            }
        }
    }
    async replaceEmergencyContacts(contactId, contacts) {
        if (!(await this.tableExists('EmergencyContact')))
            return;
        await this.dataSource.query(`DELETE FROM dbo.EmergencyContact WHERE ContactID = @0`, [contactId]);
        for (const c of contacts) {
            await this.dataSource.query(`INSERT INTO dbo.EmergencyContact (ContactID, FullName, PhoneNumber, Email, IsPrimary) VALUES (@0, @1, @2, @3, @4)`, [contactId, c.fullName, c.phoneNumber, c.email, c.isPrimary ? 1 : 0]);
        }
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
        let workAuthLinkUrl = '';
        const workAuthLinkColumn = hasEmployeeProfile ? await this.getWorkAuthorizationLinkColumn() : null;
        if (workAuthLinkColumn) {
            const walLinkId = readNumber(profileRow, workAuthLinkColumn);
            if (walLinkId) {
                const linkRows = await this.dataSource.query(`SELECT TOP 1 LinkURL FROM dbo.Link WHERE LinkID = @0`, [walLinkId]);
                workAuthLinkUrl = linkRows?.[0]?.LinkURL ?? '';
            }
        }
        const homeAddress = await this.loadAddress(readNumber(profileRow, 'HomeAddressID'));
        const officeAddress = await this.loadAddress(readNumber(profileRow, 'OfficeAddressID'));
        const emergencyContacts = await this.loadEmergencyContacts(contactId);
        const equipment = await this.loadEquipment(contactAssignmentId);
        const healthInsurance = await this.safe(() => this.healthInsuranceService.getHealthInsuranceByContactId(base.contactId));
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
            isAdmin: viewer.isAdmin,
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
                department2: readString(profileRow, 'Department2'),
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
                title: readString(profileRow, 'JobTitle') || entraJob.title,
                office: readString(profileRow, 'Office') || entraJob.office,
                accessLevel: readString(profileRow, 'AccessLevel'),
                workAuthorization: readString(profileRow, 'WorkAuthorization'),
                workAuthorizationLinkUrl: workAuthLinkUrl,
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
                departmentRank: readString(profileRow, 'DepartmentRank'),
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
                workAuthorizationLinkUrl: '',
                startDate: null,
                yearsOfService: '',
                hireDate: null,
                terminationDate: null,
                employmentStatus: '',
                employmentType: '',
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
                currentExtensionId: null,
                currentPhoneId: null,
                currentComputerId: null,
            },
            entra: { microsoftOfficeLicenses: [], microsoftGroups: [] },
            healthInsurance: null,
            experience: null,
            certifications: null,
        };
    }
    stripAdminOnlyFields(dto) {
        return {
            cellPhone: dto.cellPhone,
            workPhone: dto.workPhone,
            workstation: dto.workstation,
            deskPhoneExtensionId: dto.deskPhoneExtensionId,
        };
    }
    async isAccessLevelAdmin(contactId) {
        if (!(await this.tableExists('EmployeeProfile')))
            return false;
        const rows = (await this.dataSource.query(`SELECT TOP 1 AccessLevel FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]));
        const accessLevel = readString(rows[0], 'AccessLevel').toLowerCase();
        return accessLevel === 'administrator' || accessLevel === 'admin' || accessLevel === 'super admin';
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
            currentExtensionId: null,
            currentPhoneId: null,
            currentComputerId: null,
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
        COALESCE(eqc.PCName, '') AS pcWindowsName,
        epe.ExtensionID AS currentExtensionId,
        ped.PhoneID AS currentPhoneId,
        ec.ComputerID AS currentComputerId
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
            currentExtensionId: readNumber(r, 'currentExtensionId') ?? null,
            currentPhoneId: readNumber(r, 'currentPhoneId') ?? null,
            currentComputerId: readNumber(r, 'currentComputerId') ?? null,
        };
    }
    async tableExists(tableName) {
        const rows = await this.dataSource.query(`SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`, [tableName]);
        return rows.length > 0;
    }
    async hasColumn(tableName, columnName) {
        const rows = await this.dataSource.query(`SELECT 1 AS found FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0 AND COLUMN_NAME = @1`, [tableName, columnName]);
        return rows.length > 0;
    }
    async getWorkAuthorizationLinkColumn() {
        if (await this.hasColumn('EmployeeProfile', 'WorkAuthorizationLinkId'))
            return 'WorkAuthorizationLinkId';
        if (await this.hasColumn('EmployeeProfile', 'WorthAuthorizationLinkId'))
            return 'WorthAuthorizationLinkId';
        if (await this.hasColumn('EmployeeProfile', 'wrokAuthorizationlickid'))
            return 'wrokAuthorizationlickid';
        return null;
    }
    async upsertWorkAuthLink(url, contactId) {
        const trimmed = url?.trim() || null;
        if (!trimmed)
            return null;
        const workAuthLinkColumn = await this.getWorkAuthorizationLinkColumn();
        let existingLinkId = null;
        if (workAuthLinkColumn) {
            const epRows = await this.dataSource.query(`SELECT TOP 1 ${workAuthLinkColumn} FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
            existingLinkId = readNumber(epRows?.[0], workAuthLinkColumn);
        }
        if (existingLinkId) {
            await this.dataSource.query(`UPDATE dbo.Link SET LinkURL = @0, LinkPath = @1 WHERE LinkID = @2`, [trimmed, trimmed.slice(0, 1024), existingLinkId]);
            return existingLinkId;
        }
        const existing = await this.dataSource.query(`SELECT TOP 1 LinkID FROM dbo.Link WHERE LinkURL = @0`, [trimmed]);
        if (existing?.length > 0) {
            return existing[0].LinkID;
        }
        const result = await this.dataSource.query(`INSERT INTO dbo.Link (LinkType, LinkURL, LinkName, LinkPath) OUTPUT INSERTED.LinkID VALUES (N'URL', @0, N'Work Authorization Photos', @1)`, [trimmed, trimmed.slice(0, 1024)]);
        return result?.[0]?.LinkID;
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
        admin_users_service_1.AdminUsersService,
        entra_profile_sync_service_1.EntraProfileSyncService])
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