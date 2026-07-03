import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiSalesDashboardBody } from '@/api/dailySalesApi';
import { SalesDashboardView } from './SalesDashboardView';

vi.mock('recharts', async () => {
  const React = await import('react');
  const Passthrough = ({
    children,
  }: {
    children?: React.ReactNode;
  }) => React.createElement('div', null, children);
  const NullPart = () => null;
  const ReferenceLine = ({ label }: { label?: { value?: string } }) =>
    label?.value ? React.createElement('span', null, label.value) : null;

  return {
    Area: NullPart,
    Bar: NullPart,
    CartesianGrid: NullPart,
    ComposedChart: Passthrough,
    Line: NullPart,
    ReferenceLine,
    ResponsiveContainer: Passthrough,
    Tooltip: NullPart,
    XAxis: NullPart,
    YAxis: NullPart,
  };
});

function dashboard(): ApiSalesDashboardBody {
  return {
    asOfDate: '2026-05-22',
    header: {
      attractionName: 'NKU-Edited-2',
      tourName: 'NKU-Tour-2',
      entertainmentComplexNames: 'Complex A',
      venueLabel: 'NKU Technologies',
      city: 'Lahore',
      stateProvince: 'Punjab',
      showDate: '2026-05-31',
      showTime: '19:00:00',
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
        date: '2026-05-01',
        totalTickets: 10,
        totalRevenue: 100,
        dailyTickets: 10,
        dailyRevenue: 100,
      },
      {
        date: '2026-05-15',
        totalTickets: 20,
        totalRevenue: 200,
        dailyTickets: 10,
        dailyRevenue: 100,
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
        date: '2026-05-01',
        totalTicketsSold: 10,
        totalValueSold: 100,
        dailyTicketsSold: 10,
        dailyValueSold: 100,
        seatsSoldPct: 0.2,
        seatsRemaining: 4990,
        revenueRemaining: 49900,
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
  };
}

function renderDashboard() {
  return render(
    <SalesDashboardView
      asOf="2026-05-22"
      onAsOfChange={vi.fn()}
      onBack={vi.fn()}
      loading={false}
      error={null}
      onRetry={vi.fn()}
      data={dashboard()}
    />,
  );
}

describe('SalesDashboardView', () => {
  it('keeps chart unit tabs visible in the expanded chart screen', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /open cumulative sales chart/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('tab', { name: 'Date' })).toBeVisible();
    expect(within(dialog).getByRole('tab', { name: 'Week' })).toBeVisible();
    expect(within(dialog).getByRole('tab', { name: 'Month' })).toBeVisible();
    expect(within(dialog).getByRole('tab', { name: 'Lifetime' })).toBeVisible();
    expect(within(dialog).getByText('Pre-sale')).toBeVisible();
    expect(within(dialog).getByText('Public sale')).toBeVisible();
  });

  it('uses marketing dates for sale period labels and cumulative totals in the summary', () => {
    renderDashboard();

    const preSaleRow = screen.getByText('Fri, May 1, 2026').closest('tr');
    const publicSaleRow = screen.getByText('Fri, May 22, 2026').closest('tr');
    expect(preSaleRow).not.toBeNull();
    expect(publicSaleRow).not.toBeNull();

    expect(within(preSaleRow as HTMLTableRowElement).getByText('Pre-Sale')).toBeVisible();
    expect(within(publicSaleRow as HTMLTableRowElement).getByText('Public Sale')).toBeVisible();
    expect(within(publicSaleRow as HTMLTableRowElement).getByText('25')).toBeVisible();
    expect(within(publicSaleRow as HTMLTableRowElement).getByText('$250')).toBeVisible();
    expect(within(publicSaleRow as HTMLTableRowElement).queryByText('$50')).not.toBeInTheDocument();
  });

  it("shows the most recent sales day in the audit wrap when yesterday had no sales", () => {
    // asOf is May 22; May 21 has no sales, so Yesterday's Wrap reflects the most
    // recent day sales actually occurred — May 22's report (5 tickets / $50).
    renderDashboard();

    const wrapRow = screen.getByText('Total Tickets Sold Yesterday').closest('th');
    expect(wrapRow).not.toBeNull();

    const valuesRow = screen
      .getByText("Yesterday's Wrap")
      .closest('table')
      ?.querySelector('tbody tr');
    expect(valuesRow).not.toBeNull();
    expect(within(valuesRow as HTMLElement).getByText('5')).toBeVisible();
    expect(within(valuesRow as HTMLElement).getByText('$50')).toBeVisible();
  });

  it('derives the wrap delta from cumulative totals after consecutive no-sale days', () => {
    // Mirrors a real dataset: flat cumulative days (Jun 26–28) then an increase
    // on Jun 29. The daily* fields are deliberately set to the cumulative value
    // to prove the wrap recomputes the delta from totalTickets/totalRevenue
    // (37 / $2,764) rather than echoing the cumulative (1312 / $111,424).
    const data = dashboard();
    data.asOfDate = '2026-06-29';
    data.series = [
      { date: '2026-06-25', totalTickets: 1248, totalRevenue: 106432, dailyTickets: 1248, dailyRevenue: 106432 },
      { date: '2026-06-26', totalTickets: 1275, totalRevenue: 108660, dailyTickets: 1275, dailyRevenue: 108660 },
      { date: '2026-06-27', totalTickets: 1275, totalRevenue: 108660, dailyTickets: 1275, dailyRevenue: 108660 },
      { date: '2026-06-28', totalTickets: 1275, totalRevenue: 108660, dailyTickets: 1275, dailyRevenue: 108660 },
      { date: '2026-06-29', totalTickets: 1312, totalRevenue: 111424, dailyTickets: 1312, dailyRevenue: 111424 },
    ];

    render(
      <SalesDashboardView
        asOf="2026-06-29"
        onAsOfChange={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        data={data}
      />,
    );

    const valuesRow = screen
      .getByText("Yesterday's Wrap")
      .closest('table')
      ?.querySelector('tbody tr');
    expect(valuesRow).not.toBeNull();
    // Jun 29 delta: 1312 - 1275 = 37 tickets, 111424 - 108660 = $2,764
    expect(within(valuesRow as HTMLElement).getByText('37')).toBeVisible();
    expect(within(valuesRow as HTMLElement).getByText('$2,764')).toBeVisible();
    // Must not echo the cumulative total.
    expect(within(valuesRow as HTMLElement).queryByText('1,312')).not.toBeInTheDocument();
    expect(within(valuesRow as HTMLElement).queryByText('$111,424')).not.toBeInTheDocument();
  });

  it('carries forward the latest day with data for the Lifetime to-date figures when KPIs are 0', () => {
    // The as-of KPIs come back as 0, but the series still has cumulative data
    // through Jun 29. The Lifetime section should reflect the latest day with
    // data (2,500 / $25,000 / 50% / 50%) instead of dropping to 0.
    const data = dashboard();
    data.asOfDate = '2026-06-29';
    data.sellableCapacity = 5000;
    data.grossPotential = 50000;
    data.kpis = {
      ...data.kpis,
      totalRevenue: 0,
      ticketsDistributed: 0,
      pctSold: 0,
      pctRevenueVsPotential: 0,
    };
    data.series = [
      { date: '2026-06-28', totalTickets: 2400, totalRevenue: 24000, dailyTickets: 100, dailyRevenue: 1000 },
      { date: '2026-06-29', totalTickets: 2500, totalRevenue: 25000, dailyTickets: 100, dailyRevenue: 1000 },
    ];

    render(
      <SalesDashboardView
        asOf="2026-06-29"
        onAsOfChange={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        data={data}
      />,
    );

    // Carried forward from Jun 29 instead of the zeroed KPI snapshot.
    expect(screen.getByText('2,500')).toBeVisible();
    expect(screen.getByText('$25,000')).toBeVisible();
    // % of Seats Sold and % of $ Potential Sold, recomputed from the carry.
    expect(screen.getAllByText('50.0%').length).toBeGreaterThanOrEqual(2);
  });

  it('shows informative lifetime snapshots instead of one-point charts', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: 'Lifetime' }));

    expect(screen.getAllByText('Lifetime Snapshot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tickets sold').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sales revenue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('May 1, 2026 - May 22, 2026').length).toBeGreaterThan(0);
    expect(screen.queryByText('No chart data available.')).not.toBeInTheDocument();
  });

  it('fills forward unreported weekend days in the summary table from the previous reported day', () => {
    // Simulate: May 20 has real sales, May 21 has no report (zeros), May 22 has real sales.
    // May 21 should carry forward May 20's cumulative values (fill-forward).
    const data = dashboard();
    data.summary = [
      {
        date: '2026-05-20',
        totalTicketsSold: 15,
        totalValueSold: 150,
        dailyTicketsSold: 5,
        dailyValueSold: 50,
        seatsSoldPct: 0.3,
        seatsRemaining: 4985,
        revenueRemaining: 49850,
      },
      {
        date: '2026-05-21',
        totalTicketsSold: 0,
        totalValueSold: 0,
        dailyTicketsSold: 0,
        dailyValueSold: 0,
        seatsSoldPct: 0,
        seatsRemaining: 0,
        revenueRemaining: 0,
      },
      {
        date: '2026-05-22',
        totalTicketsSold: 25,
        totalValueSold: 250,
        dailyTicketsSold: 10,
        dailyValueSold: 100,
        seatsSoldPct: 0.5,
        seatsRemaining: 4975,
        revenueRemaining: 49750,
      },
    ];

    render(
      <SalesDashboardView
        asOf="2026-05-22"
        onAsOfChange={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        data={data}
      />,
    );

    // May 21 row should carry forward May 20's total values (fill-forward)
    const may21Row = screen.getByText('Thu, May 21, 2026').closest('tr');
    expect(may21Row).not.toBeNull();
    // Carried forward from May 20: totalTicketsSold=15, totalValueSold=$150
    expect(within(may21Row as HTMLTableRowElement).getByText('15')).toBeVisible();
    expect(within(may21Row as HTMLTableRowElement).getByText('$150')).toBeVisible();
  });

  it('fills trailing unreported days forward from the previous reported day', () => {
    // May 22 is the last day and has no report — it carries forward the previous
    // reported day (May 20) instead of dropping to 0.
    const data = dashboard();
    data.summary = [
      {
        date: '2026-05-20',
        totalTicketsSold: 15,
        totalValueSold: 150,
        dailyTicketsSold: 5,
        dailyValueSold: 50,
        seatsSoldPct: 0.3,
        seatsRemaining: 4985,
        revenueRemaining: 49850,
      },
      {
        date: '2026-05-22',
        totalTicketsSold: 0,
        totalValueSold: 0,
        dailyTicketsSold: 0,
        dailyValueSold: 0,
        seatsSoldPct: 0,
        seatsRemaining: 0,
        revenueRemaining: 0,
      },
    ];

    render(
      <SalesDashboardView
        asOf="2026-05-22"
        onAsOfChange={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        data={data}
      />,
    );

    // May 22 is trailing and unreported — carries forward May 20's cumulative
    const may22Row = screen.getByText('Fri, May 22, 2026').closest('tr');
    expect(may22Row).not.toBeNull();
    // Carried forward from May 20: totalTicketsSold=15, totalValueSold=$150
    expect(within(may22Row as HTMLTableRowElement).getByText('15')).toBeVisible();
    expect(within(may22Row as HTMLTableRowElement).getByText('$150')).toBeVisible();
  });

  it('leaves leading days before the first sale at 0 (nothing to carry forward)', () => {
    // May 20 and May 21 precede the first reported sale (May 22). With no prior
    // day to carry forward, they remain at 0 — the only time 0 is displayed.
    const data = dashboard();
    data.summary = [
      {
        date: '2026-05-20',
        totalTicketsSold: 0,
        totalValueSold: 0,
        dailyTicketsSold: 0,
        dailyValueSold: 0,
        seatsSoldPct: 0,
        seatsRemaining: 0,
        revenueRemaining: 0,
      },
      {
        date: '2026-05-22',
        totalTicketsSold: 15,
        totalValueSold: 150,
        dailyTicketsSold: 15,
        dailyValueSold: 150,
        seatsSoldPct: 0.3,
        seatsRemaining: 4985,
        revenueRemaining: 49850,
      },
    ];

    render(
      <SalesDashboardView
        asOf="2026-05-22"
        onAsOfChange={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        data={data}
      />,
    );

    // May 20 precedes the first sale — stays zeroed (no prior day to carry).
    const may20Row = screen.getByText('Wed, May 20, 2026').closest('tr');
    expect(may20Row).not.toBeNull();
    expect(
      within(may20Row as HTMLTableRowElement).getAllByText('0').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(may20Row as HTMLTableRowElement).getAllByText('$0').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders audit wrap fallback note when yesterday has no report', () => {
    // asOfDate is May 22, yesterday (May 21) has no series entry,
    // so wrap should fall back to the latest reported day and show a note.
    const data = dashboard();
    // Remove May 21 from series entirely — only have May 1, May 15, May 22
    data.series = [
      { date: '2026-05-01', totalTickets: 10, totalRevenue: 100, dailyTickets: 10, dailyRevenue: 100 },
      { date: '2026-05-15', totalTickets: 20, totalRevenue: 200, dailyTickets: 10, dailyRevenue: 100 },
      { date: '2026-05-22', totalTickets: 25, totalRevenue: 250, dailyTickets: 5, dailyRevenue: 50 },
    ];

    render(
      <SalesDashboardView
        asOf="2026-05-22"
        onAsOfChange={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        data={data}
      />,
    );

    // The wrap section should still show values from the latest reported day
    const wrapTable = screen.getByText("Yesterday's Wrap").closest('table');
    expect(wrapTable).not.toBeNull();
    const valuesRow = wrapTable?.querySelector('tbody tr');
    expect(valuesRow).not.toBeNull();
    // Should show 5 tickets and $50 from May 22 (the fallback)
    expect(within(valuesRow as HTMLElement).getByText('5')).toBeVisible();
    expect(within(valuesRow as HTMLElement).getByText('$50')).toBeVisible();
  });
});
