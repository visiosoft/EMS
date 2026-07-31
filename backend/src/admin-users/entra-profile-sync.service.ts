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
  PersonalEmail?: string | null;
  BirthDate?: string | null;
  SSN?: string | null;
  HomeStreet?: string | null;
  HomeAddress2?: string | null;
  HomeCity?: string | null;
  HomeState?: string | null;
  HomePostalCode?: string | null;
  HomeCountry?: string | null;
  EmergencyContactName?: string | null;
  EmergencyContactPhone?: string | null;
  EmergencyContactEmail?: string | null;
  WorkAuthorization?: string | null;
  Office?: string | null;
  Workstation?: string | null;
  PTOAccrualRate?: string | null;
  EmploymentAgreement?: string | null;
  RampAccount?: string | null;
  RampCreditCard?: string | null;
  DeskPhoneMACAddress?: string | null;
  DeskPhoneBrand?: string | null;
  DeskPhoneModel?: string | null;
  PCBrand?: string | null;
  PCModel?: string | null;
  PCServiceTag?: string | null;
  BluetoothStatus?: string | null;
  PCWindowsName?: string | null;
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

    // 1. Fetch native user properties + custom security attributes
    const userUrl = `${GRAPH_BASE_URL}/users/${encodedEmail}?$select=id,displayName,givenName,surname,mail,userPrincipalName,mobilePhone,businessPhones,department,jobTitle,officeLocation,companyName,accountEnabled,employeeHireDate,customSecurityAttributes`;
    const userData = await this.graphGet<Record<string, unknown>>(
      accessToken,
      userUrl,
    );
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
    const emsAttributes: EMSCustomAttributes = {
      PersonalEmail: optStr(emsAttrs.PersonalEmail),
      BirthDate: optStr(emsAttrs.BirthDate),
      SSN: optStr(emsAttrs.SSN),
      HomeStreet: optStr(emsAttrs.HomeStreet),
      HomeAddress2: optStr(emsAttrs.HomeAddress2),
      HomeCity: optStr(emsAttrs.HomeCity),
      HomeState: optStr(emsAttrs.HomeState),
      HomePostalCode: optStr(emsAttrs.HomePostalCode),
      HomeCountry: optStr(emsAttrs.HomeCountry),
      EmergencyContactName: optStr(emsAttrs.EmergencyContactName),
      EmergencyContactPhone: optStr(emsAttrs.EmergencyContactPhone),
      EmergencyContactEmail: optStr(emsAttrs.EmergencyContactEmail),
      WorkAuthorization: optStr(emsAttrs.WorkAuthorization),
      Office: optStr(emsAttrs.Office),
      Workstation: optStr(emsAttrs.Workstation),
      PTOAccrualRate: optStr(emsAttrs.PTOAccrualRate),
      EmploymentAgreement: optStr(emsAttrs.EmploymentAgreement),
      RampAccount: optStr(emsAttrs.RampAccount),
      RampCreditCard: optStr(emsAttrs.RampCreditCard),
      DeskPhoneMACAddress: optStr(emsAttrs.DeskPhoneMACAddress),
      DeskPhoneBrand: optStr(emsAttrs.DeskPhoneBrand),
      DeskPhoneModel: optStr(emsAttrs.DeskPhoneModel),
      PCBrand: optStr(emsAttrs.PCBrand),
      PCModel: optStr(emsAttrs.PCModel),
      PCServiceTag: optStr(emsAttrs.PCServiceTag),
      BluetoothStatus: optStr(emsAttrs.BluetoothStatus),
      PCWindowsName: optStr(emsAttrs.PCWindowsName),
    };

    // 3. Fetch manager (supervisor)
    let manager: EntraFullProfile['manager'] = null;
    try {
      const managerData = await this.graphGet<Record<string, unknown>>(
        accessToken,
        `${GRAPH_BASE_URL}/users/${encodedEmail}/manager?$select=displayName,mail,userPrincipalName`,
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
    // Supervisor (Manager)
    const currentSupervisor = readString(current.profileRow, 'Supervisor');
    const entraSupervisor = entra.manager?.displayName ?? '';
    addChange(changes, 'supervisor', 'Supervisor', currentSupervisor, entraSupervisor);
    // Personal Email
    const currentPersonalEmail = readString(current.profileRow, 'PersonalEmail');
    addChange(changes, 'personalEmail', 'Personal Email', currentPersonalEmail, entra.emsAttributes.PersonalEmail ?? '');
    // Birth Date
    const currentBirthDate = readDateString(current.profileRow, 'DateOfBirth') ?? '';
    addChange(changes, 'birthDate', 'Birth Date', currentBirthDate, normalizeDate(entra.emsAttributes.BirthDate));
    // SSN
    const currentSsn = readString(current.profileRow, 'SSNLast4');
    const entraSsn = ssnLast4(entra.emsAttributes.SSN);
    addChange(changes, 'ssn', 'Social Security Number', currentSsn, entraSsn);
    // Home Address
    const currentStreet = readString(current.homeAddress, 'AddressLine1');
    const currentAddress2 = readString(current.homeAddress, 'AddressLine2');
    const currentCity = readString(current.homeAddress, 'City');
    const currentState = readString(current.homeAddress, 'StateProvince');
    const currentPostalCode = readString(current.homeAddress, 'PostalCode');
    const currentCountry = readString(current.homeAddress, 'Country');
    addChange(changes, 'homeStreet', 'Home Street', currentStreet, entra.emsAttributes.HomeStreet ?? '');
    addChange(changes, 'homeAddress2', 'Home Address 2', currentAddress2, entra.emsAttributes.HomeAddress2 ?? '');
    addChange(changes, 'homeCity', 'Home City', currentCity, entra.emsAttributes.HomeCity ?? '');
    addChange(changes, 'homeState', 'Home State', currentState, entra.emsAttributes.HomeState ?? '');
    addChange(changes, 'homePostalCode', 'Home Postal Code', currentPostalCode, entra.emsAttributes.HomePostalCode ?? '');
    addChange(changes, 'homeCountry', 'Home Country', currentCountry, entra.emsAttributes.HomeCountry ?? '');
    // Emergency Contact
    const currentEcName = readString(current.emergencyContact, 'FullName');
    const currentEcPhone = readString(current.emergencyContact, 'PhoneNumber');
    const currentEcEmail = readString(current.emergencyContact, 'Email');
    addChange(changes, 'emergencyContactName', 'Emergency Contact Name', currentEcName, entra.emsAttributes.EmergencyContactName ?? '');
    addChange(changes, 'emergencyContactPhone', 'Emergency Contact Phone', currentEcPhone, entra.emsAttributes.EmergencyContactPhone ?? '');
    addChange(changes, 'emergencyContactEmail', 'Emergency Contact Email', currentEcEmail, entra.emsAttributes.EmergencyContactEmail ?? '');
    // Title (Job Title)
    const currentTitle = readString(current.profileRow, 'JobTitle');
    addChange(changes, 'title', 'Title', currentTitle, entra.user.jobTitle);
    // Office
    const currentOffice = readString(current.profileRow, 'Office');
    addChange(changes, 'office', 'Office', currentOffice, entra.emsAttributes.Office ?? entra.user.officeLocation);
    // Workstation
    const currentWorkstation = readString(current.profileRow, 'Workstation');
    addChange(changes, 'workstation', 'Workstation', currentWorkstation, entra.emsAttributes.Workstation ?? '');
    // Work Authorization
    const currentWorkAuth = readString(current.profileRow, 'WorkAuthorization');
    addChange(changes, 'workAuthorization', 'Work Authorization', currentWorkAuth, entra.emsAttributes.WorkAuthorization ?? '');
    // Department — synced via contact sync, but we track it for change visibility
    // Role — managed via contact sync
    // Company — always "iAE"
    // Start Date at IAE
    const currentStartDate = readDateString(current.profileRow, 'StartDate') ?? '';
    const entraStartDate = normalizeDate(entra.user.employeeHireDate) || normalizeDate(entra.emsAttributes.BirthDate ? null : null);
    addChange(changes, 'startDate', 'Start Date at IAE', currentStartDate, entraStartDate);
    // PTO Accrual Rate
    const currentPto = readString(current.profileRow, 'PTOAccrualRate');
    addChange(changes, 'ptoAccrualRate', 'PTO Accrual Rate', currentPto, entra.emsAttributes.PTOAccrualRate ?? '');
    // Employment Agreement
    const currentEmpAgreement = readString(current.profileRow, 'EmploymentAgreement');
    addChange(changes, 'employmentAgreement', 'Employment Agreement', currentEmpAgreement, entra.emsAttributes.EmploymentAgreement ?? '');
    // Ramp Account
    const currentRampAccount = readString(current.profileRow, 'RampAccount');
    addChange(changes, 'rampAccount', 'Ramp Account', currentRampAccount, entra.emsAttributes.RampAccount ?? '');
    // Ramp Credit Card
    const currentRampCard = readString(current.profileRow, 'RampCreditCard');
    addChange(changes, 'rampCreditCard', 'Ramp Credit Card', currentRampCard, entra.emsAttributes.RampCreditCard ?? '');
    // Equipment — Desk Phone
    addChange(changes, 'deskPhoneMac', 'Desk Phone MAC Address', current.equipment.deskPhoneMac, entra.emsAttributes.DeskPhoneMACAddress ?? '');
    addChange(changes, 'deskPhoneBrand', 'Desk Phone Brand', current.equipment.deskPhoneBrand, entra.emsAttributes.DeskPhoneBrand ?? '');
    addChange(changes, 'deskPhoneModel', 'Desk Phone Model', current.equipment.deskPhoneModel, entra.emsAttributes.DeskPhoneModel ?? '');
    // Equipment — PC
    addChange(changes, 'pcBrand', 'PC Brand', current.equipment.pcBrand, entra.emsAttributes.PCBrand ?? '');
    addChange(changes, 'pcModel', 'PC Model', current.equipment.pcModel, entra.emsAttributes.PCModel ?? '');
    addChange(changes, 'pcServiceTag', 'PC Service Tag', current.equipment.pcServiceTag, entra.emsAttributes.PCServiceTag ?? '');
    addChange(changes, 'bluetoothStatus', 'Bluetooth Status', current.equipment.bluetoothStatus, entra.emsAttributes.BluetoothStatus ?? '');
    addChange(changes, 'pcWindowsName', 'PC Windows Name', current.equipment.pcWindowsName, entra.emsAttributes.PCWindowsName ?? '');

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

    const supervisor = entra.manager?.displayName ?? null;
    const personalEmail = entra.emsAttributes.PersonalEmail ?? null;
    const birthDate = normalizeDate(entra.emsAttributes.BirthDate);
    const ssn = ssnLast4(entra.emsAttributes.SSN);
    const startDate = normalizeDate(entra.user.employeeHireDate);
    const office = entra.emsAttributes.Office ?? entra.user.officeLocation ?? null;
    const workstation = entra.emsAttributes.Workstation ?? null;
    const workAuth = entra.emsAttributes.WorkAuthorization ?? null;
    const ptoAccrualRate = entra.emsAttributes.PTOAccrualRate ?? null;
    const employmentAgreement = entra.emsAttributes.EmploymentAgreement ?? null;
    const rampAccount = entra.emsAttributes.RampAccount ?? null;
    const rampCreditCard = entra.emsAttributes.RampCreditCard ?? null;
    const hasOfficeCol = await this.hasColumnInTable(manager, 'EmployeeProfile', 'Office');

    if (epExists) {
      const officeSetClause = hasOfficeCol ? 'Office = @5,' : '';
      const params = [
        nullableText(supervisor),
        nullableText(personalEmail),
        birthDate || null,
        nullableText(ssn),
        startDate || null,
        ...(hasOfficeCol ? [nullableText(office)] : []),
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
        'StartDate', ...(hasOfficeCol ? ['Office'] : []), 'Workstation', 'WorkAuthorization',
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
    manager: EntityManager,
    contactId: number,
    attrs: EMSCustomAttributes,
    current: CurrentProfileData,
  ): Promise<void> {
    const street = attrs.HomeStreet?.trim() ?? '';
    const address2 = attrs.HomeAddress2?.trim() ?? '';
    const city = attrs.HomeCity?.trim() ?? '';
    const state = attrs.HomeState?.trim() ?? '';
    const postalCode = attrs.HomePostalCode?.trim() ?? '';
    const country = attrs.HomeCountry?.trim() ?? '';

    const hasAny = street || city || state || postalCode || country;
    if (!hasAny) return;

    const existingAddressId = readNumber(current.profileRow, 'HomeAddressID');

    if (existingAddressId) {
      await manager.query(
        `UPDATE dbo.Address SET AddressLine1 = @0, AddressLine2 = @1, City = @2, StateProvince = @3, PostalCode = @4, Country = @5 WHERE AddressID = @6`,
        [street, address2 || null, city, state, postalCode, country, existingAddressId],
      );
    } else {
      const addrRows = await manager.query(
        `
        INSERT INTO dbo.Address (AddressLine1, AddressLine2, City, StateProvince, PostalCode, Country)
        OUTPUT INSERTED.AddressID AS addressId
        VALUES (@0, @1, @2, @3, @4, @5)
        `,
        [street, address2 || null, city, state, postalCode, country],
      );
      const newAddressId = readNumber(addrRows[0], 'addressId', 'AddressID');
      if (newAddressId) {
        await manager.query(
          `UPDATE dbo.EmployeeProfile SET HomeAddressID = @0 WHERE ContactID = @1`,
          [newAddressId, contactId],
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
    const name = attrs.EmergencyContactName?.trim() ?? '';
    const phone = attrs.EmergencyContactPhone?.trim() ?? '';
    const email = attrs.EmergencyContactEmail?.trim() ?? '';

    if (!name && !phone && !email) return;

    const existingEcId = readNumber(current.emergencyContact, 'EmergencyContactID');

    if (existingEcId) {
      await manager.query(
        `
        UPDATE dbo.EmergencyContact
        SET FullName = @0, PhoneNumber = @1, Email = @2, UpdatedBy = @3, UpdatedAt = SYSUTCDATETIME()
        WHERE EmergencyContactID = @4
        `,
        [name, nullableText(phone), nullableText(email), 'Entra profile sync', existingEcId],
      );
    } else {
      await manager.query(
        `
        INSERT INTO dbo.EmergencyContact
          (ContactID, FullName, PhoneNumber, Email, IsPrimary, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
        VALUES (@0, @1, @2, @3, 1, @4, SYSUTCDATETIME(), @4, SYSUTCDATETIME())
        `,
        [contactId, name, nullableText(phone), nullableText(email), 'Entra profile sync'],
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

    // ── Desk Phone ──
    const phoneMac = attrs.DeskPhoneMACAddress?.trim() ?? '';
    const phoneBrand = attrs.DeskPhoneBrand?.trim() ?? '';
    const phoneModel = attrs.DeskPhoneModel?.trim() ?? '';
    const hasPhoneData = phoneMac || phoneBrand || phoneModel;
    const phoneChanged =
      phoneMac !== currentEquipment.deskPhoneMac ||
      phoneBrand !== currentEquipment.deskPhoneBrand ||
      phoneModel !== currentEquipment.deskPhoneModel;

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
            `UPDATE dbo.EquipmentPhone SET MACAddress = @0, Make = @1, Model = @2 WHERE PhoneID = @3`,
            [nullableText(phoneMac), nullableText(phoneBrand), nullableText(phoneModel), phoneId],
          );
        }
      }
      // If no existing phone assignment, skip (requires admin to create the device first)
    }

    // ── Computer ──
    const pcBrand = attrs.PCBrand?.trim() ?? '';
    const pcModel = attrs.PCModel?.trim() ?? '';
    const pcServiceTag = attrs.PCServiceTag?.trim() ?? '';
    const bluetoothStatus = attrs.BluetoothStatus?.trim() ?? '';
    const pcWindowsName = attrs.PCWindowsName?.trim() ?? '';
    const hasPcData = pcBrand || pcModel || pcServiceTag || pcWindowsName;
    const pcChanged =
      pcBrand !== currentEquipment.pcBrand ||
      pcModel !== currentEquipment.pcModel ||
      pcServiceTag !== currentEquipment.pcServiceTag ||
      bluetoothStatus !== currentEquipment.bluetoothStatus ||
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
            `UPDATE dbo.EquipmentComputer SET Make = @0, Model = @1, AssetID = @2, BluetoothStatus = @3, PCName = @4 WHERE ComputerID = @5`,
            [nullableText(pcBrand), nullableText(pcModel), nullableText(pcServiceTag), nullableText(bluetoothStatus), nullableText(pcWindowsName), computerId],
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
    csaPayload: Record<string, string | null>,
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
    addChange(changes, 'Supervisor', 'Supervisor', entra.manager?.displayName ?? '', emsSupervisor);
    const emsPersonalEmail = readString(current.profileRow, 'PersonalEmail');
    addChange(changes, 'PersonalEmail', 'Personal Email', entra.emsAttributes.PersonalEmail ?? '', emsPersonalEmail);
    const emsBirthDate = readDateString(current.profileRow, 'DateOfBirth') ?? '';
    addChange(changes, 'BirthDate', 'Birth Date', normalizeDate(entra.emsAttributes.BirthDate), emsBirthDate);
    const emsSsn = readString(current.profileRow, 'SSNLast4');
    addChange(changes, 'SSN', 'Social Security Number', ssnLast4(entra.emsAttributes.SSN), emsSsn);
    // Home Address
    const emsStreet = readString(current.homeAddress, 'AddressLine1');
    const emsAddress2 = readString(current.homeAddress, 'AddressLine2');
    const emsCity = readString(current.homeAddress, 'City');
    const emsState = readString(current.homeAddress, 'StateProvince');
    const emsPostalCode = readString(current.homeAddress, 'PostalCode');
    const emsCountry = readString(current.homeAddress, 'Country');
    addChange(changes, 'HomeStreet', 'Home Street', entra.emsAttributes.HomeStreet ?? '', emsStreet);
    addChange(changes, 'HomeAddress2', 'Home Address 2', entra.emsAttributes.HomeAddress2 ?? '', emsAddress2);
    addChange(changes, 'HomeCity', 'Home City', entra.emsAttributes.HomeCity ?? '', emsCity);
    addChange(changes, 'HomeState', 'Home State', entra.emsAttributes.HomeState ?? '', emsState);
    addChange(changes, 'HomePostalCode', 'Home Postal Code', entra.emsAttributes.HomePostalCode ?? '', emsPostalCode);
    addChange(changes, 'HomeCountry', 'Home Country', entra.emsAttributes.HomeCountry ?? '', emsCountry);
    // Emergency Contact
    const emsEcName = readString(current.emergencyContact, 'FullName');
    const emsEcPhone = readString(current.emergencyContact, 'PhoneNumber');
    const emsEcEmail = readString(current.emergencyContact, 'Email');
    addChange(changes, 'EmergencyContactName', 'Emergency Contact Name', entra.emsAttributes.EmergencyContactName ?? '', emsEcName);
    addChange(changes, 'EmergencyContactPhone', 'Emergency Contact Phone', entra.emsAttributes.EmergencyContactPhone ?? '', emsEcPhone);
    addChange(changes, 'EmergencyContactEmail', 'Emergency Contact Email', entra.emsAttributes.EmergencyContactEmail ?? '', emsEcEmail);
    // Employment fields
    const emsWorkAuth = readString(current.profileRow, 'WorkAuthorization');
    addChange(changes, 'WorkAuthorization', 'Work Authorization', entra.emsAttributes.WorkAuthorization ?? '', emsWorkAuth);
    const emsWorkstation = readString(current.profileRow, 'Workstation');
    addChange(changes, 'Workstation', 'Workstation', entra.emsAttributes.Workstation ?? '', emsWorkstation);
    const emsPto = readString(current.profileRow, 'PTOAccrualRate');
    addChange(changes, 'PTOAccrualRate', 'PTO Accrual Rate', entra.emsAttributes.PTOAccrualRate ?? '', emsPto);
    const emsEmpAgreement = readString(current.profileRow, 'EmploymentAgreement');
    addChange(changes, 'EmploymentAgreement', 'Employment Agreement', entra.emsAttributes.EmploymentAgreement ?? '', emsEmpAgreement);
    const emsRampAccount = readString(current.profileRow, 'RampAccount');
    addChange(changes, 'RampAccount', 'Ramp Account', entra.emsAttributes.RampAccount ?? '', emsRampAccount);
    const emsRampCard = readString(current.profileRow, 'RampCreditCard');
    addChange(changes, 'RampCreditCard', 'Ramp Credit Card', entra.emsAttributes.RampCreditCard ?? '', emsRampCard);
    // Equipment
    addChange(changes, 'DeskPhoneMACAddress', 'Desk Phone MAC Address', entra.emsAttributes.DeskPhoneMACAddress ?? '', current.equipment.deskPhoneMac);
    addChange(changes, 'DeskPhoneBrand', 'Desk Phone Brand', entra.emsAttributes.DeskPhoneBrand ?? '', current.equipment.deskPhoneBrand);
    addChange(changes, 'DeskPhoneModel', 'Desk Phone Model', entra.emsAttributes.DeskPhoneModel ?? '', current.equipment.deskPhoneModel);
    addChange(changes, 'PCBrand', 'PC Brand', entra.emsAttributes.PCBrand ?? '', current.equipment.pcBrand);
    addChange(changes, 'PCModel', 'PC Model', entra.emsAttributes.PCModel ?? '', current.equipment.pcModel);
    addChange(changes, 'PCServiceTag', 'PC Service Tag', entra.emsAttributes.PCServiceTag ?? '', current.equipment.pcServiceTag);
    addChange(changes, 'BluetoothStatus', 'Bluetooth Status', entra.emsAttributes.BluetoothStatus ?? '', current.equipment.bluetoothStatus);
    addChange(changes, 'PCWindowsName', 'PC Windows Name', entra.emsAttributes.PCWindowsName ?? '', current.equipment.pcWindowsName);

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
    const csaPayload: Record<string, string | null> = {};

    const emsPersonalEmail = readString(current.profileRow, 'PersonalEmail');
    if (emsPersonalEmail && emsPersonalEmail !== (entra.emsAttributes.PersonalEmail ?? '')) {
      csaPayload.PersonalEmail = emsPersonalEmail;
    }
    const emsBirthDate = readDateString(current.profileRow, 'DateOfBirth') ?? '';
    if (emsBirthDate && emsBirthDate !== normalizeDate(entra.emsAttributes.BirthDate)) {
      csaPayload.BirthDate = emsBirthDate;
    }
    const emsSsn = readString(current.profileRow, 'SSNLast4');
    if (emsSsn && emsSsn !== ssnLast4(entra.emsAttributes.SSN)) {
      csaPayload.SSN = emsSsn;
    }
    // Home address
    const emsStreet = readString(current.homeAddress, 'AddressLine1');
    if (emsStreet && emsStreet !== (entra.emsAttributes.HomeStreet ?? '')) csaPayload.HomeStreet = emsStreet;
    const emsAddress2 = readString(current.homeAddress, 'AddressLine2');
    if (emsAddress2 !== (entra.emsAttributes.HomeAddress2 ?? '')) csaPayload.HomeAddress2 = emsAddress2 || null;
    const emsCity = readString(current.homeAddress, 'City');
    if (emsCity && emsCity !== (entra.emsAttributes.HomeCity ?? '')) csaPayload.HomeCity = emsCity;
    const emsState = readString(current.homeAddress, 'StateProvince');
    if (emsState && emsState !== (entra.emsAttributes.HomeState ?? '')) csaPayload.HomeState = emsState;
    const emsPostalCode = readString(current.homeAddress, 'PostalCode');
    if (emsPostalCode && emsPostalCode !== (entra.emsAttributes.HomePostalCode ?? '')) csaPayload.HomePostalCode = emsPostalCode;
    const emsCountry = readString(current.homeAddress, 'Country');
    if (emsCountry && emsCountry !== (entra.emsAttributes.HomeCountry ?? '')) csaPayload.HomeCountry = emsCountry;
    // Emergency contacts
    const emsEcName = readString(current.emergencyContact, 'FullName');
    if (emsEcName && emsEcName !== (entra.emsAttributes.EmergencyContactName ?? '')) csaPayload.EmergencyContactName = emsEcName;
    const emsEcPhone = readString(current.emergencyContact, 'PhoneNumber');
    if (emsEcPhone !== (entra.emsAttributes.EmergencyContactPhone ?? '')) csaPayload.EmergencyContactPhone = emsEcPhone || null;
    const emsEcEmail = readString(current.emergencyContact, 'Email');
    if (emsEcEmail !== (entra.emsAttributes.EmergencyContactEmail ?? '')) csaPayload.EmergencyContactEmail = emsEcEmail || null;
    // Employment fields
    const emsWorkAuth = readString(current.profileRow, 'WorkAuthorization');
    if (emsWorkAuth && emsWorkAuth !== (entra.emsAttributes.WorkAuthorization ?? '')) csaPayload.WorkAuthorization = emsWorkAuth;
    const emsWorkstation = readString(current.profileRow, 'Workstation');
    if (emsWorkstation && emsWorkstation !== (entra.emsAttributes.Workstation ?? '')) csaPayload.Workstation = emsWorkstation;
    const emsPto = readString(current.profileRow, 'PTOAccrualRate');
    if (emsPto && emsPto !== (entra.emsAttributes.PTOAccrualRate ?? '')) csaPayload.PTOAccrualRate = emsPto;
    const emsEmpAgreement = readString(current.profileRow, 'EmploymentAgreement');
    if (emsEmpAgreement && emsEmpAgreement !== (entra.emsAttributes.EmploymentAgreement ?? '')) csaPayload.EmploymentAgreement = emsEmpAgreement;
    const emsRampAccount = readString(current.profileRow, 'RampAccount');
    if (emsRampAccount && emsRampAccount !== (entra.emsAttributes.RampAccount ?? '')) csaPayload.RampAccount = emsRampAccount;
    const emsRampCard = readString(current.profileRow, 'RampCreditCard');
    if (emsRampCard && emsRampCard !== (entra.emsAttributes.RampCreditCard ?? '')) csaPayload.RampCreditCard = emsRampCard;
    // Equipment
    if (current.equipment.deskPhoneMac && current.equipment.deskPhoneMac !== (entra.emsAttributes.DeskPhoneMACAddress ?? '')) csaPayload.DeskPhoneMACAddress = current.equipment.deskPhoneMac;
    if (current.equipment.deskPhoneBrand && current.equipment.deskPhoneBrand !== (entra.emsAttributes.DeskPhoneBrand ?? '')) csaPayload.DeskPhoneBrand = current.equipment.deskPhoneBrand;
    if (current.equipment.deskPhoneModel && current.equipment.deskPhoneModel !== (entra.emsAttributes.DeskPhoneModel ?? '')) csaPayload.DeskPhoneModel = current.equipment.deskPhoneModel;
    if (current.equipment.pcBrand && current.equipment.pcBrand !== (entra.emsAttributes.PCBrand ?? '')) csaPayload.PCBrand = current.equipment.pcBrand;
    if (current.equipment.pcModel && current.equipment.pcModel !== (entra.emsAttributes.PCModel ?? '')) csaPayload.PCModel = current.equipment.pcModel;
    if (current.equipment.pcServiceTag && current.equipment.pcServiceTag !== (entra.emsAttributes.PCServiceTag ?? '')) csaPayload.PCServiceTag = current.equipment.pcServiceTag;
    if (current.equipment.bluetoothStatus && current.equipment.bluetoothStatus !== (entra.emsAttributes.BluetoothStatus ?? '')) csaPayload.BluetoothStatus = current.equipment.bluetoothStatus;
    if (current.equipment.pcWindowsName && current.equipment.pcWindowsName !== (entra.emsAttributes.PCWindowsName ?? '')) csaPayload.PCWindowsName = current.equipment.pcWindowsName;

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

function normalizeDate(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  // Try to parse as ISO date
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoMatch) return isoMatch[1];
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
