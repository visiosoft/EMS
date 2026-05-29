import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Search, X } from 'lucide-react';
import {
  createManagedContact,
  deleteManagedContact,
  fetchCompaniesPickerRows,
  fetchLookups,
  fetchManagedContacts,
  managedContactsQueryKey,
  updateManagedContact,
  type ApiCompanyListRow,
  type ApiManagedContact,
  type ManagedContactPayload,
} from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { PAGE_SIZE, getPageParams, getTotalPages, type PageSizeOption } from '@/lib/serverPagination';
import { Modal, FormField, ActionMenu } from './Primitives';
import { PageSizeSelect } from './PageSizeSelect';
import { Select2, Select2Multi } from './Select2';
import { ContactPhoneRow } from './ContactPhoneRow';
import { DEFAULT_PHONE_COUNTRY } from '@/lib/contactPhoneOptions';
import {
  type PhoneCountrySelection,
  parsePhoneFieldValue,
  tryE164FromDisplay,
} from '@/lib/contactPhoneField';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type ToastFn = (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  workPhoneCountry: PhoneCountrySelection;
  workPhoneDisplay: string;
  cellPhoneCountry: PhoneCountrySelection;
  cellPhoneDisplay: string;
  companyId: string;
  roleIds: string[];
  departmentIds: string[];
};

function makeDraftFromRow(row?: ApiManagedContact): ContactDraft {
  if (!row) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      workPhoneCountry: DEFAULT_PHONE_COUNTRY,
      workPhoneDisplay: '',
      cellPhoneCountry: DEFAULT_PHONE_COUNTRY,
      cellPhoneDisplay: '',
      companyId: '',
      roleIds: [],
      departmentIds: [],
    };
  }
  const wp = parsePhoneFieldValue(row.workPhone, DEFAULT_PHONE_COUNTRY);
  const cp = parsePhoneFieldValue(row.cellPhone, DEFAULT_PHONE_COUNTRY);
  return {
    firstName: row.firstName ?? '',
    lastName: row.lastName ?? '',
    email: row.email ?? '',
    workPhoneCountry: wp.country,
    workPhoneDisplay: wp.display,
    cellPhoneCountry: cp.country,
    cellPhoneDisplay: cp.display,
    companyId: row.companyIds[0] ? String(row.companyIds[0]) : '',
    roleIds: row.roleIds.map(String),
    departmentIds: row.departmentIds.map(String),
  };
}

function contactName(row: ApiManagedContact) {
  return `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || row.email || `Contact #${row.contactId}`;
}

