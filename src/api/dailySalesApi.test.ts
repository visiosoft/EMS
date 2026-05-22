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

type SummaryRow = ApiEngagementSalesDashboard['summary'][number];

function summaryRow(
  date: string,
  snapshotTickets: number,
  snapshotRevenue: number,
  backendCumulativeTickets = snapshotTickets,
  backendCumulativeRevenue = snapshotRevenue,
): SummaryRow {
  return {
    date,
    totalTicketsSold: backendCumulativeTickets,
    totalValueSold: backendCumulativeRevenue,
    dailyTicketsSold: snapshotTickets,
    dailyValueSold: snapshotRevenue,
    seatsSoldPct: null,
    seatsRemaining: null,
    revenueRemaining: null,
  };
}

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
    kpis: {
      totalRevenue: 250,
      ticketsDistributed: 25,
      pctSold: 0.5,
      revenueLast7Days: 250,
      ticketsLast7Days: 25,
      daysUntilOpening: 9,
      pctRevenueVsPotential: 0.5,
    },
    series: [],
    summary: [
      summaryRow('2026-05-21', 10, 100, 10, 100),
      summaryRow('2026-05-22', 15, 150, 25, 250),
    ],
    performanceId: 101,
    ...overrides,
  };
}

async function normalize(input: ApiEngagementSalesDashboard) {
  mockedApiFetch.mockResolvedValueOnce(input);
  return fetchEngagementSalesDashboard(10, input.asOfDate, input.performanceId ?? undefined);
}

describe('sales trend cumulative KPI normalization', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('uses the latest cumulative PerformanceSalesQuantity and PerformanceSalesRevenue snapshot, not the backend summed value', async () => {
    const result = await normalize(dashboard());

    expect(result.kpis.ticketsDistributed).toBe(15);
    expect(result.kpis.totalRevenue).toBe(150);
    expect(result.kpis.pctSold).toBe(0.3);
    expect(result.kpis.pctRevenueVsPotential).toBe(0.3);
  });

  it('uses the latest entered snapshot on or before the reporting date when the reporting day has no row', async () => {
    const result = await normalize(
      dashboard({
        asOfDate: '2026-05-23',
        summary: [
          summaryRow('2026-05-21', 10, 100, 10, 100),
          summaryRow('2026-05-22', 15, 150, 25, 250),
          summaryRow('2026-05-23', 0, 0, 25, 250),
        ],
      }),
    );

    expect(result.kpis.ticketsDistributed).toBe(15);
    expect(result.kpis.totalRevenue).toBe(150);
    expect(result.kpis.pctSold).toBe(0.3);
    expect(result.kpis.pctRevenueVsPotential).toBe(0.3);
  });

  it('ignores future snapshots after the selected reporting date', async () => {
    const result = await normalize(
      dashboard({
        asOfDate: '2026-05-22',
        summary: [
          summaryRow('2026-05-21', 10, 100, 10, 100),
          summaryRow('2026-05-22', 15, 150, 25, 250),
          summaryRow('2026-05-23', 999, 9999, 1024, 10249),
        ],
      }),
    );

    expect(result.kpis.ticketsDistributed).toBe(15);
    expect(result.kpis.totalRevenue).toBe(150);
  });

  it('calculates last-7-day KPIs as latest snapshot minus the snapshot as of seven days prior', async () => {
    const result = await normalize(
      dashboard({
        summary: [
          summaryRow('2026-05-15', 10, 100, 10, 100),
          summaryRow('2026-05-22', 15, 150, 25, 250),
        ],
      }),
    );

    expect(result.kpis.ticketsLast7Days).toBe(5);
    expect(result.kpis.revenueLast7Days).toBe(50);
  });

  it('uses zero as the seven-day baseline when no prior snapshot exists', async () => {
    const result = await normalize(
      dashboard({
        summary: [summaryRow('2026-05-22', 15, 150, 15, 150)],
      }),
    );

    expect(result.kpis.ticketsLast7Days).toBe(15);
    expect(result.kpis.revenueLast7Days).toBe(150);
  });

  it('falls back to series snapshots when summary rows are unavailable', async () => {
    const result = await normalize(
      dashboard({
        summary: [],
        series: [
          {
            date: '2026-05-21',
            totalTickets: 10,
            totalRevenue: 100,
            dailyTickets: 10,
            dailyRevenue: 100,
          },
          {
            date: '2026-05-22',
            totalTickets: 25,
            totalRevenue: 250,
            dailyTickets: 15,
            dailyRevenue: 150,
          },
        ],
      }),
    );

    expect(result.kpis.ticketsDistributed).toBe(15);
    expect(result.kpis.totalRevenue).toBe(150);
    expect(result.kpis.pctSold).toBe(0.3);
    expect(result.kpis.pctRevenueVsPotential).toBe(0.3);
  });

  it('does not override percentage KPIs when capacity or gross potential is missing', async () => {
    const result = await normalize(
      dashboard({
        sellableCapacity: null,
        grossPotential: null,
        kpis: {
          totalRevenue: 250,
          ticketsDistributed: 25,
          pctSold: null,
          revenueLast7Days: 250,
          ticketsLast7Days: 25,
          daysUntilOpening: 9,
          pctRevenueVsPotential: null,
        },
      }),
    );

    expect(result.kpis.ticketsDistributed).toBe(15);
    expect(result.kpis.totalRevenue).toBe(150);
    expect(result.kpis.pctSold).toBeNull();
    expect(result.kpis.pctRevenueVsPotential).toBeNull();
  });

  it('allows over-capacity and over-potential percentages instead of clamping the KPI values', async () => {
    const result = await normalize(
      dashboard({
        sellableCapacity: 10,
        grossPotential: 100,
        summary: [summaryRow('2026-05-22', 15, 150, 15, 150)],
      }),
    );

    expect(result.kpis.pctSold).toBe(150);
    expect(result.kpis.pctRevenueVsPotential).toBe(150);
  });

  it('keeps engagement and attraction roll-up dashboards unchanged because their backend KPI totals are already aggregate totals', async () => {
    const result = await normalize(
      dashboard({
        performanceId: null,
        kpis: {
          totalRevenue: 250,
          ticketsDistributed: 25,
          pctSold: 0.5,
          revenueLast7Days: 250,
          ticketsLast7Days: 25,
          daysUntilOpening: 9,
          pctRevenueVsPotential: 0.5,
        },
      }),
    );

    expect(result.kpis.totalRevenue).toBe(250);
    expect(result.kpis.ticketsDistributed).toBe(25);
    expect(result.kpis.pctSold).toBe(0.5);
    expect(result.kpis.pctRevenueVsPotential).toBe(0.5);
  });
});
