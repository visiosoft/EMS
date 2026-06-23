import { Injectable } from '@nestjs/common';
import { AttractionService } from '../attraction-tours/attraction.service';
import { TourService } from '../attraction-tours/tour.service';

@Injectable()
export class InternalAttractionsService {
  constructor(
    private readonly attractionService: AttractionService,
    private readonly tourService: TourService,
  ) {}

  listAttractions(offset: number, limit: number, query?: string) {
    return this.attractionService.listPaginated(
      offset,
      limit,
      query?.trim() ?? '',
    );
  }

  async suggestAttractions(query: string, limit: number) {
    const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
    const { data } = await this.attractionService.listPaginated(
      0,
      safeLimit,
      query.trim(),
    );
    return data;
  }

  listTours(attractionId: number, offset: number, limit: number) {
    return this.tourService.listByAttractionPaginated(
      attractionId,
      offset,
      limit,
    );
  }
}