function chip(label: string) {
  return (
    <span
      key={label}
      className="inline-flex max-w-full items-center rounded-md border border-border bg-elevated px-2 py-0.5 text-[11px] text-text-secondary"
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

/* ── Contact Add/Edit Modal ──────────────────────────────────────────── */

function ContactModal({
  row,
  companies,
  roles,
  departments,
  saving,
  onClose,
  onSave,
}: {
  row: ApiManagedContact | null;
  companies: ApiCompanyListRow[];
  roles: { roleId: number; roleName: string }[];
  departments: { departmentId: number; departmentName: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: ManagedContactPayload) => void;
}) {
  const [draft, setDraft] = useState<ContactDraft>(() => makeDraftFromRow(row ?? undefined));
  const [error, setError] = useState<string | null>(null);
  const hasCompany = Boolean(draft.companyId);
  const companyOptions = useMemo(
    () => [
      { value: '', label: 'Internal IAE staff' },
      ...companies
        .map((company) => ({ value: String(company.companyId), label: company.companyName }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    ],
    [companies],
  );
  const roleOptions = roles.map((role) => ({ value: String(role.roleId), label: role.roleName }));
  const departmentOptions = departments.map((department) => ({
    value: String(department.departmentId),
    label: department.departmentName,
  }));
  const inputCls =
    'w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-sm outline-none transition focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/30';

  const save = () => {
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const email = draft.email.trim();
    if (!firstName || !lastName || !email) {
      setError('First name, last name, and email are required.');
      return;
    }
    const roleIds = draft.roleIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    const departmentIds = draft.departmentIds
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    if (hasCompany && (roleIds.length === 0 || departmentIds.length === 0)) {
      setError('Company contacts need at least one role and one department.');
      return;
    }
    setError(null);

    const workPhone = tryE164FromDisplay(draft.workPhoneDisplay, draft.workPhoneCountry) || null;
    const cellPhone = tryE164FromDisplay(draft.cellPhoneDisplay, draft.cellPhoneCountry) || null;

    onSave({
      firstName,
      lastName,
      email,
      workPhone,
      cellPhone,
      companyId: hasCompany ? Number(draft.companyId) : null,
      roleIds: hasCompany ? roleIds : [],
      departmentIds: hasCompany ? departmentIds : [],
    });
  };

  return (
    <Modal
      title={row ? 'Edit Contact' : 'Add Contact'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-4 py-1.5 text-sm text-text-secondary hover:bg-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex min-w-24 items-center justify-center gap-2 rounded-md bg-ems-accent px-4 py-1.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {row ? 'Save Changes' : 'Create Contact'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-ems-accent/30 bg-ems-accent-dim px-3 py-2 text-xs text-text-secondary">
          Pick a company for an external company contact. Leave it as internal staff for an IAE staff contact.
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="First Name" required>
            <input className={inputCls} value={draft.firstName} maxLength={100} onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))} />
          </FormField>
          <FormField label="Last Name" required>
            <input className={inputCls} value={draft.lastName} maxLength={100} onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))} />
          </FormField>
          <FormField label="Email" required>
            <input className={inputCls} value={draft.email} maxLength={254} type="email" onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
          </FormField>
          <FormField label="Company">
            <Select2
              options={companyOptions}
              value={draft.companyId}
              onChange={(companyId) =>
                setDraft((d) => ({
                  ...d,
                  companyId,
                  roleIds: companyId ? d.roleIds : [],
                  departmentIds: companyId ? d.departmentIds : [],
                }))
              }
              placeholder="Internal IAE staff"
              allowClear
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ContactPhoneRow
            label="Work Phone"
            country={draft.workPhoneCountry}
            display={draft.workPhoneDisplay}
            onCountry={(c) => setDraft((d) => ({ ...d, workPhoneCountry: c }))}
            onDisplay={(v) => setDraft((d) => ({ ...d, workPhoneDisplay: v }))}
          />
          <ContactPhoneRow
            label="Cell Phone"
            country={draft.cellPhoneCountry}
            display={draft.cellPhoneDisplay}
            onCountry={(c) => setDraft((d) => ({ ...d, cellPhoneCountry: c }))}
            onDisplay={(v) => setDraft((d) => ({ ...d, cellPhoneDisplay: v }))}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="Roles" required={hasCompany}>
            <Select2Multi
              options={roleOptions}
              values={draft.roleIds}
              onChange={(roleIds) => setDraft((d) => ({ ...d, roleIds }))}
              placeholder={hasCompany ? 'Select one or more roles…' : 'Only used for company contacts'}
              disabled={!hasCompany}
            />
          </FormField>
          <FormField label="Departments" required={hasCompany}>
            <Select2Multi
              options={departmentOptions}
              values={draft.departmentIds}
              onChange={(departmentIds) => setDraft((d) => ({ ...d, departmentIds }))}
              placeholder={hasCompany ? 'Select one or more departments…' : 'Only used for company contacts'}
              disabled={!hasCompany}
            />
          </FormField>
        </div>
        {error && <p className="text-xs text-ems-coral">{error}</p>}
      </div>
    </Modal>
  );
}

/* ── Search Suggestions Dropdown ─────────────────────────────────────── */

