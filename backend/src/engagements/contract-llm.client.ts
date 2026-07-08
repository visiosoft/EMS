import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CONTRACT_FIELD_DEFS } from './contract-field-schema';

/** One raw performance entry as reported by the model, before date/time normalization. */
export interface RawPerformanceItem {
  date: string;
  time: string;
  formatted: string;
}

/**
 * One field as reported by the model. Most fields report a scalar string value
 * (parsed downstream by kind — amount/currency/date/text). `performances` and
 * `additionallyInsured` are the exception: their `value` is a structured array
 * (see buildToolSchema) instead of a string.
 */
export interface RawExtractedField {
  value: string | RawPerformanceItem[] | string[];
  confidence: number;
  sourceQuote: string;
  sourcePage: number;
}

export type RawExtraction = Record<string, RawExtractedField>;

const TOOL_NAME = 'record_contract_fields';

/**
 * Thin, swappable wrapper around the Anthropic API for contract extraction.
 *
 * This is the single place the provider/OCR strategy lives. It exposes two
 * entry points that share one prompt + schema (generated from
 * CONTRACT_FIELD_DEFS):
 *   - `extractFromText`  — flattened / text-layer PDFs and .docx (primary path)
 *   - `extractFromPdf`   — scanned/image-only PDFs; Claude reads the PDF directly
 *                          via a base64 document block (vision OCR). If data
 *                          residency later forbids this, swap only this method to
 *                          an Azure AI Document Intelligence text pass.
 *
 * Structured output is obtained with forced tool use (most stable across SDK
 * versions). If ANTHROPIC_API_KEY is unset the client reports `enabled = false`
 * so the caller can fall back to the deterministic path instead of failing.
 */
