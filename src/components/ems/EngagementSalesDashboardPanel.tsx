import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchEngagementSalesDashboard } from '@/api/dailySalesApi';
import { SalesDashboardView } from '@/components/ems/SalesDashboardView';

interface Props {
  engagementId: number;
  /**
   * When provided, the dashboard is scoped to a single performance under this engagement
   * (used when navigating from Sales Summary → one row). Omit to roll up every performance.
   */
  performanceId?: number;
  /** Initial "Reporting as of" date (YYYY-MM-DD); defaults to today. */
  initialAsOf?: string;
  backTitle?: string;
  onBack: () => void;
}

function isYmd(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function EngagementSalesDashboardPanel({
  engagementId,
  performanceId,
  initialAsOf,
  backTitle = 'Back to engagement',
  onBack,
}: Props) {
  const [asOf, setAsOf] = useState(() =>
    isYmd(initialAsOf) ? initialAsOf : format(new Date(), 'yyyy-MM-dd'),
  );

  useEffect(() => {
    if (isYmd(initialAsOf)) setAsOf(initialAsOf);
  }, [engagementId, performanceId, initialAsOf]);

  const q = useQuery({
    queryKey: ['engagement-sales-dashboard', engagementId, performanceId ?? null, asOf],
    queryFn: () => fetchEngagementSalesDashboard(engagementId, asOf, performanceId),
    retry: 1,
    refetchOnMount: 'always',
  });

  return (
    <SalesDashboardView
      asOf={asOf}
      onAsOfChange={setAsOf}
      onBack={onBack}
      backTitle={backTitle}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={() => void q.refetch()}
      data={q.data}
    />
  );
}
