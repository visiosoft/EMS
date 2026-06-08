import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { DailySalesService } from './daily-sales.service';

class UpdateSalesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketsSold?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number | null;
}

@Controller('daily-sales')
export class DailySalesController {
  constructor(private readonly dailySalesService: DailySalesService) {}

  /**
   * GET /api/daily-sales/engagement-dashboard?engagementId=…&asOfDate=YYYY-MM-DD&performanceId=…
   * KPIs + daily series for performances under the engagement.
   * When `performanceId` is provided, the dashboard is scoped to that single show only.
   */
  @Get('engagement-dashboard')
  getEngagementDashboard(
    @Query('engagementId') engagementIdRaw?: string,
    @Query('asOfDate') asOfDate?: string,
    @Query('performanceId') performanceIdRaw?: string,
  ) {
    const id = engagementIdRaw != null ? Number(engagementIdRaw) : NaN;
    if (!Number.isFinite(id) || id < 1) {
      throw new BadRequestException({
        message:
          'Query parameter engagementId is required and must be a positive integer.',
      });
    }
    let performanceId: number | undefined;
    if (performanceIdRaw != null && performanceIdRaw !== '') {
      const pid = Number(performanceIdRaw);
      if (!Number.isFinite(pid) || pid < 1 || !Number.isInteger(pid)) {
        throw new BadRequestException({
          message:
            'Query parameter performanceId, when provided, must be a positive integer.',
        });
      }
      performanceId = pid;
    }
    return this.dailySalesService.getEngagementDashboard(
      id,
      asOfDate,
      performanceId,
    );
  }

  /**
   * GET /api/daily-sales/attraction-sales-summary?attractionId=…&asOfDate=YYYY-MM-DD
   * KPIs + cumulative daily series rolled up across all engagements for this attraction.
   * Legacy alias: `attraction-dashboard` (same handler).
   */
  @Get(['attraction-sales-summary', 'attraction-dashboard'])
  getAttractionSalesSummary(
    @Query('attractionId') attractionIdRaw?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const id = attractionIdRaw != null ? Number(attractionIdRaw) : NaN;
    if (!Number.isFinite(id) || id < 1) {
      throw new BadRequestException({
        message:
          'Query parameter attractionId is required and must be a positive integer.',
      });
    }
    return this.dailySalesService.getAttractionSalesSummary(id, asOfDate);
  }

  /**
   * GET /api/daily-sales/by-performance
   * Paged rows per show; default list is performances on/after reporting as-of.
   * Reporting columns: asOf (current) and asOf minus one calendar day.
   * ?asOfDate=YYYY-MM-DD (optional; defaults to server date in SQL)
   * &page=1&pageSize=25&search=&attraction=&performanceDate=YYYY-MM-DD
   */
  @Get('by-performance')
  findByPerformance(
    @Query('asOfDate') asOfDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('attraction') attraction?: string,
    @Query('performanceDate') performanceDate?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('genre') genre?: string,
    @Query('tour') tour?: string,
    @Query('company') company?: string,
    @Query('venue') venue?: string,
    @Query('contact') contact?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('eventsScope') eventsScope?: string,
    @Query('iaeContactIds') iaeContactIds?: string,
  ) {
    return this.dailySalesService.findByPerformancePage(
      asOfDate,
      page != null && page !== '' ? Number(page) : 1,
      pageSize != null && pageSize !== '' ? Number(pageSize) : 25,
      search,
      attraction,
      performanceDate,
      startDate,
      endDate,
      genre,
      tour,
      company,
      venue,
      contact,
      sortBy,
      sortDir,
      eventsScope,
      iaeContactIds,
    );
  }

  /**
   * GET /api/daily-sales/by-performance/suggestions?q=...
   * Server-side search suggestions for the by-performance search bar.
   * Returns distinct matching labels (attractions, tours, venues, companies, cities).
   */
  @Get('by-performance/suggestions')
  getByPerformanceSuggestions(
    @Query('asOfDate') asOfDate?: string,
    @Query('q') q?: string,
  ) {
    return this.dailySalesService.getByPerformanceSuggestions(asOfDate, q);
  }

  /**
   * GET /api/daily-sales
   * Legacy flat list — optional: ?engagementId=472
   */
  @Get()
  findAll(@Query('engagementId') engagementId?: string) {
    const id = engagementId ? Number(engagementId) : undefined;
    return this.dailySalesService.findAll(id);
  }

  /**
   * PATCH /api/daily-sales/:performanceId/:salesDate
   * Upserts PerformanceSalesQuantity and/or PerformanceSalesRevenue.
   * Creates the row if it doesn't exist yet (first entry for this date).
   * salesDate format: YYYY-MM-DD
   */
  @Patch(':performanceId/:salesDate')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateSales(
    @Param('performanceId') performanceId: string,
    @Param('salesDate') salesDate: string,
    @Body() body: UpdateSalesDto,
  ) {
    return this.dailySalesService.updateSales(
      Number(performanceId),
      salesDate,
      body,
    );
  }
}
