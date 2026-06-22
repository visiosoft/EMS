import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  fetchVenueMarketing,
  type ApiVenueMarketingResponse,
} from '@/api/venueMarketingApi';
import {
  fetchTourMarketing,
  type ApiTourMarketingResponse,
} from '@/api/tourMarketingApi';

interface Props {
  venueCompanyId: number | null;
  tourId: number | null;
}

export function EngagementMarketingReadOnlySection({ venueCompanyId, tourId }: Props) {
  const venueMarketingQuery = useQuery({
    queryKey: ['venue-marketing', venueCompanyId],
    queryFn: () => fetchVenueMarketing(venueCompanyId!),
    enabled: venueCompanyId != null && venueCompanyId > 0,
    staleTime: 60_000,
  });

  const tourMarketingQuery = useQuery({
    queryKey: ['tour-marketing', tourId],
    queryFn: () => fetchTourMarketing(tourId!),
    enabled: tourId != null && tourId > 0,
    staleTime: 60_000,
  });

  const hasVenueData = venueCompanyId != null && venueCompanyId > 0;
  const hasTourData = tourId != null && tourId > 0;

  if (!hasVenueData && !hasTourData) return null;

  return (
    <div className="space-y-4">
      {/* ── Venue Marketing Specs (read-only) ─────────────────────────── */}
      {hasVenueData && (
        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            Venue Marketing Specs
            <span className="text-xs font-normal text-text-muted ml-2">(from Venue)</span>
          </h4>

          {venueMarketingQuery.isLoading && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Loading…
            </div>
          )}
          {venueMarketingQuery.isError && (
            <div className="text-ems-coral text-sm flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {friendlyApiError(venueMarketingQuery.error)}
            </div>
          )}
          {venueMarketingQuery.data && <VenueMarketingReadOnly data={venueMarketingQuery.data} />}
        </div>
      )}

      {/* ── Tour Ticketing Offer Codes (read-only) ────────────────────── */}
      {hasTourData && (
        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            Ticketing Offer Codes
            <span className="text-xs font-normal text-text-muted ml-2">(from Tour)</span>
          </h4>

          {tourMarketingQuery.isLoading && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Loading…
            </div>
          )}
          {tourMarketingQuery.isError && (
            <div className="text-ems-coral text-sm flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {friendlyApiError(tourMarketingQuery.error)}
            </div>
          )}
          {tourMarketingQuery.data && <TourOfferCodesReadOnly data={tourMarketingQuery.data} />}
        </div>
      )}
    </div>
  );
}

function VenueMarketingReadOnly({ data }: { data: ApiVenueMarketingResponse }) {
  if (data.specs.length === 0) {
    return <p className="text-sm text-text-muted">No venue marketing specs configured.</p>;
  }

  return (
    <div className="space-y-3">
      {data.styleGuideEnabled && data.styleGuide && (
        <div className="rounded-md border border-border bg-background p-3 space-y-1">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Style Guide</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {data.styleGuide.font && <div><span className="text-text-muted">Font:</span> {data.styleGuide.font}</div>}
            {data.styleGuide.primaryColors && <div><span className="text-text-muted">Primary:</span> {data.styleGuide.primaryColors}</div>}
            {data.styleGuide.accentColors && <div><span className="text-text-muted">Accent:</span> {data.styleGuide.accentColors}</div>}
            {data.styleGuide.logoUrl && (
              <div><span className="text-text-muted">Logo:</span>{' '}
                <a href={data.styleGuide.logoUrl} target="_blank" rel="noopener noreferrer" className="text-ems-accent hover:underline">View</a>
              </div>
            )}
          </div>
          {data.styleGuide.notes && <p className="text-xs text-text-secondary mt-1">{data.styleGuide.notes}</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="py-1.5 px-2 font-medium">File Name</th>
              <th className="py-1.5 px-2 font-medium">Placement</th>
              <th className="py-1.5 px-2 font-medium">Medium</th>
              <th className="py-1.5 px-2 font-medium">Size</th>
              <th className="py-1.5 px-2 font-medium">Format</th>
              <th className="py-1.5 px-2 font-medium">Localization</th>
              <th className="py-1.5 px-2 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {data.specs.map((spec) => (
              <tr key={spec.venueMarketingSpecsId} className="border-b border-border/50">
                <td className="py-1.5 px-2 text-text-primary">{spec.fileName || '—'}</td>
                <td className="py-1.5 px-2 text-text-primary">{spec.placementCategoryName || '—'}</td>
                <td className="py-1.5 px-2 text-text-secondary">{spec.mediumName || '—'}</td>
                <td className="py-1.5 px-2 text-text-secondary">
                  {spec.graphicSizeHorizontal != null && spec.graphicSizeVertical != null
                    ? `${spec.graphicSizeHorizontal}×${spec.graphicSizeVertical} ${spec.sizeUnit ?? ''}`
                    : '—'}
                </td>
                <td className="py-1.5 px-2 text-text-secondary">{spec.fileFormatName || '—'}</td>
                <td className="py-1.5 px-2 text-text-secondary">
                  {spec.localizations.length > 0
                    ? spec.localizations.map((l) => l.localizationName).join(', ')
                    : '—'}
                </td>
                <td className="py-1.5 px-2 text-text-secondary">
                  {spec.tags.length > 0
                    ? spec.tags.map((t) => t.tagName).join(', ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TourOfferCodesReadOnly({ data }: { data: ApiTourMarketingResponse }) {
  if (data.offerCodes.length === 0) {
    return <p className="text-sm text-text-muted">No ticketing offer codes configured for this tour.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[400px]">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            <th className="py-1.5 px-2 font-medium">Code</th>
            <th className="py-1.5 px-2 font-medium">Assigned To</th>
            <th className="py-1.5 px-2 font-medium">IAE SMS</th>
            <th className="py-1.5 px-2 font-medium">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {data.offerCodes.map((code) => (
            <tr key={code.offerCodeId} className="border-b border-border/50">
              <td className="py-1.5 px-2 text-text-primary font-mono">{code.code}</td>
              <td className="py-1.5 px-2 text-text-secondary">{code.assignedTo || '—'}</td>
              <td className="py-1.5 px-2 text-text-secondary">{code.iaeSms || '—'}</td>
              <td className="py-1.5 px-2 text-text-secondary">{code.purpose || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
