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
var ContractLlmClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractLlmClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const contract_field_schema_1 = require("./contract-field-schema");
const TOOL_NAME = 'record_contract_fields';
let ContractLlmClient = ContractLlmClient_1 = class ContractLlmClient {
    config;
    logger = new common_1.Logger(ContractLlmClient_1.name);
    apiKey;
    model;
    maxInputChars;
    client;
    constructor(config) {
        this.config = config;
        this.apiKey = this.config.get('ANTHROPIC_API_KEY');
        this.model = this.config.get('ANTHROPIC_MODEL') ?? 'claude-opus-4-8';
        this.maxInputChars = Number(this.config.get('CONTRACT_LLM_MAX_INPUT_CHARS') ?? 160_000);
    }
    get enabled() {
        return Boolean(this.apiKey);
    }
    getClient() {
        if (!this.apiKey)
            throw new Error('ANTHROPIC_API_KEY is not configured');
        if (!this.client)
            this.client = new sdk_1.default({ apiKey: this.apiKey });
        return this.client;
    }
    async extractFromText(text, precedenceInstruction) {
        const trimmed = text.length > this.maxInputChars ? text.slice(0, this.maxInputChars) : text;
        if (trimmed.length < text.length) {
            this.logger.warn(`Contract text truncated ${text.length} -> ${trimmed.length} chars for LLM extraction`);
        }
        return this.run([
            {
                type: 'text',
                text: `Extract the contract fields from the following document text.\n\n<contract>\n${trimmed}\n</contract>`,
            },
        ], precedenceInstruction);
    }
    async extractFromPdf(pdfBase64, precedenceInstruction) {
        return this.run([
            {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: 'Extract the contract fields from the attached PDF.' },
        ], precedenceInstruction);
    }
    async run(userContent, precedenceInstruction) {
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
                    description: 'Record every extracted contract field, each with a 0-1 confidence, a verbatim source quote, and the source page.',
                    input_schema: this.buildToolSchema(),
                },
            ],
            tool_choice: { type: 'tool', name: TOOL_NAME },
            messages: [{ role: 'user', content: userContent }],
        });
        const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME);
        if (!toolUse) {
            this.logger.warn('LLM extraction returned no tool_use block');
            return {};
        }
        return (toolUse.input ?? {});
    }
    buildSystemPrompt(precedenceInstruction) {
        const fieldLines = contract_field_schema_1.CONTRACT_FIELD_DEFS.map((d) => {
            const aliases = d.aliases.length ? ` (also written as: ${d.aliases.join('; ')})` : '';
            const examples = d.examples.length ? ` e.g. ${d.examples.join(' | ')}` : '';
            return `- ${d.key} [${d.type}]: ${d.description}${aliases}.${examples}`;
        }).join('\n');
        const precedence = precedenceInstruction ??
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
            '',
            'Fields to extract:',
            fieldLines,
        ].join('\n');
    }
    buildToolSchema() {
        const properties = {};
        for (const def of contract_field_schema_1.CONTRACT_FIELD_DEFS) {
            properties[def.key] = {
                type: 'object',
                additionalProperties: false,
                required: ['value', 'confidence', 'sourceQuote', 'sourcePage'],
                properties: {
                    value: { type: 'string', description: `${def.label}: ${def.description}` },
                    confidence: { type: 'number', description: '0-1 confidence' },
                    sourceQuote: { type: 'string', description: 'Verbatim supporting span from the document' },
                    sourcePage: { type: 'integer', description: '1-based source page, or 0 if unknown' },
                },
            };
        }
        return {
            type: 'object',
            additionalProperties: false,
            required: contract_field_schema_1.CONTRACT_FIELD_DEFS.map((d) => d.key),
            properties,
        };
    }
};
exports.ContractLlmClient = ContractLlmClient;
exports.ContractLlmClient = ContractLlmClient = ContractLlmClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ContractLlmClient);
//# sourceMappingURL=contract-llm.client.js.map