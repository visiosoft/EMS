import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalVenuesService } from './internal-venues.service';

@UseGuards(InternalAccessGuard)
@Controller('internal/venues')
export class InternalVenuesController {
  constructor(private readonly internalVenuesService: InternalVenuesService) {}

  @Get('suggestions')
  suggest(
    @Query('q') query = '',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(20, Math.max(1, limit));
    return this.internalVenuesService.suggestVenues(query, safeLimit);
  }

  @Get()
  list(
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('q') query?: string,
  ) {
    const safeLimit = Math.min(50, Math.max(1, limit));
    return this.internalVenuesService.listVenues(Math.max(0, offset), safeLimit, query);
  }
}
