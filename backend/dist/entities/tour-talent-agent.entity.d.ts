import { AuditColumns } from '../audit/audit-columns';
import { Contact } from './contact.entity';
import { Tour } from './tour.entity';
export declare class TourTalentAgent extends AuditColumns {
    tourTalentAgentId: number;
    tourId: number;
    tour: Tour;
    contactId: number;
    contact: Contact;
}
