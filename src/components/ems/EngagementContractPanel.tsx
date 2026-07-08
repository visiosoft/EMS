import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from './Primitives';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  fetchPerformanceContracts,
  uploadContractPdf,
  savePerformanceContract,
  updatePerformanceContract,
  deletePerformanceContract,
  type ApiPerformanceContractRow,
  type SavePerformanceContractPayload,
  type ContractFieldMeta,
  type ContractFieldMetaMap,
} from '@/api/engagementApi';

/**
 * Small confidence badge shown next to a field's label after AI extraction.
 * Green = high (trust), amber = review (eyeball it), blue = derived (computed).
 * The native tooltip carries the source snippet so a reviewer can verify at a glance.
 */
function ConfidenceBadge({ meta }: { meta?: ContractFieldMeta }) {
  if (!meta || meta.status === 'not_found') return null;
  const styles: Record<'high' | 'review' | 'derived', { cls: string; label: string }> = {
    high: { cls: 'bg-ems-green-dim text-ems-green', label: 'High' },
    review: { cls: 'bg-ems-amber-dim text-ems-amber', label: 'Review' },
    derived: { cls: 'bg-ems-blue-dim text-ems-blue', label: 'Derived' },
  };
  const s = styles[meta.status];
  if (!s) return null;
  const pct = Math.round((meta.confidence ?? 0) * 100);
  const title = [
    meta.status === 'derived' ? 'Computed from other fields' : `${s.label} confidence · ${pct}%`,
    meta.sourceQuote ? `Source: "${meta.sourceQuote}"${meta.sourcePage ? ` (p.${meta.sourcePage})` : ''}` : null,
    meta.verified ? 'Source verified in document' : null,
  ]
    .filter(Boolean)
    .join('\n');
  return (
    <span title={title} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {meta.status === 'derived' ? 'Derived' : `${s.label} ${pct}%`}
    </span>
  );
}

interface ContractFormState {
  agency: string;
  agent: string;
  attraction: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venueCountry: string;
  producer: string;
  producerAddress: string;
  producerFedId: string;
  guaranteeAmount: string;
  guaranteeCurrency: string;
  depositAmount: string;
  depositDueDate: string;
  balanceAmount: string;
  balanceDueDate: string;
  royaltyDescription: string;
  overageDescription: string;
  paymentTerms: string;
  paymentMethodType: string;
  paymentPayableTo: string;
  paymentBankName: string;
  performances: string;
  additionallyInsured: string;
  oneDrivePdfUrl: string;
  originalFilename: string;
  annotatedPdfBlobName: string;
}

function emptyForm(): ContractFormState {
  return {
    agency: '',
    agent: '',
    attraction: '',
    venueName: '',
    venueAddress: '',
    venueCity: '',
    venueState: '',
    venueCountry: '',
    producer: '',
    producerAddress: '',
    producerFedId: '',
    guaranteeAmount: '',
    guaranteeCurrency: '',
    depositAmount: '',
    depositDueDate: '',
    balanceAmount: '',
    balanceDueDate: '',
    royaltyDescription: '',
    overageDescription: '',
    paymentTerms: '',
    paymentMethodType: '',
    paymentPayableTo: '',
    paymentBankName: '',
    performances: '',
    additionallyInsured: '',
    oneDrivePdfUrl: '',
    originalFilename: '',
    annotatedPdfBlobName: '',
  };
}

