import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DataSource } from 'typeorm';

const RAMP_API_BASE = 'https://api.ramp.com/developer/v1';
const RAMP_TOKEN_URL = `${RAMP_API_BASE}/token`;

/** Required scopes for EMS integration. */
const RAMP_SCOPES = [
  'accounting:read',
  'bills:read',
  'departments:read',
  'memos:read',
  'receipts:read',
  'spend_programs:read',
  'transactions:read',
  'users:read',
  'vendors:read',
].join(' ');

// ─── Response interfaces ──────────────────────────────────────────────────────

export interface RampTransaction {
  id: string;
  amount: number | null;
  minor_unit_conversion_rate: number | null;
  merchant_name: string | null;
  merchant_descriptor: string | null;
  merchant_category_code: string | null;
  merchant_category_code_description: string | null;
  merchant_id: string | null;
  merchant_location: { city: string | null; state: string | null; country: string | null; postal_code: string | null } | null;
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
  original_transaction_amount: { amount: number; currency_code: string; minor_unit_conversion_rate: number } | null;
  network_merchant_id: string | null;
  updated_at: string | null;
  accounting_field_selections?: RampTransactionAccountingFieldSelection[];
  line_items?: Array<{
    accounting_field_selections?: RampTransactionAccountingFieldSelection[];
    amount?: { amount: number; currency_code: string; minor_unit_conversion_rate: number };
    converted_amount?: { amount: number; currency_code: string; minor_unit_conversion_rate: number };
    memo?: string | null;
  }>;
  policy_violations?: Array<Record<string, unknown>>;
  disputes?: Array<Record<string, unknown>>;
}

/** Accounting field selection on a transaction — richer structure from the API. */
export interface RampTransactionAccountingFieldSelection {
  id: string;
  name: string;
  display_name?: string | null;
  external_id?: string | null;
  external_code?: string | null;
  provider_name?: string | null;
  type?: string | null;
  source?: { type: string } | null;
  category_info?: {
    id: string;
    name: string;
    type: string;
    external_id?: string | null;
  } | null;
}

export interface RampBill {
  id: string;
  amount: { amount: number; currency_code: string; minor_unit_conversion_rate?: number } | null;
  invoice_number: string | null;
  memo: string | null;
  due_at: string | null;
  issued_at: string | null;
  paid_at: string | null;
  status: string | null;
  status_summary: string | null;
  vendor: { id: string; name: string; remote_id?: string | null; remote_name?: string | null; remote_code?: string | null; type?: string | null } | null;
  line_items: Array<{
    accounting_field_selections?: RampBillAccountingFieldSelection[];
    amount: { amount: number; currency_code: string; minor_unit_conversion_rate?: number };
    memo: string | null;
    purchase_order_line_item_id?: string | null;
    item_receipt_line_item_ids?: string[];
  }>;
  accounting_field_selections?: RampBillAccountingFieldSelection[];
  accounting_date: string | null;
  approval_status: string | null;
  archived_at: string | null;
  bill_owner: { id: string; first_name: string; last_name: string } | null;
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

/** Accounting field selection on a bill or line item — richer than the transaction version. */
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
  total_spend_all_time: { amount: number; currency_code: string } | null;
  total_spend_last_30_days: { amount: number; currency_code: string } | null;
  total_spend_last_365_days: { amount: number; currency_code: string } | null;
  total_spend_ytd: { amount: number; currency_code: string } | null;
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
  page: { next: string | null };
}

@Injectable()
export class RampService {
  private readonly logger = new Logger(RampService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly http: AxiosInstance;
  private accountingFieldsCache: { data: RampAccountingField[]; expiresAt: number } | null = null;
  private accountingFieldOptionsCache = new Map<string, { data: RampAccountingFieldOption[]; expiresAt: number }>();
  private glAccountsCache: { data: RampGlAccount[]; expiresAt: number } | null = null;
  private accountingVendorsCache: { data: RampAccountingVendor[]; expiresAt: number } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.clientId = this.config.get<string>('RAMP_CLIENT_ID', '');
    this.clientSecret = this.config.get<string>('RAMP_CLIENT_SECRET', '');
    this.http = axios.create({ baseURL: RAMP_API_BASE });
  }

