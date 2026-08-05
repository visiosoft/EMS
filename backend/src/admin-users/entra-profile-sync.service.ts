import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Synchronizes Employee Profile fields FROM Entra (Microsoft Graph) INTO the EMS
 * database. Reads both native user properties and Custom Security Attributes
 * (attribute set "EMSInformation") for each internal employee.
 *
 * This is a one-way Entra → EMS sync focused on all profile fields that are
 * maintained in Entra as the source of truth.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Native Graph user properties relevant to the employee profile. */
type EntraUserProfile = {
  id: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  userPrincipalName: string;
  mobilePhone: string;
  businessPhones: string[];
  department: string;
  jobTitle: string;
  officeLocation: string;
  companyName: string;
  accountEnabled: boolean;
  employeeHireDate: string | null;
};

/** Custom Security Attributes from the "EMSInformation" attribute set in Entra. */
type EMSCustomAttributes = {
  MiddleName?: string | null;
  PersonalEmail?: string | null;
  Birthday?: string | null;
  SocialSecurityNumber?: string | null;
  EmergencyContactFirstName?: string | null;
  EmergencyContactLastName?: string | null;
  EmergencyContactCell?: string | null;
  EmergencyContactEmail?: string | null;
  WorkAuthorization?: string | null;
  Workstation?: string | null;
  PTOAccrual?: string | null;
  EmploymentAgreement?: string | boolean | null;
  RampAccount?: string | boolean | null;
  RampCard?: string | null;
  DeskPhoneMAC?: string | null;
  PCServiceTag?: string | null;
  EMSAccessLevel?: string | null;
  Supervisor?: string | null;
  DepartmentRank?: number | string | null;
};

/** Combined Entra profile data ready for sync into EMS. */
type EntraFullProfile = {
  user: EntraUserProfile;
  manager: { displayName: string; email: string } | null;
  emsAttributes: EMSCustomAttributes;
};

export type EntraProfileSyncFieldChange = {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
};

export type EntraProfileSyncRow = {
  contactId: number;
  email: string;
  name: string;
  status: 'updated' | 'upToDate' | 'created' | 'error';
  changes: EntraProfileSyncFieldChange[];
  error?: string;
};

export type EntraProfileSyncResult = {
  syncedAt: string;
  totalProcessed: number;
  updated: number;
  upToDate: number;
  created: number;
  errors: number;
  rows: EntraProfileSyncRow[];
};

export type EntraProfileSyncPreviewRow = {
  contactId: number;
  email: string;
  name: string;
  status: 'willUpdate' | 'upToDate';
  changes: EntraProfileSyncFieldChange[];
};

export type EntraProfileSyncPreview = {
  generatedAt: string;
  totalUsers: number;
  willUpdate: number;
  upToDate: number;
  rows: EntraProfileSyncPreviewRow[];
};

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const EMS_ATTRIBUTE_SET = 'EMSInformation';

@Injectable()
export class EntraProfileSyncService {
  private appGraphTokenCache: { accessToken: string; expiresAt: number } | null =
    null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /** Temporary debug: fetch Entra profile for any email and return raw CSA data */
  async debugFetchEntraProfile(email: string) {
    const token = await this.getGraphToken();
    const profile = await this.fetchEntraFullProfile(token, email);
    return profile ?? { error: 'User not found in Entra' };
  }

