import {
  Body,
  Controller,
  DefaultValuePipe,
  Headers,
  HttpCode,
  Logger,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { HubSpotWebhookEventDto } from './dto/hubspot-webhook-event.dto';
import { HubSpotSignatureService } from './hubspot-signature.service';
import { HubSpotService } from './hubspot.service';

@Controller('internal/hubspot')
export class HubSpotController {
  private readonly logger = new Logger(HubSpotController.name);

  constructor(
    private readonly hubSpotService: HubSpotService,
    private readonly signatureService: HubSpotSignatureService,
  ) {}

  @Post('contacts/sync')
  syncExternalContacts(
    @Query('dryRun', new DefaultValuePipe(true), ParseBoolPipe) dryRun: boolean,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit: number,
  ) {
    return this.hubSpotService.syncExternalContacts({ dryRun, limit });
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @Headers('x-hubspot-signature') signature: string,
    @Headers('x-hubspot-signature-version') signatureVersion: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() events: HubSpotWebhookEventDto[],
  ): { received: boolean } {
    if (!req.rawBody) {
      this.logger.error('rawBody not available on request. Ensure NestFactory.create has { rawBody: true }.');
      throw new UnauthorizedException('Unable to verify webhook signature');
    }

    const rawBody = req.rawBody.toString('utf8');

    // Reject v3 — not yet supported
    if (signatureVersion === 'v3') {
      // TODO: Implement v3 signature verification.
      // v3 uses X-HubSpot-Signature-v3 header, HMAC over method+uri+body+timestamp (base64),
      // with a 5-minute timestamp/replay window. Needs a separate code path.
      this.logger.warn('Received v3 signature which is not yet supported. Rejecting.');
      throw new UnauthorizedException('Signature version v3 is not yet supported');
    }

    const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const isValid = this.signatureService.verify(
      signature,
      signatureVersion || 'v1',
      rawBody,
      requestUrl,
      req.method,
    );

    if (!isValid) {
      this.logger.warn('HubSpot webhook signature verification failed.');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Respond immediately; process asynchronously (fire-and-forget with error logging)
    setImmediate(() => {
      this.hubSpotService.handleWebhookEvents(events).catch((error) => {
        this.logger.error(
          'Unhandled error processing webhook events',
          error instanceof Error ? error.stack : error,
        );
      });
    });

    return { received: true };
  }
}
