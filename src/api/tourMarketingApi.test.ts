/**
 * Unit tests for tour marketing API functions (commit 1614d54).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './config';
import {
  fetchOfferCodeLookups,
  fetchTourMarketing,
  saveTourMarketing,
  deleteTourOfferCode,
  type ApiTourMarketingResponse,
  type SaveTourMarketingPayload,
  type OfferCodeLookups,
} from './tourMarketingApi';

vi.mock('./config', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function sampleTourMarketing(overrides: Partial<ApiTourMarketingResponse> = {}): ApiTourMarketingResponse {
  return {
    tourId: 1,
    marketingDirector: null,
    audienceGender: null,
    audienceAgeRangeIds: [],
    audienceAgeRangeLabels: [],
    mediaMix: [],
    offerCodes: [],
    ...overrides,
  };
}

describe('tourMarketingApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchOfferCodeLookups', () => {
    it('calls apiFetch with correct endpoint', async () => {
      const data: OfferCodeLookups = {
        assignedToOptions: ['IAE - Sign Up', 'IAE - Full List'],
        iaeSmsOptions: ['Venue - Members'],
        purposeOptions: ['Presale'],
      };
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchOfferCodeLookups();

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/tour-marketing/lookups/offer-code-options');
      expect(result).toEqual(data);
    });
  });

  describe('fetchTourMarketing', () => {
    it('calls apiFetch with correct tour ID endpoint', async () => {
      const data = sampleTourMarketing({ tourId: 5 });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchTourMarketing(5);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/tour-marketing/5');
      expect(result.tourId).toBe(5);
    });

    it('returns marketing director when available', async () => {
      const data = sampleTourMarketing({
        marketingDirector: { name: 'Jane Smith', email: 'jane@test.com', phone: '555-0001' },
      });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchTourMarketing(1);

      expect(result.marketingDirector).toEqual({
        name: 'Jane Smith',
        email: 'jane@test.com',
        phone: '555-0001',
      });
    });

    it('returns audience data', async () => {
      const data = sampleTourMarketing({
        audienceGender: 'Mixed',
        audienceAgeRangeIds: [1, 2, 3],
        audienceAgeRangeLabels: ['18-24', '25-34', '35-44'],
      });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchTourMarketing(2);

      expect(result.audienceGender).toBe('Mixed');
      expect(result.audienceAgeRangeIds).toEqual([1, 2, 3]);
      expect(result.audienceAgeRangeLabels).toEqual(['18-24', '25-34', '35-44']);
    });

    it('returns offer codes', async () => {
      const data = sampleTourMarketing({
        offerCodes: [
          { offerCodeId: 1, code: 'PROMO1', assignedTo: 'IAE - Sign Up', iaeSms: null, purpose: 'Presale' },
        ],
      });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchTourMarketing(3);

      expect(result.offerCodes).toHaveLength(1);
      expect(result.offerCodes[0].code).toBe('PROMO1');
    });

    it('returns media mix entries', async () => {
      const data = sampleTourMarketing({
        mediaMix: [
          {
            tourMediaMixId: 10,
            advertisingSubTypeId: 5,
            subTypeName: 'Radio',
            parentCategory: 'Audio',
            companyId: 200,
            companyName: 'Radio Corp',
          },
        ],
      });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchTourMarketing(4);

      expect(result.mediaMix).toHaveLength(1);
      expect(result.mediaMix[0].subTypeName).toBe('Radio');
    });
  });

  describe('saveTourMarketing', () => {
    it('calls apiFetch with POST and correct body', async () => {
      const response = sampleTourMarketing({ audienceGender: 'Female' });
      mockedApiFetch.mockResolvedValueOnce(response);

      const payload: SaveTourMarketingPayload = { audienceGender: 'Female' };
      const result = await saveTourMarketing(10, payload);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/tour-marketing/10', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result.audienceGender).toBe('Female');
    });

    it('sends audience age range IDs', async () => {
      mockedApiFetch.mockResolvedValueOnce(sampleTourMarketing());

      const payload: SaveTourMarketingPayload = { audienceAgeRangeIds: [1, 3, 5] };
      await saveTourMarketing(2, payload);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.audienceAgeRangeIds).toEqual([1, 3, 5]);
    });

    it('sends media mix entries', async () => {
      mockedApiFetch.mockResolvedValueOnce(sampleTourMarketing());

      const payload: SaveTourMarketingPayload = {
        mediaMix: [{ advertisingSubTypeId: 10, companyId: 200 }],
      };
      await saveTourMarketing(3, payload);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.mediaMix).toEqual([{ advertisingSubTypeId: 10, companyId: 200 }]);
    });

    it('sends offer codes', async () => {
      mockedApiFetch.mockResolvedValueOnce(sampleTourMarketing());

      const payload: SaveTourMarketingPayload = {
        offerCodes: [
          { code: 'NEW1', assignedTo: 'IAE - Sign Up', purpose: 'Presale' },
          { offerCodeId: 5, code: 'EXISTING', iaeSms: 'Artist' },
        ],
      };
      await saveTourMarketing(4, payload);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.offerCodes).toHaveLength(2);
      expect(callBody.offerCodes[0].code).toBe('NEW1');
      expect(callBody.offerCodes[1].offerCodeId).toBe(5);
    });
  });

  describe('deleteTourOfferCode', () => {
    it('calls apiFetch with DELETE and correct endpoint', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      await deleteTourOfferCode(10, 5);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/tour-marketing/10/offer-codes/5', {
        method: 'DELETE',
      });
    });
  });
});
