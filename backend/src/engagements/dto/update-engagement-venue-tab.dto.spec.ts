import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateEngagementVenueTabDto } from './update-engagement-venue-tab.dto';

describe('UpdateEngagementVenueTabDto – new fields', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(UpdateEngagementVenueTabDto, plain);
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  }

  describe('venueDealTypeId', () => {
    it('should accept a valid positive integer', async () => {
      const errors = await validateDto({ venueDealTypeId: 3 });
      const fieldErrors = errors.filter((e) => e.property === 'venueDealTypeId');
      expect(fieldErrors).toHaveLength(0);
    });

    it('should accept null', async () => {
      const errors = await validateDto({ venueDealTypeId: null });
      const fieldErrors = errors.filter((e) => e.property === 'venueDealTypeId');
      expect(fieldErrors).toHaveLength(0);
    });

    it('should reject zero', async () => {
      const errors = await validateDto({ venueDealTypeId: 0 });
      const fieldErrors = errors.filter((e) => e.property === 'venueDealTypeId');
      expect(fieldErrors.length).toBeGreaterThan(0);
    });

    it('should reject negative values', async () => {
      const errors = await validateDto({ venueDealTypeId: -1 });
      const fieldErrors = errors.filter((e) => e.property === 'venueDealTypeId');
      expect(fieldErrors.length).toBeGreaterThan(0);
    });

    it('should accept string integer via transform', async () => {
      const errors = await validateDto({ venueDealTypeId: '5' });
      const fieldErrors = errors.filter((e) => e.property === 'venueDealTypeId');
      expect(fieldErrors).toHaveLength(0);
    });
  });

  describe('techRiderLinkUrl', () => {
    it('should accept a valid URL string', async () => {
      const errors = await validateDto({ techRiderLinkUrl: 'https://example.com/rider.pdf' });
      const fieldErrors = errors.filter((e) => e.property === 'techRiderLinkUrl');
      expect(fieldErrors).toHaveLength(0);
    });

    it('should accept null', async () => {
      const errors = await validateDto({ techRiderLinkUrl: null });
      const fieldErrors = errors.filter((e) => e.property === 'techRiderLinkUrl');
      expect(fieldErrors).toHaveLength(0);
    });

    it('should reject strings longer than 2048 chars', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2040);
      const errors = await validateDto({ techRiderLinkUrl: longUrl });
      const fieldErrors = errors.filter((e) => e.property === 'techRiderLinkUrl');
      expect(fieldErrors.length).toBeGreaterThan(0);
    });

    it('should accept empty string', async () => {
      const errors = await validateDto({ techRiderLinkUrl: '' });
      const fieldErrors = errors.filter((e) => e.property === 'techRiderLinkUrl');
      expect(fieldErrors).toHaveLength(0);
    });
  });
});
