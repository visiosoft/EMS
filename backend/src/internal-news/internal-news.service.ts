import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { News } from '../entities/news.entity';
import { CreateNewsDto } from './dto/create-news.dto';

export type InternalNewsListItem = {
  id: string;
  title: string;
  summary: string;
  body: string;
  createdBy: string | null;
  createdByName: string;
  createdAt: string | null;
  modifiedBy: string | null;
  modifiedAt: string | null;
};

const MAX_BODY_LENGTH = 5000;

@Injectable()
export class InternalNewsService {
  constructor(
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>,
    private readonly auditContext: AuditRequestContext,
  ) {}

  async findAll(limit = 12): Promise<InternalNewsListItem[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const rows = await this.newsRepository.find({
      order: { createdAt: 'DESC', modifiedAt: 'DESC' },
      take: safeLimit,
    });

    return rows.map((row) => this.toListItem(row));
  }

  async create(dto: CreateNewsDto): Promise<InternalNewsListItem> {
    const title = dto.title.trim();
    const summary = dto.summary.trim();
    const body = dto.body.trim();
    const bodyText = stripHtml(body);

    if (bodyText.length < 20) {
      throw new BadRequestException('News body must be at least 20 characters.');
    }

    if (bodyText.length > MAX_BODY_LENGTH) {
      throw new BadRequestException('News body must be 5,000 characters or fewer.');
    }

    const now = new Date();
    const userOid = this.auditContext.getUserOid();

    const row = this.newsRepository.create({
      title,
      summary,
      body,
      createdBy: userOid,
      createdAt: now,
      modifiedBy: userOid,
      modifiedAt: now,
    });

    const saved = await this.newsRepository.save(row);
    return this.toListItem(saved);
  }

  private toListItem(row: News): InternalNewsListItem {
    const currentUserName = this.auditContext.getUserDisplayName();
    const currentUserOid = this.auditContext.getUserOid();
    const fallbackAuthor = row.createdBy ? 'Entra user' : 'Unknown user';

    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      body: row.body,
      createdBy: row.createdBy,
      createdByName:
        row.createdBy && currentUserOid && row.createdBy === currentUserOid && currentUserName
          ? currentUserName
          : fallbackAuthor,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      modifiedBy: row.modifiedBy,
      modifiedAt: row.modifiedAt ? row.modifiedAt.toISOString() : null,
    };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
