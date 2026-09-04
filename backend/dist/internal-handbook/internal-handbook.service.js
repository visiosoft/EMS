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
    async getImage(sectionContentId, index) {
        const rows = await this.dataSource.query(`SELECT HtmlContent FROM SectionContent WHERE SectionContentID = @0 AND IsActive = 1`, [sectionContentId]);
        const row = rows[0];
        if (!row)
            return null;
        const images = this.extractOrderedImages(row.HtmlContent ?? '');
        const image = images[index];
        if (!image)
            return null;
        const base64 = image.dataUri.slice(image.dataUri.indexOf(',') + 1);
        return { buffer: Buffer.from(base64, 'base64'), mimeType: image.mimeType };
    }
    stripNumberPrefix(title) {
        return title.replace(/^\d+\.\s*/, '');
    }
    rowToGrouped(row) {
        const cleanedTitle = this.stripNumberPrefix(row.SectionTitle);
        const sectionId = this.sectionTitleToId(cleanedTitle);
        const blocks = this.htmlToBlocks(row.HtmlContent ?? '', row.SectionContentID);
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
    htmlToBlocks(html, sectionContentId) {
        const blocks = [];
        let content = html.trim();
        content = content
            .replace(/<\/?(?:html|body|head|meta|title|style|script)[^>]*>/gi, '')
            .trim();
        const tagRegex = /<(p|h[1-6]|ul|ol|div|section|article)[^>]*>[\s\S]*?<\/\1>/gi;
        let match;
        let imageIndex = 0;
        while ((match = tagRegex.exec(content)) !== null) {
            const fullTag = match[0];
            const tagName = match[1].toLowerCase();
            const innerHtml = fullTag
                .replace(/^<[^>]+>/, '')
                .replace(/<\/[^>]+>$/, '')
                .trim();
            if (/^<img\b/i.test(innerHtml)) {
                const image = this.extractContainerImage(innerHtml);
                if (image) {
                    blocks.push({
                        kind: 'image',
                        src: `/internal/handbook/image/${sectionContentId}/${imageIndex}`,
                        alt: image.alt || undefined,
                    });
                    imageIndex++;
                }
                continue;
            }
            const text = this.normalizeText(innerHtml);
            if (!text)
                continue;
            if (tagName === 'p' ||
                tagName === 'div' ||
                tagName === 'section' ||
                tagName === 'article') {
                blocks.push({
                    kind: this.isFullyBold(innerHtml, text) ? 'heading' : 'paragraph',
                    text,
                });
            }
            else if (tagName.match(/^h[1-6]$/)) {
                blocks.push({ kind: 'heading', text });
            }
            else if (tagName === 'ul' || tagName === 'ol') {
                const items = [];
                const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
                let liMatch;
                while ((liMatch = liRegex.exec(innerHtml)) !== null) {
                    const liText = this.normalizeText(liMatch[1]);
                    if (liText)
                        items.push(liText);
                }
                if (items.length > 0) {
                    blocks.push({ kind: 'list', items });
                }
            }
        }
        return blocks;
    }
    extractOrderedImages(html) {
        const content = html
            .trim()
            .replace(/<\/?(?:html|body|head|meta|title|style|script)[^>]*>/gi, '')
            .trim();
        const tagRegex = /<(p|h[1-6]|ul|ol|div|section|article)[^>]*>[\s\S]*?<\/\1>/gi;
        const images = [];
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            const innerHtml = match[0]
                .replace(/^<[^>]+>/, '')
                .replace(/<\/[^>]+>$/, '')
                .trim();
            if (!/^<img\b/i.test(innerHtml))
                continue;
            const image = this.extractContainerImage(innerHtml);
            if (image)
                images.push(image);
        }
        return images;
    }
    extractContainerImage(innerHtml) {
        const srcMatch = /<img\b[^>]*?\bsrc\s*=\s*"(data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+)"[^>]*?>/i.exec(innerHtml);
        if (!srcMatch)
            return null;
        const dataUri = srcMatch[1].replace(/\s+/g, '');
        const mimeMatch = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(dataUri);
        if (!mimeMatch)
            return null;
        const altMatch = /\balt\s*=\s*"([^"]*)"/i.exec(srcMatch[0]);
        const alt = altMatch ? this.normalizeText(altMatch[1]) : '';
        return { dataUri, mimeType: mimeMatch[1], alt };
    }
    stripHtml(html) {
        return html.replace(/<[^>]+>/g, '');
    }
    normalizeText(html) {
        return this.decodeEntities(this.stripHtml(html))
            .replace(/\s+/g, ' ')
            .trim();
    }
    isFullyBold(innerHtml, text) {
        if (!text)
            return false;
        let bold = '';
        const boldRegex = /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi;
        let match;
        while ((match = boldRegex.exec(innerHtml)) !== null) {
            bold += ` ${match[2]} `;
        }
        return this.normalizeText(bold) === text;
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