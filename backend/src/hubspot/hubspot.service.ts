import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { Contact } from '../entities/contact.entity';
import { Department } from '../entities/department.entity';
import { Role } from '../entities/role.entity';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook-event.dto';

interface ExternalContactSyncRow {
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  workPhone: string | null;
  isStaff: boolean;
  companyIds: number[];
  companyNames: string[];
  roleIds: number[];
  roleNames: string[];
  departmentIds: number[];
  departmentNames: string[];
}

interface ExternalCompanySyncRow {
  companyId: number;
  companyName: string;
  companyTypeId: number | null;
  companyTypeName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  dmaid: number | null;
  dmaMarketName: string;
}

interface HubSpotObjectInput {
  id: string;
  idProperty: string;
  properties: Record<string, string>;
}

interface HubSpotContactPropertyDefinition {
  name: string;
  label: string;
  type: 'string' | 'bool';
  fieldType: 'text' | 'textarea' | 'booleancheckbox';
  description: string;
  hasUniqueValue?: boolean;
}

export interface HubSpotContactSyncResult {
  dryRun: boolean;
  syncSource: string;
  contacts: {
    totalEligible: number;
    submitted: number;
  };
  companies: {
    totalEligible: number;
    submitted: number;
  };
  associations: {
    submitted: number;
  };
  batches: {
    contacts: number;
    companies: number;
    associations: number;
  };
  ensuredProperties: {
    contacts: string[];
    companies: string[];
  };
  skipped: {
    missingEmail: number;
    invalidEmail: number;
    duplicateEmailContacts: number;
    hubSpotInvalidEmail: number;
  };
}

const DEFAULT_SYNC_SOURCE = 'backend_sandbox_test';
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_CONTACTS = 1000;
const IAE_CONTACT_PROPERTY_GROUP = 'contactinformation';
const IAE_COMPANY_PROPERTY_GROUP = 'companyinformation';
const IAE_CONTACT_PROPERTIES: HubSpotContactPropertyDefinition[] = [
  {
    name: 'iae_contact_sync_key',
    label: 'IAE Contact Sync Key',
    type: 'string',
    fieldType: 'text',
    description: 'Unique backend key used to upsert HubSpot contacts.',
    hasUniqueValue: true,
  },
  {
    name: 'iae_contact_id',
    label: 'IAE Contact ID',
    type: 'string',
    fieldType: 'text',
    description: 'Backend dbo.Contact ContactID.',
  },
  {
    name: 'iae_contact_info_id',
    label: 'IAE Contact Info ID',
    type: 'string',
    fieldType: 'text',
    description: 'Backend dbo.ContactInfo ContactInfoID.',
  },
  {
    name: 'iae_is_staff',
    label: 'IAE Is Staff',
    type: 'bool',
    fieldType: 'booleancheckbox',
    description: 'Whether this backend contact is staff/internal.',
  },
  {
    name: 'iae_sync_source',
    label: 'IAE Sync Source',
    type: 'string',
    fieldType: 'text',
    description: 'Backend sync source that created or updated this contact.',
  },
  {
    name: 'iae_company_ids',
    label: 'IAE Company IDs',
    type: 'string',
    fieldType: 'textarea',
    description: 'Backend company IDs associated with this contact.',
  },
  {
    name: 'iae_company_names',
    label: 'IAE Company Names',
    type: 'string',
    fieldType: 'textarea',
    description: 'Backend company names associated with this contact.',
  },
  {
    name: 'iae_role_ids',
    label: 'IAE Role IDs',
    type: 'string',
    fieldType: 'textarea',
    description: 'Backend role IDs associated with this contact.',
  },
  {
    name: 'iae_role_names',
    label: 'IAE Role Names',
    type: 'string',
    fieldType: 'textarea',
    description: 'Backend role names associated with this contact.',
  },
  {
    name: 'iae_department_ids',
    label: 'IAE Department IDs',
    type: 'string',
    fieldType: 'textarea',
    description: 'Backend department IDs associated with this contact.',
  },
  {
    name: 'iae_department_names',
    label: 'IAE Department Names',
    type: 'string',
    fieldType: 'textarea',
    description: 'Backend department names associated with this contact.',
  },
];
const IAE_COMPANY_PROPERTIES: HubSpotContactPropertyDefinition[] = [
  {
    name: 'iae_company_id',
    label: 'IAE Company ID',
    type: 'string',
    fieldType: 'text',
    description: 'Backend dbo.Company CompanyID.',
    hasUniqueValue: true,
  },
  {
    name: 'iae_company_type_id',
    label: 'IAE Company Type ID',
    type: 'string',
    fieldType: 'text',
    description: 'Backend dbo.CompanyType CompanyTypeID.',
  },
  {
    name: 'iae_company_type_name',
    label: 'IAE Company Type Name',
    type: 'string',
    fieldType: 'text',
    description: 'Backend dbo.CompanyType CompanyTypeName.',
  },
  {
    name: 'iae_dma_id',
    label: 'IAE DMA ID',
    type: 'string',
    fieldType: 'text',
    description: 'Backend dbo.DMA DMAID.',
  },
  {
    name: 'iae_dma_market_name',
    label: 'IAE DMA Market Name',
    type: 'string',
    fieldType: 'text',
    description: 'Backend DMA market name.',
  },
  {
    name: 'iae_sync_source',
    label: 'IAE Sync Source',
    type: 'string',
    fieldType: 'text',
    description: 'Backend sync source that created or updated this company.',
  },
];

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[),.;:]+$/g, '');
}

