/**
 * Unit tests for venue marketing API functions (commit 1614d54).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './config';
import {
  fetchVenueMarketingLookups,
  fetchVenueMarketing,
  saveVenueMarketing,
  deleteVenueMarketingSpec,
  type ApiVenueMarketingResponse,
  type SaveVenueMarketingPayload,
} from './venueMarketingApi';

vi.mock('./config', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function sampleVenueMarketing(overrides: Partial<ApiVenueMarketingResponse> = {}): ApiVenueMarketingResponse {
  return {
    styleGuideEnabled: false,
    styleGuide: null,
    specs: [],
    ...overrides,
  };
}

describe('venueMarketingApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchVenueMarketingLookups', () => {
    it('fetches all lookup endpoints in parallel', async () => {
      mockedApiFetch
        .mockResolvedValueOnce([{ placementCategoryId: 1, placementName: 'Billboard', mediumId: 1, medium: { mediumId: 1, mediumName: 'Print', isActive: true }, sizeUnit: 'in', isActive: true, sortOrder: 1 }])
        .mockResolvedValueOnce([{ localizationOptionId: 1, localizationName: 'English', isActive: true, sortOrder: 1 }])
        .mockResolvedValueOnce([{ tagOptionId: 1, tagName: 'Featured', isActive: true, sortOrder: 1 }])
        .mockResolvedValueOnce([{ fileSpecOptionId: 1, fileSpecName: 'CMYK', isActive: true, sortOrder: 1 }])
        .mockResolvedValueOnce([{ fileFormatOptionId: 1, fileFormatName: 'PDF', isActive: true, sortOrder: 1 }]);

      const result = await fetchVenueMarketingLookups();

      expect(mockedApiFetch).toHaveBeenCalledTimes(5);
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/lookups/placement-categories');
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/lookups/localization-options');
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/lookups/tag-options');
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/lookups/file-spec-options');
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/lookups/file-format-options');
      expect(result.placementCategories).toHaveLength(1);
      expect(result.localizationOptions).toHaveLength(1);
      expect(result.tagOptions).toHaveLength(1);
      expect(result.fileSpecOptions).toHaveLength(1);
      expect(result.fileFormatOptions).toHaveLength(1);
    });
  });

  describe('fetchVenueMarketing', () => {
    it('calls apiFetch with correct venue ID endpoint', async () => {
      const data = sampleVenueMarketing();
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchVenueMarketing(100);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/100');
      expect(result).toEqual(data);
    });

    it('returns style guide data when enabled', async () => {
      const data = sampleVenueMarketing({
        styleGuideEnabled: true,
        styleGuide: {
          venueStyleGuideId: 1,
          font: 'Helvetica',
          primaryColors: '#FF0000',
          accentColors: '#00FF00',
          notes: 'Use brand colors only',
          logoUrl: 'https://example.com/logo.png',
        },
      });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchVenueMarketing(5);

      expect(result.styleGuideEnabled).toBe(true);
      expect(result.styleGuide?.font).toBe('Helvetica');
      expect(result.styleGuide?.primaryColors).toBe('#FF0000');
    });

    it('returns marketing specs with localizations and tags', async () => {
      const data = sampleVenueMarketing({
        specs: [
          {
            venueMarketingSpecsId: 10,
            fileName: 'banner.psd',
            placementCategoryId: 1,
            placementCategoryName: 'Billboard',
            mediumName: 'Print',
            sizeUnit: 'in',
            graphicSizeHorizontal: '48',
            graphicSizeVertical: '14',
            fileFormatOptionId: 2,
            fileFormatName: 'PSD',
            notes: 'High res only',
            localizations: [{ localizationOptionId: 1, localizationName: 'English', customValue: null }],
            tags: [{ tagOptionId: 1, tagName: 'Featured' }],
            fileSpecs: [{ fileSpecOptionId: 1, fileSpecName: 'CMYK', customValue: null }],
          },
        ],
      });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchVenueMarketing(8);

      expect(result.specs).toHaveLength(1);
      expect(result.specs[0].fileName).toBe('banner.psd');
      expect(result.specs[0].localizations).toHaveLength(1);
      expect(result.specs[0].tags).toHaveLength(1);
      expect(result.specs[0].fileSpecs).toHaveLength(1);
    });
  });

  describe('saveVenueMarketing', () => {
    it('calls apiFetch with POST and correct body', async () => {
      const response = sampleVenueMarketing({ styleGuideEnabled: true });
      mockedApiFetch.mockResolvedValueOnce(response);

      const payload: SaveVenueMarketingPayload = {
        styleGuideEnabled: true,
        styleGuide: { font: 'Arial', primaryColors: '#000' },
        specs: [],
      };
      const result = await saveVenueMarketing(50, payload);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/50', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result.styleGuideEnabled).toBe(true);
    });

    it('sends specs with localizations and tags', async () => {
      mockedApiFetch.mockResolvedValueOnce(sampleVenueMarketing());

      const payload: SaveVenueMarketingPayload = {
        styleGuideEnabled: false,
        specs: [
          {
            fileName: 'new-banner.ai',
            placementCategoryId: 2,
            graphicSizeHorizontal: '1920',
            graphicSizeVertical: '1080',
            fileFormatOptionId: 3,
            notes: 'Digital banner',
            localizations: [{ localizationOptionId: 1, customValue: 'US English' }],
            tags: [{ tagOptionId: 2 }],
            fileSpecs: [{ fileSpecOptionId: 1 }],
          },
        ],
      };
      await saveVenueMarketing(20, payload);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.specs).toHaveLength(1);
      expect(callBody.specs[0].localizations).toHaveLength(1);
      expect(callBody.specs[0].tags).toHaveLength(1);
    });

    it('can send null styleGuide to clear it', async () => {
      mockedApiFetch.mockResolvedValueOnce(sampleVenueMarketing());

      const payload: SaveVenueMarketingPayload = {
        styleGuideEnabled: false,
        styleGuide: null,
        specs: [],
      };
      await saveVenueMarketing(30, payload);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.styleGuide).toBeNull();
    });

    it('can update existing spec with venueMarketingSpecsId', async () => {
      mockedApiFetch.mockResolvedValueOnce(sampleVenueMarketing());

      const payload: SaveVenueMarketingPayload = {
        styleGuideEnabled: false,
        specs: [
          { venueMarketingSpecsId: 10, fileName: 'updated.psd', notes: 'Updated notes' },
        ],
      };
      await saveVenueMarketing(15, payload);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.specs[0].venueMarketingSpecsId).toBe(10);
    });
  });

  describe('deleteVenueMarketingSpec', () => {
    it('calls apiFetch with DELETE and correct endpoint', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      await deleteVenueMarketingSpec(50, 10);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/venue-marketing/50/specs/10', {
        method: 'DELETE',
      });
    });
  });
});