  // ─── Token management ─────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    if (!this.clientId || !this.clientSecret) {
      throw new Error('RAMP_CLIENT_ID or RAMP_CLIENT_SECRET not configured');
    }
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const res = await axios.post(
      RAMP_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: RAMP_SCOPES,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    this.accessToken = res.data.access_token;
    // Expire 60 s before actual expiry to avoid edge-case failures
    this.tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Ramp expects ISO8601 datetime (e.g. "2026-07-06T00:00:00").
   * If a bare date "YYYY-MM-DD" is passed, append T00:00:00.
   */
  private toRampDatetime(value: string | undefined): string | undefined {
    if (!value) return undefined;
    // Already has time component
    if (value.includes('T')) return value;
    // Bare date → append midnight
    return `${value}T00:00:00`;
  }

  // ─── Pagination helpers ───────────────────────────────────────────────────

  /**
   * Ramp returns `page.next` as a full URL (`<BASE_URL>?...&start=<cursor>`),
   * but the `start` query param expects only the bare cursor. Normalize it so
   * the value can be passed straight back into a follow-up request.
   */
  private normalizeCursor(next: string | null | undefined): string | null {
    if (!next) return null;
    if (!next.includes('?') && !next.includes('://')) return next; // already a bare cursor
    try {
      const url = new URL(next, RAMP_API_BASE);
      return url.searchParams.get('start');
    } catch {
      return next;
    }
  }

  /** GET a Ramp list endpoint and return the response with a normalized cursor. */
  private async getList<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<RampPagedResponse<T>> {
    const headers = await this.authHeaders();
    // Strip undefined/null params so axios doesn't send them as "undefined"
    const cleanParams = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      : undefined;
    try {
      const res = await this.http.get(path, { headers, params: cleanParams });
      const body = res.data as RampPagedResponse<T>;
      return {
        data: body.data ?? [],
        page: { next: this.normalizeCursor(body.page?.next) },
      };
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data;
      this.logger.error(
        `Ramp API error on ${path}: status=${status}, detail=${JSON.stringify(detail)}, params=${JSON.stringify(cleanParams)}`,
      );
      throw err;
    }
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async listTransactions(params?: {
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
  }): Promise<RampPagedResponse<RampTransaction>> {
    return this.getList<RampTransaction>('/transactions', params);
  }

  // ─── Bills ────────────────────────────────────────────────────────────────

  async listBills(params?: {
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
  }): Promise<RampPagedResponse<RampBill>> {
    return this.getList<RampBill>('/bills', params);
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  async listDepartments(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampDepartment>> {
    return this.getList<RampDepartment>('/departments', params);
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(params?: {
    department_id?: string;
    email?: string;
    employee_id?: string;
    entity_id?: string;
    location_id?: string;
    role?: string;
    status?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampUser>> {
    return this.getList<RampUser>('/users', params);
  }

  // ─── Vendors ──────────────────────────────────────────────────────────────

  /**
   * List bill-pay vendors (payees) from Ramp.
   * Scope: vendors:read
   * Endpoint: GET /vendors
   */
  async listVendors(params?: {
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
  }): Promise<RampPagedResponse<RampVendor>> {
    return this.getList<RampVendor>('/vendors', params);
  }

  // ─── Receipts ─────────────────────────────────────────────────────────────

  async listReceipts(params?: {
    transaction_id?: string;
    reimbursement_id?: string;
    from_date?: string;
    to_date?: string;
    created_after?: string;
    created_before?: string;
    include_ocr_data?: boolean;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampReceipt>> {
    return this.getList<RampReceipt>('/receipts', params);
  }

  // ─── Spend Programs ───────────────────────────────────────────────────────

  async listSpendPrograms(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampSpendProgram>> {
    return this.getList<RampSpendProgram>('/spend-programs', params);
  }

  // ─── Memos ────────────────────────────────────────────────────────────────

  async listMemos(params?: {
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
  }): Promise<RampPagedResponse<RampMemo>> {
    return this.getList<RampMemo>('/memos', params);
  }

  // ─── Accounting ───────────────────────────────────────────────────────────

  /**
   * List all accounting connections for the current business.
   * Endpoint: GET /accounting/all-connections
   * Scope: accounting:read
   */
  async listAccountingConnections(): Promise<RampAccountingConnectionsResponse> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/accounting/all-connections', { headers });
    return res.data as RampAccountingConnectionsResponse;
  }

  /**
   * List general ledger (GL) accounts from the chart of accounts.
   * Supports pagination, filtering by active status, code, or remote_id.
   * Endpoint: GET /accounting/accounts
   * Scope: accounting:read
   */
  async listGlAccounts(params?: {
    accounting_connection_id?: string;
    is_active?: boolean;
    code?: string;
    remote_id?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampGlAccount>> {
    return this.getList<RampGlAccount>('/accounting/accounts', params);
  }

  /**
   * Fetch all GL accounts across all pages.
   * Results are cached for 5 minutes to reduce API calls.
   */
  async getAllGlAccounts(): Promise<RampGlAccount[]> {
    if (this.glAccountsCache && Date.now() < this.glAccountsCache.expiresAt) {
      return this.glAccountsCache.data;
    }
    const all: RampGlAccount[] = [];
    let start: string | undefined;
    do {
      const res = await this.listGlAccounts({ page_size: 100, start });
      all.push(...res.data);
      start = res.page.next ?? undefined;
    } while (start);
    this.glAccountsCache = { data: all, expiresAt: Date.now() + 300_000 };
    return all;
  }

  /**
   * List accounting vendors from the ERP integration.
   * Supports pagination, filtering by active status, code, remote_id, or sync status.
   * Endpoint: GET /accounting/vendors
   * Scope: accounting:read
   */
  async listAccountingVendors(params?: {
    accounting_connection_id?: string;
    is_active?: boolean;
    is_synced?: boolean;
    code?: string;
    remote_id?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampAccountingVendor>> {
    return this.getList<RampAccountingVendor>('/accounting/vendors', params);
  }

  /**
   * Fetch all accounting vendors across all pages.
   * Results are cached for 5 minutes to reduce API calls.
   */
  async getAllAccountingVendors(): Promise<RampAccountingVendor[]> {
    if (this.accountingVendorsCache && Date.now() < this.accountingVendorsCache.expiresAt) {
      return this.accountingVendorsCache.data;
    }
    const all: RampAccountingVendor[] = [];
    let start: string | undefined;
    do {
      const res = await this.listAccountingVendors({ page_size: 100, start });
      all.push(...res.data);
      start = res.page.next ?? undefined;
    } while (start);
    this.accountingVendorsCache = { data: all, expiresAt: Date.now() + 300_000 };
    return all;
  }

  async listAccounting(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<Record<string, unknown>>> {
    return this.getList<Record<string, unknown>>('/accounting', params);
  }

  // ─── Accounting Fields ────────────────────────────────────────────────────

  /**
   * List custom accounting fields.
   * Supports pagination and filtering by active status or remote_id.
   * Endpoint: GET /accounting/fields
   * Scope: accounting:read
   */
  async listAccountingFields(params?: {
    accounting_connection_id?: string;
    is_active?: boolean;
    remote_id?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampAccountingField>> {
    return this.getList<RampAccountingField>('/accounting/fields', params);
  }

  /**
   * Fetch all custom accounting fields across all pages.
   * Results are cached for 5 minutes to reduce API calls.
   */
  async getAllAccountingFields(): Promise<RampAccountingField[]> {
    if (this.accountingFieldsCache && Date.now() < this.accountingFieldsCache.expiresAt) {
      return this.accountingFieldsCache.data;
    }
    const all: RampAccountingField[] = [];
    let start: string | undefined;
    do {
      const res = await this.listAccountingFields({ page_size: 100, start });
      all.push(...res.data);
      start = res.page.next ?? undefined;
    } while (start);
    this.accountingFieldsCache = { data: all, expiresAt: Date.now() + 300_000 };
    return all;
  }

  /**
   * List custom accounting field options for a given field.
   * Supports pagination and filtering by active status, code, remote_id, or visibility.
   * Endpoint: GET /accounting/field-options
   * Scope: accounting:read
   */
  async listAccountingFieldOptions(
    fieldId: string,
    params?: {
      accounting_connection_id?: string;
      is_active?: boolean;
      code?: string;
      remote_id?: string;
      visibility?: string;
      page_size?: number;
      start?: string;
    },
  ): Promise<RampPagedResponse<RampAccountingFieldOption>> {
    return this.getList<RampAccountingFieldOption>('/accounting/field-options', {
      field_id: fieldId,
      ...params,
    });
  }

  /**
   * Fetch all custom accounting field options for a given field across all pages.
   * Results are cached for 5 minutes per field to reduce API calls.
   */
  async getAllAccountingFieldOptions(fieldId: string): Promise<RampAccountingFieldOption[]> {
    const cached = this.accountingFieldOptionsCache.get(fieldId);
    if (cached && Date.now() < cached.expiresAt) return cached.data;
    const all: RampAccountingFieldOption[] = [];
    let start: string | undefined;
    do {
      const res = await this.listAccountingFieldOptions(fieldId, { page_size: 100, start });
      all.push(...res.data);
      start = res.page.next ?? undefined;
    } while (start);
    this.accountingFieldOptionsCache.set(fieldId, { data: all, expiresAt: Date.now() + 300_000 });
    return all;
  }

  /**
   * Retrieve Customer/Job data represented as Ramp Custom Fields and Custom Field Options.
   * If no "Customer" or "Job" custom field exists in Ramp, returns empty collections
   * with an informational log rather than throwing an exception.
   *
   * Customer/Job data is NOT expected from QuickBooks via Ramp — instead these are
   * represented as Ramp Custom Fields and their Options when synced from an ERP.
   */
  async getCustomerJobFieldOptions(): Promise<{
    customerField: RampAccountingField | null;
    customerOptions: RampAccountingFieldOption[];
    jobField: RampAccountingField | null;
    jobOptions: RampAccountingFieldOption[];
  }> {
    const fields = await this.getAllAccountingFields();

    const customerField = fields.find(
      (f) =>
        f.name?.toLowerCase() === 'customer' ||
        f.display_name?.toLowerCase() === 'customer',
    ) ?? null;

    const jobField = fields.find(
      (f) =>
        f.name?.toLowerCase() === 'job' ||
        f.display_name?.toLowerCase() === 'job',
    ) ?? null;

    let customerOptions: RampAccountingFieldOption[] = [];
    if (customerField) {
      customerOptions = await this.getAllAccountingFieldOptions(customerField.ramp_id);
    } else {
      this.logger.log(
        'No "Customer" custom accounting field found in Ramp. ' +
          'Customer/Job data is expected as Ramp Custom Fields, not QuickBooks records.',
      );
    }

    let jobOptions: RampAccountingFieldOption[] = [];
    if (jobField) {
      jobOptions = await this.getAllAccountingFieldOptions(jobField.ramp_id);
    } else {
      this.logger.log(
        'No "Job" custom accounting field found in Ramp. ' +
          'Customer/Job data is expected as Ramp Custom Fields, not QuickBooks records.',
      );
    }

    return { customerField, customerOptions, jobField, jobOptions };
  }

  // ─── Engagement → Ramp mapping ────────────────────────────────────────────

  /**
   * Resolves which Ramp accounting field option(s) correspond to the given
   * EMS Engagement. Ramp may expose Customer/Job as:
   *   a) A single combined "Customer/Job" field (QuickBooks-style, e.g. "Customer:Job")
   *   b) Separate "Customer" and "Job" fields
   *
   * The method tries both strategies and returns the matched option IDs.
   * If no match is found, returns nulls — callers should return empty data
   * rather than unfiltered results.
   */
  async resolveEngagementRampIds(engagementId: number): Promise<{
    customerFieldOptionId: string | null;
    jobFieldOptionId: string | null;
    customerJobFieldOptionId: string | null;
    customerName: string | null;
    jobName: string | null;
  }> {
    const eid = Math.floor(Number(engagementId));
    if (!Number.isFinite(eid) || eid < 1) {
      throw new NotFoundException(`Invalid engagement ID`);
    }

    this.logger.log(`[Engagement #${eid}] Resolving Ramp Customer/Job mapping…`);

    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT
         dma.MarketName   AS dmaMarketName,
         j.JobName        AS jobName,
         j.JobCode        AS jobCode,
         t.TourName       AS tourName,
         a.AttractionName AS attractionName
       FROM dbo.Engagement e
       INNER JOIN dbo.Tour       t   ON t.TourID       = e.TourID
       LEFT  JOIN dbo.Attraction a   ON a.AttractionID = t.AttractionID
       LEFT  JOIN dbo.Job        j   ON j.JobID        = t.JobID
       LEFT  JOIN dbo.EngagementVenue ev ON ev.EngagementID = e.EngagementID AND ev.IsPrimary = 1
       LEFT  JOIN dbo.Company    vc  ON vc.CompanyID    = ev.VenueCompanyID
       LEFT  JOIN dbo.DMA        dma ON dma.DMAID       = vc.DMAID
       WHERE e.EngagementID = @0`,
      [eid],
    );
    if (!rows?.length) throw new NotFoundException(`Engagement #${eid} not found`);

    const row = rows[0];
    const dmaMarketName = (row.dmaMarketName as string)?.trim() || null;
    const jobName = (row.jobName as string)?.trim() || null;
    const tourName = (row.tourName as string)?.trim() || null;
    const attractionName = (row.attractionName as string)?.trim() || null;
    // Ramp "Job" maps to Attraction name (the show/act), not the Tour name
    const resolvedJobName = attractionName ?? jobName ?? tourName;

    this.logger.log(
      `[Engagement #${eid}] EMS data → customer="${dmaMarketName}", job="${resolvedJobName}"`,
    );

    const fields = await this.getAllAccountingFields();

    // Strategy A: Combined "Customer/Job" field (QuickBooks pattern)
    const combinedField = fields.find(
      (f) =>
        f.name?.toLowerCase() === 'customer/job' ||
        f.display_name?.toLowerCase().includes('customer') &&
          f.display_name?.toLowerCase().includes('job'),
    );

    // Strategy B: Separate "Customer" and "Job" fields
    const customerField = fields.find(
      (f) =>
        (f.name?.toLowerCase() === 'customer' ||
          f.display_name?.toLowerCase() === 'customer') &&
        f.ramp_id !== combinedField?.ramp_id,
    );
    const jobField = fields.find(
      (f) =>
        (f.name?.toLowerCase() === 'job' ||
          f.display_name?.toLowerCase() === 'job') &&
        f.ramp_id !== combinedField?.ramp_id,
    );

    let customerJobFieldOptionId: string | null = null;
    let customerFieldOptionId: string | null = null;
    let jobFieldOptionId: string | null = null;

    // ── Strategy A: match against combined "Customer/Job" field ─────────
    if (combinedField) {
      this.logger.log(
        `[Engagement #${eid}] Found combined Customer/Job field: ramp_id=${combinedField.ramp_id}`,
      );
      const options = await this.getAllAccountingFieldOptions(combinedField.ramp_id);

      // Build candidate match strings (QuickBooks uses "Customer:Job" format)
      const candidates: string[] = [];
      if (dmaMarketName && resolvedJobName) {
        candidates.push(`${dmaMarketName}:${resolvedJobName}`);
        candidates.push(`${dmaMarketName} : ${resolvedJobName}`);
      }
      // Also try just the job name or customer name alone
      if (resolvedJobName) candidates.push(resolvedJobName);
      if (dmaMarketName) candidates.push(dmaMarketName);
      // Try partial match — option value contains the job name
      for (const candidate of candidates) {
        const match = options.find(
          (o) => o.value?.trim().toLowerCase() === candidate.toLowerCase(),
        );
        if (match) {
          customerJobFieldOptionId = match.ramp_id;
          this.logger.log(
            `[Engagement #${eid}] Matched combined field option: "${match.value}" (ramp_id=${match.ramp_id})`,
          );
          break;
        }
      }

      // Fallback: partial/contains match if exact didn't work
      if (!customerJobFieldOptionId && resolvedJobName) {
        const partialMatch = options.find(
          (o) =>
            o.value?.trim().toLowerCase().includes(resolvedJobName.toLowerCase()) ||
            (dmaMarketName &&
              o.value?.trim().toLowerCase().includes(dmaMarketName.toLowerCase())),
        );
        if (partialMatch) {
          customerJobFieldOptionId = partialMatch.ramp_id;
          this.logger.log(
            `[Engagement #${eid}] Partial match on combined field option: "${partialMatch.value}" (ramp_id=${partialMatch.ramp_id})`,
          );
        }
      }

      if (!customerJobFieldOptionId) {
        this.logger.log(
          `[Engagement #${eid}] No match found in combined Customer/Job field ` +
            `(${options.length} options checked)`,
        );
      }
    }

    // ── Strategy B: match against separate Customer / Job fields ────────
    if (customerField && dmaMarketName) {
      const options = await this.getAllAccountingFieldOptions(customerField.ramp_id);
      const match = options.find(
        (o) => o.value?.trim().toLowerCase() === dmaMarketName.toLowerCase(),
      );
      customerFieldOptionId = match?.ramp_id ?? null;
      if (match) {
        this.logger.log(
          `[Engagement #${eid}] Matched Customer field option: "${match.value}" (ramp_id=${match.ramp_id})`,
        );
      }
    }

    if (jobField && resolvedJobName) {
      const options = await this.getAllAccountingFieldOptions(jobField.ramp_id);
      const candidates = [attractionName, jobName, tourName].filter(Boolean) as string[];
      for (const name of candidates) {
        const match = options.find(
          (o) => o.value?.trim().toLowerCase() === name.toLowerCase(),
        );
        if (match) {
          jobFieldOptionId = match.ramp_id;
          this.logger.log(
            `[Engagement #${eid}] Matched Job field option: "${match.value}" (ramp_id=${match.ramp_id})`,
          );
          break;
        }
      }
    }

    // Log summary
    const hasMatch = !!(customerJobFieldOptionId || customerFieldOptionId || jobFieldOptionId);
    this.logger.log(
      `[Engagement #${eid}] Mapping result: ` +
        `combinedId=${customerJobFieldOptionId ?? 'null'}, ` +
        `customerId=${customerFieldOptionId ?? 'null'}, ` +
        `jobId=${jobFieldOptionId ?? 'null'}, ` +
        `matched=${hasMatch}`,
    );

    return {
      customerFieldOptionId,
      jobFieldOptionId,
      customerJobFieldOptionId,
      customerName: dmaMarketName,
      jobName: resolvedJobName,
    };
  }

  /**
   * Returns the primary accounting_field_selection_id to filter Ramp data by
   * for a given engagement. Prefers combined > customer > job.
   */
  private pickPrimaryFieldOptionId(mapping: {
    customerJobFieldOptionId: string | null;
    customerFieldOptionId: string | null;
    jobFieldOptionId: string | null;
  }): string | null {
    return (
      mapping.customerJobFieldOptionId ??
      mapping.customerFieldOptionId ??
      mapping.jobFieldOptionId ??
      null
    );
  }

  private hasAccountingFieldSelection(
    item: {
      accounting_field_selections?: Array<{ field_option_id?: string; id?: string }>;
      line_items?: Array<{ accounting_field_selections?: Array<{ field_option_id?: string; id?: string }> }>;
    },
    fieldOptionId: string,
  ): boolean {
    // Transactions use { field_option_id }, bills use { id } — check both
    if (item.accounting_field_selections?.some(
      (s) => s.field_option_id === fieldOptionId || s.id === fieldOptionId,
    )) {
      return true;
    }
    if (
      item.line_items?.some((li) =>
        li.accounting_field_selections?.some(
          (s) => s.field_option_id === fieldOptionId || s.id === fieldOptionId,
        ),
      )
    ) {
      return true;
    }
    return false;
  }

  async getEngagementTransactions(
    engagementId: number,
    params?: {
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
    },
  ): Promise<RampPagedResponse<RampTransaction>> {
    const ids = await this.resolveEngagementRampIds(engagementId);
    const primaryId = this.pickPrimaryFieldOptionId(ids);
    if (!primaryId) {
      this.logger.log(`[Engagement #${engagementId}] No Ramp field option match — returning empty transactions`);
      return { data: [], page: { next: null } };
    }

    // If we matched a combined field, there's no secondary filter needed.
    // If separate customer+job both matched, use job as a secondary client-side filter.
    const secondaryId =
      !ids.customerJobFieldOptionId && ids.customerFieldOptionId && ids.jobFieldOptionId
        ? ids.jobFieldOptionId
        : null;

    this.logger.log(
      `[Engagement #${engagementId}] Fetching transactions: primaryId=${primaryId}, secondaryId=${secondaryId ?? 'none'}`,
    );

    const targetSize = params?.page_size ?? 20;
    const filtered: RampTransaction[] = [];
    let cursor: string | undefined = params?.start;
    let next: string | null = null;

    for (let page = 0; page < 10 && filtered.length < targetSize; page++) {
      const apiParams: Record<string, unknown> = {
        accounting_field_selection_id: primaryId,
        page_size: 100,
      };
      if (params?.from_date) apiParams.from_date = this.toRampDatetime(params.from_date);
      if (params?.to_date) apiParams.to_date = this.toRampDatetime(params.to_date);
      if (params?.department_id) apiParams.department_id = params.department_id;
      if (params?.user_id) apiParams.user_id = params.user_id;
      if (params?.spend_program_id) apiParams.spend_program_id = params.spend_program_id;
      if (params?.card_id) apiParams.card_id = params.card_id;
      if (params?.entity_id) apiParams.entity_id = params.entity_id;
      if (params?.merchant_id) apiParams.merchant_id = params.merchant_id;
      if (params?.state) apiParams.state = params.state;
      if (params?.sync_status) apiParams.sync_status = params.sync_status;
      if (params?.min_amount) apiParams.min_amount = params.min_amount;
      if (params?.max_amount) apiParams.max_amount = params.max_amount;
      if (params?.sk_category_id) apiParams.sk_category_id = params.sk_category_id;
      if (cursor) apiParams.start = cursor;

      const result = await this.getList<RampTransaction>('/transactions', apiParams);
      for (const tx of result.data) {
        if (secondaryId) {
          if (this.hasAccountingFieldSelection(tx, secondaryId)) filtered.push(tx);
        } else {
          filtered.push(tx);
        }
      }

      next = result.page.next;
      cursor = next ?? undefined;
      if (!next) break;
    }

    this.logger.log(`[Engagement #${engagementId}] Transactions matched: ${filtered.length}`);
    return { data: filtered, page: { next } };
  }

  async getEngagementBills(
    engagementId: number,
    params?: {
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
    },
  ): Promise<RampPagedResponse<RampBill>> {
    const ids = await this.resolveEngagementRampIds(engagementId);
    const primaryId = this.pickPrimaryFieldOptionId(ids);
    if (!primaryId) {
      this.logger.log(`[Engagement #${engagementId}] No Ramp field option match — returning empty bills`);
      return { data: [], page: { next: null } };
    }

    const secondaryId =
      !ids.customerJobFieldOptionId && ids.customerFieldOptionId && ids.jobFieldOptionId
        ? ids.jobFieldOptionId
        : null;

    this.logger.log(
      `[Engagement #${engagementId}] Fetching bills: primaryId=${primaryId}, secondaryId=${secondaryId ?? 'none'}`,
    );

    const targetSize = params?.page_size ?? 20;
    const filtered: RampBill[] = [];
    let cursor: string | undefined = params?.start;
    let next: string | null = null;

    for (let page = 0; page < 10 && filtered.length < targetSize; page++) {
      const apiParams: Record<string, unknown> = {
        accounting_field_selection_id: primaryId,
        page_size: 100,
      };
      if (params?.from_due_date) apiParams.from_due_date = params.from_due_date;
      if (params?.to_due_date) apiParams.to_due_date = params.to_due_date;
      if (params?.from_issued_date) apiParams.from_issued_date = params.from_issued_date;
      if (params?.to_issued_date) apiParams.to_issued_date = params.to_issued_date;
      if (params?.from_created_at) apiParams.from_created_at = params.from_created_at;
      if (params?.to_created_at) apiParams.to_created_at = params.to_created_at;
      if (params?.from_paid_at) apiParams.from_paid_at = params.from_paid_at;
      if (params?.to_paid_at) apiParams.to_paid_at = params.to_paid_at;
      if (params?.vendor_id) apiParams.vendor_id = params.vendor_id;
      if (params?.entity_id) apiParams.entity_id = params.entity_id;
      if (params?.payment_status) apiParams.payment_status = params.payment_status;
      if (params?.payment_method) apiParams.payment_method = params.payment_method;
      if (params?.approval_status) apiParams.approval_status = params.approval_status;
      if (params?.sync_status) apiParams.sync_status = params.sync_status;
      if (params?.status_summaries) apiParams.status_summaries = params.status_summaries;
      if (params?.invoice_number) apiParams.invoice_number = params.invoice_number;
      if (params?.min_amount) apiParams.min_amount = params.min_amount;
      if (params?.max_amount) apiParams.max_amount = params.max_amount;
      if (cursor) apiParams.start = cursor;

      const result = await this.getList<RampBill>('/bills', apiParams);
      for (const bill of result.data) {
        if (secondaryId) {
          if (this.hasAccountingFieldSelection(bill, secondaryId)) filtered.push(bill);
        } else {
          filtered.push(bill);
        }
      }

      next = result.page.next;
      cursor = next ?? undefined;
      if (!next) break;
    }

    return { data: filtered, page: { next } };
  }

  async getReceipt(receiptId: string): Promise<RampReceipt> {
    const headers = await this.authHeaders();
    const res = await this.http.get(`/receipts/${receiptId}`, { headers });
    return res.data;
  }

  /**
   * Receipts attached to the engagement's card transactions. Ramp receipts are
   * not tagged with accounting fields directly, so we resolve them via the
   * engagement's transactions (receipts:read → "Connect to IAE receipts/transactions").
   */
  async getEngagementReceipts(
    engagementId: number,
    params?: { from_date?: string; to_date?: string; page_size?: number; start?: string },
  ): Promise<RampPagedResponse<RampReceipt & { merchant_name: string | null; amount: number | null }>> {
    const txResult = await this.getEngagementTransactions(engagementId, {
      from_date: params?.from_date,
      to_date: params?.to_date,
      page_size: params?.page_size ?? 50,
      start: params?.start,
    });

    const out: Array<RampReceipt & { merchant_name: string | null; amount: number | null }> = [];
    const seen = new Set<string>();
    for (const tx of txResult.data) {
      for (const receiptId of tx.receipts ?? []) {
        if (seen.has(receiptId)) continue;
        seen.add(receiptId);
        try {
          const receipt = await this.getReceipt(receiptId);
          out.push({
            ...receipt,
            merchant_name: tx.merchant_name ?? tx.merchant_descriptor ?? null,
            amount: tx.amount ?? null,
          });
        } catch (err) {
          this.logger.warn(`Failed to fetch receipt ${receiptId}: ${String(err)}`);
        }
      }
    }
    // Cursor follows the underlying transactions page so "load more" continues.
    return { data: out, page: { next: txResult.page.next } };
  }

  // ─── Engagement-scoped Accounting data ────────────────────────────────────

  /**
   * Retrieves the accounting field and its options that correspond to the
   * engagement's Customer/Job. Returns the matched field + only the specific
   * option that maps to this engagement (not all options).
   *
   * If no match is found returns empty collections — never throws.
   */
  async getEngagementAccountingContext(engagementId: number): Promise<{
    mapping: {
      customerJobFieldOptionId: string | null;
      customerFieldOptionId: string | null;
      jobFieldOptionId: string | null;
      customerName: string | null;
      jobName: string | null;
    };
    /** The field(s) that were used for matching. */
    matchedFields: RampAccountingField[];
    /** The specific option(s) that matched this engagement. */
    matchedOptions: RampAccountingFieldOption[];
    /** All GL accounts (not engagement-filtered — they're org-wide chart of accounts). */
    glAccounts: RampGlAccount[];
    /** Accounting vendors (org-wide — cannot be filtered by engagement). */
    accountingVendors: RampAccountingVendor[];
  }> {
    this.logger.log(`[Engagement #${engagementId}] Loading engagement accounting context…`);

    const mapping = await this.resolveEngagementRampIds(engagementId);
    const fields = await this.getAllAccountingFields();
    const matchedFields: RampAccountingField[] = [];
    const matchedOptions: RampAccountingFieldOption[] = [];

    // Collect the matched field option details
    const allFieldOptionIds = [
      mapping.customerJobFieldOptionId,
      mapping.customerFieldOptionId,
      mapping.jobFieldOptionId,
    ].filter(Boolean) as string[];

    if (allFieldOptionIds.length > 0) {
      // Identify which fields were matched
      const combinedField = fields.find(
        (f) =>
          f.name?.toLowerCase() === 'customer/job' ||
          (f.display_name?.toLowerCase().includes('customer') &&
            f.display_name?.toLowerCase().includes('job')),
      );
      const customerField = fields.find(
        (f) =>
          (f.name?.toLowerCase() === 'customer' ||
            f.display_name?.toLowerCase() === 'customer') &&
          f.ramp_id !== combinedField?.ramp_id,
      );
      const jobField = fields.find(
        (f) =>
          (f.name?.toLowerCase() === 'job' ||
            f.display_name?.toLowerCase() === 'job') &&
          f.ramp_id !== combinedField?.ramp_id,
      );

      if (mapping.customerJobFieldOptionId && combinedField) {
        matchedFields.push(combinedField);
        const options = await this.getAllAccountingFieldOptions(combinedField.ramp_id);
        const opt = options.find((o) => o.ramp_id === mapping.customerJobFieldOptionId);
        if (opt) matchedOptions.push(opt);
      }
      if (mapping.customerFieldOptionId && customerField) {
        matchedFields.push(customerField);
        const options = await this.getAllAccountingFieldOptions(customerField.ramp_id);
        const opt = options.find((o) => o.ramp_id === mapping.customerFieldOptionId);
        if (opt) matchedOptions.push(opt);
      }
      if (mapping.jobFieldOptionId && jobField) {
        matchedFields.push(jobField);
        const options = await this.getAllAccountingFieldOptions(jobField.ramp_id);
        const opt = options.find((o) => o.ramp_id === mapping.jobFieldOptionId);
        if (opt) matchedOptions.push(opt);
      }
    }

    // GL accounts and vendors are org-wide — they can't be filtered by engagement
    // but are useful context for the user when coding transactions.
    const [glAccounts, accountingVendors] = await Promise.all([
      this.getAllGlAccounts(),
      this.getAllAccountingVendors(),
    ]);

    this.logger.log(
      `[Engagement #${engagementId}] Accounting context: ` +
        `${matchedFields.length} field(s), ${matchedOptions.length} option(s), ` +
        `${glAccounts.length} GL accounts, ${accountingVendors.length} vendors`,
    );

    return { mapping, matchedFields, matchedOptions, glAccounts, accountingVendors };
  }

  // ─── Health check ─────────────────────────────────────────────────────────

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}
