import type { ExtractedContractData } from './contract-extraction.service';
export type ContractFieldType = 'text' | 'amount' | 'currency' | 'date' | 'section' | 'performance-list' | 'insured-list';
export interface ContractFieldDef {
    key: Exclude<keyof ExtractedContractData, 'oneDrivePdfUrl'>;
    label: string;
    type: ContractFieldType;
    description: string;
    aliases: string[];
    examples: string[];
    required: boolean;
    derivation?: 'balanceFromGuaranteeMinusDeposit' | 'additionallyInsuredFromParties';
}
export declare const CONTRACT_FIELD_DEFS: ContractFieldDef[];
