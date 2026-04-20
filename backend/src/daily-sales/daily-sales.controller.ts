import {
  Body,
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
   * GET /api/daily-sales
   * Optional: ?engagementId=472
   */
  @Get()
  findAll(@Query('engagementId') engagementId?: string) {
    const id = engagementId ? Number(engagementId) : undefined;
    return this.dailySalesService.findAll(id);
  }

  /**
   * PATCH /api/daily-sales/:performanceId/:salesDate
   * Updates PerformanceSalesQuantity and/or PerformanceSalesRevenue.
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
