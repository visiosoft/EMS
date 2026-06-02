import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AddEngagementVenueDto } from './dto/add-engagement-venue.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { CreateEngagementIaeContactDto } from './dto/create-engagement-iae-contact.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { UpdateEngagementFinanceDto } from './dto/update-engagement-finance.dto';
import { UpdateEngagementIaeContactDto } from './dto/update-engagement-iae-contact.dto';
import { UpdateNonResidentWithholdingLinksDto } from './dto/update-non-resident-withholding-links.dto';
import { UpdatePerformanceTicketingDto } from './dto/update-performance-ticketing.dto';
import { EngagementService } from './engagement.service';

@Controller('engagements')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  // ─── Engagement CRUD ──────────────────────────────────────────────────────

  @Get()
  list() {
    return this.engagementService.list();
  }

  /** Distinct attraction / market / venue labels for list filters (must stay before `:id`). */
  @Get('filter-options')
  filterOptions() {
    return this.engagementService.filterOptions();
  }

  /** Master lists for engagement finance form (FK dropdowns + IAE waiver status). Before `:id` routes. */
  @Get('finance-lookups')
  financeLookups() {
    return this.engagementService.getFinanceLookups();
  }

  @Get('by-tour/:tourId')
  listByTour(@Param('tourId', ParseIntPipe) tourId: number) {
    return this.engagementService.listByTour(tourId);
  }

  @Get('iae-contact-lookups')
  iaeContactLookups() {
    return this.engagementService.getEngagementIaeContactLookups();
  }

  /** Company Hub — engagements created by the signed-in user for a date range. */
  @Get('hub-schedule')
  listHubSchedule(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.engagementService.listHubSchedule(startDate, endDate);
  }

  @Patch('withholdings/:withholdingId/links')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateWithholdingLinks(
    @Param('withholdingId', ParseIntPipe) withholdingId: number,
    @Body() dto: UpdateNonResidentWithholdingLinksDto,
  ) {
    return this.engagementService.updateNonResidentWithholdingLinks(
      withholdingId,
      dto,
    );
  }

  @Post(':id/withholding')
  @HttpCode(HttpStatus.CREATED)
  createWithholdingForEngagement(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.createWithholdingForEngagement(id);
  }

  @Get(':id/finance')
  getFinance(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getFinance(id);
  }

  @Patch(':id/finance')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateFinance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEngagementFinanceDto,
  ) {
    return this.engagementService.upsertFinance(id, dto);
  }

  @Get('paged')
  listPaged(
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('engagementId') engagementId?: string,
    @Query('status') status?: string,
    @Query('attraction') attraction?: string,
    @Query('dma') dma?: string,
    @Query('venue') venue?: string,
    @Query('timing') timing?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const t =
      timing === 'upcoming' || timing === 'past' ? timing : ('all' as const);
    return this.engagementService.listPaginated(offset, limit, {
      q,
      engagementId: Number(engagementId),
      status,
      attractionName: attraction,
      dmaMarketName: dma,
      venueLabel: venue,
      timing: t,
      sortBy,
      sortDir,
    });
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEngagementDto) {
    return this.engagementService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEngagementDto,
  ) {
    return this.engagementService.update(id, dto);
  }

  @Get(':id/iae-contacts')
  listIaeContacts(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.listEngagementIaeContacts(id);
  }

  @Post(':id/iae-contacts')
  @HttpCode(HttpStatus.CREATED)
  addIaeContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEngagementIaeContactDto,
  ) {
    return this.engagementService.addEngagementIaeContact(id, dto);
  }

  @Patch(':id/iae-contacts/:eicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateIaeContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('eicId', ParseIntPipe) eicId: number,
    @Body() dto: UpdateEngagementIaeContactDto,
  ) {
    return this.engagementService.updateEngagementIaeContact(id, eicId, dto);
  }

  @Delete(':id/iae-contacts/:eicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeIaeContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('eicId', ParseIntPipe) eicId: number,
  ) {
    return this.engagementService.removeEngagementIaeContact(id, eicId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.remove(id);
  }

  // ─── Engagement Venue APIs ─────────────────────────────────────────────────

  @Get(':id/venues')
  listVenues(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.listVenues(id);
  }

  @Post(':id/venues')
  @HttpCode(HttpStatus.CREATED)
  addVenue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddEngagementVenueDto,
  ) {
    return this.engagementService.addVenue(id, dto);
  }

  @Delete(':id/venues/:venueCompanyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVenue(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueCompanyId', ParseIntPipe) venueCompanyId: number,
  ) {
    return this.engagementService.removeVenue(id, venueCompanyId);
  }

  // ─── Service Providers (VenueServiceProvider) ─────────────────────────────

  @Get(':id/service-providers')
  listServiceProviders(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.listServiceProviders(id);
  }

  @Post(':id/service-providers')
  @HttpCode(HttpStatus.CREATED)
  addServiceProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { providerCompanyId: number },
  ) {
    return this.engagementService.addServiceProvider(id, dto.providerCompanyId);
  }

  @Delete(':id/service-providers/:providerCompanyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeServiceProvider(
    @Param('id', ParseIntPipe) id: number,
    @Param('providerCompanyId', ParseIntPipe) providerCompanyId: number,
  ) {
    return this.engagementService.removeServiceProvider(id, providerCompanyId);
  }

  // ─── Performance APIs ──────────────────────────────────────────────────────

  @Get(':id/performances')
  listPerformances(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.listPerformances(id);
  }

  @Post(':id/performances')
  @HttpCode(HttpStatus.CREATED)
  createPerformance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePerformanceDto,
  ) {
    return this.engagementService.createPerformance(id, dto);
  }

  @Patch(':id/performances/:performanceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePerformance(
    @Param('id', ParseIntPipe) id: number,
    @Param('performanceId', ParseIntPipe) performanceId: number,
    @Body()
    dto: {
      performanceDate?: string;
      performanceTime?: string;
      performanceStatus?: string;
    },
  ) {
    return this.engagementService.updatePerformance(id, performanceId, dto);
  }

  @Delete(':id/performances/:performanceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePerformance(
    @Param('id', ParseIntPipe) id: number,
    @Param('performanceId', ParseIntPipe) performanceId: number,
  ) {
    return this.engagementService.deletePerformance(id, performanceId);
  }

  @Get(':id/performances/:performanceId/ticketing')
  getPerformanceTicketing(
    @Param('id', ParseIntPipe) id: number,
    @Param('performanceId', ParseIntPipe) performanceId: number,
  ) {
    return this.engagementService.getPerformanceTicketing(id, performanceId);
  }

  @Patch(':id/performances/:performanceId/ticketing')
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePerformanceTicketing(
    @Param('id', ParseIntPipe) id: number,
    @Param('performanceId', ParseIntPipe) performanceId: number,
    @Body() dto: UpdatePerformanceTicketingDto,
  ) {
    return this.engagementService.upsertPerformanceTicketing(
      id,
      performanceId,
      dto,
    );
  }
}
