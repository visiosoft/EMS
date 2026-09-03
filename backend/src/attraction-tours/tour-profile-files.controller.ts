import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateTourProfileFilesDto } from './dto/update-tour-profile-files.dto';
import {
  TOUR_PROFILE_FILE_FIELDS,
  tourProfileFileMulterOptions,
  type TourProfileFileKey,
} from './tour-profile-file-multer.config';
import { TourProfileFilesService } from './tour-profile-files.service';

@Controller('tours')
export class TourProfileFilesController {
  constructor(private readonly svc: TourProfileFilesService) {}

  @Get(':id/profile-files')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Patch(':id/profile-files')
  @UseInterceptors(
    FileFieldsInterceptor(
      TOUR_PROFILE_FILE_FIELDS as unknown as {
        name: string;
        maxCount?: number;
      }[],
      tourProfileFileMulterOptions(),
    ),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTourProfileFilesDto,
    @UploadedFiles()
    files: Partial<Record<TourProfileFileKey, Express.Multer.File[]>>,
  ) {
    return this.svc.update(id, dto, files ?? {});
  }
}
