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
  showBackButton?: boolean;
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
  showBackButton = true,
}: Props) {
  const [asOf, setAsOf] = useState(() =>
    isYmd(initialAsOf) ? initialAsOf : format(new Date(), 'yyyy-MM-dd'),
  );
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonDateOne, setComparisonDateOne] = useState(() =>
    isYmd(initialAsOf) ? initialAsOf : format(new Date(), 'yyyy-MM-dd'),
  );
  const [comparisonDateTwo, setComparisonDateTwo] = useState(() =>
    format(new Date(Date.now() - 7 * 86_400_000), 'yyyy-MM-dd'),
  );

  useEffect(() => {
    if (isYmd(initialAsOf)) {
      setAsOf(initialAsOf);
      setComparisonDateOne(initialAsOf);
    }
  }, [engagementId, performanceId, initialAsOf]);

  const displayedAsOf = comparisonEnabled && isYmd(comparisonDateOne)
    ? comparisonDateOne
    : asOf;

  const q = useQuery({
    queryKey: ['engagement-sales-dashboard', engagementId, performanceId ?? null, displayedAsOf],
    queryFn: () => fetchEngagementSalesDashboard(engagementId, displayedAsOf, performanceId),
    retry: 1,
    refetchOnMount: 'always',
  });
  const comparisonQuery = useQuery({
    queryKey: ['engagement-sales-dashboard-comparison', engagementId, performanceId ?? null, comparisonDateTwo],
    queryFn: () => fetchEngagementSalesDashboard(engagementId, comparisonDateTwo, performanceId),
    enabled: comparisonEnabled && isYmd(comparisonDateTwo),
    retry: 1,
  });

  return (
    <SalesDashboardView
      asOf={asOf}
      onAsOfChange={setAsOf}
      comparisonEnabled={comparisonEnabled}
      onComparisonEnabledChange={setComparisonEnabled}
      comparisonDateOne={comparisonDateOne}
      onComparisonDateOneChange={setComparisonDateOne}
      comparisonDateTwo={comparisonDateTwo}
      onComparisonDateTwoChange={setComparisonDateTwo}
      comparisonData={comparisonQuery.data}
      comparisonLoading={comparisonQuery.isFetching}
      onBack={onBack}
      backTitle={backTitle}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={() => void q.refetch()}
      data={q.data}
      showBackButton={showBackButton}
    />
  );
}
