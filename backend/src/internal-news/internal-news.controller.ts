import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateNewsDto } from './dto/create-news.dto';
import { InternalNewsService } from './internal-news.service';

@Controller('internal/news')
export class InternalNewsController {
  constructor(private readonly internalNewsService: InternalNewsService) {}

  @Get()
  findAll(@Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number) {
    return this.internalNewsService.findAll(limit);
  }

  @Post()
  create(@Body() dto: CreateNewsDto) {
    return this.internalNewsService.create(dto);
  }
}
