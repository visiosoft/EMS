import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { join } from 'path';
import { getUploadRoot } from '../common/upload-path';
import { InternalAccessGuard } from '../internal-access/internal-access.guard.js';
import {
  CreateCertificationDto,
  CreateSubmissionDto,
  ReviewSubmissionDto,
  UpdateCertificationDto,
} from './dto/learning.dto.js';
import { LearningService } from './learning.service.js';

const CERTIFICATE_UPLOAD_DIR = join(getUploadRoot(), 'certificates');
fs.mkdirSync(CERTIFICATE_UPLOAD_DIR, { recursive: true });

const certificateUploadOptions = () => ({
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(CERTIFICATE_UPLOAD_DIR, { recursive: true });
      cb(null, CERTIFICATE_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
  },
});

@UseGuards(InternalAccessGuard)
@Controller('internal/learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORMS (lookup)
  // ═══════════════════════════════════════════════════════════════════════════
  @Get('platforms')
  getPlatforms() {
    return this.learningService.getPlatforms();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATIONS — Browse, Publish, Manage
  // ═══════════════════════════════════════════════════════════════════════════
  @Get('certifications')
  getCertifications(
    @Query('departmentId', new DefaultValuePipe(0), ParseIntPipe) departmentId: number,
    @Query('status', new DefaultValuePipe('all')) status: string,
    @Query('level', new DefaultValuePipe('all')) level: string,
    @Query('platformId', new DefaultValuePipe(0), ParseIntPipe) platformId: number,
  ) {
    return this.learningService.getCertifications(departmentId, status, level, platformId);
  }

  @Get('certifications/:id')
  getCertificationById(@Param('id', ParseIntPipe) id: number) {
    return this.learningService.getCertificationById(id);
  }

  @Post('certifications')
  createCertification(@Body() dto: CreateCertificationDto) {
    return this.learningService.createCertification(dto);
  }

  @Patch('certifications/:id')
  updateCertification(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCertificationDto,
  ) {
    return this.learningService.updateCertification(id, dto);
  }

  @Patch('certifications/:id/toggle-status')
  toggleCertificationStatus(@Param('id', ParseIntPipe) id: number) {
    return this.learningService.toggleCertificationStatus(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMISSIONS — Submit, My Certificates, Monitor
  // ═══════════════════════════════════════════════════════════════════════════
  @Get('submissions')
  getSubmissions(
    @Query('departmentId', new DefaultValuePipe(0), ParseIntPipe) departmentId: number,
    @Query('contactId', new DefaultValuePipe(0), ParseIntPipe) contactId: number,
    @Query('status', new DefaultValuePipe('')) status: string,
    @Query('search', new DefaultValuePipe('')) search: string,
  ) {
    return this.learningService.getSubmissions(departmentId, contactId, status, search);
  }

  @Get('submissions/:id')
  getSubmissionById(@Param('id', ParseIntPipe) id: number) {
    return this.learningService.getSubmissionById(id);
  }

  @Post('submissions')
  @UseInterceptors(FileInterceptor('certificateFile', certificateUploadOptions()))
  createSubmission(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() certificateFile?: Express.Multer.File,
  ) {
    return this.learningService.createSubmission(dto, certificateFile);
  }

  @Patch('submissions/:id/review')
  reviewSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.learningService.reviewSubmission(id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE SCORES — Leaderboard, Employee Scores, My Stats
  // ═══════════════════════════════════════════════════════════════════════════
  @Get('scores')
  getEmployeeScores(
    @Query('departmentId', new DefaultValuePipe(0), ParseIntPipe) departmentId: number,
  ) {
    return this.learningService.getEmployeeScores(departmentId);
  }

  @Get('scores/my')
  getMyScore(
    @Query('contactId', ParseIntPipe) contactId: number,
    @Query('departmentId', ParseIntPipe) departmentId: number,
  ) {
    return this.learningService.getMyScore(contactId, departmentId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  @Get('progress')
  getProgress(
    @Query('contactId', ParseIntPipe) contactId: number,
    @Query('departmentId', ParseIntPipe) departmentId: number,
  ) {
    return this.learningService.getProgress(contactId, departmentId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POINT TIERS (lookup)
  // ═══════════════════════════════════════════════════════════════════════════
  @Get('tiers')
  getPointTiers() {
    return this.learningService.getPointTiers();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERVIEW KPIs (Admin)
  // ═══════════════════════════════════════════════════════════════════════════
  @Get('overview')
  getOverview(
    @Query('departmentId', ParseIntPipe) departmentId: number,
  ) {
    return this.learningService.getOverview(departmentId);
  }
}
