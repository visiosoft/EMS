import { ConfigService } from '@nestjs/config';
import { AiProvider, AiSettings, AiSettingsPublic, ChatCompletionResponse, KnowledgeArticle, SchemaTableRule } from './ai.types';
import { AiToolsExecutor } from './ai-tools.executor';
export declare class AiService {
    private readonly config;
    private readonly toolsExecutor;
    private readonly logger;
    private settings;
    constructor(config: ConfigService, toolsExecutor: AiToolsExecutor);
    private loadSettings;
    private persistSettings;
    getPublicSettings(): AiSettingsPublic;
    updateSettings(patch: Partial<AiSettings>): AiSettingsPublic;
    getSchemaTableRules(): SchemaTableRule[];
    updateTableRule(tableName: string, rule: string): SchemaTableRule[];
    updateAllTableRules(rulesMap: Record<string, string>): SchemaTableRule[];
    getKnowledgeArticles(): KnowledgeArticle[];
    saveKnowledgeArticle(article: Partial<KnowledgeArticle>): KnowledgeArticle[];
    deleteKnowledgeArticle(id: string): KnowledgeArticle[];
    testConnection(provider?: AiProvider, apiKey?: string, model?: string): Promise<{
        success: boolean;
        message: string;
        latencyMs: number;
    }>;
    getToolsCatalog(): import("./ai.types").AiToolDefinition[];
    private buildEffectiveSystemPrompt;
    chat(userMessages: {
        role: 'user' | 'assistant';
        content: string;
    }[], options?: {
        providerOverride?: AiProvider;
        modelOverride?: string;
        customSystemPrompt?: string;
    }): Promise<ChatCompletionResponse>;
    private runOpenAiChat;
    private runAnthropicChat;
}
