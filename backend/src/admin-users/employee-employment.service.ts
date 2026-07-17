import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { EmployeeHealthInsuranceService } from './employee-health-insurance.service';

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

export type PcDeviceOption = {
  computerId: number;
  pcName: string;
  make: string;
  model: string;
  serviceTag: string;
  bluetoothStatus: string;
  isAssigned: boolean;
  assignedToEmail: string | null;
};

export type PcDeviceListResponse = {
  computers: PcDeviceOption[];
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
  @IsOptional() @IsString()
  accessLevel?: string | null;
  @IsOptional() @IsString()
  workAuthorization?: string | null;
  @IsOptional() @IsString()
  workstation?: string | null;
  @IsOptional() @IsString()
  startDate?: string | null;
  @IsOptional() @IsString()
  supervisor?: string | null;
  @IsOptional() @IsString()
  ptoAccrualRate?: string | null;
  @IsOptional() @IsString()
  employmentAgreement?: string | null;
  @IsOptional() @IsString()
  rampAccount?: string | null;
  @IsOptional() @IsString()
  rampCreditCard?: string | null;
  @IsOptional() @IsString()
  officeStreet?: string | null;
  @IsOptional() @IsString()
  officeAddress2?: string | null;
  @IsOptional() @IsString()
  officeCity?: string | null;
  @IsOptional() @IsString()
  officeState?: string | null;
  @IsOptional() @IsString()
  officePostalCode?: string | null;
  @IsOptional() @IsString()
  officeCountry?: string | null;
  /** Equipment assignment fields */
  @IsOptional() @IsNumber()
  deskPhoneExtensionId?: number | null;
  @IsOptional() @IsNumber()
  deskPhoneId?: number | null;
  @IsOptional() @IsNumber()
  pcComputerId?: number | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EmployeeEmploymentService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditContext: AuditRequestContext,
    private readonly healthInsuranceService: EmployeeHealthInsuranceService,
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

  /** Returns access levels for all internal employees in a single query. */
  async getAllAccessLevels(): Promise<{ email: string; accessLevel: string }[]> {
    const hasEpTable = await this.tableExists('EmployeeProfile');
    if (!hasEpTable) return [];

    const rows = await this.dataSource.query(`
      SELECT
        LOWER(LTRIM(RTRIM(ci.Email))) AS email,
        COALESCE(ep.AccessLevel, '') AS accessLevel
      FROM dbo.EmployeeProfile ep
      INNER JOIN dbo.Contact c ON c.ContactID = ep.ContactID
      INNER JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      WHERE ci.Email IS NOT NULL AND ci.Email <> ''
    `);

    return rows.map((r: Record<string, unknown>) => ({
      email: readString(r, 'email'),
      accessLevel: readString(r, 'accessLevel'),
    }));
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

    // Prevent changing the access level of a Super Admin user
    if (
      dto.accessLevel !== undefined &&
      (current.accessLevel ?? '').trim().toLowerCase() === 'super admin' &&
      (dto.accessLevel ?? '').trim().toLowerCase() !== 'super admin'
    ) {
      throw new BadRequestException(
        'Cannot change the access level of a Super Admin user.',
      );
    }

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

      console.log('[EmpProfile] epExists:', epExists, 'contactId:', current.contactId, 'dto:', JSON.stringify(dto));

      if (epExists.length > 0) {
        // Only update fields that are explicitly provided (not undefined)
        const setClauses: string[] = [];
        const params: (string | null)[] = [];
        let paramIdx = 0;

        if (dto.accessLevel !== undefined) { setClauses.push(`AccessLevel = @${paramIdx}`); params.push(nullableText(dto.accessLevel)); paramIdx++; }
        if (dto.workAuthorization !== undefined) { setClauses.push(`WorkAuthorization = @${paramIdx}`); params.push(nullableText(dto.workAuthorization)); paramIdx++; }
        if (dto.startDate !== undefined) { setClauses.push(`StartDate = @${paramIdx}`); params.push(nullableDate(dto.startDate)); paramIdx++; }
        if (dto.supervisor !== undefined) { setClauses.push(`Supervisor = @${paramIdx}`); params.push(nullableText(dto.supervisor)); paramIdx++; }
        if (dto.ptoAccrualRate !== undefined) { setClauses.push(`PTOAccrualRate = @${paramIdx}`); params.push(nullableText(dto.ptoAccrualRate)); paramIdx++; }
        if (dto.employmentAgreement !== undefined) { setClauses.push(`EmploymentAgreement = @${paramIdx}`); params.push(nullableText(dto.employmentAgreement)); paramIdx++; }
        if (dto.rampAccount !== undefined) { setClauses.push(`RampAccount = @${paramIdx}`); params.push(nullableText(dto.rampAccount)); paramIdx++; }
        if (dto.rampCreditCard !== undefined) { setClauses.push(`RampCreditCard = @${paramIdx}`); params.push(nullableText(dto.rampCreditCard)); paramIdx++; }
        if (dto.workstation !== undefined) { setClauses.push(`Workstation = @${paramIdx}`); params.push(nullableText(dto.workstation)); paramIdx++; }

        if (setClauses.length > 0) {
          setClauses.push(`modified_by = @${paramIdx}`); params.push(modifiedBy); paramIdx++;
          setClauses.push(`modified_at = SYSUTCDATETIME()`);
          const updateResult = await manager.query(
            `UPDATE dbo.EmployeeProfile SET ${setClauses.join(', ')} WHERE ContactID = @${paramIdx}`,
            [...params, current.contactId],
          );
          console.log('[EmpProfile] UPDATE result:', updateResult);
        }
      } else {
        await manager.query(
          `
          INSERT INTO dbo.EmployeeProfile
            (ContactID, AccessLevel, WorkAuthorization, StartDate, Supervisor,
             PTOAccrualRate, EmploymentAgreement, RampAccount, RampCreditCard, Workstation,
             created_by, created_at, modified_by, modified_at)
          VALUES
            (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9,
             @10, SYSUTCDATETIME(), @10, SYSUTCDATETIME())
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
          // Check if this address already exists (unique index on Address table)
          const street = cleanText(dto.officeStreet) || '';
          const city = cleanText(dto.officeCity) || '';
          const state = cleanText(dto.officeState) || '';
          const postalCode = cleanText(dto.officePostalCode) || '';
          const country = cleanText(dto.officeCountry) || '';
          const address2 = nullableText(dto.officeAddress2);

          const existingAddr = await manager.query(
            `SELECT TOP 1 AddressID AS addressId FROM dbo.Address
             WHERE AddressLine1 = @0 AND City = @1 AND StateProvince = @2 AND Country = @3 AND PostalCode = @4`,
            [street, city, state, country, postalCode],
          );

          let newAddressId: number | null = null;
          if (existingAddr.length > 0) {
            newAddressId = readNumber(existingAddr[0], 'addressId', 'AddressID');
            if (newAddressId) {
              await manager.query(
                `UPDATE dbo.Address SET AddressLine2 = @0 WHERE AddressID = @1`,
                [address2, newAddressId],
              );
            }
          } else {
            const rows = await manager.query(
              `
              INSERT INTO dbo.Address (AddressLine1, AddressLine2, City, StateProvince, PostalCode, Country)
              OUTPUT INSERTED.AddressID AS addressId
              VALUES (@0, @1, @2, @3, @4, @5)
              `,
              [street, address2, city, state, postalCode, country],
            );
            newAddressId = readNumber(rows[0], 'addressId', 'AddressID');
          }

          if (newAddressId) {
            await manager.query(
              `UPDATE dbo.EmployeeProfile SET OfficeAddressID = @0 WHERE ContactID = @1`,
              [newAddressId, current.contactId],
            );
          }
        }
      }

      // 3. Assign phone extension (if changed)
      if (dto.deskPhoneExtensionId !== undefined) {
        // Unassign current extension
        await manager.query(
          `UPDATE dbo.EmployeePhoneExtension SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date)
           WHERE ContactAssignmentID = @0 AND IsCurrent = 1`,
          [current.contactAssignmentId],
        );
        // Assign new extension
        if (dto.deskPhoneExtensionId) {
          await manager.query(
            `INSERT INTO dbo.EmployeePhoneExtension (ContactAssignmentID, ExtensionID, AssignedDate, IsCurrent, AssignedBy)
             VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
            [current.contactAssignmentId, dto.deskPhoneExtensionId, modifiedBy],
          );
        }
      }

      // 4. Assign phone device (if changed)
      if (dto.deskPhoneId !== undefined) {
        // Find the current active extension for this employee to link the device
        const activeExtRows = await manager.query(
          `SELECT ExtensionID FROM dbo.EmployeePhoneExtension
           WHERE ContactAssignmentID = @0 AND IsCurrent = 1`,
          [current.contactAssignmentId],
        );
        const activeExtId = activeExtRows.length > 0
          ? readNumber(activeExtRows[0], 'ExtensionID')
          : null;

        if (activeExtId) {
          // Unassign current phone device link
          await manager.query(
            `UPDATE dbo.PhoneExtensionDevice SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date)
             WHERE ExtensionID = @0 AND IsCurrent = 1`,
            [activeExtId],
          );
          // Assign new phone to extension
          if (dto.deskPhoneId) {
            await manager.query(
              `INSERT INTO dbo.PhoneExtensionDevice (ExtensionID, PhoneID, AssignedDate, IsCurrent, AssignedBy)
               VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
              [activeExtId, dto.deskPhoneId, modifiedBy],
            );
          }
        }
      }

      // 5. Assign computer (if changed)
      if (dto.pcComputerId !== undefined) {
        // Unassign current computer
        await manager.query(
          `UPDATE dbo.EmployeeComputer SET IsCurrent = 0, UnassignedDate = CAST(SYSUTCDATETIME() AS date)
           WHERE ContactAssignmentID = @0 AND IsCurrent = 1`,
          [current.contactAssignmentId],
        );
        // Assign new computer
        if (dto.pcComputerId) {
          await manager.query(
            `INSERT INTO dbo.EmployeeComputer (ContactAssignmentID, ComputerID, AssignedDate, IsCurrent, AssignedBy)
             VALUES (@0, @1, CAST(SYSUTCDATETIME() AS date), 1, @2)`,
            [current.contactAssignmentId, dto.pcComputerId, modifiedBy],
          );
        }
      }
    });

    // If startDate was changed, recalculate health insurance deductions so the
    // tenure-based employer contribution stays in sync with the stored payroll figure.
    if (dto.startDate !== undefined) {
      await this.healthInsuranceService.recalculateDeductionsForContact(current.contactId);
    }

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

  /** List all active PC/computer devices with assignment status. */
  async listPcDevices(
    currentUserEmail?: string,
  ): Promise<PcDeviceListResponse> {
    const rows = await this.dataSource.query(
      `
      SELECT
        eqc.ComputerID AS computerId,
        eqc.PCName AS pcName,
        COALESCE(eqc.Make, '') AS make,
        COALESCE(eqc.Model, '') AS model,
        COALESCE(eqc.AssetID, '') AS serviceTag,
        COALESCE(eqc.BluetoothStatus, '') AS bluetoothStatus,
        CASE WHEN ec.EmployeeComputerID IS NOT NULL THEN 1 ELSE 0 END AS isAssigned,
        ci.Email AS assignedToEmail
      FROM dbo.EquipmentComputer eqc
      LEFT JOIN dbo.EmployeeComputer ec ON ec.ComputerID = eqc.ComputerID AND ec.IsCurrent = 1
      LEFT JOIN dbo.ContactAssignment ca ON ca.ContactAssignmentID = ec.ContactAssignmentID
      LEFT JOIN dbo.Contact c ON c.ContactID = ca.ContactID
      LEFT JOIN dbo.ContactInfo ci ON ci.ContactInfoID = c.ContactInfoID
      WHERE eqc.EquipmentStatus = 'Active'
      ORDER BY eqc.PCName
      `,
    );

    const normalizedCurrent = currentUserEmail
      ? normalizeEmail(currentUserEmail)
      : '';

    const computers: PcDeviceOption[] = (
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
        computerId: readNumber(row, 'computerId') ?? 0,
        pcName: readString(row, 'pcName'),
        make: readString(row, 'make'),
        model: readString(row, 'model'),
        serviceTag: readString(row, 'serviceTag'),
        bluetoothStatus: readString(row, 'bluetoothStatus'),
        isAssigned,
        assignedToEmail: isAssignedRaw ? assignedEmail || null : null,
      };
    });

    return { computers };
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
      if (isNaN(value.getTime())) return null;
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(value).trim();
    if (!str) continue;
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
