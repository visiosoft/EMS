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

    const existingIdsByEmail = await this.findExistingContactIdsByEmail(
      inputs.map((input) => clean(input.properties.email)).filter(Boolean),
      token,
    );

    const updates: { id: string; input: HubSpotObjectInput }[] = [];
    const creates: HubSpotObjectInput[] = [];
    for (const input of inputs) {
      const syncKey = input.id;
      const existingHubSpotId = existingIdsByEmail.get(
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
    for (const event of events) {
      try {
        switch (event.subscriptionType) {
          case 'contact.creation':
            // TODO: Map HubSpot objectId to internal ContactID.
            // Currently there is no HubSpotContactId column on Contact/ContactInfo.
            // Once a mapping exists, call queueContactSync with the internal ID.
            this.logger.log(
              `Webhook: contact.creation for HubSpot objectId=${event.objectId}. No internal mapping yet — skipping.`,
            );
            break;

          case 'contact.propertyChange':
            // TODO: Map HubSpot objectId to internal ContactID and update the changed property.
            // Requires a HubSpotContactId lookup column or mapping table.
            this.logger.log(
              `Webhook: contact.propertyChange for HubSpot objectId=${event.objectId}, property=${event.propertyName}. No internal mapping yet — skipping.`,
            );
            break;

          case 'company.creation':
          case 'company.propertyChange':
            // TODO: Map HubSpot objectId to internal CompanyID.
            // Once available, route through queueCompanySync(internalCompanyId).
            this.logger.log(
              `Webhook: ${event.subscriptionType} for HubSpot objectId=${event.objectId}. No internal mapping yet — skipping.`,
            );
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
}
