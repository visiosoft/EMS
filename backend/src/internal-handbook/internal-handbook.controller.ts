import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalHandbookService } from './internal-handbook.service';
import { SectionQueryDto } from './dto/section-query.dto';

@UseGuards(InternalAccessGuard)
@Controller('internal/handbook')
export class InternalHandbookController {
  constructor(
    private readonly internalHandbookService: InternalHandbookService,
  ) {}

  @Get('sections')
  findAllSections() {
    return this.internalHandbookService.findAllSections();
  }

  @Get('section')
  findSection(@Query() query: SectionQueryDto) {
    const sectionId = query.sectionId ?? query.title;
    if (!sectionId) {
      return this.internalHandbookService.findAllSections();
    }
    return this.internalHandbookService.findSectionBySectionId(sectionId);
  }

  @Get('image/:sectionContentId/:index')
  async getImage(
    @Param('sectionContentId', ParseIntPipe) sectionContentId: number,
    @Param('index', ParseIntPipe) index: number,
    @Res() res: Response,
  ) {
    const image = await this.internalHandbookService.getImage(
      sectionContentId,
      index,
    );
    if (!image) {
      throw new NotFoundException('Handbook image not found.');
    }
    res.set({
      'Content-Type': image.mimeType,
      'Cache-Control': 'private, max-age=86400',
    });
    res.send(image.buffer);
  }
}
