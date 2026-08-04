import { RampService } from './ramp.service';
export declare class RampController {
    private readonly rampService;
    constructor(rampService: RampService);
    getStatus(): {
        configured: boolean;
    };
    listTransactions(fromDate?: string, toDate?: string, departmentId?: string, userId?: string, spendProgramId?: string, accountingFieldSelectionId?: string, cardId?: string, entityId?: string, merchantId?: string, limitId?: string, locationId?: string, tripId?: string, statementId?: string, state?: string, syncStatus?: string, approvalStatus?: string, minAmount?: string, maxAmount?: string, skCategoryId?: string, orderByDateDesc?: string, orderByDateAsc?: string, orderByAmountDesc?: string, orderByAmountAsc?: string, hasNoSyncCommits?: string, hasStatement?: string, hasBeenApproved?: string, allRequirementsMet?: string, requiresMemo?: string, includeMerchantData?: string, syncedAfter?: string, awaitingApprovalByUserId?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampTransaction>>;
    listBills(fromDueDate?: string, toDueDate?: string, fromIssuedDate?: string, toIssuedDate?: string, fromCreatedAt?: string, toCreatedAt?: string, fromPaidAt?: string, toPaidAt?: string, fromPaymentDate?: string, toPaymentDate?: string, vendorId?: string, entityId?: string, paymentStatus?: string, paymentMethod?: string, approvalStatus?: string, syncStatus?: string, statusSummaries?: string, accountingFieldSelectionId?: string, invoiceNumber?: string, remoteId?: string, draftBillId?: string, isArchived?: string, minAmount?: string, maxAmount?: string, syncReady?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampBill>>;
    listDepartments(pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampDepartment>>;
    listUsers(departmentId?: string, email?: string, employeeId?: string, entityId?: string, locationId?: string, role?: string, status?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampUser>>;
    listVendors(name?: string, isActive?: string, merchantId?: string, externalVendorId?: string, vendorOwnerId?: string, fromCreatedAt?: string, toCreatedAt?: string, fromUpdatedAt?: string, toUpdatedAt?: string, includeDraft?: string, includeSubsidiary?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampVendor>>;
    listReceipts(transactionId?: string, reimbursementId?: string, fromDate?: string, toDate?: string, createdAfter?: string, createdBefore?: string, includeOcrData?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampReceipt>>;
    listSpendPrograms(pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampSpendProgram>>;
    listMemos(userId?: string, departmentId?: string, cardId?: string, locationId?: string, managerId?: string, merchantId?: string, fromDate?: string, toDate?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampMemo>>;
    listAccountingConnections(): Promise<import("./ramp.service").RampAccountingConnectionsResponse>;
    listGlAccounts(accountingConnectionId?: string, isActive?: string, code?: string, remoteId?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampGlAccount>>;
    listAccountingFields(accountingConnectionId?: string, isActive?: string, remoteId?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampAccountingField>>;
    listAccountingFieldOptions(fieldId: string, accountingConnectionId?: string, isActive?: string, code?: string, remoteId?: string, visibility?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampAccountingFieldOption>>;
    listAccountingVendors(accountingConnectionId?: string, isActive?: string, isSynced?: string, code?: string, remoteId?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampAccountingVendor>>;
    getCustomerJobFieldOptions(): Promise<{
        customerField: import("./ramp.service").RampAccountingField | null;
        customerOptions: import("./ramp.service").RampAccountingFieldOption[];
        jobField: import("./ramp.service").RampAccountingField | null;
        jobOptions: import("./ramp.service").RampAccountingFieldOption[];
        combinedField: import("./ramp.service").RampAccountingField | null;
        combinedOptions: import("./ramp.service").RampAccountingFieldOption[];
    }>;
    listAccounting(pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<Record<string, unknown>>>;
    getEngagementMapping(engagementId: number): Promise<{
        customerFieldOptionId: string | null;
        jobFieldOptionId: string | null;
        customerJobFieldOptionId: string | null;
        customerName: string | null;
        jobName: string | null;
    }>;
    getEngagementTransactions(engagementId: number, fromDate?: string, toDate?: string, departmentId?: string, userId?: string, spendProgramId?: string, cardId?: string, entityId?: string, merchantId?: string, state?: string, syncStatus?: string, minAmount?: string, maxAmount?: string, skCategoryId?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampTransaction>>;
    getEngagementBills(engagementId: number, fromDueDate?: string, toDueDate?: string, fromIssuedDate?: string, toIssuedDate?: string, fromCreatedAt?: string, toCreatedAt?: string, fromPaidAt?: string, toPaidAt?: string, vendorId?: string, entityId?: string, paymentStatus?: string, paymentMethod?: string, approvalStatus?: string, syncStatus?: string, statusSummaries?: string, invoiceNumber?: string, minAmount?: string, maxAmount?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampBill>>;
    getEngagementReceipts(engagementId: number, fromDate?: string, toDate?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampReceipt & {
        merchant_name: string | null;
        amount: number | null;
    }>>;
    getEngagementVendors(engagementId: number, name?: string, isActive?: string, pageSize?: string, start?: string): Promise<import("./ramp.service").RampPagedResponse<import("./ramp.service").RampVendor>>;
    getEngagementAccounting(engagementId: number): Promise<{
        mapping: {
            customerJobFieldOptionId: string | null;
            customerFieldOptionId: string | null;
            jobFieldOptionId: string | null;
            customerName: string | null;
            jobName: string | null;
        };
        matchedFields: import("./ramp.service").RampAccountingField[];
        matchedOptions: import("./ramp.service").RampAccountingFieldOption[];
        glAccounts: import("./ramp.service").RampGlAccount[];
        accountingVendors: import("./ramp.service").RampAccountingVendor[];
        allFields: import("./ramp.service").RampAccountingField[];
        customerJobOptions: import("./ramp.service").RampAccountingFieldOption[];
    }>;
}
