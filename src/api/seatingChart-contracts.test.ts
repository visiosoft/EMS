/**
 * Unit tests for seating chart and performance contract API functions.
 * Covers commit c1656dd (seating chart upload/removal) and uncommitted
 * contract tab changes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, apiFetchMultipart } from './config';
import {
  uploadVenueSeatingChart,
  removeVenueSeatingChart,
  fetchPerformanceContracts,
  uploadContractPdf,
  savePerformanceContract,
  updatePerformanceContract,
  deletePerformanceContract,
  type ApiPerformanceContractRow,
  type SavePerformanceContractPayload,
} from './engagementApi';

vi.mock('./config', () => ({
  apiFetch: vi.fn(),
  apiFetchMultipart: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedApiFetchMultipart = vi.mocked(apiFetchMultipart);

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Seating Chart (commit c1656dd) ──────────────────────────────────────────

describe('uploadVenueSeatingChart', () => {
  it('should send a multipart POST with the seatingChart field', async () => {
    const mockResponse = { seatingChartLinkId: 42, seatingChartLinkUrl: '/uploads/seating-charts/abc.pdf' };
    mockedApiFetchMultipart.mockResolvedValueOnce(mockResponse);

    const file = new File(['pdf-content'], 'chart.pdf', { type: 'application/pdf' });
    const result = await uploadVenueSeatingChart(100, 200, file);

    expect(mockedApiFetchMultipart).toHaveBeenCalledOnce();
    const [path, init] = mockedApiFetchMultipart.mock.calls[0];
    expect(path).toBe('/engagements/100/venues/200/seating-chart');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('seatingChart')).toBe(file);
    expect(result).toEqual(mockResponse);
  });

  it('should use correct path params for different engagement/venue ids', async () => {
    mockedApiFetchMultipart.mockResolvedValueOnce({ seatingChartLinkId: 1, seatingChartLinkUrl: '/x.jpg' });

    const file = new File(['img'], 'seating.jpg', { type: 'image/jpeg' });
    await uploadVenueSeatingChart(55, 77, file);

    expect(mockedApiFetchMultipart).toHaveBeenCalledWith(
      '/engagements/55/venues/77/seating-chart',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('removeVenueSeatingChart', () => {
  it('should send a DELETE request to the correct endpoint', async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await removeVenueSeatingChart(100, 200);

    expect(mockedApiFetch).toHaveBeenCalledOnce();
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/engagements/100/venues/200/seating-chart',
      { method: 'DELETE' },
    );
  });

  it('should work for different venue/engagement ids', async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await removeVenueSeatingChart(1, 999);

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/engagements/1/venues/999/seating-chart',
      { method: 'DELETE' },
    );
  });
});

// ─── Performance Contracts (uncommitted) ─────────────────────────────────────

describe('fetchPerformanceContracts', () => {
  it('should GET the contracts for an engagement', async () => {
    const contracts: ApiPerformanceContractRow[] = [
      {
        contractId: 1,
        createdAt: '2026-06-20T10:00:00Z',
        engagementId: 965,
        agency: 'CAA',
        agent: 'John Agent',
        attraction: 'The Band',
        venueName: 'Arena',
        venueAddress: '123 Main St',
        venueCity: 'Austin',
        venueState: 'TX',
        venueCountry: 'USA',
        producer: 'LiveCo',
        producerAddress: '456 Oak Ave',
        producerFedId: '12-3456789',
        guaranteeAmount: 100000,
        guaranteeCurrency: 'USD',
        depositAmount: 25000,
        depositDueDate: '2026-07-01',
        balanceAmount: 75000,
        balanceDueDate: '2026-08-01',
        royaltyDescription: 'Standard royalty terms',
        overageDescription: null,
        paymentTerms: 'Net 30',
        paymentMethodType: 'Wire',
        paymentPayableTo: 'The Band LLC',
        paymentBankName: 'First Bank',
        performances: 'Aug 15, 2026 8PM',
        additionallyInsured: 'LiveCo Inc',
        annotatedPdfBlobName: null,
        originalFilename: 'contract.pdf',
        oneDrivePdfUrl: null,
      },
    ];
    mockedApiFetch.mockResolvedValueOnce(contracts);

    const result = await fetchPerformanceContracts(965);

    expect(mockedApiFetch).toHaveBeenCalledOnce();
    expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/965/contracts');
    expect(result).toHaveLength(1);
    expect(result[0].attraction).toBe('The Band');
    expect(result[0].guaranteeAmount).toBe(100000);
  });

  it('should return empty array when no contracts exist', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    const result = await fetchPerformanceContracts(1);
    expect(result).toEqual([]);
  });
});

describe('uploadContractPdf', () => {
  it('should send multipart POST and return extracted data', async () => {
    const uploadResponse = {
      extracted: {
        agency: 'WME',
        agent: 'Jane Agent',
        attraction: 'Artist X',
        venueName: 'The Forum',
        venueAddress: null,
        venueCity: 'Los Angeles',
        venueState: 'CA',
        venueCountry: 'USA',
        producer: null,
        producerAddress: null,
        producerFedId: null,
        guaranteeAmount: 500000,
        guaranteeCurrency: 'USD',
        depositAmount: 125000,
        depositDueDate: '2026-08-01',
        balanceAmount: 375000,
        balanceDueDate: '2026-09-01',
        royaltyDescription: null,
        overageDescription: null,
        paymentTerms: null,
        paymentMethodType: 'Wire',
        paymentPayableTo: 'Artist X Inc',
        paymentBankName: null,
        performances: 'Sep 15, 2026',
        additionallyInsured: null,
        oneDrivePdfUrl: null,
      },
      originalFilename: 'artist-contract.pdf',
      annotatedPdfBlobName: '',
    };
    mockedApiFetchMultipart.mockResolvedValueOnce(uploadResponse);

    const file = new File(['%PDF...'], 'artist-contract.pdf', { type: 'application/pdf' });
    const result = await uploadContractPdf(965, file);

    expect(mockedApiFetchMultipart).toHaveBeenCalledOnce();
    const [path, init] = mockedApiFetchMultipart.mock.calls[0];
    expect(path).toBe('/engagements/965/contracts/upload');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('contractFile')).toBe(file);
    expect(result.extracted.attraction).toBe('Artist X');
    expect(result.originalFilename).toBe('artist-contract.pdf');
  });
});

describe('savePerformanceContract', () => {
  it('should POST contract data and return contractId', async () => {
    mockedApiFetch.mockResolvedValueOnce({ contractId: 42 });

    const payload: SavePerformanceContractPayload = {
      agency: 'CAA',
      agent: 'Agent Smith',
      attraction: 'Show X',
      venueName: 'Big Arena',
      guaranteeAmount: 200000,
      guaranteeCurrency: 'USD',
    };
    const result = await savePerformanceContract(965, payload);

    expect(mockedApiFetch).toHaveBeenCalledOnce();
    expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/965/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ contractId: 42 });
  });

  it('should handle all-null optional fields', async () => {
    mockedApiFetch.mockResolvedValueOnce({ contractId: 1 });

    const payload: SavePerformanceContractPayload = {
      agency: null,
      agent: null,
      attraction: null,
    };
    await savePerformanceContract(10, payload);

    expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/10/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('updatePerformanceContract', () => {
  it('should PATCH existing contract with partial data', async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    const payload: SavePerformanceContractPayload = {
      guaranteeAmount: 300000,
      depositDueDate: '2026-09-01',
    };
    await updatePerformanceContract(965, 42, payload);

    expect(mockedApiFetch).toHaveBeenCalledOnce();
    expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/965/contracts/42', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});

describe('deletePerformanceContract', () => {
  it('should DELETE a contract by id', async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await deletePerformanceContract(965, 42);

    expect(mockedApiFetch).toHaveBeenCalledOnce();
    expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/965/contracts/42', {
      method: 'DELETE',
    });
  });
});
