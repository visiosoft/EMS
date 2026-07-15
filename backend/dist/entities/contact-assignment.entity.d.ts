import { AuditColumns } from '../audit/audit-columns';
import { Company } from './company.entity';
import { Contact } from './contact.entity';
import { Department } from './department.entity';
import { Role } from './role.entity';
export declare class ContactAssignment extends AuditColumns {
    contactAssignmentId: number;
    contactId: number;
    contact: Contact;
    companyId: number;
    company: Company;
    roleId: number;
    role: Role;
    departmentId: number;
    department: Department;
}
