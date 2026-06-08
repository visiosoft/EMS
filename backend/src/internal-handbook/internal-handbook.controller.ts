import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalHandbookService } from './internal-handbook.service';
import { SectionQueryDto } from './dto/section-query.dto';

@UseGuards(InternalAccessGuard)
@Controller('internal/handbook')
export class InternalHandbookController {
  constructor(private readonly internalHandbookService: InternalHandbookService) {}

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

}
