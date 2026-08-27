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

type ContentBlock =
  | { kind: 'paragraph' | 'heading'; text: string; italic?: boolean }
  | { kind: 'list'; items: string[] }
  | { kind: 'image'; src: string; alt?: string };

type ExtractedImage = { dataUri: string; mimeType: string; alt: string };

@Injectable()
export class InternalHandbookService {
  constructor(private readonly dataSource: DataSource) {}

  async findAllSections(): Promise<HandbookSectionGrouped[]> {
    const rows = await this.dataSource.query<SectionContentRow[]>(
      `SELECT SectionContentID, SectionTitle, SectionNumber, HtmlContent, CanvasContent, APIResponse, NavigationConfig
       FROM SectionContent
       WHERE IsActive = 1
       ORDER BY SectionNumber, SectionContentID`,
    );
    return rows.map((row) => this.rowToGrouped(row));
  }

  async findSectionBySectionId(
    sectionId: string,
  ): Promise<HandbookSectionGrouped | null> {
    const rows = await this.dataSource.query<SectionContentRow[]>(
      `SELECT SectionContentID, SectionTistle, SectionNumber, HtmlContent, CanvasContent, APIResponse, NavigationConfig
       FROM SectionContent
       WHERE IsActive = 1`,
    );
    const matched = rows.find(
      (r) =>
        this.sectionTitleToId(this.stripNumberPrefix(r.SectionTitle)) ===
        sectionId,
    );
    return matched ? this.rowToGrouped(matched) : null;
  }

  /** Decodes and streams a single embedded image previously surfaced as an `image` block. */
  async getImage(
    sectionContentId: number,
    index: number,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const rows = await this.dataSource.query<{ HtmlContent: string | null }[]>(
      `SELECT HtmlContent FROM SectionContent WHERE SectionContentID = @0 AND IsActive = 1`,
      [sectionContentId],
    );
    const row = rows[0];
    if (!row) return null;
    const images = this.extractOrderedImages(row.HtmlContent ?? '');
    const image = images[index];
    if (!image) return null;
    const base64 = image.dataUri.slice(image.dataUri.indexOf(',') + 1);
    return { buffer: Buffer.from(base64, 'base64'), mimeType: image.mimeType };
  }

  private stripNumberPrefix(title: string): string {
    return title.replace(/^\d+\.\s*/, '');
  }

