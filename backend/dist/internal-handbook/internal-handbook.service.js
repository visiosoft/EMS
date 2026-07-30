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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalHandbookService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let InternalHandbookService = class InternalHandbookService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async findAllSections() {
        const rows = await this.dataSource.query(`SELECT SectionContentID, SectionTitle, SectionNumber, HtmlContent, CanvasContent, APIResponse, NavigationConfig
       FROM SectionContent
       WHERE IsActive = 1
       ORDER BY SectionNumber, SectionContentID`);
        return rows.map((row) => this.rowToGrouped(row));
    }
    async findSectionBySectionId(sectionId) {
        const rows = await this.dataSource.query(`SELECT SectionContentID, SectionTistle, SectionNumber, HtmlContent, CanvasContent, APIResponse, NavigationConfig
       FROM SectionContent
       WHERE IsActive = 1`);
        const matched = rows.find((r) => this.sectionTitleToId(this.stripNumberPrefix(r.SectionTitle)) ===
            sectionId);
        return matched ? this.rowToGrouped(matched) : null;
    }
    stripNumberPrefix(title) {
        return title.replace(/^\d+\.\s*/, '');
    }
    rowToGrouped(row) {
        const cleanedTitle = this.stripNumberPrefix(row.SectionTitle);
        const sectionId = this.sectionTitleToId(cleanedTitle);
        const blocks = this.htmlToBlocks(row.HtmlContent ?? '');
        return {
            sectionNumber: row.SectionNumber,
            sectionId,
            sectionTitle: row.SectionTitle,
            heroTitle: row.SectionNumber != null
                ? `${row.SectionNumber}. ${cleanedTitle}`
                : cleanedTitle,
            subsections: [
                {
                    id: String(row.SectionContentID),
                    subsectionId: sectionId,
                    subsectionTitle: row.SectionTitle,
                    content: JSON.stringify(blocks),
                    sortOrder: 1,
                },
            ],
        };
    }
    sectionTitleToId(title) {
        const map = {
            Introduction: 'introduction',
            'Employment Policies and Practices': 'employment-policies',
            'Company Policies and Practices': 'company-policies',
            'Compensation and Benefits': 'compensation-benefits',
            'Work Performance': 'work-performance',
            'Department Guides and Procedures': 'department-guides',
        };
        return map[title] ?? this.slugify(title);
    }
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    htmlToBlocks(html) {
        const blocks = [];
        let content = html.trim();
        content = content
            .replace(/<\/?(?:html|body|head|meta|title|style|script)[^>]*>/gi, '')
            .trim();
        const tagRegex = /<(p|h[1-6]|ul|ol|div|section|article)[^>]*>[\s\S]*?<\/\1>/gi;
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            const fullTag = match[0];
            const tagName = match[1].toLowerCase();
            const innerHtml = fullTag
                .replace(/^<[^>]+>/, '')
                .replace(/<\/[^>]+>$/, '')
                .trim();
            const text = this.stripHtml(innerHtml).trim();
            if (!text)
                continue;
            if (tagName === 'p' ||
                tagName === 'div' ||
                tagName === 'section' ||
                tagName === 'article') {
                blocks.push({ kind: 'paragraph', text: this.decodeEntities(text) });
            }
            else if (tagName.match(/^h[1-6]$/)) {
                blocks.push({ kind: 'heading', text: this.decodeEntities(text) });
            }
            else if (tagName === 'ul' || tagName === 'ol') {
                const items = [];
                const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
                let liMatch;
                while ((liMatch = liRegex.exec(innerHtml)) !== null) {
                    const liText = this.stripHtml(liMatch[1]).trim();
                    if (liText)
                        items.push(this.decodeEntities(liText));
                }
                if (items.length > 0) {
                    blocks.push({ kind: 'list', items });
                }
            }
        }
        return blocks;
    }
    stripHtml(html) {
        return html.replace(/<[^>]+>/g, '');
    }
    decodeEntities(text) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
    }
};
exports.InternalHandbookService = InternalHandbookService;
exports.InternalHandbookService = InternalHandbookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], InternalHandbookService);
//# sourceMappingURL=internal-handbook.service.js.map