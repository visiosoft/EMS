import { Injectable, Logger, Optional } from '@nestjs/common';
import * as fs from 'fs';
import { extname } from 'path';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { ContractLlmClient, RawExtraction } from './contract-llm.client';
import { CONTRACT_FIELD_DEFS, ContractFieldDef } from './contract-field-schema';

/** One performance/show date within a contract's schedule. */
export interface PerformanceItem {
  date: string | null;
  time: string | null;
  formatted: string;
}

export interface ExtractedContractData {
  agency: string | null;
  agent: string | null;
  attraction: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueCountry: string | null;
  producer: string | null;
  producerAddress: string | null;
  producerFedId: string | null;
  /**
   * The presenter/purchaser/buyer (the party paying, usually IAE). Extracted to
   * complete the additionally-insured list; not persisted or shown as a form field.
   */
  presenter: string | null;
  guaranteeAmount: number | null;
  guaranteeCurrency: string | null;
  depositAmount: number | null;
  depositDueDate: string | null;
  balanceAmount: number | null;
  balanceDueDate: string | null;
  royaltyDescription: string | null;
  overageDescription: string | null;
  paymentTerms: string | null;
  paymentMethodType: string | null;
  paymentPayableTo: string | null;
  paymentBankName: string | null;
  performances: PerformanceItem[] | null;
  additionallyInsured: string[] | null;
  oneDrivePdfUrl: string | null;
}

/**
 * Review metadata for a single extracted field. Not persisted — it drives the
 * confidence badge + source snippet in the contract panel so a reviewer can
 * trust/correct each value before saving.
 */
export interface ContractFieldMeta {
  /** 0-1 model confidence, after server-side adjustment (quote verification, derivation). */
  confidence: number;
  /** UI bucket: high = auto-fill/trust, review = eyeball, derived = computed, not_found = blank. */
  status: 'high' | 'review' | 'derived' | 'not_found';
  /** Verbatim supporting span (LLM path only). */
  sourceQuote: string | null;
  /** 1-based source page, or null. */
  sourcePage: number | null;
  /** True when sourceQuote was confirmed present in the document text. */
  verified: boolean;
}

export type ContractFieldMetaMap = Partial<Record<keyof ExtractedContractData, ContractFieldMeta>>;

export interface ContractExtractionResult {
  data: ExtractedContractData;
  fieldMeta: ContractFieldMetaMap;
}

/** Confidence at/above which a verified LLM value is treated as high (auto-fill). */
const HIGH_CONFIDENCE = 0.75;
/** Below this many non-whitespace chars, a PDF is treated as scanned/image-only (needs OCR). */
const MIN_TEXT_CHARS = 40;

type FieldKind = 'text' | 'amount' | 'currency' | 'date' | 'section' | 'performance-list' | 'insured-list';

interface FieldDef {
  key: keyof ExtractedContractData;
  /** Canonical label as rendered in the form (matched against label lines). */
  label: string;
  kind: FieldKind;
}

/**
 * The Contract Form is a label-above-value layout: each field's label sits on
 * its own line and the value follows on the next line(s) — there is no inline
 * "Label: Value" colon. These defs drive the primary (block) extraction.
 */
