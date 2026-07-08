import { ContractLlmClient } from './contract-llm.client';
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
export interface ContractFieldMeta {
    confidence: number;
    status: 'high' | 'review' | 'derived' | 'not_found';
    sourceQuote: string | null;
    sourcePage: number | null;
    verified: boolean;
}
export type ContractFieldMetaMap = Partial<Record<keyof ExtractedContractData, ContractFieldMeta>>;
export interface ContractExtractionResult {
    data: ExtractedContractData;
    fieldMeta: ContractFieldMetaMap;
}
export declare class ContractExtractionService {
    private readonly llm?;
    private readonly logger;
    constructor(llm?: ContractLlmClient | undefined);
    extractFromFile(filePath: string): Promise<ContractExtractionResult>;
    extractFromPdf(filePath: string): Promise<ContractExtractionResult>;
    private extractFromDocx;
    private extractFromText;
    private buildResultFromRaw;
    private applyDerivations;
    private normalizeFieldValue;
    private normalizeForMatch;
    private clamp01;
    private wrapDeterministic;
    private emptyExtractionResult;
    private extractFromTextContent;
    private extractFromFormFields;
    private normalizeFieldName;
    private firstFieldValue;
    private normalizeLabel;
    private isNoiseLine;
    private isBoundary;
    private extractFromBlocks;
    private assign;
    private fillFromInline;
    private findField;
    private parseAmount;
    private findAmount;
    private findCurrency;
    private findDate;
    private parseDate;
    private monthToNum;
    private emptyResult;
}
