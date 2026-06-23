import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { TourMarketingService } from './tour-marketing.service';
import { SaveTourMarketingDto } from './dto/save-tour-marketing.dto';

@Controller('tour-marketing')
export class TourMarketingController {
  constructor(private readonly tourMarketingService: TourMarketingService) {}

  // ── Lookups ──────────────────────────────────────────────────────────────

  @Get('lookups/offer-code-options')
  getOfferCodeOptions() {
    return this.tourMarketingService.getOfferCodeOptions();
  }

  @Get(':tourId')
  getTourMarketing(@Param('tourId', ParseIntPipe) tourId: number) {
    return this.tourMarketingService.getTourMarketing(tourId);
  }

  @Post(':tourId')
  @HttpCode(HttpStatus.OK)
  saveTourMarketing(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Body() dto: SaveTourMarketingDto,
  ) {
    return this.tourMarketingService.saveTourMarketing(tourId, dto);
  }

  @Delete(':tourId/offer-codes/:offerCodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOfferCode(
    @Param('tourId', ParseIntPipe) tourId: number,
    @Param('offerCodeId', ParseIntPipe) offerCodeId: number,
  ) {
    return this.tourMarketingService.deleteOfferCode(tourId, offerCodeId);
  }
}