const FIELD_DEFS: FieldDef[] = [
  { key: 'agency', label: 'talent agency', kind: 'text' },
  { key: 'agent', label: 'talent agent', kind: 'text' },
  { key: 'attraction', label: 'attraction', kind: 'text' },
  { key: 'venueName', label: 'venue name', kind: 'text' },
  { key: 'venueAddress', label: 'venue address', kind: 'text' },
  { key: 'venueCity', label: 'venue city', kind: 'text' },
  { key: 'venueState', label: 'venue state', kind: 'text' },
  { key: 'venueCountry', label: 'venue country', kind: 'text' },
  { key: 'producer', label: 'producer', kind: 'text' },
  { key: 'producerAddress', label: 'producer address', kind: 'text' },
  { key: 'producerFedId', label: 'producer federal id', kind: 'text' },
  { key: 'guaranteeAmount', label: 'guarantee amount', kind: 'amount' },
  { key: 'guaranteeCurrency', label: 'guarantee currency', kind: 'currency' },
  { key: 'depositAmount', label: 'deposit amount', kind: 'amount' },
  { key: 'depositDueDate', label: 'deposit due date', kind: 'date' },
  { key: 'balanceAmount', label: 'balance amount', kind: 'amount' },
  { key: 'balanceDueDate', label: 'balance due date', kind: 'date' },
  { key: 'royaltyDescription', label: 'royalty description', kind: 'section' },
  { key: 'overageDescription', label: 'overage description', kind: 'section' },
  { key: 'paymentTerms', label: 'payment terms', kind: 'section' },
  { key: 'paymentMethodType', label: 'payment method type', kind: 'text' },
  { key: 'paymentPayableTo', label: 'payment payable to', kind: 'text' },
  { key: 'paymentBankName', label: 'payment bank name', kind: 'text' },
  { key: 'performances', label: 'performances', kind: 'performance-list' },
  { key: 'additionallyInsured', label: 'additionally insured', kind: 'insured-list' },
  { key: 'oneDrivePdfUrl', label: 'onedrive pdf url', kind: 'text' },
];

/**
 * Extra AcroForm field-name spellings that don't reduce to the field's label
 * with spaces removed. Keys are field keys; values are already normalized
 * (lowercase, alphanumerics only).
 */
const FIELD_NAME_ALIASES: Partial<Record<keyof ExtractedContractData, string[]>> = {
  producerFedId: ['producerfedid', 'producertaxid', 'producerein'],
  oneDrivePdfUrl: ['onedriveurl', 'onedrivelink', 'pdfurl'],
};

/** Section headers (and other structural lines) that bound a value block. */
const SECTION_HEADERS = new Set([
  'talent',
  'venue',
  'producer',
  'financials',
  'royalty, overage & payment terms',
  'payment details',
  'performances & insurance',
  'reference',
]);

@Injectable()
export class ContractExtractionService {
  private readonly logger = new Logger(ContractExtractionService.name);

  // `llm` is optional so the deterministic helpers can be unit-tested (and the
  // service still works) without an API key. When it is absent or disabled, the
  // service degrades to the deterministic label/regex path instead of failing.
  constructor(@Optional() private readonly llm?: ContractLlmClient) {}

  /** Entry point: dispatch by file type (.pdf or .docx). */
  async extractFromFile(filePath: string): Promise<ContractExtractionResult> {
    const ext = extname(filePath).toLowerCase();
    if (ext === '.docx') return this.extractFromDocx(filePath);
    return this.extractFromPdf(filePath);
  }

  async extractFromPdf(filePath: string): Promise<ContractExtractionResult> {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    // Fast path: IAE's OWN fillable Contract Form (AcroForm). The typed-in values
    // live in form-field widgets, not the text stream — deterministic and free.
    const formResult = await this.extractFromFormFields(parser);
    if (formResult) return this.wrapDeterministic(formResult, 'high', 0.9);

    const textResult = await parser.getText();
    const text = (textResult.text ?? '').trim();

    // Scanned / image-only PDF: negligible text layer -> Claude reads the PDF
    // directly (vision OCR). No separate OCR service; .docx never lands here.
    if (text.replace(/\s+/g, '').length < MIN_TEXT_CHARS) {
      if (this.llm?.enabled) {
        try {
          const raw = await this.llm.extractFromPdf(buffer.toString('base64'));
          return this.buildResultFromRaw(raw, null, true);
        } catch (err) {
          this.logger.error(`LLM OCR extraction failed: ${(err as Error).message}`);
        }
      } else {
        this.logger.warn('Scanned/image-only PDF but the LLM (OCR) path is not configured');
      }
      return this.emptyExtractionResult();
    }

    // Text-layer third-party contract: LLM primary, deterministic regex fallback.
    return this.extractFromText(text);
  }

