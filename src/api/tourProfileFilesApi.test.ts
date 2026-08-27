import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetchMultipart } from './config';
import { saveTourProfileFiles } from './tourProfileFilesApi';

vi.mock('./config', () => ({
  apiFetch: vi.fn(),
  apiFetchMultipart: vi.fn(),
}));

const mockedApiFetchMultipart = vi.mocked(apiFetchMultipart);

describe('tourProfileFilesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists selected Booking document types without removing hidden document links', async () => {
    mockedApiFetchMultipart.mockResolvedValueOnce({} as never);

    await saveTourProfileFiles(42, {
      bookingDocumentTypes: ['stagehandList', 'vipPdf'],
      stagehandList: { url: 'https://example.test/stagehands.pdf' },
    });

    const [endpoint, request] = mockedApiFetchMultipart.mock.calls[0];
    const formData = request?.body as FormData;
    expect(endpoint).toBe('/tours/42/profile-files');
    expect(formData.get('bookingDocumentTypes')).toBe(
      JSON.stringify(['stagehandList', 'vipPdf']),
    );
    expect(formData.get('stagehandListUrl')).toBe(
      'https://example.test/stagehands.pdf',
    );
    expect(formData.get('removeDealSheet')).toBeNull();
    expect(formData.get('removeVipPdf')).toBeNull();
  });
});