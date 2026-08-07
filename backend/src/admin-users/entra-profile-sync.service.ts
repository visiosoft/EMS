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
  employeeType: string;
  accountEnabled: boolean;
  employeeHireDate: string | null;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
  WorthAuthorizationLink?: string | null;
  Workstation?: string | null;
  PTOAccrual?: string | null;
  EmploymentAgreement?: string | boolean | null;
  RampAccount?: string | boolean | null;
  RampCard?: string | null;
  DeskPhoneNumber?: string | null;
  DeskPhoneExtension?: string | null;
  DeskPhoneMAC?: string | null;
  DeskPhoneBrand?: string | null;
  DeskPhoneModel?: string | null;
  PCServiceTag?: string | null;
  PCBrand?: string | null;
  PCModel?: string | null;
  BluetoothStatus?: string | null;
  PCWindowsName?: string | null;
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

/** Fields an employee (non-admin) is allowed to sync from Entra on their own profile. */
export const EMPLOYEE_SYNCABLE_FIELDS = new Set([
  'firstName', 'lastName', 'middleName',
  'cellPhone', 'workPhone',
  'birthDate',
  'title',
  'office',
  'workstation',
  'department',
  'departmentRank',
  'supervisor',
]);

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
    const selectFields = 'id,displayName,givenName,surname,mail,userPrincipalName,mobilePhone,businessPhones,department,jobTitle,officeLocation,companyName,accountEnabled,employeeHireDate,employeeType,streetAddress,city,state,postalCode,country,customSecurityAttributes';
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
      employeeType: str(userData.employeeType),
      accountEnabled: userData.accountEnabled !== false,
      employeeHireDate: str(userData.employeeHireDate) || null,
      streetAddress: str(userData.streetAddress),
      city: str(userData.city),
      state: str(userData.state),
      postalCode: str(userData.postalCode),
      country: str(userData.country),
    };

    // 2. Extract Custom Security Attributes from the "EMSInformation" set
    const customAttrs = (userData.customSecurityAttributes as Record<string, unknown>) ?? {};
    const emsAttrs = (customAttrs[EMS_ATTRIBUTE_SET] as Record<string, unknown>) ?? {};

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
      WorthAuthorizationLink: optStr(emsAttrs.WorthAuthorizationLink),
      Workstation: optStr(emsAttrs.Workstation),
      PTOAccrual: optStr(emsAttrs.PTOAccrual),
      EmploymentAgreement: typeof emsAttrs.EmploymentAgreement === 'boolean' ? emsAttrs.EmploymentAgreement : null,
      RampAccount: typeof emsAttrs.RampAccount === 'boolean' ? emsAttrs.RampAccount : null,
      RampCard: optStr(emsAttrs.RampCard),
      DeskPhoneNumber: optStr(emsAttrs.DeskPhoneNumber),
      DeskPhoneExtension: optStr(emsAttrs.DeskPhoneExtension),
      DeskPhoneMAC: optStr(emsAttrs.DeskPhoneMAC),
      DeskPhoneBrand: optStr(emsAttrs.DeskPhoneBrand),
      DeskPhoneModel: optStr(emsAttrs.DeskPhoneModel),
      PCServiceTag: optStr(emsAttrs.PCServiceTag),
      PCBrand: optStr(emsAttrs.PCBrand),
      PCModel: optStr(emsAttrs.PCModel),
      BluetoothStatus: optStr(emsAttrs.BluetoothStatus),
      PCWindowsName: optStr(emsAttrs.PCWindowsName),
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
        COALESCE(ci.WorkPhone, '') AS workPhone,
        COALESCE(d.DepartmentName, '') AS department
      FROM dbo.ContactAssignment ca
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      INNER JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      LEFT JOIN dbo.Department d ON d.DepartmentID = ca.DepartmentID
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
        department: readString(row, 'department', 'DepartmentName'),
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

    // Resolve Work Authorization Link URL from Link table
    let workAuthLinkUrl = '';
    if (profileRow) {
      const hasWalCol = await this.hasColumnInTable(this.dataSource, 'EmployeeProfile', 'WorthAuthorizationLinkId');
      if (hasWalCol) {
        const linkId = readNumber(profileRow, 'WorthAuthorizationLinkId');
        if (linkId) {
          const linkRows = await this.dataSource.query(`SELECT TOP 1 LinkURL FROM dbo.Link WHERE LinkID = @0`, [linkId]);
          workAuthLinkUrl = (linkRows as Record<string, unknown>[])?.[0]?.LinkURL as string ?? '';
        }
      }
    }

    return {
      hasEpTable,
      hasEcTable,
      profileRow,
      homeAddress,
      emergencyContact,
      equipment,
      workAuthLinkUrl,
    };
  }

  private async loadEquipment(contactAssignmentId: number): Promise<EquipmentData> {
    const empty: EquipmentData = {
      deskPhoneNumber: '(312) 274-1800',
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
    if (!contactAssignmentId) return empty;

    const needed = ['EmployeePhoneExtension', 'PhoneExtension', 'PhoneExtensionDevice', 'EquipmentPhone', 'EmployeeComputer', 'EquipmentComputer'];
    for (const table of needed) {
      if (!(await this.tableExists(table))) return empty;
    }

    const rows = await this.dataSource.query(
      `
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
      `,
      [contactAssignmentId],
    );
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return empty;
    return {
      deskPhoneNumber: '(312) 274-1800',
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
    // Home Address
    const currentStreet = readString(current.homeAddress, 'AddressLine1');
    const currentCity = readString(current.homeAddress, 'City');
    const currentState = readString(current.homeAddress, 'StateProvince');
    const currentPostalCode = readString(current.homeAddress, 'PostalCode');
    const currentCountry = readString(current.homeAddress, 'Country');
    addChange(changes, 'streetAddress', 'Street Address', currentStreet, entra.user.streetAddress);
    addChange(changes, 'city', 'City', currentCity, entra.user.city);
    addChange(changes, 'state', 'State / Province', currentState, entra.user.state);
    addChange(changes, 'postalCode', 'Postal Code', currentPostalCode, entra.user.postalCode);
    addChange(changes, 'country', 'Country', currentCountry, entra.user.country);
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
    // Work Authorization Link (stored as LinkID → dbo.Link)
    addChange(changes, 'workAuthorizationLink', 'Work Authorization Photos', current.workAuthLinkUrl, entra.emsAttributes.WorthAuthorizationLink ?? '');
    // Access Level (from CSA)
    const currentAccessLevel = readString(current.profileRow, 'AccessLevel');
    addChange(changes, 'accessLevel', 'Access Level', currentAccessLevel, entra.emsAttributes.EMSAccessLevel ?? '');
    // Department — synced via contact sync, but we track it for change visibility
    addChange(changes, 'department', 'Department', contact.department, entra.user.department);
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
    // Department Rank (from CSA)
    const currentDeptRank = readString(current.profileRow, 'DepartmentRank');
    addChange(changes, 'departmentRank', 'Department Rank', currentDeptRank, entra.emsAttributes.DepartmentRank != null ? String(entra.emsAttributes.DepartmentRank) : '');
    // Employment Type (from native Entra field)
    const currentEmploymentType = readString(current.profileRow, 'EmploymentType');
    addChange(changes, 'employmentType', 'Employment Type', currentEmploymentType, entra.user.employeeType);
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
      // 1. Update ContactInfo — only set fields where Entra has a value
      const ciSets: string[] = [];
      const ciParams: unknown[] = [];
      let ciIdx = 0;
      const addCi = (col: string, val: unknown) => {
        if (val !== null && val !== undefined && val !== '') {
          ciSets.push(`${col} = @${ciIdx}`);
          ciParams.push(val);
          ciIdx++;
        }
      };
      addCi('FirstName', trimTo(entra.user.givenName, 100));
      addCi('LastName', trimTo(entra.user.surname, 100));
      addCi('Email', trimTo(entra.user.mail || entra.user.userPrincipalName, 254));
      addCi('CellPhone', trimTo(entra.user.mobilePhone, 30));
      addCi('WorkPhone', trimTo(firstBusinessPhone(entra.user.businessPhones), 30));
      const hasJobTitleColumn = await this.hasColumnInTable(manager, 'ContactInfo', 'JobTitle');
      if (hasJobTitleColumn) {
        addCi('JobTitle', trimTo(entra.user.jobTitle, 150));
      }
      if (ciSets.length > 0) {
        ciParams.push(contact.contactInfoId);
        await manager.query(
          `UPDATE dbo.ContactInfo SET ${ciSets.join(', ')} WHERE ContactInfoID = @${ciIdx}`,
          ciParams,
        );
      }

      // Assign desk phone extension if work phone contains one (e.g. "x226")
      const extFromPhone = parsePhoneExtension(entra.user.businessPhones);
      if (extFromPhone) {
        await this.assignPhoneExtensionFromWorkPhone(manager, contact.contactAssignmentId, extFromPhone);
      }

      // 2. Upsert EmployeeProfile
      if (current.hasEpTable) {
        await this.upsertEmployeeProfile(manager, contact.contactId, entra, current);
      }

      // 3. Upsert Home Address
      if (current.hasEpTable) {
        await this.upsertHomeAddress(manager, contact.contactId, entra, current);
      }

      // 4. Upsert Emergency Contact
      if (current.hasEcTable) {
        await this.upsertEmergencyContact(manager, contact.contactId, entra.emsAttributes, current);
      }

      // 5. Sync Equipment from Entra CSA into EMS equipment tables
      await this.upsertEquipmentFromEntra(manager, contact.contactAssignmentId, entra.emsAttributes, current.equipment);

      // 6. Department
      if (entra.user.department) {
        const deptId = await this.findOrCreateDepartment(manager, entra.user.department);
        await manager.query(
          `UPDATE dbo.ContactAssignment SET DepartmentID = @0 WHERE ContactAssignmentID = @1`,
          [deptId, contact.contactAssignmentId],
        );
      }
    });
  }

  /**
   * Apply only user-selected field changes from Entra into EMS.
   */
  private async applySelectedChanges(
    contact: InternalContact,
    entra: EntraFullProfile,
    current: CurrentProfileData,
    selectedFields: Set<string>,
  ): Promise<void> {
    // Group fields by category
    const personalFields = new Set(['firstName', 'lastName', 'cellPhone', 'workPhone']);
    const profileFields = new Set([
      'supervisor', 'middleName', 'personalEmail', 'birthDate', 'ssn',
      'startDate', 'office', 'workstation', 'workAuthorization', 'workAuthorizationLink', 'accessLevel',
      'ptoAccrualRate', 'employmentAgreement', 'rampAccount', 'rampCreditCard',
      'title', 'departmentRank', 'employmentType',
    ]);
    const addressFields = new Set(['streetAddress', 'city', 'state', 'postalCode', 'country']);
    const emergencyFields = new Set(['emergencyContactName', 'emergencyContactPhone', 'emergencyContactEmail']);
    const equipmentFields = new Set(['deskPhoneMac', 'deskPhoneBrand', 'pcServiceTag', 'pcWindowsName']);

    const hasPersonal = [...selectedFields].some((f) => personalFields.has(f));
    const hasProfile = [...selectedFields].some((f) => profileFields.has(f));
    const hasAddress = [...selectedFields].some((f) => addressFields.has(f));
    const hasEmergency = [...selectedFields].some((f) => emergencyFields.has(f));
    const hasEquipment = [...selectedFields].some((f) => equipmentFields.has(f));
    const hasDepartment = selectedFields.has('department');

    await this.dataSource.transaction(async (manager) => {
      // ContactInfo fields (first name, last name, phones)
      if (hasPersonal) {
        const ciSets: string[] = [];
        const ciParams: unknown[] = [];
        let ciIdx = 0;
        const addCi = (field: string, col: string, val: unknown) => {
          if (selectedFields.has(field) && val !== null && val !== undefined && val !== '') {
            ciSets.push(`${col} = @${ciIdx}`);
            ciParams.push(val);
            ciIdx++;
          }
        };
        addCi('firstName', 'FirstName', trimTo(entra.user.givenName, 100));
        addCi('lastName', 'LastName', trimTo(entra.user.surname, 100));
        addCi('cellPhone', 'CellPhone', trimTo(entra.user.mobilePhone, 30));
        addCi('workPhone', 'WorkPhone', trimTo(firstBusinessPhone(entra.user.businessPhones), 30));
        if (ciSets.length > 0) {
          ciParams.push(contact.contactInfoId);
          await manager.query(
            `UPDATE dbo.ContactInfo SET ${ciSets.join(', ')} WHERE ContactInfoID = @${ciIdx}`,
            ciParams,
          );
        }

        // Assign desk phone extension if work phone contains one (e.g. "x226")
        if (selectedFields.has('workPhone')) {
          const extFromPhone = parsePhoneExtension(entra.user.businessPhones);
          if (extFromPhone) {
            await this.assignPhoneExtensionFromWorkPhone(manager, contact.contactAssignmentId, extFromPhone);
          }
        }
      }

      // EmployeeProfile fields
      if (hasProfile && current.hasEpTable) {
        const epExists = (
          await manager.query(`SELECT 1 AS found FROM dbo.EmployeeProfile WHERE ContactID = @0`, [contact.contactId])
        ).length > 0;

        const sets: string[] = [];
        const params: unknown[] = [];
        let idx = 0;
        const addSet = (field: string, col: string, val: unknown) => {
          if (selectedFields.has(field) && val !== null && val !== undefined && val !== '') {
            sets.push(`${col} = @${idx}`);
            params.push(val);
            idx++;
          }
        };

        const supervisor = entra.emsAttributes.Supervisor ?? entra.manager?.displayName ?? null;
        addSet('supervisor', 'Supervisor', nullableText(supervisor));
        addSet('middleName', 'MiddleName', nullableText(entra.emsAttributes.MiddleName ?? null));
        addSet('personalEmail', 'PersonalEmail', nullableText(entra.emsAttributes.PersonalEmail ?? null));
        if (selectedFields.has('birthDate')) {
          const bd = normalizeDate(entra.emsAttributes.Birthday);
          if (bd) { sets.push(`DateOfBirth = @${idx}`); params.push(bd); idx++; }
        }
        addSet('ssn', 'SSNLast4', nullableText(ssnLast4(entra.emsAttributes.SocialSecurityNumber)));
        if (selectedFields.has('startDate')) {
          const sd = normalizeDate(entra.user.employeeHireDate);
          if (sd) { sets.push(`StartDate = @${idx}`); params.push(sd); idx++; }
        }
        addSet('office', 'Office', nullableText(entra.user.officeLocation ?? null));
        addSet('workstation', 'Workstation', nullableText(entra.emsAttributes.Workstation ?? null));
        addSet('workAuthorization', 'WorkAuthorization', nullableText(entra.emsAttributes.WorkAuthorization ?? null));
        // Work Authorization Link → upsert into dbo.Link, store LinkID
        if (selectedFields.has('workAuthorizationLink') && await this.hasColumnInTable(manager, 'EmployeeProfile', 'WorthAuthorizationLinkId')) {
          const linkUrl = entra.emsAttributes.WorthAuthorizationLink?.trim() || null;
          const newLinkId = await this.upsertWorkAuthLink(manager, linkUrl, readNumber(current.profileRow, 'WorthAuthorizationLinkId'));
          if (newLinkId !== undefined) { sets.push(`WorthAuthorizationLinkId = @${idx}`); params.push(newLinkId); idx++; }
        }
        addSet('accessLevel', 'AccessLevel', nullableText(entra.emsAttributes.EMSAccessLevel ?? null));
        addSet('ptoAccrualRate', 'PTOAccrualRate', nullableText(entra.emsAttributes.PTOAccrual ?? null));
        addSet('employmentAgreement', 'EmploymentAgreement', nullableText(boolToYesNo(entra.emsAttributes.EmploymentAgreement) || null));
        addSet('rampAccount', 'RampAccount', nullableText(boolToYesNo(entra.emsAttributes.RampAccount) || null));
        addSet('rampCreditCard', 'RampCreditCard', nullableText(entra.emsAttributes.RampCard ?? null));
        addSet('title', 'JobTitle', nullableText(entra.user.jobTitle ?? null));
        addSet('departmentRank', 'DepartmentRank', nullableText(
          entra.emsAttributes.DepartmentRank != null ? String(entra.emsAttributes.DepartmentRank) : null,
        ));
        addSet('employmentType', 'EmploymentType', nullableText(entra.user.employeeType || null));

        if (sets.length > 0 && epExists) {
          sets.push(`modified_by = @${idx}`);
          params.push('Entra sync (selective)');
          idx++;
          sets.push('modified_at = SYSUTCDATETIME()');
          params.push(contact.contactId);
          await manager.query(
            `UPDATE dbo.EmployeeProfile SET ${sets.join(', ')} WHERE ContactID = @${idx}`,
            params,
          );
        } else if (sets.length > 0 && !epExists) {
          // No EmployeeProfile row yet — insert one with the synced fields
          const colMap: Record<string, unknown> = {};
          const addCol = (field: string, col: string, val: unknown) => {
            if (selectedFields.has(field) && val !== null && val !== undefined && val !== '') {
              colMap[col] = val;
            }
          };
          addCol('supervisor', 'Supervisor', nullableText(entra.emsAttributes.Supervisor ?? entra.manager?.displayName ?? null));
          addCol('middleName', 'MiddleName', nullableText(entra.emsAttributes.MiddleName ?? null));
          addCol('personalEmail', 'PersonalEmail', nullableText(entra.emsAttributes.PersonalEmail ?? null));
          if (selectedFields.has('birthDate')) {
            const bd = normalizeDate(entra.emsAttributes.Birthday);
            if (bd) colMap['DateOfBirth'] = bd;
          }
          addCol('ssn', 'SSNLast4', nullableText(ssnLast4(entra.emsAttributes.SocialSecurityNumber)));
          if (selectedFields.has('startDate')) {
            const sd = normalizeDate(entra.user.employeeHireDate);
            if (sd) colMap['StartDate'] = sd;
          }
          addCol('office', 'Office', nullableText(entra.user.officeLocation ?? null));
          addCol('workstation', 'Workstation', nullableText(entra.emsAttributes.Workstation ?? null));
          addCol('workAuthorization', 'WorkAuthorization', nullableText(entra.emsAttributes.WorkAuthorization ?? null));
          // Work Authorization Link → upsert into dbo.Link, store LinkID
          if (selectedFields.has('workAuthorizationLink') && await this.hasColumnInTable(manager, 'EmployeeProfile', 'WorthAuthorizationLinkId')) {
            const linkUrl = entra.emsAttributes.WorthAuthorizationLink?.trim() || null;
            const newLinkId = await this.upsertWorkAuthLink(manager, linkUrl, null);
            if (newLinkId != null) colMap['WorthAuthorizationLinkId'] = newLinkId;
          }
          addCol('accessLevel', 'AccessLevel', nullableText(entra.emsAttributes.EMSAccessLevel ?? null));
          addCol('ptoAccrualRate', 'PTOAccrualRate', nullableText(entra.emsAttributes.PTOAccrual ?? null));
          addCol('employmentAgreement', 'EmploymentAgreement', nullableText(boolToYesNo(entra.emsAttributes.EmploymentAgreement) || null));
          addCol('rampAccount', 'RampAccount', nullableText(boolToYesNo(entra.emsAttributes.RampAccount) || null));
          addCol('rampCreditCard', 'RampCreditCard', nullableText(entra.emsAttributes.RampCard ?? null));
          addCol('title', 'JobTitle', nullableText(entra.user.jobTitle ?? null));
          addCol('departmentRank', 'DepartmentRank', nullableText(
            entra.emsAttributes.DepartmentRank != null ? String(entra.emsAttributes.DepartmentRank) : null,
          ));

          const insertCols = ['ContactID', ...Object.keys(colMap), 'created_by', 'modified_by'];
          const queryParams: unknown[] = [contact.contactId, ...Object.values(colMap), 'Entra sync (selective)', 'Entra sync (selective)'];
          const placeholders = queryParams.map((_, i) => `@${i}`).join(', ');
          await manager.query(
            `INSERT INTO dbo.EmployeeProfile (${insertCols.join(', ')}, created_at, modified_at) VALUES (${placeholders}, SYSUTCDATETIME(), SYSUTCDATETIME())`,
            queryParams,
          );
        }
      }

      // Home Address
      if (hasAddress && current.hasEpTable) {
        await this.upsertHomeAddress(manager, contact.contactId, entra, current);
      }

      // Emergency Contact
      if (hasEmergency && current.hasEcTable) {
        await this.upsertEmergencyContact(manager, contact.contactId, entra.emsAttributes, current);
      }

      // Equipment
      if (hasEquipment) {
        await this.upsertEquipmentFromEntra(manager, contact.contactAssignmentId, entra.emsAttributes, current.equipment);
      }

      // Department
      if (hasDepartment && entra.user.department) {
        const deptId = await this.findOrCreateDepartment(manager, entra.user.department);
        await manager.query(
          `UPDATE dbo.ContactAssignment SET DepartmentID = @0 WHERE ContactAssignmentID = @1`,
          [deptId, contact.contactAssignmentId],
        );
      }
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
    const workAuthLink = entra.emsAttributes.WorthAuthorizationLink ?? null;
    const ptoAccrualRate = entra.emsAttributes.PTOAccrual ?? null;
    const employmentAgreement = boolToYesNo(entra.emsAttributes.EmploymentAgreement) || null;
    const rampAccount = boolToYesNo(entra.emsAttributes.RampAccount) || null;
    const rampCreditCard = entra.emsAttributes.RampCard ?? null;
    const accessLevel = entra.emsAttributes.EMSAccessLevel ?? null;
    const departmentRank = entra.emsAttributes.DepartmentRank != null ? String(entra.emsAttributes.DepartmentRank) : null;
    const employmentType = entra.user.employeeType || null;
    const hasOfficeCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'Office');
    const hasMiddleNameCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'MiddleName');
    const hasAccessLevelCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'AccessLevel');
    const hasJobTitleCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'JobTitle');
    const hasDeptRankCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'DepartmentRank');
    const hasWalCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'WorthAuthorizationLinkId');
    const jobTitle = entra.user.jobTitle ?? null;

    if (epExists) {
      // Only update fields where Entra has a value — don't overwrite WMS-managed data with null
      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 0;
      const addSet = (col: string, val: unknown) => {
        if (val !== null && val !== undefined && val !== '') {
          sets.push(`${col} = @${idx}`);
          params.push(val);
          idx++;
        }
      };
      addSet('Supervisor', nullableText(supervisor));
      addSet('PersonalEmail', nullableText(personalEmail));
      if (birthDate) { addSet('DateOfBirth', birthDate); }
      addSet('SSNLast4', nullableText(ssn));
      if (startDate) { addSet('StartDate', startDate); }
      if (hasOfficeCol) addSet('Office', nullableText(office));
      if (hasMiddleNameCol) addSet('MiddleName', nullableText(middleName));
      if (hasAccessLevelCol) addSet('AccessLevel', nullableText(accessLevel));
      addSet('Workstation', nullableText(workstation));
      addSet('WorkAuthorization', nullableText(workAuth));
      // Work Authorization Link → upsert into dbo.Link
      if (hasWalCol) {
        const existingLinkId = readNumber(current.profileRow, 'WorthAuthorizationLinkId');
        const newLinkId = await this.upsertWorkAuthLink(manager, workAuthLink, existingLinkId);
        if (newLinkId !== undefined) { sets.push(`WorthAuthorizationLinkId = @${idx}`); params.push(newLinkId); idx++; }
      }
      addSet('PTOAccrualRate', nullableText(ptoAccrualRate));
      addSet('EmploymentAgreement', nullableText(employmentAgreement));
      addSet('RampAccount', nullableText(rampAccount));
      addSet('RampCreditCard', nullableText(rampCreditCard));
      if (hasJobTitleCol) addSet('JobTitle', nullableText(jobTitle));
      if (hasDeptRankCol) addSet('DepartmentRank', nullableText(departmentRank));
      addSet('EmploymentType', nullableText(employmentType));

      if (sets.length > 0) {
        sets.push(`modified_by = @${idx}`);
        params.push('Entra profile sync');
        idx++;
        sets.push('modified_at = SYSUTCDATETIME()');
        params.push(contactId);
        await manager.query(
          `UPDATE dbo.EmployeeProfile SET ${sets.join(', ')} WHERE ContactID = @${idx}`,
          params,
        );
      }
    } else {
      const insertCols = [
        'ContactID', 'Supervisor', 'PersonalEmail', 'DateOfBirth', 'SSNLast4',
        'StartDate', ...(hasOfficeCol ? ['Office'] : []), ...(hasMiddleNameCol ? ['MiddleName'] : []),
        ...(hasAccessLevelCol ? ['AccessLevel'] : []), ...(hasJobTitleCol ? ['JobTitle'] : []),
        ...(hasDeptRankCol ? ['DepartmentRank'] : []),
        'Workstation', 'WorkAuthorization', ...(hasWalCol ? ['WorthAuthorizationLinkId'] : []),
        'PTOAccrualRate', 'EmploymentAgreement', 'RampAccount', 'RampCreditCard',
        'EmploymentType',
        'created_by', 'created_at', 'modified_by', 'modified_at',
      ];
      const insertLinkId = hasWalCol ? await this.upsertWorkAuthLink(manager, workAuthLink, null) : null;
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
        ...(hasJobTitleCol ? [nullableText(jobTitle)] : []),
        ...(hasDeptRankCol ? [nullableText(departmentRank)] : []),
        nullableText(workstation),
        nullableText(workAuth),
        ...(hasWalCol ? [insertLinkId] : []),
        nullableText(ptoAccrualRate),
        nullableText(employmentAgreement),
        nullableText(rampAccount),
        nullableText(rampCreditCard),
        nullableText(employmentType),
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
    manager: EntityManager,
    contactId: number,
    entra: EntraFullProfile,
    current: CurrentProfileData,
  ): Promise<void> {
    const street = entra.user.streetAddress?.trim() || '';
    const city = entra.user.city?.trim() || '';
    const state = entra.user.state?.trim() || '';
    const postalCode = entra.user.postalCode?.trim() || '';
    const country = entra.user.country?.trim() || '';

    if (!street && !city && !state && !postalCode && !country) return;

    // Look for an existing address row that matches all fields
    const matchRows = await manager.query(
      `SELECT TOP 1 AddressID FROM dbo.Address
       WHERE COALESCE(AddressLine1, '') = @0
         AND COALESCE(City, '') = @1
         AND COALESCE(StateProvince, '') = @2
         AND COALESCE(PostalCode, '') = @3
         AND COALESCE(Country, '') = @4`,
      [street, city, state, postalCode, country],
    );
    let addressId = readNumber(matchRows?.[0], 'AddressID');

    if (!addressId) {
      const result = await manager.query(
        `INSERT INTO dbo.Address (AddressLine1, City, StateProvince, PostalCode, Country)
         OUTPUT INSERTED.AddressID VALUES (@0, @1, @2, @3, @4)`,
        [street, city, state, postalCode, country],
      );
      addressId = readNumber(result?.[0], 'AddressID');
    }

    if (addressId) {
      const existingAddrId = readNumber(current.profileRow, 'HomeAddressID');
      if (existingAddrId !== addressId) {
        await manager.query(
          `UPDATE dbo.EmployeeProfile SET HomeAddressID = @0 WHERE ContactID = @1`,
          [addressId, contactId],
        );
      }
    }
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
      // Only update fields where Entra has a value
      const ecSets: string[] = [];
      const ecParams: unknown[] = [];
      let ecIdx = 0;
      if (fullName) { ecSets.push(`FullName = @${ecIdx}`); ecParams.push(fullName); ecIdx++; }
      if (phone) { ecSets.push(`PhoneNumber = @${ecIdx}`); ecParams.push(phone); ecIdx++; }
      if (email) { ecSets.push(`Email = @${ecIdx}`); ecParams.push(email); ecIdx++; }
      if (ecSets.length > 0) {
        ecSets.push(`UpdatedBy = @${ecIdx}`); ecParams.push('Entra profile sync'); ecIdx++;
        ecSets.push('UpdatedAt = SYSUTCDATETIME()');
        ecParams.push(existingEcId);
        await manager.query(
          `UPDATE dbo.EmergencyContact SET ${ecSets.join(', ')} WHERE EmergencyContactID = @${ecIdx}`,
          ecParams,
        );
      }
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

    const needed = ['EmployeePhoneExtension', 'PhoneExtension', 'PhoneExtensionDevice', 'EquipmentPhone', 'EmployeeComputer', 'EquipmentComputer'];
    for (const table of needed) {
      if (!(await this.hasColumnExists(manager, table))) return;
    }

    // ── Desk Phone ── (DeskPhoneMAC format: "00:15:65:A8:63:F2 - Yealink")
    const phoneMac = parseMacAddress(attrs.DeskPhoneMAC);
    const phoneBrand = parseMacBrand(attrs.DeskPhoneMAC);

    if (phoneMac) {
      const phoneChanged =
        phoneMac !== currentEquipment.deskPhoneMac ||
        phoneBrand !== currentEquipment.deskPhoneBrand;

      if (phoneChanged) {
        const phoneId = await this.findOrCreateEquipmentPhone(manager, phoneMac, phoneBrand);

        const existingPhone = await manager.query(
          `SELECT TOP 1 epe.ExtensionID, ped.PhoneID
           FROM dbo.EmployeePhoneExtension epe
           LEFT JOIN dbo.PhoneExtensionDevice ped ON ped.ExtensionID = epe.ExtensionID AND ped.IsCurrent = 1
           WHERE epe.ContactAssignmentID = @0 AND epe.IsCurrent = 1`,
          [contactAssignmentId],
        );

        if (existingPhone.length > 0) {
          const currentPhoneId = readNumber(existingPhone[0], 'PhoneID');
          const extensionId = readNumber(existingPhone[0], 'ExtensionID');
          if (extensionId && currentPhoneId !== phoneId) {
            // Check if this phone is already actively assigned anywhere
            const phoneInUse = await manager.query(
              `SELECT TOP 1 epe.ContactAssignmentID,
                      ci.FirstName + ' ' + ci.LastName AS AssignedTo
               FROM dbo.PhoneExtensionDevice ped
               LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ExtensionID = ped.ExtensionID AND epe.IsCurrent = 1
               LEFT JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = epe.ContactAssignmentID
               LEFT JOIN dbo.Contact c ON c.ContactID = ca.ContactID
               LEFT JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
               WHERE ped.PhoneID = @0 AND ped.IsCurrent = 1`,
              [phoneId],
            );
            if (phoneInUse.length > 0) {
              const ownerCaId = readNumber(phoneInUse[0], 'ContactAssignmentID');
              if (ownerCaId && ownerCaId !== contactAssignmentId) {
                const assignedTo = readString(phoneInUse[0], 'AssignedTo');
                throw new BadRequestException(
                  `This desk phone is currently assigned to ${assignedTo || 'another employee'}. Unassign it first before reassigning.`,
                );
              }
              // Same employee or orphaned — deactivate the stale row
              await manager.query(
                `UPDATE dbo.PhoneExtensionDevice SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE PhoneID = @0 AND IsCurrent = 1`,
                [phoneId],
              );
            }
            // Swap device on existing extension
            await manager.query(
              `UPDATE dbo.PhoneExtensionDevice SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE ExtensionID = @0 AND IsCurrent = 1`,
              [extensionId],
            );
            await manager.query(
              `INSERT INTO dbo.PhoneExtensionDevice (ExtensionID, PhoneID, AssignedDate, IsCurrent, AssignedBy) VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
              [extensionId, phoneId, 'Entra sync'],
            );
          }
        } else {
          // No phone assignment — create full chain
          // Deactivate any stale assignments first
          await manager.query(
            `UPDATE dbo.EmployeePhoneExtension SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE ContactAssignmentID = @0 AND IsCurrent = 1`,
            [contactAssignmentId],
          );
          // Find or create a blank extension row (unique constraint on ExtensionNumber)
          let extRows = await manager.query(
            `SELECT TOP 1 ExtensionID FROM dbo.PhoneExtension WHERE ExtensionNumber = '' AND IsActive = 1`,
          );
          if (!extRows?.length) {
            extRows = await manager.query(
              `INSERT INTO dbo.PhoneExtension (ExtensionNumber, IsActive) OUTPUT INSERTED.ExtensionID VALUES ('', 1)`,
            );
          }
          const extensionId = readNumber(extRows[0], 'ExtensionID');
          if (extensionId) {
            // Check if this phone is already actively assigned anywhere
            const phoneInUse = await manager.query(
              `SELECT TOP 1 epe.ContactAssignmentID,
                      ci.FirstName + ' ' + ci.LastName AS AssignedTo
               FROM dbo.PhoneExtensionDevice ped
               LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ExtensionID = ped.ExtensionID AND epe.IsCurrent = 1
               LEFT JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = epe.ContactAssignmentID
               LEFT JOIN dbo.Contact c ON c.ContactID = ca.ContactID
               LEFT JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
               WHERE ped.PhoneID = @0 AND ped.IsCurrent = 1`,
              [phoneId],
            );
            if (phoneInUse.length > 0) {
              const ownerCaId = readNumber(phoneInUse[0], 'ContactAssignmentID');
              if (ownerCaId && ownerCaId !== contactAssignmentId) {
                const assignedTo = readString(phoneInUse[0], 'AssignedTo');
                throw new BadRequestException(
                  `This desk phone is currently assigned to ${assignedTo || 'another employee'}. Unassign it first before reassigning.`,
                );
              }
              // Same employee or orphaned — deactivate the stale row
              await manager.query(
                `UPDATE dbo.PhoneExtensionDevice SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE PhoneID = @0 AND IsCurrent = 1`,
                [phoneId],
              );
            }
            await manager.query(
              `INSERT INTO dbo.PhoneExtensionDevice (ExtensionID, PhoneID, AssignedDate, IsCurrent, AssignedBy) VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
              [extensionId, phoneId, 'Entra sync'],
            );
            await manager.query(
              `INSERT INTO dbo.EmployeePhoneExtension (ContactAssignmentID, ExtensionID, AssignedDate, IsCurrent, AssignedBy) VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
              [contactAssignmentId, extensionId, 'Entra sync'],
            );
          }
        }
      }
    }

    // ── Computer ── (PCServiceTag format: "BFKMW54 - Zach-PC")
    const pcServiceTag = parseServiceTag(attrs.PCServiceTag);
    const pcWindowsName = parseServiceTagName(attrs.PCServiceTag);

    if (pcServiceTag) {
      const pcChanged =
        pcServiceTag !== currentEquipment.pcServiceTag ||
        pcWindowsName !== currentEquipment.pcWindowsName;

      if (pcChanged) {
        const computerId = await this.findOrCreateEquipmentComputer(manager, pcServiceTag, pcWindowsName);

        const existingPc = await manager.query(
          `SELECT TOP 1 ec.ComputerID FROM dbo.EmployeeComputer ec WHERE ec.ContactAssignmentID = @0 AND ec.IsCurrent = 1`,
          [contactAssignmentId],
        );
        const currentComputerId = existingPc.length > 0 ? readNumber(existingPc[0], 'ComputerID') : null;

        if (currentComputerId === computerId) {
          // Same computer — just update its fields
          await manager.query(
            `UPDATE dbo.EquipmentComputer SET PCName = @0 WHERE ComputerID = @1`,
            [nullableText(pcWindowsName), computerId],
          );
        } else {
          // Deactivate any existing assignment for this employee and for this computer
          await manager.query(
            `UPDATE dbo.EmployeeComputer SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE ContactAssignmentID = @0 AND IsCurrent = 1`,
            [contactAssignmentId],
          );
          await manager.query(
            `UPDATE dbo.EmployeeComputer SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE ComputerID = @0 AND IsCurrent = 1`,
            [computerId],
          );
          await manager.query(
            `INSERT INTO dbo.EmployeeComputer (ContactAssignmentID, ComputerID, AssignedDate, IsCurrent, AssignedBy) VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
            [contactAssignmentId, computerId, 'Entra sync'],
          );
        }
      }
    }
  }

  private async findOrCreateEquipmentPhone(
    manager: EntityManager,
    mac: string,
    brand: string,
  ): Promise<number> {
    const existing = await manager.query(
      `SELECT TOP 1 PhoneID FROM dbo.EquipmentPhone WHERE MACAddress = @0`,
      [mac],
    );
    if (existing.length > 0) {
      const phoneId = readNumber(existing[0], 'PhoneID');
      if (phoneId) {
        await manager.query(
          `UPDATE dbo.EquipmentPhone SET Make = @0 WHERE PhoneID = @1`,
          [brand || null, phoneId],
        );
        return phoneId;
      }
    }
    const rows = await manager.query(
      `INSERT INTO dbo.EquipmentPhone (MACAddress, Make, EquipmentStatus) OUTPUT INSERTED.PhoneID VALUES (@0, @1, 'Active')`,
      [mac, brand || null],
    );
    return readNumber(rows[0], 'PhoneID')!;
  }

  private async findOrCreateEquipmentComputer(
    manager: EntityManager,
    serviceTag: string,
    pcName: string,
  ): Promise<number> {
    const existing = await manager.query(
      `SELECT TOP 1 ComputerID FROM dbo.EquipmentComputer WHERE AssetID = @0`,
      [serviceTag],
    );
    if (existing.length > 0) {
      const computerId = readNumber(existing[0], 'ComputerID');
      if (computerId) {
        await manager.query(
          `UPDATE dbo.EquipmentComputer SET PCName = @0 WHERE ComputerID = @1`,
          [pcName || null, computerId],
        );
        return computerId;
      }
    }
    const rows = await manager.query(
      `INSERT INTO dbo.EquipmentComputer (AssetID, PCName, EquipmentStatus) OUTPUT INSERTED.ComputerID VALUES (@0, @1, 'Active')`,
      [serviceTag, pcName || null],
    );
    return readNumber(rows[0], 'ComputerID')!;
  }

  /** Find or create a phone extension by number, then assign it to the employee. */
  private async assignPhoneExtensionFromWorkPhone(
    manager: EntityManager,
    contactAssignmentId: number,
    extensionNumber: string,
  ): Promise<void> {
    if (!extensionNumber || !contactAssignmentId) return;
    if (!(await this.hasColumnExists(manager, 'PhoneExtension'))) return;
    if (!(await this.hasColumnExists(manager, 'EmployeePhoneExtension'))) return;

    // Find existing extension by number
    const extRows = await manager.query(
      `SELECT TOP 1 ExtensionID FROM dbo.PhoneExtension WHERE ExtensionNumber = @0 AND IsActive = 1`,
      [extensionNumber],
    );
    let extensionId = readNumber(extRows?.[0], 'ExtensionID');

    if (!extensionId) {
      const insertRows = await manager.query(
        `INSERT INTO dbo.PhoneExtension (ExtensionNumber, IsActive) OUTPUT INSERTED.ExtensionID VALUES (@0, 1)`,
        [extensionNumber],
      );
      extensionId = readNumber(insertRows?.[0], 'ExtensionID');
    }
    if (!extensionId) return;

    // Check if already assigned to this employee
    const current = await manager.query(
      `SELECT TOP 1 ExtensionID FROM dbo.EmployeePhoneExtension WHERE ContactAssignmentID = @0 AND IsCurrent = 1`,
      [contactAssignmentId],
    );
    const currentExtId = readNumber(current?.[0], 'ExtensionID');
    if (currentExtId === extensionId) return;

    // Deactivate old assignment for this employee
    await manager.query(
      `UPDATE dbo.EmployeePhoneExtension SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE ContactAssignmentID = @0 AND IsCurrent = 1`,
      [contactAssignmentId],
    );
    // Deactivate any other active assignment on this extension
    await manager.query(
      `UPDATE dbo.EmployeePhoneExtension SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date) WHERE ExtensionID = @0 AND IsCurrent = 1`,
      [extensionId],
    );
    // Assign
    await manager.query(
      `INSERT INTO dbo.EmployeePhoneExtension (ContactAssignmentID, ExtensionID, AssignedDate, IsCurrent, AssignedBy) VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
      [contactAssignmentId, extensionId, 'Entra sync'],
    );
    // Update ContactInfo.WorkPhoneExtension
    await manager.query(
      `UPDATE ci SET ci.WorkPhoneExtension = @0
       FROM dbo.ContactInfo ci
       INNER JOIN dbo.Contact c ON c.ContactInfoID = ci.ContactInfoID
       INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
       WHERE ca.ContactAssignmentID = @1`,
      [extensionNumber, contactAssignmentId],
    );
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
   * Selectively sync only the chosen fields from Entra into EMS for a single user.
   */
  async syncSelectedFieldsFromEntra(
    userEmail: string,
    selectedFields: string[],
    graphAccessToken?: string,
  ): Promise<{ synced: boolean; changes: EntraProfileSyncFieldChange[] }> {
    if (!selectedFields.length) return { synced: false, changes: [] };
    const token = await this.getGraphToken(graphAccessToken);
    const internalContacts = await this.loadInternalContacts();
    const normalized = userEmail.trim().toLowerCase();
    const contact = internalContacts.find((c) => c.email.toLowerCase() === normalized);
    if (!contact) return { synced: false, changes: [] };

    const entraProfile = await this.fetchEntraFullProfile(token, contact.email);
    if (!entraProfile) return { synced: false, changes: [] };

    const currentProfile = await this.loadCurrentProfileData(contact.contactId, contact.contactAssignmentId);
    const allChanges = this.computeChanges(entraProfile, currentProfile, contact);
    const allowedSet = new Set(selectedFields);
    const filteredChanges = allChanges.filter((c) => allowedSet.has(c.field));
    if (filteredChanges.length === 0) return { synced: true, changes: [] };

    await this.applySelectedChanges(contact, entraProfile, currentProfile, allowedSet);
    return { synced: true, changes: filteredChanges };
  }

  /**
   * Preview changes from Entra for a single user without applying them.
   */
  async previewSingleUserFromEntra(
    userEmail: string,
    graphAccessToken?: string,
  ): Promise<{ changes: EntraProfileSyncFieldChange[] }> {
    const token = await this.getGraphToken(graphAccessToken);
    const internalContacts = await this.loadInternalContacts();
    const normalized = userEmail.trim().toLowerCase();
    const contact = internalContacts.find((c) => c.email.toLowerCase() === normalized);
    if (!contact) {
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
   * Compute changes from EMS → Entra direction (WMS-editable fields only).
   */
  private computeEmsToEntraChanges(
    entra: EntraFullProfile,
    current: CurrentProfileData,
    contact: InternalContact,
  ): EntraProfileSyncFieldChange[] {
    const changes: EntraProfileSyncFieldChange[] = [];

    // Native Graph properties
    addChange(changes, 'mobilePhone', 'Mobile Phone', entra.user.mobilePhone, contact.cellPhone);
    addChange(changes, 'businessPhones', 'Work Phone', firstBusinessPhone(entra.user.businessPhones), contact.workPhone);

    // Home Address
    const emsStreetLine1 = readString(current.homeAddress, 'AddressLine1');
    const emsStreetLine2 = readString(current.homeAddress, 'AddressLine2');
    const emsStreet = [emsStreetLine1, emsStreetLine2].filter(Boolean).join(', ');
    addChange(changes, 'streetAddress', 'Home Address (Street)', entra.user.streetAddress, emsStreet);
    addChange(changes, 'city', 'Home Address (City)', entra.user.city, readString(current.homeAddress, 'City'));
    addChange(changes, 'state', 'Home Address (State)', entra.user.state, readString(current.homeAddress, 'StateProvince'));
    addChange(changes, 'postalCode', 'Home Address (Postal Code)', entra.user.postalCode, readString(current.homeAddress, 'PostalCode'));
    addChange(changes, 'country', 'Home Address (Country)', entra.user.country, readString(current.homeAddress, 'Country'));

    // Emergency Contact
    const emsEcFullName = readString(current.emergencyContact, 'FullName');
    const emsEcNameParts = emsEcFullName.split(/\s+/);
    const emsEcFirstName = emsEcNameParts[0] || '';
    const emsEcLastName = emsEcNameParts.slice(1).join(' ') || '';
    addChange(changes, 'EmergencyContactFirstName', 'Emergency Contact First Name', entra.emsAttributes.EmergencyContactFirstName ?? '', emsEcFirstName);
    addChange(changes, 'EmergencyContactLastName', 'Emergency Contact Last Name', entra.emsAttributes.EmergencyContactLastName ?? '', emsEcLastName);
    addChange(changes, 'EmergencyContactEmail', 'Emergency Contact Email', entra.emsAttributes.EmergencyContactEmail ?? '', readString(current.emergencyContact, 'Email'));
    addChange(changes, 'EmergencyContactCell', 'Emergency Contact Cell Phone', entra.emsAttributes.EmergencyContactCell ?? '', readString(current.emergencyContact, 'PhoneNumber'));

    // Work Authorization Photos
    addChange(changes, 'WorthAuthorizationLink', 'Work Authorization Photos', entra.emsAttributes.WorthAuthorizationLink ?? '', current.workAuthLinkUrl);

    // Workstation
    addChange(changes, 'Workstation', 'Work Station', entra.emsAttributes.Workstation ?? '', readString(current.profileRow, 'Workstation'));

    // Equipment CSAs (composite format: "MAC - Brand Model" / "ServiceTag - PCName")
    const emsPhoneMacComposite = composeDeskPhoneMAC(current.equipment);
    addChange(changes, 'DeskPhoneMAC', 'Desk Phone MAC Address', entra.emsAttributes.DeskPhoneMAC ?? '', emsPhoneMacComposite);
    const emsPcTagComposite = composePCServiceTag(current.equipment);
    addChange(changes, 'PCServiceTag', 'PC Service Tag', entra.emsAttributes.PCServiceTag ?? '', emsPcTagComposite);

    return changes;
  }

  /**
   * Push EMS profile data to Entra (native Graph properties + Custom Security Attributes).
   * Only pushes WMS-editable fields.
   */
  private async pushEmsToEntra(
    accessToken: string,
    contact: InternalContact,
    entra: EntraFullProfile,
    current: CurrentProfileData,
  ): Promise<void> {
    // Use Entra object ID for the PATCH — email lookup fails for guest/filtered users
    const userId = entra.user.id || encodeURIComponent(contact.email);

    // 1. Build native Graph user properties payload (WMS-editable fields only)
    const nativePayload: Record<string, unknown> = {};

    // Mobile Phone
    if ((contact.cellPhone || '') !== (entra.user.mobilePhone ?? '')) {
      nativePayload.mobilePhone = nullableText(trimTo(contact.cellPhone, 30));
    }
    // Work Phone
    if (contact.workPhone !== firstBusinessPhone(entra.user.businessPhones)) {
      nativePayload.businessPhones = contact.workPhone
        ? [trimTo(contact.workPhone, 30)]
        : [];
    }
    // Home Address (combine AddressLine1 + AddressLine2 for streetAddress)
    const emsLine1 = readString(current.homeAddress, 'AddressLine1');
    const emsLine2 = readString(current.homeAddress, 'AddressLine2');
    const emsStreet = [emsLine1, emsLine2].filter(Boolean).join(', ');
    if (emsStreet !== (entra.user.streetAddress ?? '')) nativePayload.streetAddress = emsStreet || null;
    const emsCity = readString(current.homeAddress, 'City');
    if (emsCity !== (entra.user.city ?? '')) nativePayload.city = emsCity || null;
    const emsState = readString(current.homeAddress, 'StateProvince');
    if (emsState !== (entra.user.state ?? '')) nativePayload.state = emsState || null;
    const emsPostalCode = readString(current.homeAddress, 'PostalCode');
    if (emsPostalCode !== (entra.user.postalCode ?? '')) nativePayload.postalCode = emsPostalCode || null;
    const emsCountry = readString(current.homeAddress, 'Country');
    if (emsCountry !== (entra.user.country ?? '')) nativePayload.country = emsCountry || null;

    // 2. Build Custom Security Attributes payload (WMS-editable fields only)
    const csaPayload: Record<string, string | boolean | null> = {};

    // Emergency contacts
    const emsEcFullName = readString(current.emergencyContact, 'FullName');
    const emsEcParts = emsEcFullName.split(/\s+/);
    const emsEcFirst = emsEcParts[0] || '';
    const emsEcLast = emsEcParts.slice(1).join(' ') || '';
    if (emsEcFirst !== (entra.emsAttributes.EmergencyContactFirstName ?? '')) csaPayload.EmergencyContactFirstName = emsEcFirst || null;
    if (emsEcLast !== (entra.emsAttributes.EmergencyContactLastName ?? '')) csaPayload.EmergencyContactLastName = emsEcLast || null;
    const emsEcEmail = readString(current.emergencyContact, 'Email');
    if (emsEcEmail !== (entra.emsAttributes.EmergencyContactEmail ?? '')) csaPayload.EmergencyContactEmail = emsEcEmail || null;
    const emsEcPhone = readString(current.emergencyContact, 'PhoneNumber');
    if (emsEcPhone !== (entra.emsAttributes.EmergencyContactCell ?? '')) csaPayload.EmergencyContactCell = emsEcPhone || null;

    // Work Authorization Photos (link)
    if (current.workAuthLinkUrl !== (entra.emsAttributes.WorthAuthorizationLink ?? '')) {
      csaPayload.WorthAuthorizationLink = current.workAuthLinkUrl || null;
    }
    // Workstation
    const emsWorkstation = readString(current.profileRow, 'Workstation');
    if (emsWorkstation !== (entra.emsAttributes.Workstation ?? '')) csaPayload.Workstation = emsWorkstation || null;

    // Equipment CSAs (composite format: "MAC - Brand Model" / "ServiceTag - PCName")
    const { deskPhoneMac, deskPhoneBrand, deskPhoneModel, pcServiceTag, pcWindowsName } = current.equipment;
    const phoneMacComposite = composeDeskPhoneMAC(current.equipment);
    if (phoneMacComposite !== (entra.emsAttributes.DeskPhoneMAC ?? '')) csaPayload.DeskPhoneMAC = phoneMacComposite || null;
    const pcTagComposite = composePCServiceTag(current.equipment);
    if (pcTagComposite !== (entra.emsAttributes.PCServiceTag ?? '')) csaPayload.PCServiceTag = pcTagComposite || null;

    // 3. PATCH native properties (may fail for guest/external users — non-fatal)
    const nativeKeys = Object.keys(nativePayload);
    if (nativeKeys.length > 0) {
      try {
        await this.graphPatch(accessToken, `${GRAPH_BASE_URL}/users/${userId}`, nativePayload);
      } catch {
        // Guest users can't have native properties written — continue with CSAs
      }
    }

    // 4. PATCH CSA attributes separately (works for both members and guests)
    if (Object.keys(csaPayload).length > 0) {
      await this.graphPatch(accessToken, `${GRAPH_BASE_URL}/users/${userId}`, {
        customSecurityAttributes: {
          [EMS_ATTRIBUTE_SET]: {
            '@odata.type': `#Microsoft.DirectoryServices.CustomSecurityAttributeValue`,
            ...csaPayload,
          },
        },
      });
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

  /** Upsert a URL into dbo.Link, returning the LinkID. Returns null to clear, undefined to skip. */
  private async upsertWorkAuthLink(
    executor: Pick<DataSource | EntityManager, 'query'>,
    url: string | null,
    existingLinkId: number | null | undefined,
  ): Promise<number | null | undefined> {
    if (!url) return existingLinkId ? null : undefined; // clear if had value, skip if already empty
    const trimmed = url.trim();
    if (!trimmed) return existingLinkId ? null : undefined;

    if (existingLinkId) {
      await executor.query(
        `UPDATE dbo.Link SET LinkURL = @0, LinkPath = @1 WHERE LinkID = @2`,
        [trimmed, trimmed.slice(0, 1024), existingLinkId],
      );
      return existingLinkId;
    }
    // Check if link with same URL exists
    const existing = await executor.query(`SELECT TOP 1 LinkID FROM dbo.Link WHERE LinkURL = @0`, [trimmed]);
    if ((existing as Record<string, unknown>[])?.length > 0) {
      return (existing[0] as Record<string, unknown>).LinkID as number;
    }
    // Create new link
    const result = await executor.query(
      `INSERT INTO dbo.Link (LinkType, LinkURL, LinkName, LinkPath) OUTPUT INSERTED.LinkID VALUES (N'URL', @0, N'Work Authorization Photos', @1)`,
      [trimmed, trimmed.slice(0, 1024)],
    );
    return (result as Record<string, unknown>[])?.[0]?.LinkID as number;
  }

  private async findOrCreateDepartment(
    executor: Pick<DataSource | EntityManager, 'query'>,
    name: string,
  ): Promise<number> {
    const trimmed = name.trim();
    const rows = await executor.query(
      `SELECT TOP 1 DepartmentID AS departmentId FROM dbo.Department WHERE LOWER(LTRIM(RTRIM(DepartmentName))) = LOWER(@0)`,
      [trimmed],
    );
    if ((rows as Record<string, unknown>[])?.length > 0) {
      return (rows[0] as Record<string, unknown>).departmentId as number;
    }
    const insertResult = await executor.query(
      `INSERT INTO dbo.Department (DepartmentName) OUTPUT INSERTED.DepartmentID AS departmentId VALUES (@0)`,
      [trimmed],
    );
    return (insertResult[0] as Record<string, unknown>).departmentId as number;
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
  department: string;
};

