import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Building2, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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
import { Avatar, Modal, Drawer, FormField } from './Primitives';
import { PageSizeSelect } from './PageSizeSelect';
import { Select2, Select2Multi } from './Select2';
import { ContactPhoneRow } from './ContactPhoneRow';
import { companyToSelect2Options } from './companySelectOptions';
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

function normalizeDraftForCompare(draft: ContactDraft) {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    workPhoneCountry: draft.workPhoneCountry.dialCode,
    workPhoneDisplay: draft.workPhoneDisplay.trim(),
    cellPhoneCountry: draft.cellPhoneCountry.dialCode,
    cellPhoneDisplay: draft.cellPhoneDisplay.trim(),
    companyId: draft.companyId,
    roleIds: [...draft.roleIds].sort(),
    departmentIds: [...draft.departmentIds].sort(),
  };
}

function ContactInlineField({
  label,
  value,
  onChange,
  placeholder = '—',
  required,
  maxLength,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  type?: React.HTMLInputTypeAttribute;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  const start = () => {
    setDraft(value);
    setEditing(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const commit = () => {
    onChange(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="min-w-0">
      <label className="mb-1 block text-xs text-text-muted">
        {label}
        {required && <span className="ml-0.5 text-ems-coral">*</span>}
      </label>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            maxLength={maxLength}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') cancel();
            }}
            className="min-w-0 flex-1 rounded-md border border-ems-accent bg-surface px-2 py-1 text-sm text-text-primary outline-none ring-1 ring-ems-accent/20"
          />
          <button
            type="button"
            onClick={commit}
            className="rounded p-1 text-ems-accent hover:bg-ems-accent-dim"
            aria-label={`Apply ${label}`}
          >
            <Check className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded p-1 text-text-muted hover:bg-hover hover:text-text-primary"
            aria-label={`Cancel ${label}`}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          onDoubleClick={start}
          className="group flex min-h-[2rem] w-full items-center justify-between gap-2 rounded-md px-0 py-1 text-left text-sm text-text-primary hover:bg-hover/60"
          title="Double-click to edit"
        >
          <span className={value.trim() ? 'truncate' : 'truncate italic text-text-muted'}>
            {value.trim() || placeholder}
          </span>
          <Pencil className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </button>
      )}
    </div>
  );
}

