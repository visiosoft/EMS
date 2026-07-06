import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { AdminUsersService } from './admin-users.service';
import {
  EmployeeExperienceService,
  type EmployeeExperienceResponse,
} from './employee-experience.service';
import {
  EmployeeHealthInsuranceService,
  type EmployeeHealthInsuranceResponse,
} from './employee-health-insurance.service';

/**
 * Aggregate self-service profile for the signed-in internal employee. Resolves the user
 * purely from the EMS database by their signed-in email (no live Microsoft Entra call), the
 * same way the Company Hub widgets identify the user. Every section is optional so the
 * endpoint degrades gracefully when a table or record is missing.
 */

type ProfileAddress = {
  line1: string;
  line2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
};

type EmergencyContactEntry = {
  fullName: string;
  relationship: string;
  phoneNumber: string;
  email: string;
  isPrimary: boolean;
};

export type MyFullProfileResponse =
  | { linked: false }
  | {
      linked: true;
      identity: {
        contactId: number;
        contactInfoId: number;
        contactAssignmentId: number;
      };
      basics: {
        firstName: string;
        middleName: string;
        lastName: string;
        email: string;
        personalEmail: string;
        cellPhone: string;
        workPhone: string;
        department: string;
        role: string;
        company: string;
      };
      personal: {
        dateOfBirth: string | null;
        age: number | null;
        gender: string;
        maritalStatus: string;
        ethnicity: string;
        ssnLast4: string;
      };
      homeAddress: ProfileAddress | null;
      emergencyContacts: EmergencyContactEntry[];
      employment: {
        title: string;
        office: string;
        accessLevel: string;
        workAuthorization: string;
        startDate: string | null;
        yearsOfService: string;
        hireDate: string | null;
        terminationDate: string | null;
        employmentStatus: string;
        employmentType: string;
        payType: string;
        payRate: string;
        supervisor: string;
        ptoAccrualRate: string;
        employmentAgreement: string;
        rampAccount: string;
        rampCreditCard: string;
        workstation: string;
      };
      officeAddress: ProfileAddress | null;
      equipment: {
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
      entra: {
        microsoftOfficeLicenses: string[];
        microsoftGroups: string[];
      };
      healthInsurance: EmployeeHealthInsuranceResponse | null;
      experience: EmployeeExperienceResponse | null;
    };

/** Company main desk line — static per spec ("Administrator Entered and static as (312) 274-1800"). */
const STATIC_DESK_PHONE_NUMBER = '(312) 274-1800';

@Injectable()
export class SelfProfileService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
    private readonly healthInsuranceService: EmployeeHealthInsuranceService,
    private readonly experienceService: EmployeeExperienceService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  async getMyFullProfile(): Promise<MyFullProfileResponse> {
    const emails = this.signedInEmailCandidates();
    if (emails.length === 0) return { linked: false };

    const base = await this.resolveInternalContact(emails);
    if (!base) return { linked: false };

    const { contactId, contactAssignmentId } = base;
    const hasEmployeeProfile = await this.tableExists('EmployeeProfile');

    const profileRow = hasEmployeeProfile
      ? ((
          await this.dataSource.query(
            `SELECT TOP 1 * FROM dbo.EmployeeProfile WHERE ContactID = @0`,
            [contactId],
          )
        )[0] as Record<string, unknown> | undefined)
      : undefined;

    const homeAddress = await this.loadAddress(
      readNumber(profileRow, 'HomeAddressID'),
    );
    const officeAddress = await this.loadAddress(
      readNumber(profileRow, 'OfficeAddressID'),
    );
    const emergencyContacts = await this.loadEmergencyContacts(contactId);
    const equipment = await this.loadEquipment(contactAssignmentId);

    // Rich sections reuse the exact EMS services (health-insurance formulas, experience SQL).
    // Each is best-effort so a missing table or edge case never fails the whole profile.
    const healthInsurance = await this.safe(() =>
      this.healthInsuranceService.getHealthInsurance(base.email),
    );
    const experience = await this.safe(() =>
      this.experienceService.getExperience(base.email),
    );

    // Entra-sourced fields (Title, Office, Microsoft licenses & groups). Delegated Graph token
    // arrives via the x-entra-graph-access-token header; absent it, these degrade to empty.
    const entraJob = await this.loadEntraJobInfo();
    const microsoftOfficeLicenses =
      (await this.safe(() =>
        this.adminUsersService.getUserLicenses(base.email),
      )) ?? [];
    const microsoftGroups =
      (await this.safe(() => this.adminUsersService.getUserGroups(base.email))) ??
      [];

    const dateOfBirth = readDateString(profileRow, 'DateOfBirth');
    const startDate = readDateString(profileRow, 'StartDate');

    return {
      linked: true,
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
    };
  }

  /** Run a best-effort loader; swallow failures so one bad section can't fail the profile. */
  private async safe<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch {
      return null;
    }
  }

  /** Fetch the signed-in user's Entra job title & office via the delegated Graph `/me` call. */
  private async loadEntraJobInfo(): Promise<{ title: string; office: string }> {
    const token = this.auditContext.getGraphAccessToken();
    if (!token) return { title: '', office: '' };
    try {
      const res = await fetch(
        'https://graph.microsoft.com/v1.0/me?$select=jobTitle,officeLocation',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return { title: '', office: '' };
      const data = (await res.json()) as {
        jobTitle?: string | null;
        officeLocation?: string | null;
      };
      return {
        title: String(data.jobTitle ?? '').trim(),
        office: String(data.officeLocation ?? '').trim(),
      };
    } catch {
      return { title: '', office: '' };
    }
  }

  private signedInEmailCandidates(): string[] {
    return Array.from(
      new Set(
        this.auditContext
          .getUserEmailCandidates()
          .map(normalizeEmail)
          .filter(Boolean),
      ),
    );
  }

  private async resolveInternalContact(emails: string[]): Promise<
    | {
        contactId: number;
        contactInfoId: number;
        contactAssignmentId: number;
        firstName: string;
        lastName: string;
        email: string;
        cellPhone: string;
        workPhone: string;
        department: string;
        role: string;
        company: string;
      }
    | null
  > {
    const placeholders = emails.map((_, index) => `@${index}`).join(', ');
    const rows = await this.dataSource.query(
      `
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
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) IN (${placeholders})
      ORDER BY ca.ContactAssignmentID
      `,
      emails,
    );
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    const contactId = readNumber(r, 'contactId');
    if (contactId == null) return null;
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

  private async loadAddress(
    addressId: number | null,
  ): Promise<ProfileAddress | null> {
    if (!addressId) return null;
    const rows = await this.dataSource.query(
      `SELECT TOP 1 * FROM dbo.Address WHERE AddressID = @0`,
      [addressId],
    );
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    const address: ProfileAddress = {
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

  private async loadEmergencyContacts(
    contactId: number,
  ): Promise<EmergencyContactEntry[]> {
    if (!(await this.tableExists('EmergencyContact'))) return [];
    const rows = (await this.dataSource.query(
      `
      SELECT FullName, Relationship, PhoneNumber, Email, IsPrimary
      FROM dbo.EmergencyContact
      WHERE ContactID = @0
      ORDER BY IsPrimary DESC, EmergencyContactID
      `,
      [contactId],
    )) as Record<string, unknown>[];
    return rows.map((r) => ({
      fullName: readString(r, 'FullName'),
      relationship: readString(r, 'Relationship'),
      phoneNumber: readString(r, 'PhoneNumber'),
      email: readString(r, 'Email'),
      isPrimary: Boolean(r['IsPrimary']),
    }));
  }

  private async loadEquipment(
    contactAssignmentId: number,
  ): Promise<{
    deskPhoneExtension: string;
    deskPhoneMac: string;
    deskPhoneBrand: string;
    deskPhoneModel: string;
    pcBrand: string;
    pcModel: string;
    pcServiceTag: string;
    bluetoothStatus: string;
    pcWindowsName: string;
  }> {
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
    if (!contactAssignmentId) return empty;
    const needed = [
      'EmployeePhoneExtension',
      'PhoneExtension',
      'PhoneExtensionDevice',
      'EquipmentPhone',
      'EmployeeComputer',
      'EquipmentComputer',
    ];
    for (const table of needed) {
      if (!(await this.tableExists(table))) return empty;
    }
    const rows = (await this.dataSource.query(
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
    )) as Record<string, unknown>[];
    const r = rows[0];
    if (!r) return empty;
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

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @0`,
      [tableName],
    );
    return rows.length > 0;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(value: string | null | undefined): string {
  const email = String(value ?? '')
    .trim()
    .toLowerCase();
  return email.includes('@') ? email : '';
}

function readString(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      return String(value).trim().replace(/\s+/g, ' ');
    }
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
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
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
      // SQL `date` columns are calendar-only. The driver hands them back as a local-midnight
      // Date, so format from local parts — `toISOString()` would shift the day in +UTC zones.
      return isNaN(value.getTime()) ? null : formatLocalYmd(value);
    }
    const str = String(value).trim();
    if (!str) continue;
    // Already an ISO-like date string — keep the calendar date verbatim, no TZ math.
    const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(str);
    if (isoMatch) return isoMatch[1];
    const d = new Date(str);
    if (!isNaN(d.getTime())) return formatLocalYmd(d);
  }
  return null;
}

function formatLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole years between a birth date (YYYY-MM-DD) and today. */
function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 150 ? age : null;
}

/** Tenure since start date, rendered as "X years Y months". */
function computeYearsOfService(startDate: string | null): string {
  if (!startDate) return '';
  const start = new Date(`${startDate}T00:00:00`);
  if (isNaN(start.getTime())) return '';
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return '';
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  parts.push(`${remMonths} month${remMonths === 1 ? '' : 's'}`);
  return parts.join(' ');
}
