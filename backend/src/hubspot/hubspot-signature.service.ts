import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class HubSpotSignatureService {
  private readonly logger = new Logger(HubSpotSignatureService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifies HubSpot webhook signature (v1 or v2).
   *
   * v1: HMAC-SHA256(clientSecret, requestBody)
   * v2: HMAC-SHA256(clientSecret, clientSecret + httpMethod + url + requestBody)
   *
   * TODO: v3 support — v3 uses header 'X-HubSpot-Signature-v3', HMAC over
   * method+uri+body+timestamp, base64-encoded output, and requires a 5-minute
   * timestamp/replay window check. This needs a separate code path.
   */
  verify(
    signatureHeader: string,
    signatureVersion: string,
    requestBody: string,
    requestUrl?: string,
    httpMethod?: string,
  ): boolean {
    const clientSecret = this.configService.get<string>(
      'HUBSPOT_CLIENT_SECRET',
    );

    if (!clientSecret) {
      this.logger.error(
        'HUBSPOT_CLIENT_SECRET is not configured. Cannot verify webhook signatures.',
      );
      return false;
    }

    if (!signatureHeader) {
      return false;
    }

    try {
      let sourceString: string;

      if (signatureVersion === 'v2') {
        sourceString =
          clientSecret +
          (httpMethod || 'POST') +
          (requestUrl || '') +
          requestBody;
      } else {
        // v1 default
        sourceString = clientSecret + requestBody;
      }

      const hash = createHmac('sha256', clientSecret)
        .update(sourceString)
        .digest('hex');

      const expected = Buffer.from(hash, 'utf8');
      const received = Buffer.from(signatureHeader, 'utf8');

      if (expected.length !== received.length) {
        return false;
      }

      return timingSafeEqual(expected, received);
    } catch (error) {
      this.logger.error('Error verifying HubSpot signature', error);
      return false;
    }
  }
}