function isValidEmail(value: string): boolean {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

@Injectable()
export class HubSpotService {
  private readonly logger = new Logger(HubSpotService.name);
  private companyContactAssociationTypeCache: {
    associationCategory: string;
    associationTypeId: number;
  } | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async syncExternalContacts(options?: {
    dryRun?: boolean;
    limit?: number;
  }): Promise<HubSpotContactSyncResult> {
    const dryRun = options?.dryRun !== false;
    const syncSource = clean(
      this.configService.get<string>('HUBSPOT_SYNC_SOURCE') ??
        DEFAULT_SYNC_SOURCE,
    );
    const limit =
      options?.limit && Number.isInteger(options.limit) && options.limit > 0
        ? options.limit
        : parsePositiveInt(
            this.configService.get<string>('HUBSPOT_SYNC_MAX_CONTACTS'),
            DEFAULT_MAX_CONTACTS,
          );

    const { contacts: rawContacts, skipped } =
      await this.loadExternalContacts(limit);
    return this.syncLoadedContacts(rawContacts, skipped, dryRun, syncSource);
  }

  queueContactSync(contactId: number): void {
    if (!Number.isInteger(contactId) || contactId < 1) return;
    setTimeout(() => {
      void this.syncContactIds([contactId]).catch((error) => {
        this.logger.warn(
          `HubSpot contact trigger sync failed for ContactID ${contactId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, 0);
  }

  queueCompanySync(companyId: number): void {
    if (!Number.isInteger(companyId) || companyId < 1) return;
    setTimeout(() => {
      void this.syncCompanyId(companyId).catch((error) => {
        this.logger.warn(
          `HubSpot company trigger sync failed for CompanyID ${companyId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, 0);
  }

  private async syncContactIds(
    contactIds: number[],
  ): Promise<HubSpotContactSyncResult> {
    const { contacts, skipped } =
      await this.loadExternalContactsByContactIds(contactIds);
    return this.syncLoadedContacts(
      contacts,
      skipped,
      false,
      this.getSyncSource(),
      [],
      false,
    );
  }

  private async syncCompanyId(
    companyId: number,
  ): Promise<HubSpotContactSyncResult> {
    const contactIds = await this.loadContactIdsForCompany(companyId);
    const { contacts, skipped } =
      await this.loadExternalContactsByContactIds(contactIds);
    return this.syncLoadedContacts(
      contacts,
      skipped,
      false,
      this.getSyncSource(),
      [companyId],
      false,
    );
  }

  private async syncLoadedContacts(
    rawContacts: ExternalContactSyncRow[],
    skipped: HubSpotContactSyncResult['skipped'],
    dryRun: boolean,
    syncSource: string,
    extraCompanyIds: number[] = [],
    includeAllCompanies = true,
  ): Promise<HubSpotContactSyncResult> {
    const { contacts, duplicateEmailContacts } =
      this.dedupeContactsByEmail(rawContacts);
    skipped.duplicateEmailContacts = duplicateEmailContacts;
    const contactInputs = contacts.map((contact) =>
      this.toHubSpotContactInput(contact, syncSource),
    );
    const companies = includeAllCompanies
      ? await this.loadAllCompanies()
      : await this.loadCompanies(
          this.uniqueNumbers(
            contacts
              .flatMap((contact) => contact.companyIds)
              .concat(extraCompanyIds),
          ),
        );
    const companyInputs = companies.map((company) =>
      this.toHubSpotCompanyInput(company, syncSource),
    );
    const ensuredProperties = {
      contacts: IAE_CONTACT_PROPERTIES.map((property) => property.name),
      companies: IAE_COMPANY_PROPERTIES.map((property) => property.name),
    };

    if (dryRun) {
      return {
        dryRun,
        syncSource,
        contacts: {
          totalEligible: rawContacts.length,
          submitted: 0,
        },
        companies: {
          totalEligible: companies.length,
          submitted: 0,
        },
        associations: {
          submitted: 0,
        },
        batches: {
          contacts: 0,
          companies: 0,
          associations: 0,
        },
        ensuredProperties,
        skipped,
      };
    }

    const token = clean(this.configService.get<string>('HUBSPOT_ACCESS_TOKEN'));
    if (!token) {
      throw new ServiceUnavailableException(
        'Missing HUBSPOT_ACCESS_TOKEN. Configure this with the HubSpot sandbox private app token before running a live sync.',
      );
    }

    const batchSize = Math.min(
      100,
      parsePositiveInt(
        this.configService.get<string>('HUBSPOT_SYNC_BATCH_SIZE'),
        DEFAULT_BATCH_SIZE,
      ),
    );

    await this.ensureContactProperties(token);
    await this.ensureCompanyProperties(token);

    let companyBatches = 0;
    const hubSpotCompanyIdsByIaeId = new Map<number, string>();
    for (let i = 0; i < companyInputs.length; i += batchSize) {
      companyBatches += 1;
      const batch = companyInputs.slice(i, i + batchSize);
      const ids = await this.upsertObjects('companies', batch, token);
      this.mergeHubSpotIds(hubSpotCompanyIdsByIaeId, ids);
    }

    const contactSyncResult = await this.syncContacts(
      contactInputs,
      token,
      batchSize,
    );
    skipped.hubSpotInvalidEmail += contactSyncResult.hubSpotInvalidEmail;
    const hubSpotContactIdsBySyncKey = contactSyncResult.idsBySyncKey;

    const associationInputs = this.toCompanyContactAssociationInputs(
      contacts,
      hubSpotContactIdsBySyncKey,
      hubSpotCompanyIdsByIaeId,
    );
    let associationBatches = 0;
    const associationType =
      associationInputs.length > 0
        ? await this.getCompanyToContactAssociationType(token)
        : null;
    for (let i = 0; i < associationInputs.length; i += batchSize) {
      associationBatches += 1;
      await this.createCompanyContactAssociations(
        associationInputs.slice(i, i + batchSize),
        token,
        associationType,
      );
    }

    this.logger.log(
      `Synced ${companyInputs.length} companies, ${contactInputs.length} external contacts, and ${associationInputs.length} company-contact associations to HubSpot.`,
    );

    return {
      dryRun,
      syncSource,
      contacts: {
        totalEligible: rawContacts.length,
        submitted: contactInputs.length,
      },
      companies: {
        totalEligible: companies.length,
        submitted: companyInputs.length,
      },
      associations: {
        submitted: associationInputs.length,
      },
      batches: {
        contacts: contactSyncResult.batches,
        companies: companyBatches,
        associations: associationBatches,
      },
      ensuredProperties,
      skipped,
    };
  }

  private getSyncSource(): string {
    return clean(
      this.configService.get<string>('HUBSPOT_SYNC_SOURCE') ??
        DEFAULT_SYNC_SOURCE,
    );
  }

  private async loadExternalContacts(limit: number): Promise<{
    contacts: ExternalContactSyncRow[];
    skipped: HubSpotContactSyncResult['skipped'];
  }> {
    const hasIsStaffColumn = await this.hasContactIsStaffColumn();
    const idQb = this.contactRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.contactInfo', 'ci')
      .where("NULLIF(LTRIM(RTRIM(ci.email)), '') IS NOT NULL")
      .select('ct.contactId', 'contactId')
      .orderBy('ct.contactId', 'ASC')
      .limit(limit);

    if (hasIsStaffColumn) {
      idQb.andWhere('(ct.is_staff = :isStaff OR ct.is_staff IS NULL)', {
        isStaff: false,
      });
    }

    const idRows = await idQb.getRawMany<Record<string, unknown>>();
    const contactIds = idRows
      .map((row) => Number(this.pickRaw(row, 'contactId')))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (contactIds.length === 0) {
      return { contacts: [], skipped: this.emptySkipped() };
    }

    return this.loadExternalContactsByContactIds(contactIds);
  }

  private async loadExternalContactsByContactIds(
    contactIds: number[],
  ): Promise<{
    contacts: ExternalContactSyncRow[];
    skipped: HubSpotContactSyncResult['skipped'];
  }> {
    const safeContactIds = this.uniqueNumbers(contactIds);
    if (safeContactIds.length === 0) {
      return { contacts: [], skipped: this.emptySkipped() };
    }

    const hasIsStaffColumn = await this.hasContactIsStaffColumn();
    const rows = await this.contactRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.contactInfo', 'ci')
      .leftJoin(ContactAssignment, 'ca', 'ca.contactId = ct.contactId')
      .leftJoin(Company, 'c', 'c.companyId = ca.companyId')
      .leftJoin(Role, 'r', 'r.roleId = ca.roleId')
      .leftJoin(Department, 'd', 'd.departmentId = ca.departmentId')
      .where('ct.contactId IN (:...contactIds)', { contactIds: safeContactIds })
      .select([
        'ct.contactId AS contactId',
        'ci.contactInfoId AS contactInfoId',
        'ci.firstName AS firstName',
        'ci.lastName AS lastName',
        'ci.email AS email',
        'ci.cellPhone AS cellPhone',
        'ci.workPhone AS workPhone',
        hasIsStaffColumn
          ? 'ct.is_staff AS isStaff'
          : 'CAST(0 AS bit) AS isStaff',
        'c.companyId AS companyId',
        'c.companyName AS companyName',
        'r.roleId AS roleId',
        'r.roleName AS roleName',
        'd.departmentId AS departmentId',
        'd.departmentName AS departmentName',
      ])
      .orderBy('ct.contactId', 'ASC')
      .getRawMany<Record<string, unknown>>();

    const byContact = new Map<number, ExternalContactSyncRow>();
    const skipped = this.emptySkipped();
    for (const row of rows) {
      const contactId = Number(this.pickRaw(row, 'contactId'));
      const contactInfoId = Number(this.pickRaw(row, 'contactInfoId'));
      const email = normalizeEmail(this.pickRaw(row, 'email'));
      if (!email) {
        skipped.missingEmail += 1;
        continue;
      }
      if (!isValidEmail(email)) {
        skipped.invalidEmail += 1;
        continue;
      }
      if (
        !Number.isInteger(contactId) ||
        contactId < 1 ||
        !Number.isInteger(contactInfoId) ||
        contactInfoId < 1
      ) {
        continue;
      }

      let contact = byContact.get(contactId);
      if (!contact) {
        contact = {
          contactId,
          contactInfoId,
          firstName: clean(this.pickRaw(row, 'firstName')),
          lastName: clean(this.pickRaw(row, 'lastName')),
          email,
          cellPhone: clean(this.pickRaw(row, 'cellPhone')) || null,
          workPhone: clean(this.pickRaw(row, 'workPhone')) || null,
          isStaff:
            this.pickRaw(row, 'isStaff') === true ||
            this.pickRaw(row, 'isStaff') === 1,
          companyIds: [],
          companyNames: [],
          roleIds: [],
          roleNames: [],
          departmentIds: [],
          departmentNames: [],
        };
        byContact.set(contactId, contact);
      }

      this.pushUniqueNumber(contact.companyIds, this.pickRaw(row, 'companyId'));
      this.pushUniqueText(
        contact.companyNames,
        this.pickRaw(row, 'companyName'),
      );
      this.pushUniqueNumber(contact.roleIds, this.pickRaw(row, 'roleId'));
      this.pushUniqueText(contact.roleNames, this.pickRaw(row, 'roleName'));
      this.pushUniqueNumber(
        contact.departmentIds,
        this.pickRaw(row, 'departmentId'),
      );
      this.pushUniqueText(
        contact.departmentNames,
        this.pickRaw(row, 'departmentName'),
      );
    }

    return { contacts: [...byContact.values()], skipped };
  }

  private async loadContactIdsForCompany(companyId: number): Promise<number[]> {
    const rows = await this.dataSource.query(
      `
        SELECT DISTINCT ContactID AS contactId
        FROM dbo.ContactAssignment
        WHERE CompanyID = @0
      `,
      [companyId],
    );
    return Array.isArray(rows)
      ? rows
          .map((row) => Number(this.pickRaw(row, 'contactId')))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
  }

  private emptySkipped(): HubSpotContactSyncResult['skipped'] {
    return {
      missingEmail: 0,
      invalidEmail: 0,
      duplicateEmailContacts: 0,
      hubSpotInvalidEmail: 0,
    };
  }

  private dedupeContactsByEmail(contacts: ExternalContactSyncRow[]): {
    contacts: ExternalContactSyncRow[];
    duplicateEmailContacts: number;
  } {
    const byEmail = new Map<string, ExternalContactSyncRow>();
    let duplicateEmailContacts = 0;

    for (const contact of contacts) {
      const existing = byEmail.get(contact.email);
      if (!existing) {
        byEmail.set(contact.email, {
          ...contact,
          companyIds: [...contact.companyIds],
          companyNames: [...contact.companyNames],
          roleIds: [...contact.roleIds],
          roleNames: [...contact.roleNames],
          departmentIds: [...contact.departmentIds],
          departmentNames: [...contact.departmentNames],
        });
        continue;
      }

      duplicateEmailContacts += 1;
      const primary =
        contact.contactId < existing.contactId ? contact : existing;
      existing.contactId = primary.contactId;
      existing.contactInfoId = primary.contactInfoId;
      existing.firstName = primary.firstName || existing.firstName;
      existing.lastName = primary.lastName || existing.lastName;
      existing.cellPhone = primary.cellPhone || existing.cellPhone;
      existing.workPhone = primary.workPhone || existing.workPhone;
      existing.isStaff = existing.isStaff && contact.isStaff;
      this.mergeUniqueNumbers(existing.companyIds, contact.companyIds);
      this.mergeUniqueTexts(existing.companyNames, contact.companyNames);
      this.mergeUniqueNumbers(existing.roleIds, contact.roleIds);
      this.mergeUniqueTexts(existing.roleNames, contact.roleNames);
      this.mergeUniqueNumbers(existing.departmentIds, contact.departmentIds);
      this.mergeUniqueTexts(existing.departmentNames, contact.departmentNames);
    }

    return { contacts: [...byEmail.values()], duplicateEmailContacts };
  }

  private async hasContactIsStaffColumn(): Promise<boolean> {
    const rows = await this.dataSource.query(`
      SELECT 1 AS found
      FROM sys.columns
      WHERE object_id = OBJECT_ID(N'dbo.Contact')
        AND name = N'is_staff'
    `);
    return Array.isArray(rows) && rows.length > 0;
  }

  private async loadCompanies(
    companyIds: number[],
  ): Promise<ExternalCompanySyncRow[]> {
    if (companyIds.length === 0) return [];

    const rows = await this.companyRepo
      .createQueryBuilder('c')
      .leftJoin('c.companyType', 'ct')
      .leftJoin('c.physicalAddress', 'pa')
      .leftJoin('c.dma', 'dma')
      .where('c.companyId IN (:...companyIds)', { companyIds })
      .select([
        'c.companyId AS companyId',
        'c.companyName AS companyName',
        'c.companyTypeId AS companyTypeId',
        'ct.companyTypeName AS companyTypeName',
        'pa.addressLine1 AS addressLine1',
        'pa.addressLine2 AS addressLine2',
        'pa.city AS city',
        'pa.stateProvince AS stateProvince',
        'pa.postalCode AS postalCode',
        'pa.country AS country',
        'c.dmaid AS dmaid',
        'dma.marketName AS dmaMarketName',
      ])
      .orderBy('c.companyId', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return rows
      .map((row) => ({
        companyId: Number(this.pickRaw(row, 'companyId')),
        companyName: clean(this.pickRaw(row, 'companyName')),
        companyTypeId: this.toNullableNumber(
          this.pickRaw(row, 'companyTypeId'),
        ),
        companyTypeName: clean(this.pickRaw(row, 'companyTypeName')),
        addressLine1: clean(this.pickRaw(row, 'addressLine1')),
        addressLine2: clean(this.pickRaw(row, 'addressLine2')),
        city: clean(this.pickRaw(row, 'city')),
        stateProvince: clean(this.pickRaw(row, 'stateProvince')),
        postalCode: clean(this.pickRaw(row, 'postalCode')),
        country: clean(this.pickRaw(row, 'country')),
        dmaid: this.toNullableNumber(this.pickRaw(row, 'dmaid')),
        dmaMarketName: clean(this.pickRaw(row, 'dmaMarketName')),
      }))
      .filter(
        (company) =>
          Number.isInteger(company.companyId) &&
          company.companyId > 0 &&
          company.companyName.length > 0,
      );
  }

  private async loadAllCompanies(): Promise<ExternalCompanySyncRow[]> {
    const rows = await this.companyRepo
      .createQueryBuilder('c')
      .leftJoin('c.companyType', 'ct')
      .leftJoin('c.physicalAddress', 'pa')
      .leftJoin('c.dma', 'dma')
      .select([
        'c.companyId AS companyId',
        'c.companyName AS companyName',
        'c.companyTypeId AS companyTypeId',
        'ct.companyTypeName AS companyTypeName',
        'pa.addressLine1 AS addressLine1',
        'pa.addressLine2 AS addressLine2',
        'pa.city AS city',
        'pa.stateProvince AS stateProvince',
        'pa.postalCode AS postalCode',
        'pa.country AS country',
        'c.dmaid AS dmaid',
        'dma.marketName AS dmaMarketName',
      ])
      .orderBy('c.companyId', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return rows
      .map((row) => ({
        companyId: Number(this.pickRaw(row, 'companyId')),
        companyName: clean(this.pickRaw(row, 'companyName')),
        companyTypeId: this.toNullableNumber(
          this.pickRaw(row, 'companyTypeId'),
        ),
        companyTypeName: clean(this.pickRaw(row, 'companyTypeName')),
        addressLine1: clean(this.pickRaw(row, 'addressLine1')),
        addressLine2: clean(this.pickRaw(row, 'addressLine2')),
        city: clean(this.pickRaw(row, 'city')),
        stateProvince: clean(this.pickRaw(row, 'stateProvince')),
        postalCode: clean(this.pickRaw(row, 'postalCode')),
        country: clean(this.pickRaw(row, 'country')),
        dmaid: this.toNullableNumber(this.pickRaw(row, 'dmaid')),
        dmaMarketName: clean(this.pickRaw(row, 'dmaMarketName')),
      }))
      .filter(
        (company) =>
          Number.isInteger(company.companyId) &&
          company.companyId > 0 &&
          company.companyName.length > 0,
      );
  }

  private toHubSpotContactInput(
    contact: ExternalContactSyncRow,
    syncSource: string,
  ): HubSpotObjectInput {
    const syncKey = this.getContactSyncKey(contact);
    return {
      id: syncKey,
      idProperty: 'iae_contact_sync_key',
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        phone: contact.workPhone ?? '',
        mobilephone: contact.cellPhone ?? '',
        iae_contact_sync_key: syncKey,
        iae_contact_id: String(contact.contactId),
        iae_contact_info_id: String(contact.contactInfoId),
        iae_is_staff: String(contact.isStaff),
        iae_sync_source: syncSource,
        iae_company_ids: contact.companyIds.join('; '),
        iae_company_names: contact.companyNames.join('; '),
        iae_role_ids: contact.roleIds.join('; '),
        iae_role_names: contact.roleNames.join('; '),
        iae_department_ids: contact.departmentIds.join('; '),
        iae_department_names: contact.departmentNames.join('; '),
      },
    };
  }

  private toHubSpotCompanyInput(
    company: ExternalCompanySyncRow,
    syncSource: string,
  ): HubSpotObjectInput {
    return {
      id: String(company.companyId),
      idProperty: 'iae_company_id',
      properties: {
        name: company.companyName,
        type: company.companyTypeName,
        address: [company.addressLine1, company.addressLine2]
          .filter(Boolean)
          .join(', '),
        city: company.city,
        state: company.stateProvince,
        zip: company.postalCode,
        country: company.country,
        iae_company_id: String(company.companyId),
        iae_company_type_id:
          company.companyTypeId == null ? '' : String(company.companyTypeId),
        iae_company_type_name: company.companyTypeName,
        iae_dma_id: company.dmaid == null ? '' : String(company.dmaid),
        iae_dma_market_name: company.dmaMarketName,
        iae_sync_source: syncSource,
      },
    };
  }

  private async ensureContactProperties(token: string): Promise<void> {
    for (const property of IAE_CONTACT_PROPERTIES) {
      await this.createPropertyIfMissing('contacts', property, token);
    }
  }

  private async ensureCompanyProperties(token: string): Promise<void> {
    for (const property of IAE_COMPANY_PROPERTIES) {
      await this.createPropertyIfMissing('companies', property, token);
    }
  }

  private async createPropertyIfMissing(
    objectType: 'contacts' | 'companies',
    property: HubSpotContactPropertyDefinition,
    token: string,
  ): Promise<void> {
    const response = await fetch(
      this.buildHubSpotUrl(`/crm/v3/properties/${objectType}`),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: property.name,
          label: property.label,
          type: property.type,
          fieldType: property.fieldType,
          groupName:
            objectType === 'contacts'
              ? IAE_CONTACT_PROPERTY_GROUP
              : IAE_COMPANY_PROPERTY_GROUP,
          description: property.description,
          hasUniqueValue: property.hasUniqueValue,
        }),
      },
    );

    if (response.ok || response.status === 409) return;

    const detail = await response.text();
    throw new BadRequestException({
      message: `HubSpot ${objectType} property creation failed for ${property.name}.`,
      status: response.status,
      detail,
    });
  }

  private async syncContacts(
    inputs: HubSpotObjectInput[],
    token: string,
    batchSize: number,
  ): Promise<{
    idsBySyncKey: Map<string, string>;
    batches: number;
    hubSpotInvalidEmail: number;
  }> {
    const idsBySyncKey = new Map<string, string>();
    if (inputs.length === 0) {
      return { idsBySyncKey, batches: 0, hubSpotInvalidEmail: 0 };
    }

    // 1. Try to find existing HubSpot contacts by iae_contact_sync_key (stable ID).
    //    This handles email-change scenarios where the old email no longer matches.
    const existingIdsBySyncKey =
      await this.findExistingContactIdsBySyncKey(
        inputs.map((input) => clean(input.id)).filter(Boolean),
        token,
      );

    // 2. For contacts not found by sync key, try iae_contact_id lookup.
    //    Contacts created via HubSpot webhook have iae_contact_id/iae_contact_info_id
    //    written back but may not have iae_contact_sync_key set yet.
    const unmatchedBySyncKey = inputs.filter(
      (input) => !existingIdsBySyncKey.has(clean(input.id)),
    );
    const existingIdsByContactId =
      unmatchedBySyncKey.length > 0
        ? await this.findExistingContactIdsByEmsIds(
            unmatchedBySyncKey.map((input) => ({
              syncKey: clean(input.id),
              contactId: clean(input.properties.iae_contact_id),
              contactInfoId: clean(input.properties.iae_contact_info_id),
            })),
            token,
          )
        : new Map<string, string>();

    // 3. Fall back to email lookup for contacts not yet linked via sync key or EMS IDs.
    const unmatchedByKey = unmatchedBySyncKey.filter(
      (input) => !existingIdsByContactId.has(clean(input.id)),
    );
    const existingIdsByEmail =
      unmatchedByKey.length > 0
        ? await this.findExistingContactIdsByEmail(
            unmatchedByKey
              .map((input) => clean(input.properties.email))
              .filter(Boolean),
            token,
          )
        : new Map<string, string>();

    const updates: { id: string; input: HubSpotObjectInput }[] = [];
    const creates: HubSpotObjectInput[] = [];
    for (const input of inputs) {
      const syncKey = input.id;
      const existingHubSpotId =
        existingIdsBySyncKey.get(clean(syncKey)) ??
        existingIdsByContactId.get(clean(syncKey)) ??
        existingIdsByEmail.get(
          clean(input.properties.email).toLowerCase(),
        );
      if (existingHubSpotId) {
        updates.push({ id: existingHubSpotId, input });
        idsBySyncKey.set(syncKey, existingHubSpotId);
      } else {
        creates.push(input);
      }
    }

    let batches = 0;
    let hubSpotInvalidEmail = 0;
    for (let i = 0; i < updates.length; i += batchSize) {
      batches += 1;
      const result = await this.updateContactsByHubSpotId(
        updates.slice(i, i + batchSize),
        token,
      );
      hubSpotInvalidEmail += result.hubSpotInvalidEmail;
    }

    for (let i = 0; i < creates.length; i += batchSize) {
      batches += 1;
      const result = await this.upsertContactsWithInvalidEmailRetry(
        'contacts',
        creates.slice(i, i + batchSize),
        token,
      );
      this.mergeHubSpotIds(idsBySyncKey, result.ids);
      hubSpotInvalidEmail += result.hubSpotInvalidEmail;
    }

    return { idsBySyncKey, batches, hubSpotInvalidEmail };
  }

  private async findExistingContactIdsByEmail(
    emails: string[],
    token: string,
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const uniqueEmails = [
      ...new Set(emails.map((email) => email.toLowerCase())),
    ];

    for (let i = 0; i < uniqueEmails.length; i += 100) {
      const batch = uniqueEmails.slice(i, i + 100);
      const response = await fetch(
        this.buildHubSpotUrl('/crm/v3/objects/contacts/batch/read'),
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            idProperty: 'email',
            properties: ['email', 'iae_contact_sync_key'],
            inputs: batch.map((email) => ({ id: email })),
          }),
        },
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new BadRequestException({
          message: 'HubSpot contact batch lookup failed.',
          status: response.status,
          detail,
        });
      }

      const payload = (await response.json()) as {
        results?: { id?: string; properties?: Record<string, unknown> }[];
      };
      for (const result of payload.results ?? []) {
        const email = normalizeEmail(result.properties?.email);
        const id = clean(result.id);
        if (email && id) out.set(email, id);
      }
    }

    return out;
  }

  private async findExistingContactIdsBySyncKey(
    syncKeys: string[],
    token: string,
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const uniqueKeys = [...new Set(syncKeys.filter(Boolean))];
    if (uniqueKeys.length === 0) return out;

    for (let i = 0; i < uniqueKeys.length; i += 100) {
      const batch = uniqueKeys.slice(i, i + 100);
      const response = await fetch(
        this.buildHubSpotUrl('/crm/v3/objects/contacts/batch/read'),
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            idProperty: 'iae_contact_sync_key',
            properties: ['email', 'iae_contact_sync_key'],
            inputs: batch.map((key) => ({ id: key })),
          }),
        },
      );

      if (!response.ok) {
        // Sync-key lookup is best-effort; fall back to email matching
        // if the custom property doesn't exist yet or the call fails.
        this.logger.warn(
          `HubSpot sync-key batch lookup failed (status ${response.status}). Falling back to email lookup.`,
        );
        return out;
      }

      const payload = (await response.json()) as {
        results?: { id?: string; properties?: Record<string, unknown> }[];
      };
      for (const result of payload.results ?? []) {
        const key = clean(result.properties?.iae_contact_sync_key);
        const id = clean(result.id);
        if (key && id) out.set(key, id);
      }
    }

    return out;
  }

  /**
   * Look up HubSpot contacts by iae_contact_id. This catches contacts created
   * via the HubSpot webhook that had iae_contact_id / iae_contact_info_id written
   * back but not iae_contact_sync_key. Returns a map of syncKey → HubSpot ID,
   * only for entries where both iae_contact_id and iae_contact_info_id match.
   */
  private async findExistingContactIdsByEmsIds(
    entries: { syncKey: string; contactId: string; contactInfoId: string }[],
    token: string,
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const validEntries = entries.filter(
      (e) => e.contactId && e.contactInfoId && e.syncKey,
    );
    if (validEntries.length === 0) return out;

    const uniqueContactIds = [
      ...new Set(validEntries.map((e) => e.contactId)),
    ];

    // Build a lookup: iae_contact_id → { syncKey, contactInfoId }
    const entryByContactId = new Map<
      string,
      { syncKey: string; contactInfoId: string }
    >();
    for (const e of validEntries) {
      entryByContactId.set(e.contactId, {
        syncKey: e.syncKey,
        contactInfoId: e.contactInfoId,
      });
    }

    for (let i = 0; i < uniqueContactIds.length; i += 100) {
      const batch = uniqueContactIds.slice(i, i + 100);
      const response = await fetch(
        this.buildHubSpotUrl('/crm/v3/objects/contacts/batch/read'),
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            idProperty: 'iae_contact_id',
            properties: [
              'email',
              'iae_contact_id',
              'iae_contact_info_id',
              'iae_contact_sync_key',
            ],
            inputs: batch.map((id) => ({ id })),
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `HubSpot iae_contact_id batch lookup failed (status ${response.status}). Falling back to email lookup.`,
        );
        return out;
      }

      const payload = (await response.json()) as {
        results?: { id?: string; properties?: Record<string, unknown> }[];
      };
      for (const result of payload.results ?? []) {
        const hubSpotId = clean(result.id);
        const hsContactId = clean(result.properties?.iae_contact_id);
        const hsContactInfoId = clean(result.properties?.iae_contact_info_id);
        if (!hubSpotId || !hsContactId) continue;

        const entry = entryByContactId.get(hsContactId);
        if (!entry) continue;

        // Verify iae_contact_info_id matches to avoid updating the wrong record
        if (hsContactInfoId && entry.contactInfoId !== hsContactInfoId) {
          this.logger.warn(
            `HubSpot contact ${hubSpotId} has iae_contact_id=${hsContactId} but iae_contact_info_id=${hsContactInfoId} ` +
              `does not match EMS value ${entry.contactInfoId}. Skipping.`,
          );
          continue;
        }

        out.set(entry.syncKey, hubSpotId);
      }
    }

    return out;
  }

  private async updateContactsByHubSpotId(
    updates: { id: string; input: HubSpotObjectInput }[],
    token: string,
  ): Promise<{ hubSpotInvalidEmail: number }> {
    if (updates.length === 0) return { hubSpotInvalidEmail: 0 };

    const response = await fetch(
      this.buildHubSpotUrl('/crm/v3/objects/contacts/batch/update'),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          inputs: updates.map((update) => ({
            id: update.id,
            properties: update.input.properties,
          })),
        }),
      },
    );

    if (response.ok) return { hubSpotInvalidEmail: 0 };

    const detail = await response.text();
    const invalidEmails = this.extractHubSpotInvalidEmails(detail);
    if (invalidEmails.size > 0) {
      const retryUpdates = updates.map((update) =>
        invalidEmails.has(clean(update.input.properties.email).toLowerCase())
          ? {
              id: update.id,
              input: {
                ...update.input,
                properties: this.omitProperty(update.input.properties, 'email'),
              },
            }
          : update,
      );
      await this.updateContactsByHubSpotId(retryUpdates, token);
      return { hubSpotInvalidEmail: invalidEmails.size };
    }

    throw new BadRequestException({
      message: 'HubSpot existing contacts batch update failed.',
      status: response.status,
      detail,
    });
  }

  private async upsertContactsWithInvalidEmailRetry(
    objectType: 'contacts',
    inputs: HubSpotObjectInput[],
    token: string,
  ): Promise<{ ids: Map<string, string>; hubSpotInvalidEmail: number }> {
    const result = await this.tryUpsertObjects(objectType, inputs, token);
    if (result.ok) return { ids: result.ids, hubSpotInvalidEmail: 0 };

    const invalidEmails = this.extractHubSpotInvalidEmails(result.detail);
    if (invalidEmails.size === 0) {
      throw new BadRequestException({
        message: `HubSpot ${objectType} batch upsert failed.`,
        status: result.status,
        detail: result.detail,
      });
    }

    const retryInputs = inputs.filter(
      (input) =>
        !invalidEmails.has(clean(input.properties.email).toLowerCase()),
    );
    const retryResult = await this.tryUpsertObjects(
      objectType,
      retryInputs,
      token,
    );
    if (!retryResult.ok) {
      throw new BadRequestException({
        message: `HubSpot ${objectType} batch upsert failed after removing invalid emails.`,
        status: retryResult.status,
        detail: retryResult.detail,
      });
    }

    return {
      ids: retryResult.ids,
      hubSpotInvalidEmail: inputs.length - retryInputs.length,
    };
  }

  private async upsertObjects(
    objectType: 'contacts' | 'companies',
    inputs: HubSpotObjectInput[],
    token: string,
  ): Promise<Map<string, string>> {
    const result = await this.tryUpsertObjects(objectType, inputs, token);
    if (result.ok) return result.ids;

    throw new BadRequestException({
      message: `HubSpot ${objectType} batch upsert failed.`,
      status: result.status,
      detail: result.detail,
    });
  }

  private async tryUpsertObjects(
    objectType: 'contacts' | 'companies',
    inputs: HubSpotObjectInput[],
    token: string,
  ): Promise<
    | { ok: true; ids: Map<string, string> }
    | { ok: false; status: number; detail: string }
  > {
    const ids = new Map<string, string>();
    if (inputs.length === 0) return { ok: true, ids };

    const response = await fetch(
      this.buildHubSpotUrl(`/crm/v3/objects/${objectType}/batch/upsert`),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ inputs }),
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        results?: {
          id?: string;
          properties?: Record<string, unknown>;
        }[];
      };
      for (const result of payload.results ?? []) {
        const hubSpotId = clean(result.id);
        const idProperty =
          objectType === 'contacts' ? 'iae_contact_sync_key' : 'iae_company_id';
        const sourceId = clean(result.properties?.[idProperty]);
        if (hubSpotId && sourceId) ids.set(sourceId, hubSpotId);
      }
      return { ok: true, ids };
    }

    const detail = await response.text();
    return { ok: false, status: response.status, detail };
  }

  private extractHubSpotInvalidEmails(detail: string): Set<string> {
    const out = new Set<string>();
    try {
      const parsed = JSON.parse(detail) as {
        errors?: { message?: string }[];
        message?: string;
      };
      for (const message of [
        parsed.message,
        ...(parsed.errors ?? []).map((error) => error.message),
      ]) {
        this.extractInvalidEmailsFromMessage(message, out);
      }
    } catch {
      this.extractInvalidEmailsFromMessage(detail, out);
    }
    return out;
  }

  private extractInvalidEmailsFromMessage(
    message: string | undefined,
    out: Set<string>,
  ): void {
    if (!message) return;
    const matches = message.matchAll(
      /Email address\s+([^\s"]+)\s+is invalid/gi,
    );
    for (const match of matches) {
      const email = normalizeEmail(match[1]);
      if (email) out.add(email);
    }
  }

  private omitProperty(
    properties: Record<string, string>,
    propertyName: string,
  ): Record<string, string> {
    const next = { ...properties };
    delete next[propertyName];
    return next;
  }

  private toCompanyContactAssociationInputs(
    contacts: ExternalContactSyncRow[],
    hubSpotContactIdsBySyncKey: Map<string, string>,
    hubSpotCompanyIdsByIaeId: Map<number, string>,
  ): { companyHubSpotId: string; contactHubSpotId: string }[] {
    const out: { companyHubSpotId: string; contactHubSpotId: string }[] = [];
    const seen = new Set<string>();

    for (const contact of contacts) {
      const contactHubSpotId = hubSpotContactIdsBySyncKey.get(
        this.getContactSyncKey(contact),
      );
      if (!contactHubSpotId) continue;
      for (const companyId of contact.companyIds) {
        const companyHubSpotId = hubSpotCompanyIdsByIaeId.get(companyId);
        if (!companyHubSpotId) continue;
        const key = `${companyHubSpotId}:${contactHubSpotId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ companyHubSpotId, contactHubSpotId });
      }
    }

    return out;
  }

  private getContactSyncKey(contact: ExternalContactSyncRow): string {
    return `contact:${contact.contactId}`;
  }

  private async createCompanyContactAssociations(
    inputs: { companyHubSpotId: string; contactHubSpotId: string }[],
    token: string,
    associationType: {
      associationCategory: string;
      associationTypeId: number;
    } | null = null,
  ): Promise<void> {
    if (inputs.length === 0) return;

    const resolvedAssociationType =
      associationType ?? (await this.getCompanyToContactAssociationType(token));
    const response = await fetch(
      this.buildHubSpotUrl(
        '/crm/v4/associations/companies/contacts/batch/create',
      ),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          inputs: inputs.map((input) => ({
            from: { id: input.companyHubSpotId },
            to: { id: input.contactHubSpotId },
            types: [resolvedAssociationType],
          })),
        }),
      },
    );

    if (response.ok || response.status === 409) return;

    const detail = await response.text();
    throw new BadRequestException({
      message: 'HubSpot company-contact association creation failed.',
      status: response.status,
      detail,
    });
  }

  private async getCompanyToContactAssociationType(token: string): Promise<{
    associationCategory: string;
    associationTypeId: number;
  }> {
    if (this.companyContactAssociationTypeCache) {
      return this.companyContactAssociationTypeCache;
    }

    const response = await fetch(
      this.buildHubSpotUrl('/crm/v4/associations/companies/contacts/labels'),
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new BadRequestException({
        message: 'Unable to read HubSpot company-contact association labels.',
        status: response.status,
        detail,
      });
    }

    const payload = (await response.json()) as {
      results?: {
        category?: string;
        typeId?: number;
        label?: string | null;
      }[];
    };
    const type =
      payload.results?.find(
        (item) => item.category === 'HUBSPOT_DEFINED' && item.label == null,
      ) ??
      payload.results?.find((item) => item.category === 'HUBSPOT_DEFINED') ??
      payload.results?.[0];

    if (!type?.category || !Number.isInteger(type.typeId)) {
      throw new BadRequestException(
        'HubSpot did not return a usable company-contact association type.',
      );
    }
    const associationTypeId = Number(type.typeId);

    this.companyContactAssociationTypeCache = {
      associationCategory: type.category,
      associationTypeId,
    };
    return this.companyContactAssociationTypeCache;
  }

  private buildHubSpotUrl(path: string): string {
    const baseUrl =
      clean(this.configService.get<string>('HUBSPOT_BASE_URL')) ||
      'https://api.hubapi.com';
    return `${baseUrl}${path}`;
  }

  private pickRaw(row: Record<string, unknown>, key: string): unknown {
    if (row[key] !== undefined && row[key] !== null) return row[key];
    const wanted = key.toLowerCase();
    for (const actual of Object.keys(row)) {
      if (actual.toLowerCase() === wanted) return row[actual];
    }
    return undefined;
  }

  private pushUniqueNumber(list: number[], value: unknown): void {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || list.includes(n)) return;
    list.push(n);
  }

  private pushUniqueText(list: string[], value: unknown): void {
    const text = clean(value);
    if (!text || list.includes(text)) return;
    list.push(text);
  }

  private mergeUniqueNumbers(target: number[], values: number[]): void {
    for (const value of values) {
      this.pushUniqueNumber(target, value);
    }
  }

  private mergeUniqueTexts(target: string[], values: string[]): void {
    for (const value of values) {
      this.pushUniqueText(target, value);
    }
  }

  private uniqueNumbers(values: number[]): number[] {
    return [
      ...new Set(
        values.filter((value) => Number.isInteger(value) && value > 0),
      ),
    ];
  }

  private toNullableNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  private mergeHubSpotIds(
    target: Map<number, string>,
    source: Map<string, string>,
  ): void;
  private mergeHubSpotIds(
    target: Map<string, string>,
    source: Map<string, string>,
  ): void;
  private mergeHubSpotIds(
    target: Map<number, string> | Map<string, string>,
    source: Map<string, string>,
  ): void {
    for (const [sourceId, hubSpotId] of source) {
      const numericSourceId = Number(sourceId);
      if (
        target instanceof Map &&
        Number.isInteger(numericSourceId) &&
        numericSourceId > 0
      ) {
        (target as Map<number, string>).set(numericSourceId, hubSpotId);
      } else {
        (target as Map<string, string>).set(sourceId, hubSpotId);
      }
    }
  }

  // ─── Webhook event processing ────────────────────────────────────────────────

  /**
   * Process an array of HubSpot webhook events asynchronously.
   * Called fire-and-forget from the controller after the 200 response is sent.
   */
  async handleWebhookEvents(events: HubSpotWebhookEventDto[]): Promise<void> {
    // Group contact.propertyChange events by objectId to process together
    const contactPropertyEvents = new Map<number, HubSpotWebhookEventDto[]>();
    // Group company.propertyChange events by objectId to process together
    const companyPropertyEvents = new Map<number, HubSpotWebhookEventDto[]>();
    const otherEvents: HubSpotWebhookEventDto[] = [];

    for (const event of events) {
      if (event.subscriptionType === 'contact.propertyChange') {
        const group = contactPropertyEvents.get(event.objectId) || [];
        group.push(event);
        contactPropertyEvents.set(event.objectId, group);
      } else if (event.subscriptionType === 'company.propertyChange') {
        const group = companyPropertyEvents.get(event.objectId) || [];
        group.push(event);
        companyPropertyEvents.set(event.objectId, group);
      } else {
        otherEvents.push(event);
      }
    }

    // Process grouped contact property changes
    for (const [objectId, group] of contactPropertyEvents) {
      try {
        await this.handleContactPropertyChanges(objectId, group);
      } catch (error) {
        this.logger.error(
          `Webhook processing failed for objectId=${objectId} (contact.propertyChange)`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    // Process grouped company property changes
    for (const [objectId, group] of companyPropertyEvents) {
      try {
        await this.handleCompanyPropertyChanges(objectId, group);
      } catch (error) {
        this.logger.error(
          `Webhook processing failed for objectId=${objectId} (company.propertyChange)`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    // Process other events
    for (const event of otherEvents) {
      try {
        switch (event.subscriptionType) {
          case 'contact.creation':
            await this.handleContactCreation(event);
            break;

          case 'company.creation':
            await this.handleCompanyCreation(event);
            break;

          default:
            this.logger.debug(
              `Webhook: unhandled subscriptionType "${event.subscriptionType}" (eventId=${event.eventId}, objectId=${event.objectId})`,
            );
        }
      } catch (error) {
        this.logger.error(
          `Webhook processing failed for eventId=${event.eventId} (${event.subscriptionType})`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  /**
   * Fetch a single contact from HubSpot CRM API by objectId and return mapped properties.
   */
  private async fetchHubSpotContact(objectId: number): Promise<{
    contactInfoId: number | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    workPhone: string | null;
  } | null> {
    const token = this.configService.get<string>('HUBSPOT_ACCESS_TOKEN');
    if (!token) {
      this.logger.error('HUBSPOT_ACCESS_TOKEN not configured. Cannot fetch contact from HubSpot.');
      return null;
    }

    const url = this.buildHubSpotUrl(
      `/crm/v3/objects/contacts/${objectId}?properties=email,firstname,lastname,phone,mobilephone,work_phone,iae_contact_info_id`,
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this.logger.error(
        `Failed to fetch HubSpot contact objectId=${objectId}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as {
      properties: Record<string, string | null>;
    };
    const props = data.properties;

    const rawId = props.iae_contact_info_id;
    return {
      contactInfoId: rawId ? parseInt(rawId, 10) || null : null,
      email: props.email || null,
      firstName: props.firstname || null,
      lastName: props.lastname || null,
      phone: props.mobilephone || null,
      workPhone: props.phone || props.work_phone || null,
    };
  }

  private readonly webhookPropertyMap: Record<string, string> = {
    email: 'Email',
    firstname: 'FirstName',
    lastname: 'LastName',
    mobilephone: 'CellPhone',
    phone: 'WorkPhone',
    work_phone: 'WorkPhone',
  };

  private async handleContactPropertyChanges(
    objectId: number,
    events: HubSpotWebhookEventDto[],
  ): Promise<void> {
    // 1. Fetch the full contact from HubSpot API (always get latest data)
    const hsContact = await this.fetchHubSpotContact(objectId);
    if (!hsContact) {
      this.logger.warn(`contact.propertyChange: Could not fetch HubSpot contact objectId=${objectId}. Skipping.`);
      return;
    }

    // 2. Check if this is an email change
    const isEmailChange = events.some(
      (e) => e.propertyName?.toLowerCase() === 'email',
    );

    let contactInfoId: number | null = null;

    if (isEmailChange && hsContact.contactInfoId) {
      // Email changed — find the record by ContactInfoID (since email in DB is stale)
      const byId = await this.dataSource.query(
        `SELECT ContactInfoID FROM dbo.ContactInfo WHERE ContactInfoID = @0`,
        [hsContact.contactInfoId],
      );
      if (byId.length > 0) {
        contactInfoId = byId[0].ContactInfoID;
        this.logger.log(
          `contact.propertyChange (email change): Found contact by iae_contact_info_id=${hsContact.contactInfoId} → ContactInfo(${contactInfoId}).`,
        );
      }
    } else if (hsContact.email) {
      // Non-email change — find the record by email
      const byEmail = await this.dataSource.query(
        `SELECT ContactInfoID FROM dbo.ContactInfo WHERE [Email] = @0`,
        [hsContact.email],
      );
      if (byEmail.length > 0) {
        contactInfoId = byEmail[0].ContactInfoID;
      }
    }

    if (contactInfoId === null) {
      this.logger.warn(
        `contact.propertyChange: No contact found for objectId=${objectId}. Skipping.`,
      );
      return;
    }

    // 3. Update each changed property (including email if that's what changed)
    for (const event of events) {
      if (!event.propertyName) continue;

      const dbColumn = this.webhookPropertyMap[event.propertyName.toLowerCase()];
      if (!dbColumn) {
        this.logger.debug(
          `No column mapping for HubSpot property "${event.propertyName}". Skipping.`,
        );
        continue;
      }

      // Use the event's propertyValue (the new value from HubSpot)
      const value = event.propertyValue ?? null;

      await this.dataSource.query(
        `UPDATE dbo.ContactInfo SET [${dbColumn}] = @0 WHERE ContactInfoID = @1`,
        [value, contactInfoId],
      );

      this.logger.log(
        `contact.propertyChange: Updated ContactInfo(${contactInfoId}) [${dbColumn}] = "${value}"`,
      );
    }
  }

  private async handleContactCreation(event: HubSpotWebhookEventDto): Promise<void> {
    // Fetch the full contact from HubSpot API
    const hsContact = await this.fetchHubSpotContact(event.objectId);
    if (!hsContact) {
      this.logger.warn(`contact.creation: Could not fetch HubSpot contact objectId=${event.objectId}. Skipping.`);
      return;
    }

    const email = hsContact.email;

    // Check if the contact already exists by email
    if (email) {
      const existing = await this.dataSource.query(
        `SELECT ci.ContactInfoID, c.ContactID
         FROM dbo.ContactInfo ci
         JOIN dbo.Contact c ON c.ContactInfoID = ci.ContactInfoID
         WHERE ci.[Email] = @0`,
        [email],
      );
      if (existing.length > 0) {
        const contactInfoId = existing[0].ContactInfoID;
        const contactId = existing[0].ContactID;
        this.logger.log(`contact.creation: Contact with email "${email}" already exists (ContactInfoID=${contactInfoId}). Updating.`);
        await this.dataSource.query(
          `UPDATE dbo.ContactInfo
           SET [FirstName] = @0, [LastName] = @1, [CellPhone] = @2, [WorkPhone] = @3
           WHERE ContactInfoID = @4`,
          [
            hsContact.firstName || '',
            hsContact.lastName || '',
            hsContact.phone || null,
            hsContact.workPhone || null,
            contactInfoId,
          ],
        );
        // Write back IDs to HubSpot so future email changes can find this record
        await this.updateHubSpotContactIds(event.objectId, contactInfoId, contactId);
        return;
      }
    }

    // Insert a new ContactInfo record
    const insertResult = await this.dataSource.query(
      `INSERT INTO dbo.ContactInfo (FirstName, LastName, Email, CellPhone, WorkPhone)
       VALUES (@0, @1, @2, @3, @4);
       SELECT SCOPE_IDENTITY() AS NewId;`,
      [
        hsContact.firstName || '',
        hsContact.lastName || '',
        hsContact.email || '',
        hsContact.phone || null,
        hsContact.workPhone || null,
      ],
    );
    const newId = insertResult[0]?.NewId;

    if (!newId) {
      this.logger.error(`contact.creation: Failed to insert new ContactInfo for objectId=${event.objectId}.`);
      return;
    }

    // Create a Contact record linked to this ContactInfo
    const contactResult = await this.dataSource.query(
      `INSERT INTO dbo.Contact (ContactInfoID) VALUES (@0);
       SELECT SCOPE_IDENTITY() AS NewContactId;`,
      [newId],
    );
    const newContactId = contactResult[0]?.NewContactId;

    // Write back IDs to HubSpot so future email changes can find this record
    await this.updateHubSpotContactIds(event.objectId, newId, newContactId);

    this.logger.log(
      `contact.creation: Created ContactInfo(${newId}) + Contact(${newContactId}) for HubSpot objectId=${event.objectId} — ` +
      `name="${hsContact.firstName} ${hsContact.lastName}", email="${hsContact.email}"`,
    );
  }

  /**
   * Write iae_contact_info_id, iae_contact_id, and iae_contact_sync_key back
   * to HubSpot so future syncs (including email-change scenarios) can find the record.
   */
  private async updateHubSpotContactIds(
    hubSpotObjectId: number,
    contactInfoId: number,
    contactId: number | null,
  ): Promise<void> {
    const token = this.configService.get<string>('HUBSPOT_ACCESS_TOKEN');
    if (!token) {
      this.logger.error('HUBSPOT_ACCESS_TOKEN not configured. Cannot write IDs back to HubSpot.');
      return;
    }

    const properties: Record<string, string> = {
      iae_contact_info_id: String(contactInfoId),
    };
    if (contactId) {
      properties.iae_contact_id = String(contactId);
      properties.iae_contact_sync_key = `contact:${contactId}`;
    }

    const url = this.buildHubSpotUrl(`/crm/v3/objects/contacts/${hubSpotObjectId}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      this.logger.error(
        `Failed to write IDs back to HubSpot objectId=${hubSpotObjectId}: ${response.status} ${response.statusText}`,
      );
    } else {
      this.logger.log(
        `Wrote iae_contact_info_id=${contactInfoId}, iae_contact_id=${contactId} to HubSpot objectId=${hubSpotObjectId}.`,
      );
    }
  }

  // --- Company property mapping ---
  // HubSpot webhook propertyName → dbo.Address column
  private readonly hubSpotAddressColumnMap: Record<string, string> = {
    'address': 'AddressLine1',
    'city': 'City',
    'state': 'StateProvince',
    'country': 'Country',
    'zip': 'PostalCode',
  };

  /**
   * Fetch a single company from HubSpot CRM API by objectId and return all relevant properties.
   */
  private async fetchHubSpotCompany(objectId: number): Promise<{
    companyId: number | null;
    name: string | null;
    type: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip: string | null;
  } | null> {
    const token = this.configService.get<string>('HUBSPOT_ACCESS_TOKEN');
    if (!token) {
      this.logger.error('HUBSPOT_ACCESS_TOKEN not configured. Cannot fetch company from HubSpot.');
      return null;
    }

    const url = this.buildHubSpotUrl(
      `/crm/v3/objects/companies/${objectId}?properties=iae_company_id,name,type,address,city,state,country,zip`,
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this.logger.error(
        `Failed to fetch HubSpot company objectId=${objectId}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as {
      properties: Record<string, string | null>;
    };
    const props = data.properties;

    const rawId = props.iae_company_id;
    return {
      companyId: rawId ? parseInt(rawId, 10) || null : null,
      name: props.name || null,
      type: props.type || null,
      address: props.address || null,
      city: props.city || null,
      state: props.state || null,
      country: props.country || null,
      zip: props.zip || null,
    };
  }

  /**
   * Handle company.propertyChange webhook events — update dbo.Company in EMS.
   */
  private async handleCompanyPropertyChanges(
    objectId: number,
    events: HubSpotWebhookEventDto[],
  ): Promise<void> {
    // 1. Fetch the company from HubSpot to get the iae_company_id
    const hsCompany = await this.fetchHubSpotCompany(objectId);
    if (!hsCompany) {
      this.logger.warn(`company.propertyChange: Could not fetch HubSpot company objectId=${objectId}. Skipping.`);
      return;
    }

    let companyId = hsCompany.companyId;

    // If iae_company_id exists, verify it matches a real EMS company
    let companyRows: Record<string, unknown>[] = [];
    if (companyId) {
      companyRows = await this.dataSource.query(
        `SELECT CompanyID, PhysicalAddressID, MailingAddressID FROM dbo.Company WHERE CompanyID = @0`,
        [companyId],
      );
    }

    // If no iae_company_id or CompanyID not found — try matching by name before creating
    if (!companyId || companyRows.length === 0) {
      // Try to find by company name first to avoid creating duplicates
      if (hsCompany.name) {
        const byName = await this.dataSource.query(
          `SELECT CompanyID, PhysicalAddressID, MailingAddressID FROM dbo.Company WHERE CompanyName = @0`,
          [hsCompany.name],
        );
        if (byName.length > 0) {
          companyId = byName[0].CompanyID;
          companyRows = byName;
          this.logger.log(
            `company.propertyChange: Matched HubSpot objectId=${objectId} to EMS Company(${companyId}) by name "${hsCompany.name}". Writing back iae_company_id.`,
          );
          await this.updateHubSpotCompanyId(objectId, companyId);
        }
      }

      // If still no match, create a new company
      if (!companyId || companyRows.length === 0) {
        this.logger.log(
          `company.propertyChange: No EMS match for HubSpot objectId=${objectId} (iae_company_id=${companyId ?? 'none'}). Attempting to create new company.`,
        );
        companyId = await this.createCompanyFromHubSpot(objectId, hsCompany);
        if (!companyId) {
          this.logger.warn(
            `company.propertyChange: Could not create EMS company for HubSpot objectId=${objectId}. Skipping property updates.`,
          );
          return;
        }
        // Re-fetch the newly created company row
        companyRows = await this.dataSource.query(
          `SELECT CompanyID, PhysicalAddressID, MailingAddressID FROM dbo.Company WHERE CompanyID = @0`,
          [companyId],
        );
      }
    }

    const currentPhysicalAddressId: number | null =
      (companyRows[0]?.PhysicalAddressID as number) ?? null;

    // 2. Separate events by category
    const addressChanges: Record<string, string | null> = {};
    let hasAddressChanges = false;

    for (const event of events) {
      if (!event.propertyName) continue;
      const propKey = event.propertyName.toLowerCase();
      const value = event.propertyValue ?? null;

      if (propKey === 'name') {
        // Direct update on dbo.Company.CompanyName
        await this.dataSource.query(
          `UPDATE dbo.Company SET CompanyName = @0 WHERE CompanyID = @1`,
          [value, companyId],
        );
        this.logger.log(
          `company.propertyChange: Updated Company(${companyId}) [CompanyName] = "${value}"`,
        );
      } else if (propKey === 'type') {
        // Look up CompanyType by name, then update the FK
        if (!value) {
          await this.dataSource.query(
            `UPDATE dbo.Company SET CompanyTypeID = NULL WHERE CompanyID = @0`,
            [companyId],
          );
          this.logger.log(
            `company.propertyChange: Cleared Company(${companyId}) [CompanyTypeID] (type was empty)`,
          );
        } else {
          const typeId = await this.resolveOrCreateCompanyTypeId(value);
          await this.dataSource.query(
            `UPDATE dbo.Company SET CompanyTypeID = @0 WHERE CompanyID = @1`,
            [typeId, companyId],
          );
          this.logger.log(
            `company.propertyChange: Updated Company(${companyId}) [CompanyTypeID] = ${typeId} (type "${value}")`,
          );
        }
      } else if (this.hubSpotAddressColumnMap[propKey]) {
        // Collect address field changes to process as a batch
        const dbColumn = this.hubSpotAddressColumnMap[propKey];
        addressChanges[dbColumn] = value;
        hasAddressChanges = true;
      } else {
        this.logger.debug(
          `No company column mapping for HubSpot property "${event.propertyName}". Skipping.`,
        );
      }
    }

    // 3. Process address changes: find-or-create address, update Company FK
    if (hasAddressChanges) {
      await this.upsertCompanyAddress(companyId, currentPhysicalAddressId, addressChanges);
    }
  }

  /**
   * Update the existing address record linked to the company.
   * Finds the company's PhysicalAddressID, then updates only the changed columns on that address row.
   */
  private async upsertCompanyAddress(
    companyId: number,
    currentAddressId: number | null,
    changes: Record<string, string | null>,
  ): Promise<void> {
    if (!currentAddressId) {
      // Company has no address yet — create a new one and link it
      const insertResult = await this.dataSource.query(
        `INSERT INTO dbo.Address (AddressLine1, City, StateProvince, PostalCode, Country)
         VALUES ('', '', '', '', '');
         SELECT SCOPE_IDENTITY() AS NewId;`,
      );
      const newAddressId = insertResult[0]?.NewId;
      if (!newAddressId) {
        this.logger.error(
          `company.propertyChange: Failed to create address for Company(${companyId}).`,
        );
        return;
      }
      // Link the new address to the company
      await this.dataSource.query(
        `UPDATE dbo.Company SET PhysicalAddressID = @0, MailingAddressID = @0 WHERE CompanyID = @1`,
        [newAddressId, companyId],
      );
      currentAddressId = newAddressId;
      this.logger.log(
        `company.propertyChange: Created new Address(${newAddressId}) and linked to Company(${companyId}).`,
      );
    }

    // Update only the changed fields on the existing address record
    for (const [dbColumn, value] of Object.entries(changes)) {
      await this.dataSource.query(
        `UPDATE dbo.Address SET [${dbColumn}] = @0 WHERE AddressID = @1`,
        [value ?? '', currentAddressId],
      );
      this.logger.log(
        `company.propertyChange: Updated Address(${currentAddressId}) [${dbColumn}] = "${value}"`,
      );
    }
  }

  /**
   * Handle company.creation webhook — create a new company in EMS from HubSpot data.
   */
  private async handleCompanyCreation(event: HubSpotWebhookEventDto): Promise<void> {
    const hsCompany = await this.fetchHubSpotCompany(event.objectId);
    if (!hsCompany) {
      this.logger.warn(`company.creation: Could not fetch HubSpot company objectId=${event.objectId}. Skipping.`);
      return;
    }

    // Check if already linked to an EMS company by iae_company_id
    if (hsCompany.companyId) {
      const existing = await this.dataSource.query(
        `SELECT CompanyID FROM dbo.Company WHERE CompanyID = @0`,
        [hsCompany.companyId],
      );
      if (existing.length > 0) {
        this.logger.log(
          `company.creation: HubSpot objectId=${event.objectId} already linked to EMS Company(${hsCompany.companyId}). Skipping.`,
        );
        return;
      }
    }

    // Also check by company name to prevent duplicates when iae_company_id is not yet set
    // (e.g. race condition: EMS creates company, syncs to HubSpot, webhook fires before
    //  iae_company_id is readable)
    if (hsCompany.name) {
      const byName = await this.dataSource.query(
        `SELECT CompanyID FROM dbo.Company WHERE CompanyName = @0`,
        [hsCompany.name],
      );
      if (byName.length > 0) {
        const matchedCompanyId = byName[0].CompanyID;
        this.logger.log(
          `company.creation: HubSpot objectId=${event.objectId} matches existing EMS Company(${matchedCompanyId}) by name "${hsCompany.name}". Writing back iae_company_id.`,
        );
        // Write iae_company_id back to HubSpot so future syncs use the correct ID
        await this.updateHubSpotCompanyId(event.objectId, matchedCompanyId);
        return;
      }
    }

    await this.createCompanyFromHubSpot(event.objectId, hsCompany);
  }

  /**
   * Create a new company + address in EMS from HubSpot data, then write back iae_company_id.
   * Returns the new CompanyID or null on failure.
   *
   * HubSpot API used:
   *   GET  /crm/v3/objects/companies/{objectId}  — fetch company properties (called by fetchHubSpotCompany)
   *   PATCH /crm/v3/objects/companies/{objectId} — write back iae_company_id after creation
   */
  private async createCompanyFromHubSpot(
    hubSpotObjectId: number,
    hsCompany: {
      name: string | null;
      type: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      zip: string | null;
    },
  ): Promise<number | null> {
    // 1. Resolve CompanyTypeID from the type name (create if not found)
    // If no type provided, use 'Other' as default
    const typeName = hsCompany.type || 'Other';
    const companyTypeId = await this.resolveOrCreateCompanyTypeId(typeName);

    // 2. Find existing address or create a new one
    let addressId: number | null = null;
    const addr = hsCompany.address ?? '';
    const city = hsCompany.city ?? '';
    const state = hsCompany.state ?? '';
    const country = hsCompany.country ?? '';
    const zip = hsCompany.zip ?? '';

    try {
      // Check for existing address first (UX_Address unique index)
      const existing = await this.dataSource.query(
        `SELECT AddressID FROM dbo.Address WHERE AddressLine1 = @0 AND City = @1 AND StateProvince = @2 AND PostalCode = @3 AND Country = @4`,
        [addr, city, state, zip, country],
      );

      if (existing.length > 0) {
        addressId = existing[0].AddressID;
      } else {
        const addrResult = await this.dataSource.query(
          `INSERT INTO dbo.Address (AddressLine1, City, StateProvince, PostalCode, Country)
           VALUES (@0, @1, @2, @3, @4);
           SELECT SCOPE_IDENTITY() AS NewId;`,
          [addr, city, state, zip, country],
        );
        addressId = addrResult[0]?.NewId ?? null;
      }
    } catch (error) {
      this.logger.error(
        `createCompanyFromHubSpot: Failed to resolve address for HubSpot objectId=${hubSpotObjectId}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }

    // 3. Insert the company
    let newCompanyId: number | null = null;
    try {
      this.logger.log(
        `createCompanyFromHubSpot: Attempting INSERT — name="${hsCompany.name}", companyTypeId=${companyTypeId}, addressId=${addressId}`,
      );
      const insertResult = await this.dataSource.query(
        `INSERT INTO dbo.Company (CompanyName, CompanyTypeID, PhysicalAddressID, MailingAddressID, DMAID, is_internal, created_by, created_at, modified_by, modified_at)
         VALUES (@0, @1, @2, @2, COALESCE((SELECT TOP 1 DMAID FROM dbo.DMA WHERE PostalCode = @5), (SELECT TOP 1 DMAID FROM dbo.DMA)), @3, @4, GETUTCDATE(), @4, GETUTCDATE());
         SELECT SCOPE_IDENTITY() AS NewId;`,
        [hsCompany.name ?? '', companyTypeId, addressId, 0, 'hubspot-webhook', zip],
      );
      this.logger.log(
        `createCompanyFromHubSpot: INSERT result = ${JSON.stringify(insertResult)}`,
      );
      newCompanyId = insertResult[0]?.NewId ?? null;
    } catch (error) {
      this.logger.error(
        `createCompanyFromHubSpot: SQL INSERT failed for HubSpot objectId=${hubSpotObjectId} — ` +
        `name="${hsCompany.name}", companyTypeId=${companyTypeId}, addressId=${addressId}. Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }

    if (!newCompanyId) {
      this.logger.error(
        `createCompanyFromHubSpot: Failed to insert company for HubSpot objectId=${hubSpotObjectId}.`,
      );
      return null;
    }

    // 4. Write back iae_company_id to HubSpot so future webhooks can match
    await this.updateHubSpotCompanyId(hubSpotObjectId, newCompanyId);

    this.logger.log(
      `createCompanyFromHubSpot: Created Company(${newCompanyId}) for HubSpot objectId=${hubSpotObjectId} — ` +
      `name="${hsCompany.name}", type="${hsCompany.type}", addressId=${addressId}`,
    );

    return newCompanyId;
  }

  /**
   * Find a CompanyType by name, or create it if it doesn't exist. Returns the CompanyTypeID.
   */
  private async resolveOrCreateCompanyTypeId(typeName: string): Promise<number> {
    const existing = await this.dataSource.query(
      `SELECT CompanyTypeID FROM dbo.CompanyType WHERE CompanyTypeName = @0`,
      [typeName],
    );
    if (existing.length > 0) {
      return existing[0].CompanyTypeID;
    }

    const insertResult = await this.dataSource.query(
      `INSERT INTO dbo.CompanyType (CompanyTypeName) VALUES (@0);
       SELECT SCOPE_IDENTITY() AS NewId;`,
      [typeName],
    );
    const newId = insertResult[0]?.NewId;
    this.logger.log(
      `resolveOrCreateCompanyTypeId: Created new CompanyType(${newId}) = "${typeName}"`,
    );
    return newId;
  }

  /**
   * Write iae_company_id back to HubSpot so future webhooks can match.
   * API: PATCH /crm/v3/objects/companies/{objectId}
   */
  private async updateHubSpotCompanyId(
    hubSpotObjectId: number,
    companyId: number,
  ): Promise<void> {
    const token = this.configService.get<string>('HUBSPOT_ACCESS_TOKEN');
    if (!token) {
      this.logger.error('HUBSPOT_ACCESS_TOKEN not configured. Cannot write iae_company_id back to HubSpot.');
      return;
    }

    const url = this.buildHubSpotUrl(`/crm/v3/objects/companies/${hubSpotObjectId}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { iae_company_id: String(companyId) },
      }),
    });

    if (!response.ok) {
      this.logger.error(
        `Failed to write iae_company_id back to HubSpot objectId=${hubSpotObjectId}: ${response.status} ${response.statusText}`,
      );
    } else {
      this.logger.log(
        `Wrote iae_company_id=${companyId} to HubSpot objectId=${hubSpotObjectId}.`,
      );
    }
  }
}
