import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { AiService } from './ai.service';
import { DEFAULT_AI_SYSTEM_PROMPT } from './ai-default-prompt';
import { AiProvider, AiSettings, KnowledgeArticle } from './ai.types';

export class UpdateAiSettingsDto {
    @IsOptional()
    @IsString()
    provider?: AiProvider;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsString()
    openaiApiKey?: string;

    @IsOptional()
    @IsString()
    anthropicApiKey?: string;

    @IsOptional()
    @IsString()
    systemPrompt?: string;

    @IsOptional()
    @IsNumber()
    temperature?: number;

    @IsOptional()
    @IsNumber()
    maxTokens?: number;

    @IsOptional()
    @IsBoolean()
    enableSqlFallback?: boolean;

    @IsOptional()
    @IsBoolean()
    enableApiTools?: boolean;

    @IsOptional()
    tableRules?: Record<string, string>;
}

export class UpdateTableRulesDto {
    @IsOptional()
    rules?: Record<string, string>;

    @IsOptional()
    @IsString()
    tableName?: string;

    @IsOptional()
    @IsString()
    businessRules?: string;
}

export class TestConnectionDto {
    @IsOptional()
    @IsString()
    provider?: AiProvider;

    @IsOptional()
    @IsString()
    apiKey?: string;

    @IsOptional()
    @IsString()
    model?: string;
}

export class ChatMessageDto {
    @IsString()
    role: 'user' | 'assistant';

    @IsString()
    content: string;
}

export class ChatRequestDto {
    @IsArray()
    messages: ChatMessageDto[];

    @IsOptional()
    @IsString()
    providerOverride?: AiProvider;

    @IsOptional()
    @IsString()
    modelOverride?: string;

    @IsOptional()
    @IsString()
    customSystemPrompt?: string;
}

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('settings')
    getSettings() {
        return this.aiService.getPublicSettings();
    }

    @Post('settings')
    updateSettings(@Body() body: UpdateAiSettingsDto) {
        return this.aiService.updateSettings(body as Partial<AiSettings>);
    }

    @Post('test')
    async testConnection(@Body() body: TestConnectionDto) {
        return this.aiService.testConnection(body.provider, body.apiKey, body.model);
    }

    @Post('chat')
    async chat(@Body() body: ChatRequestDto) {
        if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            return {
                answer: 'Please provide at least one message.',
                toolsUsed: [],
            };
        }
        return this.aiService.chat(body.messages, {
            providerOverride: body.providerOverride,
            modelOverride: body.modelOverride,
            customSystemPrompt: body.customSystemPrompt,
        });
    }

    @Get('tools')
    getTools() {
        return {
            tools: this.aiService.getToolsCatalog(),
        };
    }

    @Get('default-prompt')
    getDefaultPrompt() {
        return {
            prompt: DEFAULT_AI_SYSTEM_PROMPT,
        };
    }

    @Get('schema-rules')
    getSchemaRules() {
        return {
            tables: this.aiService.getSchemaTableRules(),
        };
    }

    @Post('schema-rules')
    updateSchemaRules(@Body() body: UpdateTableRulesDto) {
        if (body.tableName && body.businessRules !== undefined) {
            return {
                tables: this.aiService.updateTableRule(body.tableName, body.businessRules),
            };
        }
        if (body.rules && typeof body.rules === 'object') {
            return {
                tables: this.aiService.updateAllTableRules(body.rules),
            };
        }
        return {
            tables: this.aiService.getSchemaTableRules(),
        };
    }

    @Get('knowledge-base')
    getKnowledgeBase() {
        return {
            articles: this.aiService.getKnowledgeArticles(),
        };
    }

    @Post('knowledge-base')
    saveKnowledgeArticle(@Body() body: Partial<KnowledgeArticle>) {
        return {
            articles: this.aiService.saveKnowledgeArticle(body),
        };
    }

    @Delete('knowledge-base/:id')
    deleteKnowledgeArticle(@Param('id') id: string) {
        return {
            articles: this.aiService.deleteKnowledgeArticle(id),
        };
    }
}
