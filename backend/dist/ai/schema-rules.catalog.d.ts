export interface SchemaTableRule {
    tableName: string;
    category: string;
    columns: string[];
    description: string;
    businessRules: string;
}
export declare const DEFAULT_SCHEMA_TABLE_RULES: SchemaTableRule[];
export declare function getFullSchemaTableRules(): SchemaTableRule[];
