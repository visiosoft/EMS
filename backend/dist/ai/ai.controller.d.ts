import { AiService } from './ai.service';
import { AiProvider } from './ai.types';
export declare class UpdateAiSettingsDto {
    provider?: AiProvider;
    model?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    enableSqlFallback?: boolean;
    enableApiTools?: boolean;
    tableRules?: Record<string, string>;
}
export declare class UpdateTableRulesDto {
    rules?: Record<string, string>;
    tableName?: string;
    businessRules?: string;
}
export declare class TestConnectionDto {
    provider?: AiProvider;
    apiKey?: string;
    model?: string;
}
export declare class ChatMessageDto {
    role: 'user' | 'assistant';
    content: string;
}
export declare class ChatRequestDto {
    messages: ChatMessageDto[];
    providerOverride?: AiProvider;
    modelOverride?: string;
    customSystemPrompt?: string;
}
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    getSettings(): import("./ai.types").AiSettingsPublic;
    updateSettings(body: UpdateAiSettingsDto): import("./ai.types").AiSettingsPublic;
    testConnection(body: TestConnectionDto): Promise<{
        success: boolean;
        message: string;
        latencyMs: number;
    }>;
    chat(body: ChatRequestDto): Promise<import("./ai.types").ChatCompletionResponse | {
        answer: string;
        toolsUsed: never[];
    }>;
    getTools(): {
        tools: import("./ai.types").AiToolDefinition[];
    };
    getDefaultPrompt(): {
        prompt: string;
    };
    getSchemaRules(): {
        tables: import("./ai.types").SchemaTableRule[];
    };
    updateSchemaRules(body: UpdateTableRulesDto): {
        tables: import("./ai.types").SchemaTableRule[];
    };
}
