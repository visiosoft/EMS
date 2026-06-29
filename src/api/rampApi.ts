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
  customerName: string | null;
  jobName: string | null;
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
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampTransaction>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampTransaction>>(`/ramp/transactions${qs}`);
}

export function fetchRampBills(params?: {
  from_due_date?: string;
  to_due_date?: string;
  vendor_id?: string;
  payment_status?: string;
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
  page_size?: number;
  start?: string;
}): Promise<RampPagedResponse<RampUser>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampUser>>(`/ramp/users${qs}`);
}

export function fetchRampVendors(params?: {
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

// ─── Engagement-scoped Ramp data ────────────────────────────────────────────

export function fetchEngagementRampTransactions(
  engagementId: number,
  params?: { from_date?: string; to_date?: string; page_size?: number; start?: string },
): Promise<RampPagedResponse<RampTransaction>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampTransaction>>(`/ramp/engagement/${engagementId}/transactions${qs}`);
}

export function fetchEngagementRampBills(
  engagementId: number,
  params?: { from_due_date?: string; to_due_date?: string; page_size?: number; start?: string },
): Promise<RampPagedResponse<RampBill>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampBill>>(`/ramp/engagement/${engagementId}/bills${qs}`);
}

export function fetchEngagementRampReceipts(
  engagementId: number,
  params?: { from_date?: string; to_date?: string; page_size?: number; start?: string },
): Promise<RampPagedResponse<RampEngagementReceipt>> {
  const qs = buildQuery(params);
  return apiFetch<RampPagedResponse<RampEngagementReceipt>>(`/ramp/engagement/${engagementId}/receipts${qs}`);
}

export function fetchEngagementRampMapping(
  engagementId: number,
): Promise<RampEngagementMapping> {
  return apiFetch<RampEngagementMapping>(`/ramp/engagement/${engagementId}/mapping`);
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
