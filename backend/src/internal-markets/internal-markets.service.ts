import { Injectable } from '@nestjs/common';
import { LookupsService } from '../lookups/lookups.service';

@Injectable()
export class InternalMarketsService {
  constructor(private readonly lookupsService: LookupsService) {}

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

  listPostalCodes(marketName: string, offset: number, limit: number) {
    return this.lookupsService.findPostalCodesByMarketName(marketName, offset, limit);
  }
}
