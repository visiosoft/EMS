import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { seatingChartMulterOptions } from './seating-chart-multer.config';
import { contractMulterOptions } from './contract-multer.config';
import { ContractExtractionService } from './contract-extraction.service';
import { SavePerformanceContractDto } from './dto/save-performance-contract.dto';
import { AddEngagementVenueDto } from './dto/add-engagement-venue.dto';
import { UpdateEngagementVenueTabDto } from './dto/update-engagement-venue-tab.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { CreateEngagementIaeContactDto } from './dto/create-engagement-iae-contact.dto';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { UpdateEngagementFinanceDto } from './dto/update-engagement-finance.dto';
import { UpdateEngagementIaeContactDto } from './dto/update-engagement-iae-contact.dto';
import { UpdateNonResidentWithholdingLinksDto } from './dto/update-non-resident-withholding-links.dto';
import { UpdatePerformanceTicketingDto } from './dto/update-performance-ticketing.dto';
import { UpdateIaeTicketingManagerDto } from './dto/update-iae-ticketing-manager.dto';
import { UpdateIaeMarketingTeamDto } from './dto/update-iae-marketing-team.dto';
import { UpdateTourMarketingTeamDto } from './dto/update-tour-marketing-team.dto';
import { CreateEngagementRetailPartnerDto } from './dto/create-engagement-retail-partner.dto';
import { CreateEngagementTravelHotelDto, UpdateEngagementTravelHotelDto, CreateEngagementTravelCarServiceDto, UpdateEngagementTravelCarServiceDto } from './dto/engagement-travel.dto';
import { EngagementService } from './engagement.service';

@Controller('engagements')
export class EngagementController {
  private readonly logger = new Logger(EngagementController.name);

  constructor(
    private readonly engagementService: EngagementService,
    private readonly contractExtractionService: ContractExtractionService,
  ) {}

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

  /** Company Hub — engagements the signed-in user is assigned to (IAE contact) for a date range. */
  @Get('hub-schedule')
  listHubSchedule(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.engagementService.listHubSchedule(startDate, endDate);
  }

  /** Company Hub — the signed-in user's assigned engagements still below their sales revenue goal. */
  @Get('hub-red-alerts')
  listHubRedAlerts() {
    return this.engagementService.listHubRedAlerts();
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

  @Get(':id/deposit-terms')
  getDepositTerms(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getDepositTerms(id);
  }

  @Patch(':id/deposit-terms')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateDepositTerms(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { depositAmount?: number | null; depositDueDate?: string | null },
  ) {
    return this.engagementService.updateDepositTerms(id, dto);
  }

  @Patch('non-resident-withholding/:nrwId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateNonResidentWithholding(
    @Param('nrwId', ParseIntPipe) nrwId: number,
    @Body() dto: { withholdingArea?: string | null; withholdingTaxRate?: number | null; withholdingAgencyName?: string | null; iaeWaiverSubmissionDate?: string | null; iaeWaiverAppNumber?: string | null },
  ) {
    return this.engagementService.updateNonResidentWithholding(nrwId, dto);
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
    @Query('mine') mine?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
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
      mine: mine === '1' || mine === 'true',
      sortBy,
      sortDir,
      dateFrom,
      dateTo,
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

  /** Full Venues-tab data: per-venue details + engagement-level deal type / terms. */
  @Get(':id/venue-tab-data')
  getVenueTabData(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getVenueTabData(id);
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

  /** PATCH per-venue Venues-tab fields (booking manager, tech pack, contracts, etc.). */
  @Patch(':id/venues/:venueCompanyId/tab')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateVenueTab(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueCompanyId', ParseIntPipe) venueCompanyId: number,
    @Body() dto: UpdateEngagementVenueTabDto,
  ) {
    return this.engagementService.updateVenueTabPerVenue(id, venueCompanyId, dto);
  }

  /** Upload a seating chart file/image for a venue (stored via dbo.Link + Venue.SeatingChartLinkID). */
  @Post(':id/venues/:venueCompanyId/seating-chart')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('seatingChart', seatingChartMulterOptions()))
  uploadSeatingChart(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueCompanyId', ParseIntPipe) venueCompanyId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.engagementService.uploadSeatingChart(id, venueCompanyId, file);
  }

  /** Remove the seating chart from a venue (clears Venue.SeatingChartLinkID). */
  @Delete(':id/venues/:venueCompanyId/seating-chart')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSeatingChart(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueCompanyId', ParseIntPipe) venueCompanyId: number,
  ) {
    return this.engagementService.removeSeatingChart(id, venueCompanyId);
  }

  /** Upsert an engagement link (for contracts/forecast via dbo.EngagementLink). */
  @Post(':id/links')
  @HttpCode(HttpStatus.CREATED)
  upsertEngagementLink(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { linkUrl: string; linkName?: string; linkPurpose: string },
  ) {
    return this.engagementService.upsertEngagementLink(id, dto);
  }

  /** Remove an engagement link. */
  @Delete(':id/links/:engagementLinkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEngagementLink(
    @Param('id', ParseIntPipe) id: number,
    @Param('engagementLinkId', ParseIntPipe) engagementLinkId: number,
  ) {
    return this.engagementService.removeEngagementLink(id, engagementLinkId);
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

  @Get(':id/performances/ticketing-summary')
  getPerformancesTicketingSummary(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getPerformancesWithTicketingSummary(id);
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

  @Get(':id/iae-ticketing-manager')
  getIaeTicketingManager(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getIaeTicketingManager(id);
  }

  @Patch(':id/iae-ticketing-manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateIaeTicketingManager(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIaeTicketingManagerDto,
  ) {
    return this.engagementService.updateIaeTicketingManager(
      id,
      dto.iaeTicketingManagerContactId ?? null,
    );
  }

  // ─── Marketing Meta (Tour contacts, demographics, media mix) ────────────────────

  /** Read-only tour marketing contacts, audience demographics, and media mix. */
  @Get(':id/marketing-meta')
  getMarketingMeta(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getMarketingMeta(id);
  }

  @Patch(':id/iae-marketing-team')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateIaeMarketingTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIaeMarketingTeamDto,
  ) {
    return this.engagementService.updateIaeMarketingTeam(id, dto);
  }

  @Patch(':id/tour-marketing-team')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateTourMarketingTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTourMarketingTeamDto,
  ) {
    return this.engagementService.updateTourMarketingTeam(id, dto);
  }

  // ─── Retail Partners (dbo.EngagementRetailPartner) ───────────────────────────

  @Get(':id/retail-partners')
  listRetailPartners(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.listRetailPartners(id);
  }

  @Post(':id/retail-partners')
  @HttpCode(HttpStatus.CREATED)
  addRetailPartner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEngagementRetailPartnerDto,
  ) {
    return this.engagementService.addRetailPartner(id, dto);
  }

  @Delete(':id/retail-partners/:retailPartnerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRetailPartner(
    @Param('id', ParseIntPipe) id: number,
    @Param('retailPartnerId', ParseIntPipe) retailPartnerId: number,
  ) {
    return this.engagementService.removeRetailPartner(id, retailPartnerId);
  }

  // ─── Engagement Partner (dbo.EngagementPartner) ─────────────────────────────

  @Get(':id/partner')
  getPartner(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getEngagementPartner(id);
  }

  @Patch(':id/partner')
  updatePartner(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { partnerCompanyId: number; partnerContactId: number | null },
  ) {
    return this.engagementService.upsertEngagementPartner(id, body);
  }

  // ─── Attraction Travel ─────────────────────────────────────────────────────

  @Get(':id/travel')
  listTravel(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.listEngagementTravel(id);
  }

  @Post(':id/travel/hotel')
  @HttpCode(HttpStatus.CREATED)
  addTravelHotel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEngagementTravelHotelDto,
  ) {
    return this.engagementService.addEngagementTravelHotel(id, dto);
  }

