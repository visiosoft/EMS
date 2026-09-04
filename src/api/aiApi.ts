import { apiFetch } from './config';

export type AiProvider = 'openai' | 'anthropic';

export interface SchemaTableRule {
    tableName: string;
    category: string;
    columns: string[];
    description: string;
    businessRules: string;
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
    tableRules?: Record<string, string>;
    availableModels: {
        openai: string[];
        anthropic: string[];
    };
}

export interface UpdateAiSettingsPayload {
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

export interface ToolCallRecord {
    id: string;
    name: string;
    input: Record<string, unknown>;
    outputSummary?: string;
    executionTimeMs?: number;
    error?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
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

export interface AiToolInfo {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, unknown>;
        required?: string[];
    };
}

export async function fetchAiSettings(): Promise<AiSettingsPublic> {
    return apiFetch<AiSettingsPublic>('/ai/settings');
}

export async function updateAiSettings(payload: UpdateAiSettingsPayload): Promise<AiSettingsPublic> {
    return apiFetch<AiSettingsPublic>('/ai/settings', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function testAiConnection(payload: {
    provider?: AiProvider;
    apiKey?: string;
    model?: string;
}): Promise<{ success: boolean; message: string; latencyMs: number }> {
    return apiFetch<{ success: boolean; message: string; latencyMs: number }>('/ai/test', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function sendAiChat(
    messages: ChatMessage[],
    options?: {
        providerOverride?: AiProvider;
        modelOverride?: string;
        customSystemPrompt?: string;
    },
): Promise<ChatResponse> {
    return apiFetch<ChatResponse>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
            messages,
            providerOverride: options?.providerOverride,
            modelOverride: options?.modelOverride,
            customSystemPrompt: options?.customSystemPrompt,
        }),
    });
}

export async function fetchAiTools(): Promise<{ tools: AiToolInfo[] }> {
    return apiFetch<{ tools: AiToolInfo[] }>('/ai/tools');
}

export async function fetchDefaultAiPrompt(): Promise<{ prompt: string }> {
    return apiFetch<{ prompt: string }>('/ai/default-prompt');
}

export async function fetchSchemaRules(): Promise<{ tables: SchemaTableRule[] }> {
    return apiFetch<{ tables: SchemaTableRule[] }>('/ai/schema-rules');
}

export async function updateSchemaRules(payload: {
    rules?: Record<string, string>;
    tableName?: string;
    businessRules?: string;
}): Promise<{ tables: SchemaTableRule[] }> {
    return apiFetch<{ tables: SchemaTableRule[] }>('/ai/schema-rules', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