@Injectable()
export class ContractLlmClient {
  private readonly logger = new Logger(ContractLlmClient.name);
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly maxInputChars: number;
  private client?: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.model = this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-4-8';
    this.maxInputChars = Number(this.config.get('CONTRACT_LLM_MAX_INPUT_CHARS') ?? 160_000);
  }

  /** Whether the LLM path is usable (API key configured). */
  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  private getClient(): Anthropic {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
    if (!this.client) this.client = new Anthropic({ apiKey: this.apiKey });
    return this.client;
  }

  /** Extract from the contract's plain text (flattened PDFs, .docx). */
  async extractFromText(text: string, precedenceInstruction?: string): Promise<RawExtraction> {
    const trimmed = text.length > this.maxInputChars ? text.slice(0, this.maxInputChars) : text;
    if (trimmed.length < text.length) {
      this.logger.warn(`Contract text truncated ${text.length} -> ${trimmed.length} chars for LLM extraction`);
    }
    return this.run(
      [
        {
          type: 'text',
          text: `Extract the contract fields from the following document text.\n\n<contract>\n${trimmed}\n</contract>`,
        },
      ],
      precedenceInstruction,
    );
  }

  /** Extract from a scanned/image-only PDF by letting Claude read the PDF directly. */
  async extractFromPdf(pdfBase64: string, precedenceInstruction?: string): Promise<RawExtraction> {
    return this.run(
      [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        } as unknown as Anthropic.ContentBlockParam,
        { type: 'text', text: 'Extract the contract fields from the attached PDF.' },
      ],
      precedenceInstruction,
    );
  }

  private async run(
    userContent: Anthropic.ContentBlockParam[],
    precedenceInstruction?: string,
  ): Promise<RawExtraction> {
    const client = this.getClient();
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: this.buildSystemPrompt(precedenceInstruction),
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          name: TOOL_NAME,
          description:
            'Record every extracted contract field, each with a 0-1 confidence, a verbatim source quote, and the source page.',
          input_schema: this.buildToolSchema(),
        },
      ],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content: userContent }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === TOOL_NAME,
    );
    if (!toolUse) {
      this.logger.warn('LLM extraction returned no tool_use block');
      return {};
    }
    return (toolUse.input ?? {}) as RawExtraction;
  }

  /** System prompt: instructions + the field-definition block, generated from the schema. */
  private buildSystemPrompt(precedenceInstruction?: string): string {
    const fieldLines = CONTRACT_FIELD_DEFS.map((d) => {
      const aliases = d.aliases.length ? ` (also written as: ${d.aliases.join('; ')})` : '';
      const examples = d.examples.length ? ` e.g. ${d.examples.join(' | ')}` : '';
      return `- ${d.key} [${d.type}]: ${d.description}${aliases}.${examples}`;
    }).join('\n');

    const precedence =
      precedenceInstruction ??
      'Where a Rider or amendment conflicts with the base agreement, the Rider/amendment (and any handwritten "as amended" changes) prevails.';

    return [
      'You extract structured deal terms from live-entertainment performance contracts uploaded from many different agencies.',
      'Labels and layouts vary widely (prose, key/value, tables, multi-document packets). Map by meaning, not by exact label.',
      '',
      'Rules:',
      `- ${precedence}`,
      '- Distinguish the PRODUCER (touring production being paid, the payee) from the PRESENTER/PURCHASER/BUYER (the party paying — usually Innovation Arts & Entertainment). The "producer" field is the payee.',
      '- Amounts: put digits only in "value" (e.g. 35000, not "$35,000"); put the currency in guaranteeCurrency. Never invent a value.',
      '- If a field is not present, return an empty string for "value" with confidence 0. Do not guess.',
      '- "confidence" is 0-1: how sure you are the value is correct AND correctly mapped to this field. Lower it for inferred values (e.g. an implicit country).',
      '- "sourceQuote" MUST be a short verbatim span copied from the document that supports the value (or empty string if the value is empty).',
      '- "sourcePage" is the 1-based page the value came from, or 0 if unknown.',
      '- "performances" and "additionallyInsured" are the two exceptions: their "value" is an array (see tool schema), not a string. List every performance separately (one array entry per date/time), and every additional-insured party separately, with the Talent Agency listed first if known.',
      '',
      'Fields to extract:',
      fieldLines,
    ].join('\n');
  }

  /** `value` schema for a single field, keyed by its ContractFieldType. Most are strings; two are arrays. */
  private buildValueSchema(def: (typeof CONTRACT_FIELD_DEFS)[number]): Record<string, unknown> {
    if (def.type === 'performance-list') {
      return {
        type: 'array',
        description: `${def.label}: ${def.description}`,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['date', 'time', 'formatted'],
          properties: {
            date: { type: 'string', description: 'ISO date YYYY-MM-DD, or empty string if unknown' },
            time: { type: 'string', description: '24-hour HH:MM, or empty string if unknown' },
            formatted: { type: 'string', description: 'Human-readable, e.g. "Wednesday, May 7, 2025 at 7:30 PM"' },
          },
        },
      };
    }
    if (def.type === 'insured-list') {
      return {
        type: 'array',
        description: `${def.label}: ${def.description}`,
        items: { type: 'string' },
      };
    }
    return { type: 'string', description: `${def.label}: ${def.description}` };
  }

  /** JSON schema for the forced tool: one object per field with value/confidence/source. */
  private buildToolSchema(): Anthropic.Tool.InputSchema {
    const properties: Record<string, unknown> = {};
    for (const def of CONTRACT_FIELD_DEFS) {
      properties[def.key] = {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'confidence', 'sourceQuote', 'sourcePage'],
        properties: {
          value: this.buildValueSchema(def),
          confidence: { type: 'number', description: '0-1 confidence' },
          sourceQuote: { type: 'string', description: 'Verbatim supporting span from the document' },
          sourcePage: { type: 'integer', description: '1-based source page, or 0 if unknown' },
        },
      };
    }
    return {
      type: 'object',
      additionalProperties: false,
      required: CONTRACT_FIELD_DEFS.map((d) => d.key),
      properties,
    } as unknown as Anthropic.Tool.InputSchema;
  }
}
