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

  it('shows informative lifetime snapshots instead of one-point charts', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: 'Lifetime' }));

    expect(screen.getAllByText('Lifetime Snapshot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tickets sold').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sales revenue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('May 1, 2026 - May 22, 2026').length).toBeGreaterThan(0);
    expect(screen.queryByText('No chart data available.')).not.toBeInTheDocument();
  });
});
