/**
 * Unit tests for the fetchCompanyLinks API function (commit 103e219).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './config';
import { fetchCompanyLinks, type ApiCompanyLinks } from './companyApi';

vi.mock('./config', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function sampleLinks(overrides: Partial<ApiCompanyLinks> = {}): ApiCompanyLinks {
  return {
    engagements: [
      { engagementId: 1, title: 'Attraction A', subtitle: 'Tour X', label: 'Attraction A — Tour X' },
    ],
    projects: [
      { projectId: 10, title: 'Attraction B', subtitle: 'Tour Y', label: 'Attraction B — Tour Y' },
    ],
    tours: [
      { tourId: 5, title: 'Attraction C', subtitle: 'Tour Z', label: 'Attraction C — Tour Z', role: 'Talent Agency' },
    ],
    attractions: [
      { attractionId: 3, title: 'My Attraction', subtitle: null, label: 'My Attraction', role: 'Attraction Management' },
    ],
    serviceProviderFor: [
      { venueCompanyId: 20, title: 'Venue Corp', subtitle: null, label: 'Venue Corp' },
    ],
    entertainmentComplexes: [
      { complexCompanyId: 30, title: 'Complex One', subtitle: null, label: 'Complex One' },
    ],
    complexVenues: [
      { venueCompanyId: 40, title: 'Venue In Complex', subtitle: null, label: 'Venue In Complex' },
    ],
    ...overrides,
  };
}

describe('fetchCompanyLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls apiFetch with the correct endpoint', async () => {
    const expected = sampleLinks();
    mockedApiFetch.mockResolvedValueOnce(expected);

    const result = await fetchCompanyLinks(42);

    expect(mockedApiFetch).toHaveBeenCalledOnce();
    expect(mockedApiFetch).toHaveBeenCalledWith('/companies/42/links');
    expect(result).toEqual(expected);
  });

  it('returns all link categories from the API response', async () => {
    const expected = sampleLinks();
    mockedApiFetch.mockResolvedValueOnce(expected);

    const result = await fetchCompanyLinks(1);

    expect(result.engagements).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
    expect(result.tours).toHaveLength(1);
    expect(result.attractions).toHaveLength(1);
    expect(result.serviceProviderFor).toHaveLength(1);
    expect(result.entertainmentComplexes).toHaveLength(1);
    expect(result.complexVenues).toHaveLength(1);
  });

  it('handles empty link categories', async () => {
    const expected = sampleLinks({
      engagements: [],
      projects: [],
      tours: [],
      attractions: [],
      serviceProviderFor: [],
      entertainmentComplexes: [],
      complexVenues: [],
    });
    mockedApiFetch.mockResolvedValueOnce(expected);

    const result = await fetchCompanyLinks(99);

    expect(result.engagements).toHaveLength(0);
    expect(result.projects).toHaveLength(0);
    expect(result.tours).toHaveLength(0);
    expect(result.attractions).toHaveLength(0);
    expect(result.serviceProviderFor).toHaveLength(0);
    expect(result.entertainmentComplexes).toHaveLength(0);
    expect(result.complexVenues).toHaveLength(0);
  });

  it('propagates errors from apiFetch', async () => {
    mockedApiFetch.mockRejectedValueOnce(new Error('Not found'));

    await expect(fetchCompanyLinks(999)).rejects.toThrow('Not found');
  });

  it('passes tour role information correctly', async () => {
    const links = sampleLinks({
      tours: [
        { tourId: 7, title: 'T1', subtitle: null, label: 'T1', role: 'Talent Agency & Tour Management' },
        { tourId: 8, title: 'T2', subtitle: 'Sub', label: 'T2 — Sub', role: 'Tour Management' },
      ],
    });
    mockedApiFetch.mockResolvedValueOnce(links);

    const result = await fetchCompanyLinks(5);

    expect(result.tours[0].role).toBe('Talent Agency & Tour Management');
    expect(result.tours[1].role).toBe('Tour Management');
  });
});
