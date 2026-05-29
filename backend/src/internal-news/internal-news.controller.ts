import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { CreateNewsDto } from './dto/create-news.dto';
import { InternalNewsService } from './internal-news.service';

@UseGuards(InternalAccessGuard)
@Controller('internal/news')
export class InternalNewsController {
  constructor(private readonly internalNewsService: InternalNewsService) {}

  @Get()
  findAll(
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.internalNewsService.findAll(limit, skip);
  }

  @Post()
  create(@Body() dto: CreateNewsDto) {
    return this.internalNewsService.create(dto);
  }
}