  /**
   * Word documents have no AcroForm fields and are always text (mammoth) — never
   * OCR. Route straight to the LLM text path with a deterministic fallback.
   */
  private async extractFromDocx(filePath: string): Promise<ContractExtractionResult> {
    let text = '';
    try {
      const { value } = await mammoth.extractRawText({ path: filePath });
      text = (value ?? '').trim();
    } catch (err) {
      this.logger.warn(`DOCX text extraction failed: ${(err as Error).message}`);
      return this.emptyExtractionResult();
    }

    if (!text) {
      this.logger.warn('DOCX text extraction returned empty content');
      return this.emptyExtractionResult();
    }

    return this.extractFromText(text);
  }

  /**
   * Primary non-form path: semantic LLM extraction with per-field confidence +
   * source. Falls back to the deterministic label/regex pipeline when the LLM is
   * unconfigured or errors (so uploads never fail before the key is provisioned).
   */
  private async extractFromText(text: string): Promise<ContractExtractionResult> {
    if (this.llm?.enabled) {
      try {
        const raw = await this.llm.extractFromText(text);
        return this.buildResultFromRaw(raw, text, false);
      } catch (err) {
        this.logger.error(
          `LLM text extraction failed, falling back to deterministic parse: ${(err as Error).message}`,
        );
      }
    }
    return this.wrapDeterministic(this.extractFromTextContent(text), 'review', 0.5);
  }

  // ─── LLM post-processing ──────────────────────────────────────────────────

  /**
   * Turn the model's raw per-field output into a typed `ExtractedContractData`
   * plus review metadata: normalize amounts/dates/currency, verify each source
   * quote against the document text (hallucination guard), and compute status.
   */
  private buildResultFromRaw(
    raw: RawExtraction,
    docText: string | null,
    isOcr: boolean,
  ): ContractExtractionResult {
    const data = this.emptyResult();
    const fieldMeta: ContractFieldMetaMap = {};
    const normalizedDoc = docText ? this.normalizeForMatch(docText) : null;

    for (const def of CONTRACT_FIELD_DEFS) {
      const field = raw?.[def.key];

      if (def.type === 'performance-list') {
        this.assignPerformanceList(field, data, fieldMeta, normalizedDoc, isOcr);
        continue;
      }
      if (def.type === 'insured-list') {
        this.assignInsuredList(field, data, fieldMeta, normalizedDoc, isOcr);
        continue;
      }

      const rawValue = (field?.value ?? '').toString().trim();
      const quote = ((field?.sourceQuote ?? '').toString().trim() || null) as string | null;
      const pageNum = Number(field?.sourcePage ?? 0);
      const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null;
      const confidence = this.clamp01(Number(field?.confidence ?? 0));

      if (!rawValue) {
        fieldMeta[def.key] = { confidence: 0, status: 'not_found', sourceQuote: null, sourcePage: page, verified: false };
        continue;
      }

      const normalized = this.normalizeFieldValue(def, rawValue);
      if (normalized === null) {
        // Model returned something un-parseable for this type (e.g. non-numeric amount).
        fieldMeta[def.key] = { confidence: Math.min(confidence, 0.4), status: 'review', sourceQuote: quote, sourcePage: page, verified: false };
        continue;
      }
      (data[def.key] as string | number | null) = normalized;
      fieldMeta[def.key] = { sourceQuote: quote, sourcePage: page, ...this.computeFieldStatus(quote, normalizedDoc, isOcr, confidence) };
    }

    this.applyDerivations(data, fieldMeta);
    return { data, fieldMeta };
  }

