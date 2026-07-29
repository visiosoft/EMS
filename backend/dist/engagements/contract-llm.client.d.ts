import { ConfigService } from '@nestjs/config';
export interface RawExtractedField {
    value: string;
    confidence: number;
    sourceQuote: string;
    sourcePage: number;
}
export type RawExtraction = Record<string, RawExtractedField>;
export declare class ContractLlmClient {
    private readonly config;
    private readonly logger;
    private readonly apiKey?;
    private readonly model;
    private readonly maxInputChars;
    private client?;
    constructor(config: ConfigService);
    get enabled(): boolean;
    private getClient;
    extractFromText(text: string, precedenceInstruction?: string): Promise<RawExtraction>;
    extractFromPdf(pdfBase64: string, precedenceInstruction?: string): Promise<RawExtraction>;
    private run;
    private buildSystemPrompt;
    private buildToolSchema;
}