function SearchSuggestions({
  query,
  companies,
  onSelect,
}: {
  query: string;
  companies: ApiCompanyListRow[];
  onSelect: (companyName: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (q.length < 2) return [];
    return companies
      .filter((c) => c.companyName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [q, companies]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[280px] overflow-y-auto rounded-md border border-border bg-elevated shadow-xl">
      {suggestions.map((c) => (
        <button
          key={c.companyId}
          type="button"
          onClick={() => onSelect(c.companyName)}
          className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-hover transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-text-primary truncate">{c.companyName}</div>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              {c.companyTypeName && (
                <span className="inline-flex items-center rounded bg-ems-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-ems-accent">
                  {c.companyTypeName}
                </span>
              )}
              {(c.physicalCity || c.physicalStateProvince) && (
                <span>{[c.physicalCity, c.physicalStateProvince].filter(Boolean).join(', ')}</span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Main Contacts Page ──────────────────────────────────────────────── */

export function ContactsPage({ addToast }: { addToast: ToastFn }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ApiManagedContact | null | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<ApiManagedContact | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const { offset, limit } = getPageParams(page, pageSize);

  const lookupsQuery = useQuery({
    queryKey: ['contacts-page-lookups'],
    queryFn: async () => {
      const [companies, lookups] = await Promise.all([
        fetchCompaniesPickerRows(),
        fetchLookups(),
      ]);
      return { companies, roles: lookups.roles, departments: lookups.departments };
    },
    staleTime: 10 * 60 * 1000,
  });
  const rowsQuery = useQuery({
    queryKey: managedContactsQueryKey(offset, limit, {
      q: committedSearch,
      companyId: companyId ? Number(companyId) : undefined,
    }),
    queryFn: () =>
      fetchManagedContacts(offset, limit, {
        q: committedSearch,
        companyId: companyId ? Number(companyId) : undefined,
      }),
  });
  const rows = rowsQuery.data?.data ?? [];
  const total = rowsQuery.data?.total ?? 0;
  const totalPages = getTotalPages(total, pageSize);
  const companies = lookupsQuery.data?.companies ?? [];

  // Build a lookup map for company details
  const companyById = useMemo(() => {
    const map = new Map<number, ApiCompanyListRow>();
    for (const c of companies) map.set(c.companyId, c);
    return map;
  }, [companies]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveMutation = useMutation({
    mutationFn: (payload: { row?: ApiManagedContact | null; body: ManagedContactPayload }) =>
      payload.row
        ? updateManagedContact(payload.row.contactId, payload.body)
        : createManagedContact(payload.body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contacts', 'managed'] });
      await qc.invalidateQueries({ queryKey: ['companies'] });
      setEditing(undefined);
      addToast('Contact saved.', 'success');
    },
    onError: (error) => addToast(friendlyApiError(error, 'Could not save contact.'), 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (row: ApiManagedContact) => deleteManagedContact(row.contactId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contacts', 'managed'] });
      setPendingDelete(null);
      addToast('Contact deleted.', 'success');
    },
    onError: (error) => addToast(friendlyApiError(error, 'Could not delete contact.'), 'error'),
  });

  const companyOptions = [
    { value: '', label: 'All contacts' },
    ...companies.map((company) => ({ value: String(company.companyId), label: company.companyName })),
  ];
  const reset = () => {
    setSearch('');
    setCommittedSearch('');
    setCompanyId('');
    setPage(1);
  };

  const commitSearch = useCallback(() => {
    setCommittedSearch(search.trim());
    setPage(1);
    setShowSuggestions(false);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-text-primary">
          Contacts
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-medium text-text-muted">{total}</span>
        </h1>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-2 rounded-md bg-ems-accent px-4 py-2 text-sm font-medium text-background shadow-sm hover:bg-ems-accent/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Contact
        </button>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {/* Search with suggestions */}
        <div ref={searchWrapRef} className="relative min-w-0 lg:w-[24rem]">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(e.target.value.trim().length >= 2);
            }}
            onFocus={() => {
              if (search.trim().length >= 2) setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch();
            }}
            placeholder="Search contacts, email, or company..."
            className="w-full rounded-md border border-border bg-surface py-2 pl-3 pr-16 text-sm text-text-primary shadow-sm outline-none focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/30"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); setCommittedSearch(''); setPage(1); setShowSuggestions(false); }} className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:bg-hover">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={commitSearch} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:bg-hover">
            <Search className="h-4 w-4" />
          </button>
          {showSuggestions && (
            <SearchSuggestions
              query={search}
              companies={companies}
              onSelect={(name) => {
                setSearch(name);
                setCommittedSearch(name);
                setPage(1);
                setShowSuggestions(false);
              }}
            />
          )}
        </div>
        <div className="min-w-0 lg:w-[22rem]">
          <Select2
            options={companyOptions}
            value={companyId}
            onChange={(value) => {
              setCompanyId(value);
              setPage(1);
            }}
            placeholder={lookupsQuery.isLoading ? 'Loading companies…' : 'All contacts'}
            disabled={lookupsQuery.isLoading}
            allowClear
          />
        </div>
        {(committedSearch || companyId) && (
          <button type="button" onClick={reset} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary shadow-sm hover:bg-hover">
            Reset
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Departments</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2 text-right w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rowsQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-text-muted">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading contacts…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-text-muted">
                  No contacts found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                // Resolve company details for richer display
                const companyDetails = row.companyIds.length > 0 ? companyById.get(row.companyIds[0]) : null;
                return (
                  <tr key={row.contactId} className="border-t border-border hover:bg-hover/40">
                    <td className="px-3 py-2 font-medium text-text-primary">{contactName(row)}</td>
                    <td className="px-3 py-2 text-text-secondary">
                      {row.companyNames.length > 0 ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-text-primary text-xs">{row.companyNames[0]}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            {companyDetails?.companyTypeName && (
                              <span className="inline-flex items-center rounded bg-ems-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-ems-accent">
                                {companyDetails.companyTypeName}
                              </span>
                            )}
                            {companyDetails && (companyDetails.physicalCity || companyDetails.physicalStateProvince) && (
                              <span>{[companyDetails.physicalCity, companyDetails.physicalStateProvince].filter(Boolean).join(', ')}</span>
                            )}
                          </div>
                          {row.companyNames.length > 1 && (
                            <div className="text-[10px] text-text-muted">+{row.companyNames.length - 1} more</div>
                          )}
                        </div>
                      ) : (
                        chip('Internal IAE staff')
                      )}
                    </td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1.5">{row.roleNames.length ? row.roleNames.map(chip) : '—'}</div></td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1.5">{row.departmentNames.length ? row.departmentNames.map(chip) : '—'}</div></td>
                    <td className="px-3 py-2 text-text-secondary">{row.email}</td>
                    <td className="px-3 py-2">
                      <ActionMenu
                        items={[
                          { label: 'Edit', onClick: () => setEditing(row) },
                          { label: 'Delete', onClick: () => setPendingDelete(row), danger: true },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
        <span>Showing {total === 0 ? 0 : offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
        <div className="flex items-center gap-2">
          <PageSizeSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50">Previous</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50">Next</button>
        </div>
      </div>

      {editing !== undefined && (
        <ContactModal
          row={editing}
          companies={companies}
          roles={lookupsQuery.data?.roles ?? []}
          departments={lookupsQuery.data?.departments ?? []}
          saving={saveMutation.isPending}
          onClose={() => setEditing(undefined)}
          onSave={(body) => saveMutation.mutate({ row: editing, body })}
        />
      )}

      {/* Delete confirmation dialog — styled to match Companies page */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && !deleteMutation.isPending && setPendingDelete(null)}>
        <AlertDialogContent className="z-[360] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              {pendingDelete
                ? <>This will permanently remove <strong>{contactName(pendingDelete)}</strong> from contacts. This action cannot be undone.</>
                : 'This contact will be removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || !pendingDelete}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Deleting…
                </>
              ) : (
                'Yes, delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