  /**
   * Shared confidence/verification computation: caps confidence when the source
   * quote can't be found in the document (hallucination guard) or when reading
   * from an OCR pass (no text layer to verify against), then buckets the result.
   */
  private computeFieldStatus(
    quote: string | null,
    normalizedDoc: string | null,
    isOcr: boolean,
    confidenceIn: number,
  ): { confidence: number; status: 'high' | 'review'; verified: boolean } {
    let confidence = confidenceIn;
    let verified = false;
    if (quote && normalizedDoc) {
      verified = normalizedDoc.includes(this.normalizeForMatch(quote));
      if (!verified) confidence = Math.min(confidence, 0.4);
    }
    if (isOcr) confidence = Math.min(confidence, 0.7);
    const trustworthy = !isOcr && (verified || !quote);
    const status = confidence >= HIGH_CONFIDENCE && trustworthy ? 'high' : 'review';
    return { confidence, status, verified };
  }

  /** Handle the `performances` field: its raw `value` is an array of {date,time,formatted}, not a string. */
  private assignPerformanceList(
    field: RawExtraction[string] | undefined,
    data: ExtractedContractData,
    fieldMeta: ContractFieldMetaMap,
    normalizedDoc: string | null,
    isOcr: boolean,
  ): void {
    const quote = ((field?.sourceQuote ?? '').toString().trim() || null) as string | null;
    const pageNum = Number(field?.sourcePage ?? 0);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null;
    const confidence = this.clamp01(Number(field?.confidence ?? 0));

    const rawItems = Array.isArray(field?.value) ? (field!.value as unknown[]) : [];
    const items = rawItems
      .map((item): PerformanceItem | null => {
        if (!item || typeof item !== 'object') return null;
        const o = item as Record<string, unknown>;
        const dateStr = typeof o.date === 'string' ? o.date.trim() : '';
        const timeStr = typeof o.time === 'string' ? o.time.trim() : '';
        const formatted = (typeof o.formatted === 'string' ? o.formatted.trim() : '').slice(0, 500);
        if (!dateStr && !timeStr && !formatted) return null;
        return {
          date: dateStr ? this.parseDate(dateStr) : null,
          time: timeStr ? this.parseTime(timeStr) : null,
          formatted: formatted || [dateStr, timeStr].filter(Boolean).join(' '),
        };
      })
      .filter((x): x is PerformanceItem => x !== null);

    if (!items.length) {
      fieldMeta.performances = { confidence: 0, status: 'not_found', sourceQuote: null, sourcePage: page, verified: false };
      return;
    }

    data.performances = items;
    fieldMeta.performances = { sourceQuote: quote, sourcePage: page, ...this.computeFieldStatus(quote, normalizedDoc, isOcr, confidence) };
  }

  /** Handle the `additionallyInsured` field: its raw `value` is a string array, not a string. */
  private assignInsuredList(
    field: RawExtraction[string] | undefined,
    data: ExtractedContractData,
    fieldMeta: ContractFieldMetaMap,
    normalizedDoc: string | null,
    isOcr: boolean,
  ): void {
    const quote = ((field?.sourceQuote ?? '').toString().trim() || null) as string | null;
    const pageNum = Number(field?.sourcePage ?? 0);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null;
    const confidence = this.clamp01(Number(field?.confidence ?? 0));

    const rawItems = Array.isArray(field?.value) ? (field!.value as unknown[]) : [];
    const parties = rawItems
      .map((v) => (typeof v === 'string' ? v.trim().slice(0, 255) : ''))
      .filter(Boolean);

    if (!parties.length) {
      fieldMeta.additionallyInsured = { confidence: 0, status: 'not_found', sourceQuote: null, sourcePage: page, verified: false };
      return;
    }

    data.additionallyInsured = parties;
    fieldMeta.additionallyInsured = { sourceQuote: quote, sourcePage: page, ...this.computeFieldStatus(quote, normalizedDoc, isOcr, confidence) };
  }

