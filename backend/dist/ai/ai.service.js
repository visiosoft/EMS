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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const ai_default_prompt_1 = require("./ai-default-prompt");
const ai_tools_catalog_1 = require("./ai-tools.catalog");
const ai_tools_executor_1 = require("./ai-tools.executor");
const schema_rules_catalog_1 = require("./schema-rules.catalog");
const knowledge_base_catalog_1 = require("./knowledge-base.catalog");
function getSettingsFilePath() {
    const cwd = process.cwd();
    if (path.basename(cwd) === 'backend') {
        return path.resolve(cwd, 'data', 'ai-settings.json');
    }
    return path.resolve(cwd, 'backend', 'data', 'ai-settings.json');
}
let AiService = AiService_1 = class AiService {
    config;
    toolsExecutor;
    logger = new common_1.Logger(AiService_1.name);
    settings;
    constructor(config, toolsExecutor) {
        this.config = config;
        this.toolsExecutor = toolsExecutor;
        this.settings = this.loadSettings();
    }
    loadSettings() {
        const envOpenaiKey = this.config.get('OPENAI_API_KEY') || '';
        const envAnthropicKey = this.config.get('ANTHROPIC_API_KEY') || '';
        const defaultProvider = this.config.get('AI_DEFAULT_PROVIDER') || 'openai';
        const defaultModel = defaultProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o';
        const fallback = {
            provider: defaultProvider,
            model: defaultModel,
            openaiApiKey: envOpenaiKey,
            anthropicApiKey: envAnthropicKey,
            systemPrompt: ai_default_prompt_1.DEFAULT_AI_SYSTEM_PROMPT,
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
        }
        catch (err) {
            this.logger.warn(`Could not read AI settings file: ${err.message}`);
        }
        return fallback;
    }
    persistSettings() {
        try {
            const filePath = getSettingsFilePath();
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
        }
        catch (err) {
            this.logger.error(`Could not persist AI settings: ${err.message}`);
        }
    }
    getPublicSettings() {
        const maskKey = (key) => {
            if (!key)
                return '';
            if (key.length <= 8)
                return '••••••••';
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
    updateSettings(patch) {
        if (patch.provider)
            this.settings.provider = patch.provider;
        if (patch.model)
            this.settings.model = patch.model;
        if (patch.openaiApiKey !== undefined)
            this.settings.openaiApiKey = patch.openaiApiKey.trim();
        if (patch.anthropicApiKey !== undefined)
            this.settings.anthropicApiKey = patch.anthropicApiKey.trim();
        if (patch.systemPrompt !== undefined)
            this.settings.systemPrompt = patch.systemPrompt;
        if (typeof patch.temperature === 'number')
            this.settings.temperature = Math.max(0, Math.min(1, patch.temperature));
        if (typeof patch.maxTokens === 'number')
            this.settings.maxTokens = Math.max(100, Math.min(8000, patch.maxTokens));
        if (typeof patch.enableSqlFallback === 'boolean')
            this.settings.enableSqlFallback = patch.enableSqlFallback;
        if (typeof patch.enableApiTools === 'boolean')
            this.settings.enableApiTools = patch.enableApiTools;
        if (patch.tableRules)
            this.settings.tableRules = { ...this.settings.tableRules, ...patch.tableRules };
        this.persistSettings();
        return this.getPublicSettings();
    }
    getSchemaTableRules() {
        const fullList = (0, schema_rules_catalog_1.getFullSchemaTableRules)();
        const customRules = this.settings.tableRules || {};
        return fullList.map((item) => ({
            ...item,
            businessRules: customRules[item.tableName] !== undefined
                ? customRules[item.tableName]
                : item.businessRules,
        }));
    }
    updateTableRule(tableName, rule) {
        if (!this.settings.tableRules)
            this.settings.tableRules = {};
        this.settings.tableRules[tableName] = rule;
        this.persistSettings();
        return this.getSchemaTableRules();
    }
    updateAllTableRules(rulesMap) {
        if (!this.settings.tableRules)
            this.settings.tableRules = {};
        this.settings.tableRules = { ...this.settings.tableRules, ...rulesMap };
        this.persistSettings();
        return this.getSchemaTableRules();
    }
    getKnowledgeArticles() {
        return (0, knowledge_base_catalog_1.getFullKnowledgeBase)();
    }
    saveKnowledgeArticle(article) {
        const current = (0, knowledge_base_catalog_1.getFullKnowledgeBase)();
        const id = article.id || `kb_${Date.now()}`;
        const newArt = {
            id,
            title: article.title || 'Untitled Guide',
            category: article.category || 'General Operations',
            tags: article.tags || [],
            summary: article.summary || '',
            steps: article.steps || [],
            tips: article.tips || [],
            relatedPages: article.relatedPages || [],
        };
        const existingIdx = current.findIndex((a) => a.id === id);
        if (existingIdx >= 0) {
            current[existingIdx] = newArt;
        }
        else {
            current.push(newArt);
        }
        (0, knowledge_base_catalog_1.saveKnowledgeBase)(current);
        return current;
    }
    deleteKnowledgeArticle(id) {
        const current = (0, knowledge_base_catalog_1.getFullKnowledgeBase)().filter((a) => a.id !== id);
        (0, knowledge_base_catalog_1.saveKnowledgeBase)(current);
        return current;
    }
    async testConnection(provider, apiKey, model) {
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
                const client = new openai_1.default({ apiKey: key });
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
            }
            else {
                const client = new sdk_1.default({ apiKey: key });
                const res = await client.messages.create({
                    model: targetModel,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
                });
                const textBlock = res.content.find((c) => c.type === 'text');
                const reply = textBlock?.text?.trim() || '';
                return {
                    success: true,
                    message: `Connected successfully to Anthropic Claude (${targetModel}). Response: "${reply}"`,
                    latencyMs: Date.now() - start,
                };
            }
        }
        catch (err) {
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
        let list = [...ai_tools_catalog_1.AI_TOOLS_CATALOG];
        if (!this.settings.enableSqlFallback) {
            list = list.filter((t) => t.name !== 'execute_readonly_sql');
        }
        if (!this.settings.enableApiTools) {
            list = list.filter((t) => t.name === 'execute_readonly_sql');
        }
        return list;
    }
    buildEffectiveSystemPrompt(customSystemPrompt) {
        let prompt = customSystemPrompt || this.settings.systemPrompt || ai_default_prompt_1.DEFAULT_AI_SYSTEM_PROMPT;
        const rulesList = this.getSchemaTableRules().filter((r) => r.businessRules && r.businessRules.trim().length > 0);
        if (rulesList.length > 0) {
            const compiledRules = rulesList
                .map((r) => `• dbo.${r.tableName} (${r.category || 'Table'}):\n  - Key Columns: ${(r.columns || []).slice(0, 10).join(', ')}\n  - Business Rules: ${r.businessRules.trim()}`)
                .join('\n\n');
            prompt += `\n\n### 📋 USER-DEFINED TABLE BUSINESS RULES & SCHEMA CONVENTIONS:\n${compiledRules}`;
        }
        const kbArticles = this.getKnowledgeArticles();
        if (kbArticles.length > 0) {
            const kbSummary = kbArticles
                .map((a) => `• [${a.title}] (Category: ${a.category}):\n  - Summary: ${a.summary}\n  - Steps:\n${a.steps.map((s, idx) => `    ${idx + 1}. ${s}`).join('\n')}`)
                .join('\n\n');
            prompt += `\n\n### 📚 EMS OPERATIONAL KNOWLEDGE BASE & SYSTEM MANUALS:\n${kbSummary}`;
        }
        return prompt;
    }
    async chat(userMessages, options) {
        const provider = options?.providerOverride || this.settings.provider;
        const model = options?.modelOverride || this.settings.model;
        const systemPrompt = this.buildEffectiveSystemPrompt(options?.customSystemPrompt);
        const tools = this.getToolsCatalog();
        if (provider === 'openai') {
            try {
                return await this.runOpenAiChat(userMessages, model, systemPrompt, tools);
            }
            catch (err) {
                this.logger.error(`OpenAI Chat Error: ${err.message}`, err.stack);
                const detailMsg = err?.error?.message || err?.message || 'OpenAI chat completion failed.';
                throw new common_1.BadRequestException(`OpenAI Error: ${detailMsg}`);
            }
        }
        else {
            try {
                return await this.runAnthropicChat(userMessages, model, systemPrompt, tools);
            }
            catch (err) {
                this.logger.error(`Anthropic Chat Error: ${err.message}`, err.stack);
                const detailMsg = err?.error?.message || err?.message || 'Anthropic chat completion failed.';
                throw new common_1.BadRequestException(`Anthropic Claude Error: ${detailMsg}`);
            }
        }
    }
    async runOpenAiChat(userMessages, model, systemPrompt, tools) {
        const apiKey = this.settings.openaiApiKey;
        if (!apiKey) {
            throw new Error('OpenAI API key is not configured. Please open AI Settings and provide your OpenAI API key.');
        }
        const client = new openai_1.default({ apiKey });
        const formattedTools = tools.map((t) => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const messages = [
            { role: 'system', content: systemPrompt },
            ...userMessages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
        ];
        const toolsUsed = [];
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
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                for (const toolCall of assistantMessage.tool_calls) {
                    if (toolCall.type !== 'function')
                        continue;
                    const fnName = toolCall.function.name;
                    let fnArgs = {};
                    try {
                        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
                    }
                    catch {
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
            }
            else {
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
    async runAnthropicChat(userMessages, model, systemPrompt, tools) {
        const apiKey = this.settings.anthropicApiKey;
        if (!apiKey) {
            throw new Error('Anthropic API key is not configured. Please open AI Settings and provide your Claude API key.');
        }
        const client = new sdk_1.default({ apiKey });
        const formattedTools = tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters,
        }));
        const messages = userMessages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
        const toolsUsed = [];
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
            const textParts = [];
            const toolUseBlocks = [];
            for (const block of response.content) {
                if (block.type === 'text') {
                    textParts.push(block.text);
                }
                else if (block.type === 'tool_use') {
                    toolUseBlocks.push(block);
                }
            }
            if (toolUseBlocks.length > 0) {
                messages.push({
                    role: 'assistant',
                    content: response.content,
                });
                const toolResultBlocks = [];
                for (const toolUse of toolUseBlocks) {
                    const fnName = toolUse.name;
                    const fnArgs = toolUse.input || {};
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
            }
            else {
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
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        ai_tools_executor_1.AiToolsExecutor])
], AiService);
//# sourceMappingURL=ai.service.js.map