import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Loader2 } from 'lucide-react';
import { FormField } from './Primitives';
import { Select2, Select2Multi, type Select2Option } from './Select2';
import type { ApiAttractionListRow, ApiClass, CreateTourPayload } from '@/api/attractionToursApi';
import {
  createCompanyContact,
  fetchCompanyContacts,
  fetchLookups,
  type ApiCompanyContact,
} from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { ContactPhoneRow } from './ContactPhoneRow';
import { DEFAULT_PHONE_COUNTRY } from '@/lib/contactPhoneOptions';
import {
  type PhoneCountrySelection,
  PHONE_INVALID_MESSAGE,
  tryE164FromDisplay,
} from '@/lib/contactPhoneField';

/** Where the form is embedded — controls which optional blocks are shown. */
export type AddTourFormVariant = 'project-wizard' | 'attraction-tours';

/** Simplified creation form — full details can be added later from the Tour entry. */
export function AddTourForm({
  variant,
  attractions,
  classes,
  managementCompanyOptions,
  payableEntityCompanyOptions,
  submitting,
  onSave,
  onCancel,
  addToast,
  lockAttractionId,
}: {
  variant: AddTourFormVariant;
  attractions: ApiAttractionListRow[];
  classes: ApiClass[];
  /** Talent agencies only — required for creating a tour. */
  managementCompanyOptions?: Select2Option[];
  /** All companies — optional finance payable entity. */
  payableEntityCompanyOptions?: Select2Option[];
  submitting: boolean;
  onSave: (body: CreateTourPayload, bannerFile?: File | null) => void;
  onCancel: () => void;
  addToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  /** When set, attraction is fixed (e.g. project wizard) and the attraction picker is hidden. */
  lockAttractionId?: number;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [attractionId, setAttractionId] = useState(
    () => (lockAttractionId != null ? String(lockAttractionId) : ''),
  );
  const [classId, setClassId] = useState('');
  const [talentAgencyCompanyId, setTalentAgencyCompanyId] = useState('');
  const [talentAgentContactIds, setTalentAgentContactIds] = useState<string[]>([]);
  const [payableEntityCompanyId, setPayableEntityCompanyId] = useState('');
  const [ascap, setAscap] = useState(false);
  const [bmi, setBmi] = useState(false);
  const [sesac, setSesac] = useState(false);
  const [gmr, setGmr] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerInputKey, setBannerInputKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    attractionId?: string;
    classId?: string;
    talentAgencyCompanyId?: string;
  }>({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [workPhoneCountry, setWorkPhoneCountry] = useState<PhoneCountrySelection>(
    DEFAULT_PHONE_COUNTRY,
  );
  const [workPhoneDisplay, setWorkPhoneDisplay] = useState('');
  const [cellPhoneCountry, setCellPhoneCountry] = useState<PhoneCountrySelection>(
    DEFAULT_PHONE_COUNTRY,
  );
  const [cellPhoneDisplay, setCellPhoneDisplay] = useState('');
  const [workPhoneError, setWorkPhoneError] = useState<string | undefined>();
  const [cellPhoneError, setCellPhoneError] = useState<string | undefined>();
  const [contactRoleIds, setContactRoleIds] = useState<string[]>([]);
  const [contactDepartmentIds, setContactDepartmentIds] = useState<string[]>([]);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const u = URL.createObjectURL(bannerFile);
    setBannerPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [bannerFile]);

  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const attractionOptions = attractions.map((a) => ({
    value: String(a.attractionId),
    label: a.attractionName,
  }));
  const classOptions = classes.map((c) => ({
    value: String(c.classId),
    label: c.className,
  }));

  const lockedAttraction =
    lockAttractionId != null ? attractions.find((a) => a.attractionId === lockAttractionId) : null;

  const showBannerUpload = variant === 'attraction-tours' || variant === 'project-wizard';
  const talentAgencyOptions = managementCompanyOptions ?? [];
  const payableEntityOptions = payableEntityCompanyOptions ?? [];
  const talentAgencyFieldLabel = 'Talent Agency';
  const talentAgencyPlaceholder = 'Select talent agency…';
  const selectedTalentAgencyId = Number(talentAgencyCompanyId);
  const talentAgentsQuery = useQuery({
    queryKey: ['add-tour-talent-agents', selectedTalentAgencyId],
    queryFn: () => fetchCompanyContacts(selectedTalentAgencyId),
    enabled: Number.isInteger(selectedTalentAgencyId) && selectedTalentAgencyId > 0,
    staleTime: 60_000,
  });
  const contactLookupsQuery = useQuery({
    queryKey: ['contact-form-lookups'],
    queryFn: () => fetchLookups().then(({ roles, departments }) => ({ roles, departments })),
    enabled: showAddContact,
    staleTime: 30 * 60 * 1000,
  });

  const talentAgentOptions = useMemo(
    () =>
      (talentAgentsQuery.data ?? [])
        .map((contact: ApiCompanyContact) => ({
          value: String(contact.contactId),
          label:
            `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() ||
            contact.email ||
            `Contact #${contact.contactId}`,
        }))
        .filter((opt, index, all) => all.findIndex((x) => x.value === opt.value) === index)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [talentAgentsQuery.data],
  );
  const selectedTalentAgentLabels = useMemo(() => {
    if (!talentAgentContactIds.length) return [];
    const optionById = new Map(talentAgentOptions.map((opt) => [opt.value, opt.label]));
    return talentAgentContactIds.map((id) => optionById.get(id) ?? `Contact #${id}`);
  }, [talentAgentContactIds, talentAgentOptions]);

  useEffect(() => {
    setTalentAgentContactIds([]);
    setShowAddContact(false);
  }, [talentAgencyCompanyId]);

  useEffect(() => {
    if (!talentAgentOptions.length || !talentAgentContactIds.length) return;
    const allowed = new Set(talentAgentOptions.map((opt) => opt.value));
    setTalentAgentContactIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [talentAgentOptions, talentAgentContactIds.length]);

  const resetContactDraft = () => {
    setContactFirstName('');
    setContactLastName('');
    setContactEmail('');
    setWorkPhoneCountry(DEFAULT_PHONE_COUNTRY);
    setWorkPhoneDisplay('');
    setCellPhoneCountry(DEFAULT_PHONE_COUNTRY);
    setCellPhoneDisplay('');
    setWorkPhoneError(undefined);
    setCellPhoneError(undefined);
    setContactRoleIds([]);
    setContactDepartmentIds([]);
    setContactError(null);
  };

  const handleCreateContact = async () => {
    const companyId = Number(talentAgencyCompanyId);
    if (!Number.isInteger(companyId) || companyId < 1) {
      setContactError('Select a talent agency first.');
      return;
    }
    if (!contactFirstName.trim() || !contactLastName.trim() || !contactEmail.trim()) {
      setContactError('First name, last name, and email are required.');
      return;
    }
    const roleIds = Array.from(
      new Set(contactRoleIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)),
    );
    const departmentIds = Array.from(
      new Set(
        contactDepartmentIds
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    if (roleIds.length === 0 || departmentIds.length === 0) {
      setContactError('Select at least one role and one department for the new contact.');
      return;
    }
    let wErr: string | undefined;
    let cErr: string | undefined;
    if (workPhoneDisplay.trim() && !workPhoneCountry) {
      wErr = 'Select a country for work phone, or clear the number.';
    }
    if (cellPhoneDisplay.trim() && !cellPhoneCountry) {
      cErr = 'Select a country for cell phone, or clear the number.';
    }
    if (wErr || cErr) {
      setWorkPhoneError(wErr);
      setCellPhoneError(cErr);
      return;
    }
    const workPhoneE164 = tryE164FromDisplay(workPhoneDisplay, workPhoneCountry);
    const cellPhoneE164 = tryE164FromDisplay(cellPhoneDisplay, cellPhoneCountry);
    if (workPhoneDisplay.trim() && !workPhoneE164) wErr = PHONE_INVALID_MESSAGE;
    if (cellPhoneDisplay.trim() && !cellPhoneE164) cErr = PHONE_INVALID_MESSAGE;
    setWorkPhoneError(wErr);
    setCellPhoneError(cErr);
    if (wErr || cErr) return;
    setContactSaving(true);
    setContactError(null);
    try {
      const created = await createCompanyContact(companyId, {
        firstName: contactFirstName.trim(),
        lastName: contactLastName.trim(),
        email: contactEmail.trim(),
        workPhone: workPhoneDisplay.trim() ? workPhoneE164 : undefined,
        cellPhone: cellPhoneDisplay.trim() ? cellPhoneE164 : undefined,
        roleIds,
        departmentIds,
      });
      await qc.invalidateQueries({ queryKey: ['add-tour-talent-agents', companyId] });
      const newId = String(created.contactId);
      setTalentAgentContactIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
      setShowAddContact(false);
      resetContactDraft();
      addToast?.('Talent agent contact added.', 'success');
    } catch (e) {
      const message = friendlyApiError(e, 'Could not add the contact.');
      setContactError(message);
      addToast?.(message, 'error');
    } finally {
      setContactSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">
        Fields marked with <span className="text-ems-coral">*</span> are required for every new tour. Optional
        details can be added later from the full tour entry.
      </p>
      {lockAttractionId != null ? (
        <FormField label="Attraction" required>
          <div className="text-sm text-text-primary bg-surface px-3 py-1.5 rounded border border-border">
            {lockedAttraction?.attractionName ?? 'Attraction'}
          </div>
        </FormField>
      ) : (
        <FormField label="Attraction" required error={fieldErrors.attractionId}>
          <Select2
            options={attractionOptions}
            value={attractionId}
            placeholder="Select attraction…"
            onChange={(v) => {
              setAttractionId(v);
              setFieldErrors((e) => {
                const n = { ...e };
                delete n.attractionId;
                return n;
              });
            }}
          />
        </FormField>
      )}
      <FormField label="Class (genre)" required error={fieldErrors.classId}>
        <Select2
          options={classOptions}
          value={classId}
          placeholder="Select class (genre)…"
          onChange={(v) => {
            setClassId(v);
            setFieldErrors((e) => {
              const n = { ...e };
              delete n.classId;
              return n;
            });
          }}
        />
      </FormField>
      <FormField label={talentAgencyFieldLabel} required error={fieldErrors.talentAgencyCompanyId}>
        <Select2
          options={talentAgencyOptions}
          value={talentAgencyCompanyId}
          placeholder={talentAgencyPlaceholder}
          onChange={(v) => {
            setTalentAgencyCompanyId(v);
            setFieldErrors((e) => {
              const n = { ...e };
              delete n.talentAgencyCompanyId;
              return n;
            });
          }}
        />
        {talentAgencyOptions.length === 0 && (
          <p className="text-[11px] text-text-muted mt-1">
            No companies with type{' '}
            <span className="font-medium text-text-secondary">Talent Agency</span> are loaded yet.
          </p>
        )}
      </FormField>
      <FormField label="Talent Agents" optional>
        <Select2Multi
          options={talentAgentOptions}
          values={talentAgentContactIds}
          onChange={setTalentAgentContactIds}
          placeholder={
            !talentAgencyCompanyId
              ? 'Select a talent agency first'
              : talentAgentsQuery.isLoading
                ? 'Loading talent agents…'
                : talentAgentOptions.length
                  ? 'Select one or more talent agents…'
                  : 'No contacts found for this agency'
          }
          disabled={!talentAgencyCompanyId || talentAgentsQuery.isLoading || submitting}
        />
        {talentAgencyCompanyId && (
          <div className="mt-2 space-y-2">
            <div className="rounded-md border border-border bg-surface px-2.5 py-2">
              {talentAgentsQuery.isLoading ? (
                <p className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Loading agency contacts…
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-text-secondary">
                    Selected for this tour:{' '}
                    <span className="font-medium text-text-primary">
                      {selectedTalentAgentLabels.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-text-primary">
                      {talentAgentOptions.length}
                    </span>{' '}
                    company contact{talentAgentOptions.length === 1 ? '' : 's'}.
                  </p>
                  {selectedTalentAgentLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTalentAgentLabels.map((label, index) => (
                        <span
                          key={`${label}-${index}`}
                          className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-text-primary"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted">
                      No specific talent agents selected for this tour yet.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowAddContact((open) => !open);
                setContactError(null);
              }}
              className="text-xs font-medium text-ems-accent hover:underline disabled:opacity-50"
            >
              + Add New Contact
            </button>
            {showAddContact && (
              <div className="rounded-md border border-border bg-elevated/70 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="First Name" required>
                    <input
                      className={inputCls}
                      value={contactFirstName}
                      onChange={(e) => setContactFirstName(e.target.value)}
                      placeholder="First name"
                      maxLength={100}
                      disabled={contactSaving}
                    />
                  </FormField>
                  <FormField label="Last Name" required>
                    <input
                      className={inputCls}
                      value={contactLastName}
                      onChange={(e) => setContactLastName(e.target.value)}
                      placeholder="Last name"
                      maxLength={100}
                      disabled={contactSaving}
                    />
                  </FormField>
                  <FormField label="Email" required>
                    <input
                      className={inputCls}
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Email"
                      maxLength={254}
                      disabled={contactSaving}
                    />
                  </FormField>
                  <ContactPhoneRow
                    label="Work Phone"
                    country={workPhoneCountry}
                    display={workPhoneDisplay}
                    onCountry={(value) => {
                      setWorkPhoneCountry(value);
                      setWorkPhoneError(undefined);
                    }}
                    onDisplay={(value) => {
                      setWorkPhoneDisplay(value);
                      setWorkPhoneError(undefined);
                    }}
                    error={workPhoneError}
                  />
                  <ContactPhoneRow
                    label="Cell Phone"
                    country={cellPhoneCountry}
                    display={cellPhoneDisplay}
                    onCountry={(value) => {
                      setCellPhoneCountry(value);
                      setCellPhoneError(undefined);
                    }}
                    onDisplay={(value) => {
                      setCellPhoneDisplay(value);
                      setCellPhoneError(undefined);
                    }}
                    error={cellPhoneError}
                  />
                  <FormField label="Role" required>
                    <Select2Multi
                      options={(contactLookupsQuery.data?.roles ?? []).map((r) => ({
                        value: String(r.roleId),
                        label: r.roleName,
                      }))}
                      values={contactRoleIds}
                      onChange={setContactRoleIds}
                      placeholder={
                        contactLookupsQuery.isLoading
                          ? 'Loading roles…'
                          : 'Select one or more roles…'
                      }
                      disabled={contactSaving || contactLookupsQuery.isLoading}
                    />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Department" required>
                      <Select2Multi
                        options={(contactLookupsQuery.data?.departments ?? []).map((d) => ({
                          value: String(d.departmentId),
                          label: d.departmentName,
                        }))}
                        values={contactDepartmentIds}
                        onChange={setContactDepartmentIds}
                        placeholder={
                          contactLookupsQuery.isLoading
                            ? 'Loading departments…'
                            : 'Select one or more departments…'
                        }
                        disabled={contactSaving || contactLookupsQuery.isLoading}
                      />
                    </FormField>
                  </div>
                </div>
                {contactError && <p className="text-xs text-ems-coral">{contactError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={contactSaving}
                    onClick={() => {
                      setShowAddContact(false);
                      resetContactDraft();
                    }}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={contactSaving || contactLookupsQuery.isLoading}
                    onClick={() => void handleCreateContact()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ems-accent px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60"
                  >
                    {contactSaving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                    Save contact
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </FormField>
      <FormField label="Payable Entity" optional>
        <Select2
          options={payableEntityOptions}
          value={payableEntityCompanyId}
          onChange={setPayableEntityCompanyId}
          placeholder="Select payable entity…"
          allowClear
          disabled={submitting}
        />
      </FormField>
      <FormField label="Tour Name" required error={fieldErrors.name}>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFieldErrors((e) => {
              const n = { ...e };
              delete n.name;
              return n;
            });
          }}
          maxLength={200}
          placeholder="e.g. World Tour 2025"
          autoFocus
        />
      </FormField>
      <FormField label="Performing rights (ASCAP, BMI, SESAC, GMR)" required>
        <p className="text-[11px] text-text-muted mb-2">
          Each flag is stored on the tour — turn on any PRO memberships that apply.
        </p>
        <div
          className="flex flex-wrap gap-x-6 gap-y-2.5 rounded-md border border-border/80 bg-surface/50 px-3 py-3"
          role="group"
          aria-label="Performing rights licensing"
        >
          {(
            [
              ['add-tour-ascap', 'ASCAP', ascap, setAscap] as const,
              ['add-tour-bmi', 'BMI', bmi, setBmi] as const,
              ['add-tour-sesac', 'SESAC', sesac, setSesac] as const,
              ['add-tour-gmr', 'GMR', gmr, setGmr] as const,
            ] as const
          ).map(([id, label, checked, setChecked]) => (
            <label
              key={id}
              htmlFor={id}
              className="inline-flex items-center gap-2 cursor-pointer text-sm text-text-primary select-none"
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                disabled={submitting}
                onChange={(e) => setChecked(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background text-ems-accent focus:ring-ems-accent focus:ring-offset-0"
              />
              {label}
            </label>
          ))}
        </div>
      </FormField>
      {showBannerUpload && (
        <FormField label="Tour banner image" optional>
          <p className="text-[11px] text-text-muted mb-2">
            JPEG, PNG, WebP, or GIF — max 5 MB. Used on tour and engagement tiles.
          </p>
          <div className="space-y-2">
            <input
              key={bannerInputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={submitting}
              className="block w-full text-xs text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-hover"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setBannerFile(f);
              }}
            />
            {(bannerPreview || bannerFile) && (
              <div className="flex items-start gap-3">
                {bannerPreview && (
                  <img
                    src={bannerPreview}
                    alt=""
                    className="h-16 w-28 rounded-md border border-border object-cover bg-elevated"
                  />
                )}
                {bannerFile && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setBannerFile(null);
                      setBannerInputKey((k) => k + 1);
                    }}
                    className="text-xs text-ems-accent hover:underline disabled:opacity-50"
                  >
                    Clear image
                  </button>
                )}
              </div>
            )}
            {!bannerFile && (
              <p className="text-[11px] text-text-muted flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                No file selected
              </p>
            )}
          </div>
        </FormField>
      )}
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => {
            setBannerFile(null);
            setBannerInputKey((k) => k + 1);
            setAscap(false);
            setBmi(false);
            setSesac(false);
            setGmr(false);
            setPayableEntityCompanyId('');
            onCancel();
          }}
          className="text-text-secondary px-4 py-1.5 text-sm"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            const next: typeof fieldErrors = {};
            const tn = name.trim();
            if (!tn) next.name = 'Tour name is required.';
            else if (tn.length > 200) next.name = 'Tour name must be 200 characters or fewer.';
            if (lockAttractionId == null) {
              const a = Number(attractionId);
              if (!attractionId || !Number.isFinite(a) || a < 1) {
                next.attractionId = 'Attraction is required.';
              }
            }
            const c = Number(classId);
            if (!classId || !Number.isFinite(c) || c < 1) {
              next.classId = 'Class (genre) is required.';
            }
            const talentAgency = Number(talentAgencyCompanyId);
            if (
              !talentAgencyCompanyId ||
              !Number.isFinite(talentAgency) ||
              talentAgency < 1
            ) {
              next.talentAgencyCompanyId = `${talentAgencyFieldLabel} is required.`;
            }
            if (Object.keys(next).length) {
              setFieldErrors(next);
              return;
            }
            setFieldErrors({});
            onSave(
              {
                tourName: tn,
                attractionId: lockAttractionId ?? Number(attractionId),
                classId: Number(classId),
                ascap,
                bmi,
                sesac,
                gmr,
                talentAgencyCompanyId: Number(talentAgencyCompanyId),
                tourManagementCompanyId: payableEntityCompanyId
                  ? Number(payableEntityCompanyId)
                  : null,
                talentAgentContactIds: talentAgentContactIds.map(Number),
                audienceGender: null,
                audienceAgeRange: null,
                tourInsuranceLanguage: null,
                venueTypePreferenceId: null,
              },
              showBannerUpload ? bannerFile : undefined,
            );
          }}
          className="px-4 py-1.5 rounded-md text-sm font-medium bg-ems-accent text-background hover:bg-ems-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Create Tour'}
        </button>
      </div>
    </div>
  );
}
