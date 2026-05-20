import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalAttractionsService } from './internal-attractions.service';

@UseGuards(InternalAccessGuard)
@Controller('internal/attractions')
export class InternalAttractionsController {
  constructor(private readonly internalAttractionsService: InternalAttractionsService) {}

  @Get('suggestions')
  suggest(
    @Query('q') query = '',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(20, Math.max(1, limit));
    return this.internalAttractionsService.suggestAttractions(query, safeLimit);
  }

  @Get(':attractionId/tours')
  tours(
    @Param('attractionId', ParseIntPipe) attractionId: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(50, Math.max(1, limit));
    return this.internalAttractionsService.listTours(
      attractionId,
      Math.max(0, offset),
      safeLimit,
    );
  }

  @Get()
  list(
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('q') query?: string,
  ) {
    const safeLimit = Math.min(50, Math.max(1, limit));
    return this.internalAttractionsService.listAttractions(
      Math.max(0, offset),
      safeLimit,
      query,
    );
  }
}
