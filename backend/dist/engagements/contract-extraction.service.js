"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ContractExtractionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractExtractionService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path_1 = require("path");
const mammoth = __importStar(require("mammoth"));
const pdf_parse_1 = require("pdf-parse");
const contract_llm_client_1 = require("./contract-llm.client");
const contract_field_schema_1 = require("./contract-field-schema");
const HIGH_CONFIDENCE = 0.75;
const MIN_TEXT_CHARS = 40;
const FIELD_DEFS = [
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
const FIELD_NAME_ALIASES = {
    producerFedId: ['producerfedid', 'producertaxid', 'producerein'],
    oneDrivePdfUrl: ['onedriveurl', 'onedrivelink', 'pdfurl'],
};
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
let ContractExtractionService = ContractExtractionService_1 = class ContractExtractionService {
    llm;
    logger = new common_1.Logger(ContractExtractionService_1.name);
    constructor(llm) {
        this.llm = llm;
    }
    async extractFromFile(filePath) {
        const ext = (0, path_1.extname)(filePath).toLowerCase();
        if (ext === '.docx')
            return this.extractFromDocx(filePath);
        return this.extractFromPdf(filePath);
    }
    async extractFromPdf(filePath) {
        const buffer = fs.readFileSync(filePath);
        const parser = new pdf_parse_1.PDFParse({ data: new Uint8Array(buffer) });
        const formResult = await this.extractFromFormFields(parser);
        if (formResult)
            return this.wrapDeterministic(formResult, 'high', 0.9);
        const textResult = await parser.getText();
        const text = (textResult.text ?? '').trim();
        if (text.replace(/\s+/g, '').length < MIN_TEXT_CHARS) {
            if (this.llm?.enabled) {
                try {
                    const raw = await this.llm.extractFromPdf(buffer.toString('base64'));
                    return this.buildResultFromRaw(raw, null, true);
                }
                catch (err) {
                    this.logger.error(`LLM OCR extraction failed: ${err.message}`);
                }
            }
            else {
                this.logger.warn('Scanned/image-only PDF but the LLM (OCR) path is not configured');
            }
            return this.emptyExtractionResult();
        }
        return this.extractFromText(text);
    }
    async extractFromDocx(filePath) {
        let text = '';
        try {
            const { value } = await mammoth.extractRawText({ path: filePath });
            text = (value ?? '').trim();
        }
        catch (err) {
            this.logger.warn(`DOCX text extraction failed: ${err.message}`);
            return this.emptyExtractionResult();
        }
        if (!text) {
            this.logger.warn('DOCX text extraction returned empty content');
            return this.emptyExtractionResult();
        }
        return this.extractFromText(text);
    }
    async extractFromText(text) {
        if (this.llm?.enabled) {
            try {
                const raw = await this.llm.extractFromText(text);
                return this.buildResultFromRaw(raw, text, false);
            }
            catch (err) {
                this.logger.error(`LLM text extraction failed, falling back to deterministic parse: ${err.message}`);
            }
        }
        return this.wrapDeterministic(this.extractFromTextContent(text), 'review', 0.5);
    }
    buildResultFromRaw(raw, docText, isOcr) {
        const data = this.emptyResult();
        const fieldMeta = {};
        const normalizedDoc = docText ? this.normalizeForMatch(docText) : null;
        for (const def of contract_field_schema_1.CONTRACT_FIELD_DEFS) {
            const field = raw?.[def.key];
            const rawValue = (field?.value ?? '').toString().trim();
            const quote = ((field?.sourceQuote ?? '').toString().trim() || null);
            const pageNum = Number(field?.sourcePage ?? 0);
            const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null;
            let confidence = this.clamp01(Number(field?.confidence ?? 0));
            if (!rawValue) {
                fieldMeta[def.key] = { confidence: 0, status: 'not_found', sourceQuote: null, sourcePage: page, verified: false };
                continue;
            }
            const normalized = this.normalizeFieldValue(def, rawValue);
            if (normalized === null) {
                fieldMeta[def.key] = { confidence: Math.min(confidence, 0.4), status: 'review', sourceQuote: quote, sourcePage: page, verified: false };
                continue;
            }
            data[def.key] = normalized;
            let verified = false;
            if (quote && normalizedDoc) {
                verified = normalizedDoc.includes(this.normalizeForMatch(quote));
                if (!verified)
                    confidence = Math.min(confidence, 0.4);
            }
            if (isOcr)
                confidence = Math.min(confidence, 0.7);
            const trustworthy = !isOcr && (verified || !quote);
            const status = confidence >= HIGH_CONFIDENCE && trustworthy ? 'high' : 'review';
            fieldMeta[def.key] = { confidence, status, sourceQuote: quote, sourcePage: page, verified };
        }
        this.applyDerivations(data, fieldMeta);
        return { data, fieldMeta };
    }
    applyDerivations(data, fieldMeta) {
        for (const def of contract_field_schema_1.CONTRACT_FIELD_DEFS) {
            if (def.derivation !== 'balanceFromGuaranteeMinusDeposit')
                continue;
            if (data.balanceAmount != null)
                continue;
            if (data.guaranteeAmount == null || data.depositAmount == null)
                continue;
            const balance = data.guaranteeAmount - data.depositAmount;
            if (balance <= 0)
                continue;
            data.balanceAmount = balance;
            fieldMeta.balanceAmount = { confidence: 0.6, status: 'derived', sourceQuote: null, sourcePage: null, verified: false };
        }
    }
    normalizeFieldValue(def, raw) {
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
    normalizeForMatch(s) {
        return s.toLowerCase().replace(/\s+/g, ' ').trim();
    }
    clamp01(n) {
        if (!Number.isFinite(n))
            return 0;
        return Math.max(0, Math.min(1, n));
    }
    wrapDeterministic(data, status, confidence) {
        const fieldMeta = {};
        Object.keys(data).forEach((key) => {
            fieldMeta[key] =
                data[key] != null
                    ? { confidence, status, sourceQuote: null, sourcePage: null, verified: false }
                    : { confidence: 0, status: 'not_found', sourceQuote: null, sourcePage: null, verified: false };
        });
        return { data, fieldMeta };
    }
    emptyExtractionResult() {
        return this.wrapDeterministic(this.emptyResult(), 'review', 0);
    }
    extractFromTextContent(text) {
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const result = this.extractFromBlocks(lines);
        this.fillFromInline(result, lines);
        return result;
    }
    async extractFromFormFields(parser) {
        let fieldObjects = null;
        try {
            await parser.getInfo();
            const doc = parser.doc;
            if (doc?.getFieldObjects) {
                fieldObjects = await doc.getFieldObjects();
            }
        }
        catch (err) {
            this.logger.warn(`Reading PDF form fields failed: ${err.message}`);
            return null;
        }
        if (!fieldObjects || Object.keys(fieldObjects).length === 0)
            return null;
        const defByFieldName = new Map(FIELD_DEFS.flatMap((d) => {
            const names = [d.label.replace(/\s+/g, ''), ...(FIELD_NAME_ALIASES[d.key] ?? [])];
            return names.map((n) => [n, d]);
        }));
        const result = this.emptyResult();
        let matched = false;
        for (const [rawName, entries] of Object.entries(fieldObjects)) {
            const def = defByFieldName.get(this.normalizeFieldName(rawName));
            if (!def)
                continue;
            const value = this.firstFieldValue(entries);
            if (!value)
                continue;
            this.assign(result, def, value);
            matched = true;
        }
        return matched ? result : null;
    }
    normalizeFieldName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    firstFieldValue(entries) {
        const list = Array.isArray(entries) ? entries : [entries];
        for (const e of list) {
            const v = e?.value;
            if (typeof v === 'string' && v.trim())
                return v.trim();
            if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim())
                return v[0].trim();
        }
        return null;
    }
    normalizeLabel(line) {
        return line
            .toLowerCase()
            .replace(/\([^)]*\)/g, '')
            .replace(/[:;]+\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    isNoiseLine(line) {
        return (/^contract form/i.test(line) ||
            /^page\s+\d+/i.test(line) ||
            /^every value below/i.test(line));
    }
    isBoundary(norm, line) {
        return (this.isNoiseLine(line) ||
            SECTION_HEADERS.has(norm) ||
            FIELD_DEFS.some((d) => d.label === norm));
    }
    extractFromBlocks(lines) {
        const result = this.emptyResult();
        const defByLabel = new Map(FIELD_DEFS.map((d) => [d.label, d]));
        for (let i = 0; i < lines.length; i++) {
            const def = defByLabel.get(this.normalizeLabel(lines[i]));
            if (!def)
                continue;
            const valueLines = [];
            for (let j = i + 1; j < lines.length; j++) {
                const norm = this.normalizeLabel(lines[j]);
                if (this.isBoundary(norm, lines[j]))
                    break;
                valueLines.push(lines[j]);
            }
            const raw = valueLines.join(' ').replace(/\s+/g, ' ').trim();
            if (!raw)
                continue;
            this.assign(result, def, raw);
        }
        return result;
    }
    assign(result, def, raw) {
        switch (def.kind) {
            case 'amount': {
                const amt = this.parseAmount(raw);
                if (amt != null)
                    result[def.key] = amt;
                break;
            }
            case 'currency': {
                const cur = raw.match(/[A-Za-z]{3}/)?.[0];
                if (cur)
                    result[def.key] = cur.toUpperCase();
                break;
            }
            case 'date': {
                const d = this.parseDate(raw);
                if (d)
                    result[def.key] = d;
                break;
            }
            case 'section':
            case 'text':
            default:
                result[def.key] = raw.slice(0, 2000);
                break;
        }
    }
    fillFromInline(result, lines) {
        const fullText = lines.join('\n');
        const inline = {
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
            producerFedId: () => this.findField(lines, [
                /(?:federal\s*(?:tax\s*)?id|fed(?:eral)?\s*id|ein|tax\s*(?:id|identification)(?:\s*number)?)\s*[:;]?\s*(\d[\d\-]+\d)/i,
            ]),
            guaranteeAmount: () => this.findAmount(fullText, [
                /(?:guarantee|guaranteed\s*(?:compensation|amount|fee))\s*[:;]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
            ]),
            guaranteeCurrency: () => this.findCurrency(fullText, [/(?:currency)\s*[:;]?\s*(USD|CAD|EUR|GBP)/i]),
            depositAmount: () => this.findAmount(fullText, [/(?:deposit|advance)\s*(?:amount|payment|due)?\s*[:;]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i]),
            depositDueDate: () => this.findDate(fullText, [/(?:deposit|advance)\s*(?:due\s*(?:date|by|on)|payable\s*(?:by|on))\s*[:;]?\s*(.+?)(?:\.|$|\n)/i]),
            balanceAmount: () => this.findAmount(fullText, [/(?:balance|remaining\s*(?:amount|payment))\s*(?:amount|due|payment)?\s*[:;]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i]),
            balanceDueDate: () => this.findDate(fullText, [/(?:balance|remaining)\s*(?:due\s*(?:date|by|on)|payable\s*(?:by|on))\s*[:;]?\s*(.+?)(?:\.|$|\n)/i]),
            paymentMethodType: () => this.findField(lines, [/(?:payment\s*method|method\s*of\s*payment|payment\s*(?:via|by|type))\s*[:;]?\s*(wire|check|cheque|ach|direct\s*deposit|bank\s*transfer|cash)/i]),
            paymentPayableTo: () => this.findField(lines, [/(?:pay(?:able)?(?:\s*to)?|make\s*(?:check|cheque|payment)\s*(?:payable\s*)?to)\s*[:;]\s*(.+)/i]),
            paymentBankName: () => this.findField(lines, [/(?:bank\s*(?:name)?|financial\s*institution)\s*[:;]\s*(.+)/i]),
        };
        for (const [key, fn] of Object.entries(inline)) {
            if (result[key] != null)
                continue;
            const val = fn();
            if (val != null && val !== '')
                result[key] = val;
        }
    }
    findField(lines, patterns) {
        for (const pattern of patterns) {
            for (const line of lines) {
                const m = line.match(pattern);
                if (m?.[1]?.trim())
                    return m[1].trim();
            }
        }
        return null;
    }
    parseAmount(raw) {
        const m = raw.match(/([\d,]+(?:\.\d+)?)/);
        if (!m)
            return null;
        const n = parseFloat(m[1].replace(/,/g, ''));
        return Number.isFinite(n) && n > 0 ? n : null;
    }
    findAmount(text, patterns) {
        for (const pattern of patterns) {
            const m = text.match(pattern);
            if (m?.[1]) {
                const n = parseFloat(m[1].replace(/,/g, ''));
                if (Number.isFinite(n) && n > 0)
                    return n;
            }
        }
        return null;
    }
    findCurrency(text, patterns) {
        for (const pattern of patterns) {
            const m = text.match(pattern);
            if (m?.[1])
                return m[1].toUpperCase();
        }
        if (/\$\s*[\d,]+/.test(text))
            return 'USD';
        return null;
    }
    findDate(text, patterns) {
        for (const pattern of patterns) {
            const m = text.match(pattern);
            if (m?.[1]) {
                const parsed = this.parseDate(m[1].trim());
                if (parsed)
                    return parsed;
            }
        }
        return null;
    }
    parseDate(raw) {
        const isoMatch = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch)
            return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
        const namedMonth = raw.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
        if (namedMonth) {
            const mon = this.monthToNum(namedMonth[1]);
            if (mon)
                return `${namedMonth[3]}-${mon}-${namedMonth[2].padStart(2, '0')}`;
        }
        const slashDate = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (slashDate)
            return `${slashDate[3]}-${slashDate[1].padStart(2, '0')}-${slashDate[2].padStart(2, '0')}`;
        return null;
    }
    monthToNum(month) {
        const months = {
            jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
            apr: '04', april: '04', may: '05', jun: '06', june: '06',
            jul: '07', july: '07', aug: '08', august: '08', sep: '09', september: '09',
            oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12',
        };
        return months[month.toLowerCase()] ?? null;
    }
    emptyResult() {
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
};
exports.ContractExtractionService = ContractExtractionService;
exports.ContractExtractionService = ContractExtractionService = ContractExtractionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [contract_llm_client_1.ContractLlmClient])
], ContractExtractionService);
//# sourceMappingURL=contract-extraction.service.js.map