  private rowToGrouped(row: SectionContentRow): HandbookSectionGrouped {
    const cleanedTitle = this.stripNumberPrefix(row.SectionTitle);
    const sectionId = this.sectionTitleToId(cleanedTitle);
    const blocks = this.htmlToBlocks(row.HtmlContent ?? '', row.SectionContentID);
    return {
      sectionNumber: row.SectionNumber,
      sectionId,
      sectionTitle: row.SectionTitle,
      heroTitle:
        row.SectionNumber != null
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

  private sectionTitleToId(title: string): string {
    const map: Record<string, string> = {
      Introduction: 'introduction',
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
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private htmlToBlocks(html: string, sectionContentId: number): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    let content = html.trim();

    content = content
      .replace(/<\/?(?:html|body|head|meta|title|style|script)[^>]*>/gi, '')
      .trim();

    const tagRegex =
      /<(p|h[1-6]|ul|ol|div|section|article)[^>]*>[\s\S]*?<\/\1>/gi;
    let match: RegExpExecArray | null;
    let imageIndex = 0;

    while ((match = tagRegex.exec(content)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      const innerHtml = fullTag
        .replace(/^<[^>]+>/, '')
        .replace(/<\/[^>]+>$/, '')
        .trim();

      // A container whose sole content is an <img> (well-formed or not — Word/SharePoint
      // paste sometimes produces broken markup here, see extractContainerImage) carries no
      // separate text: emit an image block for a valid embedded raster image, or drop the
      // container entirely rather than let stripHtml's tag-soup handling leak the malformed
      // remainder in as literal text.
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

      if (!text) continue;

      if (
        tagName === 'p' ||
        tagName === 'div' ||
        tagName === 'section' ||
        tagName === 'article'
      ) {
        blocks.push({
          kind: this.isFullyBold(innerHtml, text) ? 'heading' : 'paragraph',
          text,
        });
      } else if (tagName.match(/^h[1-6]$/)) {
        blocks.push({ kind: 'heading', text });
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items: string[] = [];
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch: RegExpExecArray | null;
        while ((liMatch = liRegex.exec(innerHtml)) !== null) {
          const liText = this.normalizeText(liMatch[1]);
          if (liText) items.push(liText);
        }
        if (items.length > 0) {
          blocks.push({ kind: 'list', items });
        }
      }
    }

    return blocks;
  }

  /**
   * Same container walk as htmlToBlocks, but only collects the valid embedded images, in
   * document order. Used by getImage() to resolve the numeric index a block's `src` URL
   * points at back to actual image bytes — the order here must match htmlToBlocks exactly.
   */
  private extractOrderedImages(html: string): ExtractedImage[] {
    const content = html
      .trim()
      .replace(/<\/?(?:html|body|head|meta|title|style|script)[^>]*>/gi, '')
      .trim();

    const tagRegex =
      /<(p|h[1-6]|ul|ol|div|section|article)[^>]*>[\s\S]*?<\/\1>/gi;
    const images: ExtractedImage[] = [];
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(content)) !== null) {
      const innerHtml = match[0]
        .replace(/^<[^>]+>/, '')
        .replace(/<\/[^>]+>$/, '')
        .trim();
      if (!/^<img\b/i.test(innerHtml)) continue;
      const image = this.extractContainerImage(innerHtml);
      if (image) images.push(image);
    }

    return images;
  }

  /**
   * Only PNG/JPEG/GIF/WEBP data-URI images are browser-renderable. Word "keep source
   * formatting" pastes often embed EMF vector images instead (`data:image/x-emf;...`), which
   * no browser can display, and copy-pasted SharePoint sharing links sometimes land as
   * `<img src="https://<a href="...">...</a>" ...>` — invalid markup a regex can't safely
   * bound. Both cases are filtered out here rather than surfaced as broken content.
   */
  private extractContainerImage(innerHtml: string): ExtractedImage | null {
    const srcMatch =
      /<img\b[^>]*?\bsrc\s*=\s*"(data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+)"[^>]*?>/i.exec(
        innerHtml,
      );
    if (!srcMatch) return null;
    const dataUri = srcMatch[1].replace(/\s+/g, '');
    const mimeMatch = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(dataUri);
    if (!mimeMatch) return null;
    const altMatch = /\balt\s*=\s*"([^"]*)"/i.exec(srcMatch[0]);
    const alt = altMatch ? this.normalizeText(altMatch[1]) : '';
    return { dataUri, mimeType: mimeMatch[1], alt };
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '');
  }

  /**
   * Extract visible text with whitespace normalized. The stored Word-exported HTML
   * is full of literal non-breaking spaces (U+00A0); left in place they form
   * unbreakable word runs that wrap early and stretch justified lines in the
   * rendered handbook. \s matches U+00A0, so all whitespace collapses to plain
   * single spaces here.
   */
  private normalizeText(html: string): string {
    return this.decodeEntities(this.stripHtml(html))
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * A paragraph whose entire visible text sits inside <strong>/<b> is a
   * sub-heading in the source document (Word exports mark them this way, e.g.
   * "<p><strong>Marketing</strong></p>"); stripHtml alone would silently drop
   * the emphasis and render it as body text.
   */
  private isFullyBold(innerHtml: string, text: string): boolean {
    if (!text) return false;
    let bold = '';
    const boldRegex = /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = boldRegex.exec(innerHtml)) !== null) {
      bold += ` ${match[2]} `;
    }
    return this.normalizeText(bold) === text;
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