  @Patch(':id/travel/:travelId/hotel')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateTravelHotel(
    @Param('id', ParseIntPipe) id: number,
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() dto: UpdateEngagementTravelHotelDto,
  ) {
    return this.engagementService.updateEngagementTravelHotel(id, travelId, dto);
  }

  @Post(':id/travel/car-service')
  @HttpCode(HttpStatus.CREATED)
  addTravelCarService(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEngagementTravelCarServiceDto,
  ) {
    return this.engagementService.addEngagementTravelCarService(id, dto);
  }

  @Patch(':id/travel/car-service/:carServiceTravelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateTravelCarService(
    @Param('id', ParseIntPipe) id: number,
    @Param('carServiceTravelId', ParseIntPipe) carServiceTravelId: number,
    @Body() dto: UpdateEngagementTravelCarServiceDto,
  ) {
    return this.engagementService.updateEngagementTravelCarService(id, carServiceTravelId, dto);
  }

  @Delete(':id/travel/:travelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTravel(
    @Param('id', ParseIntPipe) id: number,
    @Param('travelId', ParseIntPipe) travelId: number,
  ) {
    return this.engagementService.deleteEngagementTravel(id, travelId);
  }

  // ─── Performance Contracts ────────────────────────────────────────────────

  /** Get contracts for an engagement. */
  @Get(':id/contracts')
  getContracts(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getPerformanceContracts(id);
  }

  /**
   * Upload a contract (PDF or .docx) and extract its fields. The file is parsed
   * immediately and then discarded — only the extracted data is kept, so nothing
   * needs to persist on disk (important on ephemeral/scaled hosts).
   */
  @Post(':id/contracts/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('contractFile', contractMulterOptions()))
  async uploadContract(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const extracted = await this.contractExtractionService.extractFromFile(file.path);
      return {
        extracted,
        originalFilename: file.originalname,
        // File is discarded after extraction, so there is no stored blob to reference.
        annotatedPdfBlobName: '',
      };
    } finally {
      await unlink(file.path).catch(() => {
        this.logger.warn(`Failed to delete uploaded contract file: ${file.path}`);
      });
    }
  }

  /** Save (create or update) a contract for an engagement. */
  @Post(':id/contracts')
  @HttpCode(HttpStatus.CREATED)
  saveContract(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SavePerformanceContractDto,
  ) {
    return this.engagementService.savePerformanceContract(id, dto);
  }

  /** Update an existing contract. */
  @Patch(':id/contracts/:contractId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateContract(
    @Param('id', ParseIntPipe) id: number,
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() dto: SavePerformanceContractDto,
  ) {
    return this.engagementService.updatePerformanceContract(id, contractId, dto);
  }

  /** Delete a contract. */
  @Delete(':id/contracts/:contractId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteContract(
    @Param('id', ParseIntPipe) id: number,
    @Param('contractId', ParseIntPipe) contractId: number,
  ) {
    return this.engagementService.deletePerformanceContract(id, contractId);
  }

  // ─── SharePoint Folder Management ──────────────────────────────────────

  /**
   * Get the SharePoint folder link for an engagement.
   */
  @Get(':id/sharepoint-folder')
  getSharePointFolder(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.getSharePointFolderLink(id);
  }

  /**
   * Manually trigger SharePoint folder structure creation.
   */
  @Post(':id/create-sharepoint-folders')
  @HttpCode(HttpStatus.CREATED)
  createSharePointFolders(@Param('id', ParseIntPipe) id: number) {
    return this.engagementService.ensureSharePointFolders(id);
  }
}
