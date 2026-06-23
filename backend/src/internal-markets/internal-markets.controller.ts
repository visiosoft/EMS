import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalMarketsService } from './internal-markets.service';

@UseGuards(InternalAccessGuard)
@Controller('internal/markets')
export class InternalMarketsController {
  constructor(
    private readonly internalMarketsService: InternalMarketsService,
  ) {}

  @Get('suggestions')
  suggest(
    @Query('q') query = '',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(20, Math.max(1, limit));
    return this.internalMarketsService.suggestMarkets(query, safeLimit);
  }

  @Get('postal-codes')
  postalCodes(
    @Query('market') market: string,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(100, Math.max(1, limit));
    return this.internalMarketsService.listPostalCodes(
      market ?? '',
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
    return this.internalMarketsService.listMarkets(
      Math.max(0, offset),
      safeLimit,
      query,
    );
  }
}
