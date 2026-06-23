import {
  Controller,
  DefaultValuePipe,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { HubSpotService } from './hubspot.service';

@Controller('internal/hubspot')
export class HubSpotController {
  constructor(private readonly hubSpotService: HubSpotService) {}

  @Post('contacts/sync')
  syncExternalContacts(
    @Query('dryRun', new DefaultValuePipe(true), ParseBoolPipe) dryRun: boolean,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit: number,
  ) {
    return this.hubSpotService.syncExternalContacts({ dryRun, limit });
  }
}
