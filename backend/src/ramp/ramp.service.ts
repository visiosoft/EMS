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
  accounting_field_selections?: RampAccountingFieldSelection[];
  line_items?: Array<{
    accounting_field_selections?: RampAccountingFieldSelection[];
    amount?: number;
    memo?: string | null;
  }>;
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
  line_items: { accounting_field_selections?: RampAccountingFieldSelection[]; amount: number; memo: string | null }[];
  accounting_field_selections?: RampAccountingFieldSelection[];
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

export interface RampAccountingField {
  ramp_id: string;
  id: string | null;
  name: string;
  display_name: string | null;
  input_type: string;
  is_active: boolean;
}

export interface RampAccountingFieldOption {
  ramp_id: string;
  id: string | null;
  value: string;
  display_name: string | null;
  code: string | null;
  is_active: boolean;
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
    user_id?: string;
    department_id?: string;
    from_date?: string;
    to_date?: string;
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

  // ─── Accounting Fields ────────────────────────────────────────────────────

  async listAccountingFields(params?: {
    page_size?: number;
    start?: string;
  }): Promise<RampPagedResponse<RampAccountingField>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/accounting/fields', { headers, params });
    return res.data;
  }

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

  async listAccountingFieldOptions(
    fieldId: string,
    params?: { page_size?: number; start?: string },
  ): Promise<RampPagedResponse<RampAccountingFieldOption>> {
    const headers = await this.authHeaders();
    const res = await this.http.get('/accounting/field-options', {
      headers,
      params: { field_id: fieldId, ...params },
    });
    return res.data;
  }

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

  // ─── Engagement → Ramp mapping ────────────────────────────────────────────

  async resolveEngagementRampIds(engagementId: number): Promise<{
    customerFieldOptionId: string | null;
    jobFieldOptionId: string | null;
    customerName: string | null;
    jobName: string | null;
  }> {
    const eid = Math.floor(Number(engagementId));
    if (!Number.isFinite(eid) || eid < 1) {
      throw new NotFoundException(`Invalid engagement ID`);
    }
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

    const fields = await this.getAllAccountingFields();
    const customerField = fields.find(
      (f) =>
        f.name?.toLowerCase() === 'customer' ||
        f.display_name?.toLowerCase() === 'customer',
    );
    const jobField = fields.find(
      (f) =>
        f.name?.toLowerCase() === 'job' ||
        f.display_name?.toLowerCase() === 'job',
    );

    let customerFieldOptionId: string | null = null;
    if (customerField && dmaMarketName) {
      const options = await this.getAllAccountingFieldOptions(customerField.ramp_id);
      const match = options.find(
        (o) => o.value?.trim().toLowerCase() === dmaMarketName.toLowerCase(),
      );
      customerFieldOptionId = match?.ramp_id ?? null;
    }

    let jobFieldOptionId: string | null = null;
    if (jobField) {
      const options = await this.getAllAccountingFieldOptions(jobField.ramp_id);
      const candidates = [jobName, tourName, attractionName].filter(Boolean) as string[];
      for (const name of candidates) {
        const match = options.find(
          (o) => o.value?.trim().toLowerCase() === name.toLowerCase(),
        );
        if (match) {
          jobFieldOptionId = match.ramp_id;
          break;
        }
      }
    }

    return {
      customerFieldOptionId,
      jobFieldOptionId,
      customerName: dmaMarketName,
      jobName: jobName ?? tourName ?? attractionName,
    };
  }

  private hasAccountingFieldSelection(
    item: {
      accounting_field_selections?: RampAccountingFieldSelection[];
      line_items?: Array<{ accounting_field_selections?: RampAccountingFieldSelection[] }>;
    },
    fieldOptionId: string,
  ): boolean {
    if (item.accounting_field_selections?.some((s) => s.field_option_id === fieldOptionId)) {
      return true;
    }
    if (
      item.line_items?.some((li) =>
        li.accounting_field_selections?.some((s) => s.field_option_id === fieldOptionId),
      )
    ) {
      return true;
    }
    return false;
  }

  async getEngagementTransactions(
    engagementId: number,
    params?: { from_date?: string; to_date?: string; page_size?: number },
  ): Promise<{ data: RampTransaction[] }> {
    const ids = await this.resolveEngagementRampIds(engagementId);
    if (!ids.customerFieldOptionId && !ids.jobFieldOptionId) {
      return { data: [] };
    }

    const primaryId = ids.customerFieldOptionId ?? ids.jobFieldOptionId!;
    const secondaryId =
      ids.customerFieldOptionId && ids.jobFieldOptionId
        ? ids.jobFieldOptionId
        : null;

    const targetSize = params?.page_size ?? 20;
    const filtered: RampTransaction[] = [];
    let cursor: string | undefined;
    const headers = await this.authHeaders();

    for (let page = 0; page < 10 && filtered.length < targetSize; page++) {
      const apiParams: Record<string, unknown> = {
        accounting_field_selection_id: primaryId,
        page_size: 100,
      };
      if (params?.from_date) apiParams.from_date = params.from_date;
      if (params?.to_date) apiParams.to_date = params.to_date;
      if (cursor) apiParams.start = cursor;

      const res = await this.http.get('/transactions', { headers, params: apiParams });
      const result = res.data as RampPagedResponse<RampTransaction>;

      for (const tx of result.data) {
        if (secondaryId) {
          if (this.hasAccountingFieldSelection(tx, secondaryId)) filtered.push(tx);
        } else {
          filtered.push(tx);
        }
      }

      cursor = result.page.next ?? undefined;
      if (!cursor) break;
    }

    return { data: filtered.slice(0, targetSize) };
  }

  async getEngagementBills(
    engagementId: number,
    params?: { from_due_date?: string; to_due_date?: string; page_size?: number },
  ): Promise<{ data: RampBill[] }> {
    const ids = await this.resolveEngagementRampIds(engagementId);
    if (!ids.customerFieldOptionId && !ids.jobFieldOptionId) {
      return { data: [] };
    }

    // Filter server-side on the primary field option; if both customer and job
    // are present, require the secondary match client-side as well.
    const primaryId = ids.customerFieldOptionId ?? ids.jobFieldOptionId!;
    const secondaryId =
      ids.customerFieldOptionId && ids.jobFieldOptionId
        ? ids.jobFieldOptionId
        : null;

    const targetSize = params?.page_size ?? 20;
    const filtered: RampBill[] = [];
    let cursor: string | undefined;
    const headers = await this.authHeaders();

    for (let page = 0; page < 10 && filtered.length < targetSize; page++) {
      const apiParams: Record<string, unknown> = {
        accounting_field_selection_id: primaryId,
        page_size: 100,
      };
      if (params?.from_due_date) apiParams.from_due_date = params.from_due_date;
      if (params?.to_due_date) apiParams.to_due_date = params.to_due_date;
      if (cursor) apiParams.start = cursor;

      const res = await this.http.get('/bills', { headers, params: apiParams });
      const result = res.data as RampPagedResponse<RampBill>;

      for (const bill of result.data) {
        if (secondaryId) {
          if (this.hasAccountingFieldSelection(bill, secondaryId)) filtered.push(bill);
        } else {
          filtered.push(bill);
        }
      }

      cursor = result.page.next ?? undefined;
      if (!cursor) break;
    }

    return { data: filtered.slice(0, targetSize) };
  }

  // ─── Health check ─────────────────────────────────────────────────────────

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}