function contractRowToForm(row: ApiPerformanceContractRow): ContractFormState {
  return {
    agency: row.agency ?? '',
    agent: row.agent ?? '',
    attraction: row.attraction ?? '',
    venueName: row.venueName ?? '',
    venueAddress: row.venueAddress ?? '',
    venueCity: row.venueCity ?? '',
    venueState: row.venueState ?? '',
    venueCountry: row.venueCountry ?? '',
    producer: row.producer ?? '',
    producerAddress: row.producerAddress ?? '',
    producerFedId: row.producerFedId ?? '',
    guaranteeAmount: row.guaranteeAmount != null ? String(row.guaranteeAmount) : '',
    guaranteeCurrency: row.guaranteeCurrency ?? '',
    depositAmount: row.depositAmount != null ? String(row.depositAmount) : '',
    depositDueDate: row.depositDueDate ?? '',
    balanceAmount: row.balanceAmount != null ? String(row.balanceAmount) : '',
    balanceDueDate: row.balanceDueDate ?? '',
    royaltyDescription: row.royaltyDescription ?? '',
    overageDescription: row.overageDescription ?? '',
    paymentTerms: row.paymentTerms ?? '',
    paymentMethodType: row.paymentMethodType ?? '',
    paymentPayableTo: row.paymentPayableTo ?? '',
    paymentBankName: row.paymentBankName ?? '',
    performances: row.performances ?? '',
    additionallyInsured: row.additionallyInsured ?? '',
    oneDrivePdfUrl: row.oneDrivePdfUrl ?? '',
    originalFilename: row.originalFilename ?? '',
    annotatedPdfBlobName: row.annotatedPdfBlobName ?? '',
  };
}

function formToPayload(form: ContractFormState): SavePerformanceContractPayload {
  const trimOrNull = (v: string) => v.trim() || null;
  const numOrNull = (v: string) => {
    const n = Number(v);
    return v.trim() && Number.isFinite(n) ? n : null;
  };
  return {
    agency: trimOrNull(form.agency),
    agent: trimOrNull(form.agent),
    attraction: trimOrNull(form.attraction),
    venueName: trimOrNull(form.venueName),
    venueAddress: trimOrNull(form.venueAddress),
    venueCity: trimOrNull(form.venueCity),
    venueState: trimOrNull(form.venueState),
    venueCountry: trimOrNull(form.venueCountry),
    producer: trimOrNull(form.producer),
    producerAddress: trimOrNull(form.producerAddress),
    producerFedId: trimOrNull(form.producerFedId),
    guaranteeAmount: numOrNull(form.guaranteeAmount),
    guaranteeCurrency: trimOrNull(form.guaranteeCurrency),
    depositAmount: numOrNull(form.depositAmount),
    depositDueDate: trimOrNull(form.depositDueDate),
    balanceAmount: numOrNull(form.balanceAmount),
    balanceDueDate: trimOrNull(form.balanceDueDate),
    royaltyDescription: trimOrNull(form.royaltyDescription),
    overageDescription: trimOrNull(form.overageDescription),
    paymentTerms: trimOrNull(form.paymentTerms),
    paymentMethodType: trimOrNull(form.paymentMethodType),
    paymentPayableTo: trimOrNull(form.paymentPayableTo),
    paymentBankName: trimOrNull(form.paymentBankName),
    performances: trimOrNull(form.performances),
    additionallyInsured: trimOrNull(form.additionallyInsured),
    oneDrivePdfUrl: trimOrNull(form.oneDrivePdfUrl),
    originalFilename: trimOrNull(form.originalFilename),
    annotatedPdfBlobName: trimOrNull(form.annotatedPdfBlobName),
  };
}

