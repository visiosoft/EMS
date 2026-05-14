import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchEngagementSalesDashboard } from '@/api/dailySalesApi';
import { SalesDashboardView } from '@/components/ems/SalesDashboardView';

interface Props {
  engagementId: number;
  onBack: () => void;
}

export function EngagementSalesDashboardPanel({ engagementId, onBack }: Props) {
  const [asOf, setAsOf] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const q = useQuery({
    queryKey: ['engagement-sales-dashboard', engagementId, asOf],
    queryFn: () => fetchEngagementSalesDashboard(engagementId, asOf),
    retry: 1,
  });

  return (
    <SalesDashboardView
      asOf={asOf}
      onAsOfChange={setAsOf}
      onBack={onBack}
      backTitle="Back to engagement"
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={() => void q.refetch()}
      data={q.data}
    />
  );
}