  /** Compute fields absent from the document but derivable from others (tagged for the reviewer). */
  private applyDerivations(data: ExtractedContractData, fieldMeta: ContractFieldMetaMap): void {
    for (const def of CONTRACT_FIELD_DEFS) {
      if (def.derivation === 'balanceFromGuaranteeMinusDeposit') {
        if (data.balanceAmount != null) continue; // never overwrite a stated value
        if (data.guaranteeAmount == null || data.depositAmount == null) continue;
        const balance = data.guaranteeAmount - data.depositAmount;
        if (balance <= 0) continue;
        data.balanceAmount = balance;
        fieldMeta.balanceAmount = { confidence: 0.6, status: 'derived', sourceQuote: null, sourcePage: null, verified: false };
      } else if (def.derivation === 'additionallyInsuredFromParties') {
        this.deriveAdditionallyInsured(data, fieldMeta);
      }
    }
    this.ensureAgencyFirstInsured(data);
  }

  /**
   * When the contract has no explicit additionally-insured clause, build the list
   * from the parties we already extract — Agency, Producer, Presenter — in that
   * order, de-duplicated. The LLM's own list wins when present (only fill blanks).
   */
  private deriveAdditionallyInsured(
    data: ExtractedContractData,
    fieldMeta: ContractFieldMetaMap,
  ): void {
    if (data.additionallyInsured?.length) return; // LLM extracted an explicit list -> keep it
    const seen = new Set<string>();
    const parties = [data.agency, data.producer, data.presenter]
      .map((p) => p?.trim())
      .filter((p): p is string => !!p)
      .filter((p) => {
        const key = p.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (!parties.length) return;
    data.additionallyInsured = parties;
    fieldMeta.additionallyInsured = {
      confidence: 0.6,
      status: 'derived',
      sourceQuote: null,
      sourcePage: null,
      verified: false,
    };
  }

  /** The Agency must always be listed first among additionally-insured parties, when known. */
  private ensureAgencyFirstInsured(data: ExtractedContractData): void {
    const agency = data.agency?.trim();
    if (!agency || !data.additionallyInsured?.length) return;
    const rest = data.additionallyInsured.filter((p) => p.trim().toLowerCase() !== agency.toLowerCase());
    data.additionallyInsured = [agency, ...rest];
  }

  /** Normalize a raw string value into the typed value the form field expects. */
  private normalizeFieldValue(def: ContractFieldDef, raw: string): string | number | null {
    switch (def.type) {
      case 'amount':
        return this.parseAmount(raw);
      case 'currency':
        return raw.match(/[A-Za-z]{3}/)?.[0]?.toUpperCase() ?? null;
      case 'date':
        return this.parseDate(raw);
      default:
        return raw.slice(0, 2000);
    }
  }

  /** Lenient normalization for substring quote verification (case + whitespace insensitive). */
  private normalizeForMatch(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  /** Wrap a deterministic (form-field or regex) result with uniform review metadata. */
  private wrapDeterministic(
    data: ExtractedContractData,
    status: 'high' | 'review',
    confidence: number,
  ): ContractExtractionResult {
    const fieldMeta: ContractFieldMetaMap = {};
    (Object.keys(data) as (keyof ExtractedContractData)[]).forEach((key) => {
      fieldMeta[key] =
        data[key] != null
          ? { confidence, status, sourceQuote: null, sourcePage: null, verified: false }
          : { confidence: 0, status: 'not_found', sourceQuote: null, sourcePage: null, verified: false };
    });
    return { data, fieldMeta };
  }

  private emptyExtractionResult(): ContractExtractionResult {
    return this.wrapDeterministic(this.emptyResult(), 'review', 0);
  }

  /** Shared text pipeline: label-above-value blocks, then inline "Label: Value" fallback. */
  private extractFromTextContent(text: string): ExtractedContractData {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const result = this.extractFromBlocks(lines);
    this.fillFromInline(result, lines);
    return result;
  }

  /**
   * Extract values from AcroForm fields via the underlying pdf.js document.
   * Returns null when the PDF has no form fields (caller falls back to text).
   */
  private async extractFromFormFields(parser: PDFParse): Promise<ExtractedContractData | null> {
    let fieldObjects: Record<string, Array<{ value?: unknown }>> | null = null;
    try {
      await parser.getInfo(); // forces the internal pdf.js document to load
      // `doc` is pdf-parse's internal pdf.js PDFDocumentProxy (not in its public typings).
      const doc = (parser as unknown as { doc?: { getFieldObjects?: () => Promise<typeof fieldObjects> } }).doc;
      if (doc?.getFieldObjects) {
        fieldObjects = await doc.getFieldObjects();
      }
    } catch (err) {
      this.logger.warn(`Reading PDF form fields failed: ${(err as Error).message}`);
      return null;
    }

    if (!fieldObjects || Object.keys(fieldObjects).length === 0) return null;

    const defByFieldName = new Map(
      FIELD_DEFS.flatMap((d) => {
        const names = [d.label.replace(/\s+/g, ''), ...(FIELD_NAME_ALIASES[d.key] ?? [])];
        return names.map((n) => [n, d] as const);
      }),
    );

    const result = this.emptyResult();
    let matched = false;

    for (const [rawName, entries] of Object.entries(fieldObjects)) {
      const def = defByFieldName.get(this.normalizeFieldName(rawName));
      if (!def) continue;

      const value = this.firstFieldValue(entries);
      if (!value) continue;

      this.assign(result, def, value);
      matched = true;
    }

    return matched ? result : null;
  }

  /** Normalize an AcroForm field name to alphanumerics for matching. */
  private normalizeFieldName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /** Pull the first non-empty string value out of a field's widget entries. */
  private firstFieldValue(entries: Array<{ value?: unknown }>): string | null {
    const list = Array.isArray(entries) ? entries : [entries];
    for (const e of list) {
      const v = e?.value;
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim();
    }
    return null;
  }

  /** Normalize a line for label comparison: lowercase, strip hints/punctuation. */
  private normalizeLabel(line: string): string {
    return line
      .toLowerCase()
      .replace(/\([^)]*\)/g, '') // drop hint text like "(number / currency)" or "(link)"
      .replace(/[:;]+\s*$/, '') // drop trailing colon if present
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Structural/footer noise that should never be treated as a value. */
  private isNoiseLine(line: string): boolean {
    return (
      /^contract form/i.test(line) ||
      /^page\s+\d+/i.test(line) ||
      /^every value below/i.test(line)
    );
  }

  /** A line that ends the current value block (next label, section header, or noise). */
  private isBoundary(norm: string, line: string): boolean {
    return (
      this.isNoiseLine(line) ||
      SECTION_HEADERS.has(norm) ||
      FIELD_DEFS.some((d) => d.label === norm)
    );
  }

  private extractFromBlocks(lines: string[]): ExtractedContractData {
    const result = this.emptyResult();
    const defByLabel = new Map(FIELD_DEFS.map((d) => [d.label, d]));

    for (let i = 0; i < lines.length; i++) {
      const def = defByLabel.get(this.normalizeLabel(lines[i]));
      if (!def) continue;

      // Collect value lines until the next boundary.
      const valueLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const norm = this.normalizeLabel(lines[j]);
        if (this.isBoundary(norm, lines[j])) break;
        valueLines.push(lines[j]);
      }

      const raw = valueLines.join(' ').replace(/\s+/g, ' ').trim();
      if (!raw) continue; // last-non-empty-match wins (handles the PRODUCER header vs Producer label collision)

      this.assign(result, def, raw);
    }

    return result;
  }

  private assign(result: ExtractedContractData, def: FieldDef, raw: string): void {
    switch (def.kind) {
      case 'amount': {
        const amt = this.parseAmount(raw);
        if (amt != null) (result[def.key] as number | null) = amt;
        break;
      }
      case 'currency': {
        const cur = raw.match(/[A-Za-z]{3}/)?.[0];
        if (cur) (result[def.key] as string | null) = cur.toUpperCase();
        break;
      }
      case 'date': {
        const d = this.parseDate(raw);
        if (d) (result[def.key] as string | null) = d;
        break;
      }
      case 'performance-list': {
        // Deterministic path has no reliable way to split multiple performances out of a
        // free-text block (line breaks are already collapsed upstream) — keep the whole
        // block as a single entry and let the reviewer split it if needed.
        (result.performances as PerformanceItem[] | null) = [
          { date: this.parseDate(raw), time: this.parseTime(raw), formatted: raw.slice(0, 500) },
        ];
        break;
      }
      case 'insured-list': {
        const parties = raw
          .split(/;|(?:,|\band\b)(?=\s*[A-Z])/)
          .map((s) => s.trim())
          .filter(Boolean);
        (result.additionallyInsured as string[] | null) = parties.length ? parties : [raw.slice(0, 500)];
        break;
      }
      case 'section':
      case 'text':
      default:
        (result[def.key] as string | null) = raw.slice(0, 2000);
        break;
    }
  }

  /** Fallback for inline "Label: Value" contracts — only fills fields still null. */
  private fillFromInline(result: ExtractedContractData, lines: string[]): void {
    const fullText = lines.join('\n');

    const inline: Partial<Record<keyof ExtractedContractData, () => unknown>> = {
      agency: () => this.findField(lines, [/(?:talent\s*)?agency\s*[:;]\s*(.+)/i]),
      agent: () => this.findField(lines, [/(?:talent\s*)?agent\s*[:;]\s*(.+)/i, /booking\s*agent\s*[:;]\s*(.+)/i]),
      attraction: () => this.findField(lines, [/(?:artist|attraction|performer|act|talent)\s*[:;]\s*(.+)/i]),
      venueName: () => this.findField(lines, [/venue\s*(?:name)?\s*[:;]\s*(.+)/i]),
      venueAddress: () => this.findField(lines, [/venue\s*address\s*[:;]\s*(.+)/i]),
      venueCity: () => this.findField(lines, [/venue\s*city\s*[:;]\s*(.+)/i, /city\s*[:;]\s*(.+)/i]),
      venueState: () => this.findField(lines, [/venue\s*state\s*[:;]\s*(.+)/i, /(?:state|province)\s*[:;]\s*(.+)/i]),
      venueCountry: () => this.findField(lines, [/venue\s*country\s*[:;]\s*(.+)/i, /country\s*[:;]\s*(.+)/i]),
      producer: () => this.findField(lines, [/(?:producer|promoter|purchaser|presenter|buyer)\s*[:;]\s*(.+)/i]),
      producerAddress: () => this.findField(lines, [/(?:producer|promoter|purchaser|presenter)\s*address\s*[:;]\s*(.+)/i]),
      producerFedId: () =>
        this.findField(lines, [
          /(?:federal\s*(?:tax\s*)?id|fed(?:eral)?\s*id|ein|tax\s*(?:id|identification)(?:\s*number)?)\s*[:;]?\s*(\d[\d\-]+\d)/i,
        ]),
      guaranteeAmount: () =>
        this.findAmount(fullText, [
          /(?:guarantee|guaranteed\s*(?:compensation|amount|fee))\s*[:;]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
        ]),
      guaranteeCurrency: () => this.findCurrency(fullText, [/(?:currency)\s*[:;]?\s*(USD|CAD|EUR|GBP)/i]),
      depositAmount: () => this.findAmount(fullText, [/(?:deposit|advance)\s*(?:amount|payment|due)?\s*[:;]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i]),
      depositDueDate: () => this.findDate(fullText, [/(?:deposit|advance)\s*(?:due\s*(?:date|by|on)|payable\s*(?:by|on))\s*[:;]?\s*(.+?)(?:\.|$|\n)/i]),
      balanceAmount: () => this.findAmount(fullText, [/(?:balance|remaining\s*(?:amount|payment))\s*(?:amount|due|payment)?\s*[:;]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i]),
      balanceDueDate: () => this.findDate(fullText, [/(?:balance|remaining)\s*(?:due\s*(?:date|by|on)|payable\s*(?:by|on))\s*[:;]?\s*(.+?)(?:\.|$|\n)/i]),
      paymentMethodType: () =>
        this.findField(lines, [/(?:payment\s*method|method\s*of\s*payment|payment\s*(?:via|by|type))\s*[:;]?\s*(wire|check|cheque|ach|direct\s*deposit|bank\s*transfer|cash)/i]),
      paymentPayableTo: () => this.findField(lines, [/(?:pay(?:able)?(?:\s*to)?|make\s*(?:check|cheque|payment)\s*(?:payable\s*)?to)\s*[:;]\s*(.+)/i]),
      paymentBankName: () => this.findField(lines, [/(?:bank\s*(?:name)?|financial\s*institution)\s*[:;]\s*(.+)/i]),
    };

    for (const [key, fn] of Object.entries(inline) as [keyof ExtractedContractData, () => unknown][]) {
      if (result[key] != null) continue;
      const val = fn();
      if (val != null && val !== '') (result[key] as unknown) = val;
    }
  }

  /** Try multiple regex patterns against lines, return first capture group match. */
  private findField(lines: string[], patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      for (const line of lines) {
        const m = line.match(pattern);
        if (m?.[1]?.trim()) return m[1].trim();
      }
    }
    return null;
  }

  /** Parse a numeric amount out of a raw string. */
  private parseAmount(raw: string): number | null {
    const m = raw.match(/([\d,]+(?:\.\d+)?)/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /** Extract a dollar/currency amount from text. */
  private findAmount(text: string, patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m?.[1]) {
        const n = parseFloat(m[1].replace(/,/g, ''));
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
    return null;
  }

  /** Extract currency code near a monetary value. */
  private findCurrency(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m?.[1]) return m[1].toUpperCase();
    }
    if (/\$\s*[\d,]+/.test(text)) return 'USD';
    return null;
  }

  /** Try to parse a date from matched text into YYYY-MM-DD format. */
  private findDate(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m?.[1]) {
        const parsed = this.parseDate(m[1].trim());
        if (parsed) return parsed;
      }
    }
    return null;
  }

  /** Parse various date formats to YYYY-MM-DD. */
  private parseDate(raw: string): string | null {
    const isoMatch = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

    const namedMonth = raw.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (namedMonth) {
      const mon = this.monthToNum(namedMonth[1]);
      if (mon) return `${namedMonth[3]}-${mon}-${namedMonth[2].padStart(2, '0')}`;
    }

    const slashDate = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (slashDate) return `${slashDate[3]}-${slashDate[1].padStart(2, '0')}-${slashDate[2].padStart(2, '0')}`;

    return null;
  }

  /** Parse a 12h or 24h clock time out of a raw string into 24-hour HH:MM. */
  private parseTime(raw: string): string | null {
    const ampm = raw.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (ampm) {
      let h = parseInt(ampm[1], 10) % 12;
      if (/pm/i.test(ampm[3])) h += 12;
      return `${String(h).padStart(2, '0')}:${ampm[2]}`;
    }
    const h24 = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`;
    return null;
  }

  private monthToNum(month: string): string | null {
    const months: Record<string, string> = {
      jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06',
      jul: '07', july: '07', aug: '08', august: '08', sep: '09', september: '09',
      oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12',
    };
    return months[month.toLowerCase()] ?? null;
  }

  private emptyResult(): ExtractedContractData {
    return {
      agency: null,
      agent: null,
      attraction: null,
      venueName: null,
      venueAddress: null,
      venueCity: null,
      venueState: null,
      venueCountry: null,
      producer: null,
      producerAddress: null,
      producerFedId: null,
      presenter: null,
      guaranteeAmount: null,
      guaranteeCurrency: null,
      depositAmount: null,
      depositDueDate: null,
      balanceAmount: null,
      balanceDueDate: null,
      royaltyDescription: null,
      overageDescription: null,
      paymentTerms: null,
      paymentMethodType: null,
      paymentPayableTo: null,
      paymentBankName: null,
      performances: null,
      additionallyInsured: null,
      oneDrivePdfUrl: null,
    };
  }
}