  /**
   * Preview what would change if a full Entra → EMS profile sync were applied.
   */
  async previewProfileSync(
    graphAccessToken?: string,
  ): Promise<EntraProfileSyncPreview> {
    const token = await this.getGraphToken(graphAccessToken);
    const internalContacts = await this.loadInternalContacts();
    const rows: EntraProfileSyncPreviewRow[] = [];

    for (const contact of internalContacts) {
      const entraProfile = await this.fetchEntraFullProfile(token, contact.email);
      if (!entraProfile) continue;

      const currentProfile = await this.loadCurrentProfileData(contact.contactId, contact.contactAssignmentId);
      const changes = this.computeChanges(entraProfile, currentProfile, contact);

      rows.push({
        contactId: contact.contactId,
        email: contact.email,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        status: changes.length > 0 ? 'willUpdate' : 'upToDate',
        changes,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      totalUsers: rows.length,
      willUpdate: rows.filter((r) => r.status === 'willUpdate').length,
      upToDate: rows.filter((r) => r.status === 'upToDate').length,
      rows,
    };
  }

  /**
   * Apply Entra → EMS profile sync for all internal employees (or a specific one).
   */
  async applyProfileSync(
    graphAccessToken?: string,
    targetEmail?: string,
  ): Promise<EntraProfileSyncResult> {
    const token = await this.getGraphToken(graphAccessToken);
    let internalContacts = await this.loadInternalContacts();

    if (targetEmail) {
      const normalized = targetEmail.trim().toLowerCase();
      internalContacts = internalContacts.filter(
        (c) => c.email.toLowerCase() === normalized,
      );
      if (internalContacts.length === 0) {
        throw new BadRequestException(
          `No internal employee found with email ${targetEmail}.`,
        );
      }
    }

    const rows: EntraProfileSyncRow[] = [];
    let updated = 0;
    let upToDate = 0;
    let errors = 0;

    for (const contact of internalContacts) {
      try {
        const entraProfile = await this.fetchEntraFullProfile(token, contact.email);
        if (!entraProfile) {
          rows.push({
            contactId: contact.contactId,
            email: contact.email,
            name: `${contact.firstName} ${contact.lastName}`.trim(),
            status: 'error',
            changes: [],
            error: 'Could not fetch Entra profile for this user.',
          });
          errors++;
          continue;
        }

        const currentProfile = await this.loadCurrentProfileData(contact.contactId, contact.contactAssignmentId);
        const changes = this.computeChanges(entraProfile, currentProfile, contact);

        if (changes.length === 0) {
          rows.push({
            contactId: contact.contactId,
            email: contact.email,
            name: `${contact.firstName} ${contact.lastName}`.trim(),
            status: 'upToDate',
            changes: [],
          });
          upToDate++;
          continue;
        }

        await this.applyChanges(contact, entraProfile, currentProfile);

        rows.push({
          contactId: contact.contactId,
          email: contact.email,
          name: `${contact.firstName} ${contact.lastName}`.trim(),
          status: 'updated',
          changes,
        });
        updated++;
      } catch (error) {
        rows.push({
          contactId: contact.contactId,
          email: contact.email,
          name: `${contact.firstName} ${contact.lastName}`.trim(),
          status: 'error',
          changes: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errors++;
      }
    }

    return {
      syncedAt: new Date().toISOString(),
      totalProcessed: rows.length,
      updated,
      upToDate,
      created: 0,
      errors,
      rows,
    };
  }

  // ─── Graph API ──────────────────────────────────────────────────────────────

  private async fetchEntraFullProfile(
    accessToken: string,
    email: string,
  ): Promise<EntraFullProfile | null> {
    const encodedEmail = encodeURIComponent(email);

    // Always use the application token for CSA reads — delegated tokens don't have CustomSecAttributeAssignment permission
    const appToken = await this.tryGetApplicationToken();
    const csaToken = appToken || accessToken;

    // 1. Fetch native user properties + custom security attributes
    // Try direct lookup first, then fall back to $filter by mail for guest accounts
    const selectFields = 'id,displayName,givenName,surname,mail,userPrincipalName,mobilePhone,businessPhones,department,jobTitle,officeLocation,companyName,accountEnabled,employeeHireDate,customSecurityAttributes';
    let userData = await this.graphGet<Record<string, unknown>>(
      csaToken,
      `https://graph.microsoft.com/beta/users/${encodedEmail}?$select=${selectFields}`,
    );
    if (!userData) {
      // Guest users may not be findable by email directly — search by mail property
      const filterResult = await this.graphGet<{ value?: Record<string, unknown>[] }>(
        csaToken,
        `https://graph.microsoft.com/beta/users?$filter=mail eq '${email.replace(/'/g, "''")}'&$select=${selectFields}`,
      );
      userData = filterResult?.value?.[0] ?? null;
    }
    if (!userData) return null;

    const user: EntraUserProfile = {
      id: str(userData.id),
      displayName: str(userData.displayName),
      givenName: str(userData.givenName),
      surname: str(userData.surname),
      mail: str(userData.mail),
      userPrincipalName: str(userData.userPrincipalName),
      mobilePhone: str(userData.mobilePhone),
      businessPhones: Array.isArray(userData.businessPhones)
        ? (userData.businessPhones as string[]).filter(Boolean)
        : [],
      department: str(userData.department),
      jobTitle: str(userData.jobTitle),
      officeLocation: str(userData.officeLocation),
      companyName: str(userData.companyName),
      accountEnabled: userData.accountEnabled !== false,
      employeeHireDate: str(userData.employeeHireDate) || null,
    };

    // 2. Extract Custom Security Attributes from the "EMSInformation" set
    const customAttrs = (userData.customSecurityAttributes as Record<string, unknown>) ?? {};
    const emsAttrs = (customAttrs[EMS_ATTRIBUTE_SET] as Record<string, unknown>) ?? {};

    // Debug: log raw CSA data to diagnose empty attributes
    console.log(`[EntraSync] User ${email} - customSecurityAttributes keys: [${Object.keys(customAttrs).join(', ')}]`);
    console.log(`[EntraSync] User ${email} - ${EMS_ATTRIBUTE_SET} keys: [${Object.keys(emsAttrs).join(', ')}]`);
    if (Object.keys(emsAttrs).length > 0) {
      console.log(`[EntraSync] User ${email} - CSA values:`, JSON.stringify(emsAttrs, null, 2));
    }

    const emsAttributes: EMSCustomAttributes = {
      MiddleName: optStr(emsAttrs.MiddleName),
      PersonalEmail: optStr(emsAttrs.PersonalEmail),
      Birthday: optStr(emsAttrs.Birthday),
      SocialSecurityNumber: optStr(emsAttrs.SocialSecurityNumber),
      EmergencyContactFirstName: optStr(emsAttrs.EmergencyContactFirstName),
      EmergencyContactLastName: optStr(emsAttrs.EmergencyContactLastName),
      EmergencyContactCell: optStr(emsAttrs.EmergencyContactCell),
      EmergencyContactEmail: optStr(emsAttrs.EmergencyContactEmail),
      WorkAuthorization: optStr(emsAttrs.WorkAuthorization),
      Workstation: optStr(emsAttrs.Workstation),
      PTOAccrual: optStr(emsAttrs.PTOAccrual),
      EmploymentAgreement: typeof emsAttrs.EmploymentAgreement === 'boolean' ? emsAttrs.EmploymentAgreement : null,
      RampAccount: typeof emsAttrs.RampAccount === 'boolean' ? emsAttrs.RampAccount : null,
      RampCard: optStr(emsAttrs.RampCard),
      DeskPhoneMAC: optStr(emsAttrs.DeskPhoneMAC),
      PCServiceTag: optStr(emsAttrs.PCServiceTag),
      EMSAccessLevel: optStr(emsAttrs.EMSAccessLevel),
      Supervisor: optStr(emsAttrs.Supervisor),
      DepartmentRank: emsAttrs.DepartmentRank != null ? emsAttrs.DepartmentRank as number : null,
    };

    // 3. Fetch manager (supervisor) — use Entra user id for reliable lookup (works for guests too)
    const entraUserId = str(userData.id) || encodedEmail;
    let manager: EntraFullProfile['manager'] = null;
    try {
      const managerData = await this.graphGet<Record<string, unknown>>(
        accessToken,
        `${GRAPH_BASE_URL}/users/${entraUserId}/manager?$select=displayName,mail,userPrincipalName`,
      );
      if (managerData) {
        manager = {
          displayName: str(managerData.displayName),
          email: str(managerData.mail) || str(managerData.userPrincipalName),
        };
      }
    } catch {
      // Manager not set — leave as null
    }

    return { user, manager, emsAttributes };
  }

  private async graphGet<T>(
    accessToken: string,
    url: string,
  ): Promise<T | null> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ConsistencyLevel: 'eventual',
      },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new BadGatewayException(
        `Microsoft Graph request failed (${response.status}): ${text.slice(0, 200)}`,
      );
    }
    return (await response.json()) as T;
  }

  // ─── Internal Contact Loading ───────────────────────────────────────────────

  private async loadInternalContacts(): Promise<InternalContact[]> {
    const rows = await this.dataSource.query(`
      SELECT
        c.ContactID AS contactId,
        ci.ContactInfoID AS contactInfoId,
        ca.ContactAssignmentID AS contactAssignmentId,
        ci.FirstName AS firstName,
        ci.LastName AS lastName,
        ci.Email AS email,
        COALESCE(ci.CellPhone, '') AS cellPhone,
        COALESCE(ci.WorkPhone, '') AS workPhone
      FROM dbo.ContactAssignment ca
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      WHERE ci.Email IS NOT NULL AND ci.Email <> ''
      ORDER BY ci.FirstName, ci.LastName
    `);

    const seen = new Set<number>();
    const contacts: InternalContact[] = [];
    for (const row of rows) {
      const contactId = readNumber(row, 'contactId', 'ContactID');
      if (!contactId || seen.has(contactId)) continue;
      seen.add(contactId);
      contacts.push({
        contactId,
        contactInfoId: readNumber(row, 'contactInfoId', 'ContactInfoID') ?? 0,
        contactAssignmentId: readNumber(row, 'contactAssignmentId', 'ContactAssignmentID') ?? 0,
        firstName: readString(row, 'firstName', 'FirstName'),
        lastName: readString(row, 'lastName', 'LastName'),
        email: readString(row, 'email', 'Email'),
        cellPhone: readString(row, 'cellPhone', 'CellPhone'),
        workPhone: readString(row, 'workPhone', 'WorkPhone'),
      });
    }
    return contacts;
  }

  private async loadCurrentProfileData(
    contactId: number,
    contactAssignmentId: number,
  ): Promise<CurrentProfileData> {
    const hasEpTable = await this.tableExists('EmployeeProfile');
    const hasEcTable = await this.tableExists('EmergencyContact');

    let profileRow: Record<string, unknown> | undefined;
    let homeAddress: Record<string, unknown> | undefined;
    let emergencyContact: Record<string, unknown> | undefined;

    if (hasEpTable) {
      const epRows = await this.dataSource.query(
        `SELECT TOP 1 * FROM dbo.EmployeeProfile WHERE ContactID = @0`,
        [contactId],
      );
      profileRow = epRows[0] as Record<string, unknown> | undefined;

      if (profileRow) {
        const homeAddressId = readNumber(profileRow, 'HomeAddressID');
        if (homeAddressId) {
          const addrRows = await this.dataSource.query(
            `SELECT TOP 1 * FROM dbo.Address WHERE AddressID = @0`,
            [homeAddressId],
          );
          homeAddress = addrRows[0] as Record<string, unknown> | undefined;
        }
      }
    }

    if (hasEcTable) {
      const ecRows = await this.dataSource.query(
        `SELECT TOP 1 * FROM dbo.EmergencyContact WHERE ContactID = @0 ORDER BY IsPrimary DESC, EmergencyContactID`,
        [contactId],
      );
      emergencyContact = ecRows[0] as Record<string, unknown> | undefined;
    }

    // Load equipment
    const equipment = await this.loadEquipment(contactAssignmentId);

    return {
      hasEpTable,
      hasEcTable,
      profileRow,
      homeAddress,
      emergencyContact,
      equipment,
    };
  }

  private async loadEquipment(contactAssignmentId: number): Promise<EquipmentData> {
    const empty: EquipmentData = {
      deskPhoneMac: '',
      deskPhoneBrand: '',
      deskPhoneModel: '',
      pcBrand: '',
      pcModel: '',
      pcServiceTag: '',
      bluetoothStatus: '',
      pcWindowsName: '',
    };
    if (!contactAssignmentId) return empty;

    const needed = ['EmployeePhoneExtension', 'PhoneExtension', 'PhoneExtensionDevice', 'EquipmentPhone', 'EmployeeComputer', 'EquipmentComputer'];
    for (const table of needed) {
      if (!(await this.tableExists(table))) return empty;
    }

    const rows = await this.dataSource.query(
      `
      SELECT TOP 1
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
      `,
      [contactAssignmentId],
    );
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return empty;
    return {
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

  // ─── Change Computation ─────────────────────────────────────────────────────

  private computeChanges(
    entra: EntraFullProfile,
    current: CurrentProfileData,
    contact: InternalContact,
  ): EntraProfileSyncFieldChange[] {
    const changes: EntraProfileSyncFieldChange[] = [];

    // Name
    addChange(changes, 'firstName', 'First Name', contact.firstName, entra.user.givenName);
    addChange(changes, 'lastName', 'Last Name', contact.lastName, entra.user.surname);
    // Email
    addChange(changes, 'email', 'Email', contact.email, entra.user.mail || entra.user.userPrincipalName, true);
    // Phones
    addChange(changes, 'cellPhone', 'Cell Phone', contact.cellPhone, entra.user.mobilePhone);
    addChange(changes, 'workPhone', 'Work Phone', contact.workPhone, firstBusinessPhone(entra.user.businessPhones));
    // Supervisor (from CSA first, then Manager endpoint as fallback)
    const currentSupervisor = readString(current.profileRow, 'Supervisor');
    const entraSupervisor = entra.emsAttributes.Supervisor ?? entra.manager?.displayName ?? '';
    addChange(changes, 'supervisor', 'Supervisor', currentSupervisor, entraSupervisor);
    // Middle Name (CSA)
    const currentMiddleName = readString(current.profileRow, 'MiddleName');
    addChange(changes, 'middleName', 'Middle Name', currentMiddleName, entra.emsAttributes.MiddleName ?? '');
    // Personal Email
    const currentPersonalEmail = readString(current.profileRow, 'PersonalEmail');
    addChange(changes, 'personalEmail', 'Personal Email', currentPersonalEmail, entra.emsAttributes.PersonalEmail ?? '');
    // Birth Date
    const currentBirthDate = readDateString(current.profileRow, 'DateOfBirth') ?? '';
    addChange(changes, 'birthDate', 'Birth Date', currentBirthDate, normalizeDate(entra.emsAttributes.Birthday));
    // SSN
    const currentSsn = readString(current.profileRow, 'SSNLast4');
    const entraSsn = ssnLast4(entra.emsAttributes.SocialSecurityNumber);
    addChange(changes, 'ssn', 'Social Security Number', currentSsn, entraSsn);
    // Home Address — no longer in CSA; these are maintained via WMS only
    // Emergency Contact — table uses FullName, Entra CSA has separate first/last
    const currentEcFullName = readString(current.emergencyContact, 'FullName');
    const entraEcFullName = [entra.emsAttributes.EmergencyContactFirstName ?? '', entra.emsAttributes.EmergencyContactLastName ?? ''].map(s => s.trim()).filter(Boolean).join(' ');
    const currentEcPhone = readString(current.emergencyContact, 'PhoneNumber');
    const currentEcEmail = readString(current.emergencyContact, 'Email');
    addChange(changes, 'emergencyContactName', 'Emergency Contact Name', currentEcFullName, entraEcFullName);
    addChange(changes, 'emergencyContactPhone', 'Emergency Contact Phone', currentEcPhone, entra.emsAttributes.EmergencyContactCell ?? '');
    addChange(changes, 'emergencyContactEmail', 'Emergency Contact Email', currentEcEmail, entra.emsAttributes.EmergencyContactEmail ?? '');
    // Title (Job Title)
    const currentTitle = readString(current.profileRow, 'JobTitle');
    addChange(changes, 'title', 'Title', currentTitle, entra.user.jobTitle);
    // Office
    const currentOffice = readString(current.profileRow, 'Office');
    addChange(changes, 'office', 'Office', currentOffice, entra.user.officeLocation);
    // Workstation
    const currentWorkstation = readString(current.profileRow, 'Workstation');
    addChange(changes, 'workstation', 'Workstation', currentWorkstation, entra.emsAttributes.Workstation ?? '');
    // Work Authorization
    const currentWorkAuth = readString(current.profileRow, 'WorkAuthorization');
    addChange(changes, 'workAuthorization', 'Work Authorization', currentWorkAuth, entra.emsAttributes.WorkAuthorization ?? '');
    // Access Level (from CSA)
    const currentAccessLevel = readString(current.profileRow, 'AccessLevel');
    addChange(changes, 'accessLevel', 'Access Level', currentAccessLevel, entra.emsAttributes.EMSAccessLevel ?? '');
    // Department — synced via contact sync, but we track it for change visibility
    // Role — managed via contact sync
    // Company — always "iAE"
    // Start Date at IAE
    const currentStartDate = readDateString(current.profileRow, 'StartDate') ?? '';
    const entraStartDate = normalizeDate(entra.user.employeeHireDate);
    addChange(changes, 'startDate', 'Start Date at IAE', currentStartDate, entraStartDate);
    // PTO Accrual Rate
    const currentPto = readString(current.profileRow, 'PTOAccrualRate');
    addChange(changes, 'ptoAccrualRate', 'PTO Accrual Rate', currentPto, entra.emsAttributes.PTOAccrual ?? '');
    // Employment Agreement (Boolean in Entra)
    const currentEmpAgreement = readString(current.profileRow, 'EmploymentAgreement');
    const entraEmpAgreement = boolToYesNo(entra.emsAttributes.EmploymentAgreement);
    addChange(changes, 'employmentAgreement', 'Employment Agreement', currentEmpAgreement, entraEmpAgreement);
    // Ramp Account (Boolean in Entra)
    const currentRampAccount = readString(current.profileRow, 'RampAccount');
    const entraRampAccount = boolToYesNo(entra.emsAttributes.RampAccount);
    addChange(changes, 'rampAccount', 'Ramp Account', currentRampAccount, entraRampAccount);
    // Ramp Credit Card
    const currentRampCard = readString(current.profileRow, 'RampCreditCard');
    addChange(changes, 'rampCreditCard', 'Ramp Credit Card', currentRampCard, entra.emsAttributes.RampCard ?? '');
    // Equipment — Desk Phone (MAC includes brand info: "00:15:65:A8:63:F2 - Yealink")
    addChange(changes, 'deskPhoneMac', 'Desk Phone MAC Address', current.equipment.deskPhoneMac, parseMacAddress(entra.emsAttributes.DeskPhoneMAC));
    addChange(changes, 'deskPhoneBrand', 'Desk Phone Brand', current.equipment.deskPhoneBrand, parseMacBrand(entra.emsAttributes.DeskPhoneMAC));
    // Equipment — PC (ServiceTag includes PC name: "BFKMW54 - Zach-PC")
    addChange(changes, 'pcServiceTag', 'PC Service Tag', current.equipment.pcServiceTag, parseServiceTag(entra.emsAttributes.PCServiceTag));
    addChange(changes, 'pcWindowsName', 'PC Windows Name', current.equipment.pcWindowsName, parseServiceTagName(entra.emsAttributes.PCServiceTag));

    return changes;
  }

  // ─── Apply Changes to Database ──────────────────────────────────────────────

  private async applyChanges(
    contact: InternalContact,
    entra: EntraFullProfile,
    current: CurrentProfileData,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 1. Update ContactInfo (name, email, phones)
      const hasJobTitleColumn = await this.hasColumnInTable(manager, 'ContactInfo', 'JobTitle');
      if (hasJobTitleColumn) {
        await manager.query(
          `UPDATE dbo.ContactInfo SET FirstName = @0, LastName = @1, Email = @2, CellPhone = @3, WorkPhone = @4, JobTitle = @5 WHERE ContactInfoID = @6`,
          [
            trimTo(entra.user.givenName, 100) || contact.firstName,
            trimTo(entra.user.surname, 100) || contact.lastName,
            trimTo(entra.user.mail || entra.user.userPrincipalName, 254) || contact.email,
            nullableText(trimTo(entra.user.mobilePhone, 30)),
            nullableText(trimTo(firstBusinessPhone(entra.user.businessPhones), 30)),
            nullableText(trimTo(entra.user.jobTitle, 150)),
            contact.contactInfoId,
          ],
        );
      } else {
        await manager.query(
          `UPDATE dbo.ContactInfo SET FirstName = @0, LastName = @1, Email = @2, CellPhone = @3, WorkPhone = @4 WHERE ContactInfoID = @5`,
          [
            trimTo(entra.user.givenName, 100) || contact.firstName,
            trimTo(entra.user.surname, 100) || contact.lastName,
            trimTo(entra.user.mail || entra.user.userPrincipalName, 254) || contact.email,
            nullableText(trimTo(entra.user.mobilePhone, 30)),
            nullableText(trimTo(firstBusinessPhone(entra.user.businessPhones), 30)),
            contact.contactInfoId,
          ],
        );
      }

      // 2. Upsert EmployeeProfile
      if (current.hasEpTable) {
        await this.upsertEmployeeProfile(manager, contact.contactId, entra, current);
      }

      // 3. Upsert Home Address
      if (current.hasEpTable) {
        await this.upsertHomeAddress(manager, contact.contactId, entra.emsAttributes, current);
      }

      // 4. Upsert Emergency Contact
      if (current.hasEcTable) {
        await this.upsertEmergencyContact(manager, contact.contactId, entra.emsAttributes, current);
      }

      // 5. Sync Equipment from Entra CSA into EMS equipment tables
      await this.upsertEquipmentFromEntra(manager, contact.contactAssignmentId, entra.emsAttributes, current.equipment);
    });
  }

  private async upsertEmployeeProfile(
    manager: EntityManager,
    contactId: number,
    entra: EntraFullProfile,
    current: CurrentProfileData,
  ): Promise<void> {
    const epExists = (
      await manager.query(
        `SELECT 1 AS found FROM dbo.EmployeeProfile WHERE ContactID = @0`,
        [contactId],
      )
    ).length > 0;

    const supervisor = entra.emsAttributes.Supervisor ?? entra.manager?.displayName ?? null;
    const middleName = entra.emsAttributes.MiddleName ?? null;
    const personalEmail = entra.emsAttributes.PersonalEmail ?? null;
    const birthDate = normalizeDate(entra.emsAttributes.Birthday);
    const ssn = ssnLast4(entra.emsAttributes.SocialSecurityNumber);
    const startDate = normalizeDate(entra.user.employeeHireDate);
    const office = entra.user.officeLocation ?? null;
    const workstation = entra.emsAttributes.Workstation ?? null;
    const workAuth = entra.emsAttributes.WorkAuthorization ?? null;
    const ptoAccrualRate = entra.emsAttributes.PTOAccrual ?? null;
    const employmentAgreement = boolToYesNo(entra.emsAttributes.EmploymentAgreement) || null;
    const rampAccount = boolToYesNo(entra.emsAttributes.RampAccount) || null;
    const rampCreditCard = entra.emsAttributes.RampCard ?? null;
    const accessLevel = entra.emsAttributes.EMSAccessLevel ?? null;
    const hasOfficeCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'Office');
    const hasMiddleNameCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'MiddleName');
    const hasAccessLevelCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'AccessLevel');

    if (epExists) {
      const officeSetClause = hasOfficeCol ? 'Office = @5,' : '';
      const params = [
        nullableText(supervisor),
        nullableText(personalEmail),
        birthDate || null,
        nullableText(ssn),
        startDate || null,
        ...(hasOfficeCol ? [nullableText(office)] : []),
        ...(hasMiddleNameCol ? [nullableText(middleName)] : []),
        ...(hasAccessLevelCol ? [nullableText(accessLevel)] : []),
        nullableText(workstation),
        nullableText(workAuth),
        nullableText(ptoAccrualRate),
        nullableText(employmentAgreement),
        nullableText(rampAccount),
        nullableText(rampCreditCard),
        'Entra profile sync',
        contactId,
      ];
      let idx = 0;
      await manager.query(
        `
        UPDATE dbo.EmployeeProfile
        SET Supervisor = @${idx++},
            PersonalEmail = @${idx++},
            DateOfBirth = @${idx++},
            SSNLast4 = @${idx++},
            StartDate = @${idx++},
            ${hasOfficeCol ? `Office = @${idx++},` : ''}
            ${hasMiddleNameCol ? `MiddleName = @${idx++},` : ''}
            ${hasAccessLevelCol ? `AccessLevel = @${idx++},` : ''}
            Workstation = @${idx++},
            WorkAuthorization = @${idx++},
            PTOAccrualRate = @${idx++},
            EmploymentAgreement = @${idx++},
            RampAccount = @${idx++},
            RampCreditCard = @${idx++},
            modified_by = @${idx++},
            modified_at = SYSUTCDATETIME()
        WHERE ContactID = @${idx}
        `,
        params,
      );
    } else {
      const insertCols = [
        'ContactID', 'Supervisor', 'PersonalEmail', 'DateOfBirth', 'SSNLast4',
        'StartDate', ...(hasOfficeCol ? ['Office'] : []), ...(hasMiddleNameCol ? ['MiddleName'] : []),
        ...(hasAccessLevelCol ? ['AccessLevel'] : []), 'Workstation', 'WorkAuthorization',
        'PTOAccrualRate', 'EmploymentAgreement', 'RampAccount', 'RampCreditCard',
        'created_by', 'created_at', 'modified_by', 'modified_at',
      ];
      const insertParams = [
        contactId,
        nullableText(supervisor),
        nullableText(personalEmail),
        birthDate || null,
        nullableText(ssn),
        startDate || null,
        ...(hasOfficeCol ? [nullableText(office)] : []),
        ...(hasMiddleNameCol ? [nullableText(middleName)] : []),
        ...(hasAccessLevelCol ? [nullableText(accessLevel)] : []),
        nullableText(workstation),
        nullableText(workAuth),
        nullableText(ptoAccrualRate),
        nullableText(employmentAgreement),
        nullableText(rampAccount),
        nullableText(rampCreditCard),
        'Entra profile sync',
      ];
      const auditIdx = insertParams.length - 1;
      const placeholders = insertParams.map((_, i) => `@${i}`).join(', ');
      await manager.query(
        `
        INSERT INTO dbo.EmployeeProfile
          (${insertCols.join(', ')})
        VALUES
          (${placeholders}, SYSUTCDATETIME(), @${auditIdx}, SYSUTCDATETIME())
        `,
        insertParams,
      );
    }
  }

  private async upsertHomeAddress(
    _manager: EntityManager,
    _contactId: number,
    _attrs: EMSCustomAttributes,
    _current: CurrentProfileData,
  ): Promise<void> {
    // Home address fields are no longer stored as CSAs in Entra.
    // They are maintained directly in WMS (Company Hub) and not synced from Entra.
  }

  private async upsertEmergencyContact(
    manager: EntityManager,
    contactId: number,
    attrs: EMSCustomAttributes,
    current: CurrentProfileData,
  ): Promise<void> {
    const firstName = attrs.EmergencyContactFirstName?.trim() ?? '';
    const lastName = attrs.EmergencyContactLastName?.trim() ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const phone = attrs.EmergencyContactCell?.trim() ?? '';
    const email = attrs.EmergencyContactEmail?.trim() ?? '';

    if (!fullName && !phone && !email) return;

    const existingEcId = readNumber(current.emergencyContact, 'EmergencyContactID');

    if (existingEcId) {
      await manager.query(
        `
        UPDATE dbo.EmergencyContact
        SET FullName = @0, PhoneNumber = @1, Email = @2, UpdatedBy = @3, UpdatedAt = SYSUTCDATETIME()
        WHERE EmergencyContactID = @4
        `,
        [fullName, nullableText(phone), nullableText(email), 'Entra profile sync', existingEcId],
      );
    } else {
      await manager.query(
        `
        INSERT INTO dbo.EmergencyContact
          (ContactID, FullName, PhoneNumber, Email, IsPrimary, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
        VALUES (@0, @1, @2, @3, 1, @4, SYSUTCDATETIME(), @4, SYSUTCDATETIME())
        `,
        [contactId, fullName, nullableText(phone), nullableText(email), 'Entra profile sync'],
      );
    }
  }

  private async upsertEquipmentFromEntra(
    manager: EntityManager,
    contactAssignmentId: number,
    attrs: EMSCustomAttributes,
    currentEquipment: EquipmentData,
  ): Promise<void> {
    if (!contactAssignmentId) return;

    // Check required tables exist
    const needed = ['EmployeePhoneExtension', 'PhoneExtension', 'PhoneExtensionDevice', 'EquipmentPhone', 'EmployeeComputer', 'EquipmentComputer'];
    for (const table of needed) {
      if (!(await this.hasColumnExists(manager, table))) return;
    }

    // ── Desk Phone ── (DeskPhoneMAC format: "00:15:65:A8:63:F2 - Yealink")
    const phoneMac = parseMacAddress(attrs.DeskPhoneMAC);
    const phoneBrand = parseMacBrand(attrs.DeskPhoneMAC);
    const hasPhoneData = phoneMac || phoneBrand;
    const phoneChanged =
      phoneMac !== currentEquipment.deskPhoneMac ||
      phoneBrand !== currentEquipment.deskPhoneBrand;

    if (hasPhoneData && phoneChanged) {
      // Find current phone assignment
      const phoneRows = await manager.query(
        `SELECT TOP 1 eqp.PhoneID
         FROM dbo.EmployeePhoneExtension epe
         INNER JOIN dbo.PhoneExtensionDevice ped ON ped.ExtensionID = epe.ExtensionID AND ped.IsCurrent = 1
         INNER JOIN dbo.EquipmentPhone eqp ON eqp.PhoneID = ped.PhoneID
         WHERE epe.ContactAssignmentID = @0 AND epe.IsCurrent = 1`,
        [contactAssignmentId],
      );
      if (phoneRows.length > 0) {
        const phoneId = readNumber(phoneRows[0], 'PhoneID');
        if (phoneId) {
          await manager.query(
            `UPDATE dbo.EquipmentPhone SET MACAddress = @0, Make = @1 WHERE PhoneID = @2`,
            [nullableText(phoneMac), nullableText(phoneBrand), phoneId],
          );
        }
      }
      // If no existing phone assignment, skip (requires admin to create the device first)
    }

    // ── Computer ── (PCServiceTag format: "BFKMW54 - Zach-PC")
    const pcServiceTag = parseServiceTag(attrs.PCServiceTag);
    const pcWindowsName = parseServiceTagName(attrs.PCServiceTag);
    const hasPcData = pcServiceTag || pcWindowsName;
    const pcChanged =
      pcServiceTag !== currentEquipment.pcServiceTag ||
      pcWindowsName !== currentEquipment.pcWindowsName;

    if (hasPcData && pcChanged) {
      // Find current computer assignment
      const pcRows = await manager.query(
        `SELECT TOP 1 eqc.ComputerID
         FROM dbo.EmployeeComputer ec
         INNER JOIN dbo.EquipmentComputer eqc ON eqc.ComputerID = ec.ComputerID
         WHERE ec.ContactAssignmentID = @0 AND ec.IsCurrent = 1`,
        [contactAssignmentId],
      );
      if (pcRows.length > 0) {
        const computerId = readNumber(pcRows[0], 'ComputerID');
        if (computerId) {
          await manager.query(
            `UPDATE dbo.EquipmentComputer SET AssetID = @0, PCName = @1 WHERE ComputerID = @2`,
            [nullableText(pcServiceTag), nullableText(pcWindowsName), computerId],
          );
        }
      }
      // If no existing computer assignment, skip (requires admin to create the equipment first)
    }
  }

  private async hasColumnExists(
    executor: Pick<DataSource | EntityManager, 'query'>,
    tableName: string,
  ): Promise<boolean> {
    const rows = await executor.query(
      `SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`,
      [tableName],
    );
    return rows.length > 0;
  }

  // ─── Public Helpers for Per-Field Entra Push ────────────────────────────────

  /**
   * Push Custom Security Attributes to Entra for a single user (called by
   * employee-profile and employee-employment services on save).
   */
  async pushCustomSecurityAttributes(
    userEmail: string,
    csaPayload: Record<string, string | boolean | null>,
    graphAccessToken?: string,
  ): Promise<void> {
    if (Object.keys(csaPayload).length === 0) return;
    const token = await this.getGraphWriteToken(graphAccessToken);
    const userId = await this.resolveGraphUserId(token, userEmail);
    const payload: Record<string, unknown> = {
      customSecurityAttributes: {
        [EMS_ATTRIBUTE_SET]: {
          '@odata.type': '#Microsoft.DirectoryServices.CustomSecurityAttributeValue',
          ...csaPayload,
        },
      },
    };
    await this.graphPatch(token, `${GRAPH_BASE_URL}/users/${userId}`, payload);
  }

  /**
   * Push both native Graph properties and Custom Security Attributes to Entra
   * for a single user in a single PATCH call.
   */
  async pushNativeAndCustomAttributes(
    userEmail: string,
    nativePayload: Record<string, unknown>,
    csaPayload?: Record<string, string | null>,
    graphAccessToken?: string,
  ): Promise<void> {
    const token = await this.getGraphWriteToken(graphAccessToken);
    const userId = await this.resolveGraphUserId(token, userEmail);
    const payload = { ...nativePayload };
    if (csaPayload && Object.keys(csaPayload).length > 0) {
      payload.customSecurityAttributes = {
        [EMS_ATTRIBUTE_SET]: {
          '@odata.type': '#Microsoft.DirectoryServices.CustomSecurityAttributeValue',
          ...csaPayload,
        },
      };
    }
    if (Object.keys(payload).length === 0) return;
    await this.graphPatch(token, `${GRAPH_BASE_URL}/users/${userId}`, payload);
  }

  /**
   * Pull a single user's profile from Entra and sync into EMS.
   * Used by the "Sync from Entra" button on the profile page.
   */
  async syncSingleUserFromEntra(
    userEmail: string,
    graphAccessToken?: string,
  ): Promise<{ synced: boolean; changes: EntraProfileSyncFieldChange[] }> {
    const token = await this.getGraphToken(graphAccessToken);
    const internalContacts = await this.loadInternalContacts();
    const normalized = userEmail.trim().toLowerCase();
    const contact = internalContacts.find((c) => c.email.toLowerCase() === normalized);
    if (!contact) {
      return { synced: false, changes: [] };
    }

    const entraProfile = await this.fetchEntraFullProfile(token, contact.email);
    if (!entraProfile) {
      return { synced: false, changes: [] };
    }

    const currentProfile = await this.loadCurrentProfileData(contact.contactId, contact.contactAssignmentId);
    const changes = this.computeChanges(entraProfile, currentProfile, contact);

    if (changes.length === 0) {
      return { synced: true, changes: [] };
    }

    await this.applyChanges(contact, entraProfile, currentProfile);
    return { synced: true, changes };
  }

  /**
   * Preview changes from Entra for a single user without applying them.
   */
  async previewSingleUserFromEntra(
    userEmail: string,
    graphAccessToken?: string,
  ): Promise<{ changes: EntraProfileSyncFieldChange[] }> {
    console.log(`[EntraSync:preview] Called for email: "${userEmail}"`);
    const token = await this.getGraphToken(graphAccessToken);
    const internalContacts = await this.loadInternalContacts();
    console.log(`[EntraSync:preview] Found ${internalContacts.length} internal contacts`);
    const normalized = userEmail.trim().toLowerCase();
    const contact = internalContacts.find((c) => c.email.toLowerCase() === normalized);
    if (!contact) {
      console.log(`[EntraSync:preview] No contact found for "${normalized}". Available emails:`, internalContacts.slice(0, 5).map(c => c.email));
      return { changes: [] };
    }

    const entraProfile = await this.fetchEntraFullProfile(token, contact.email);
    if (!entraProfile) {
      return { changes: [] };
    }

    const currentProfile = await this.loadCurrentProfileData(contact.contactId, contact.contactAssignmentId);
    const changes = this.computeChanges(entraProfile, currentProfile, contact);
    return { changes };
  }

  // ─── EMS → Entra Profile Sync ─────────────────────────────────────────────

  /**
   * Preview what would change if EMS profile data were pushed to Entra.
   */
  async previewEmsToEntraProfileSync(
    graphAccessToken?: string,
  ): Promise<EntraProfileSyncPreview> {
    const token = await this.getGraphToken(graphAccessToken);
    const internalContacts = await this.loadInternalContacts();
    const rows: EntraProfileSyncPreviewRow[] = [];

    for (const contact of internalContacts) {
      const entraProfile = await this.fetchEntraFullProfile(token, contact.email);
      if (!entraProfile) continue;

      const currentProfile = await this.loadCurrentProfileData(contact.contactId, contact.contactAssignmentId);
      const changes = this.computeEmsToEntraChanges(entraProfile, currentProfile, contact);

      rows.push({
        contactId: contact.contactId,
        email: contact.email,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        status: changes.length > 0 ? 'willUpdate' : 'upToDate',
        changes,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      totalUsers: rows.length,
      willUpdate: rows.filter((r) => r.status === 'willUpdate').length,
      upToDate: rows.filter((r) => r.status === 'upToDate').length,
      rows,
    };
  }

  /**
   * Apply EMS → Entra profile sync: push EMS profile fields to Entra
   * (native Graph properties + Custom Security Attributes).
   */
  async applyEmsToEntraProfileSync(
    graphAccessToken?: string,
    targetEmail?: string,
  ): Promise<EntraProfileSyncResult> {
    const token = await this.getGraphWriteToken(graphAccessToken);
    let internalContacts = await this.loadInternalContacts();

    if (targetEmail) {
      const normalized = targetEmail.trim().toLowerCase();
      internalContacts = internalContacts.filter(
        (c) => c.email.toLowerCase() === normalized,
      );
      if (internalContacts.length === 0) {
        throw new BadRequestException(
          `No internal employee found with email ${targetEmail}.`,
        );
      }
    }

    const rows: EntraProfileSyncRow[] = [];
    let updated = 0;
    let upToDate = 0;
    let errors = 0;

    for (const contact of internalContacts) {
      try {
        const entraProfile = await this.fetchEntraFullProfile(token, contact.email);
        if (!entraProfile) {
          rows.push({
            contactId: contact.contactId,
            email: contact.email,
            name: `${contact.firstName} ${contact.lastName}`.trim(),
            status: 'error',
            changes: [],
            error: 'Could not fetch Entra profile for this user.',
          });
          errors++;
          continue;
        }

        const currentProfile = await this.loadCurrentProfileData(contact.contactId, contact.contactAssignmentId);
        const changes = this.computeEmsToEntraChanges(entraProfile, currentProfile, contact);

        if (changes.length === 0) {
          rows.push({
            contactId: contact.contactId,
            email: contact.email,
            name: `${contact.firstName} ${contact.lastName}`.trim(),
            status: 'upToDate',
            changes: [],
          });
          upToDate++;
          continue;
        }

        await this.pushEmsToEntra(token, contact, entraProfile, currentProfile);

        rows.push({
          contactId: contact.contactId,
          email: contact.email,
          name: `${contact.firstName} ${contact.lastName}`.trim(),
          status: 'updated',
          changes,
        });
        updated++;
      } catch (error) {
        rows.push({
          contactId: contact.contactId,
          email: contact.email,
          name: `${contact.firstName} ${contact.lastName}`.trim(),
          status: 'error',
          changes: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errors++;
      }
    }

    return {
      syncedAt: new Date().toISOString(),
      totalProcessed: rows.length,
      updated,
      upToDate,
      created: 0,
      errors,
      rows,
    };
  }

  /**
   * Compute changes from EMS → Entra direction (what EMS would push to Entra).
   */
  private computeEmsToEntraChanges(
    entra: EntraFullProfile,
    current: CurrentProfileData,
    contact: InternalContact,
  ): EntraProfileSyncFieldChange[] {
    const changes: EntraProfileSyncFieldChange[] = [];

    // Native Graph properties
    addChange(changes, 'givenName', 'First Name', entra.user.givenName, contact.firstName);
    addChange(changes, 'surname', 'Last Name', entra.user.surname, contact.lastName);
    addChange(changes, 'mail', 'Email', entra.user.mail || entra.user.userPrincipalName, contact.email, true);
    addChange(changes, 'mobilePhone', 'Cell Phone', entra.user.mobilePhone, contact.cellPhone);
    addChange(changes, 'businessPhones', 'Work Phone', firstBusinessPhone(entra.user.businessPhones), contact.workPhone);
    // Job Title (from ContactInfo.JobTitle or EmployeeProfile)
    const emsJobTitle = readString(current.profileRow, 'JobTitle') || '';
    addChange(changes, 'jobTitle', 'Title', entra.user.jobTitle, emsJobTitle);
    // Start date
    const emsStartDate = readDateString(current.profileRow, 'StartDate') ?? '';
    addChange(changes, 'employeeHireDate', 'Start Date at IAE', normalizeDate(entra.user.employeeHireDate), emsStartDate);
    // Office location
    const emsOffice = readString(current.profileRow, 'Office');
    addChange(changes, 'officeLocation', 'Office', entra.user.officeLocation, emsOffice);

    // Custom Security Attributes (EMS → Entra)
    const emsSupervisor = readString(current.profileRow, 'Supervisor');
    addChange(changes, 'Supervisor', 'Supervisor', entra.emsAttributes.Supervisor ?? entra.manager?.displayName ?? '', emsSupervisor);
    const emsMiddleName = readString(current.profileRow, 'MiddleName');
    addChange(changes, 'MiddleName', 'Middle Name', entra.emsAttributes.MiddleName ?? '', emsMiddleName);
    const emsPersonalEmail = readString(current.profileRow, 'PersonalEmail');
    addChange(changes, 'PersonalEmail', 'Personal Email', entra.emsAttributes.PersonalEmail ?? '', emsPersonalEmail);
    const emsBirthDate = readDateString(current.profileRow, 'DateOfBirth') ?? '';
    addChange(changes, 'Birthday', 'Birth Date', normalizeDate(entra.emsAttributes.Birthday), emsBirthDate);
    const emsSsn = readString(current.profileRow, 'SSNLast4');
    addChange(changes, 'SocialSecurityNumber', 'Social Security Number', ssnLast4(entra.emsAttributes.SocialSecurityNumber), emsSsn);
    // Emergency Contact — table uses FullName, split into first/last for Entra CSA
    const emsEcFullName = readString(current.emergencyContact, 'FullName');
    const emsEcNameParts = emsEcFullName.split(/\s+/);
    const emsEcFirstName = emsEcNameParts[0] || '';
    const emsEcLastName = emsEcNameParts.slice(1).join(' ') || '';
    const emsEcPhone = readString(current.emergencyContact, 'PhoneNumber');
    const emsEcEmail = readString(current.emergencyContact, 'Email');
    addChange(changes, 'EmergencyContactFirstName', 'Emergency Contact First Name', entra.emsAttributes.EmergencyContactFirstName ?? '', emsEcFirstName);
    addChange(changes, 'EmergencyContactLastName', 'Emergency Contact Last Name', entra.emsAttributes.EmergencyContactLastName ?? '', emsEcLastName);
    addChange(changes, 'EmergencyContactCell', 'Emergency Contact Phone', entra.emsAttributes.EmergencyContactCell ?? '', emsEcPhone);
    addChange(changes, 'EmergencyContactEmail', 'Emergency Contact Email', entra.emsAttributes.EmergencyContactEmail ?? '', emsEcEmail);
    // Employment fields
    const emsWorkAuth = readString(current.profileRow, 'WorkAuthorization');
    addChange(changes, 'WorkAuthorization', 'Work Authorization', entra.emsAttributes.WorkAuthorization ?? '', emsWorkAuth);
    const emsWorkstation = readString(current.profileRow, 'Workstation');
    addChange(changes, 'Workstation', 'Workstation', entra.emsAttributes.Workstation ?? '', emsWorkstation);
    const emsPto = readString(current.profileRow, 'PTOAccrualRate');
    addChange(changes, 'PTOAccrual', 'PTO Accrual Rate', entra.emsAttributes.PTOAccrual ?? '', emsPto);
    const emsEmpAgreement = readString(current.profileRow, 'EmploymentAgreement');
    addChange(changes, 'EmploymentAgreement', 'Employment Agreement', boolToYesNo(entra.emsAttributes.EmploymentAgreement), emsEmpAgreement);
    const emsRampAccount = readString(current.profileRow, 'RampAccount');
    addChange(changes, 'RampAccount', 'Ramp Account', boolToYesNo(entra.emsAttributes.RampAccount), emsRampAccount);
    const emsRampCard = readString(current.profileRow, 'RampCreditCard');
    addChange(changes, 'RampCard', 'Ramp Credit Card', entra.emsAttributes.RampCard ?? '', emsRampCard);
    // Equipment — Desk Phone (combined format: "MAC - Brand")
    addChange(changes, 'DeskPhoneMAC', 'Desk Phone MAC Address', parseMacAddress(entra.emsAttributes.DeskPhoneMAC), current.equipment.deskPhoneMac);
    // Equipment — PC (combined format: "ServiceTag - PCName")
    addChange(changes, 'PCServiceTag', 'PC Service Tag', parseServiceTag(entra.emsAttributes.PCServiceTag), current.equipment.pcServiceTag);
    // Access Level
    const emsAccessLevel = readString(current.profileRow, 'AccessLevel');
    addChange(changes, 'EMSAccessLevel', 'Access Level', entra.emsAttributes.EMSAccessLevel ?? '', emsAccessLevel);

    return changes;
  }

  /**
   * Push EMS profile data to Entra (native Graph properties + Custom Security Attributes).
   */
  private async pushEmsToEntra(
    accessToken: string,
    contact: InternalContact,
    entra: EntraFullProfile,
    current: CurrentProfileData,
  ): Promise<void> {
    const encodedEmail = encodeURIComponent(contact.email);

    // 1. Build native Graph user properties payload
    const nativePayload: Record<string, unknown> = {};
    if (contact.firstName && contact.firstName !== entra.user.givenName) {
      nativePayload.givenName = trimTo(contact.firstName, 64);
    }
    if (contact.lastName && contact.lastName !== entra.user.surname) {
      nativePayload.surname = trimTo(contact.lastName, 64);
    }
    if (contact.firstName || contact.lastName) {
      const displayName = `${contact.firstName} ${contact.lastName}`.trim();
      if (displayName && displayName !== entra.user.displayName) {
        nativePayload.displayName = displayName;
      }
    }
    if (contact.cellPhone !== entra.user.mobilePhone) {
      nativePayload.mobilePhone = nullableText(trimTo(contact.cellPhone, 30));
    }
    if (contact.workPhone !== firstBusinessPhone(entra.user.businessPhones)) {
      nativePayload.businessPhones = contact.workPhone
        ? [trimTo(contact.workPhone, 30)]
        : [];
    }
    const emsOffice = readString(current.profileRow, 'Office');
    if (emsOffice && emsOffice !== entra.user.officeLocation) {
      nativePayload.officeLocation = emsOffice;
    }
    const emsStartDate = readDateString(current.profileRow, 'StartDate');
    if (emsStartDate && emsStartDate !== normalizeDate(entra.user.employeeHireDate)) {
      nativePayload.employeeHireDate = `${emsStartDate}T00:00:00Z`;
    }

    // 2. Build Custom Security Attributes payload
    const csaPayload: Record<string, string | boolean | null> = {};

    const emsPersonalEmail = readString(current.profileRow, 'PersonalEmail');
    if (emsPersonalEmail && emsPersonalEmail !== (entra.emsAttributes.PersonalEmail ?? '')) {
      csaPayload.PersonalEmail = emsPersonalEmail;
    }
    const emsMiddleName = readString(current.profileRow, 'MiddleName');
    if (emsMiddleName && emsMiddleName !== (entra.emsAttributes.MiddleName ?? '')) {
      csaPayload.MiddleName = emsMiddleName;
    }
    const emsBirthDate = readDateString(current.profileRow, 'DateOfBirth') ?? '';
    if (emsBirthDate && emsBirthDate !== normalizeDate(entra.emsAttributes.Birthday)) {
      csaPayload.Birthday = emsBirthDate;
    }
    const emsSsn = readString(current.profileRow, 'SSNLast4');
    if (emsSsn && emsSsn !== ssnLast4(entra.emsAttributes.SocialSecurityNumber)) {
      csaPayload.SocialSecurityNumber = emsSsn;
    }
    // Emergency contacts — table uses FullName, split for Entra CSA
    const emsEcFullName2 = readString(current.emergencyContact, 'FullName');
    const emsEcParts2 = emsEcFullName2.split(/\s+/);
    const emsEcFirst2 = emsEcParts2[0] || '';
    const emsEcLast2 = emsEcParts2.slice(1).join(' ') || '';
    if (emsEcFirst2 !== (entra.emsAttributes.EmergencyContactFirstName ?? '')) csaPayload.EmergencyContactFirstName = emsEcFirst2 || null;
    if (emsEcLast2 !== (entra.emsAttributes.EmergencyContactLastName ?? '')) csaPayload.EmergencyContactLastName = emsEcLast2 || null;
    const emsEcPhone = readString(current.emergencyContact, 'PhoneNumber');
    if (emsEcPhone !== (entra.emsAttributes.EmergencyContactCell ?? '')) csaPayload.EmergencyContactCell = emsEcPhone || null;
    const emsEcEmail = readString(current.emergencyContact, 'Email');
    if (emsEcEmail !== (entra.emsAttributes.EmergencyContactEmail ?? '')) csaPayload.EmergencyContactEmail = emsEcEmail || null;
    // Employment fields
    const emsWorkAuth = readString(current.profileRow, 'WorkAuthorization');
    if (emsWorkAuth && emsWorkAuth !== (entra.emsAttributes.WorkAuthorization ?? '')) csaPayload.WorkAuthorization = emsWorkAuth;
    const emsWorkstation = readString(current.profileRow, 'Workstation');
    if (emsWorkstation && emsWorkstation !== (entra.emsAttributes.Workstation ?? '')) csaPayload.Workstation = emsWorkstation;
    const emsPto = readString(current.profileRow, 'PTOAccrualRate');
    if (emsPto && emsPto !== (entra.emsAttributes.PTOAccrual ?? '')) csaPayload.PTOAccrual = emsPto;
    const emsEmpAgreement = readString(current.profileRow, 'EmploymentAgreement');
    if (emsEmpAgreement) {
      const entraEmpAgreementVal = boolToYesNo(entra.emsAttributes.EmploymentAgreement);
      if (emsEmpAgreement !== entraEmpAgreementVal) csaPayload.EmploymentAgreement = emsEmpAgreement === 'Yes';
    }
    const emsRampAccount = readString(current.profileRow, 'RampAccount');
    if (emsRampAccount) {
      const entraRampAccountVal = boolToYesNo(entra.emsAttributes.RampAccount);
      if (emsRampAccount !== entraRampAccountVal) csaPayload.RampAccount = emsRampAccount === 'Yes';
    }
    const emsRampCard = readString(current.profileRow, 'RampCreditCard');
    if (emsRampCard && emsRampCard !== (entra.emsAttributes.RampCard ?? '')) csaPayload.RampCard = emsRampCard;
    // Equipment — Desk Phone (combine MAC + Brand into "MAC - Brand")
    const phoneMac = current.equipment.deskPhoneMac;
    const phoneBrand = current.equipment.deskPhoneBrand;
    if (phoneMac || phoneBrand) {
      const combinedPhone = phoneBrand ? `${phoneMac} - ${phoneBrand}` : phoneMac;
      if (combinedPhone !== (entra.emsAttributes.DeskPhoneMAC ?? '')) csaPayload.DeskPhoneMAC = combinedPhone;
    }
    // Equipment — PC (combine ServiceTag + PCName into "Tag - Name")
    const pcTag = current.equipment.pcServiceTag;
    const pcName = current.equipment.pcWindowsName;
    if (pcTag || pcName) {
      const combinedPc = pcName ? `${pcTag} - ${pcName}` : pcTag;
      if (combinedPc !== (entra.emsAttributes.PCServiceTag ?? '')) csaPayload.PCServiceTag = combinedPc;
    }
    // Access Level
    const emsAccessLevel = readString(current.profileRow, 'AccessLevel');
    if (emsAccessLevel && emsAccessLevel !== (entra.emsAttributes.EMSAccessLevel ?? '')) csaPayload.EMSAccessLevel = emsAccessLevel;
    // Supervisor
    const emsSupervisorCsa = readString(current.profileRow, 'Supervisor');
    if (emsSupervisorCsa && emsSupervisorCsa !== (entra.emsAttributes.Supervisor ?? '')) csaPayload.Supervisor = emsSupervisorCsa;

    // 3. Merge CSA into native payload if there are any CSA changes
    if (Object.keys(csaPayload).length > 0) {
      nativePayload.customSecurityAttributes = {
        [EMS_ATTRIBUTE_SET]: {
          '@odata.type': `#Microsoft.DirectoryServices.CustomSecurityAttributeValue`,
          ...csaPayload,
        },
      };
    }

    // 4. PATCH the Entra user if there's anything to write
    if (Object.keys(nativePayload).length > 0) {
      await this.graphPatch(
        accessToken,
        `${GRAPH_BASE_URL}/users/${encodedEmail}`,
        nativePayload,
      );
    }

    // 5. Set manager if supervisor changed (requires separate API call)
    const emsSupervisor = readString(current.profileRow, 'Supervisor');
    const currentManager = entra.manager?.displayName ?? '';
    if (emsSupervisor && emsSupervisor !== currentManager) {
      await this.setEntraManager(accessToken, contact.email, emsSupervisor);
    }
  }

  /**
   * Set the manager for an Entra user by looking up the supervisor's user ID by name.
   */
  private async setEntraManager(
    accessToken: string,
    userEmail: string,
    supervisorName: string,
  ): Promise<void> {
    if (!supervisorName) return;

    // Look up supervisor in Entra by display name
    const encodedFilter = encodeURIComponent(`displayName eq '${supervisorName.replace(/'/g, "''")}'`);
    const searchUrl = `${GRAPH_BASE_URL}/users?$filter=${encodedFilter}&$select=id,displayName&$top=1`;
    const searchResult = await this.graphGet<{ value?: Array<{ id?: string }> }>(
      accessToken,
      searchUrl,
    );
    const managerId = searchResult?.value?.[0]?.id;
    if (!managerId) return; // Supervisor not found in Entra — skip silently

    const encodedEmail = encodeURIComponent(userEmail);
    try {
      await this.graphPut(
        accessToken,
        `${GRAPH_BASE_URL}/users/${encodedEmail}/manager/$ref`,
        { '@odata.id': `${GRAPH_BASE_URL}/users/${managerId}` },
      );
    } catch {
      // Manager assignment failure is non-critical — don't block the rest of the sync
    }
  }

  private async graphPatch(
    accessToken: string,
    url: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.log(`[EntraSync] Graph PATCH ${url} failed (${response.status}): ${text.slice(0, 300)} Payload: ${JSON.stringify(payload).slice(0, 300)}`);
      throw new BadGatewayException(
        `Microsoft Graph PATCH failed (${response.status}): ${text.slice(0, 300)}`,
      );
    }
  }

  /**
   * Resolve a user's Graph API identifier. Tries to fetch by email/UPN first
   * to get the stable object ID. Falls back to encoded email if lookup fails.
   */
  private async resolveGraphUserId(
    accessToken: string,
    email: string,
  ): Promise<string> {
    const encodedEmail = encodeURIComponent(email);
    const userData = await this.graphGet<{ id?: string }>(
      accessToken,
      `${GRAPH_BASE_URL}/users/${encodedEmail}?$select=id`,
    );
    if (userData?.id) return userData.id;
    // Fallback: use encoded email (may fail if UPN differs)
    return encodedEmail;
  }

  private async graphPut(
    accessToken: string,
    url: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new BadGatewayException(
        `Microsoft Graph PUT failed (${response.status}): ${text.slice(0, 300)}`,
      );
    }
  }

  // ─── Token Helpers ──────────────────────────────────────────────────────────

  private async getGraphWriteToken(delegatedToken?: string): Promise<string> {
    const appToken = await this.tryGetApplicationToken();
    if (appToken) return appToken;

    const delegated = delegatedToken?.trim();
    if (delegated) return delegated;

    throw new ServiceUnavailableException(
      'Microsoft Graph write access requires either backend application credentials (ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET) or a delegated Graph token with User.ReadWrite.All.',
    );
  }

  private async getGraphToken(delegatedToken?: string): Promise<string> {
    const delegated = delegatedToken?.trim();
    if (delegated) return delegated;

    const appToken = await this.tryGetApplicationToken();
    if (appToken) return appToken;

    throw new ServiceUnavailableException(
      'Microsoft Graph access requires either a delegated Graph token or backend application credentials (ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET).',
    );
  }

  private async tryGetApplicationToken(): Promise<string | null> {
    if (this.appGraphTokenCache && Date.now() < this.appGraphTokenCache.expiresAt) {
      return this.appGraphTokenCache.accessToken;
    }

    const tenantId = this.configService.get<string>('ENTRA_TENANT_ID');
    const clientId = this.configService.get<string>('ENTRA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ENTRA_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) return null;

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.appGraphTokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 120) * 1000,
    };

    return data.access_token;
  }

  // ─── Utility ────────────────────────────────────────────────────────────────

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`,
      [tableName],
    );
    return rows.length > 0;
  }

  private async hasColumnInTable(
    executor: Pick<DataSource | EntityManager, 'query'>,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const rows = await executor.query(
      `SELECT 1 AS found FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0 AND COLUMN_NAME = @1`,
      [tableName, columnName],
    );
    return rows.length > 0;
  }
}

// ─── Internal Types ───────────────────────────────────────────────────────────

type InternalContact = {
  contactId: number;
  contactInfoId: number;
  contactAssignmentId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  workPhone: string;
};

type CurrentProfileData = {
  hasEpTable: boolean;
  hasEcTable: boolean;
  profileRow: Record<string, unknown> | undefined;
  homeAddress: Record<string, unknown> | undefined;
  emergencyContact: Record<string, unknown> | undefined;
  equipment: EquipmentData;
};

type EquipmentData = {
  deskPhoneMac: string;
  deskPhoneBrand: string;
  deskPhoneModel: string;
  pcBrand: string;
  pcModel: string;
  pcServiceTag: string;
  bluetoothStatus: string;
  pcWindowsName: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(value: unknown): string {
  return String(value ?? '').trim();
}

function optStr(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s || null;
}

function nullableText(value: string | null | undefined): string | null {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ');
  return cleaned || null;
}

function trimTo(value: string | null | undefined, maxLen: number): string {
  const s = String(value ?? '').trim();
  return s.slice(0, maxLen);
}

function firstBusinessPhone(phones: string[]): string {
  return (phones[0] ?? '').trim();
}

function ssnLast4(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return digits.slice(-4);
}

/** Convert a boolean CSA value to "Yes"/"No" string for DB storage. */
function boolToYesNo(value: boolean | string | null | undefined): string {
  if (value === true || value === 'true') return 'Yes';
  if (value === false || value === 'false') return 'No';
  return '';
}

/** Parse MAC address from combined format "00:15:65:A8:63:F2 - Yealink" → "00:15:65:A8:63:F2" */
function parseMacAddress(value: string | null | undefined): string {
  if (!value) return '';
  const parts = value.split(' - ');
  return (parts[0] ?? '').trim();
}

/** Parse brand from combined format "00:15:65:A8:63:F2 - Yealink" → "Yealink" */
function parseMacBrand(value: string | null | undefined): string {
  if (!value) return '';
  const parts = value.split(' - ');
  return (parts[1] ?? '').trim();
}

/** Parse service tag from combined format "BFKMW54 - Zach-PC" → "BFKMW54" */
function parseServiceTag(value: string | null | undefined): string {
  if (!value) return '';
  const parts = value.split(' - ');
  return (parts[0] ?? '').trim();
}

/** Parse PC name from combined format "BFKMW54 - Zach-PC" → "Zach-PC" */
function parseServiceTagName(value: string | null | undefined): string {
  if (!value) return '';
  const parts = value.split(' - ');
  return (parts[1] ?? '').trim();
}

function normalizeDate(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  // ISO: YYYY-MM-DD
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoMatch) return isoMatch[1];
  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // MM/DD/YYYY
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mdy && Number(mdy[1]) <= 12) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readString(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return String(value).trim();
  }
  return '';
}

function readNumber(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readDateString(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(value).trim();
    if (!s) continue;
    const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    if (isoMatch) return isoMatch[1];
  }
  return null;
}

function addChange(
  changes: EntraProfileSyncFieldChange[],
  field: string,
  label: string,
  currentValue: string | null | undefined,
  entraValue: string | null | undefined,
  compareAsEmail = false,
): void {
  const from = (currentValue ?? '').trim();
  const to = (entraValue ?? '').trim();

  if (!to && !from) return; // Both empty — no change
  if (!to) return; // Entra has no value — don't blank out existing EMS data

  let same: boolean;
  if (compareAsEmail) {
    same = from.toLowerCase() === to.toLowerCase();
  } else {
    same = from === to;
  }

  if (!same) {
    changes.push({ field, label, from: from || null, to });
  }
}