function ContactDetailDrawer({
  row,
  companies,
  roles,
  departments,
  companyById,
  saving,
  onClose,
  onDelete,
  onSave,
}: {
  row: ApiManagedContact;
  companies: ApiCompanyListRow[];
  roles: { roleId: number; roleName: string }[];
  departments: { departmentId: number; departmentName: string }[];
  companyById: Map<number, ApiCompanyListRow>;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: (payload: ManagedContactPayload) => void;
}) {
  const [draft, setDraft] = useState<ContactDraft>(() => makeDraftFromRow(row));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(makeDraftFromRow(row));
    setError(null);
  }, [row]);

  const initialDraft = useMemo(() => makeDraftFromRow(row), [row]);
  const dirty = useMemo(
    () => JSON.stringify(normalizeDraftForCompare(draft)) !== JSON.stringify(normalizeDraftForCompare(initialDraft)),
    [draft, initialDraft],
  );
  const hasCompany = Boolean(draft.companyId);
  const selectedCompany = hasCompany ? companyById.get(Number(draft.companyId)) : null;
  const companyOptions = useMemo(
    () => [
      { value: '', label: 'Internal IAE staff' },
      ...companyToSelect2Options(companies),
    ],
    [companies],
  );
  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.roleId), label: role.roleName })),
    [roles],
  );
  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: String(department.departmentId), label: department.departmentName })),
    [departments],
  );

  const discard = () => {
    setDraft(makeDraftFromRow(row));
    setError(null);
  };

  const save = () => {
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const email = draft.email.trim();
    if (!firstName || !lastName || !email) {
      setError('First name, last name, and email are required.');
      return;
    }

    const roleIds = draft.roleIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    const departmentIds = draft.departmentIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    if (hasCompany && (roleIds.length === 0 || departmentIds.length === 0)) {
      setError('Company contacts need at least one role and one department.');
      return;
    }

    setError(null);
    onSave({
      firstName,
      lastName,
      email,
      workPhone: tryE164FromDisplay(draft.workPhoneDisplay, draft.workPhoneCountry) || null,
      cellPhone: tryE164FromDisplay(draft.cellPhoneDisplay, draft.cellPhoneCountry) || null,
      companyId: hasCompany ? Number(draft.companyId) : null,
      roleIds: hasCompany ? roleIds : [],
      departmentIds: hasCompany ? departmentIds : [],
    });
  };

  return (
    <Drawer onClose={onClose} width={1080}>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface p-4">
        <Avatar name={contactName(row)} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-text-primary">{contactName(row)}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            {hasCompany ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-md bg-ems-accent-dim px-2 py-0.5 text-[11px] font-medium text-ems-accent">
                  <Building2 className="h-3 w-3" aria-hidden />
                  {selectedCompany?.companyName || row.companyNames[0] || 'Company contact'}
                </span>
                {selectedCompany?.companyTypeName && (
                  <span className="inline-flex items-center rounded-md bg-elevated px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    {selectedCompany.companyTypeName}
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center rounded-md bg-elevated px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                Internal IAE staff
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md p-2 text-text-muted transition hover:bg-ems-coral/10 hover:text-ems-coral"
          aria-label="Delete contact"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-text-muted transition hover:bg-hover hover:text-text-primary"
          aria-label="Close contact details"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="p-4">
        <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-text-muted">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Click any field to edit inline
        </p>

        <div className="space-y-6">
          <section className="space-y-4">
            <div className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Contact details
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ContactInlineField
                label="First Name"
                value={draft.firstName}
                required
                maxLength={100}
                onChange={(firstName) => setDraft((current) => ({ ...current, firstName }))}
              />
              <ContactInlineField
                label="Last Name"
                value={draft.lastName}
                required
                maxLength={100}
                onChange={(lastName) => setDraft((current) => ({ ...current, lastName }))}
              />
              <ContactInlineField
                label="Email"
                value={draft.email}
                required
                maxLength={254}
                type="email"
                onChange={(email) => setDraft((current) => ({ ...current, email }))}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Company assignment
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Company">
                <Select2
                  options={companyOptions}
                  value={draft.companyId}
                  onChange={(companyId) =>
                    setDraft((current) => ({
                      ...current,
                      companyId,
                      roleIds: companyId ? current.roleIds : [],
                      departmentIds: companyId ? current.departmentIds : [],
                    }))
                  }
                  placeholder="Internal IAE staff"
                  allowClear
                />
              </FormField>
              <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted">
                {selectedCompany ? (
                  <>
                    <div className="font-medium text-text-primary">{selectedCompany.companyName}</div>
                    <div className="mt-1">
                      {[selectedCompany.companyTypeName, selectedCompany.physicalCity, selectedCompany.physicalStateProvince]
                        .filter(Boolean)
                        .join(' • ')}
                    </div>
                  </>
                ) : (
                  'No company selected. This contact is saved as internal IAE staff.'
                )}
              </div>
              <FormField label="Roles" required={hasCompany}>
                <Select2Multi
                  options={roleOptions}
                  values={draft.roleIds}
                  onChange={(roleIds) => setDraft((current) => ({ ...current, roleIds }))}
                  placeholder={hasCompany ? 'Select one or more roles…' : 'Only used for company contacts'}
                  disabled={!hasCompany}
                />
              </FormField>
              <FormField label="Departments" required={hasCompany}>
                <Select2Multi
                  options={departmentOptions}
                  values={draft.departmentIds}
                  onChange={(departmentIds) => setDraft((current) => ({ ...current, departmentIds }))}
                  placeholder={hasCompany ? 'Select one or more departments…' : 'Only used for company contacts'}
                  disabled={!hasCompany}
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Phone numbers
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ContactPhoneRow
                label="Work Phone"
                country={draft.workPhoneCountry}
                display={draft.workPhoneDisplay}
                onCountry={(workPhoneCountry) => setDraft((current) => ({ ...current, workPhoneCountry }))}
                onDisplay={(workPhoneDisplay) => setDraft((current) => ({ ...current, workPhoneDisplay }))}
              />
              <ContactPhoneRow
                label="Cell Phone"
                country={draft.cellPhoneCountry}
                display={draft.cellPhoneDisplay}
                onCountry={(cellPhoneCountry) => setDraft((current) => ({ ...current, cellPhoneCountry }))}
                onDisplay={(cellPhoneDisplay) => setDraft((current) => ({ ...current, cellPhoneDisplay }))}
              />
            </div>
          </section>

          {row.companyNames.length > 1 && (
            <section className="rounded-md border border-border bg-surface p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-text-muted">Additional companies</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.companyNames.slice(1).map((name) => chip(name))}
              </div>
            </section>
          )}

          {error && (
            <div className="rounded-md border border-ems-coral/40 bg-ems-coral/10 px-3 py-2 text-sm text-ems-coral">
              {error}
            </div>
          )}
        </div>

        {dirty && (
          <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-ems-accent" />
              Unsaved changes
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="rounded-md px-3 py-1.5 text-xs text-text-secondary transition hover:bg-hover hover:text-text-primary disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-ems-accent px-4 py-1.5 text-xs font-medium text-background transition hover:bg-ems-accent/90 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
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
      ...companyToSelect2Options(companies),
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
  contacts,
  loading,
  onSelect,
}: {
  query: string;
  contacts: ApiManagedContact[];
  loading: boolean;
  onSelect: (contact: ApiManagedContact) => void;
}) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[280px] overflow-y-auto rounded-md border border-border bg-elevated shadow-xl">
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Searching contacts…
        </div>
      ) : contacts.length === 0 ? (
        <div className="px-3 py-3 text-sm text-text-muted">No matching contacts</div>
      ) : contacts.map((contact) => (
        <button
          key={contact.contactId}
          type="button"
          onClick={() => onSelect(contact)}
          className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-hover transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-text-primary truncate">{contactName(contact)}</div>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              {contact.email && <span className="truncate">{contact.email}</span>}
              {contact.companyNames[0] && <span className="truncate">{contact.companyNames[0]}</span>}
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
  const [selectedContact, setSelectedContact] = useState<ApiManagedContact | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiManagedContact | null>(null);
  const [isDeleteWorkflowPending, setIsDeleteWorkflowPending] = useState(false);
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
  const suggestionQuery = useQuery({
    queryKey: ['contacts', 'managed', 'suggestions', search.trim(), companyId],
    queryFn: () =>
      fetchManagedContacts(0, 8, {
        q: search.trim(),
        companyId: companyId ? Number(companyId) : undefined,
      }),
    enabled: showSuggestions && search.trim().length >= 2,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!selectedContact) return;
    const refreshed = rows.find((row) => row.contactId === selectedContact.contactId);
    if (refreshed) setSelectedContact(refreshed);
  }, [rows, selectedContact]);

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
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ['contacts', 'managed'] });
      await qc.invalidateQueries({ queryKey: ['companies'] });
      if (saved) setSelectedContact(saved);
      setEditing(undefined);
      addToast('Contact saved.', 'success');
    },
    onError: (error) => addToast(friendlyApiError(error, 'Could not save contact.'), 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (row: ApiManagedContact) => deleteManagedContact(row.contactId),
  });

  const companyOptions = useMemo(
    () => [
      { value: '', label: 'All contacts' },
      ...companyToSelect2Options(companies),
    ],
    [companies],
  );
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

  const closeDeleteDialogBeforeFeedback = () =>
    new Promise<void>((resolve) => {
      setPendingDelete(null);
      window.setTimeout(resolve, 260);
    });

  const isDeletePending = deleteMutation.isPending || isDeleteWorkflowPending;

  const confirmDeleteContact = async () => {
    const contactToDelete = pendingDelete;
    if (!contactToDelete || isDeletePending) {
      return;
    }
    setIsDeleteWorkflowPending(true);
    try {
      await deleteMutation.mutateAsync(contactToDelete);
      await qc.invalidateQueries({ queryKey: ['contacts', 'managed'] });
      setSelectedContact((current) =>
        current?.contactId === contactToDelete.contactId ? null : current,
      );
      await closeDeleteDialogBeforeFeedback();
      setIsDeleteWorkflowPending(false);
      addToast('Contact deleted.', 'success');
    } catch (error) {
      const message = friendlyApiError(error, 'Could not delete contact.');
      await closeDeleteDialogBeforeFeedback();
      setIsDeleteWorkflowPending(false);
      addToast(message, 'error');
    }
  };

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
              contacts={suggestionQuery.data?.data ?? []}
              loading={suggestionQuery.isLoading || suggestionQuery.isFetching}
              onSelect={(contact) => {
                const name = contactName(contact);
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
            </tr>
          </thead>
          <tbody>
            {rowsQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-text-muted">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading contacts…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-text-muted">
                  No contacts found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                // Resolve company details for richer display
                const companyDetails = row.companyIds.length > 0 ? companyById.get(row.companyIds[0]) : null;
                return (
                  <tr
                    key={row.contactId}
                    className="border-t border-border hover:bg-hover/40 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/30 focus-visible:ring-inset"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedContact(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedContact(row);
                      }
                    }}
                  >
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedContact && (
        <ContactDetailDrawer
          row={selectedContact}
          companies={companies}
          roles={lookupsQuery.data?.roles ?? []}
          departments={lookupsQuery.data?.departments ?? []}
          companyById={companyById}
          saving={saveMutation.isPending}
          onClose={() => setSelectedContact(null)}
          onDelete={() => setPendingDelete(selectedContact)}
          onSave={(body) => saveMutation.mutate({ row: selectedContact, body })}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
        <span>Showing {total === 0 ? 0 : offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
        <div className="flex items-center gap-2">
          <PageSizeSelect value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50">Previous</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50">Next</button>
        </div>
      </div>

      {editing === null && (
        <ContactModal
          row={null}
          companies={companies}
          roles={lookupsQuery.data?.roles ?? []}
          departments={lookupsQuery.data?.departments ?? []}
          saving={saveMutation.isPending}
          onClose={() => setEditing(undefined)}
          onSave={(body) => saveMutation.mutate({ row: null, body })}
        />
      )}

      {/* Delete confirmation dialog — styled to match Companies page */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && !isDeletePending && setPendingDelete(null)}>
        <AlertDialogContent className="z-[360] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              {pendingDelete
                ? <>This will permanently remove <strong>{contactName(pendingDelete)}</strong> from contacts. This action cannot be undone.</>
                : 'This contact will be removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isDeletePending && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-border border-dashed bg-surface/60 px-3 py-2.5 text-sm text-text-secondary"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-ems-accent"
                aria-hidden
              />
              <span>Deleting contact…</span>
            </div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isDeletePending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletePending || !pendingDelete}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => void confirmDeleteContact()}
            >
              {isDeletePending ? (
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
