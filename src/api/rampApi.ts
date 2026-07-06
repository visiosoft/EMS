/**
 * Ramp API — Frontend layer for fetching Ramp financial data.
 */
import { apiFetch } from './config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RampTransaction {
  id: string;
  amount: number | null;
  merchant_name: string | null;
  merchant_descriptor: string | null;
  merchant_category_code: string | null;
  sk_category_name: string | null;
  memo: string | null;
  state: string | null;
  user_transaction_time: string | null;
  settlement_date: string | null;
  currency_code: string | null;
  card_holder?: { first_name: string; last_name: string } | null;
  receipts?: string[];
  spend_program_id: string | null;
  department_id?: string | null;
}

export interface RampBill {
  id: string;
  amount: { amount: number; currency_code: string } | null;
  invoice_number: string | null;
  memo: string | null;
  due_at: string | null;
  issued_at: string | null;
  paid_at: string | null;
  status: string | null;
  status_summary: string | null;
  vendor: { id: string; name: string } | null;
  line_items: { amount: number; memo: string | null }[];
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
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface RampReceipt {
  id: string;
  transaction_id: string | null;
  user_id: string | null;
  created_at: string | null;
  receipt_url: string | null;
}

export interface RampEngagementReceipt extends RampReceipt {
  merchant_name: string | null;
  amount: number | null;
}

export interface RampEngagementMapping {
  customerFieldOptionId: string | null;
  jobFieldOptionId: string | null;
  customerJobFieldOptionId: string | null;
  customerName: string | null;
  jobName: string | null;
}

export interface RampEngagementAccountingContext {
  mapping: RampEngagementMapping;
  matchedFields: RampAccountingField[];
  matchedOptions: RampAccountingFieldOption[];
  glAccounts: RampGlAccount[];
  accountingVendors: RampAccountingVendor[];
}

export interface RampSpendProgram {
  id: string;
  name: string;
  description: string | null;
  permitted_spend_types: string | null;
}

export interface RampPagedResponse<T> {
  data: T[];
  page: { next: string | null };
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

export interface RampCustomerJobFieldOptions {
  customerField: RampAccountingField | null;
  customerOptions: RampAccountingFieldOption[];
  jobField: RampAccountingField | null;
  jobOptions: RampAccountingFieldOption[];
}

export interface RampStatus {
  configured: boolean;
}

// ─── API calls ──────────────────────────────────────────────────────────────

export function fetchRampStatus(): Promise<RampStatus> {
  return apiFetch<RampStatus>('/ramp/status');
}

export function fetchRampTransactions(params?: {
  from_date?: string;
  to_date?: string;
  department_id?: string;
  user_id?: string;
  spend_program_id?: string;
  accounting_field_selection_id?: string;
  card_id?: string;
  entity_id?: string;
  merchant_id?: string;
  state?: string;
  sync_status?: string;
  min_amount?: string;
  max_amount?: string;
  sk_category_id?: number;
  order_by_date_desc?: boolean;
  order_by_date_asc?: boolean;
  order_by_amount_desc?: boolean;
  order_by_amount_asc?: boolean;
  has_no_sync_commits?: boolean;
  requires_memo?: boolean;
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampTransaction>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampTransaction>>(`/ramp/transactions${qs}`);
}

export function fetchRampBills(params?: {
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
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampBill>>(`/ramp/bills${qs}`);
}

export function fetchRampDepartments(params?: {
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampDepartment>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampDepartment>>(`/ramp/departments${qs}`);
}

export function fetchRampUsers(params?: {
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
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampUser>>(`/ramp/users${qs}`);
}

export function fetchRampVendors(params?: {
  name?: string;
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampVendor>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampVendor>>(`/ramp/vendors${qs}`);
}

export function fetchRampReceipts(params?: {
  transaction_id?: string;
  user_id?: string;
  from_date?: string;
  to_date?: string;
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampReceipt>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampReceipt>>(`/ramp/receipts${qs}`);
}

export function fetchRampSpendPrograms(params?: {
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampSpendProgram>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampSpendProgram>>(`/ramp/spend-programs${qs}`);
}

// ─── Accounting ─────────────────────────────────────────────────────────────

export function fetchRampAccountingConnections(): Promise<RampAccountingConnectionsResponse> {
  return apiFetch<RampAccountingConnectionsResponse>('/ramp/accounting/connections');
}

export function fetchRampGlAccounts(params?: {
  accounting_connection_id?: string;
  is_active?: boolean;
  code?: string;
  remote_id?: string;
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampGlAccount>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampGlAccount>>(`/ramp/accounting/gl-accounts${qs}`);
}

export function fetchRampAccountingFields(params?: {
  accounting_connection_id?: string;
  is_active?: boolean;
  remote_id?: string;
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampAccountingField>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampAccountingField>>(`/ramp/accounting/fields${qs}`);
}

export function fetchRampAccountingFieldOptions(
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
  const qs = buildQuery({ field_id: fieldId, ...params });
  return apiFetch<RampPagedResponse<RampAccountingFieldOption>>(`/ramp/accounting/field-options${qs}`);
}

export function fetchRampAccountingVendors(params?: {
  accounting_connection_id?: string;
  is_active?: boolean;
  is_synced?: boolean;
  code?: string;
  remote_id?: string;
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampAccountingVendor>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampAccountingVendor>>(`/ramp/accounting/vendors${qs}`);
}

export function fetchRampCustomerJobFieldOptions(): Promise<RampCustomerJobFieldOptions> {
  return apiFetch<RampCustomerJobFieldOptions>('/ramp/accounting/customer-job');
}

// ─── Engagement-scoped Ramp data ────────────────────────────────────────────

export function fetchEngagementRampTransactions(
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
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampTransaction>>(`/ramp/engagement/${engagementId}/transactions${qs}`);
}

export function fetchEngagementRampBills(
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
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampBill>>(`/ramp/engagement/${engagementId}/bills${qs}`);
}

export function fetchEngagementRampReceipts(
  engagementId: number,
  params?: {
    from_date?: string;
    to_date?: string;
    page_size?: number;
    start?: string;
  },
): Promise<RampPagedResponse<RampEngagementReceipt>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampEngagementReceipt>>(`/ramp/engagement/${engagementId}/receipts${qs}`);
}

export function fetchEngagementRampMapping(
  engagementId: number,
): Promise<RampEngagementMapping> {
  return apiFetch<RampEngagementMapping>(`/ramp/engagement/${engagementId}/mapping`);
}

export function fetchEngagementRampAccounting(
  engagementId: number,
): Promise<RampEngagementAccountingContext> {
  return apiFetch<RampEngagementAccountingContext>(`/ramp/engagement/${engagementId}/accounting`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return '';
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
  return `?${qs}`;
}
