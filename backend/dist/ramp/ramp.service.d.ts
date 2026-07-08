import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
export interface RampTransaction {
    id: string;
    amount: number | null;
    minor_unit_conversion_rate: number | null;
    merchant_name: string | null;
    merchant_descriptor: string | null;
    merchant_category_code: string | null;
    merchant_category_code_description: string | null;
    merchant_id: string | null;
    merchant_location: {
        city: string | null;
        state: string | null;
        country: string | null;
        postal_code: string | null;
    } | null;
    sk_category_id: number | null;
    sk_category_name: string | null;
    memo: string | null;
    state: string | null;
    user_transaction_time: string | null;
    settlement_date: string | null;
    accounting_date: string | null;
    currency_code: string | null;
    card_id: string | null;
    card_present: boolean | null;
    card_holder: {
        first_name: string;
        last_name: string;
        user_id: string | null;
        employee_id: string | null;
        department_id: string | null;
        department_name: string | null;
        location_id: string | null;
        location_name: string | null;
    } | null;
    receipts?: string[];
    spend_program_id: string | null;
    department_id?: string | null;
    entity_id: string | null;
    fund_id: string | null;
    limit_id: string | null;
    trip_id: string | null;
    trip_name: string | null;
    sync_status: string | null;
    synced_at: string | null;
    all_requirements_met_and_approved: boolean | null;
    original_transaction_id: string | null;
    original_transaction_amount: {
        amount: number;
        currency_code: string;
        minor_unit_conversion_rate: number;
    } | null;
    network_merchant_id: string | null;
    updated_at: string | null;
    accounting_field_selections?: RampTransactionAccountingFieldSelection[];
    line_items?: Array<{
        accounting_field_selections?: RampTransactionAccountingFieldSelection[];
        amount?: {
            amount: number;
            currency_code: string;
            minor_unit_conversion_rate: number;
        };
        converted_amount?: {
            amount: number;
            currency_code: string;
            minor_unit_conversion_rate: number;
        };
        memo?: string | null;
    }>;
    policy_violations?: Array<Record<string, unknown>>;
    disputes?: Array<Record<string, unknown>>;
}
export interface RampTransactionAccountingFieldSelection {
    id: string;
    name: string;
    display_name?: string | null;
    external_id?: string | null;
    external_code?: string | null;
    provider_name?: string | null;
    type?: string | null;
    source?: {
        type: string;
    } | null;
    category_info?: {
        id: string;
        name: string;
        type: string;
        external_id?: string | null;
    } | null;
}
export interface RampBill {
    id: string;
    amount: {
        amount: number;
        currency_code: string;
        minor_unit_conversion_rate?: number;
    } | null;
    invoice_number: string | null;
    memo: string | null;
    due_at: string | null;
    issued_at: string | null;
    paid_at: string | null;
    status: string | null;
    status_summary: string | null;
    vendor: {
        id: string;
        name: string;
        remote_id?: string | null;
        remote_name?: string | null;
        remote_code?: string | null;
        type?: string | null;
    } | null;
    line_items: Array<{
        accounting_field_selections?: RampBillAccountingFieldSelection[];
        amount: {
            amount: number;
            currency_code: string;
            minor_unit_conversion_rate?: number;
        };
        memo: string | null;
        purchase_order_line_item_id?: string | null;
        item_receipt_line_item_ids?: string[];
    }>;
    accounting_field_selections?: RampBillAccountingFieldSelection[];
    accounting_date: string | null;
    approval_status: string | null;
    archived_at: string | null;
    bill_owner: {
        id: string;
        first_name: string;
        last_name: string;
    } | null;
    created_at: string | null;
    deep_link_url: string | null;
    draft_bill_id: string | null;
    entity_id: string | null;
    fx_conversion_rate: string | null;
    inventory_line_items?: Array<{
        accounting_field_selections?: RampBillAccountingFieldSelection[];
        memo: string | null;
        quantity: number | null;
        unit_price: number | null;
    }>;
    invoice_urls?: string[];
    item_receipt_ids?: string[];
    payment: {
        payment_method: string | null;
        payment_date: string | null;
        payment_arrival_date: string | null;
    } | null;
    posting_date: string | null;
    purchase_order_id: string | null;
    purchase_order_ids?: string[];
    remote_id: string | null;
    sync_status: string | null;
    vendor_contact_id: string | null;
    vendor_memo: string | null;
}
export interface RampBillAccountingFieldSelection {
    id: string;
    name: string;
    external_id?: string | null;
    external_code?: string | null;
    display_name?: string | null;
    provider_name?: string | null;
    category_info?: {
        id: string;
        name: string;
        type: string;
        external_id?: string | null;
    } | null;
}
export interface RampDepartment {
    id: string;
    name: string;
}
export interface RampUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id: string | null;
    role: string | null;
}
export interface RampVendor {
    id: string;
    name: string;
    name_legal: string | null;
    description: string | null;
    country: string;
    state: string | null;
    is_active: boolean;
    is_deletable: boolean;
    vendor_type: string | null;
    vendor_owner_id: string | null;
    merchant_id: string | null;
    parent_vendor_id: string | null;
    external_vendor_id: string | null;
    accounting_vendor_remote_id: string | null;
    sk_category_id: number | null;
    sk_category_name: string | null;
    billing_frequency: string | null;
    federal_tax_classification: string | null;
    default_entity_id: string | null;
    contacts: string[];
    address: {
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postal_code: string | null;
    } | null;
    addresses: Array<{
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postal_code: string | null;
        address_type?: string | null;
    }>;
    tax_address: {
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        postal_code: string | null;
    } | null;
    default_payment_method: {
        payment_method: string | null;
        source: string | null;
    } | null;
    total_spend_all_time: {
        amount: number;
        currency_code: string;
    } | null;
    total_spend_last_30_days: {
        amount: number;
        currency_code: string;
    } | null;
    total_spend_last_365_days: {
        amount: number;
        currency_code: string;
    } | null;
    total_spend_ytd: {
        amount: number;
        currency_code: string;
    } | null;
    created_at: string;
}
export interface RampReceipt {
    id: string;
    transaction_id: string | null;
    user_id: string | null;
    created_at: string | null;
    receipt_url: string;
    ocr?: {
        currency_code?: string | null;
        line_items?: Array<{
            description?: string | null;
            amount?: number | null;
            quantity?: number | null;
        }>;
        merchant_name?: string | null;
        subtotal?: number | null;
        tax?: number | null;
        tip?: number | null;
        total?: number | null;
        transaction_date?: string | null;
    } | null;
}
export interface RampSpendProgram {
    id: string;
    name: string;
    description: string | null;
    permitted_spend_types: string | null;
}
export interface RampMemo {
    id: string;
    memo: string | null;
    transaction_id?: string | null;
    user_id?: string | null;
    created_at?: string | null;
}
export interface RampAccountingConnection {
    id: string;
    remote_provider_name: string | null;
    connection_type: string;
    is_active: boolean;
    is_ready_to_migrate: boolean;
    last_linked_at: string | null;
    created_at: string;
    status: string;
    settings: Record<string, unknown> | null;
}
export interface RampAccountingConnectionsResponse {
    connections: RampAccountingConnection[];
}
export interface RampGlAccount {
    ramp_id: string;
    id: string | null;
    name: string;
    code: string | null;
    classification: string | null;
    is_active: boolean;
    provider_name: string | null;
    accounting_connection_id: string;
    entity_remote_ids: string[] | null;
    gl_account_category_info: Record<string, unknown> | null;
    created_at: string;
    updated_at: string | null;
}
export interface RampAccountingVendor {
    ramp_id: string;
    id: string | null;
    name: string;
    code: string | null;
    is_active: boolean;
    is_synced: boolean;
    provider_name: string | null;
    accounting_connection_id: string;
    entity_remote_ids: string[] | null;
    vendor_category_info: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}
