import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FormField } from './Primitives';
import { Select2Multi } from './Select2';
import { ContactPhoneRow } from './ContactPhoneRow';
import {
  PHONE_INVALID_MESSAGE,
  tryE164FromDisplay,
  type PhoneCountrySelection,
} from '@/lib/contactPhoneField';
import { DEFAULT_PHONE_COUNTRY } from '@/lib/contactPhoneOptions';
import type {
  ApiDepartment,
  ApiDepartmentRoleMapping,
  ApiRole,
} from '@/api/companyApi';

export interface TourContactFormPayload {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone?: string | null;
  workPhone?: string | null;
  roleIds: number[];
  departmentIds: number[];
}

interface TourContactFormProps {
  roles: ApiRole[];
  departments: ApiDepartment[];
  departmentRoleMappings: ApiDepartmentRoleMapping[];
  onSave: (payload: TourContactFormPayload) => void | Promise<void>;
  onCancel: () => void;
}

export function TourContactForm({
  roles,
  departments,
  departmentRoleMappings,
  onSave,
  onCancel,
}: TourContactFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [workPhoneCountry, setWorkPhoneCountry] = useState<PhoneCountrySelection>(DEFAULT_PHONE_COUNTRY);
  const [workPhoneDisplay, setWorkPhoneDisplay] = useState('');
  const [cellPhoneCountry, setCellPhoneCountry] = useState<PhoneCountrySelection>(DEFAULT_PHONE_COUNTRY);
  const [cellPhoneDisplay, setCellPhoneDisplay] = useState('');
  const [workPhoneError, setWorkPhoneError] = useState<string | undefined>();
  const [cellPhoneError, setCellPhoneError] = useState<string | undefined>();
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    department?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const inputCls =
    'w-full min-w-0 cursor-text bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const roleOpts = useMemo(() => {
    if (departmentIds.length === 0) return [];
    const validRoleIds = new Set(
      departmentRoleMappings
        .filter((m) => departmentIds.includes(String(m.departmentId)))
        .map((m) => m.roleId),
    );
    return (roles ?? [])
      .filter((r) => validRoleIds.has(r.roleId))
      .map((r) => ({ value: String(r.roleId), label: r.roleName }));
  }, [roles, departmentIds, departmentRoleMappings]);

  const deptOpts = useMemo(
    () => (departments ?? []).map((d) => ({ value: String(d.departmentId), label: d.departmentName })),
    [departments],
  );

  return (
    <div className="bg-elevated border border-border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
        <FormField label="First Name" required error={fieldErrors.firstName}>
          <input
            className={inputCls}
            maxLength={100}
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
            }}
          />
        </FormField>
        <FormField label="Last Name" required error={fieldErrors.lastName}>
          <input
            className={inputCls}
            maxLength={100}
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
            }}
          />
        </FormField>
        <FormField label="Email" required error={fieldErrors.email}>
          <input
            type="email"
            className={inputCls}
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
        </FormField>
        <div className="contents lg:contents">
          <ContactPhoneRow
            label="Work Phone"
            country={workPhoneCountry}
            display={workPhoneDisplay}
            onCountry={(c) => { setWorkPhoneCountry(c); setWorkPhoneError(undefined); }}
            onDisplay={(d) => { setWorkPhoneDisplay(d); setWorkPhoneError(undefined); }}
            error={workPhoneError}
          />
          <ContactPhoneRow
            label="Cell Phone"
            country={cellPhoneCountry}
            display={cellPhoneDisplay}
            onCountry={(c) => { setCellPhoneCountry(c); setCellPhoneError(undefined); }}
            onDisplay={(d) => { setCellPhoneDisplay(d); setCellPhoneError(undefined); }}
            error={cellPhoneError}
          />
        </div>
        <FormField label="Department" required error={fieldErrors.department}>
          <Select2Multi
            options={deptOpts}
            values={departmentIds}
            onChange={(vals) => {
              setDepartmentIds(vals);
              setFieldErrors((prev) => ({ ...prev, department: undefined }));
              // Remove roles that are no longer valid for the new department selection
              const validRoleIds = new Set(
                departmentRoleMappings
                  .filter((m) => vals.includes(String(m.departmentId)))
                  .map((m) => m.roleId),
              );
              setRoleIds((prev) => prev.filter((id) => validRoleIds.has(Number(id))));
            }}
            placeholder="Choose departments…"
          />
        </FormField>
        <FormField label="Role" required error={fieldErrors.role}>
          <Select2Multi
            options={roleOpts}
            values={roleIds}
            onChange={(vals) => { setRoleIds(vals); setFieldErrors((prev) => ({ ...prev, role: undefined })); }}
            placeholder={departmentIds.length === 0 ? 'Select department first…' : 'Choose roles…'}
            disabled={departmentIds.length === 0}
          />
        </FormField>
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-text-secondary text-sm px-3 py-1.5 hover:text-text-primary disabled:opacity-50 disabled:pointer-events-none"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            const next: typeof fieldErrors = {};
            if (!firstName.trim()) next.firstName = 'First name is required.';
            if (!lastName.trim()) next.lastName = 'Last name is required.';
            if (!email.trim()) next.email = 'Email is required.';
            if (roleIds.length === 0) next.role = 'Select at least one role.';
            if (departmentIds.length === 0) next.department = 'Select at least one department.';
            if (Object.keys(next).length > 0) { setFieldErrors(next); return; }
            setFieldErrors({});
            let wErr: string | undefined;
            let cErr: string | undefined;
            if (workPhoneDisplay.trim() && !workPhoneCountry) {
              wErr = 'Select a country for work phone, or clear the number.';
            }
            if (cellPhoneDisplay.trim() && !cellPhoneCountry) {
              cErr = 'Select a country for cell phone, or clear the number.';
            }
            if (wErr || cErr) { setWorkPhoneError(wErr); setCellPhoneError(cErr); return; }
            const wE = tryE164FromDisplay(workPhoneDisplay, workPhoneCountry);
            const cE = tryE164FromDisplay(cellPhoneDisplay, cellPhoneCountry);
            if (workPhoneDisplay.trim() && !wE) wErr = PHONE_INVALID_MESSAGE;
            if (cellPhoneDisplay.trim() && !cE) cErr = PHONE_INVALID_MESSAGE;
            setWorkPhoneError(wErr);
            setCellPhoneError(cErr);
            if (wErr || cErr) return;
            setSaving(true);
            try {
              await onSave({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                workPhone: workPhoneDisplay.trim() ? wE! : undefined,
                cellPhone: cellPhoneDisplay.trim() ? cE! : undefined,
                roleIds: roleIds.map(Number),
                departmentIds: departmentIds.map(Number),
              });
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex items-center justify-center gap-2 min-w-[7.5rem] bg-ems-accent text-background text-sm px-4 py-1.5 rounded-md font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Saving…</>
          ) : (
            'Save Contact'
          )}
        </button>
      </div>
    </div>
  );
}
