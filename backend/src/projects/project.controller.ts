import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { confirmedOfferMulterOptions } from './confirmed-offer-multer.config';
import { AddPerformanceOptionDto } from './dto/add-performance-option.dto';
import { AddProjectVenueDto } from './dto/add-project-venue.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdatePerformanceOptionDto } from './dto/update-performance-option.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectVenueDto } from './dto/update-project-venue.dto';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // ─── Project meta (must be registered before :id) ───────────────────────

  @Get('meta/project-stages')
  projectStagesMeta() {
    return this.projectService.getProjectStageMeta();
  }

  @Get('meta/offer-review-statuses')
  offerReviewStatusesMeta() {
    return this.projectService.getOfferReviewStatusMeta();
  }

  @Get('meta/venue-statuses')
  venueStatusesMeta() {
    return this.projectService.getVenueStatusMeta();
  }

  @Get('meta/option-statuses')
  optionStatusesMeta() {
    return this.projectService.getOptionStatusMeta();
  }

  // ─── Project CRUD ─────────────────────────────────────────────────────────

  @Get()
  list(
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('projectStage') projectStage?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.projectService.listPaginated(
      offset,
      limit,
      q,
      projectStage,
      sortBy,
      sortDir,
    );
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.getOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.remove(id);
  }

  // ─── Project Venue APIs ───────────────────────────────────────────────────

  @Post(':id/venues')
  @HttpCode(HttpStatus.CREATED)
  addVenue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProjectVenueDto,
  ) {
    return this.projectService.addVenue(id, dto);
  }

  @Patch(':id/venues/:venueId')
  updateVenue(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueId', ParseIntPipe) venueId: number,
    @Body() dto: UpdateProjectVenueDto,
  ) {
    return this.projectService.updateVenue(id, venueId, dto);
  }

  @Delete(':id/venues/:venueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVenue(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueId', ParseIntPipe) venueId: number,
  ) {
    return this.projectService.removeVenue(id, venueId);
  }

  // ─── Performance Option APIs ──────────────────────────────────────────────

  @Post(':id/performance-options')
  @HttpCode(HttpStatus.CREATED)
  addPerformanceOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddPerformanceOptionDto,
  ) {
    return this.projectService.addPerformanceOption(id, dto);
  }

  @Patch(':id/performance-options/:optionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePerformanceOption(
    @Param('id', ParseIntPipe) id: number,
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() dto: UpdatePerformanceOptionDto,
  ) {
    return this.projectService.updatePerformanceOption(id, optionId, dto);
  }

  @Delete(':id/performance-options/:optionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePerformanceOption(
    @Param('id', ParseIntPipe) id: number,
    @Param('optionId', ParseIntPipe) optionId: number,
  ) {
    return this.projectService.removePerformanceOption(id, optionId);
  }

  // ─── Confirmed Offer PDF Upload (venue-level) ───────────────────────────

  @Post(':id/venues/:venueId/confirmed-offer-pdf')
  @UseInterceptors(FileInterceptor('file', confirmedOfferMulterOptions()))
  uploadConfirmedOfferPdf(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueId', ParseIntPipe) venueId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file was provided.');
    }
    return this.projectService.uploadConfirmedOfferPdf(id, venueId, file);
  }

  @Get(':id/venues/:venueId/confirmed-offer-pdf')
  async downloadConfirmedOfferPdf(
    @Param('id', ParseIntPipe) id: number,
    @Param('venueId', ParseIntPipe) venueId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filePath, linkName } = await this.projectService.getConfirmedOfferPdfPath(id, venueId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(linkName)}"`,
    });
    const stream = createReadStream(filePath);
    return new StreamableFile(stream);
  }
}
