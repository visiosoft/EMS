export type AiProvider = 'openai' | 'anthropic';

export interface KnowledgeArticle {
    id: string;
    title: string;
    category: string;
    tags: string[];
    summary: string;
    steps: string[];
    tips?: string[];
    relatedPages?: string[];
}

export interface SchemaTableRule {
    tableName: string;
    category?: string;
    columns: string[];
    description?: string;
    businessRules: string;
}

export interface AiSettings {
    provider: AiProvider;
    model: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    enableSqlFallback: boolean;
    enableApiTools: boolean;
    tableRules?: Record<string, string>;
}

export interface AiSettingsPublic {
    provider: AiProvider;
    model: string;
    hasOpenaiKey: boolean;
    hasAnthropicKey: boolean;
    openaiKeyMasked: string;
    anthropicKeyMasked: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    enableSqlFallback: boolean;
    enableApiTools: boolean;
    tableRules: Record<string, string>;
    availableModels: {
        openai: string[];
        anthropic: string[];
    };
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
}

export interface ToolCallRecord {
    id: string;
    name: string;
    input: Record<string, unknown>;
    outputSummary?: string;
    executionTimeMs?: number;
    error?: string;
}

export interface ChatCompletionResponse {
    id?: string;
    answer: string;
    provider: AiProvider;
    model: string;
    toolsUsed: ToolCallRecord[];
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

export interface AiLogRecord {
    id: string;
    timestamp: string;
    provider: AiProvider;
    model: string;
    userQuery: string;
    answerSummary: string;
    toolsUsed: string[];
    latencyMs: number;
    feedback?: 'thumbs_up' | 'thumbs_down';
    feedbackComment?: string;
    error?: string;
}

export interface AiFeedbackDto {
    logId: string;
    feedback: 'thumbs_up' | 'thumbs_down';
    comment?: string;
}

export interface AiAnalyticsSummary {
    totalQueries: number;
    thumbsUpCount: number;
    thumbsDownCount: number;
    avgLatencyMs: number;
    topTools: { toolName: string; count: number }[];
    recentLogs: AiLogRecord[];
}

export interface AiToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}
