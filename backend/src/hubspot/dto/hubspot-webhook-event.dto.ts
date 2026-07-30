export class HubSpotWebhookEventDto {
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: string;
  attemptNumber: number;
  objectId: number;
  changeSource: string;
  propertyName?: string;
  propertyValue?: string;
}
