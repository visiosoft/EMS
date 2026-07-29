"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RampService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RampService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const typeorm_1 = require("typeorm");
const RAMP_API_BASE = 'https://api.ramp.com/developer/v1';
const RAMP_TOKEN_URL = `${RAMP_API_BASE}/token`;
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
let RampService = RampService_1 = class RampService {
    config;
    dataSource;
    logger = new common_1.Logger(RampService_1.name);
    accessToken = null;
    tokenExpiresAt = 0;
    clientId;
    clientSecret;
    http;
    accountingFieldsCache = null;
    accountingFieldOptionsCache = new Map();
    glAccountsCache = null;
    accountingVendorsCache = null;
    constructor(config, dataSource) {
        this.config = config;
        this.dataSource = dataSource;
        this.clientId = this.config.get('RAMP_CLIENT_ID', '');
        this.clientSecret = this.config.get('RAMP_CLIENT_SECRET', '');
        this.http = axios_1.default.create({ baseURL: RAMP_API_BASE });
    }
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }
        if (!this.clientId || !this.clientSecret) {
            throw new Error('RAMP_CLIENT_ID or RAMP_CLIENT_SECRET not configured');
        }
        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const res = await axios_1.default.post(RAMP_TOKEN_URL, new URLSearchParams({
            grant_type: 'client_credentials',
            scope: RAMP_SCOPES,
        }).toString(), {
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        this.accessToken = res.data.access_token;
        this.tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000;
        return this.accessToken;
    }
    async authHeaders() {
        const token = await this.getAccessToken();
        return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    }
    toRampDatetime(value) {
        if (!value)
            return undefined;
        if (value.includes('T'))
            return value;
        return `${value}T00:00:00`;
    }
    normalizeCursor(next) {
        if (!next)
            return null;
        if (!next.includes('?') && !next.includes('://'))
            return next;
        try {
            const url = new URL(next, RAMP_API_BASE);
            return url.searchParams.get('start');
        }
        catch {
            return next;
        }
    }
    async getList(path, params) {
        const headers = await this.authHeaders();
        const cleanParams = params
            ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
            : undefined;
        try {
            const res = await this.http.get(path, { headers, params: cleanParams });
            const body = res.data;
            return {
                data: body.data ?? [],
                page: { next: this.normalizeCursor(body.page?.next) },
            };
        }
        catch (err) {
            const status = err?.response?.status;
            const detail = err?.response?.data;
            this.logger.error(`Ramp API error on ${path}: status=${status}, detail=${JSON.stringify(detail)}, params=${JSON.stringify(cleanParams)}`);
            throw err;
        }
    }
    async listTransactions(params) {
        return this.getList('/transactions', params);
    }
    async listBills(params) {
        return this.getList('/bills', params);
    }
    async listDepartments(params) {
        return this.getList('/departments', params);
    }
    async listUsers(params) {
        return this.getList('/users', params);
    }
    async listVendors(params) {
        return this.getList('/vendors', params);
    }
    async listReceipts(params) {
        return this.getList('/receipts', params);
    }
    async listSpendPrograms(params) {
        return this.getList('/spend-programs', params);
    }
    async listMemos(params) {
        return this.getList('/memos', params);
    }
    async listAccountingConnections() {
        const headers = await this.authHeaders();
        const res = await this.http.get('/accounting/all-connections', { headers });
        return res.data;
    }
    async listGlAccounts(params) {
        return this.getList('/accounting/accounts', params);
    }
    async getAllGlAccounts() {
        if (this.glAccountsCache && Date.now() < this.glAccountsCache.expiresAt) {
            return this.glAccountsCache.data;
        }
        const all = [];
        let start;
        do {
            const res = await this.listGlAccounts({ page_size: 100, start });
            all.push(...res.data);
            start = res.page.next ?? undefined;
        } while (start);
        this.glAccountsCache = { data: all, expiresAt: Date.now() + 300_000 };
        return all;
    }
    async listAccountingVendors(params) {
        return this.getList('/accounting/vendors', params);
    }
    async getAllAccountingVendors() {
        if (this.accountingVendorsCache && Date.now() < this.accountingVendorsCache.expiresAt) {
            return this.accountingVendorsCache.data;
        }
        const all = [];
        let start;
        do {
            const res = await this.listAccountingVendors({ page_size: 100, start });
            all.push(...res.data);
            start = res.page.next ?? undefined;
        } while (start);
        this.accountingVendorsCache = { data: all, expiresAt: Date.now() + 300_000 };
        return all;
    }
    async listAccounting(params) {
        return this.getList('/accounting', params);
    }
    async listAccountingFields(params) {
        return this.getList('/accounting/fields', params);
    }
    async getAllAccountingFields() {
        if (this.accountingFieldsCache && Date.now() < this.accountingFieldsCache.expiresAt) {
            return this.accountingFieldsCache.data;
        }
        const all = [];
        let start;
        do {
            const res = await this.listAccountingFields({ page_size: 100, start });
            all.push(...res.data);
            start = res.page.next ?? undefined;
        } while (start);
        this.accountingFieldsCache = { data: all, expiresAt: Date.now() + 300_000 };
        return all;
    }
    async listAccountingFieldOptions(fieldId, params) {
        return this.getList('/accounting/field-options', {
            field_id: fieldId,
            ...params,
        });
    }
    async getAllAccountingFieldOptions(fieldId) {
        const cached = this.accountingFieldOptionsCache.get(fieldId);
        if (cached && Date.now() < cached.expiresAt)
            return cached.data;
        const all = [];
        let start;
        do {
            const res = await this.listAccountingFieldOptions(fieldId, { page_size: 100, start });
            all.push(...res.data);
            start = res.page.next ?? undefined;
        } while (start);
        this.accountingFieldOptionsCache.set(fieldId, { data: all, expiresAt: Date.now() + 300_000 });
        return all;
    }
    async getCustomerJobFieldOptions() {
        const fields = await this.getAllAccountingFields();
        const combinedField = fields.find((f) => f.name?.toLowerCase() === 'customer/job' ||
            (f.display_name?.toLowerCase().includes('customer') &&
                f.display_name?.toLowerCase().includes('job'))) ?? null;
        const customerField = fields.find((f) => (f.name?.toLowerCase() === 'customer' ||
            f.display_name?.toLowerCase() === 'customer') &&
            f.ramp_id !== combinedField?.ramp_id) ?? null;
        const jobField = fields.find((f) => (f.name?.toLowerCase() === 'job' ||
            f.display_name?.toLowerCase() === 'job') &&
            f.ramp_id !== combinedField?.ramp_id) ?? null;
        let combinedOptions = [];
        if (combinedField) {
            combinedOptions = await this.getAllAccountingFieldOptions(combinedField.ramp_id);
        }
        let customerOptions = [];
        if (customerField) {
            customerOptions = await this.getAllAccountingFieldOptions(customerField.ramp_id);
        }
        let jobOptions = [];
        if (jobField) {
            jobOptions = await this.getAllAccountingFieldOptions(jobField.ramp_id);
        }
        if (!combinedField && !customerField && !jobField) {
            this.logger.log('No Customer/Job custom accounting fields found in Ramp. ' +
                'Checked for combined "Customer/Job" and separate "Customer"/"Job" fields.');
        }
        return { customerField, customerOptions, jobField, jobOptions, combinedField, combinedOptions };
    }
    async resolveEngagementRampIds(engagementId) {
        const eid = Math.floor(Number(engagementId));
        if (!Number.isFinite(eid) || eid < 1) {
            throw new common_1.NotFoundException(`Invalid engagement ID`);
        }
        this.logger.log(`[Engagement #${eid}] Resolving Ramp Customer/Job mapping…`);
        const rows = await this.dataSource.query(`SELECT
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
       WHERE e.EngagementID = @0`, [eid]);
        if (!rows?.length)
            throw new common_1.NotFoundException(`Engagement #${eid} not found`);
        const row = rows[0];
        const dmaMarketName = row.dmaMarketName?.trim() || null;
        const jobName = row.jobName?.trim() || null;
        const tourName = row.tourName?.trim() || null;
        const attractionName = row.attractionName?.trim() || null;
        const resolvedJobName = attractionName ?? jobName ?? tourName;
        this.logger.log(`[Engagement #${eid}] EMS data → customer="${dmaMarketName}", job="${resolvedJobName}"`);
        const fields = await this.getAllAccountingFields();
        const combinedField = fields.find((f) => f.name?.toLowerCase() === 'customer/job' ||
            f.display_name?.toLowerCase().includes('customer') &&
                f.display_name?.toLowerCase().includes('job'));
        const customerField = fields.find((f) => (f.name?.toLowerCase() === 'customer' ||
            f.display_name?.toLowerCase() === 'customer') &&
            f.ramp_id !== combinedField?.ramp_id);
        const jobField = fields.find((f) => (f.name?.toLowerCase() === 'job' ||
            f.display_name?.toLowerCase() === 'job') &&
            f.ramp_id !== combinedField?.ramp_id);
        let customerJobFieldOptionId = null;
        let customerFieldOptionId = null;
        let jobFieldOptionId = null;
        if (combinedField) {
            this.logger.log(`[Engagement #${eid}] Found combined Customer/Job field: ramp_id=${combinedField.ramp_id}`);
            const options = await this.getAllAccountingFieldOptions(combinedField.ramp_id);
            const candidates = [];
            if (dmaMarketName && resolvedJobName) {
                candidates.push(`${dmaMarketName}:${resolvedJobName}`);
                candidates.push(`${dmaMarketName} : ${resolvedJobName}`);
            }
            if (resolvedJobName)
                candidates.push(resolvedJobName);
            if (dmaMarketName)
                candidates.push(dmaMarketName);
            for (const candidate of candidates) {
                const match = options.find((o) => o.value?.trim().toLowerCase() === candidate.toLowerCase());
                if (match) {
                    customerJobFieldOptionId = match.ramp_id;
                    this.logger.log(`[Engagement #${eid}] Matched combined field option: "${match.value}" (ramp_id=${match.ramp_id})`);
                    break;
                }
            }
            if (!customerJobFieldOptionId && resolvedJobName) {
                const partialMatch = options.find((o) => o.value?.trim().toLowerCase().includes(resolvedJobName.toLowerCase()) ||
                    (dmaMarketName &&
                        o.value?.trim().toLowerCase().includes(dmaMarketName.toLowerCase())));
                if (partialMatch) {
                    customerJobFieldOptionId = partialMatch.ramp_id;
                    this.logger.log(`[Engagement #${eid}] Partial match on combined field option: "${partialMatch.value}" (ramp_id=${partialMatch.ramp_id})`);
                }
            }
            if (!customerJobFieldOptionId) {
                this.logger.log(`[Engagement #${eid}] No match found in combined Customer/Job field ` +
                    `(${options.length} options checked)`);
            }
        }
        if (customerField && dmaMarketName) {
            const options = await this.getAllAccountingFieldOptions(customerField.ramp_id);
            const match = options.find((o) => o.value?.trim().toLowerCase() === dmaMarketName.toLowerCase());
            customerFieldOptionId = match?.ramp_id ?? null;
            if (match) {
                this.logger.log(`[Engagement #${eid}] Matched Customer field option: "${match.value}" (ramp_id=${match.ramp_id})`);
            }
        }
        if (jobField && resolvedJobName) {
            const options = await this.getAllAccountingFieldOptions(jobField.ramp_id);
            const candidates = [attractionName, jobName, tourName].filter(Boolean);
            for (const name of candidates) {
                const match = options.find((o) => o.value?.trim().toLowerCase() === name.toLowerCase());
                if (match) {
                    jobFieldOptionId = match.ramp_id;
                    this.logger.log(`[Engagement #${eid}] Matched Job field option: "${match.value}" (ramp_id=${match.ramp_id})`);
                    break;
                }
            }
        }
        const hasMatch = !!(customerJobFieldOptionId || customerFieldOptionId || jobFieldOptionId);
        this.logger.log(`[Engagement #${eid}] Mapping result: ` +
            `combinedId=${customerJobFieldOptionId ?? 'null'}, ` +
            `customerId=${customerFieldOptionId ?? 'null'}, ` +
            `jobId=${jobFieldOptionId ?? 'null'}, ` +
            `matched=${hasMatch}`);
        return {
            customerFieldOptionId,
            jobFieldOptionId,
            customerJobFieldOptionId,
            customerName: dmaMarketName,
            jobName: resolvedJobName,
        };
    }
    pickPrimaryFieldOptionId(mapping) {
        return (mapping.customerJobFieldOptionId ??
            mapping.customerFieldOptionId ??
            mapping.jobFieldOptionId ??
            null);
    }
    hasAccountingFieldSelection(item, fieldOptionId) {
        if (item.accounting_field_selections?.some((s) => s.field_option_id === fieldOptionId || s.id === fieldOptionId)) {
            return true;
        }
        if (item.line_items?.some((li) => li.accounting_field_selections?.some((s) => s.field_option_id === fieldOptionId || s.id === fieldOptionId))) {
            return true;
        }
        return false;
    }
    async getEngagementTransactions(engagementId, params) {
        const ids = await this.resolveEngagementRampIds(engagementId);
        const primaryId = this.pickPrimaryFieldOptionId(ids);
        if (!primaryId) {
            this.logger.log(`[Engagement #${engagementId}] No Ramp field option match — returning empty transactions`);
            return { data: [], page: { next: null } };
        }
        const secondaryId = !ids.customerJobFieldOptionId && ids.customerFieldOptionId && ids.jobFieldOptionId
            ? ids.jobFieldOptionId
            : null;
        this.logger.log(`[Engagement #${engagementId}] Fetching transactions: primaryId=${primaryId}, secondaryId=${secondaryId ?? 'none'}`);
        const targetSize = params?.page_size ?? 20;
        const filtered = [];
        let cursor = params?.start;
        let next = null;
        for (let page = 0; page < 10 && filtered.length < targetSize; page++) {
            const apiParams = {
                accounting_field_selection_id: primaryId,
                page_size: 100,
            };
            if (params?.from_date)
                apiParams.from_date = this.toRampDatetime(params.from_date);
            if (params?.to_date)
                apiParams.to_date = this.toRampDatetime(params.to_date);
            if (params?.department_id)
                apiParams.department_id = params.department_id;
            if (params?.user_id)
                apiParams.user_id = params.user_id;
            if (params?.spend_program_id)
                apiParams.spend_program_id = params.spend_program_id;
            if (params?.card_id)
                apiParams.card_id = params.card_id;
            if (params?.entity_id)
                apiParams.entity_id = params.entity_id;
            if (params?.merchant_id)
                apiParams.merchant_id = params.merchant_id;
            if (params?.state)
                apiParams.state = params.state;
            if (params?.sync_status)
                apiParams.sync_status = params.sync_status;
            if (params?.min_amount)
                apiParams.min_amount = params.min_amount;
            if (params?.max_amount)
                apiParams.max_amount = params.max_amount;
            if (params?.sk_category_id)
                apiParams.sk_category_id = params.sk_category_id;
            if (cursor)
                apiParams.start = cursor;
            const result = await this.getList('/transactions', apiParams);
            for (const tx of result.data) {
                if (secondaryId) {
                    if (this.hasAccountingFieldSelection(tx, secondaryId))
                        filtered.push(tx);
                }
                else {
                    filtered.push(tx);
                }
            }
            next = result.page.next;
            cursor = next ?? undefined;
            if (!next)
                break;
        }
        this.logger.log(`[Engagement #${engagementId}] Transactions matched: ${filtered.length}`);
        return { data: filtered, page: { next } };
    }
    async getEngagementBills(engagementId, params) {
        const ids = await this.resolveEngagementRampIds(engagementId);
        const primaryId = this.pickPrimaryFieldOptionId(ids);
        if (!primaryId) {
            this.logger.log(`[Engagement #${engagementId}] No Ramp field option match — returning empty bills`);
            return { data: [], page: { next: null } };
        }
        const secondaryId = !ids.customerJobFieldOptionId && ids.customerFieldOptionId && ids.jobFieldOptionId
            ? ids.jobFieldOptionId
            : null;
        this.logger.log(`[Engagement #${engagementId}] Fetching bills: primaryId=${primaryId}, secondaryId=${secondaryId ?? 'none'}`);
        const targetSize = params?.page_size ?? 20;
        const filtered = [];
        let cursor = params?.start;
        let next = null;
        for (let page = 0; page < 10 && filtered.length < targetSize; page++) {
            const apiParams = {
                accounting_field_selection_id: primaryId,
                page_size: 100,
            };
            if (params?.from_due_date)
                apiParams.from_due_date = params.from_due_date;
            if (params?.to_due_date)
                apiParams.to_due_date = params.to_due_date;
            if (params?.from_issued_date)
                apiParams.from_issued_date = params.from_issued_date;
            if (params?.to_issued_date)
                apiParams.to_issued_date = params.to_issued_date;
            if (params?.from_created_at)
                apiParams.from_created_at = params.from_created_at;
            if (params?.to_created_at)
                apiParams.to_created_at = params.to_created_at;
            if (params?.from_paid_at)
                apiParams.from_paid_at = params.from_paid_at;
            if (params?.to_paid_at)
                apiParams.to_paid_at = params.to_paid_at;
            if (params?.vendor_id)
                apiParams.vendor_id = params.vendor_id;
            if (params?.entity_id)
                apiParams.entity_id = params.entity_id;
            if (params?.payment_status)
                apiParams.payment_status = params.payment_status;
            if (params?.payment_method)
                apiParams.payment_method = params.payment_method;
            if (params?.approval_status)
                apiParams.approval_status = params.approval_status;
            if (params?.sync_status)
                apiParams.sync_status = params.sync_status;
            if (params?.status_summaries)
                apiParams.status_summaries = params.status_summaries;
            if (params?.invoice_number)
                apiParams.invoice_number = params.invoice_number;
            if (params?.min_amount)
                apiParams.min_amount = params.min_amount;
            if (params?.max_amount)
                apiParams.max_amount = params.max_amount;
            if (cursor)
                apiParams.start = cursor;
            const result = await this.getList('/bills', apiParams);
            for (const bill of result.data) {
                if (secondaryId) {
                    if (this.hasAccountingFieldSelection(bill, secondaryId))
                        filtered.push(bill);
                }
                else {
                    filtered.push(bill);
                }
            }
            next = result.page.next;
            cursor = next ?? undefined;
            if (!next)
                break;
        }
        return { data: filtered, page: { next } };
    }
    async getReceipt(receiptId) {
        const headers = await this.authHeaders();
        const res = await this.http.get(`/receipts/${receiptId}`, { headers });
        return res.data;
    }
    async getEngagementReceipts(engagementId, params) {
        const txResult = await this.getEngagementTransactions(engagementId, {
            from_date: params?.from_date,
            to_date: params?.to_date,
            page_size: params?.page_size ?? 50,
            start: params?.start,
        });
        const out = [];
        const seen = new Set();
        for (const tx of txResult.data) {
            for (const receiptId of tx.receipts ?? []) {
                if (seen.has(receiptId))
                    continue;
                seen.add(receiptId);
                try {
                    const receipt = await this.getReceipt(receiptId);
                    out.push({
                        ...receipt,
                        merchant_name: tx.merchant_name ?? tx.merchant_descriptor ?? null,
                        amount: tx.amount ?? null,
                    });
                }
                catch (err) {
                    this.logger.warn(`Failed to fetch receipt ${receiptId}: ${String(err)}`);
                }
            }
        }
        return { data: out, page: { next: txResult.page.next } };
    }
    async getEngagementAccountingContext(engagementId) {
        this.logger.log(`[Engagement #${engagementId}] Loading engagement accounting context…`);
        const mapping = await this.resolveEngagementRampIds(engagementId);
        const fields = await this.getAllAccountingFields();
        const matchedFields = [];
        const matchedOptions = [];
        const allFieldOptionIds = [
            mapping.customerJobFieldOptionId,
            mapping.customerFieldOptionId,
            mapping.jobFieldOptionId,
        ].filter(Boolean);
        if (allFieldOptionIds.length > 0) {
            const combinedField = fields.find((f) => f.name?.toLowerCase() === 'customer/job' ||
                (f.display_name?.toLowerCase().includes('customer') &&
                    f.display_name?.toLowerCase().includes('job')));
            const customerField = fields.find((f) => (f.name?.toLowerCase() === 'customer' ||
                f.display_name?.toLowerCase() === 'customer') &&
                f.ramp_id !== combinedField?.ramp_id);
            const jobField = fields.find((f) => (f.name?.toLowerCase() === 'job' ||
                f.display_name?.toLowerCase() === 'job') &&
                f.ramp_id !== combinedField?.ramp_id);
            if (mapping.customerJobFieldOptionId && combinedField) {
                matchedFields.push(combinedField);
                const options = await this.getAllAccountingFieldOptions(combinedField.ramp_id);
                const opt = options.find((o) => o.ramp_id === mapping.customerJobFieldOptionId);
                if (opt)
                    matchedOptions.push(opt);
            }
            if (mapping.customerFieldOptionId && customerField) {
                matchedFields.push(customerField);
                const options = await this.getAllAccountingFieldOptions(customerField.ramp_id);
                const opt = options.find((o) => o.ramp_id === mapping.customerFieldOptionId);
                if (opt)
                    matchedOptions.push(opt);
            }
            if (mapping.jobFieldOptionId && jobField) {
                matchedFields.push(jobField);
                const options = await this.getAllAccountingFieldOptions(jobField.ramp_id);
                const opt = options.find((o) => o.ramp_id === mapping.jobFieldOptionId);
                if (opt)
                    matchedOptions.push(opt);
            }
        }
        const glAccountIds = new Set();
        const billVendorRemoteIds = new Set();
        const txResult = await this.getEngagementTransactions(engagementId, { page_size: 100 });
        for (const tx of txResult.data) {
            for (const sel of tx.accounting_field_selections ?? []) {
                if (sel.id)
                    glAccountIds.add(sel.id);
            }
            for (const li of tx.line_items ?? []) {
                for (const sel of li.accounting_field_selections ?? []) {
                    if (sel.id)
                        glAccountIds.add(sel.id);
                }
            }
        }
        const billResult = await this.getEngagementBills(engagementId, { page_size: 100 });
        for (const bill of billResult.data) {
            if (bill.vendor?.remote_id)
                billVendorRemoteIds.add(bill.vendor.remote_id);
            if (bill.vendor?.id)
                billVendorRemoteIds.add(bill.vendor.id);
            for (const sel of bill.accounting_field_selections ?? []) {
                if (sel.id)
                    glAccountIds.add(sel.id);
            }
            for (const li of bill.line_items ?? []) {
                for (const sel of li.accounting_field_selections ?? []) {
                    if (sel.id)
                        glAccountIds.add(sel.id);
                }
            }
        }
        const allGlAccounts = await this.getAllGlAccounts();
        const glAccounts = glAccountIds.size > 0
            ? allGlAccounts.filter((gl) => glAccountIds.has(gl.ramp_id) || glAccountIds.has(gl.id ?? ''))
            : [];
        const allAccountingVendors = await this.getAllAccountingVendors();
        const accountingVendors = billVendorRemoteIds.size > 0
            ? allAccountingVendors.filter((av) => billVendorRemoteIds.has(av.ramp_id) || billVendorRemoteIds.has(av.id ?? ''))
            : [];
        let customerJobOptions = [];
        if (matchedFields.length > 0) {
            customerJobOptions = await this.getAllAccountingFieldOptions(matchedFields[0].ramp_id);
        }
        this.logger.log(`[Engagement #${engagementId}] Accounting context: ` +
            `${matchedFields.length} field(s), ${matchedOptions.length} option(s), ` +
            `${glAccounts.length}/${allGlAccounts.length} GL accounts, ` +
            `${accountingVendors.length}/${allAccountingVendors.length} vendors`);
        return { mapping, matchedFields, matchedOptions, glAccounts, accountingVendors, allFields: fields, customerJobOptions };
    }
    async getEngagementVendors(engagementId, params) {
        const vendorIds = new Set();
        let cursor;
        for (let page = 0; page < 20; page++) {
            const bills = await this.getEngagementBills(engagementId, {
                page_size: 100,
                start: cursor,
            });
            for (const bill of bills.data) {
                if (bill.vendor?.id)
                    vendorIds.add(bill.vendor.id);
            }
            cursor = bills.page.next ?? undefined;
            if (!cursor)
                break;
        }
        if (vendorIds.size === 0) {
            this.logger.log(`[Engagement #${engagementId}] No vendors found in engagement bills`);
            return { data: [], page: { next: null } };
        }
        this.logger.log(`[Engagement #${engagementId}] Found ${vendorIds.size} unique vendor(s) from bills`);
        const matched = [];
        let vendorCursor;
        for (let page = 0; page < 20 && matched.length < vendorIds.size; page++) {
            const result = await this.getList('/vendors', {
                is_active: params?.is_active,
                page_size: 100,
                start: vendorCursor,
            });
            for (const v of result.data) {
                if (vendorIds.has(v.id)) {
                    if (!params?.name || v.name.toLowerCase().includes(params.name.toLowerCase())) {
                        matched.push(v);
                    }
                }
            }
            vendorCursor = result.page.next ?? undefined;
            if (!vendorCursor)
                break;
        }
        const pageSize = params?.page_size ?? 50;
        const startIndex = params?.start ? Number(params.start) : 0;
        const slice = matched.slice(startIndex, startIndex + pageSize);
        const nextIndex = startIndex + pageSize;
        const hasMore = nextIndex < matched.length;
        return {
            data: slice,
            page: { next: hasMore ? String(nextIndex) : null },
        };
    }
    isConfigured() {
        return !!(this.clientId && this.clientSecret);
    }
};
exports.RampService = RampService;
exports.RampService = RampService = RampService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_1.DataSource])
], RampService);
//# sourceMappingURL=ramp.service.js.map