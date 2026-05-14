import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchAttractionSalesDashboard } from '@/api/dailySalesApi';
import { SalesDashboardView } from '@/components/ems/SalesDashboardView';

interface Props {
  attractionId: number;
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
  /** Where the back control returns (e.g. daily-sales). */
  returnView?: string;
}

const ATTRACTION_CAPACITY_HINT =
  'Set sellable capacity on each engagement for this attraction to see combined capacity in the summary.';

export function AttractionSalesDashboardPage({
  attractionId,
  onNavigate,
  returnView = 'daily-sales',
}: Props) {
  const [asOf, setAsOf] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const q = useQuery({
    queryKey: ['attraction-sales-dashboard', attractionId, asOf],
    queryFn: () => fetchAttractionSalesDashboard(attractionId, asOf),
    retry: 1,
  });

  return (
    <SalesDashboardView
      asOf={asOf}
      onAsOfChange={setAsOf}
      onBack={() => onNavigate(returnView)}
      backTitle={returnView === 'attraction-tours' ? 'Back to Attraction Tours' : 'Back to Daily Sales'}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={() => void q.refetch()}
      data={q.data}
      capacityHint={ATTRACTION_CAPACITY_HINT}
    />
  );
}