export function EngagementContractPanel({
  engagementId,
  addToast,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ContractFormState>(emptyForm());
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  // Per-field extraction confidence/source; populated on upload, cleared once the row is saved or edited.
  const [fieldMeta, setFieldMeta] = useState<ContractFieldMetaMap>({});

  const contractsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'contracts'],
    queryFn: () => fetchPerformanceContracts(engagementId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'contracts'] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadContractPdf(engagementId, file),
    onSuccess: (data) => {
      const { extracted, originalFilename, annotatedPdfBlobName } = data;
      setForm({
        agency: extracted.agency ?? '',
        agent: extracted.agent ?? '',
        attraction: extracted.attraction ?? '',
        venueName: extracted.venueName ?? '',
        venueAddress: extracted.venueAddress ?? '',
        venueCity: extracted.venueCity ?? '',
        venueState: extracted.venueState ?? '',
        venueCountry: extracted.venueCountry ?? '',
        producer: extracted.producer ?? '',
        producerAddress: extracted.producerAddress ?? '',
        producerFedId: extracted.producerFedId ?? '',
        guaranteeAmount: extracted.guaranteeAmount != null ? String(extracted.guaranteeAmount) : '',
        guaranteeCurrency: extracted.guaranteeCurrency ?? '',
        depositAmount: extracted.depositAmount != null ? String(extracted.depositAmount) : '',
        depositDueDate: extracted.depositDueDate ?? '',
        balanceAmount: extracted.balanceAmount != null ? String(extracted.balanceAmount) : '',
        balanceDueDate: extracted.balanceDueDate ?? '',
        royaltyDescription: extracted.royaltyDescription ?? '',
        overageDescription: extracted.overageDescription ?? '',
        paymentTerms: extracted.paymentTerms ?? '',
        paymentMethodType: extracted.paymentMethodType ?? '',
        paymentPayableTo: extracted.paymentPayableTo ?? '',
        paymentBankName: extracted.paymentBankName ?? '',
        performances: extracted.performances ?? '',
        additionallyInsured: extracted.additionallyInsured ?? '',
        oneDrivePdfUrl: extracted.oneDrivePdfUrl ?? '',
        originalFilename,
        annotatedPdfBlobName,
      });
      setFieldMeta(data.fieldMeta ?? {});
      setEditingContractId(null);
      addToast('Contract data extracted. Review and save below.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not upload contract.'), 'error'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (editingContractId) {
        await updatePerformanceContract(engagementId, editingContractId, payload);
      } else {
        await savePerformanceContract(engagementId, payload);
      }
    },
    onSuccess: () => {
      invalidate();
      addToast('Contract saved.', 'success');
      setForm(emptyForm());
      setFieldMeta({});
      setEditingContractId(null);
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not save contract.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (contractId: number) => deletePerformanceContract(engagementId, contractId),
    onSuccess: () => {
      invalidate();
      addToast('Contract deleted.', 'warning');
      if (editingContractId) {
        setForm(emptyForm());
        setFieldMeta({});
        setEditingContractId(null);
      }
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not delete contract.'), 'error'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = '';
    }
  };

  const handleEdit = (row: ApiPerformanceContractRow) => {
    setForm(contractRowToForm(row));
    setFieldMeta({}); // saved contracts carry no extraction metadata
    setEditingContractId(row.contractId);
  };

  const handleCancelEdit = () => {
    setForm(emptyForm());
    setFieldMeta({});
    setEditingContractId(null);
  };

  const set = (field: keyof ContractFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /** Badge for a given extracted field (null when no metadata, e.g. editing a saved contract). */
  const badgeFor = (field: keyof ContractFormState) => <ConfidenceBadge meta={fieldMeta[field]} />;

  // Count of fields still flagged for review, shown as a summary hint after extraction.
  const reviewCount = Object.values(fieldMeta).filter((m) => m && m.status === 'review').length;

  const inputCls =
    'w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50 disabled:opacity-60';
  const textareaCls = inputCls + ' min-h-[80px] resize-y';
  const sectionCls = 'rounded-md border border-border bg-surface/40 p-4 space-y-4';
  const labelCls = 'text-xs font-semibold text-text-primary mb-3 block';

  const contracts = contractsQuery.data ?? [];

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-5">
      {/* Upload section */}
      <div className={sectionCls}>
        <span className={labelCls}>Upload Contract</span>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Extracting…</span>
            ) : (
              <span className="inline-flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" />Upload Contract</span>
            )}
          </Button>
          <span className="text-xs text-text-muted">PDF or Word (.docx), max 25 MB. Contract data will be extracted automatically.</span>
        </div>
      </div>

      {/* Existing contracts list */}
      {contracts.length > 0 && (
        <div className={sectionCls}>
          <span className={labelCls}>Existing Contracts</span>
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.contractId} className="flex items-center justify-between rounded border border-border bg-background px-3 py-2">
                <div className="text-sm text-text-primary">
                  <span className="font-medium">{c.attraction || c.venueName || `Contract #${c.contractId}`}</span>
                  {c.originalFilename && <span className="text-text-muted ml-2 text-xs">({c.originalFilename})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-ems-accent hover:underline"
                    onClick={() => handleEdit(c)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-ems-coral hover:text-ems-coral/70 p-1 rounded"
                    onClick={() => deleteMutation.mutate(c.contractId)}
                    disabled={deleteMutation.isPending}
                    title="Delete contract"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract form */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-text-primary">
            {editingContractId ? 'Edit Contract' : 'Contract Details'}
          </span>
          {reviewCount > 0 && (
            <span className="text-[11px] text-ems-amber" title="Fields the AI is unsure about — verify against the PDF before saving.">
              {reviewCount} field{reviewCount === 1 ? '' : 's'} to review
            </span>
          )}
        </div>

        {/* Talent Agency & Agent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Talent Agency" badge={badgeFor('agency')}>
            <input type="text" className={inputCls} value={form.agency} onChange={set('agency')} placeholder="Agency name…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Talent Agent" badge={badgeFor('agent')}>
            <input type="text" className={inputCls} value={form.agent} onChange={set('agent')} placeholder="Agent name…" disabled={saveMutation.isPending} />
          </FormField>
        </div>

        {/* Attraction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Attraction" badge={badgeFor('attraction')}>
            <input type="text" className={inputCls} value={form.attraction} onChange={set('attraction')} placeholder="Artist / show name…" disabled={saveMutation.isPending} />
          </FormField>
        </div>

        {/* Venue info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Venue Name" badge={badgeFor('venueName')}>
            <input type="text" className={inputCls} value={form.venueName} onChange={set('venueName')} placeholder="Venue name…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Venue Address" badge={badgeFor('venueAddress')}>
            <input type="text" className={inputCls} value={form.venueAddress} onChange={set('venueAddress')} placeholder="Street address…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Venue City" badge={badgeFor('venueCity')}>
            <input type="text" className={inputCls} value={form.venueCity} onChange={set('venueCity')} placeholder="City…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Venue State" badge={badgeFor('venueState')}>
            <input type="text" className={inputCls} value={form.venueState} onChange={set('venueState')} placeholder="State / Province…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Venue Country" badge={badgeFor('venueCountry')}>
            <input type="text" className={inputCls} value={form.venueCountry} onChange={set('venueCountry')} placeholder="Country…" disabled={saveMutation.isPending} />
          </FormField>
        </div>

        {/* Producer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Producer" badge={badgeFor('producer')}>
            <input type="text" className={inputCls} value={form.producer} onChange={set('producer')} placeholder="Producer / Promoter…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Producer Address" badge={badgeFor('producerAddress')}>
            <input type="text" className={inputCls} value={form.producerAddress} onChange={set('producerAddress')} placeholder="Producer address…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Producer Federal ID" badge={badgeFor('producerFedId')}>
            <input type="text" className={inputCls} value={form.producerFedId} onChange={set('producerFedId')} placeholder="EIN / Tax ID…" disabled={saveMutation.isPending} />
          </FormField>
        </div>

        {/* Financial */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Guarantee Amount" badge={badgeFor('guaranteeAmount')}>
            <input type="number" step="0.01" className={inputCls} value={form.guaranteeAmount} onChange={set('guaranteeAmount')} placeholder="0.00" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Guarantee Currency" badge={badgeFor('guaranteeCurrency')}>
            <input type="text" className={inputCls} value={form.guaranteeCurrency} onChange={set('guaranteeCurrency')} placeholder="USD" disabled={saveMutation.isPending} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Deposit Amount" badge={badgeFor('depositAmount')}>
            <input type="number" step="0.01" className={inputCls} value={form.depositAmount} onChange={set('depositAmount')} placeholder="0.00" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Deposit Due Date" badge={badgeFor('depositDueDate')}>
            <input type="date" className={inputCls} value={form.depositDueDate} onChange={set('depositDueDate')} disabled={saveMutation.isPending} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Balance Amount" badge={badgeFor('balanceAmount')}>
            <input type="number" step="0.01" className={inputCls} value={form.balanceAmount} onChange={set('balanceAmount')} placeholder="0.00" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Balance Due Date" badge={badgeFor('balanceDueDate')}>
            <input type="date" className={inputCls} value={form.balanceDueDate} onChange={set('balanceDueDate')} disabled={saveMutation.isPending} />
          </FormField>
        </div>

        {/* Long text fields */}
        <FormField label="Royalty Description" badge={badgeFor('royaltyDescription')}>
          <textarea className={textareaCls} value={form.royaltyDescription} onChange={set('royaltyDescription')} placeholder="Royalty / merchandise terms…" disabled={saveMutation.isPending} />
        </FormField>
        <FormField label="Overage Description" badge={badgeFor('overageDescription')}>
          <textarea className={textareaCls} value={form.overageDescription} onChange={set('overageDescription')} placeholder="Overage / bonus terms…" disabled={saveMutation.isPending} />
        </FormField>
        <FormField label="Payment Terms" badge={badgeFor('paymentTerms')}>
          <textarea className={textareaCls} value={form.paymentTerms} onChange={set('paymentTerms')} placeholder="Payment terms…" disabled={saveMutation.isPending} />
        </FormField>

        {/* Payment method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Payment Method Type" badge={badgeFor('paymentMethodType')}>
            <input type="text" className={inputCls} value={form.paymentMethodType} onChange={set('paymentMethodType')} placeholder="Wire / Check / ACH…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Payment Payable To" badge={badgeFor('paymentPayableTo')}>
            <input type="text" className={inputCls} value={form.paymentPayableTo} onChange={set('paymentPayableTo')} placeholder="Payee name…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Payment Bank Name" badge={badgeFor('paymentBankName')}>
            <input type="text" className={inputCls} value={form.paymentBankName} onChange={set('paymentBankName')} placeholder="Bank name…" disabled={saveMutation.isPending} />
          </FormField>
        </div>

        {/* Performances & Insurance */}
        <FormField label="Performances" badge={badgeFor('performances')}>
          <textarea className={textareaCls} value={form.performances} onChange={set('performances')} placeholder="Performance dates, times, details…" disabled={saveMutation.isPending} />
        </FormField>
        <FormField label="Additionally Insured" badge={badgeFor('additionallyInsured')}>
          <textarea className={textareaCls} value={form.additionallyInsured} onChange={set('additionallyInsured')} placeholder="Additional insured parties…" disabled={saveMutation.isPending} />
        </FormField>

        {/* OneDrive PDF URL */}
        <FormField label="OneDrive PDF URL">
          <div className="flex items-center gap-2">
            <input type="text" className={inputCls} value={form.oneDrivePdfUrl} onChange={set('oneDrivePdfUrl')} placeholder="https://…" disabled={saveMutation.isPending} />
            {form.oneDrivePdfUrl && (
              <a href={form.oneDrivePdfUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </FormField>

        {/* File metadata (read-only info) */}
        {form.originalFilename && (
          <p className="text-xs text-text-muted">Uploaded file: {form.originalFilename}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          {editingContractId && (
            <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit} disabled={saveMutation.isPending}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
            ) : editingContractId ? 'Update Contract' : 'Save Contract'}
          </Button>
        </div>
      </div>
    </div>
  );
}
