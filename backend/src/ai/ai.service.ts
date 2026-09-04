import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
    AiProvider,
    AiSettings,
    AiSettingsPublic,
    ChatCompletionResponse,
    ChatMessage,
    SchemaTableRule,
    ToolCallRecord,
} from './ai.types';
import { DEFAULT_AI_SYSTEM_PROMPT } from './ai-default-prompt';
import { AI_TOOLS_CATALOG } from './ai-tools.catalog';
import { AiToolsExecutor } from './ai-tools.executor';
import { DEFAULT_SCHEMA_TABLE_RULES, getFullSchemaTableRules } from './schema-rules.catalog';

function getSettingsFilePath(): string {
    const cwd = process.cwd();
    if (path.basename(cwd) === 'backend') {
        return path.resolve(cwd, 'data', 'ai-settings.json');
    }
    return path.resolve(cwd, 'backend', 'data', 'ai-settings.json');
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private settings: AiSettings;

    constructor(
        private readonly config: ConfigService,
        private readonly toolsExecutor: AiToolsExecutor,
    ) {
        this.settings = this.loadSettings();
    }

    private loadSettings(): AiSettings {
        const envOpenaiKey = this.config.get<string>('OPENAI_API_KEY') || '';
        const envAnthropicKey = this.config.get<string>('ANTHROPIC_API_KEY') || '';
        const defaultProvider: AiProvider = (this.config.get<string>('AI_DEFAULT_PROVIDER') as AiProvider) || 'openai';
        const defaultModel = defaultProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o';

        const fallback: AiSettings = {
            provider: defaultProvider,
            model: defaultModel,
            openaiApiKey: envOpenaiKey,
            anthropicApiKey: envAnthropicKey,
            systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
            temperature: 0.2,
            maxTokens: 3000,
            enableSqlFallback: true,
            enableApiTools: true,
            tableRules: {},
        };

        try {
            const filePath = getSettingsFilePath();
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                return {
                    ...fallback,
                    ...parsed,
                    openaiApiKey: parsed.openaiApiKey || envOpenaiKey,
                    anthropicApiKey: parsed.anthropicApiKey || envAnthropicKey,
                    tableRules: parsed.tableRules || {},
                };
            }
        } catch (err: any) {
            this.logger.warn(`Could not read AI settings file: ${err.message}`);
        }

        return fallback;
    }

    private persistSettings(): void {
        try {
            const filePath = getSettingsFilePath();
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
        } catch (err: any) {
            this.logger.error(`Could not persist AI settings: ${err.message}`);
        }
    }

    getPublicSettings(): AiSettingsPublic {
        const maskKey = (key?: string) => {
            if (!key) return '';
            if (key.length <= 8) return '••••••••';
            return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
        };

        return {
            provider: this.settings.provider,
            model: this.settings.model,
            hasOpenaiKey: Boolean(this.settings.openaiApiKey),
            hasAnthropicKey: Boolean(this.settings.anthropicApiKey),
            openaiKeyMasked: maskKey(this.settings.openaiApiKey),
            anthropicKeyMasked: maskKey(this.settings.anthropicApiKey),
            systemPrompt: this.settings.systemPrompt,
            temperature: this.settings.temperature,
            maxTokens: this.settings.maxTokens,
            enableSqlFallback: this.settings.enableSqlFallback,
            enableApiTools: this.settings.enableApiTools,
            tableRules: this.settings.tableRules || {},
            availableModels: {
                openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'],
                anthropic: [
                    'claude-3-5-haiku-20241022',
                    'claude-3-haiku-20240307',
                    'claude-3-5-sonnet-20241022',
                    'claude-3-5-sonnet-20240620',
                    'claude-3-sonnet-20240229',
                    'claude-3-7-sonnet-20250219',
                    'claude-3-opus-20240229',
                ],
            },
        };
    }

    updateSettings(patch: Partial<AiSettings>): AiSettingsPublic {
        if (patch.provider) this.settings.provider = patch.provider;
        if (patch.model) this.settings.model = patch.model;
        if (patch.openaiApiKey !== undefined) this.settings.openaiApiKey = patch.openaiApiKey.trim();
        if (patch.anthropicApiKey !== undefined) this.settings.anthropicApiKey = patch.anthropicApiKey.trim();
        if (patch.systemPrompt !== undefined) this.settings.systemPrompt = patch.systemPrompt;
        if (typeof patch.temperature === 'number') this.settings.temperature = Math.max(0, Math.min(1, patch.temperature));
        if (typeof patch.maxTokens === 'number') this.settings.maxTokens = Math.max(100, Math.min(8000, patch.maxTokens));
        if (typeof patch.enableSqlFallback === 'boolean') this.settings.enableSqlFallback = patch.enableSqlFallback;
        if (typeof patch.enableApiTools === 'boolean') this.settings.enableApiTools = patch.enableApiTools;
        if (patch.tableRules) this.settings.tableRules = { ...this.settings.tableRules, ...patch.tableRules };

        this.persistSettings();
        return this.getPublicSettings();
    }

    getSchemaTableRules(): SchemaTableRule[] {
        const fullList = getFullSchemaTableRules();
        const customRules = this.settings.tableRules || {};

        return fullList.map((item) => ({
            ...item,
            businessRules: customRules[item.tableName] !== undefined
                ? customRules[item.tableName]
                : item.businessRules,
        }));
    }

    updateTableRule(tableName: string, rule: string): SchemaTableRule[] {
        if (!this.settings.tableRules) this.settings.tableRules = {};
        this.settings.tableRules[tableName] = rule;
        this.persistSettings();
        return this.getSchemaTableRules();
    }

    updateAllTableRules(rulesMap: Record<string, string>): SchemaTableRule[] {
        if (!this.settings.tableRules) this.settings.tableRules = {};
        this.settings.tableRules = { ...this.settings.tableRules, ...rulesMap };
        this.persistSettings();
        return this.getSchemaTableRules();
    }

    async testConnection(provider?: AiProvider, apiKey?: string, model?: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
        const targetProvider = provider || this.settings.provider;
        const key = (apiKey != null && apiKey.trim().length > 0)
            ? apiKey.trim()
            : (targetProvider === 'openai' ? this.settings.openaiApiKey : this.settings.anthropicApiKey);
        const targetModel = model || (targetProvider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-20241022');

        if (!key) {
            return {
                success: false,
                message: `API key is missing for provider '${targetProvider}'. Please enter an API key.`,
                latencyMs: 0,
            };
        }

        const start = Date.now();
        try {
            if (targetProvider === 'openai') {
                const client = new OpenAI({ apiKey: key });
                const res = await client.chat.completions.create({
                    model: targetModel,
                    messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
                    max_tokens: 10,
                });
                const reply = res.choices[0]?.message?.content?.trim() || '';
                return {
                    success: true,
                    message: `Connected successfully to OpenAI (${targetModel}). Response: "${reply}"`,
                    latencyMs: Date.now() - start,
                };
            } else {
                const client = new Anthropic({ apiKey: key });
                const res = await client.messages.create({
                    model: targetModel,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
                });
                const textBlock = res.content.find((c) => c.type === 'text');
                const reply = (textBlock as any)?.text?.trim() || '';
                return {
                    success: true,
                    message: `Connected successfully to Anthropic Claude (${targetModel}). Response: "${reply}"`,
                    latencyMs: Date.now() - start,
                };
            }
        } catch (err: any) {
            this.logger.error(`AI test connection error: ${err.message}`, err.stack);
            let detailMsg = err?.error?.message || err?.message || 'Connection test failed';
            if (err?.status === 404 || (typeof detailMsg === 'string' && detailMsg.includes('not_found_error'))) {
                detailMsg = `Model "${targetModel}" is not enabled on this Anthropic account tier. Try switching to "claude-3-5-haiku-20241022" or "claude-3-haiku-20240307".`;
            }
            return {
                success: false,
                message: detailMsg,
                latencyMs: Date.now() - start,
            };
        }
    }

    getToolsCatalog() {
        let list = [...AI_TOOLS_CATALOG];
        if (!this.settings.enableSqlFallback) {
            list = list.filter((t) => t.name !== 'execute_readonly_sql');
        }
        if (!this.settings.enableApiTools) {
            list = list.filter((t) => t.name === 'execute_readonly_sql');
        }
        return list;
    }

    private buildEffectiveSystemPrompt(customSystemPrompt?: string): string {
        const base = customSystemPrompt || this.settings.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT;
        const rulesList = this.getSchemaTableRules().filter(
            (r) => r.businessRules && r.businessRules.trim().length > 0,
        );

        if (rulesList.length === 0) {
            return base;
        }

        const compiledRules = rulesList
            .map(
                (r) =>
                    `• dbo.${r.tableName} (${r.category || 'Table'}):\n  - Key Columns: ${(r.columns || []).slice(0, 10).join(', ')}\n  - Business Rules: ${r.businessRules.trim()}`,
            )
            .join('\n\n');

        return `${base}\n\n### 📋 USER-DEFINED TABLE BUSINESS RULES & SCHEMA CONVENTIONS:\n${compiledRules}`;
    }

    async chat(
        userMessages: { role: 'user' | 'assistant'; content: string }[],
        options?: {
            providerOverride?: AiProvider;
            modelOverride?: string;
            customSystemPrompt?: string;
        },
    ): Promise<ChatCompletionResponse> {
        const provider = options?.providerOverride || this.settings.provider;
        const model = options?.modelOverride || this.settings.model;
        const systemPrompt = this.buildEffectiveSystemPrompt(options?.customSystemPrompt);

        const tools = this.getToolsCatalog();

        if (provider === 'openai') {
            try {
                return await this.runOpenAiChat(userMessages, model, systemPrompt, tools);
            } catch (err: any) {
                this.logger.error(`OpenAI Chat Error: ${err.message}`, err.stack);
                const detailMsg = err?.error?.message || err?.message || 'OpenAI chat completion failed.';
                throw new BadRequestException(`OpenAI Error: ${detailMsg}`);
            }
        } else {
            try {
                return await this.runAnthropicChat(userMessages, model, systemPrompt, tools);
            } catch (err: any) {
                this.logger.error(`Anthropic Chat Error: ${err.message}`, err.stack);
                const detailMsg = err?.error?.message || err?.message || 'Anthropic chat completion failed.';
                throw new BadRequestException(`Anthropic Claude Error: ${detailMsg}`);
            }
        }
    }

    private async runOpenAiChat(
        userMessages: { role: 'user' | 'assistant'; content: string }[],
        model: string,
        systemPrompt: string,
        tools: typeof AI_TOOLS_CATALOG,
    ): Promise<ChatCompletionResponse> {
        const apiKey = this.settings.openaiApiKey;
        if (!apiKey) {
            throw new Error(
                'OpenAI API key is not configured. Please open AI Settings and provide your OpenAI API key.',
            );
        }

        const client = new OpenAI({ apiKey });
        const formattedTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters as any,
            },
        }));

        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...userMessages.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        ];

        const toolsUsed: ToolCallRecord[] = [];
        let iterations = 0;
        const maxIterations = 6;
        let finalAnswer = '';
        let promptTokens = 0;
        let completionTokens = 0;

        while (iterations < maxIterations) {
            iterations++;
            const response = await client.chat.completions.create({
                model,
                messages,
                tools: formattedTools.length > 0 ? formattedTools : undefined,
                temperature: this.settings.temperature,
                max_tokens: this.settings.maxTokens,
            });

            if (response.usage) {
                promptTokens += response.usage.prompt_tokens;
                completionTokens += response.usage.completion_tokens;
            }

            const choice = response.choices[0];
            if (!choice) {
                throw new Error('No response choice received from OpenAI.');
            }

            const assistantMessage = choice.message;
            messages.push(assistantMessage);

            // If the model called functions / tools
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                for (const toolCall of assistantMessage.tool_calls) {
                    if (toolCall.type !== 'function') continue;
                    const fnName = toolCall.function.name;
                    let fnArgs: Record<string, any> = {};
                    try {
                        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
                    } catch {
                        fnArgs = {};
                    }

                    this.logger.log(`OpenAI requested tool: ${fnName} with args: ${JSON.stringify(fnArgs)}`);
                    const executed = await this.toolsExecutor.executeTool(fnName, fnArgs);
                    toolsUsed.push(executed);

                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: executed.outputSummary || JSON.stringify({ status: 'done' }),
                    });
                }
            } else {
                finalAnswer = assistantMessage.content || '';
                break;
            }
        }

        return {
            answer: finalAnswer || 'I completed the query and verified the details.',
            provider: 'openai',
            model,
            toolsUsed,
            usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
            },
        };
    }

    private async runAnthropicChat(
        userMessages: { role: 'user' | 'assistant'; content: string }[],
        model: string,
        systemPrompt: string,
        tools: typeof AI_TOOLS_CATALOG,
    ): Promise<ChatCompletionResponse> {
        const apiKey = this.settings.anthropicApiKey;
        if (!apiKey) {
            throw new Error(
                'Anthropic API key is not configured. Please open AI Settings and provide your Claude API key.',
            );
        }

        const client = new Anthropic({ apiKey });
        const formattedTools: Anthropic.Tool[] = tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters as any,
        }));

        const messages: Anthropic.MessageParam[] = userMessages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        const toolsUsed: ToolCallRecord[] = [];
        let iterations = 0;
        const maxIterations = 6;
        let finalAnswer = '';

        while (iterations < maxIterations) {
            iterations++;
            const response = await client.messages.create({
                model,
                system: systemPrompt,
                messages,
                tools: formattedTools.length > 0 ? formattedTools : undefined,
                temperature: this.settings.temperature,
                max_tokens: this.settings.maxTokens,
            });

            const textParts: string[] = [];
            const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

            for (const block of response.content) {
                if (block.type === 'text') {
                    textParts.push(block.text);
                } else if (block.type === 'tool_use') {
                    toolUseBlocks.push(block);
                }
            }

            if (toolUseBlocks.length > 0) {
                // Record assistant response with tool_use blocks
                messages.push({
                    role: 'assistant',
                    content: response.content,
                });

                const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

                for (const toolUse of toolUseBlocks) {
                    const fnName = toolUse.name;
                    const fnArgs = (toolUse.input as Record<string, any>) || {};

                    this.logger.log(`Claude requested tool: ${fnName} with args: ${JSON.stringify(fnArgs)}`);
                    const executed = await this.toolsExecutor.executeTool(fnName, fnArgs);
                    toolsUsed.push(executed);

                    toolResultBlocks.push({
                        type: 'tool_result',
                        tool_use_id: toolUse.id,
                        content: executed.outputSummary || JSON.stringify({ status: 'done' }),
                    });
                }

                messages.push({
                    role: 'user',
                    content: toolResultBlocks,
                });
            } else {
                finalAnswer = textParts.join('\n\n');
                break;
            }
        }

        return {
            answer: finalAnswer || 'I completed the query and verified the details.',
            provider: 'anthropic',
            model,
            toolsUsed,
        };
    }
}