type CurrentProfileData = {
  hasEpTable: boolean;
  hasEcTable: boolean;
  profileRow: Record<string, unknown> | undefined;
  homeAddress: Record<string, unknown> | undefined;
  emergencyContact: Record<string, unknown> | undefined;
  equipment: EquipmentData;
  workAuthLinkUrl: string;
};

type EquipmentData = {
  deskPhoneNumber: string;
  deskPhoneExtension: string;
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

function parsePhoneExtension(phones: string[]): string {
  const raw = (phones[0] ?? '').trim();
  const match = raw.match(/(?:x|ext\.?|extension)\s*(\d+)\s*$/i);
  return match ? match[1] : '';
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

/** Compose "MAC - Brand Model" for the DeskPhoneMAC CSA */
function composeDeskPhoneMAC(eq: EquipmentData): string {
  if (!eq.deskPhoneMac) return '';
  const suffix = [eq.deskPhoneBrand, eq.deskPhoneModel].filter(Boolean).join(' ');
  return suffix ? `${eq.deskPhoneMac} - ${suffix}` : eq.deskPhoneMac;
}

/** Compose "ServiceTag - PCName" for the PCServiceTag CSA */
function composePCServiceTag(eq: EquipmentData): string {
  if (!eq.pcServiceTag) return '';
  return eq.pcWindowsName ? `${eq.pcServiceTag} - ${eq.pcWindowsName}` : eq.pcServiceTag;
}

function normalizeDate(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  // ISO: YYYY-MM-DD
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoMatch) return isoMatch[1];
  // MM/DD/YYYY (slash separator — US format, used by Entra)
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // DD-MM-YYYY (dash separator — EU format)
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmed);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
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
