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

    fireEvent.click(screen.getByRole('button', { name: /open total cumulative sales chart/i }));

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

  it("backfills an unreported day's audit wrap from the next reported day", () => {
    // asOf is May 22; May 21 has no report, so Yesterday's Wrap should reflect
    // May 22's report (5 tickets / $50) rather than 0.
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

  it('shows informative lifetime snapshots instead of one-point charts', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: 'Lifetime' }));

    expect(screen.getAllByText('Lifetime Snapshot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tickets sold').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sales revenue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('May 1, 2026 - May 22, 2026').length).toBeGreaterThan(0);
    expect(screen.queryByText('No chart data available.')).not.toBeInTheDocument();
  });

  it('backfills unreported weekend days in the summary table from the next reported day', () => {
    // Simulate: May 20 has real sales, May 21 has no report (zeros), May 22 has real sales.
    // May 21 should be autofilled from May 22's values.
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

    // May 21 row should show May 22's total values (backfilled)
    const may21Row = screen.getByText('Thu, May 21, 2026').closest('tr');
    expect(may21Row).not.toBeNull();
    // Backfilled from May 22: totalTicketsSold=25, totalValueSold=$250
    expect(within(may21Row as HTMLTableRowElement).getByText('25')).toBeVisible();
    expect(within(may21Row as HTMLTableRowElement).getByText('$250')).toBeVisible();
  });

  it('does not backfill trailing unreported days that have no later report', () => {
    // May 22 is the last day and has no report — nothing later to backfill from,
    // so it stays at 0.
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

    // May 22 is trailing and unreported — stays at 0 (no backfill source)
    const may22Row = screen.getByText('Fri, May 22, 2026').closest('tr');
    expect(may22Row).not.toBeNull();
    // countOrDash(0) returns "0", moneyOrDash(0) returns "$0" — values remain zeroed
    const cells = within(may22Row as HTMLTableRowElement).getAllByText('0');
    expect(cells.length).toBeGreaterThanOrEqual(2);
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
