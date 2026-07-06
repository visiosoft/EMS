import { Injectable } from '@nestjs/common';
import { LookupsService } from '../lookups/lookups.service';
import { VenueDirectoryService } from '../venue-directory/venue-directory.service';

@Injectable()
export class InternalMarketsService {
  constructor(
    private readonly lookupsService: LookupsService,
    private readonly venueDirectoryService: VenueDirectoryService,
  ) {}

  listMarkets(offset: number, limit: number, query?: string) {
    return this.lookupsService.findDmaHubMarketsPaginated(
      offset,
      limit,
      query?.trim() ?? '',
    );
  }

  suggestMarkets(query: string, limit: number) {
    return this.lookupsService.findDmaHubMarketSuggestions(query, limit);
  }

  /**
   * Entertainment complexes and venues within a market, sorted by city.
   * `dmaid` may be any postal-level DMAID of the market — the venue-directory
   * filter expands it to the whole normalized MarketName family.
   */
  listVenuesForMarket(dmaid: number, offset: number, limit: number) {
    return this.venueDirectoryService.listAllVenues(offset, limit, {
      dmaIds: [dmaid],
      sortBy: 'city',
      sortDir: 'asc',
    });
  }
}
