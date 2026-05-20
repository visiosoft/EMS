import { Injectable } from '@nestjs/common';
import { VenueDirectoryService } from '../venue-directory/venue-directory.service';

@Injectable()
export class InternalVenuesService {
  constructor(private readonly venueDirectoryService: VenueDirectoryService) {}

  listVenues(offset: number, limit: number, query?: string) {
    return this.venueDirectoryService.listAllVenues(offset, limit, {
      q: query?.trim() ?? '',
      sortBy: 'venue',
      sortDir: 'asc',
    });
  }

  async suggestVenues(query: string, limit: number) {
    const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
    const { data } = await this.venueDirectoryService.listAllVenues(0, safeLimit, {
      q: query.trim(),
      sortBy: 'venue',
      sortDir: 'asc',
    });
    return data;
  }
}
