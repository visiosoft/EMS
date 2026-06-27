import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

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

export interface RampSpendProgram {
  id: string;
  name: string;
  description: string | null;
  permitted_spend_types: string | null;
}

export interface RampMemo {
  id: string;
  transaction_id: string | null;
  content: string | null;
  created_at: string | null;
  user_id: string | null;
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

  constructor(private readonly config: ConfigService) {
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

  // ─── Transactions ─────────────────────────────────────────────────────────

  async listTransactions(params?: {
    from_date?: string;
    to_date?: string;
    department_id?: string;
    user_id?: string;
    spend_program_id?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampTransaction>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/transactions', { headers, params });
    return res.data;
  }

  // ─── Bills ────────────────────────────────────────────────────────────────

  async listBills(params?: {
    from_due_date?: string;
    to_due_date?: string;
    vendor_id?: string;
    payment_status?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampBill>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/bills', { headers, params });
    return res.data;
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  async listDepartments(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampDepartment>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/departments', { headers, params });
    return res.data;
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(params?: {
    department_id?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampUser>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/users', { headers, params });
    return res.data;
  }

  // ─── Vendors ──────────────────────────────────────────────────────────────

  async listVendors(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampVendor>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/vendors', { headers, params });
    return res.data;
  }

  // ─── Receipts ─────────────────────────────────────────────────────────────

  async listReceipts(params?: {
    transaction_id?: string;
    user_id?: string;
    from_date?: string;
    to_date?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampReceipt>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/receipts', { headers, params });
    return res.data;
  }

  // ─── Spend Programs ───────────────────────────────────────────────────────

  async listSpendPrograms(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampSpendProgram>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/spend-programs', { headers, params });
    return res.data;
  }

  // ─── Memos ────────────────────────────────────────────────────────────────

  async listMemos(params?: {
    transaction_id?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampMemo>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/memos', { headers, params });
    return res.data;
  }

  // ─── Accounting ───────────────────────────────────────────────────────────

  async listAccounting(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<Record<string, unknown>>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/accounting', { headers, params });
    return res.data;
  }

  // ─── Health check ─────────────────────────────────────────────────────────

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}
