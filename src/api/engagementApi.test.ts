/**
 * Unit tests for new engagement API functions added in the engagement-module-tabs-enhancement branch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './config';
import {
  upsertEngagementLink,
  removeEngagementLink,
  updateNonResidentWithholding,
  fetchEngagementVenueTabData,
  updateEngagementVenueTab,
  updateEngagementFinance,
  fetchDepositTerms,
  updateDepositTerms,
  type ApiEngagementVenueTabData,
  type ApiEngagementLinkRow,
  type ApiVenueRoleContacts,
  type ApiRoleContactDisplay,
  type UpdateNonResidentWithholdingPayload,
  type UpdateEngagementVenueTabPayload,
  type UpdateEngagementFinancePayload,
  type ApiDepositTerms,
} from './engagementApi';

vi.mock('./config', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function sampleVenueTabData(overrides: Partial<ApiEngagementVenueTabData> = {}): ApiEngagementVenueTabData {
  return {
    venues: [],
    venueDealTypeId: 2,
    venueDealType: 'Flat Rental',
    venueTerms: 'Standard terms',
    techRiderLinkUrl: 'https://example.com/rider.pdf',
    engagementLinks: [
      {
        engagementLinkId: 1,
        linkId: 10,
        linkPurpose: 'Contract',
        linkUrl: 'https://sharepoint.com/contract.pdf',
        linkName: 'Contract 2026',
      },
    ],
    venueRoleContacts: {},
    iaeProductionManagers: [],
    ...overrides,
  };
}

describe('engagementApi – new functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEngagementVenueTabData', () => {
    it('calls apiFetch with correct endpoint', async () => {
      const data = sampleVenueTabData();
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchEngagementVenueTabData(42);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/42/venue-tab-data');
      expect(result).toEqual(data);
    });

    it('returns venue tab data with engagement links', async () => {
      const links: ApiEngagementLinkRow[] = [
        { engagementLinkId: 1, linkId: 10, linkPurpose: 'Contract', linkUrl: 'https://a.com', linkName: 'Contract' },
        { engagementLinkId: 2, linkId: 11, linkPurpose: 'Forecast', linkUrl: 'https://b.com', linkName: 'Forecast' },
      ];
      const data = sampleVenueTabData({ engagementLinks: links });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchEngagementVenueTabData(5);

      expect(result.engagementLinks).toHaveLength(2);
      expect(result.engagementLinks[0].linkPurpose).toBe('Contract');
      expect(result.engagementLinks[1].linkPurpose).toBe('Forecast');
    });

    it('returns venue role contacts keyed by venue company id', async () => {
      const contacts: ApiVenueRoleContacts = {
        venueTicketingSoftware: [{ contactId: 1, firstName: 'John', lastName: 'Doe', roleName: 'Venue Ticketing Software' }],
        venueTicketingAdministrator: [],
        venueProductionManager: [],
        venueStageLaborCompany: [],
        attractionTechDirector: [],
      };
      const data = sampleVenueTabData({ venueRoleContacts: { 100: contacts } });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchEngagementVenueTabData(7);

      expect(result.venueRoleContacts[100].venueTicketingSoftware).toHaveLength(1);
    });

    it('returns IAE production managers', async () => {
      const pms: ApiRoleContactDisplay[] = [
        { contactId: 5, firstName: 'Jane', lastName: 'Smith', roleName: 'Production Manager' },
      ];
      const data = sampleVenueTabData({ iaeProductionManagers: pms });
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchEngagementVenueTabData(10);

      expect(result.iaeProductionManagers).toHaveLength(1);
      expect(result.iaeProductionManagers[0].firstName).toBe('Jane');
    });
  });

  describe('upsertEngagementLink', () => {
    it('calls apiFetch with POST and correct body', async () => {
      const response = { engagementLinkId: 1, linkId: 10 };
      mockedApiFetch.mockResolvedValueOnce(response);

      const body = { linkUrl: 'https://sharepoint.com/file.pdf', linkName: 'Contract', linkPurpose: 'Contract' };
      const result = await upsertEngagementLink(42, body);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/42/links', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      expect(result).toEqual(response);
    });

    it('works without optional linkName', async () => {
      mockedApiFetch.mockResolvedValueOnce({ engagementLinkId: 2, linkId: 20 });

      const body = { linkUrl: 'https://example.com/forecast.xlsx', linkPurpose: 'Forecast' };
      await upsertEngagementLink(5, body);

      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/5/links', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    });
  });

  describe('removeEngagementLink', () => {
    it('calls apiFetch with DELETE and correct endpoint', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      await removeEngagementLink(42, 7);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/42/links/7', { method: 'DELETE' });
    });
  });

  describe('updateNonResidentWithholding', () => {
    it('calls apiFetch with PATCH and correct endpoint', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body: UpdateNonResidentWithholdingPayload = {
        withholdingArea: 'New York',
        withholdingTaxRate: 5.5,
        withholdingAgencyName: 'NY Tax Agency',
        iaeWaiverSubmissionDate: '2026-03-15',
        iaeWaiverAppNumber: 'APP-001',
      };
      await updateNonResidentWithholding(10, body);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/non-resident-withholding/10', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    });

    it('works with partial payload', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body: UpdateNonResidentWithholdingPayload = { withholdingArea: 'CA' };
      await updateNonResidentWithholding(3, body);

      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/non-resident-withholding/3', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    });
  });

  describe('updateEngagementVenueTab – new fields', () => {
    it('includes venueDealTypeId in the payload', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body: UpdateEngagementVenueTabPayload = { venueDealTypeId: 3 };
      await updateEngagementVenueTab(10, 200, body);

      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/10/venues/200/tab', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    });

    it('includes techRiderLinkUrl in the payload', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body: UpdateEngagementVenueTabPayload = { techRiderLinkUrl: 'https://example.com/rider.pdf' };
      await updateEngagementVenueTab(10, 200, body);

      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/10/venues/200/tab', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    });

    it('can send null for techRiderLinkUrl to clear value', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body: UpdateEngagementVenueTabPayload = { techRiderLinkUrl: null };
      await updateEngagementVenueTab(10, 200, body);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.techRiderLinkUrl).toBeNull();
    });
  });

  describe('updateEngagementFinance – final compensation fields', () => {
    it('includes all final compensation fields in the payload', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body: UpdateEngagementFinancePayload = {
        finalGuaranteeAmount: 5000,
        finalRoyaltyAmount: 2000,
        finalOverageAmount: 1000,
        finalBuyoutAmount: 3000,
        finalDirectCompanyCharges: 500,
        finalReimbursables: 200,
      };
      await updateEngagementFinance(42, body);

      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/42/finance', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    });

    it('can send null values to clear final compensation fields', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body: UpdateEngagementFinancePayload = {
        finalGuaranteeAmount: null,
        finalRoyaltyAmount: null,
      };
      await updateEngagementFinance(42, body);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.finalGuaranteeAmount).toBeNull();
      expect(callBody.finalRoyaltyAmount).toBeNull();
    });
  });

  // ── Deposit Terms (commit 0c8cf8e) ──────────────────────────────────────

  describe('fetchDepositTerms', () => {
    it('calls apiFetch with correct endpoint', async () => {
      const data: ApiDepositTerms = { depositAmount: 5000, depositDueDate: '2026-08-15' };
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchDepositTerms(42);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/42/deposit-terms');
      expect(result).toEqual(data);
    });

    it('returns null values when no deposit terms exist', async () => {
      const data: ApiDepositTerms = { depositAmount: null, depositDueDate: null };
      mockedApiFetch.mockResolvedValueOnce(data);

      const result = await fetchDepositTerms(10);

      expect(result.depositAmount).toBeNull();
      expect(result.depositDueDate).toBeNull();
    });
  });

  describe('updateDepositTerms', () => {
    it('calls apiFetch with PATCH and correct body', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body = { depositAmount: 3000, depositDueDate: '2026-09-01' };
      await updateDepositTerms(7, body);

      expect(mockedApiFetch).toHaveBeenCalledOnce();
      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/7/deposit-terms', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    });

    it('works with partial payload (only amount)', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body = { depositAmount: 1500 };
      await updateDepositTerms(3, body);

      expect(mockedApiFetch).toHaveBeenCalledWith('/engagements/3/deposit-terms', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    });

    it('can send null values to clear fields', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const body = { depositAmount: null, depositDueDate: null };
      await updateDepositTerms(1, body);

      const callBody = JSON.parse((mockedApiFetch.mock.calls[0][1] as any).body);
      expect(callBody.depositAmount).toBeNull();
      expect(callBody.depositDueDate).toBeNull();
    });
  });
});