export interface RampAccountingField {
    ramp_id: string;
    id: string | null;
    name: string;
    display_name: string | null;
    input_type: string;
    is_active: boolean;
    is_splittable?: boolean;
    is_required_for?: string[];
    provider_name?: string | null;
    accounting_connection_id?: string;
    created_at?: string;
    updated_at?: string | null;
}
export interface RampAccountingFieldOption {
    ramp_id: string;
    id: string | null;
    value: string;
    display_name: string | null;
    code: string | null;
    is_active: boolean;
    visibility?: string | null;
    provider_name?: string | null;
    accounting_connection_id?: string;
    entity_remote_ids?: string[] | null;
    created_at?: string;
    updated_at?: string | null;
}
export interface RampAccountingFieldSelection {
    field_id: string;
    field_option_id: string;
}
export interface RampPagedResponse<T> {
    data: T[];
    page: {
        next: string | null;
    };
}
export declare class RampService {
    private readonly config;
    private readonly dataSource;
    private readonly logger;
    private accessToken;
    private tokenExpiresAt;
    private readonly clientId;
    private readonly clientSecret;
    private readonly http;
    private accountingFieldsCache;
    private accountingFieldOptionsCache;
    private glAccountsCache;
    private accountingVendorsCache;
    constructor(config: ConfigService, dataSource: DataSource);
    private getAccessToken;
    private authHeaders;
    private toRampDatetime;
    private normalizeCursor;
    private getList;
    listTransactions(params?: {
        from_date?: string;
        to_date?: string;
        department_id?: string;
        user_id?: string;
        spend_program_id?: string;
        accounting_field_selection_id?: string;
        card_id?: string;
        entity_id?: string;
        merchant_id?: string;
        limit_id?: string;
        location_id?: string;
        trip_id?: string;
        statement_id?: string;
        state?: string;
        sync_status?: string;
        approval_status?: string;
        min_amount?: string;
        max_amount?: string;
        sk_category_id?: number;
        order_by_date_desc?: boolean;
        order_by_date_asc?: boolean;
        order_by_amount_desc?: boolean;
        order_by_amount_asc?: boolean;
        has_no_sync_commits?: boolean;
        has_statement?: boolean;
        has_been_approved?: boolean;
        all_requirements_met_and_approved?: boolean;
        requires_memo?: boolean;
        include_merchant_data?: boolean;
        synced_after?: string;
        awaiting_approval_by_user_id?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampTransaction>>;
    listBills(params?: {
        from_due_date?: string;
        to_due_date?: string;
        from_issued_date?: string;
        to_issued_date?: string;
        from_created_at?: string;
        to_created_at?: string;
        from_paid_at?: string;
        to_paid_at?: string;
        from_payment_date?: string;
        to_payment_date?: string;
        vendor_id?: string;
        entity_id?: string;
        payment_status?: string;
        payment_method?: string;
        approval_status?: string;
        sync_status?: string;
        status_summaries?: string;
        accounting_field_selection_id?: string;
        invoice_number?: string;
        remote_id?: string;
        draft_bill_id?: string;
        is_archived?: boolean;
        min_amount?: string;
        max_amount?: string;
        sync_ready?: boolean;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampBill>>;
    listDepartments(params?: {
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampDepartment>>;
    listUsers(params?: {
        department_id?: string;
        email?: string;
        employee_id?: string;
        entity_id?: string;
        location_id?: string;
        role?: string;
        status?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampUser>>;
    listVendors(params?: {
        name?: string;
        is_active?: boolean;
        merchant_id?: string;
        external_vendor_id?: string;
        vendor_owner_id?: string;
        from_created_at?: string;
        to_created_at?: string;
        from_updated_at?: string;
        to_updated_at?: string;
        include_draft?: boolean;
        include_subsidiary?: boolean;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampVendor>>;
    listReceipts(params?: {
        transaction_id?: string;
        reimbursement_id?: string;
        from_date?: string;
        to_date?: string;
        created_after?: string;
        created_before?: string;
        include_ocr_data?: boolean;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampReceipt>>;
    listSpendPrograms(params?: {
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampSpendProgram>>;
    listMemos(params?: {
        user_id?: string;
        department_id?: string;
        card_id?: string;
        location_id?: string;
        manager_id?: string;
        merchant_id?: string;
        from_date?: string;
        to_date?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampMemo>>;
    listAccountingConnections(): Promise<RampAccountingConnectionsResponse>;
    listGlAccounts(params?: {
        accounting_connection_id?: string;
        is_active?: boolean;
        code?: string;
        remote_id?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampGlAccount>>;
    getAllGlAccounts(): Promise<RampGlAccount[]>;
    listAccountingVendors(params?: {
        accounting_connection_id?: string;
        is_active?: boolean;
        is_synced?: boolean;
        code?: string;
        remote_id?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampAccountingVendor>>;
    getAllAccountingVendors(): Promise<RampAccountingVendor[]>;
    listAccounting(params?: {
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<Record<string, unknown>>>;
    listAccountingFields(params?: {
        accounting_connection_id?: string;
        is_active?: boolean;
        remote_id?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampAccountingField>>;
    getAllAccountingFields(): Promise<RampAccountingField[]>;
    listAccountingFieldOptions(fieldId: string, params?: {
        accounting_connection_id?: string;
        is_active?: boolean;
        code?: string;
        remote_id?: string;
        visibility?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampAccountingFieldOption>>;
    getAllAccountingFieldOptions(fieldId: string): Promise<RampAccountingFieldOption[]>;
    getCustomerJobFieldOptions(): Promise<{
        customerField: RampAccountingField | null;
        customerOptions: RampAccountingFieldOption[];
        jobField: RampAccountingField | null;
        jobOptions: RampAccountingFieldOption[];
        combinedField: RampAccountingField | null;
        combinedOptions: RampAccountingFieldOption[];
    }>;
    resolveEngagementRampIds(engagementId: number): Promise<{
        customerFieldOptionId: string | null;
        jobFieldOptionId: string | null;
        customerJobFieldOptionId: string | null;
        customerName: string | null;
        jobName: string | null;
    }>;
    private pickPrimaryFieldOptionId;
    private hasAccountingFieldSelection;
    getEngagementTransactions(engagementId: number, params?: {
        from_date?: string;
        to_date?: string;
        department_id?: string;
        user_id?: string;
        spend_program_id?: string;
        card_id?: string;
        entity_id?: string;
        merchant_id?: string;
        state?: string;
        sync_status?: string;
        min_amount?: string;
        max_amount?: string;
        sk_category_id?: number;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampTransaction>>;
    getEngagementBills(engagementId: number, params?: {
        from_due_date?: string;
        to_due_date?: string;
        from_issued_date?: string;
        to_issued_date?: string;
        from_created_at?: string;
        to_created_at?: string;
        from_paid_at?: string;
        to_paid_at?: string;
        vendor_id?: string;
        entity_id?: string;
        payment_status?: string;
        payment_method?: string;
        approval_status?: string;
        sync_status?: string;
        status_summaries?: string;
        invoice_number?: string;
        min_amount?: string;
        max_amount?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampBill>>;
    getReceipt(receiptId: string): Promise<RampReceipt>;
    getEngagementReceipts(engagementId: number, params?: {
        from_date?: string;
        to_date?: string;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampReceipt & {
        merchant_name: string | null;
        amount: number | null;
    }>>;
    getEngagementAccountingContext(engagementId: number): Promise<{
        mapping: {
            customerJobFieldOptionId: string | null;
            customerFieldOptionId: string | null;
            jobFieldOptionId: string | null;
            customerName: string | null;
            jobName: string | null;
        };
        matchedFields: RampAccountingField[];
        matchedOptions: RampAccountingFieldOption[];
        glAccounts: RampGlAccount[];
        accountingVendors: RampAccountingVendor[];
        allFields: RampAccountingField[];
        customerJobOptions: RampAccountingFieldOption[];
    }>;
    getEngagementVendors(engagementId: number, params?: {
        name?: string;
        is_active?: boolean;
        page_size?: number;
        start?: string;
    }): Promise<RampPagedResponse<RampVendor>>;
    isConfigured(): boolean;
}
