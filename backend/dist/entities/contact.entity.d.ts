import { AuditColumns } from '../audit/audit-columns';
import { ContactInfo } from './contact-info.entity';
export declare class Contact extends AuditColumns {
    contactId: number;
    contactInfoId: number;
    contactInfo: ContactInfo;
}
