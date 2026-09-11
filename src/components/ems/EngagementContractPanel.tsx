import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from './Primitives';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { SystemLinkField } from './SystemLinkField';
import {
  fetchPerformanceContracts,
  uploadContractPdf,
  savePerformanceContract,
  updatePerformanceContract,
  deletePerformanceContract,
  type ApiPerformanceContractRow,
  type SavePerformanceContractPayload,
  type ContractFieldMetaMap,
  type ContractPerformanceItem,
} from '@/api/engagementApi';

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
  performances: ContractPerformanceItem[];
  additionallyInsured: string[];
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
    performances: [],
    additionallyInsured: [],
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
    performances: row.performances ?? [],
    additionallyInsured: row.additionallyInsured ?? [],
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
    performances: (() => {
      const rows = form.performances
        .map((p) => ({ date: p.date?.trim() || null, time: p.time?.trim() || null, formatted: p.formatted?.trim() || '' }))
        .filter((p) => p.date || p.time || p.formatted);
      return rows.length ? rows : null;
    })(),
    additionallyInsured: (() => {
      const parties = form.additionallyInsured.map((s) => s.trim()).filter(Boolean);
      return parties.length ? parties : null;
    })(),
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
  const [fieldMeta, setFieldMeta] = useState<ContractFieldMetaMap>({});

  const contractsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'contracts'],
    queryFn: () => fetchPerformanceContracts(engagementId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'contracts'] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadContractPdf(engagementId, file),
    onSuccess: (data) => {
      const { extracted, originalFilename, annotatedPdfBlobName, contractId, oneDrivePdfUrl } = data;
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
        performances: extracted.performances ?? [],
        additionallyInsured: extracted.additionallyInsured ?? [],
        oneDrivePdfUrl: oneDrivePdfUrl || extracted.oneDrivePdfUrl || '',
        originalFilename: originalFilename || '',
        annotatedPdfBlobName: annotatedPdfBlobName || '',
      });
      setFieldMeta(data.fieldMeta ?? {});
      if (contractId) {
        setEditingContractId(contractId);
      }
      invalidate();
      addToast('Contract uploaded, extracted, and saved under Existing Contracts.', 'success');
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
    setFieldMeta({});
    setEditingContractId(row.contractId);
  };

  const handleCancelEdit = () => {
    setForm(emptyForm());
    setFieldMeta({});
    setEditingContractId(null);
  };

  const set = (field: Exclude<keyof ContractFormState, 'performances' | 'additionallyInsured'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const addPerformance = () =>
    setForm((prev) => ({ ...prev, performances: [...prev.performances, { date: '', time: '', formatted: '' }] }));
  const updatePerformance = (index: number, patch: Partial<ContractPerformanceItem>) =>
    setForm((prev) => ({
      ...prev,
      performances: prev.performances.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  const removePerformance = (index: number) =>
    setForm((prev) => ({ ...prev, performances: prev.performances.filter((_, i) => i !== index) }));

  const addInsuredParty = () => setForm((prev) => ({ ...prev, additionallyInsured: [...prev.additionallyInsured, ''] }));
  const updateInsuredParty = (index: number, value: string) =>
    setForm((prev) => ({
      ...prev,
      additionallyInsured: prev.additionallyInsured.map((p, i) => (i === index ? value : p)),
    }));
  const removeInsuredParty = (index: number) =>
    setForm((prev) => ({ ...prev, additionallyInsured: prev.additionallyInsured.filter((_, i) => i !== index) }));

  const inputCls =
    'w-full rounded-md border border-border bg-elevated px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-ems-accent/50 focus:ring-2 focus:ring-ems-accent/30 disabled:opacity-60';
  const textareaCls =
    'w-full rounded-md border border-border bg-elevated px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-ems-accent/50 focus:ring-2 focus:ring-ems-accent/30 disabled:opacity-60 min-h-[64px] resize-y';
  const sectionCls = 'rounded-lg border border-border bg-card shadow-sm p-4 space-y-3';
  const labelCls = 'text-[11px] font-bold uppercase tracking-wider text-[#00856A] block';

  const contracts = contractsQuery.data ?? [];

  return (
    <div className="space-y-4 text-xs">
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
            className="h-8 px-3 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Extracting &amp; Saving…</span>
            ) : (
              <span className="inline-flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" />Upload Contract</span>
            )}
          </Button>
          <span className="text-[11px] text-text-muted">PDF or Word (.docx), max 25 MB. The contract will be stored, extracted, and autosaved automatically.</span>
        </div>
      </div>

      {/* Existing contracts list */}
      {contracts.length > 0 && (
        <div className={sectionCls}>
          <span className={labelCls}>Existing Contracts</span>
          <div className="space-y-1.5">
            {contracts.map((c) => (
              <div key={c.contractId} className="flex items-center justify-between rounded border border-border bg-background px-3 py-1.5 text-xs">
                <div className="text-text-primary flex items-center gap-2 truncate">
                  <span className="font-semibold">{c.attraction || c.venueName || `Contract #${c.contractId}`}</span>
                  {c.agency && <span className="text-text-muted text-[11px]">({c.agency})</span>}
                  {c.originalFilename && <span className="text-text-muted text-[11px] truncate">[{c.originalFilename}]</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="text-xs font-medium text-ems-accent hover:underline"
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">
          {editingContractId ? 'Edit Contract' : 'Contract Details'}
        </span>
        {editingContractId && (
          <span className="text-[11px] font-medium text-ems-accent">Editing Contract #{editingContractId}</span>
        )}
      </div>

      {/* Section: Agency, Agent & Attraction */}
      <div className={sectionCls}>
        <span className={labelCls}>Contract Details</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Talent Agency">
            <input type="text" className={inputCls} value={form.agency} onChange={set('agency')} placeholder="Agency name…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Talent Agent">
            <input type="text" className={inputCls} value={form.agent} onChange={set('agent')} placeholder="Agent name…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Attraction">
            <input type="text" className={inputCls} value={form.attraction} onChange={set('attraction')} placeholder="Artist / show name…" disabled={saveMutation.isPending} />
          </FormField>
        </div>
      </div>

      {/* Section: Venue Information */}
      <div className={sectionCls}>
        <span className={labelCls}>Venue Details</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Venue Name">
            <input type="text" className={inputCls} value={form.venueName} onChange={set('venueName')} placeholder="Venue name…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Venue Address">
            <input type="text" className={inputCls} value={form.venueAddress} onChange={set('venueAddress')} placeholder="Street address…" disabled={saveMutation.isPending} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Venue City">
            <input type="text" className={inputCls} value={form.venueCity} onChange={set('venueCity')} placeholder="City…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Venue State">
            <input type="text" className={inputCls} value={form.venueState} onChange={set('venueState')} placeholder="State / Province…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Venue Country">
            <input type="text" className={inputCls} value={form.venueCountry} onChange={set('venueCountry')} placeholder="Country…" disabled={saveMutation.isPending} />
          </FormField>
        </div>
      </div>

      {/* Section: Producer */}
      <div className={sectionCls}>
        <span className={labelCls}>Producer Details</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Producer">
            <input type="text" className={inputCls} value={form.producer} onChange={set('producer')} placeholder="Producer / Promoter…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Producer Address">
            <input type="text" className={inputCls} value={form.producerAddress} onChange={set('producerAddress')} placeholder="Producer address…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Producer Federal ID">
            <input type="text" className={inputCls} value={form.producerFedId} onChange={set('producerFedId')} placeholder="EIN / Tax ID…" disabled={saveMutation.isPending} />
          </FormField>
        </div>
      </div>

      {/* Section: Financial Terms */}
      <div className={sectionCls}>
        <span className={labelCls}>Financial Terms</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Guarantee Amount">
            <input type="number" step="0.01" className={inputCls} value={form.guaranteeAmount} onChange={set('guaranteeAmount')} placeholder="0.00" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Deposit Amount">
            <input type="number" step="0.01" className={inputCls} value={form.depositAmount} onChange={set('depositAmount')} placeholder="0.00" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Balance Amount">
            <input type="number" step="0.01" className={inputCls} value={form.balanceAmount} onChange={set('balanceAmount')} placeholder="0.00" disabled={saveMutation.isPending} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Guarantee Currency">
            <input type="text" className={inputCls} value={form.guaranteeCurrency} onChange={set('guaranteeCurrency')} placeholder="USD" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Deposit Due Date">
            <input type="date" className={inputCls} value={form.depositDueDate} onChange={set('depositDueDate')} disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Balance Due Date">
            <input type="date" className={inputCls} value={form.balanceDueDate} onChange={set('balanceDueDate')} disabled={saveMutation.isPending} />
          </FormField>
        </div>
      </div>

      {/* Section: Payment Details */}
      <div className={sectionCls}>
        <span className={labelCls}>Payment Details</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Payment Method Type">
            <input type="text" className={inputCls} value={form.paymentMethodType} onChange={set('paymentMethodType')} placeholder="Wire / Check / ACH…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Payment Payable To">
            <input type="text" className={inputCls} value={form.paymentPayableTo} onChange={set('paymentPayableTo')} placeholder="Payee name…" disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Payment Bank Name">
            <input type="text" className={inputCls} value={form.paymentBankName} onChange={set('paymentBankName')} placeholder="Bank name…" disabled={saveMutation.isPending} />
          </FormField>
        </div>
      </div>

      {/* Section: Descriptions & Terms */}
      <div className={sectionCls}>
        <span className={labelCls}>Terms &amp; Descriptions</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Royalty Description">
            <textarea className={textareaCls} value={form.royaltyDescription} onChange={set('royaltyDescription')} placeholder="Royalty / merchandise terms…" rows={2} disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Overage Description">
            <textarea className={textareaCls} value={form.overageDescription} onChange={set('overageDescription')} placeholder="Overage / bonus terms…" rows={2} disabled={saveMutation.isPending} />
          </FormField>
          <FormField label="Payment Terms">
            <textarea className={textareaCls} value={form.paymentTerms} onChange={set('paymentTerms')} placeholder="Payment terms…" rows={2} disabled={saveMutation.isPending} />
          </FormField>
        </div>
      </div>

      {/* Section: Performances & Parties */}
      <div className={sectionCls}>
        <span className={labelCls}>Performances &amp; Parties</span>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField label="Performances">
            <div className="space-y-2">
              {form.performances.map((perf, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="date"
                    className={inputCls}
                    value={perf.date ?? ''}
                    onChange={(e) => updatePerformance(i, { date: e.target.value })}
                    disabled={saveMutation.isPending}
                  />
                  <input
                    type="time"
                    className={inputCls}
                    value={perf.time ?? ''}
                    onChange={(e) => updatePerformance(i, { time: e.target.value })}
                    disabled={saveMutation.isPending}
                  />
                  <input
                    type="text"
                    className={inputCls}
                    value={perf.formatted}
                    onChange={(e) => updatePerformance(i, { formatted: e.target.value })}
                    placeholder="Date / time label…"
                    disabled={saveMutation.isPending}
                  />
                  <button
                    type="button"
                    className="shrink-0 text-text-muted hover:text-ems-coral p-1 rounded"
                    onClick={() => removePerformance(i)}
                    disabled={saveMutation.isPending}
                    title="Remove performance"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={addPerformance} disabled={saveMutation.isPending}>
                <span className="inline-flex items-center gap-1"><Plus className="h-3 w-3" />Add Performance</span>
              </Button>
            </div>
          </FormField>

          <FormField label="Additionally Insured">
            <div className="space-y-2">
              {form.additionallyInsured.map((party, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {i === 0 && party.trim() && party.trim().toLowerCase() === form.agency.trim().toLowerCase() && (
                    <span className="shrink-0 text-[10px] font-medium text-text-muted">Agency</span>
                  )}
                  <input
                    type="text"
                    className={inputCls}
                    value={party}
                    onChange={(e) => updateInsuredParty(i, e.target.value)}
                    placeholder="Additional insured party…"
                    disabled={saveMutation.isPending}
                  />
                  <button
                    type="button"
                    className="shrink-0 text-text-muted hover:text-ems-coral p-1 rounded"
                    onClick={() => removeInsuredParty(i)}
                    disabled={saveMutation.isPending}
                    title="Remove party"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={addInsuredParty} disabled={saveMutation.isPending}>
                <span className="inline-flex items-center gap-1"><Plus className="h-3 w-3" />Add Party</span>
              </Button>
            </div>
          </FormField>
        </div>
      </div>

      {/* Section: Linked File */}
      <div className={sectionCls}>
        <span className={labelCls}>Linked File</span>
        <SystemLinkField
          label="OneDrive PDF URL"
          value={form.oneDrivePdfUrl}
          onChange={(oneDrivePdfUrl) => setForm((previous) => ({ ...previous, oneDrivePdfUrl }))}
          disabled={saveMutation.isPending}
        />
        {form.originalFilename && (
          <p className="text-[11px] text-text-muted">Uploaded file: {form.originalFilename}</p>
        )}
      </div>

      {/* Actions (Shown when editing an autosaved or existing contract) */}
      {editingContractId ? (
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={handleCancelEdit} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-xs bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Updating…</span>
            ) : 'Update Contract'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
