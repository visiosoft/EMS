import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type HandbookSectionGrouped = {
  sectionNumber: number | null;
  sectionId: string;
  sectionTitle: string;
  heroTitle: string | null;
  subsections: Array<{
    id: string;
    subsectionId: string;
    subsectionTitle: string | null;
    content: string;
    sortOrder: number;
  }>;
};

type SectionContentRow = {
  SectionContentID: number;
  SectionTitle: string;
  SectionNumber: number | null;
  HtmlContent: string | null;
  CanvasContent: string | null;
  APIResponse: string | null;
  NavigationConfig: string | null;
};

type ContentBlock = {
  kind: 'paragraph' | 'heading' | 'list';
  text?: string;
  italic?: boolean;
  items?: string[];
};

@Injectable()
export class InternalHandbookService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async findAllSections(): Promise<HandbookSectionGrouped[]> {
    const rows = await this.dataSource.query<SectionContentRow[]>(
      `SELECT SectionContentID, SectionTitle, SectionNumber, HtmlContent, CanvasContent, APIResponse, NavigationConfig
       FROM SectionContent
       WHERE IsActive = 1
       ORDER BY SectionNumber, SectionContentID`,
    );
    return rows.map((row) => this.rowToGrouped(row));
  }

  async findSectionBySectionId(sectionId: string): Promise<HandbookSectionGrouped | null> {
    const rows = await this.dataSource.query<SectionContentRow[]>(
      `SELECT SectionContentID, SectionTistle, SectionNumber, HtmlContent, CanvasContent, APIResponse, NavigationConfig
       FROM SectionContent
       WHERE IsActive = 1`,
    );
    const matched = rows.find((r) => this.sectionTitleToId(this.stripNumberPrefix(r.SectionTitle)) === sectionId);
    return matched ? this.rowToGrouped(matched) : null;
  }

  private stripNumberPrefix(title: string): string {
    return title.replace(/^\d+\.\s*/, '');
  }

  private rowToGrouped(row: SectionContentRow): HandbookSectionGrouped {
    const cleanedTitle = this.stripNumberPrefix(row.SectionTitle);
    const sectionId = this.sectionTitleToId(cleanedTitle);
    const blocks = this.htmlToBlocks(row.HtmlContent ?? '');
    return {
      sectionNumber: row.SectionNumber,
      sectionId,
      sectionTitle: row.SectionTitle,
      heroTitle: row.SectionNumber != null ? `${row.SectionNumber}. ${cleanedTitle}` : cleanedTitle,
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

  private sectionTitleToId(title: string): string {
    const map: Record<string, string> = {
      'Introduction': 'introduction',
      'Employment Policies and Practices': 'employment-policies',
      'Company Policies and Practices': 'company-policies',
      'Compensation and Benefits': 'compensation-benefits',
      'Work Performance': 'work-performance',
      'Department Guides and Procedures': 'department-guides',
      // 'Procedures and Guidelines': 'department-guides',
    };
    return map[title] ?? this.slugify(title);
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private htmlToBlocks(html: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    let content = html.trim();

    content = content.replace(/<\/?(?:html|body|head|meta|title|style|script)[^>]*>/gi, '').trim();

    const tagRegex = /<(p|h[1-6]|ul|ol|div|section|article)[^>]*>[\s\S]*?<\/\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(content)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      const innerHtml = fullTag.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>$/, '').trim();
      const text = this.stripHtml(innerHtml).trim();

      if (!text) continue;

      if (tagName === 'p' || tagName === 'div' || tagName === 'section' || tagName === 'article') {
        blocks.push({ kind: 'paragraph', text: this.decodeEntities(text) });
      } else if (tagName.match(/^h[1-6]$/)) {
        blocks.push({ kind: 'heading', text: this.decodeEntities(text) });
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items: string[] = [];
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch: RegExpExecArray | null;
        while ((liMatch = liRegex.exec(innerHtml)) !== null) {
          const liText = this.stripHtml(liMatch[1]).trim();
          if (liText) items.push(this.decodeEntities(liText));
        }
        if (items.length > 0) {
          blocks.push({ kind: 'list', items });
        }
      }
    }

    return blocks;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '');
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}
