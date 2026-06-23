import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { extname } from 'path';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

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
  performances: string | null;
  additionallyInsured: string | null;
  oneDrivePdfUrl: string | null;
}

type FieldKind = 'text' | 'amount' | 'currency' | 'date' | 'section';

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
  { key: 'performances', label: 'performances', kind: 'section' },
  { key: 'additionallyInsured', label: 'additionally insured', kind: 'section' },
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

  /** Entry point: dispatch by file type (.pdf or .docx). */
  async extractFromFile(filePath: string): Promise<ExtractedContractData> {
    const ext = extname(filePath).toLowerCase();
    if (ext === '.docx') return this.extractFromDocx(filePath);
    return this.extractFromPdf(filePath);
  }

  async extractFromPdf(filePath: string): Promise<ExtractedContractData> {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    // Primary: read AcroForm field values. The Contract Form is a fillable PDF —
    // the typed-in values live in form-field widgets, NOT in the page text stream,
    // so getText() only returns the static labels.
    const result = await this.extractFromFormFields(parser);
    if (result) return result;

    // Fallback: flattened / non-fillable PDFs where values are part of the text.
    const textResult = await parser.getText();
    const text = (textResult.text ?? '').trim();
    if (!text) {
      this.logger.warn('PDF has no form fields and text extraction returned empty content');
      return this.emptyResult();
    }

    return this.extractFromTextContent(text);
  }

  /**
   * Word documents have no AcroForm fields — extract the raw text (table cells
   * and content controls come through as label/value lines) and parse it with
   * the same label-based pipeline as flattened PDFs.
   */
  private async extractFromDocx(filePath: string): Promise<ExtractedContractData> {
    let text = '';
    try {
      const { value } = await mammoth.extractRawText({ path: filePath });
      text = (value ?? '').trim();
    } catch (err) {
      this.logger.warn(`DOCX text extraction failed: ${(err as Error).message}`);
      return this.emptyResult();
    }

    if (!text) {
      this.logger.warn('DOCX text extraction returned empty content');
      return this.emptyResult();
    }

    return this.extractFromTextContent(text);
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
