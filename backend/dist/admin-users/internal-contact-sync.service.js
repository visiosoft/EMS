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
exports.InternalContactSyncService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const admin_users_constants_1 = require("./admin-users.constants");
const admin_users_service_1 = require("./admin-users.service");
const DEFAULT_INTERNAL_ROLE_NAME = 'Unknown';
const DEFAULT_DEPARTMENT_NAME = 'Unknown';
const SYNC_AUDIT_USER = 'Entra manual sync';
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
let InternalContactSyncService = class InternalContactSyncService {
    adminUsersService;
    dataSource;
    configService;
    appGraphTokenCache = null;
    constructor(adminUsersService, dataSource, configService) {
        this.adminUsersService = adminUsersService;
        this.dataSource = dataSource;
        this.configService = configService;
    }
    async previewInternalContactSync(graphAccessToken) {
        return this.previewEntraToEmsContactSync(graphAccessToken);
    }
    async updateEntraUserByIdentifier(userIdentifier, payload, graphAccessToken) {
        const identifier = cleanText(userIdentifier);
        if (!identifier) {
            throw new common_1.BadRequestException('Microsoft Entra user identifier is required.');
        }
        const cleanedPayload = removeUndefinedValues(payload);
        if (Object.keys(cleanedPayload).length === 0)
            return;
        const delegatedToken = cleanText(graphAccessToken);
        if (delegatedToken) {
            try {
                await this.graphRequest(delegatedToken, 'PATCH', `${GRAPH_BASE_URL}/users/${encodeURIComponent(identifier)}`, cleanedPayload);
                return;
            }
            catch (error) {
                if (!isGraphAuthorizationDenied(error))
                    throw error;
            }
        }
        await this.graphRequest(await this.getGraphWriteAccessToken(), 'PATCH', `${GRAPH_BASE_URL}/users/${encodeURIComponent(identifier)}`, cleanedPayload);
    }
    async updateAndVerifyEntraUserByIdentifier(userIdentifier, payload, graphAccessToken) {
        await this.updateEntraUserByIdentifier(userIdentifier, payload, graphAccessToken);
        await this.verifyEntraUserPayload(await this.getGraphWriteAccessToken(graphAccessToken), userIdentifier, removeUndefinedValues(payload));
    }
    async applyInternalContactSync(dto, graphAccessToken) {
        return this.applyEntraToEmsContactSync(dto, graphAccessToken);
    }
    async previewEntraToEmsContactSync(graphAccessToken) {
        return (await this.buildEntraToEmsSyncModel(graphAccessToken)).preview;
    }
    async applyEntraToEmsContactSync(dto, graphAccessToken) {
        const model = await this.buildEntraToEmsSyncModel(graphAccessToken);
        const selectedActionIds = new Set(Array.isArray(dto?.selectedActionIds) ? dto.selectedActionIds : []);
        const manualMappings = Array.isArray(dto?.manualMappings)
            ? dto.manualMappings
            : [];
        const errors = [];
        const updateTargets = new Map();
        const createTargets = [];
        const removeTargets = [];
        for (const row of model.preview.rows) {
            if (!selectedActionIds.has(row.actionId))
                continue;
            if (row.type === 'remove' && row.contactId) {
                const contact = model.contactsById.get(row.contactId);
                if (contact)
                    removeTargets.push(contact);
                continue;
            }
            if (!row.entraUserId)
                continue;
            const user = model.usersById.get(row.entraUserId);
            if (!user)
                continue;
            if (row.type === 'create') {
                createTargets.push(user);
                continue;
            }
            if (row.type === 'update' && row.contactId) {
                const contact = model.contactsById.get(row.contactId);
                if (contact) {
                    updateTargets.set(`${user.id}:${contact.contactId}`, {
                        user,
                        contact,
                        selectedFields: dto?.selectedActionFields?.[row.actionId],
                    });
                }
            }
        }
        for (const mapping of manualMappings) {
            const entraUserId = cleanText(mapping?.entraUserId);
            const contactId = Number(mapping?.contactId);
            const user = entraUserId ? model.usersById.get(entraUserId) : undefined;
            const contact = Number.isFinite(contactId)
                ? model.contactsById.get(contactId)
                : undefined;
            if (!user || !contact) {
                errors.push('A selected duplicate mapping is no longer valid.');
                continue;
            }
            if (!user.accountEnabled) {
                errors.push(`${user.displayName} is disabled in Entra and was skipped.`);
                continue;
            }
            if (!normalizeEmail(user.email)) {
                errors.push(`${user.displayName} has no Entra email and was skipped.`);
                continue;
            }
            const row = model.preview.rows.find(r => r.entraUserId === user.id || r.contactId === contact.contactId);
            const actionId = row?.actionId;
            updateTargets.set(`${user.id}:${contact.contactId}`, { user, contact, selectedFields: actionId ? dto?.selectedActionFields?.[actionId] : undefined });
        }
        let created = 0;
        let updated = 0;
        let removed = 0;
        let skippedJobTitleWrites = 0;
        try {
            await this.dataSource.transaction(async (manager) => {
                for (const contact of removeTargets) {
                    await this.removeInternalCompanyAssignments(manager, model.preview.internalCompany.companyId, contact.contactId);
                    removed += 1;
                }
                for (const user of createTargets) {
                    if (!user.accountEnabled || !normalizeEmail(user.email)) {
                        errors.push(`${user.displayName} was skipped.`);
                        continue;
                    }
                    const result = await this.createInternalContactFromEntra(manager, model.preview.internalCompany.companyId, user, model.ciJobTitleAvailable, model.preview.jobTitleColumnAvailable);
                    created += 1;
                    skippedJobTitleWrites += result.skippedJobTitleWrites;
                }
                for (const { user, contact, selectedFields } of updateTargets.values()) {
                    const result = await this.updateInternalContactFromEntra(manager, model.preview.internalCompany.companyId, contact, user, model.ciJobTitleAvailable, model.preview.jobTitleColumnAvailable, selectedFields);
                    updated += 1;
                    skippedJobTitleWrites += result.skippedJobTitleWrites;
                }
            });
        }
        catch (error) {
            created = 0;
            updated = 0;
            removed = 0;
            skippedJobTitleWrites = 0;
            errors.push(`Sync failed and transaction was reverted: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return {
            appliedAt: new Date().toISOString(),
            internalCompany: model.preview.internalCompany,
            jobTitleColumnAvailable: model.preview.jobTitleColumnAvailable,
            created,
            updated,
            removed,
            disabled: 0,
            skipped: Math.max(0, selectedActionIds.size +
                manualMappings.length -
                created -
                updated -
                removed),
            skippedJobTitleWrites,
            errors,
        };
    }
    async previewEmsToEntraContactSync(graphAccessToken) {
        return (await this.buildEmsToEntraSyncModel(graphAccessToken)).preview;
    }
    async applyEmsToEntraContactSync(dto, graphAccessToken) {
        const model = await this.buildEmsToEntraSyncModel(graphAccessToken);
        const selectedActionIds = new Set(Array.isArray(dto?.selectedActionIds) ? dto.selectedActionIds : []);
        const manualMappings = Array.isArray(dto?.manualMappings)
            ? dto.manualMappings
            : [];
        const graphWriteToken = await this.getGraphWriteAccessToken(graphAccessToken);
        const errors = [];
        const updateTargets = new Map();
        const createTargets = [];
        const disableTargets = [];
        for (const row of model.preview.rows) {
            if (!selectedActionIds.has(row.actionId))
                continue;
            if (row.type === 'create' && row.contactId) {
                const contact = model.contactsById.get(row.contactId);
                if (contact)
                    createTargets.push(contact);
                continue;
            }
            if (row.type === 'disable' && row.entraUserId) {
                const user = model.usersById.get(row.entraUserId);
                if (user)
                    disableTargets.push(user);
                continue;
            }
            if (row.type === 'update' && row.contactId && row.entraUserId) {
                const contact = model.contactsById.get(row.contactId);
                const user = model.usersById.get(row.entraUserId);
                if (contact && user) {
                    updateTargets.set(`${contact.contactId}:${user.id}`, {
                        contact,
                        user,
                        selectedFields: dto?.selectedActionFields?.[row.actionId],
                    });
                }
            }
        }
        for (const mapping of manualMappings) {
            const contactId = Number(mapping?.contactId);
            const entraUserId = cleanText(mapping?.targetEntraUserId ?? mapping?.entraUserId);
            const contact = Number.isFinite(contactId)
                ? model.contactsById.get(contactId)
                : undefined;
            const user = entraUserId ? model.usersById.get(entraUserId) : undefined;
            if (!contact || !user) {
                errors.push('A selected duplicate mapping is no longer valid.');
                continue;
            }
            const row = model.preview.rows.find(r => r.entraUserId === user.id || r.contactId === contact.contactId);
            const actionId = row?.actionId;
            updateTargets.set(`${contact.contactId}:${user.id}`, { contact, user, selectedFields: actionId ? dto?.selectedActionFields?.[actionId] : undefined });
        }
        let created = 0;
        let updated = 0;
        let disabled = 0;
        const createdEntraUsers = [];
        for (const contact of createTargets) {
            try {
                const credential = await this.createEntraUserFromEmsContact(graphWriteToken, contact, model.preview.jobTitleColumnAvailable);
                created += 1;
                createdEntraUsers.push(credential);
            }
            catch (error) {
                errors.push(formatSyncError(`Could not create ${formatContactName(contact)} in Entra`, error));
            }
        }
        for (const { contact, user, selectedFields } of updateTargets.values()) {
            try {
                await this.updateEntraUserFromEmsContact(graphWriteToken, user.id, contact, model.preview.jobTitleColumnAvailable, true, selectedFields);
                updated += 1;
            }
            catch (error) {
                errors.push(formatSyncError(`Could not update ${formatContactName(contact)} in Entra`, error));
            }
        }
        for (const user of disableTargets) {
            try {
                await this.disableEntraUser(graphWriteToken, user.id);
                disabled += 1;
            }
            catch (error) {
                errors.push(formatSyncError(`Could not disable ${user.displayName} in Entra`, error));
            }
        }
        return {
            appliedAt: new Date().toISOString(),
            internalCompany: model.preview.internalCompany,
            jobTitleColumnAvailable: model.preview.jobTitleColumnAvailable,
            created,
            updated,
            removed: 0,
            disabled,
            skipped: Math.max(0, selectedActionIds.size +
                manualMappings.length -
                created -
                updated -
                disabled),
            skippedJobTitleWrites: 0,
            createdEntraUsers,
            errors,
        };
    }
    async buildEntraToEmsSyncModel(graphAccessToken) {
        const [internalCompany, jobTitleColumnAvailable, ciJobTitleAvailable, users] = await Promise.all([
            this.getInternalCompany(),
            this.hasContactInfoJobTitleColumn(),
            this.hasContactInfoJobTitleColumnOnly(),
            this.adminUsersService.listUsersForSync(graphAccessToken),
        ]);
        const contacts = await this.loadInternalContacts(internalCompany.companyId, jobTitleColumnAvailable);
        const dependencyRows = await this.dataSource.query(`
      SELECT ca.ContactID as contactId,
             CASE WHEN ec.ContactAssignmentID IS NOT NULL THEN 'Employee Computer' ELSE NULL END as computerDep,
             CASE WHEN ewl.ContactAssignmentID IS NOT NULL THEN 'Employee Work Location' ELSE NULL END as locationDep,
             CASE WHEN epe.ContactAssignmentID IS NOT NULL THEN 'Phone Extension' ELSE NULL END as phoneDep
      FROM dbo.ContactAssignment ca
      LEFT JOIN dbo.EmployeeComputer ec ON ec.ContactAssignmentID = ca.ContactAssignmentID
      LEFT JOIN dbo.EmployeeWorkLocation ewl ON ewl.ContactAssignmentID = ca.ContactAssignmentID
      LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ContactAssignmentID = ca.ContactAssignmentID
      WHERE ca.CompanyID = @0
      `, [internalCompany.companyId]);
        const depsByContactId = new Map();
        for (const row of dependencyRows) {
            const cid = readNumber(row, 'contactId', 'ContactID');
            if (!cid)
                continue;
            let set = depsByContactId.get(cid);
            if (!set) {
                set = new Set();
                depsByContactId.set(cid, set);
            }
            if (row.computerDep)
                set.add(row.computerDep);
            if (row.locationDep)
                set.add(row.locationDep);
            if (row.phoneDep)
                set.add(row.phoneDep);
        }
        const contactsById = new Map(contacts.map((contact) => [contact.contactId, contact]));
        const usersById = new Map(users.map((user) => [user.id, user]));
        const contactsByEmail = groupBy(contacts, (contact) => normalizeEmail(contact.email));
        const contactsByName = groupBy(contacts, (contact) => normalizePersonName(contact.firstName, contact.lastName, ''));
        const activeUsersByEmail = groupBy(users.filter((user) => user.accountEnabled && normalizeEmail(user.email) && (0, admin_users_constants_1.isIaeEntraCompany)(user.companyName)), (user) => normalizeEmail(user.email));
        const activeEntraEmailSet = new Set(activeUsersByEmail.keys());
        const referencedContactIds = new Set();
        const rows = [];
        const warnings = [];
        if (!jobTitleColumnAvailable) {
            warnings.push('ContactInfo.JobTitle does not exist yet. Job title values are shown but not written until the client adds the column.');
        }
        for (const user of users) {
            if (!(0, admin_users_constants_1.isIaeEntraCompany)(user.companyName)) {
                continue;
            }
            const email = normalizeEmail(user.email);
            const duplicateEntraUsers = email ? activeUsersByEmail.get(email) ?? [] : [];
            if (!user.accountEnabled) {
                rows.push(this.buildSkippedUserRow(user, 'User is disabled in Entra.'));
                continue;
            }
            if (!email) {
                rows.push(this.buildSkippedUserRow(user, 'User has no Entra email.'));
                continue;
            }
            if (duplicateEntraUsers.length > 1) {
                rows.push({
                    actionId: `entra-duplicate:${user.id}`,
                    type: 'duplicateConflict',
                    reason: `More than one Entra user has email ${user.email}.`,
                    entraUserId: user.id,
                    entraName: user.displayName,
                    entraEmail: user.email,
                    changes: [],
                });
                continue;
            }
            const emailMatches = contactsByEmail.get(email) ?? [];
            if (emailMatches.length === 1) {
                const contact = emailMatches[0];
                referencedContactIds.add(contact.contactId);
                const matchedRow = this.buildMatchedRow(user, contact, jobTitleColumnAvailable);
                const deps = depsByContactId.get(contact.contactId);
                if (deps && deps.size > 0) {
                    const entraDepartments = parseEntraDepartments(user.department);
                    const newAssignmentCount = Math.max(1, entraDepartments.length);
                    if (newAssignmentCount < contact.assignments.length) {
                        matchedRow.dependencies = Array.from(deps);
                    }
                }
                rows.push(matchedRow);
                continue;
            }
            if (emailMatches.length > 1) {
                emailMatches.forEach((contact) => referencedContactIds.add(contact.contactId));
                rows.push({
                    actionId: `ems-email-duplicate:${user.id}`,
                    type: 'duplicateConflict',
                    reason: `More than one EMS internal contact has email ${user.email}.`,
                    entraUserId: user.id,
                    entraName: user.displayName,
                    entraEmail: user.email,
                    changes: [],
                    candidateContacts: emailMatches.map((contact) => this.toCandidateContact(contact)),
                });
                continue;
            }
            const nameMatches = contactsByName.get(normalizePersonNameFromUser(user)) ?? [];
            if (nameMatches.length > 0) {
                nameMatches.forEach((contact) => referencedContactIds.add(contact.contactId));
                rows.push({
                    actionId: `possible-duplicate:${user.id}`,
                    type: 'possibleDuplicate',
                    reason: 'No email match was found, but one or more EMS internal contacts have the same name.',
                    entraUserId: user.id,
                    entraName: user.displayName,
                    entraEmail: user.email,
                    changes: this.buildCreateChanges(user, jobTitleColumnAvailable),
                    candidateContacts: nameMatches.map((contact) => this.toCandidateContact(contact)),
                });
                continue;
            }
            rows.push({
                actionId: `create:${user.id}`,
                type: 'create',
                reason: 'Exists in Entra but not in EMS internal contacts.',
                entraUserId: user.id,
                entraName: user.displayName,
                entraEmail: user.email,
                changes: this.buildCreateChanges(user, jobTitleColumnAvailable),
            });
        }
        for (const contact of contacts) {
            if (referencedContactIds.has(contact.contactId))
                continue;
            const email = normalizeEmail(contact.email);
            if (email && activeEntraEmailSet.has(email))
                continue;
            const deps = depsByContactId.get(contact.contactId);
            rows.push({
                actionId: `remove:${contact.contactId}`,
                type: 'remove',
                reason: 'Exists in EMS internal contacts but is not an active member of the Entra company. Applying removes it from the internal company.',
                contactId: contact.contactId,
                emsName: formatContactName(contact),
                emsEmail: contact.email,
                changes: [],
                dependencies: deps && deps.size > 0 ? Array.from(deps) : undefined,
            });
        }
        const counts = createEmptyCounts();
        for (const row of rows) {
            counts[row.type] += 1;
        }
        return {
            preview: {
                generatedAt: new Date().toISOString(),
                internalCompany,
                jobTitleColumnAvailable,
                counts,
                rows: rows.sort(sortRows),
                warnings,
            },
            usersById,
            contactsById,
            ciJobTitleAvailable,
        };
    }
    async buildEmsToEntraSyncModel(graphAccessToken) {
        const [internalCompany, jobTitleColumnAvailable, users] = await Promise.all([
            this.getInternalCompany(),
            this.hasContactInfoJobTitleColumn(),
            this.adminUsersService.listUsersForSync(graphAccessToken),
        ]);
        const contacts = await this.loadInternalContacts(internalCompany.companyId, jobTitleColumnAvailable);
        const contactsById = new Map(contacts.map((contact) => [contact.contactId, contact]));
        const usersById = new Map(users.map((user) => [user.id, user]));
        const contactsByEmail = groupBy(contacts, (contact) => normalizeEmail(contact.email));
        const usersByEmail = groupBy(users.filter((user) => normalizeEmail(user.email)), (user) => normalizeEmail(user.email));
        const usersByName = groupBy(users, (user) => normalizePersonNameFromUser(user));
        const referencedUserIds = new Set();
        const rows = [];
        const warnings = [];
        if (!jobTitleColumnAvailable) {
            warnings.push('ContactInfo.JobTitle does not exist yet. EMS cannot enforce job title into Entra until the client adds the column.');
        }
        for (const contact of contacts) {
            const email = normalizeEmail(contact.email);
            const duplicateEmsContacts = email ? contactsByEmail.get(email) ?? [] : [];
            if (!email) {
                rows.push({
                    actionId: `skipped:${contact.contactId}`,
                    type: 'skipped',
                    reason: 'EMS contact has no email, so it cannot be matched or created in Entra.',
                    contactId: contact.contactId,
                    emsName: formatContactName(contact),
                    emsEmail: contact.email,
                    changes: [],
                });
                continue;
            }
            if (duplicateEmsContacts.length > 1) {
                rows.push({
                    actionId: `ems-duplicate:${contact.contactId}`,
                    type: 'duplicateConflict',
                    reason: `More than one EMS internal contact has email ${contact.email}.`,
                    contactId: contact.contactId,
                    emsName: formatContactName(contact),
                    emsEmail: contact.email,
                    changes: [],
                    candidateContacts: duplicateEmsContacts.map((candidate) => this.toCandidateContact(candidate)),
                });
                continue;
            }
            const emailMatches = usersByEmail.get(email) ?? [];
            if (emailMatches.length === 1) {
                const user = emailMatches[0];
                referencedUserIds.add(user.id);
                if (!(0, admin_users_constants_1.isIaeEntraCompany)(user.companyName)) {
                    rows.push({
                        actionId: `skipped:${contact.contactId}`,
                        type: 'skipped',
                        reason: `Matched Entra user's Company Name ${user.companyName?.trim() ? `"${user.companyName.trim()}"` : '(blank)'} is not ${admin_users_constants_1.IAE_ENTRA_COMPANY_NAME} — fix the Entra Company Name first.`,
                        contactId: contact.contactId,
                        emsName: formatContactName(contact),
                        emsEmail: contact.email,
                        entraUserId: user.id,
                        entraName: user.displayName,
                        entraEmail: user.email,
                        changes: [],
                    });
                    continue;
                }
                rows.push(this.buildEmsToEntraMatchedRow(contact, user, jobTitleColumnAvailable));
                continue;
            }
            if (emailMatches.length > 1) {
                emailMatches.forEach((user) => referencedUserIds.add(user.id));
                rows.push({
                    actionId: `entra-email-duplicate:${contact.contactId}`,
                    type: 'duplicateConflict',
                    reason: `More than one Entra user has email ${contact.email}.`,
                    contactId: contact.contactId,
                    emsName: formatContactName(contact),
                    emsEmail: contact.email,
                    changes: [],
                    candidateContacts: emailMatches.map((user) => this.toCandidateEntraUser(user)),
                });
                continue;
            }
            const nameMatches = usersByName.get(normalizePersonName(contact.firstName, contact.lastName, contact.email)) ?? [];
            if (nameMatches.length > 0) {
                nameMatches.forEach((user) => referencedUserIds.add(user.id));
                rows.push({
                    actionId: `possible-duplicate:${contact.contactId}`,
                    type: 'possibleDuplicate',
                    reason: 'No email match was found, but one or more Entra users have the same name.',
                    contactId: contact.contactId,
                    emsName: formatContactName(contact),
                    emsEmail: contact.email,
                    changes: this.buildCreateEntraChanges(contact, jobTitleColumnAvailable),
                    candidateContacts: nameMatches.map((user) => this.toCandidateEntraUser(user)),
                });
                continue;
            }
            rows.push({
                actionId: `create:${contact.contactId}`,
                type: 'create',
                reason: 'Exists in EMS internal contacts but not in Entra.',
                contactId: contact.contactId,
                emsName: formatContactName(contact),
                emsEmail: contact.email,
                changes: this.buildCreateEntraChanges(contact, jobTitleColumnAvailable),
            });
        }
        const emsEmails = new Set(contacts.map((contact) => normalizeEmail(contact.email)).filter(Boolean));
        for (const user of users) {
            if (!user.accountEnabled)
                continue;
            if (referencedUserIds.has(user.id))
                continue;
            if (!(0, admin_users_constants_1.isIaeEntraCompany)(user.companyName))
                continue;
            const email = normalizeEmail(user.email);
            if (email && emsEmails.has(email))
                continue;
            rows.push({
                actionId: `disable:${user.id}`,
                type: 'disable',
                reason: 'Active Entra user does not exist in EMS internal contacts. Applying disables the Entra account.',
                entraUserId: user.id,
                entraName: user.displayName,
                entraEmail: user.email,
                changes: [
                    change('accountEnabled', 'Account Status', 'Active', 'Disabled'),
                ],
            });
        }
        const counts = createEmptyCounts();
        for (const row of rows) {
            counts[row.type] += 1;
        }
        return {
            preview: {
                generatedAt: new Date().toISOString(),
                internalCompany,
                jobTitleColumnAvailable,
                counts,
                rows: rows.sort(sortRows),
                warnings,
            },
            usersById,
            contactsById,
            ciJobTitleAvailable: jobTitleColumnAvailable,
        };
    }
    async getInternalCompany() {
        const rows = await this.dataSource.query(`
      SELECT CompanyID AS companyId, CompanyName AS companyName
      FROM dbo.Company
      WHERE is_internal = 1
      ORDER BY CompanyID
      `);
        if (rows.length === 0) {
            throw new common_1.BadRequestException('No internal company exists. Mark exactly one company as internal before syncing Entra contacts.');
        }
        if (rows.length > 1) {
            throw new common_1.BadRequestException('More than one internal company exists. Keep exactly one internal company before syncing Entra contacts.');
        }
        return {
            companyId: readNumber(rows[0], 'companyId', 'CompanyID') ?? 0,
            companyName: readString(rows[0], 'companyName', 'CompanyName'),
        };
    }
    async hasContactInfoJobTitleColumn(executor = this.dataSource) {
        const rows = await executor.query(`
      SELECT 1 AS hasColumn
      WHERE
        COL_LENGTH('dbo.ContactInfo', 'JobTitle') IS NOT NULL
        OR COL_LENGTH('dbo.EmployeeProfile', 'JobTitle') IS NOT NULL
      `);
        return rows.length > 0;
    }
    async hasContactInfoJobTitleColumnOnly(executor = this.dataSource) {
        const rows = await executor.query(`SELECT 1 AS x WHERE COL_LENGTH('dbo.ContactInfo', 'JobTitle') IS NOT NULL`);
        return rows.length > 0;
    }
    async upsertEmployeeProfileJobTitle(manager, contactId, jobTitle) {
        const hasCol = await manager.query(`SELECT 1 AS x FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='EmployeeProfile' AND COLUMN_NAME='JobTitle'`);
        if (hasCol.length === 0)
            return;
        const exists = await manager.query(`SELECT 1 AS x FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contactId]);
        if (exists.length > 0) {
            await manager.query(`UPDATE dbo.EmployeeProfile SET JobTitle = @0 WHERE ContactID = @1`, [jobTitle, contactId]);
        }
        else {
            await manager.query(`INSERT INTO dbo.EmployeeProfile (ContactID, JobTitle, created_by, created_at, modified_by, modified_at)
         VALUES (@0, @1, @2, SYSUTCDATETIME(), @2, SYSUTCDATETIME())`, [contactId, jobTitle, 'Entra contact sync']);
        }
    }
    async loadInternalContacts(companyId, jobTitleColumnAvailable) {
        const ciHasJobTitle = await this.hasContactInfoJobTitleColumnOnly();
        const jobTitleSelect = ciHasJobTitle
            ? 'ci.JobTitle AS jobTitle'
            : 'ep.JobTitle AS jobTitle';
        const epJoin = ciHasJobTitle
            ? ''
            : 'LEFT JOIN dbo.EmployeeProfile ep ON ep.ContactID = c.ContactID';
        const rows = await this.dataSource.query(`
      SELECT
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        ci.CellPhone AS cellPhone,
        ci.WorkPhone AS workPhone,
        ci.WorkPhoneExtension AS workPhoneExtension,
        ${jobTitleSelect},
        ca.ContactAssignmentID AS contactAssignmentId,
        ca.RoleID AS roleId,
        COALESCE(r.RoleName, '') AS roleName,
        ca.DepartmentID AS departmentId,
        COALESCE(d.DepartmentName, '') AS departmentName
      FROM dbo.ContactAssignment ca
      INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      ${epJoin}
      LEFT JOIN dbo.Role r ON r.RoleID = ca.RoleID
      LEFT JOIN dbo.Department d ON d.DepartmentID = ca.DepartmentID
      WHERE ca.CompanyID = @0
      ORDER BY ci.FirstName, ci.LastName, ci.Email, ca.ContactAssignmentID
      `, [companyId]);
        const contacts = new Map();
        for (const row of rows) {
            const contactId = readNumber(row, 'contactId', 'ContactID');
            const contactInfoId = readNumber(row, 'contactInfoId', 'ContactInfoID');
            if (!contactId || !contactInfoId)
                continue;
            let contact = contacts.get(contactId);
            if (!contact) {
                contact = {
                    contactId,
                    contactInfoId,
                    firstName: readString(row, 'firstName', 'FirstName'),
                    lastName: readString(row, 'lastName', 'LastName'),
                    email: readString(row, 'email', 'Email'),
                    cellPhone: readString(row, 'cellPhone', 'CellPhone'),
                    workPhone: readString(row, 'workPhone', 'WorkPhone'),
                    workPhoneExtension: readString(row, 'workPhoneExtension', 'WorkPhoneExtension'),
                    jobTitle: readString(row, 'jobTitle', 'JobTitle'),
                    assignments: [],
                };
                contacts.set(contactId, contact);
            }
            contact.assignments.push({
                contactAssignmentId: readNumber(row, 'contactAssignmentId', 'ContactAssignmentID') ?? 0,
                roleId: readNumber(row, 'roleId', 'RoleID') ?? 0,
                roleName: readString(row, 'roleName', 'RoleName'),
                departmentId: readNumber(row, 'departmentId', 'DepartmentID') ?? 0,
                departmentName: readString(row, 'departmentName', 'DepartmentName'),
            });
        }
        return Array.from(contacts.values());
    }
    buildMatchedRow(user, contact, jobTitleColumnAvailable) {
        const changes = this.buildUpdateChanges(user, contact, jobTitleColumnAvailable);
        const writableChanges = changes.filter((change) => !change.skipped);
        const type = writableChanges.length > 0 ? 'update' : 'upToDate';
        return {
            actionId: `${type}:${user.id}:${contact.contactId}`,
            type,
            reason: type === 'update'
                ? 'Email match found; Entra has updates for EMS.'
                : 'Email match found; EMS is already aligned with Entra.',
            entraUserId: user.id,
            contactId: contact.contactId,
            entraName: user.displayName,
            entraEmail: user.email,
            emsName: formatContactName(contact),
            emsEmail: contact.email,
            changes,
        };
    }
    buildEmsToEntraMatchedRow(contact, user, jobTitleColumnAvailable) {
        const changes = this.buildUpdateEntraChanges(contact, user, jobTitleColumnAvailable);
        const type = changes.length > 0 ? 'update' : 'upToDate';
        return {
            actionId: `${type}:${contact.contactId}:${user.id}`,
            type,
            reason: type === 'update'
                ? 'Email match found; EMS has updates for Entra.'
                : 'Email match found; Entra is already aligned with EMS.',
            entraUserId: user.id,
            contactId: contact.contactId,
            entraName: user.displayName,
            entraEmail: user.email,
            emsName: formatContactName(contact),
            emsEmail: contact.email,
            changes,
        };
    }
    buildSkippedUserRow(user, reason) {
        return {
            actionId: `skipped:${user.id}`,
            type: 'skipped',
            reason,
            entraUserId: user.id,
            entraName: user.displayName,
            entraEmail: user.email,
            changes: [],
        };
    }
    buildCreateChanges(user, jobTitleColumnAvailable) {
        const names = getEntraNames(user);
        const changes = [
            change('firstName', 'First Name', null, names.firstName),
            change('lastName', 'Last Name', null, names.lastName),
            change('email', 'Email', null, user.email),
        ];
        addOptionalChange(changes, 'cellPhone', 'Cell Phone', null, trimToMax(user.mobilePhone, 30));
        addOptionalChange(changes, 'workPhone', 'Work Phone', null, trimToMax(firstBusinessPhone(user), 30));
        const parsedDepts = parseEntraDepartments(user.department);
        addOptionalChange(changes, 'department', 'Department', null, parsedDepts.length > 0 ? parsedDepts.join(', ') : DEFAULT_DEPARTMENT_NAME);
        this.addJobTitleChange(changes, null, user.jobTitle, jobTitleColumnAvailable);
        return changes;
    }
    buildUpdateChanges(user, contact, jobTitleColumnAvailable) {
        const names = getEntraNames(user);
        const changes = [];
        addComparableChange(changes, 'firstName', 'First Name', contact.firstName, names.firstName);
        addComparableChange(changes, 'lastName', 'Last Name', contact.lastName, names.lastName);
        addComparableChange(changes, 'email', 'Email', contact.email, user.email, {
            compareAsEmail: true,
        });
        addComparableChange(changes, 'cellPhone', 'Cell Phone', contact.cellPhone, trimToMax(user.mobilePhone, 30), { compareAsPhone: true });
        addComparableChange(changes, 'workPhone', 'Work Phone', contact.workPhone, trimToMax(firstBusinessPhone(user), 30), { compareAsPhone: true });
        const entraDepartments = parseEntraDepartments(user.department);
        if (entraDepartments.length > 0) {
            const currentDepartments = uniqueClean(contact.assignments.map((assignment) => assignment.departmentName));
            const currentDepartmentLabel = currentDepartments.join(', ');
            const entraDepartmentLabel = entraDepartments.join(', ');
            const currentSet = new Set(currentDepartments.map(d => normalizeLookupName(d).toLowerCase()));
            const entraSet = new Set(entraDepartments.map(d => d.toLowerCase()));
            let isDifferent = currentSet.size !== entraSet.size;
            if (!isDifferent) {
                for (const d of entraSet) {
                    if (!currentSet.has(d)) {
                        isDifferent = true;
                        break;
                    }
                }
            }
            if (isDifferent) {
                changes.push(change('department', 'Department', currentDepartmentLabel || null, entraDepartmentLabel));
            }
        }
        this.addJobTitleChange(changes, contact.jobTitle, user.jobTitle, jobTitleColumnAvailable);
        return changes;
    }
    buildCreateEntraChanges(contact, jobTitleColumnAvailable) {
        const changes = [
            change('displayName', 'Display Name', null, formatContactName(contact)),
            change('givenName', 'First Name', null, contact.firstName),
            change('surname', 'Last Name', null, contact.lastName),
            change('userPrincipalName', 'Email / UPN', null, contact.email),
            change('accountEnabled', 'Account Status', null, 'Active'),
        ];
        addOptionalChange(changes, 'mobilePhone', 'Mobile Phone', null, trimToMax(contact.cellPhone, 30));
        addOptionalChange(changes, 'businessPhones', 'Work Phone', null, trimToMax(combinePhoneAndExtension(contact.workPhone, contact.workPhoneExtension), 30));
        addOptionalChange(changes, 'department', 'Department', null, primaryDepartmentName(contact));
        if (jobTitleColumnAvailable) {
            addOptionalChange(changes, 'jobTitle', 'Job Title', null, trimToMax(contact.jobTitle, 150));
        }
        else {
            this.addJobTitleChange(changes, null, contact.jobTitle, false);
        }
        return changes;
    }
    buildUpdateEntraChanges(contact, user, jobTitleColumnAvailable) {
        const changes = [];
        addComparableChange(changes, 'displayName', 'Display Name', user.displayName, formatContactName(contact));
        addComparableChange(changes, 'givenName', 'First Name', user.givenName, contact.firstName);
        addComparableChange(changes, 'surname', 'Last Name', user.surname, contact.lastName);
        addComparableChange(changes, 'userPrincipalName', 'Email / UPN', user.userPrincipalName || user.email, contact.email, { compareAsEmail: true });
        addComparableChange(changes, 'mobilePhone', 'Mobile Phone', user.mobilePhone, trimToMax(contact.cellPhone, 30), { compareAsPhone: true });
        addComparableChange(changes, 'businessPhones', 'Work Phone', firstBusinessPhoneRaw(user), trimToMax(combinePhoneAndExtension(contact.workPhone, contact.workPhoneExtension), 30), { compareAsPhone: true });
        addComparableChange(changes, 'department', 'Department', user.department, primaryDepartmentName(contact));
        this.addJobTitleChange(changes, user.jobTitle, contact.jobTitle, jobTitleColumnAvailable);
        if (!user.accountEnabled) {
            changes.push(change('accountEnabled', 'Account Status', 'Disabled', 'Active'));
        }
        return changes;
    }
    addJobTitleChange(changes, currentValue, entraValue, jobTitleColumnAvailable) {
        const nextValue = trimToMax(entraValue, 150);
        if (!nextValue)
            return;
        if (!jobTitleColumnAvailable) {
            changes.push(change('jobTitle', 'Job Title', currentValue, nextValue, {
                skipped: true,
                reason: 'JobTitle is not available on dbo.ContactInfo or dbo.EmployeeProfile.',
            }));
            return;
        }
        addComparableChange(changes, 'jobTitle', 'Job Title', currentValue, nextValue);
    }
    toCandidateContact(contact) {
        return {
            contactId: contact.contactId,
            name: formatContactName(contact),
            email: contact.email,
            departments: uniqueClean(contact.assignments.map((assignment) => assignment.departmentName)),
            roles: uniqueClean(contact.assignments.map((assignment) => assignment.roleName)),
        };
    }
    toCandidateEntraUser(user) {
        return {
            entraUserId: user.id,
            name: user.displayName,
            email: user.email,
            departments: user.department ? [user.department] : [],
            roles: [user.accountEnabled ? 'Active' : 'Disabled'],
        };
    }
    async createInternalContactFromEntra(manager, companyId, user, contactInfoJobTitleAvailable, anyJobTitleTargetAvailable) {
        const names = getEntraNames(user);
        const email = trimToMax(user.email, 254);
        const cellPhone = nullableText(trimToMax(user.mobilePhone, 30));
        const workPhone = nullableText(trimToMax(firstBusinessPhone(user), 30));
        const jobTitle = trimToMax(user.jobTitle, 150);
        const departmentNames = parseEntraDepartments(user.department);
        if (departmentNames.length === 0) {
            departmentNames.push(DEFAULT_DEPARTMENT_NAME);
        }
        const departmentIds = [];
        for (const name of departmentNames) {
            departmentIds.push(await this.findOrCreateDepartment(manager, name));
        }
        const roleId = await this.findOrCreateRole(manager, DEFAULT_INTERNAL_ROLE_NAME);
        const existingContactRows = await manager.query(`
      SELECT TOP 1 c.ContactID AS contactId, ci.ContactInfoID AS contactInfoId
      FROM dbo.ContactInfo ci
      LEFT JOIN dbo.Contact c ON c.ContactInfoID = ci.ContactInfoID
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `, [email || '']);
        let contactId = readNumber(existingContactRows[0], 'contactId', 'ContactID') ?? 0;
        let contactInfoId = readNumber(existingContactRows[0], 'contactInfoId', 'ContactInfoID') ?? 0;
        if (!contactInfoId) {
            const contactInfoRows = contactInfoJobTitleAvailable
                ? await manager.query(`
            DECLARE @OutputTable TABLE (ContactInfoID int);
            INSERT INTO dbo.ContactInfo
              (FirstName, LastName, Email, CellPhone, WorkPhone, JobTitle)
            OUTPUT INSERTED.ContactInfoID INTO @OutputTable
            VALUES (@0, @1, @2, @3, @4, @5);
            SELECT ContactInfoID AS contactInfoId FROM @OutputTable;
            `, [
                    trimToMax(names.firstName, 100),
                    trimToMax(names.lastName, 100),
                    email,
                    cellPhone,
                    workPhone,
                    nullableText(jobTitle),
                ])
                : await manager.query(`
            DECLARE @OutputTable TABLE (ContactInfoID int);
            INSERT INTO dbo.ContactInfo
              (FirstName, LastName, Email, CellPhone, WorkPhone)
            OUTPUT INSERTED.ContactInfoID INTO @OutputTable
            VALUES (@0, @1, @2, @3, @4);
            SELECT ContactInfoID AS contactInfoId FROM @OutputTable;
            `, [
                    trimToMax(names.firstName, 100),
                    trimToMax(names.lastName, 100),
                    email,
                    cellPhone,
                    workPhone,
                ]);
            contactInfoId =
                readNumber(contactInfoRows[0], 'contactInfoId', 'ContactInfoID') ?? 0;
            if (!contactInfoId) {
                throw new common_1.BadRequestException('Unable to create internal contact info.');
            }
        }
        else {
            if (contactInfoJobTitleAvailable) {
                await manager.query(`
          UPDATE dbo.ContactInfo
          SET FirstName = @0, LastName = @1, CellPhone = @2, WorkPhone = @3, JobTitle = @4
          WHERE ContactInfoID = @5
          `, [
                    trimToMax(names.firstName, 100),
                    trimToMax(names.lastName, 100),
                    cellPhone,
                    workPhone,
                    nullableText(jobTitle),
                    contactInfoId,
                ]);
            }
            else {
                await manager.query(`
          UPDATE dbo.ContactInfo
          SET FirstName = @0, LastName = @1, CellPhone = @2, WorkPhone = @3
          WHERE ContactInfoID = @4
          `, [
                    trimToMax(names.firstName, 100),
                    trimToMax(names.lastName, 100),
                    cellPhone,
                    workPhone,
                    contactInfoId,
                ]);
            }
        }
        if (!contactId) {
            const contactRows = await manager.query(`
        DECLARE @OutputContact TABLE (ContactID int);
        INSERT INTO dbo.Contact (ContactInfoID, created_by, created_at)
        OUTPUT INSERTED.ContactID INTO @OutputContact
        VALUES (@0, @1, SYSUTCDATETIME());
        SELECT ContactID AS contactId FROM @OutputContact;
        `, [contactInfoId, SYNC_AUDIT_USER]);
            contactId = readNumber(contactRows[0], 'contactId', 'ContactID') ?? 0;
            if (!contactId) {
                throw new common_1.BadRequestException('Unable to create internal contact.');
            }
        }
        await this.syncContactAssignments(manager, contactId, companyId, roleId, departmentIds);
        if (jobTitle) {
            await this.upsertEmployeeProfileJobTitle(manager, contactId, jobTitle);
        }
        return {
            skippedJobTitleWrites: jobTitle && !anyJobTitleTargetAvailable ? 1 : 0,
        };
    }
    async updateInternalContactFromEntra(manager, companyId, contact, user, contactInfoJobTitleAvailable, anyJobTitleTargetAvailable, selectedFieldsArray) {
        const selectedFields = selectedFieldsArray ? new Set(selectedFieldsArray) : null;
        const names = getEntraNames(user);
        const email = trimToMax(user.email, 254);
        const cellPhone = nullableText(trimToMax(user.mobilePhone, 30));
        const workPhone = nullableText(trimToMax(firstBusinessPhone(user), 30));
        const jobTitle = trimToMax(user.jobTitle, 150);
        const finalFirstName = selectedFields && !selectedFields.has('firstName') ? contact.firstName : trimToMax(names.firstName, 100);
        const finalLastName = selectedFields && !selectedFields.has('lastName') ? contact.lastName : trimToMax(names.lastName, 100);
        const finalEmail = selectedFields && !selectedFields.has('email') ? contact.email : email;
        const finalCellPhone = selectedFields && !selectedFields.has('cellPhone') ? contact.cellPhone : cellPhone;
        const finalWorkPhone = selectedFields && !selectedFields.has('workPhone') ? contact.workPhone : workPhone;
        const finalJobTitle = selectedFields && !selectedFields.has('jobTitle') ? contact.jobTitle : nullableText(jobTitle);
        if (contactInfoJobTitleAvailable) {
            await manager.query(`
        UPDATE dbo.ContactInfo
        SET FirstName = @0,
            LastName = @1,
            Email = @2,
            CellPhone = @3,
            WorkPhone = @4,
            JobTitle = @5
        WHERE ContactInfoID = @6
        `, [
                finalFirstName,
                finalLastName,
                finalEmail,
                finalCellPhone,
                finalWorkPhone,
                finalJobTitle,
                contact.contactInfoId,
            ]);
        }
        else {
            await manager.query(`
        UPDATE dbo.ContactInfo
        SET FirstName = @0,
            LastName = @1,
            Email = @2,
            CellPhone = @3,
            WorkPhone = @4
        WHERE ContactInfoID = @5
        `, [
                finalFirstName,
                finalLastName,
                finalEmail,
                finalCellPhone,
                finalWorkPhone,
                contact.contactInfoId,
            ]);
        }
        const shouldUpdateDepartment = !selectedFields || selectedFields.has('department');
        if (shouldUpdateDepartment) {
            const departmentNames = parseEntraDepartments(user.department);
            if (departmentNames.length > 0) {
                const departmentIds = [];
                for (const name of departmentNames) {
                    departmentIds.push(await this.findOrCreateDepartment(manager, name));
                }
                const roleId = await this.findOrCreateRole(manager, DEFAULT_INTERNAL_ROLE_NAME);
                await this.syncContactAssignments(manager, contact.contactId, companyId, roleId, departmentIds);
            }
        }
        if (finalJobTitle && (!selectedFields || selectedFields.has('jobTitle'))) {
            await this.upsertEmployeeProfileJobTitle(manager, contact.contactId, finalJobTitle);
        }
        return {
            skippedJobTitleWrites: (!selectedFields || selectedFields.has('jobTitle')) && jobTitle && !anyJobTitleTargetAvailable
                ? 1
                : 0,
        };
    }
    async syncContactAssignments(manager, contactId, companyId, roleId, departmentIds) {
        const existing = await manager.query(`SELECT ContactAssignmentID AS id, DepartmentID AS departmentId, RoleID as roleId
       FROM dbo.ContactAssignment
       WHERE ContactID = @0 AND CompanyID = @1
       ORDER BY ContactAssignmentID`, [contactId, companyId]);
        const existingById = new Map();
        const existingByDept = new Map();
        for (const row of existing) {
            const id = readNumber(row, 'id', 'ContactAssignmentID');
            const deptId = readNumber(row, 'departmentId', 'DepartmentID');
            const rId = readNumber(row, 'roleId', 'RoleID');
            if (id != null && deptId != null) {
                existingById.set(id, { id, departmentId: deptId, roleId: rId ?? roleId });
                existingByDept.set(deptId, id);
            }
        }
        const existingIds = Array.from(existingById.keys());
        const desiredDeptSet = new Set(departmentIds);
        const keptAssignmentIds = new Set();
        for (const deptId of departmentIds) {
            const existingAssignmentId = existingByDept.get(deptId);
            if (existingAssignmentId != null) {
                keptAssignmentIds.add(existingAssignmentId);
            }
        }
        const unmatched = existingIds.filter((id) => !keptAssignmentIds.has(id));
        const deptsThatNeedSlot = departmentIds.filter((deptId) => !existingByDept.has(deptId));
        for (let i = 0; i < deptsThatNeedSlot.length; i++) {
            const deptId = deptsThatNeedSlot[i];
            if (i < unmatched.length) {
                const reuseId = unmatched[i];
                const existingRoleId = existingById.get(reuseId)?.roleId ?? roleId;
                await manager.query(`UPDATE dbo.ContactAssignment SET DepartmentID = @0, RoleID = @1, modified_by = @2, modified_at = SYSUTCDATETIME() WHERE ContactAssignmentID = @3`, [deptId, existingRoleId, SYNC_AUDIT_USER, reuseId]);
                keptAssignmentIds.add(reuseId);
            }
            else {
                const duplicateCheck = await manager.query(`SELECT ContactAssignmentID AS id FROM dbo.ContactAssignment WHERE ContactID = @0 AND CompanyID = @1 AND RoleID = @2 AND DepartmentID = @3`, [contactId, companyId, roleId, deptId]);
                if (duplicateCheck.length === 0) {
                    try {
                        await manager.query(`INSERT INTO dbo.ContactAssignment (ContactID, CompanyID, RoleID, DepartmentID, created_by, created_at) VALUES (@0, @1, @2, @3, @4, SYSUTCDATETIME())`, [contactId, companyId, roleId, deptId, SYNC_AUDIT_USER]);
                    }
                    catch (err) {
                        const msg = err instanceof Error ? err.message : '';
                        if (!msg.includes('UQ_CA_Contact_Company_Role_Department'))
                            throw err;
                    }
                }
            }
        }
        const obsoleteIds = unmatched.slice(deptsThatNeedSlot.length);
        for (const obsoleteId of obsoleteIds) {
            await manager.query(`DELETE FROM dbo.EmployeeComputer WHERE ContactAssignmentID = @0`, [obsoleteId]);
            await manager.query(`DELETE FROM dbo.EmployeeWorkLocation WHERE ContactAssignmentID = @0`, [obsoleteId]);
            await manager.query(`DELETE FROM dbo.EmployeePhoneExtension WHERE ContactAssignmentID = @0`, [obsoleteId]);
            await manager.query(`DELETE FROM dbo.ContactAssignment WHERE ContactAssignmentID = @0`, [obsoleteId]);
        }
    }
    async removeInternalCompanyAssignments(manager, companyId, contactId) {
        const assignmentRows = await manager.query(`
      SELECT ContactAssignmentID AS contactAssignmentId
      FROM dbo.ContactAssignment
      WHERE ContactID = @0
      `, [contactId]);
        const assignmentIds = assignmentRows
            .map((row) => readNumber(row, 'contactAssignmentId', 'ContactAssignmentID'))
            .filter((id) => id != null);
        if (assignmentIds.length > 0) {
            await manager.query(`
        DELETE FROM dbo.EmployeeComputer
        WHERE ContactAssignmentID IN (${assignmentIds.map((_, index) => `@${index}`).join(',')})
        `, assignmentIds);
            await manager.query(`
        DELETE FROM dbo.EmployeeWorkLocation
        WHERE ContactAssignmentID IN (${assignmentIds.map((_, index) => `@${index}`).join(',')})
        `, assignmentIds);
            await manager.query(`
        DELETE FROM dbo.EmployeePhoneExtension
        WHERE ContactAssignmentID IN (${assignmentIds.map((_, index) => `@${index}`).join(',')})
        `, assignmentIds);
        }
        await manager.query(`
      DELETE FROM dbo.ContactAssignment
      WHERE ContactID = @0
      `, [contactId]);
        const contactRow = await manager.query(`SELECT ContactInfoID AS contactInfoId FROM dbo.Contact WHERE ContactID = @0`, [contactId]);
        const contactInfoId = contactRow[0] ? readNumber(contactRow[0], 'contactInfoId', 'ContactInfoID') : null;
        await manager.query(`
      DELETE FROM dbo.Contact
      WHERE ContactID = @0
      `, [contactId]);
        if (contactInfoId) {
            await manager.query(`
        DELETE FROM dbo.ContactInfo
        WHERE ContactInfoID = @0
        `, [contactInfoId]);
        }
    }
    async createEntraUserFromEmsContact(graphAccessToken, contact, jobTitleColumnAvailable) {
        const temporaryPassword = this.generateTemporaryPassword();
        const payload = this.buildEntraUserPayloadFromEmsContact(contact, jobTitleColumnAvailable, true, temporaryPassword);
        await this.graphRequest(graphAccessToken, 'POST', `${GRAPH_BASE_URL}/users`, payload);
        return {
            displayName: formatContactName(contact),
            userPrincipalName: trimToMax(contact.email, 254),
            temporaryPassword,
        };
    }
    async updateEntraUserFromEmsContact(graphAccessToken, entraUserId, contact, jobTitleColumnAvailable, includeEmailFields, selectedFieldsArray) {
        const payload = this.buildEntraUserPayloadFromEmsContact(contact, jobTitleColumnAvailable, false, null, includeEmailFields, selectedFieldsArray);
        await this.graphRequest(graphAccessToken, 'PATCH', `${GRAPH_BASE_URL}/users/${encodeURIComponent(entraUserId)}`, payload);
        try {
            await this.verifyEntraUserPayload(graphAccessToken, entraUserId, payload);
        }
        catch (verifyErr) {
            const msg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
            console.warn(`[ContactSync] Verify warning for ${entraUserId}: ${msg}`);
        }
    }
    async disableEntraUser(graphAccessToken, entraUserId) {
        await this.graphRequest(graphAccessToken, 'PATCH', `${GRAPH_BASE_URL}/users/${encodeURIComponent(entraUserId)}`, { accountEnabled: false });
    }
    buildEntraUserPayloadFromEmsContact(contact, jobTitleColumnAvailable, forCreate, temporaryPassword, includeEmailFields = true, selectedFieldsArray) {
        const selectedFields = selectedFieldsArray ? new Set(selectedFieldsArray) : null;
        const displayName = formatContactName(contact);
        const email = trimToMax(contact.email, 254);
        const payload = {};
        if (!selectedFields || selectedFields.has('firstName') || selectedFields.has('lastName')) {
            payload.displayName = displayName;
        }
        if (!selectedFields || selectedFields.has('firstName')) {
            payload.givenName = nullableText(trimToMax(contact.firstName, 64));
        }
        if (!selectedFields || selectedFields.has('lastName')) {
            payload.surname = nullableText(trimToMax(contact.lastName, 64));
        }
        if (!selectedFields || selectedFields.has('cellPhone')) {
            payload.mobilePhone = nullableText(trimToMax(sanitizePhoneForGraph(contact.cellPhone), 30));
        }
        if (!selectedFields || selectedFields.has('workPhone')) {
            const sanitizedPhone = sanitizePhoneForGraph(contact.workPhone);
            const combined = combinePhoneAndExtension(sanitizedPhone, contact.workPhoneExtension);
            payload.businessPhones = combined ? [trimToMax(combined, 30)] : [];
        }
        if (!selectedFields || selectedFields.has('department')) {
            payload.department = nullableText(trimToMax(primaryDepartmentName(contact), 64));
        }
        if (includeEmailFields && (!selectedFields || selectedFields.has('email'))) {
            if (email && email.includes('@') && !email.includes(' ')) {
                if (forCreate) {
                    payload.userPrincipalName = email;
                    payload.mailNickname = makeMailNickname(email, displayName);
                }
            }
        }
        if (jobTitleColumnAvailable && (!selectedFields || selectedFields.has('jobTitle'))) {
            payload.jobTitle = nullableText(trimToMax(contact.jobTitle, 128));
        }
        if (forCreate) {
            payload.accountEnabled = true;
            payload.companyName = admin_users_constants_1.IAE_ENTRA_COMPANY_NAME;
            payload.passwordProfile = {
                forceChangePasswordNextSignIn: true,
                password: temporaryPassword,
            };
        }
        return removeUndefinedValues(payload);
    }
    async getGraphWriteAccessToken(delegatedGraphAccessToken) {
        const appToken = await this.tryGetApplicationGraphAccessToken();
        if (appToken)
            return appToken;
        const delegatedToken = cleanText(delegatedGraphAccessToken);
        if (delegatedToken)
            return delegatedToken;
        throw new common_1.ServiceUnavailableException('Microsoft Graph write access requires either a delegated Graph token or backend application credentials.');
    }
    async tryGetApplicationGraphAccessToken() {
        const now = Date.now();
        if (this.appGraphTokenCache && this.appGraphTokenCache.expiresAt > now + 60_000) {
            return this.appGraphTokenCache.accessToken;
        }
        const tenantId = this.getConfigValue('ENTRA_TENANT_ID');
        const clientId = this.getConfigValue('ENTRA_CLIENT_ID');
        const clientSecret = this.getConfigValue('ENTRA_CLIENT_SECRET');
        if (!tenantId || !clientId || !clientSecret)
            return null;
        const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
                scope: 'https://graph.microsoft.com/.default',
            }),
        });
        if (!response.ok) {
            throw new common_1.BadGatewayException(`Could not acquire Microsoft Graph application token. Status ${response.status}.`);
        }
        const payload = (await response.json());
        const accessToken = cleanText(payload.access_token);
        if (!accessToken) {
            throw new common_1.BadGatewayException('Microsoft Graph application token response did not contain an access token.');
        }
        this.appGraphTokenCache = {
            accessToken,
            expiresAt: now + Number(payload.expires_in ?? 3600) * 1000,
        };
        return accessToken;
    }
    async graphRequest(graphAccessToken, method, url, payload) {
        const response = await fetch(url, {
            method,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (response.ok)
            return;
        const detail = await readResponseText(response);
        console.warn(`[EntraSync] Graph ${method} ${url} failed (${response.status}):`, detail, 'Payload:', JSON.stringify(payload));
        throw new common_1.BadGatewayException({
            message: response.status === 403
                ? 'Microsoft Entra rejected this update. Assign the EMSEntra Enterprise Application service principal the User Administrator role, and make sure User-Phone.ReadWrite.All application permission is admin-consented for phone updates.'
                : `Microsoft Entra write request failed with status ${response.status}.`,
            detail: `Microsoft Graph write request failed with status ${response.status}: ${detail}`,
        });
    }
    async graphGetJson(graphAccessToken, url) {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
        });
        if (!response.ok) {
            const detail = await readResponseText(response);
            throw new common_1.BadGatewayException({
                message: `Microsoft Entra read-back request failed with status ${response.status}.`,
                detail: `Microsoft Graph read-back request failed with status ${response.status}: ${detail}`,
            });
        }
        return (await response.json());
    }
    async verifyEntraUserPayload(graphAccessToken, userIdentifier, payload) {
        if (Object.keys(payload).length === 0)
            return;
        const selected = 'id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,mobilePhone,businessPhones,accountEnabled';
        let mismatches = [];
        for (let attempt = 0; attempt < 4; attempt += 1) {
            const user = await this.graphGetJson(graphAccessToken, `${GRAPH_BASE_URL}/users/${encodeURIComponent(userIdentifier)}?$select=${selected}`);
            mismatches = findGraphPayloadMismatches(payload, user);
            if (mismatches.length === 0)
                return;
            await sleep(350);
        }
        throw new common_1.BadGatewayException({
            message: `Microsoft Entra did not persist ${mismatches.map(graphFieldLabel).join(', ')} for this user.`,
            detail: `Graph read-back mismatch after PATCH. Fields: ${mismatches.join(', ')}`,
        });
    }
    generateTemporaryPassword() {
        const configuredPassword = cleanText(this.getConfigValue('ENTRA_SYNC_TEMP_PASSWORD'));
        if (configuredPassword)
            return configuredPassword;
        return `Ems-${(0, crypto_1.randomBytes)(18).toString('base64url')}aA1!`;
    }
    getConfigValue(...keys) {
        for (const key of keys) {
            const value = this.configService.get(key)?.trim();
            if (value)
                return value;
        }
        return '';
    }
    async findOrCreateDepartment(executor, name) {
        const departmentName = normalizeLookupName(name) || DEFAULT_DEPARTMENT_NAME;
        const allDepartments = await executor.query(`SELECT DepartmentID AS departmentId, DepartmentName AS departmentName FROM dbo.Department`);
        const target = departmentName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let bestMatchId = null;
        let exactMatchId = null;
        for (const row of allDepartments) {
            const existingName = readString(row, 'departmentName', 'DepartmentName');
            const id = readNumber(row, 'departmentId', 'DepartmentID');
            if (!existingName || !id)
                continue;
            const normalized = existingName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalized === target) {
                exactMatchId = id;
                break;
            }
            if (target.length > 3 && normalized.length > 3) {
                const distance = levenshteinDistance(target, normalized);
                if (distance <= 2) {
                    bestMatchId = id;
                }
            }
        }
        if (exactMatchId)
            return exactMatchId;
        if (bestMatchId)
            return bestMatchId;
        const rows = await executor.query(`
      DECLARE @OutputDept TABLE (DepartmentID int);
      INSERT INTO dbo.Department (DepartmentName)
      OUTPUT INSERTED.DepartmentID INTO @OutputDept
      VALUES (@0);
      SELECT DepartmentID AS departmentId FROM @OutputDept;
      `, [trimToMax(departmentName, 100)]);
        const departmentId = readNumber(rows[0], 'departmentId', 'DepartmentID');
        if (!departmentId) {
            throw new common_1.BadRequestException('Unable to create EMS department.');
        }
        return departmentId;
    }
    async findOrCreateRole(executor, name) {
        const roleName = normalizeLookupName(name) || DEFAULT_INTERNAL_ROLE_NAME;
        const existingRows = await executor.query(`
      SELECT TOP 1 RoleID AS roleId
      FROM dbo.Role
      WHERE LOWER(LTRIM(RTRIM(RoleName))) = LOWER(@0)
      `, [roleName]);
        const existingId = readNumber(existingRows[0], 'roleId', 'RoleID');
        if (existingId)
            return existingId;
        const rows = await executor.query(`
      DECLARE @OutputRole TABLE (RoleID int);
      INSERT INTO dbo.Role (RoleName)
      OUTPUT INSERTED.RoleID INTO @OutputRole
      VALUES (@0);
      SELECT RoleID AS roleId FROM @OutputRole;
      `, [trimToMax(roleName, 100)]);
        const roleId = readNumber(rows[0], 'roleId', 'RoleID');
        if (!roleId) {
            throw new common_1.BadRequestException('Unable to create EMS role.');
        }
        return roleId;
    }
};
exports.InternalContactSyncService = InternalContactSyncService;
exports.InternalContactSyncService = InternalContactSyncService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [admin_users_service_1.AdminUsersService,
        typeorm_2.DataSource,
        config_1.ConfigService])
], InternalContactSyncService);
function createEmptyCounts() {
    return {
        create: 0,
        update: 0,
        remove: 0,
        disable: 0,
        upToDate: 0,
        possibleDuplicate: 0,
        duplicateConflict: 0,
        emsOnly: 0,
        skipped: 0,
    };
}
function sortRows(left, right) {
    const order = {
        update: 0,
        create: 1,
        remove: 2,
        disable: 3,
        possibleDuplicate: 4,
        duplicateConflict: 5,
        emsOnly: 6,
        skipped: 7,
        upToDate: 8,
    };
    const leftOrder = order[left.type] ?? 99;
    const rightOrder = order[right.type] ?? 99;
    if (leftOrder !== rightOrder)
        return leftOrder - rightOrder;
    return (left.entraName ?? left.emsName ?? '').localeCompare(right.entraName ?? right.emsName ?? '');
}
function change(field, label, from, to, options) {
    return {
        field,
        label,
        from: nullableText(from),
        to: nullableText(to),
        ...(options?.skipped ? { skipped: true } : {}),
        ...(options?.reason ? { reason: options.reason } : {}),
    };
}
function addOptionalChange(changes, field, label, from, to) {
    if (!nullableText(to))
        return;
    changes.push(change(field, label, from, to));
}
function addComparableChange(changes, field, label, from, to, options) {
    const current = nullableText(from);
    const next = nullableText(to);
    const currentComparable = options?.compareAsEmail
        ? normalizeEmail(current)
        : options?.compareAsPhone
            ? normalizePhone(current)
            : cleanText(current);
    const nextComparable = options?.compareAsEmail
        ? normalizeEmail(next)
        : options?.compareAsPhone
            ? normalizePhone(next)
            : cleanText(next);
    if (currentComparable === nextComparable)
        return;
    changes.push(change(field, label, current, next));
}
function getEntraNames(user) {
    const givenName = trimToMax(user.givenName, 100);
    const surname = trimToMax(user.surname, 100);
    if (givenName || surname) {
        return {
            firstName: givenName || fallbackFirstName(user),
            lastName: surname,
        };
    }
    const displayName = cleanText(user.displayName);
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
        return {
            firstName: trimToMax(parts[0], 100),
            lastName: trimToMax(parts.slice(1).join(' '), 100),
        };
    }
    return {
        firstName: trimToMax(displayName || fallbackFirstName(user), 100),
        lastName: '',
    };
}
function fallbackFirstName(user) {
    const emailLocalPart = cleanText(user.email).split('@')[0];
    return emailLocalPart || 'Entra user';
}
function firstBusinessPhone(user) {
    return splitPhoneAndExtension(firstBusinessPhoneRaw(user)).phone;
}
function firstBusinessPhoneExtension(user) {
    return splitPhoneAndExtension(firstBusinessPhoneRaw(user)).extension;
}
function firstBusinessPhoneRaw(user) {
    return Array.isArray(user.businessPhones)
        ? cleanText(user.businessPhones.find((phone) => cleanText(phone)) ?? '')
        : '';
}
function splitPhoneAndExtension(raw) {
    const s = raw.trim();
    if (!s)
        return { phone: '', extension: '' };
    const match = s.match(/^(.*?)[\s,;-]*(?:x|ext\.?|extension)\s*(\d+)\s*$/i);
    if (match)
        return { phone: match[1].trim(), extension: match[2] };
    return { phone: s, extension: '' };
}
function combinePhoneAndExtension(phone, extension) {
    const p = String(phone ?? '').trim();
    const e = String(extension ?? '').trim();
    if (!p)
        return e ? `x${e}` : '';
    return e ? `${p} x${e}` : p;
}
function normalizePersonNameFromUser(user) {
    const names = getEntraNames(user);
    return normalizePersonName(names.firstName, names.lastName, user.displayName);
}
function normalizePersonName(firstName, lastName, fallback) {
    return cleanText(`${firstName} ${lastName}`.trim() || fallback).toLowerCase();
}
function formatContactName(contact) {
    return (`${contact.firstName} ${contact.lastName}`.trim() ||
        contact.email ||
        `Contact ${contact.contactId}`);
}
function primaryDepartmentName(contact) {
    return uniqueClean(contact.assignments.map((assignment) => assignment.departmentName)).join(' & ');
}
function makeMailNickname(email, displayName) {
    const localPart = cleanText(email).split('@')[0];
    const source = localPart || displayName || 'ems-user';
    const nickname = source
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/^[._-]+|[._-]+$/g, '');
    return trimToMax(nickname || 'ems-user', 64);
}
function removeUndefinedValues(payload) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}
async function readResponseText(response) {
    try {
        const text = await response.text();
        return text.slice(0, 1000);
    }
    catch {
        return '';
    }
}
function findGraphPayloadMismatches(payload, user) {
    const mismatches = [];
    for (const [field, expected] of Object.entries(payload)) {
        if (field === 'passwordProfile')
            continue;
        const actual = user[field];
        if (field === 'businessPhones') {
            const expectedPhone = Array.isArray(expected)
                ? normalizePhone(String(expected[0] ?? ''))
                : '';
            const actualPhones = Array.isArray(actual) ? actual : [];
            const actualPhone = normalizePhone(String(actualPhones[0] ?? ''));
            if (expectedPhone !== actualPhone)
                mismatches.push('businessPhones');
            continue;
        }
        if (field === 'mobilePhone') {
            if (normalizePhone(String(expected ?? '')) !== normalizePhone(String(actual ?? ''))) {
                mismatches.push('mobilePhone');
            }
            continue;
        }
        if (field === 'userPrincipalName') {
            const actualUpn = normalizeEmail(String(user.userPrincipalName ?? ''));
            const actualMail = normalizeEmail(String(user.mail ?? ''));
            const expectedEmail = normalizeEmail(String(expected ?? ''));
            if (expectedEmail !== actualUpn && expectedEmail !== actualMail) {
                mismatches.push('userPrincipalName');
            }
            continue;
        }
        if (field === 'accountEnabled') {
            if (Boolean(expected) !== Boolean(actual))
                mismatches.push('accountEnabled');
            continue;
        }
        if (cleanText(String(expected ?? '')) !== cleanText(String(actual ?? ''))) {
            mismatches.push(field);
        }
    }
    return mismatches;
}
function graphFieldLabel(field) {
    const labels = {
        displayName: 'Display Name',
        givenName: 'First Name',
        surname: 'Last Name',
        department: 'Department',
        jobTitle: 'Job Title',
        mobilePhone: 'Mobile Phone',
        businessPhones: 'Work Phone',
        userPrincipalName: 'Email / UPN',
        accountEnabled: 'Account Status',
    };
    return labels[field] ?? field;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isGraphAuthorizationDenied(error) {
    const parts = [];
    if (error instanceof Error)
        parts.push(error.message);
    const response = typeof error === 'object' && error !== null && 'getResponse' in error
        ? error.getResponse?.()
        : undefined;
    if (typeof response === 'string')
        parts.push(response);
    if (response && typeof response === 'object') {
        const value = response.message;
        if (typeof value === 'string')
            parts.push(value);
    }
    const text = parts.join('\n');
    return /status 403|Authorization_RequestDenied|Insufficient privileges/i.test(text);
}
function formatSyncError(prefix, error) {
    if (error && typeof error === 'object') {
        if ('getResponse' in error && typeof error.getResponse === 'function') {
            const resp = error.getResponse();
            if (resp && typeof resp === 'object') {
                const detail = resp.detail;
                if (typeof detail === 'string' && detail) {
                    return `${prefix}: ${detail}`;
                }
                const message = resp.message;
                if (typeof message === 'string' && message) {
                    return `${prefix}: ${message}`;
                }
            }
        }
    }
    if (error instanceof Error && error.message) {
        return `${prefix}: ${error.message}`;
    }
    return prefix;
}
function groupBy(items, getKey) {
    const groups = new Map();
    for (const item of items) {
        const key = getKey(item);
        if (!key)
            continue;
        const group = groups.get(key);
        if (group)
            group.push(item);
        else
            groups.set(key, [item]);
    }
    return groups;
}
function normalizeEmail(value) {
    return cleanText(value).toLowerCase();
}
function normalizePhone(value) {
    const cleaned = cleanText(value);
    if (!cleaned)
        return '';
    let digits = cleaned.replace(/\D/g, '');
    if (digits.startsWith('00'))
        digits = digits.slice(2);
    return digits;
}
function normalizeLookupName(value) {
    return trimToMax(cleanText(value), 100);
}
function uniqueClean(values) {
    return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}
function cleanText(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
}
function nullableText(value) {
    const cleaned = cleanText(value);
    return cleaned ? cleaned : null;
}
function parseEntraDepartments(departmentStr) {
    const cleaned = cleanText(departmentStr);
    if (!cleaned)
        return [];
    return cleaned.split('&').map(d => trimToMax(cleanText(d), 100)).filter(Boolean);
}
function levenshteinDistance(a, b) {
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}
function trimToMax(value, maxLength) {
    return cleanText(value).slice(0, maxLength);
}
function sanitizePhoneForGraph(value) {
    const cleaned = cleanText(value);
    if (!cleaned)
        return '';
    return cleaned.replace(/\s*(x|ext\.?|extension)\s*\d+$/i, '').trim();
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
//# sourceMappingURL=internal-contact-sync.service.js.map