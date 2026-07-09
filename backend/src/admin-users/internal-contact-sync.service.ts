import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  IAE_ENTRA_COMPANY_NAME,
  isIaeEntraCompany,
} from './admin-users.constants';
import {
  AdminDirectorySyncUser,
  AdminUsersService,
} from './admin-users.service';

type SyncActionType =
  | 'create'
  | 'update'
  | 'remove'
  | 'disable'
  | 'upToDate'
  | 'possibleDuplicate'
  | 'duplicateConflict'
  | 'emsOnly'
  | 'skipped';

export type InternalContactSyncFieldChange = {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
  skipped?: boolean;
  reason?: string;
};

export type InternalContactSyncCandidate = {
  contactId?: number;
  entraUserId?: string;
  name: string;
  email: string;
  departments: string[];
  roles: string[];
};

export type InternalContactSyncRow = {
  actionId: string;
  type: SyncActionType;
  reason: string;
  entraUserId?: string;
  contactId?: number;
  entraName?: string;
  entraEmail?: string;
  emsName?: string;
  emsEmail?: string;
  changes: InternalContactSyncFieldChange[];
  candidateContacts?: InternalContactSyncCandidate[];
  dependencies?: string[];
};

export type InternalContactSyncPreview = {
  generatedAt: string;
  internalCompany: {
    companyId: number;
    companyName: string;
  };
  jobTitleColumnAvailable: boolean;
  counts: Record<SyncActionType, number>;
  rows: InternalContactSyncRow[];
  warnings: string[];
};

export type ApplyInternalContactSyncDto = {
  selectedActionIds?: string[];
  manualMappings?: Array<{
    entraUserId?: string;
    targetEntraUserId?: string;
    contactId?: number;
  }>;
  selectedActionFields?: Record<string, string[]>;
};

export type InternalContactSyncApplyResult = {
  appliedAt: string;
  internalCompany: {
    companyId: number;
    companyName: string;
  };
  jobTitleColumnAvailable: boolean;
  created: number;
  updated: number;
  removed: number;
  disabled: number;
  skipped: number;
  skippedJobTitleWrites: number;
  createdEntraUsers?: Array<{
    displayName: string;
    userPrincipalName: string;
    temporaryPassword: string;
  }>;
  errors: string[];
};

type InternalCompanySnapshot = {
  companyId: number;
  companyName: string;
};

type InternalContactAssignmentSnapshot = {
  contactAssignmentId: number;
  roleId: number;
  roleName: string;
  departmentId: number;
  departmentName: string;
};

type InternalContactSnapshot = {
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  workPhone: string;
  jobTitle: string;
  assignments: InternalContactAssignmentSnapshot[];
};

type InternalContactSyncModel = {
  preview: InternalContactSyncPreview;
  usersById: Map<string, AdminDirectorySyncUser>;
  contactsById: Map<number, InternalContactSnapshot>;
};

type SqlExecutor = Pick<DataSource | EntityManager, 'query'>;

const DEFAULT_INTERNAL_ROLE_NAME = 'Internal Staff';
const DEFAULT_DEPARTMENT_NAME = 'Unknown';
const SYNC_AUDIT_USER = 'Entra manual sync';
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

@Injectable()
export class InternalContactSyncService {
  private appGraphTokenCache: { accessToken: string; expiresAt: number } | null =
    null;

