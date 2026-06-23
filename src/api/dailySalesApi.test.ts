import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './config';
import {
  fetchEngagementSalesDashboard,
  type ApiEngagementSalesDashboard,
} from './dailySalesApi';

vi.mock('./config', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function dashboard(
  overrides: Partial<ApiEngagementSalesDashboard> = {},
): ApiEngagementSalesDashboard {
  return {
    engagementId: 10,
    asOfDate: '2026-05-22',
    header: {
      attractionName: 'NKU-Edited-2',
      tourName: 'NKU-Tour-2',
      venueLabel: 'NKU Technologies (Pvt) Ltd',
      city: 'Lahore',
      stateProvince: 'Punjab',
      showDate: '2026-05-31',
      showTime: '14:52:00',
    },
    sellableCapacity: 5000,
    grossPotential: 50000,
    marketingWindow: {
      preSaleDate: '2026-05-01',
      onSaleDate: '2026-05-15',
    },
    kpis: {
      totalRevenue: 250,
      ticketsDistributed: 25,
      pctSold: 0.5,
      revenueLast7Days: 50,
      ticketsLast7Days: 5,
      daysUntilOpening: 9,
      pctRevenueVsPotential: 0.5,
    },
    series: [
      {
        date: '2026-05-21',
        totalTickets: 20,
        totalRevenue: 200,
        dailyTickets: 20,
        dailyRevenue: 200,
      },
      {
        date: '2026-05-22',
        totalTickets: 25,
        totalRevenue: 250,
        dailyTickets: 5,
        dailyRevenue: 50,
      },
    ],
    summary: [
      {
        date: '2026-05-21',
        totalTicketsSold: 20,
        totalValueSold: 200,
        dailyTicketsSold: 20,
        dailyValueSold: 200,
        seatsSoldPct: 0.4,
        seatsRemaining: 4980,
        revenueRemaining: 49800,
      },
      {
        date: '2026-05-22',
        totalTicketsSold: 25,
        totalValueSold: 250,
        dailyTicketsSold: 5,
        dailyValueSold: 50,
        seatsSoldPct: 0.5,
        seatsRemaining: 4975,
        revenueRemaining: 49750,
      },
    ],
    performanceId: 101,
    ...overrides,
  };
}

async function fetchNormalized(input: ApiEngagementSalesDashboard) {
  mockedApiFetch.mockResolvedValueOnce(input);
  return fetchEngagementSalesDashboard(
    input.engagementId,
    input.asOfDate,
    input.performanceId ?? undefined,
  );
}

describe('sales dashboard API response', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('preserves backend-calculated cumulative KPIs and per-period deltas', async () => {
    const result = await fetchNormalized(dashboard());

    expect(result.kpis.ticketsDistributed).toBe(25);
    expect(result.kpis.totalRevenue).toBe(250);
    expect(result.kpis.ticketsLast7Days).toBe(5);
    expect(result.kpis.revenueLast7Days).toBe(50);
    expect(result.series[1]).toMatchObject({
      totalTickets: 25,
      totalRevenue: 250,
      dailyTickets: 5,
      dailyRevenue: 50,
    });
    expect(result.summary[1]).toMatchObject({
      totalTicketsSold: 25,
      totalValueSold: 250,
      dailyTicketsSold: 5,
      dailyValueSold: 50,
      seatsRemaining: 4975,
      revenueRemaining: 49750,
    });
  });

  it('carries marketing pre-sale and on-sale dates through to the dashboard UI', async () => {
    const result = await fetchNormalized(dashboard());

    expect(result.marketingWindow).toEqual({
      preSaleDate: '2026-05-01',
      onSaleDate: '2026-05-15',
    });
  });
});
