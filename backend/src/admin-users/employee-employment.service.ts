import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';

// ─── Response / DTO Types ─────────────────────────────────────────────────────

export type WorkstationOption = {
  workLocationId: number;
  locationCode: string;
  officeCode: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
};

export type WorkstationListResponse = {
  offices: {
    officeCode: string;
    workstations: WorkstationOption[];
  }[];
};

export type PhoneExtensionOption = {
  extensionId: number;
  extensionNumber: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
};

export type PhoneExtensionListResponse = {
  extensions: PhoneExtensionOption[];
};

export type PhoneDeviceOption = {
  phoneId: number;
  macAddress: string;
  make: string;
  model: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
};

export type PhoneDeviceListResponse = {
  phones: PhoneDeviceOption[];
};

export type EmployeeEmploymentProfileResponse = {
  contactId: number;
  contactAssignmentId: number;
  /** Admin-entered fields */
  accessLevel: string;
  workAuthorization: string;
  workstation: string;
  startDate: string | null;
  supervisor: string;
  ptoAccrualRate: string;
  employmentAgreement: string;
  rampAccount: string;
  rampCreditCard: string;
  /** Office Address */
  officeAddressId: number | null;
  officeStreet: string;
  officeAddress2: string;
  officeCity: string;
  officeState: string;
  officePostalCode: string;
  officeCountry: string;
  /** Desk Phone & Equipment (read from inventory tables) */
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

export class UpdateEmployeeEmploymentProfileDto {
  accessLevel?: string | null;
  workAuthorization?: string | null;
  workstation?: string | null;
  startDate?: string | null;
  supervisor?: string | null;
  ptoAccrualRate?: string | null;
  employmentAgreement?: string | null;
  rampAccount?: string | null;
  rampCreditCard?: string | null;
  officeStreet?: string | null;
  officeAddress2?: string | null;
  officeCity?: string | null;
  officeState?: string | null;
  officePostalCode?: string | null;
  officeCountry?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EmployeeEmploymentService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
  ) {}

  async getEmploymentProfile(
    userEmail: string,
  ): Promise<EmployeeEmploymentProfileResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }
    return this.loadEmploymentProfile(email);
  }

  async updateEmploymentProfile(
    userEmail: string,
    dto: UpdateEmployeeEmploymentProfileDto,
  ): Promise<EmployeeEmploymentProfileResponse> {
    const email = normalizeEmail(userEmail);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }
    const current = await this.loadEmploymentProfile(email);
    const modifiedBy =
      this.auditContext.getUserEmail() ?? 'employment-profile';

    const hasEpTable = await this.tableExists('EmployeeProfile');
    if (!hasEpTable) {
      throw new BadRequestException(
        'EmployeeProfile table does not exist yet. Run the migration SQL first.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Upsert EmployeeProfile employment columns
      const epExists = await manager.query(
        `SELECT 1 AS found FROM dbo.EmployeeProfile WHERE ContactID = @0`,
        [current.contactId],
      );

      if (epExists.length > 0) {
        await manager.query(
          `
          UPDATE dbo.EmployeeProfile
          SET AccessLevel          = @0,
              WorkAuthorization    = @1,
              StartDate            = @2,
              Supervisor           = @3,
              PTOAccrualRate       = @4,
              EmploymentAgreement  = @5,
              RampAccount          = @6,
              RampCreditCard       = @7,
              Workstation          = @8,
              modified_by          = @9,
              modified_at          = SYSUTCDATETIME()
          WHERE ContactID = @10
          `,
          [
            nullableText(dto.accessLevel),
            nullableText(dto.workAuthorization),
            nullableDate(dto.startDate),
            nullableText(dto.supervisor),
            nullableText(dto.ptoAccrualRate),
            nullableText(dto.employmentAgreement),
            nullableText(dto.rampAccount),
            nullableText(dto.rampCreditCard),
            nullableText(dto.workstation),
            modifiedBy,
            current.contactId,
          ],
        );
      } else {
        await manager.query(
          `
          INSERT INTO dbo.EmployeeProfile
            (ContactID, AccessLevel, WorkAuthorization, StartDate, Supervisor,
             PTOAccrualRate, EmploymentAgreement, RampAccount, RampCreditCard, Workstation,
             created_by, created_at, modified_by, modified_at)
          VALUES
            (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, SYSUTCDATETIME(), @10, SYSUTCDATETIME())
          `,
          [
            current.contactId,
            nullableText(dto.accessLevel),
            nullableText(dto.workAuthorization),
            nullableDate(dto.startDate),
            nullableText(dto.supervisor),
            nullableText(dto.ptoAccrualRate),
            nullableText(dto.employmentAgreement),
            nullableText(dto.rampAccount),
            nullableText(dto.rampCreditCard),
            nullableText(dto.workstation),
            modifiedBy,
          ],
        );
      }

      // 2. Upsert office address
      const hasAddressFields =
        dto.officeStreet != null ||
        dto.officeAddress2 != null ||
        dto.officeCity != null ||
        dto.officeState != null ||
        dto.officePostalCode != null ||
        dto.officeCountry != null;

      if (hasAddressFields) {
        if (current.officeAddressId) {
          await manager.query(
            `
            UPDATE dbo.Address
            SET AddressLine1  = @0,
                AddressLine2  = @1,
                City          = @2,
                StateProvince = @3,
                PostalCode    = @4,
                Country       = @5
            WHERE AddressID = @6
            `,
            [
              cleanText(dto.officeStreet) || current.officeStreet || '',
              nullableText(dto.officeAddress2),
              cleanText(dto.officeCity) || current.officeCity || '',
              cleanText(dto.officeState) || current.officeState || '',
              cleanText(dto.officePostalCode) || current.officePostalCode || '',
              cleanText(dto.officeCountry) || current.officeCountry || '',
              current.officeAddressId,
            ],
          );
        } else {
          const rows = await manager.query(
            `
            INSERT INTO dbo.Address (AddressLine1, AddressLine2, City, StateProvince, PostalCode, Country)
            OUTPUT INSERTED.AddressID AS addressId
            VALUES (@0, @1, @2, @3, @4, @5)
            `,
            [
              cleanText(dto.officeStreet) || '',
              nullableText(dto.officeAddress2),
              cleanText(dto.officeCity) || '',
              cleanText(dto.officeState) || '',
              cleanText(dto.officePostalCode) || '',
              cleanText(dto.officeCountry) || '',
            ],
          );
          const newAddressId = readNumber(rows[0], 'addressId', 'AddressID');
          if (newAddressId) {
            await manager.query(
              `UPDATE dbo.EmployeeProfile SET OfficeAddressID = @0 WHERE ContactID = @1`,
              [newAddressId, current.contactId],
            );
          }
        }
      }
    });

    return this.loadEmploymentProfile(email);
  }

  /** List all active workstations grouped by office, with assignment status. */
  async listWorkstations(
    currentUserEmail?: string,
  ): Promise<WorkstationListResponse> {
    const rows = await this.dataSource.query(
      `
      SELECT
        o.OfficeCode AS officeCode,
        wl.WorkLocationID AS workLocationId,
        wl.LocationCode AS locationCode,
        CASE WHEN ewl.EmployeeWorkLocationID IS NOT NULL THEN 1 ELSE 0 END AS isAssigned,
        ci.Email AS assignedToEmail
      FROM dbo.WorkLocation wl
      INNER JOIN dbo.Office o ON o.OfficeID = wl.OfficeID AND o.IsActive = 1
      LEFT JOIN dbo.EmployeeWorkLocation ewl ON ewl.WorkLocationID = wl.WorkLocationID AND ewl.IsCurrent = 1
      LEFT JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = ewl.ContactAssignmentID
      LEFT JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      LEFT JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      WHERE wl.IsActive = 1
      ORDER BY o.OfficeCode, wl.LocationCode
      `,
    );

    const normalizedCurrentEmail = currentUserEmail
      ? normalizeEmail(currentUserEmail)
      : '';

    // Group by office
    const officeMap = new Map<string, WorkstationOption[]>();
    for (const row of rows as Record<string, unknown>[]) {
      const officeCode = readString(row, 'officeCode');
      const assignedEmail = readString(row, 'assignedToEmail');
      const isAssignedRaw = Number(row['isAssigned'] ?? 0) === 1;
      // If assigned to the current user, treat as available for them
      const isAssigned =
        isAssignedRaw &&
        normalizedCurrentEmail !== '' &&
        assignedEmail.toLowerCase() !== normalizedCurrentEmail
          ? true
          : isAssignedRaw && normalizedCurrentEmail === ''
            ? true
            : isAssignedRaw && assignedEmail.toLowerCase() === normalizedCurrentEmail
              ? false
              : false;

      if (!officeMap.has(officeCode)) officeMap.set(officeCode, []);
      officeMap.get(officeCode)!.push({
        workLocationId: readNumber(row, 'workLocationId') ?? 0,
        locationCode: readString(row, 'locationCode'),
        officeCode,
        isAssigned,
        assignedToEmail: isAssignedRaw ? assignedEmail || null : null,
      });
    }

    return {
      offices: Array.from(officeMap.entries()).map(([officeCode, workstations]) => ({
        officeCode,
        workstations,
      })),
    };
  }

  /** List all active phone extensions with assignment status. */
  async listPhoneExtensions(
    currentUserEmail?: string,
  ): Promise<PhoneExtensionListResponse> {
    const rows = await this.dataSource.query(
      `
      SELECT
        pe.ExtensionID AS extensionId,
        pe.ExtensionNumber AS extensionNumber,
        CASE WHEN epe.EmployeeExtensionID IS NOT NULL THEN 1 ELSE 0 END AS isAssigned,
        ci.Email AS assignedToEmail
      FROM dbo.PhoneExtension pe
      LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ExtensionID = pe.ExtensionID AND epe.IsCurrent = 1
      LEFT JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = epe.ContactAssignmentID
      LEFT JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      LEFT JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      WHERE pe.IsActive = 1
      ORDER BY pe.ExtensionNumber
      `,
    );

    const normalizedCurrent = currentUserEmail
      ? normalizeEmail(currentUserEmail)
      : '';

    const extensions: PhoneExtensionOption[] = (
      rows as Record<string, unknown>[]
    ).map((row) => {
      const assignedEmail = readString(row, 'assignedToEmail');
      const isAssignedRaw = Number(row['isAssigned'] ?? 0) === 1;
      const isAssigned =
        isAssignedRaw &&
        normalizedCurrent !== '' &&
        assignedEmail.toLowerCase() === normalizedCurrent
          ? false
          : isAssignedRaw;

      return {
        extensionId: readNumber(row, 'extensionId') ?? 0,
        extensionNumber: readString(row, 'extensionNumber'),
        isAssigned,
        assignedToEmail: isAssignedRaw ? assignedEmail || null : null,
      };
    });

    return { extensions };
  }

  /** List all active phone devices (by MAC) with assignment status. */
  async listPhoneDevices(
    currentUserEmail?: string,
  ): Promise<PhoneDeviceListResponse> {
    const rows = await this.dataSource.query(
      `
      SELECT
        eqp.PhoneID AS phoneId,
        eqp.MACAddress AS macAddress,
        eqp.Make AS make,
        eqp.Model AS model,
        CASE WHEN ped.ExtensionDeviceID IS NOT NULL THEN 1 ELSE 0 END AS isAssigned,
        ci.Email AS assignedToEmail
      FROM dbo.EquipmentPhone eqp
      LEFT JOIN dbo.PhoneExtensionDevice ped ON ped.PhoneID = eqp.PhoneID AND ped.IsCurrent = 1
      LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ExtensionID = ped.ExtensionID AND epe.IsCurrent = 1
      LEFT JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = epe.ContactAssignmentID
      LEFT JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      LEFT JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      WHERE eqp.EquipmentStatus = 'Active'
      ORDER BY eqp.MACAddress
      `,
    );

    const normalizedCurrent = currentUserEmail
      ? normalizeEmail(currentUserEmail)
      : '';

    const phones: PhoneDeviceOption[] = (
      rows as Record<string, unknown>[]
    ).map((row) => {
      const assignedEmail = readString(row, 'assignedToEmail');
      const isAssignedRaw = Number(row['isAssigned'] ?? 0) === 1;
      const isAssigned =
        isAssignedRaw &&
        normalizedCurrent !== '' &&
        assignedEmail.toLowerCase() === normalizedCurrent
          ? false
          : isAssignedRaw;

      return {
        phoneId: readNumber(row, 'phoneId') ?? 0,
        macAddress: readString(row, 'macAddress'),
        make: readString(row, 'make'),
        model: readString(row, 'model'),
        isAssigned,
        assignedToEmail: isAssignedRaw ? assignedEmail || null : null,
      };
    });

    return { phones };
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async loadEmploymentProfile(
    email: string,
  ): Promise<EmployeeEmploymentProfileResponse> {
    const hasEpTable = await this.tableExists('EmployeeProfile');

    // Employment details from EmployeeProfile
    let epJoin = '';
    let epSelect = `
      CAST('' AS nvarchar(50)) AS accessLevel,
      CAST('' AS nvarchar(100)) AS workAuthorization,
      CAST(NULL AS date) AS startDate,
      CAST('' AS nvarchar(200)) AS supervisor,
      CAST('' AS nvarchar(100)) AS ptoAccrualRate,
      CAST('' AS nvarchar(100)) AS employmentAgreement,
      CAST('' AS nvarchar(10)) AS rampAccount,
      CAST('' AS nvarchar(20)) AS rampCreditCard,
      CAST('' AS nvarchar(100)) AS workstation,
      CAST(NULL AS int) AS officeAddressId`;
    let officeAddressSelect = `
      CAST('' AS nvarchar(200)) AS officeStreet,
      CAST('' AS nvarchar(200)) AS officeAddress2,
      CAST('' AS nvarchar(100)) AS officeCity,
      CAST('' AS nvarchar(100)) AS officeState,
      CAST('' AS nvarchar(20)) AS officePostalCode,
      CAST('' AS nvarchar(100)) AS officeCountry`;
    let officeAddressJoin = '';

    if (hasEpTable) {
      epJoin = 'LEFT JOIN dbo.EmployeeProfile ep ON ep.ContactID = c.ContactID';
      epSelect = `
      COALESCE(ep.AccessLevel, '') AS accessLevel,
      COALESCE(ep.WorkAuthorization, '') AS workAuthorization,
      ep.StartDate AS startDate,
      COALESCE(ep.Supervisor, '') AS supervisor,
      COALESCE(ep.PTOAccrualRate, '') AS ptoAccrualRate,
      COALESCE(ep.EmploymentAgreement, '') AS employmentAgreement,
      COALESCE(ep.RampAccount, '') AS rampAccount,
      COALESCE(ep.RampCreditCard, '') AS rampCreditCard,
      COALESCE(ep.Workstation, '') AS workstation,
      ep.OfficeAddressID AS officeAddressId`;
      officeAddressJoin =
        'LEFT JOIN dbo.Address oa ON oa.AddressID = ep.OfficeAddressID';
      officeAddressSelect = `
      COALESCE(oa.AddressLine1, '') AS officeStreet,
      COALESCE(oa.AddressLine2, '') AS officeAddress2,
      COALESCE(oa.City, '') AS officeCity,
      COALESCE(oa.StateProvince, '') AS officeState,
      COALESCE(oa.PostalCode, '') AS officePostalCode,
      COALESCE(oa.Country, '') AS officeCountry`;
    }

    const rows = await this.dataSource.query(
      `
      SELECT TOP 1
        c.ContactID AS contactId,
        ca.ContactAssignmentID AS contactAssignmentId,
        ${epSelect},
        ${officeAddressSelect},
        COALESCE(pe.ExtensionNumber, '') AS deskPhoneExtension,
        COALESCE(eqp.MACAddress, '') AS deskPhoneMac,
        COALESCE(eqp.Make, '') AS deskPhoneBrand,
        COALESCE(eqp.Model, '') AS deskPhoneModel,
        COALESCE(eqc.Make, '') AS pcBrand,
        COALESCE(eqc.Model, '') AS pcModel,
        COALESCE(eqc.AssetID, '') AS pcServiceTag,
        COALESCE(eqc.BluetoothStatus, '') AS bluetoothStatus,
        COALESCE(eqc.PCName, '') AS pcWindowsName
      FROM dbo.Contact c
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      INNER JOIN dbo.ContactAssignment ca ON ca.ContactID = c.ContactID
      INNER JOIN dbo.Company co ON co.CompanyID = ca.CompanyID AND co.is_internal = 1
      ${epJoin}
      ${officeAddressJoin}
      LEFT JOIN dbo.EmployeePhoneExtension epe ON epe.ContactAssignmentID = ca.ContactAssignmentID AND epe.IsCurrent = 1
      LEFT JOIN dbo.PhoneExtension pe ON pe.ExtensionID = epe.ExtensionID
      LEFT JOIN dbo.PhoneExtensionDevice ped ON ped.ExtensionID = epe.ExtensionID AND ped.IsCurrent = 1
      LEFT JOIN dbo.EquipmentPhone eqp ON eqp.PhoneID = ped.PhoneID
      LEFT JOIN dbo.EmployeeComputer ec ON ec.ContactAssignmentID = ca.ContactAssignmentID AND ec.IsCurrent = 1
      LEFT JOIN dbo.EquipmentComputer eqc ON eqc.ComputerID = ec.ComputerID
      WHERE LOWER(LTRIM(RTRIM(ci.Email))) = LOWER(LTRIM(RTRIM(@0)))
      `,
      [email],
    );

    if (rows.length === 0) {
      throw new NotFoundException(
        `No internal employee found for ${email}. Run Entra → EMS sync first.`,
      );
    }

    const r = rows[0] as Record<string, unknown>;
    return {
      contactId: readNumber(r, 'contactId', 'ContactID') ?? 0,
      contactAssignmentId:
        readNumber(r, 'contactAssignmentId', 'ContactAssignmentID') ?? 0,
      accessLevel: readString(r, 'accessLevel'),
      workAuthorization: readString(r, 'workAuthorization'),
      workstation: readString(r, 'workstation'),
      startDate: readDateString(r, 'startDate'),
      supervisor: readString(r, 'supervisor'),
      ptoAccrualRate: readString(r, 'ptoAccrualRate'),
      employmentAgreement: readString(r, 'employmentAgreement'),
      rampAccount: readString(r, 'rampAccount'),
      rampCreditCard: readString(r, 'rampCreditCard'),
      officeAddressId: readNumber(r, 'officeAddressId'),
      officeStreet: readString(r, 'officeStreet'),
      officeAddress2: readString(r, 'officeAddress2'),
      officeCity: readString(r, 'officeCity'),
      officeState: readString(r, 'officeState'),
      officePostalCode: readString(r, 'officePostalCode'),
      officeCountry: readString(r, 'officeCountry'),
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
  const email = cleanText(value).toLowerCase();
  return email.includes('@') ? email : '';
}

function cleanText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function nullableText(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function nullableDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function readString(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!row) return '';
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return cleanText(String(value));
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
      return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
    }
    const str = String(value).trim();
    if (!str) continue;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}