  constructor(
    private readonly adminUsersService: AdminUsersService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async previewInternalContactSync(
    graphAccessToken?: string,
  ): Promise<InternalContactSyncPreview> {
    return this.previewEntraToEmsContactSync(graphAccessToken);
  }

  async updateEntraUserByIdentifier(
    userIdentifier: string,
    payload: Record<string, unknown>,
    graphAccessToken?: string,
  ): Promise<void> {
    const identifier = cleanText(userIdentifier);
    if (!identifier) {
      throw new BadRequestException('Microsoft Entra user identifier is required.');
    }
    const cleanedPayload = removeUndefinedValues(payload);
    if (Object.keys(cleanedPayload).length === 0) return;
    const delegatedToken = cleanText(graphAccessToken);
    if (delegatedToken) {
      try {
        await this.graphRequest(
          delegatedToken,
          'PATCH',
          `${GRAPH_BASE_URL}/users/${encodeURIComponent(identifier)}`,
          cleanedPayload,
        );
        return;
      } catch (error) {
        if (!isGraphAuthorizationDenied(error)) throw error;
      }
    }

    await this.graphRequest(
      await this.getGraphWriteAccessToken(),
      'PATCH',
      `${GRAPH_BASE_URL}/users/${encodeURIComponent(identifier)}`,
      cleanedPayload,
    );
  }

  async updateAndVerifyEntraUserByIdentifier(
    userIdentifier: string,
    payload: Record<string, unknown>,
    graphAccessToken?: string,
  ): Promise<void> {
    await this.updateEntraUserByIdentifier(
      userIdentifier,
      payload,
      graphAccessToken,
    );
    await this.verifyEntraUserPayload(
      await this.getGraphWriteAccessToken(graphAccessToken),
      userIdentifier,
      removeUndefinedValues(payload),
    );
  }

  async applyInternalContactSync(
    dto: ApplyInternalContactSyncDto,
    graphAccessToken?: string,
  ): Promise<InternalContactSyncApplyResult> {
    return this.applyEntraToEmsContactSync(dto, graphAccessToken);
  }

  async previewEntraToEmsContactSync(
    graphAccessToken?: string,
  ): Promise<InternalContactSyncPreview> {
    return (await this.buildEntraToEmsSyncModel(graphAccessToken)).preview;
  }

  async applyEntraToEmsContactSync(
    dto: ApplyInternalContactSyncDto,
    graphAccessToken?: string,
  ): Promise<InternalContactSyncApplyResult> {
    const model = await this.buildEntraToEmsSyncModel(graphAccessToken);
    const selectedActionIds = new Set(
      Array.isArray(dto?.selectedActionIds) ? dto.selectedActionIds : [],
    );
    const manualMappings = Array.isArray(dto?.manualMappings)
      ? dto.manualMappings
      : [];
    const errors: string[] = [];
    const updateTargets = new Map<
      string,
      { user: AdminDirectorySyncUser; contact: InternalContactSnapshot; selectedFields?: string[] }
    >();
    const createTargets: AdminDirectorySyncUser[] = [];
    const removeTargets: InternalContactSnapshot[] = [];

    for (const row of model.preview.rows) {
      if (!selectedActionIds.has(row.actionId)) continue;

      if (row.type === 'remove' && row.contactId) {
        const contact = model.contactsById.get(row.contactId);
        if (contact) removeTargets.push(contact);
        continue;
      }

      if (!row.entraUserId) continue;
      const user = model.usersById.get(row.entraUserId);
      if (!user) continue;

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
          await this.removeInternalCompanyAssignments(
            manager,
            model.preview.internalCompany.companyId,
            contact.contactId,
          );
          removed += 1;
        }

        for (const user of createTargets) {
          if (!user.accountEnabled || !normalizeEmail(user.email)) {
            errors.push(`${user.displayName} was skipped.`);
            continue;
          }
          const result = await this.createInternalContactFromEntra(
            manager,
            model.preview.internalCompany.companyId,
            user,
            model.preview.jobTitleColumnAvailable,
          );
          created += 1;
          skippedJobTitleWrites += result.skippedJobTitleWrites;
        }

        for (const { user, contact, selectedFields } of updateTargets.values()) {
          const result = await this.updateInternalContactFromEntra(
            manager,
            model.preview.internalCompany.companyId,
            contact,
            user,
            model.preview.jobTitleColumnAvailable,
            selectedFields,
          );
          updated += 1;
          skippedJobTitleWrites += result.skippedJobTitleWrites;
        }
      });
    } catch (error) {
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
      skipped: Math.max(
        0,
        selectedActionIds.size +
          manualMappings.length -
          created -
          updated -
          removed,
      ),
      skippedJobTitleWrites,
      errors,
    };
  }

  async previewEmsToEntraContactSync(
    graphAccessToken?: string,
  ): Promise<InternalContactSyncPreview> {
    return (await this.buildEmsToEntraSyncModel(graphAccessToken)).preview;
  }

  async applyEmsToEntraContactSync(
    dto: ApplyInternalContactSyncDto,
    graphAccessToken?: string,
  ): Promise<InternalContactSyncApplyResult> {
    const model = await this.buildEmsToEntraSyncModel(graphAccessToken);
    const selectedActionIds = new Set(
      Array.isArray(dto?.selectedActionIds) ? dto.selectedActionIds : [],
    );
    const manualMappings = Array.isArray(dto?.manualMappings)
      ? dto.manualMappings
      : [];
    const graphWriteToken = await this.getGraphWriteAccessToken(graphAccessToken);
    const errors: string[] = [];
    const updateTargets = new Map<
      string,
      { contact: InternalContactSnapshot; user: AdminDirectorySyncUser; selectedFields?: string[] }
    >();
    const createTargets: InternalContactSnapshot[] = [];
    const disableTargets: AdminDirectorySyncUser[] = [];

    for (const row of model.preview.rows) {
      if (!selectedActionIds.has(row.actionId)) continue;

      if (row.type === 'create' && row.contactId) {
        const contact = model.contactsById.get(row.contactId);
        if (contact) createTargets.push(contact);
        continue;
      }

      if (row.type === 'disable' && row.entraUserId) {
        const user = model.usersById.get(row.entraUserId);
        if (user) disableTargets.push(user);
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
      const entraUserId = cleanText(
        mapping?.targetEntraUserId ?? mapping?.entraUserId,
      );
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
    const createdEntraUsers: InternalContactSyncApplyResult['createdEntraUsers'] =
      [];

    for (const contact of createTargets) {
      try {
        const credential = await this.createEntraUserFromEmsContact(
          graphWriteToken,
          contact,
          model.preview.jobTitleColumnAvailable,
        );
        created += 1;
        createdEntraUsers.push(credential);
      } catch (error) {
        errors.push(formatSyncError(`Could not create ${formatContactName(contact)} in Entra`, error));
      }
    }

    for (const { contact, user, selectedFields } of updateTargets.values()) {
      try {
        await this.updateEntraUserFromEmsContact(
          graphWriteToken,
          user.id,
          contact,
          model.preview.jobTitleColumnAvailable,
          true,
          selectedFields,
        );
        updated += 1;
      } catch (error) {
        errors.push(formatSyncError(`Could not update ${formatContactName(contact)} in Entra`, error));
      }
    }

    for (const user of disableTargets) {
      try {
        await this.disableEntraUser(graphWriteToken, user.id);
        disabled += 1;
      } catch (error) {
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
      skipped: Math.max(
        0,
        selectedActionIds.size +
          manualMappings.length -
          created -
          updated -
          disabled,
      ),
      skippedJobTitleWrites: 0,
      createdEntraUsers,
      errors,
    };
  }

  private async buildEntraToEmsSyncModel(
    graphAccessToken?: string,
  ): Promise<InternalContactSyncModel> {
    const [internalCompany, jobTitleColumnAvailable, users] =
      await Promise.all([
        this.getInternalCompany(),
        this.hasContactInfoJobTitleColumn(),
        this.adminUsersService.listUsersForSync(graphAccessToken),
      ]);
    const contacts = await this.loadInternalContacts(
      internalCompany.companyId,
      jobTitleColumnAvailable,
    );

    const dependencyRows = await this.dataSource.query(
      `
      SELECT ca.ContactID as contactId,
             CASE WHEN ec.ContactAssignmentID IS NOT NULL THEN 'Employee Computer' ELSE NULL END as computerDep,
             CASE WHEN ewl.ContactAssignmentID IS NOT NULL THEN 'Employee Work Location' ELSE NULL END as locationDep,
             CASE WHEN epe.ContactAssignmentID IS NOT NULL THEN 'Phone Extension' ELSE NULL END as phoneDep
      FROM dbo.ContactAssignment ca
      LEFT JOIN dbo.EmployeeComputer ec ON ec.ContactAssignmentID = ca.ContactAssignmentID
      LEFT JOIN dbo.EmployeeWorkLocation ewl ON ewl.ContactAssignmentID = ca.ContactAssignmentID
      LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ContactAssignmentID = ca.ContactAssignmentID
      WHERE ca.CompanyID = @0
      `,
      [internalCompany.companyId]
    );

    const depsByContactId = new Map<number, Set<string>>();
    for (const row of dependencyRows) {
      const cid = readNumber(row, 'contactId', 'ContactID');
      if (!cid) continue;
      let set = depsByContactId.get(cid);
      if (!set) {
        set = new Set<string>();
        depsByContactId.set(cid, set);
      }
      if (row.computerDep) set.add(row.computerDep as string);
      if (row.locationDep) set.add(row.locationDep as string);
      if (row.phoneDep) set.add(row.phoneDep as string);
    }
    const contactsById = new Map(
      contacts.map((contact) => [contact.contactId, contact]),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));
    const contactsByEmail = groupBy(contacts, (contact) =>
      normalizeEmail(contact.email),
    );
    const contactsByName = groupBy(contacts, (contact) =>
      normalizePersonName(contact.firstName, contact.lastName, ''),
    );
    const activeUsersByEmail = groupBy(
      users.filter((user) => user.accountEnabled && normalizeEmail(user.email) && isIaeEntraCompany(user.companyName)),
      (user) => normalizeEmail(user.email),
    );
    const activeEntraEmailSet = new Set(activeUsersByEmail.keys());
    const referencedContactIds = new Set<number>();
    const rows: InternalContactSyncRow[] = [];
    const warnings: string[] = [];

    if (!jobTitleColumnAvailable) {
      warnings.push(
        'ContactInfo.JobTitle does not exist yet. Job title values are shown but not written until the client adds the column.',
      );
    }

    for (const user of users) {
      if (!isIaeEntraCompany(user.companyName)) {
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
          candidateContacts: emailMatches.map((contact) =>
            this.toCandidateContact(contact),
          ),
        });
        continue;
      }

      const nameMatches =
        contactsByName.get(normalizePersonNameFromUser(user)) ?? [];
      if (nameMatches.length > 0) {
        nameMatches.forEach((contact) => referencedContactIds.add(contact.contactId));
        rows.push({
          actionId: `possible-duplicate:${user.id}`,
          type: 'possibleDuplicate',
          reason:
            'No email match was found, but one or more EMS internal contacts have the same name.',
          entraUserId: user.id,
          entraName: user.displayName,
          entraEmail: user.email,
          changes: this.buildCreateChanges(user, jobTitleColumnAvailable),
          candidateContacts: nameMatches.map((contact) =>
            this.toCandidateContact(contact),
          ),
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
      if (referencedContactIds.has(contact.contactId)) continue;
      const email = normalizeEmail(contact.email);
      if (email && activeEntraEmailSet.has(email)) continue;

      const deps = depsByContactId.get(contact.contactId);

      rows.push({
        actionId: `remove:${contact.contactId}`,
        type: 'remove',
        reason:
          'Exists in EMS internal contacts but is not an active member of the Entra company. Applying removes it from the internal company.',
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
    };
  }

  private async buildEmsToEntraSyncModel(
    graphAccessToken?: string,
  ): Promise<InternalContactSyncModel> {
    const [internalCompany, jobTitleColumnAvailable, users] =
      await Promise.all([
        this.getInternalCompany(),
        this.hasContactInfoJobTitleColumn(),
        this.adminUsersService.listUsersForSync(graphAccessToken),
      ]);
    const contacts = await this.loadInternalContacts(
      internalCompany.companyId,
      jobTitleColumnAvailable,
    );
    const contactsById = new Map(
      contacts.map((contact) => [contact.contactId, contact]),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));
    const contactsByEmail = groupBy(contacts, (contact) =>
      normalizeEmail(contact.email),
    );
    const usersByEmail = groupBy(
      users.filter((user) => normalizeEmail(user.email)),
      (user) => normalizeEmail(user.email),
    );
    const usersByName = groupBy(users, (user) =>
      normalizePersonNameFromUser(user),
    );
    const referencedUserIds = new Set<string>();
    const rows: InternalContactSyncRow[] = [];
    const warnings: string[] = [];

    if (!jobTitleColumnAvailable) {
      warnings.push(
        'ContactInfo.JobTitle does not exist yet. EMS cannot enforce job title into Entra until the client adds the column.',
      );
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
          candidateContacts: duplicateEmsContacts.map((candidate) =>
            this.toCandidateContact(candidate),
          ),
        });
        continue;
      }

      const emailMatches = usersByEmail.get(email) ?? [];
      if (emailMatches.length === 1) {
        const user = emailMatches[0];
        referencedUserIds.add(user.id);
        if (!isIaeEntraCompany(user.companyName)) {
          // Surface instead of auto-linking: writing EMS data into a non-IAE Entra
          // account is out of scope for the employee sync.
          rows.push({
            actionId: `skipped:${contact.contactId}`,
            type: 'skipped',
            reason: `Matched Entra user's Company Name ${
              user.companyName?.trim() ? `"${user.companyName.trim()}"` : '(blank)'
            } is not ${IAE_ENTRA_COMPANY_NAME} — fix the Entra Company Name first.`,
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
        rows.push(
          this.buildEmsToEntraMatchedRow(
            contact,
            user,
            jobTitleColumnAvailable,
          ),
        );
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
          candidateContacts: emailMatches.map((user) =>
            this.toCandidateEntraUser(user),
          ),
        });
        continue;
      }

      const nameMatches =
        usersByName.get(
          normalizePersonName(contact.firstName, contact.lastName, contact.email),
        ) ?? [];
      if (nameMatches.length > 0) {
        nameMatches.forEach((user) => referencedUserIds.add(user.id));
        rows.push({
          actionId: `possible-duplicate:${contact.contactId}`,
          type: 'possibleDuplicate',
          reason:
            'No email match was found, but one or more Entra users have the same name.',
          contactId: contact.contactId,
          emsName: formatContactName(contact),
          emsEmail: contact.email,
          changes: this.buildCreateEntraChanges(contact, jobTitleColumnAvailable),
          candidateContacts: nameMatches.map((user) =>
            this.toCandidateEntraUser(user),
          ),
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

    const emsEmails = new Set(
      contacts.map((contact) => normalizeEmail(contact.email)).filter(Boolean),
    );
    for (const user of users) {
      if (!user.accountEnabled) continue;
      if (referencedUserIds.has(user.id)) continue;
      // Non-IAE accounts (vendors, service accounts, other companies) are outside
      // the employee sync — never propose disabling them.
      if (!isIaeEntraCompany(user.companyName)) continue;
      const email = normalizeEmail(user.email);
      if (email && emsEmails.has(email)) continue;

      rows.push({
        actionId: `disable:${user.id}`,
        type: 'disable',
        reason:
          'Active Entra user does not exist in EMS internal contacts. Applying disables the Entra account.',
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
    };
  }

  private async getInternalCompany(): Promise<InternalCompanySnapshot> {
    const rows = await this.dataSource.query(
      `
      SELECT CompanyID AS companyId, CompanyName AS companyName
      FROM dbo.Company
      WHERE is_internal = 1
      ORDER BY CompanyID
      `,
    );

    if (rows.length === 0) {
      throw new BadRequestException(
        'No internal company exists. Mark exactly one company as internal before syncing Entra contacts.',
      );
    }
    if (rows.length > 1) {
      throw new BadRequestException(
        'More than one internal company exists. Keep exactly one internal company before syncing Entra contacts.',
      );
    }

    return {
      companyId: readNumber(rows[0], 'companyId', 'CompanyID') ?? 0,
      companyName: readString(rows[0], 'companyName', 'CompanyName'),
    };
  }

  private async hasContactInfoJobTitleColumn(
    executor: SqlExecutor = this.dataSource,
  ): Promise<boolean> {
    const rows = await executor.query(
      `
      SELECT 1 AS hasColumn
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'ContactInfo'
        AND COLUMN_NAME = 'JobTitle'
      `,
    );
    return rows.length > 0;
  }

  private async loadInternalContacts(
    companyId: number,
    jobTitleColumnAvailable: boolean,
  ): Promise<InternalContactSnapshot[]> {
    const jobTitleSelect = jobTitleColumnAvailable
      ? 'ci.JobTitle AS jobTitle'
      : 'CAST(NULL AS nvarchar(150)) AS jobTitle';
    const rows = await this.dataSource.query(
      `
      SELECT
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        ci.CellPhone AS cellPhone,
        ci.WorkPhone AS workPhone,
        ${jobTitleSelect},
        ca.ContactAssignmentID AS contactAssignmentId,
        ca.RoleID AS roleId,
        COALESCE(r.RoleName, '') AS roleName,
        ca.DepartmentID AS departmentId,
        COALESCE(d.DepartmentName, '') AS departmentName
      FROM dbo.ContactAssignment ca
      INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      LEFT JOIN dbo.Role r ON r.RoleID = ca.RoleID
      LEFT JOIN dbo.Department d ON d.DepartmentID = ca.DepartmentID
      WHERE ca.CompanyID = @0
      ORDER BY ci.FirstName, ci.LastName, ci.Email, ca.ContactAssignmentID
      `,
      [companyId],
    );
    const contacts = new Map<number, InternalContactSnapshot>();

    for (const row of rows) {
      const contactId = readNumber(row, 'contactId', 'ContactID');
      const contactInfoId = readNumber(row, 'contactInfoId', 'ContactInfoID');
      if (!contactId || !contactInfoId) continue;

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
          jobTitle: readString(row, 'jobTitle', 'JobTitle'),
          assignments: [],
        };
        contacts.set(contactId, contact);
      }

      contact.assignments.push({
        contactAssignmentId:
          readNumber(row, 'contactAssignmentId', 'ContactAssignmentID') ?? 0,
        roleId: readNumber(row, 'roleId', 'RoleID') ?? 0,
        roleName: readString(row, 'roleName', 'RoleName'),
        departmentId: readNumber(row, 'departmentId', 'DepartmentID') ?? 0,
        departmentName: readString(row, 'departmentName', 'DepartmentName'),
      });
    }

    return Array.from(contacts.values());
  }

  private buildMatchedRow(
    user: AdminDirectorySyncUser,
    contact: InternalContactSnapshot,
    jobTitleColumnAvailable: boolean,
  ): InternalContactSyncRow {
    const changes = this.buildUpdateChanges(
      user,
      contact,
      jobTitleColumnAvailable,
    );
    const writableChanges = changes.filter((change) => !change.skipped);
    const type: SyncActionType = writableChanges.length > 0 ? 'update' : 'upToDate';

    return {
      actionId: `${type}:${user.id}:${contact.contactId}`,
      type,
      reason:
        type === 'update'
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

  private buildEmsToEntraMatchedRow(
    contact: InternalContactSnapshot,
    user: AdminDirectorySyncUser,
    jobTitleColumnAvailable: boolean,
  ): InternalContactSyncRow {
    const changes = this.buildUpdateEntraChanges(
      contact,
      user,
      jobTitleColumnAvailable,
    );
    const type: SyncActionType = changes.length > 0 ? 'update' : 'upToDate';

    return {
      actionId: `${type}:${contact.contactId}:${user.id}`,
      type,
      reason:
        type === 'update'
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

  private buildSkippedUserRow(
    user: AdminDirectorySyncUser,
    reason: string,
  ): InternalContactSyncRow {
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

  private buildCreateChanges(
    user: AdminDirectorySyncUser,
    jobTitleColumnAvailable: boolean,
  ): InternalContactSyncFieldChange[] {
    const names = getEntraNames(user);
    const changes: InternalContactSyncFieldChange[] = [
      change('firstName', 'First Name', null, names.firstName),
      change('lastName', 'Last Name', null, names.lastName),
      change('email', 'Email', null, user.email),
    ];
    addOptionalChange(changes, 'cellPhone', 'Cell Phone', null, trimToMax(user.mobilePhone, 30));
    addOptionalChange(
      changes,
      'workPhone',
      'Work Phone',
      null,
      trimToMax(firstBusinessPhone(user), 30),
    );
    const parsedDepts = parseEntraDepartments(user.department);
    addOptionalChange(
      changes,
      'department',
      'Department',
      null,
      parsedDepts.length > 0 ? parsedDepts.join(', ') : DEFAULT_DEPARTMENT_NAME,
    );
    this.addJobTitleChange(changes, null, user.jobTitle, jobTitleColumnAvailable);
    return changes;
  }

  private buildUpdateChanges(
    user: AdminDirectorySyncUser,
    contact: InternalContactSnapshot,
    jobTitleColumnAvailable: boolean,
  ): InternalContactSyncFieldChange[] {
    const names = getEntraNames(user);
    const changes: InternalContactSyncFieldChange[] = [];

    addComparableChange(changes, 'firstName', 'First Name', contact.firstName, names.firstName);
    addComparableChange(changes, 'lastName', 'Last Name', contact.lastName, names.lastName);
    addComparableChange(changes, 'email', 'Email', contact.email, user.email, {
      compareAsEmail: true,
    });
    addComparableChange(
      changes,
      'cellPhone',
      'Cell Phone',
      contact.cellPhone,
      trimToMax(user.mobilePhone, 30),
      { compareAsPhone: true },
    );
    addComparableChange(
      changes,
      'workPhone',
      'Work Phone',
      contact.workPhone,
      trimToMax(firstBusinessPhone(user), 30),
      { compareAsPhone: true },
    );

    const entraDepartments = parseEntraDepartments(user.department);
    if (entraDepartments.length > 0) {
      const currentDepartments = uniqueClean(
        contact.assignments.map((assignment) => assignment.departmentName),
      );
      const currentDepartmentLabel = currentDepartments.join(', ');
      const entraDepartmentLabel = entraDepartments.join(', ');
      
      const currentSet = new Set(currentDepartments.map(d => normalizeLookupName(d).toLowerCase()));
      const entraSet = new Set(entraDepartments.map(d => d.toLowerCase()));
      
      let isDifferent = currentSet.size !== entraSet.size;
      if (!isDifferent) {
        for (const d of entraSet) {
          if (!currentSet.has(d)) {
            isDifferent = true; break;
          }
        }
      }

      if (isDifferent) {
        changes.push(
          change(
            'department',
            'Department',
            currentDepartmentLabel || null,
            entraDepartmentLabel,
          ),
        );
      }
    }

    this.addJobTitleChange(
      changes,
      contact.jobTitle,
      user.jobTitle,
      jobTitleColumnAvailable,
    );
    return changes;
  }

  private buildCreateEntraChanges(
    contact: InternalContactSnapshot,
    jobTitleColumnAvailable: boolean,
  ): InternalContactSyncFieldChange[] {
    const changes: InternalContactSyncFieldChange[] = [
      change('displayName', 'Display Name', null, formatContactName(contact)),
      change('givenName', 'First Name', null, contact.firstName),
      change('surname', 'Last Name', null, contact.lastName),
      change('userPrincipalName', 'Email / UPN', null, contact.email),
      change('accountEnabled', 'Account Status', null, 'Active'),
    ];
    addOptionalChange(changes, 'mobilePhone', 'Mobile Phone', null, trimToMax(contact.cellPhone, 30));
    addOptionalChange(changes, 'businessPhones', 'Work Phone', null, trimToMax(contact.workPhone, 30));
    addOptionalChange(
      changes,
      'department',
      'Department',
      null,
      primaryDepartmentName(contact),
    );
    if (jobTitleColumnAvailable) {
      addOptionalChange(changes, 'jobTitle', 'Job Title', null, trimToMax(contact.jobTitle, 150));
    }
    return changes;
  }

  private buildUpdateEntraChanges(
    contact: InternalContactSnapshot,
    user: AdminDirectorySyncUser,
    jobTitleColumnAvailable: boolean,
  ): InternalContactSyncFieldChange[] {
    const changes: InternalContactSyncFieldChange[] = [];
    addComparableChange(
      changes,
      'displayName',
      'Display Name',
      user.displayName,
      formatContactName(contact),
    );
    addComparableChange(changes, 'givenName', 'First Name', user.givenName, contact.firstName);
    addComparableChange(changes, 'surname', 'Last Name', user.surname, contact.lastName);
    addComparableChange(
      changes,
      'userPrincipalName',
      'Email / UPN',
      user.userPrincipalName || user.email,
      contact.email,
      { compareAsEmail: true },
    );
    addComparableChange(
      changes,
      'mobilePhone',
      'Mobile Phone',
      user.mobilePhone,
      trimToMax(contact.cellPhone, 30),
      { compareAsPhone: true },
    );
    addComparableChange(
      changes,
      'businessPhones',
      'Work Phone',
      firstBusinessPhone(user),
      trimToMax(contact.workPhone, 30),
      { compareAsPhone: true },
    );
    addComparableChange(
      changes,
      'department',
      'Department',
      user.department,
      primaryDepartmentName(contact),
    );
    if (jobTitleColumnAvailable) {
      addComparableChange(
        changes,
        'jobTitle',
        'Job Title',
        user.jobTitle,
        trimToMax(contact.jobTitle, 150),
      );
    }
    if (!user.accountEnabled) {
      changes.push(change('accountEnabled', 'Account Status', 'Disabled', 'Active'));
    }
    return changes;
  }

  private addJobTitleChange(
    changes: InternalContactSyncFieldChange[],
    currentValue: string | null,
    entraValue: string,
    jobTitleColumnAvailable: boolean,
  ): void {
    const nextValue = trimToMax(entraValue, 150);
    if (!nextValue) return;
    if (!jobTitleColumnAvailable) {
      changes.push(
        change('jobTitle', 'Job Title', currentValue, nextValue, {
          skipped: true,
          reason: 'ContactInfo.JobTitle column has not been added yet.',
        }),
      );
      return;
    }
    addComparableChange(changes, 'jobTitle', 'Job Title', currentValue, nextValue);
  }

  private toCandidateContact(
    contact: InternalContactSnapshot,
  ): InternalContactSyncCandidate {
    return {
      contactId: contact.contactId,
      name: formatContactName(contact),
      email: contact.email,
      departments: uniqueClean(
        contact.assignments.map((assignment) => assignment.departmentName),
      ),
      roles: uniqueClean(contact.assignments.map((assignment) => assignment.roleName)),
    };
  }

  private toCandidateEntraUser(
    user: AdminDirectorySyncUser,
  ): InternalContactSyncCandidate {
    return {
      entraUserId: user.id,
      name: user.displayName,
      email: user.email,
      departments: user.department ? [user.department] : [],
      roles: [user.accountEnabled ? 'Active' : 'Disabled'],
    };
  }

  private async createInternalContactFromEntra(
    manager: EntityManager,
    companyId: number,
    user: AdminDirectorySyncUser,
    jobTitleColumnAvailable: boolean,
  ): Promise<{ skippedJobTitleWrites: number }> {
    const names = getEntraNames(user);
    const email = trimToMax(user.email, 254);
    const cellPhone = nullableText(trimToMax(user.mobilePhone, 30));
    const workPhone = nullableText(trimToMax(firstBusinessPhone(user), 30));
    const jobTitle = trimToMax(user.jobTitle, 150);
    const departmentNames = parseEntraDepartments(user.department);
    if (departmentNames.length === 0) {
      departmentNames.push(DEFAULT_DEPARTMENT_NAME);
    }
    const departmentIds: number[] = [];
    for (const name of departmentNames) {
      departmentIds.push(await this.findOrCreateDepartment(manager, name));
    }
    const roleId = await this.findOrCreateRole(manager, DEFAULT_INTERNAL_ROLE_NAME);

    // 1. Check if email already exists globally in ContactInfo
    const existingContactRows = await manager.query(
      `
      SELECT TOP 1 c.ContactID AS contactId, ci.ContactInfoID AS contactInfoId
      FROM dbo.ContactInfo ci
      LEFT JOIN dbo.Contact c ON c.ContactInfoID = ci.ContactInfoID
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `,
      [email || ''],
    );

    let contactId = readNumber(existingContactRows[0], 'contactId', 'ContactID') ?? 0;
    let contactInfoId = readNumber(existingContactRows[0], 'contactInfoId', 'ContactInfoID') ?? 0;

    // 2. Upsert ContactInfo
    if (!contactInfoId) {
      const contactInfoRows = jobTitleColumnAvailable
        ? await manager.query(
            `
            DECLARE @OutputTable TABLE (ContactInfoID int);
            INSERT INTO dbo.ContactInfo
              (FirstName, LastName, Email, CellPhone, WorkPhone, JobTitle)
            OUTPUT INSERTED.ContactInfoID INTO @OutputTable
            VALUES (@0, @1, @2, @3, @4, @5);
            SELECT ContactInfoID AS contactInfoId FROM @OutputTable;
            `,
            [
              trimToMax(names.firstName, 100),
              trimToMax(names.lastName, 100),
              email,
              cellPhone,
              workPhone,
              nullableText(jobTitle),
            ],
          )
        : await manager.query(
            `
            DECLARE @OutputTable TABLE (ContactInfoID int);
            INSERT INTO dbo.ContactInfo
              (FirstName, LastName, Email, CellPhone, WorkPhone)
            OUTPUT INSERTED.ContactInfoID INTO @OutputTable
            VALUES (@0, @1, @2, @3, @4);
            SELECT ContactInfoID AS contactInfoId FROM @OutputTable;
            `,
            [
              trimToMax(names.firstName, 100),
              trimToMax(names.lastName, 100),
              email,
              cellPhone,
              workPhone,
            ],
          );
      contactInfoId =
        readNumber(contactInfoRows[0], 'contactInfoId', 'ContactInfoID') ?? 0;
      if (!contactInfoId) {
        throw new BadRequestException('Unable to create internal contact info.');
      }
    } else {
      if (jobTitleColumnAvailable) {
        await manager.query(
          `
          UPDATE dbo.ContactInfo
          SET FirstName = @0, LastName = @1, CellPhone = @2, WorkPhone = @3, JobTitle = @4
          WHERE ContactInfoID = @5
          `,
          [
            trimToMax(names.firstName, 100),
            trimToMax(names.lastName, 100),
            cellPhone,
            workPhone,
            nullableText(jobTitle),
            contactInfoId,
          ],
        );
      } else {
        await manager.query(
          `
          UPDATE dbo.ContactInfo
          SET FirstName = @0, LastName = @1, CellPhone = @2, WorkPhone = @3
          WHERE ContactInfoID = @4
          `,
          [
            trimToMax(names.firstName, 100),
            trimToMax(names.lastName, 100),
            cellPhone,
            workPhone,
            contactInfoId,
          ],
        );
      }
    }

    // 3. Upsert Contact (if missing)
    if (!contactId) {
      const contactRows = await manager.query(
        `
        DECLARE @OutputContact TABLE (ContactID int);
        INSERT INTO dbo.Contact (ContactInfoID, created_by, created_at)
        OUTPUT INSERTED.ContactID INTO @OutputContact
        VALUES (@0, @1, SYSUTCDATETIME());
        SELECT ContactID AS contactId FROM @OutputContact;
        `,
        [contactInfoId, SYNC_AUDIT_USER],
      );
      contactId = readNumber(contactRows[0], 'contactId', 'ContactID') ?? 0;
      if (!contactId) {
        throw new BadRequestException('Unable to create internal contact.');
      }
    }

    // 4. Upsert ContactAssignment for this Company
    await this.syncContactAssignments(manager, contactId, companyId, roleId, departmentIds);

    return {
      skippedJobTitleWrites: jobTitle && !jobTitleColumnAvailable ? 1 : 0,
    };
  }

  private async updateInternalContactFromEntra(
    manager: EntityManager,
    companyId: number,
    contact: InternalContactSnapshot,
    user: AdminDirectorySyncUser,
    jobTitleColumnAvailable: boolean,
    selectedFieldsArray?: string[],
  ): Promise<{ skippedJobTitleWrites: number }> {
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

    if (jobTitleColumnAvailable) {
      await manager.query(
        `
        UPDATE dbo.ContactInfo
        SET FirstName = @0,
            LastName = @1,
            Email = @2,
            CellPhone = @3,
            WorkPhone = @4,
            JobTitle = @5
        WHERE ContactInfoID = @6
        `,
        [
          finalFirstName,
          finalLastName,
          finalEmail,
          finalCellPhone,
          finalWorkPhone,
          finalJobTitle,
          contact.contactInfoId,
        ],
      );
    } else {
      await manager.query(
        `
        UPDATE dbo.ContactInfo
        SET FirstName = @0,
            LastName = @1,
            Email = @2,
            CellPhone = @3,
            WorkPhone = @4
        WHERE ContactInfoID = @5
        `,
        [
          finalFirstName,
          finalLastName,
          finalEmail,
          finalCellPhone,
          finalWorkPhone,
          contact.contactInfoId,
        ],
      );
    }

    const shouldUpdateDepartment = !selectedFields || selectedFields.has('department');
    if (shouldUpdateDepartment) {
      const departmentNames = parseEntraDepartments(user.department);
      if (departmentNames.length > 0) {
        const departmentIds: number[] = [];
        for (const name of departmentNames) {
          departmentIds.push(await this.findOrCreateDepartment(manager, name));
        }
        const roleId = await this.findOrCreateRole(manager, DEFAULT_INTERNAL_ROLE_NAME);
        await this.syncContactAssignments(manager, contact.contactId, companyId, roleId, departmentIds);
      }
    }

    return {
      skippedJobTitleWrites: (!selectedFields || selectedFields.has('jobTitle')) && jobTitle && !jobTitleColumnAvailable ? 1 : 0,
    };
  }

  private async syncContactAssignments(
    manager: EntityManager,
    contactId: number,
    companyId: number,
    roleId: number,
    departmentIds: number[]
  ): Promise<void> {
    const existing = await manager.query(
      `SELECT ContactAssignmentID AS id, DepartmentID AS departmentId, RoleID as roleId
       FROM dbo.ContactAssignment
       WHERE ContactID = @0 AND CompanyID = @1
       ORDER BY ContactAssignmentID`,
      [contactId, companyId]
    );

    const existingIds = existing
      .map((e: Record<string, unknown>) => readNumber(e, 'id', 'ContactAssignmentID'))
      .filter((id: number | null): id is number => id !== null);
    
    for (let i = 0; i < Math.max(departmentIds.length, existingIds.length); i++) {
      if (i < departmentIds.length && i < existingIds.length) {
        const existingRoleId = readNumber(existing[i], 'roleId', 'RoleID') || roleId;
        await manager.query(
          `UPDATE dbo.ContactAssignment SET DepartmentID = @0, RoleID = @1, modified_by = @2, modified_at = SYSUTCDATETIME() WHERE ContactAssignmentID = @3`,
          [departmentIds[i], existingRoleId, SYNC_AUDIT_USER, existingIds[i]]
        );
      } else if (i < departmentIds.length) {
        await manager.query(
          `INSERT INTO dbo.ContactAssignment (ContactID, CompanyID, RoleID, DepartmentID, created_by, created_at) VALUES (@0, @1, @2, @3, @4, SYSUTCDATETIME())`,
          [contactId, companyId, roleId, departmentIds[i], SYNC_AUDIT_USER]
        );
      } else {
        const obsoleteId = existingIds[i];
        await manager.query(`DELETE FROM dbo.EmployeeComputer WHERE ContactAssignmentID = @0`, [obsoleteId]);
        await manager.query(`DELETE FROM dbo.EmployeeWorkLocation WHERE ContactAssignmentID = @0`, [obsoleteId]);
        await manager.query(`DELETE FROM dbo.EmployeePhoneExtension WHERE ContactAssignmentID = @0`, [obsoleteId]);
        await manager.query(`DELETE FROM dbo.ContactAssignment WHERE ContactAssignmentID = @0`, [obsoleteId]);
      }
    }
  }

  private async removeInternalCompanyAssignments(
    manager: EntityManager,
    companyId: number,
    contactId: number,
  ): Promise<void> {
    const assignmentRows = await manager.query(
      `
      SELECT ContactAssignmentID AS contactAssignmentId
      FROM dbo.ContactAssignment
      WHERE ContactID = @0
      `,
      [contactId],
    );
    const assignmentIds = assignmentRows
      .map((row: Record<string, unknown>) =>
        readNumber(row, 'contactAssignmentId', 'ContactAssignmentID'),
      )
      .filter((id: number | null): id is number => id != null);

    if (assignmentIds.length > 0) {
      await manager.query(
        `
        DELETE FROM dbo.EmployeeComputer
        WHERE ContactAssignmentID IN (${assignmentIds.map((_, index) => `@${index}`).join(',')})
        `,
        assignmentIds,
      );
      await manager.query(
        `
        DELETE FROM dbo.EmployeeWorkLocation
        WHERE ContactAssignmentID IN (${assignmentIds.map((_, index) => `@${index}`).join(',')})
        `,
        assignmentIds,
      );
      await manager.query(
        `
        DELETE FROM dbo.EmployeePhoneExtension
        WHERE ContactAssignmentID IN (${assignmentIds.map((_, index) => `@${index}`).join(',')})
        `,
        assignmentIds,
      );
    }

    await manager.query(
      `
      DELETE FROM dbo.ContactAssignment
      WHERE ContactID = @0
      `,
      [contactId],
    );

    const contactRow = await manager.query(
      `SELECT ContactInfoID AS contactInfoId FROM dbo.Contact WHERE ContactID = @0`,
      [contactId],
    );
    const contactInfoId = contactRow[0] ? readNumber(contactRow[0], 'contactInfoId', 'ContactInfoID') : null;

    await manager.query(
      `
      DELETE FROM dbo.Contact
      WHERE ContactID = @0
      `,
      [contactId],
    );

    if (contactInfoId) {
      await manager.query(
        `
        DELETE FROM dbo.ContactInfo
        WHERE ContactInfoID = @0
        `,
        [contactInfoId],
      );
    }
  }

  private async createEntraUserFromEmsContact(
    graphAccessToken: string,
    contact: InternalContactSnapshot,
    jobTitleColumnAvailable: boolean,
  ): Promise<{
    displayName: string;
    userPrincipalName: string;
    temporaryPassword: string;
  }> {
    const temporaryPassword = this.generateTemporaryPassword();
    const payload = this.buildEntraUserPayloadFromEmsContact(
      contact,
      jobTitleColumnAvailable,
      true,
      temporaryPassword,
    );
    await this.graphRequest(graphAccessToken, 'POST', `${GRAPH_BASE_URL}/users`, payload);
    return {
      displayName: formatContactName(contact),
      userPrincipalName: trimToMax(contact.email, 254),
      temporaryPassword,
    };
  }

  private async updateEntraUserFromEmsContact(
    graphAccessToken: string,
    entraUserId: string,
    contact: InternalContactSnapshot,
    jobTitleColumnAvailable: boolean,
    includeEmailFields: boolean,
    selectedFieldsArray?: string[],
  ): Promise<void> {
    const payload = this.buildEntraUserPayloadFromEmsContact(
      contact,
      jobTitleColumnAvailable,
      false,
      null,
      includeEmailFields,
      selectedFieldsArray,
    );
    await this.graphRequest(
      graphAccessToken,
      'PATCH',
      `${GRAPH_BASE_URL}/users/${encodeURIComponent(entraUserId)}`,
      payload,
    );
    await this.verifyEntraUserPayload(graphAccessToken, entraUserId, payload);
  }

  private async disableEntraUser(
    graphAccessToken: string,
    entraUserId: string,
  ): Promise<void> {
    await this.graphRequest(
      graphAccessToken,
      'PATCH',
      `${GRAPH_BASE_URL}/users/${encodeURIComponent(entraUserId)}`,
      { accountEnabled: false },
    );
  }

  private buildEntraUserPayloadFromEmsContact(
    contact: InternalContactSnapshot,
    jobTitleColumnAvailable: boolean,
    forCreate: boolean,
    temporaryPassword: string | null,
    includeEmailFields = true,
    selectedFieldsArray?: string[],
  ): Record<string, unknown> {
    const selectedFields = selectedFieldsArray ? new Set(selectedFieldsArray) : null;
    const displayName = formatContactName(contact);
    const email = trimToMax(contact.email, 254);
    const payload: Record<string, unknown> = {};

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
      payload.mobilePhone = nullableText(trimToMax(contact.cellPhone, 30));
    }
    if (!selectedFields || selectedFields.has('workPhone')) {
      payload.businessPhones = contact.workPhone ? [trimToMax(contact.workPhone, 30)] : [];
    }
    if (!selectedFields || selectedFields.has('department')) {
      payload.department = nullableText(primaryDepartmentName(contact));
    }

    if (includeEmailFields && (!selectedFields || selectedFields.has('email'))) {
      payload.userPrincipalName = email;
      payload.mailNickname = makeMailNickname(email, displayName);
    }

    if (jobTitleColumnAvailable && (!selectedFields || selectedFields.has('jobTitle'))) {
      payload.jobTitle = nullableText(trimToMax(contact.jobTitle, 128));
    }

    if (forCreate) {
      payload.accountEnabled = true;
      payload.companyName = IAE_ENTRA_COMPANY_NAME;
      payload.passwordProfile = {
        forceChangePasswordNextSignIn: true,
        password: temporaryPassword,
      };
    }

    return removeUndefinedValues(payload);
  }

  private async getGraphWriteAccessToken(
    delegatedGraphAccessToken?: string,
  ): Promise<string> {
    const appToken = await this.tryGetApplicationGraphAccessToken();
    if (appToken) return appToken;

    const delegatedToken = cleanText(delegatedGraphAccessToken);
    if (delegatedToken) return delegatedToken;

    throw new ServiceUnavailableException(
      'Microsoft Graph write access requires either a delegated Graph token or backend application credentials.',
    );
  }

  private async tryGetApplicationGraphAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.appGraphTokenCache && this.appGraphTokenCache.expiresAt > now + 60_000) {
      return this.appGraphTokenCache.accessToken;
    }

    const tenantId = this.getConfigValue('ENTRA_TENANT_ID');
    const clientId = this.getConfigValue('ENTRA_CLIENT_ID');
    const clientSecret = this.getConfigValue('ENTRA_CLIENT_SECRET');
    if (!tenantId || !clientId || !clientSecret) return null;

    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(
        tenantId,
      )}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
          scope: 'https://graph.microsoft.com/.default',
        }),
      },
    );
    if (!response.ok) {
      throw new BadGatewayException(
        `Could not acquire Microsoft Graph application token. Status ${response.status}.`,
      );
    }
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const accessToken = cleanText(payload.access_token);
    if (!accessToken) {
      throw new BadGatewayException(
        'Microsoft Graph application token response did not contain an access token.',
      );
    }
    this.appGraphTokenCache = {
      accessToken,
      expiresAt: now + Number(payload.expires_in ?? 3600) * 1000,
    };
    return accessToken;
  }

  private async graphRequest(
    graphAccessToken: string,
    method: 'POST' | 'PATCH',
    url: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${graphAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (response.ok) return;
    const detail = await readResponseText(response);
    throw new BadGatewayException({
      message:
        response.status === 403
          ? 'Microsoft Entra rejected this update. Assign the EMSEntra Enterprise Application service principal the User Administrator role, and make sure User-Phone.ReadWrite.All application permission is admin-consented for phone updates.'
          : `Microsoft Entra write request failed with status ${response.status}.`,
      detail: `Microsoft Graph write request failed with status ${response.status}: ${detail}`,
    });
  }

  private async graphGetJson<T>(
    graphAccessToken: string,
    url: string,
  ): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${graphAccessToken}`,
      },
    });
    if (!response.ok) {
      const detail = await readResponseText(response);
      throw new BadGatewayException({
        message: `Microsoft Entra read-back request failed with status ${response.status}.`,
        detail: `Microsoft Graph read-back request failed with status ${response.status}: ${detail}`,
      });
    }
    return (await response.json()) as T;
  }

  private async verifyEntraUserPayload(
    graphAccessToken: string,
    userIdentifier: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (Object.keys(payload).length === 0) return;
    const selected =
      'id,displayName,userPrincipalName,mail,givenName,surname,department,jobTitle,mobilePhone,businessPhones,accountEnabled';
    let mismatches: string[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const user = await this.graphGetJson<Record<string, unknown>>(
        graphAccessToken,
        `${GRAPH_BASE_URL}/users/${encodeURIComponent(userIdentifier)}?$select=${selected}`,
      );
      mismatches = findGraphPayloadMismatches(payload, user);
      if (mismatches.length === 0) return;
      await sleep(350);
    }
    throw new BadGatewayException({
      message: `Microsoft Entra did not persist ${mismatches.map(graphFieldLabel).join(', ')} for this user.`,
      detail: `Graph read-back mismatch after PATCH. Fields: ${mismatches.join(', ')}`,
    });
  }

  private generateTemporaryPassword(): string {
    const configuredPassword = cleanText(
      this.getConfigValue('ENTRA_SYNC_TEMP_PASSWORD'),
    );
    if (configuredPassword) return configuredPassword;
    return `Ems-${randomBytes(18).toString('base64url')}aA1!`;
  }

  private getConfigValue(...keys: string[]): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key)?.trim();
      if (value) return value;
    }
    return '';
  }

  private async findOrCreateDepartment(
    executor: SqlExecutor,
    name: string,
  ): Promise<number> {
    const departmentName = normalizeLookupName(name) || DEFAULT_DEPARTMENT_NAME;
    const allDepartments = await executor.query(
      `SELECT DepartmentID AS departmentId, DepartmentName AS departmentName FROM dbo.Department`
    );

    const target = departmentName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatchId: number | null = null;
    let exactMatchId: number | null = null;

    for (const row of allDepartments) {
      const existingName = readString(row, 'departmentName', 'DepartmentName');
      const id = readNumber(row, 'departmentId', 'DepartmentID');
      if (!existingName || !id) continue;
      
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

    if (exactMatchId) return exactMatchId;
    if (bestMatchId) return bestMatchId;

    const rows = await executor.query(
      `
      DECLARE @OutputDept TABLE (DepartmentID int);
      INSERT INTO dbo.Department (DepartmentName)
      OUTPUT INSERTED.DepartmentID INTO @OutputDept
      VALUES (@0);
      SELECT DepartmentID AS departmentId FROM @OutputDept;
      `,
      [trimToMax(departmentName, 100)],
    );
    const departmentId = readNumber(rows[0], 'departmentId', 'DepartmentID');
    if (!departmentId) {
      throw new BadRequestException('Unable to create EMS department.');
    }
    return departmentId;
  }

  private async findOrCreateRole(
    executor: SqlExecutor,
    name: string,
  ): Promise<number> {
    const roleName = normalizeLookupName(name) || DEFAULT_INTERNAL_ROLE_NAME;
    const existingRows = await executor.query(
      `
      SELECT TOP 1 RoleID AS roleId
      FROM dbo.Role
      WHERE LOWER(LTRIM(RTRIM(RoleName))) = LOWER(@0)
      `,
      [roleName],
    );
    const existingId = readNumber(existingRows[0], 'roleId', 'RoleID');
    if (existingId) return existingId;

    const rows = await executor.query(
      `
      DECLARE @OutputRole TABLE (RoleID int);
      INSERT INTO dbo.Role (RoleName)
      OUTPUT INSERTED.RoleID INTO @OutputRole
      VALUES (@0);
      SELECT RoleID AS roleId FROM @OutputRole;
      `,
      [trimToMax(roleName, 100)],
    );
    const roleId = readNumber(rows[0], 'roleId', 'RoleID');
    if (!roleId) {
      throw new BadRequestException('Unable to create EMS role.');
    }
    return roleId;
  }
}

function createEmptyCounts(): Record<SyncActionType, number> {
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

function sortRows(left: InternalContactSyncRow, right: InternalContactSyncRow): number {
  const order: Record<SyncActionType, number> = {
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
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return (left.entraName ?? left.emsName ?? '').localeCompare(
    right.entraName ?? right.emsName ?? '',
  );
}

function change(
  field: string,
  label: string,
  from: string | null,
  to: string | null,
  options?: { skipped?: boolean; reason?: string },
): InternalContactSyncFieldChange {
  return {
    field,
    label,
    from: nullableText(from),
    to: nullableText(to),
    ...(options?.skipped ? { skipped: true } : {}),
    ...(options?.reason ? { reason: options.reason } : {}),
  };
}

function addOptionalChange(
  changes: InternalContactSyncFieldChange[],
  field: string,
  label: string,
  from: string | null,
  to: string | null,
): void {
  if (!nullableText(to)) return;
  changes.push(change(field, label, from, to));
}

function addComparableChange(
  changes: InternalContactSyncFieldChange[],
  field: string,
  label: string,
  from: string | null,
  to: string | null,
  options?: { compareAsEmail?: boolean; compareAsPhone?: boolean },
): void {
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

  if (currentComparable === nextComparable) return;
  changes.push(change(field, label, current, next));
}

function getEntraNames(user: AdminDirectorySyncUser): {
  firstName: string;
  lastName: string;
} {
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

function fallbackFirstName(user: AdminDirectorySyncUser): string {
  const emailLocalPart = cleanText(user.email).split('@')[0];
  return emailLocalPart || 'Entra user';
}

function firstBusinessPhone(user: AdminDirectorySyncUser): string {
  return Array.isArray(user.businessPhones)
    ? cleanText(user.businessPhones.find((phone) => cleanText(phone)) ?? '')
    : '';
}

function normalizePersonNameFromUser(user: AdminDirectorySyncUser): string {
  const names = getEntraNames(user);
  return normalizePersonName(names.firstName, names.lastName, user.displayName);
}

function normalizePersonName(
  firstName: string,
  lastName: string,
  fallback: string,
): string {
  return cleanText(`${firstName} ${lastName}`.trim() || fallback).toLowerCase();
}

function formatContactName(contact: InternalContactSnapshot): string {
  return (
    `${contact.firstName} ${contact.lastName}`.trim() ||
    contact.email ||
    `Contact ${contact.contactId}`
  );
}

function primaryDepartmentName(contact: InternalContactSnapshot): string {
  return uniqueClean(
    contact.assignments.map((assignment) => assignment.departmentName),
  ).join(' & ');
}

function makeMailNickname(email: string, displayName: string): string {
  const localPart = cleanText(email).split('@')[0];
  const source = localPart || displayName || 'ems-user';
  const nickname = source
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
  return trimToMax(nickname || 'ems-user', 64);
}

function removeUndefinedValues(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

async function readResponseText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 1000);
  } catch {
    return '';
  }
}

function findGraphPayloadMismatches(
  payload: Record<string, unknown>,
  user: Record<string, unknown>,
): string[] {
  const mismatches: string[] = [];
  for (const [field, expected] of Object.entries(payload)) {
    if (field === 'passwordProfile') continue;
    const actual = user[field];
    if (field === 'businessPhones') {
      const expectedPhone = Array.isArray(expected)
        ? normalizePhone(String(expected[0] ?? ''))
        : '';
      const actualPhones = Array.isArray(actual) ? actual : [];
      const actualPhone = normalizePhone(String(actualPhones[0] ?? ''));
      if (expectedPhone !== actualPhone) mismatches.push('businessPhones');
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
      if (Boolean(expected) !== Boolean(actual)) mismatches.push('accountEnabled');
      continue;
    }
    if (cleanText(String(expected ?? '')) !== cleanText(String(actual ?? ''))) {
      mismatches.push(field);
    }
  }
  return mismatches;
}

function graphFieldLabel(field: string): string {
  const labels: Record<string, string> = {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGraphAuthorizationDenied(error: unknown): boolean {
  const parts: string[] = [];
  if (error instanceof Error) parts.push(error.message);
  const response =
    typeof error === 'object' && error !== null && 'getResponse' in error
      ? (error as { getResponse?: () => unknown }).getResponse?.()
      : undefined;
  if (typeof response === 'string') parts.push(response);
  if (response && typeof response === 'object') {
    const value = (response as { message?: unknown }).message;
    if (typeof value === 'string') parts.push(value);
  }
  const text = parts.join('\n');
  return /status 403|Authorization_RequestDenied|Insufficient privileges/i.test(text);
}

function formatSyncError(prefix: string, error: unknown): string {
  if (error instanceof Error && error.message) {
    return `${prefix}: ${error.message}`;
  }
  return prefix;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function normalizeEmail(value: string | null | undefined): string {
  return cleanText(value).toLowerCase();
}

function normalizePhone(value: string | null | undefined): string {
  const cleaned = cleanText(value);
  if (!cleaned) return '';
  let digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  return digits;
}

function normalizeLookupName(value: string | null | undefined): string {
  return trimToMax(cleanText(value), 100);
}

function uniqueClean(values: string[]): string[] {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function nullableText(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned ? cleaned : null;
}

function parseEntraDepartments(departmentStr: string | null | undefined): string[] {
  const cleaned = cleanText(departmentStr);
  if (!cleaned) return [];
  return cleaned.split('&').map(d => trimToMax(cleanText(d), 100)).filter(Boolean);
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
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
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function trimToMax(value: string | null | undefined, maxLength: number): string {
  return cleanText(value).slice(0, maxLength);
}

function readString(row: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return cleanText(String(value));
  }
  return '';
}

function readNumber(row: Record<string, unknown> | undefined, ...keys: string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return null;
}
