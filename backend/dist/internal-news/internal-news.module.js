"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalNewsModule = void 0;
const common_1 = require("@nestjs/common");
const admin_users_module_1 = require("../admin-users/admin-users.module");
const internal_news_controller_1 = require("./internal-news.controller");
const internal_news_service_1 = require("./internal-news.service");
let InternalNewsModule = class InternalNewsModule {
};
exports.InternalNewsModule = InternalNewsModule;
exports.InternalNewsModule = InternalNewsModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_users_module_1.AdminUsersModule],
        controllers: [internal_news_controller_1.InternalNewsController],
        providers: [internal_news_service_1.InternalNewsService],
        exports: [internal_news_service_1.InternalNewsService],
    })
], InternalNewsModule);
//# sourceMappingURL=internal-news.module.js.map