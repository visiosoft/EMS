import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook-event.dto';
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
export declare class HubSpotService {
    private readonly configService;
    private readonly dataSource;
    private readonly contactRepo;
    private readonly companyRepo;
    private readonly logger;
    private companyContactAssociationTypeCache;
    constructor(configService: ConfigService, dataSource: DataSource, contactRepo: Repository<Contact>, companyRepo: Repository<Company>);
    syncExternalContacts(options?: {
        dryRun?: boolean;
        limit?: number;
    }): Promise<HubSpotContactSyncResult>;
    queueContactSync(contactId: number): void;
    queueCompanySync(companyId: number): void;
    private syncContactIds;
    private syncCompanyId;
    private syncLoadedContacts;
    private getSyncSource;
    private loadExternalContacts;
    private loadExternalContactsByContactIds;
    private loadContactIdsForCompany;
    private emptySkipped;
    private dedupeContactsByEmail;
    private hasContactIsStaffColumn;
    private loadCompanies;
    private loadAllCompanies;
    private toHubSpotContactInput;
    private toHubSpotCompanyInput;
    private ensureContactProperties;
    private ensureCompanyProperties;
    private createPropertyIfMissing;
    private syncContacts;
    private findExistingContactIdsByEmail;
    private updateContactsByHubSpotId;
    private upsertContactsWithInvalidEmailRetry;
    private upsertObjects;
    private tryUpsertObjects;
    private extractHubSpotInvalidEmails;
    private extractInvalidEmailsFromMessage;
    private omitProperty;
    private toCompanyContactAssociationInputs;
    private getContactSyncKey;
    private createCompanyContactAssociations;
    private getCompanyToContactAssociationType;
    private buildHubSpotUrl;
    private pickRaw;
    private pushUniqueNumber;
    private pushUniqueText;
    private mergeUniqueNumbers;
    private mergeUniqueTexts;
    private uniqueNumbers;
    private toNullableNumber;
    private mergeHubSpotIds;
    handleWebhookEvents(events: HubSpotWebhookEventDto[]): Promise<void>;
}
