import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { tourProfileFileMulterOptions } from '../attraction-tours/tour-profile-file-multer.config';
import { EngagementVipPdfService } from './engagement-vip-pdf.service';

class UpdateEngagementVipPdfDto {
  @IsOptional() @IsString() @MaxLength(2048) vipPdfUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(255) vipPdfName?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  removeVipPdf?: boolean;
}

@Controller('engagements')
export class EngagementVipPdfController {
  constructor(private readonly svc: EngagementVipPdfService) {}

  @Get(':id/vip-pdf')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Patch(':id/vip-pdf')
  @UseInterceptors(
    FileInterceptor('vipPdfFile', tourProfileFileMulterOptions()),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEngagementVipPdfDto,
    @UploadedFile() vipPdfFile?: Express.Multer.File,
  ) {
    return this.svc.update(id, {
      vipPdfUrl: dto.vipPdfUrl,
      vipPdfName: dto.vipPdfName,
      removeVipPdf: dto.removeVipPdf,
      uploadedFile: vipPdfFile,
    });
  }
}
