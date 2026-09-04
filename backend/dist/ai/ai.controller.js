"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = exports.ChatRequestDto = exports.ChatMessageDto = exports.TestConnectionDto = exports.UpdateTableRulesDto = exports.UpdateAiSettingsDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const ai_service_1 = require("./ai.service");
const ai_default_prompt_1 = require("./ai-default-prompt");
class UpdateAiSettingsDto {
    provider;
    model;
    openaiApiKey;
    anthropicApiKey;
    systemPrompt;
    temperature;
    maxTokens;
    enableSqlFallback;
    enableApiTools;
    tableRules;
}
exports.UpdateAiSettingsDto = UpdateAiSettingsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "openaiApiKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "anthropicApiKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "systemPrompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateAiSettingsDto.prototype, "temperature", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateAiSettingsDto.prototype, "maxTokens", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAiSettingsDto.prototype, "enableSqlFallback", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAiSettingsDto.prototype, "enableApiTools", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateAiSettingsDto.prototype, "tableRules", void 0);
class UpdateTableRulesDto {
    rules;
    tableName;
    businessRules;
}
exports.UpdateTableRulesDto = UpdateTableRulesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateTableRulesDto.prototype, "rules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTableRulesDto.prototype, "tableName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTableRulesDto.prototype, "businessRules", void 0);
class TestConnectionDto {
    provider;
    apiKey;
    model;
}
exports.TestConnectionDto = TestConnectionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestConnectionDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestConnectionDto.prototype, "apiKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestConnectionDto.prototype, "model", void 0);
class ChatMessageDto {
    role;
    content;
}
exports.ChatMessageDto = ChatMessageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "content", void 0);
class ChatRequestDto {
    messages;
    providerOverride;
    modelOverride;
    customSystemPrompt;
}
exports.ChatRequestDto = ChatRequestDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ChatRequestDto.prototype, "messages", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatRequestDto.prototype, "providerOverride", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatRequestDto.prototype, "modelOverride", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatRequestDto.prototype, "customSystemPrompt", void 0);
let AiController = class AiController {
    aiService;
    constructor(aiService) {
        this.aiService = aiService;
    }
    getSettings() {
        return this.aiService.getPublicSettings();
    }
    updateSettings(body) {
        return this.aiService.updateSettings(body);
    }
    async testConnection(body) {
        return this.aiService.testConnection(body.provider, body.apiKey, body.model);
    }
    async chat(body) {
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
    getTools() {
        return {
            tools: this.aiService.getToolsCatalog(),
        };
    }
    getDefaultPrompt() {
        return {
            prompt: ai_default_prompt_1.DEFAULT_AI_SYSTEM_PROMPT,
        };
    }
    getSchemaRules() {
        return {
            tables: this.aiService.getSchemaTableRules(),
        };
    }
    updateSchemaRules(body) {
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
    getKnowledgeBase() {
        return {
            articles: this.aiService.getKnowledgeArticles(),
        };
    }
    saveKnowledgeArticle(body) {
        return {
            articles: this.aiService.saveKnowledgeArticle(body),
        };
    }
    deleteKnowledgeArticle(id) {
        return {
            articles: this.aiService.deleteKnowledgeArticle(id),
        };
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdateAiSettingsDto]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)('test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TestConnectionDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ChatRequestDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "chat", null);
__decorate([
    (0, common_1.Get)('tools'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getTools", null);
__decorate([
    (0, common_1.Get)('default-prompt'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getDefaultPrompt", null);
__decorate([
    (0, common_1.Get)('schema-rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getSchemaRules", null);
__decorate([
    (0, common_1.Post)('schema-rules'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdateTableRulesDto]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "updateSchemaRules", null);
__decorate([
    (0, common_1.Get)('knowledge-base'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getKnowledgeBase", null);
__decorate([
    (0, common_1.Post)('knowledge-base'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "saveKnowledgeArticle", null);
__decorate([
    (0, common_1.Delete)('knowledge-base/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "deleteKnowledgeArticle", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map