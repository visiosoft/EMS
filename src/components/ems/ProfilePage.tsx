import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, UserRound } from 'lucide-react';
import {
  fetchMyProfile,
  type MyProfile,
  type UpdateMyProfileRequest,
  updateMyProfile,
} from '@/api/myProfileApi';
import { friendlyApiError } from '@/lib/friendlyApiError';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ProfilePageProps {
  addToast: (message: string, type: ToastType) => void;
}

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string;
  cellPhone: string;
  workPhone: string;
  jobTitle: string;
};

const EMPTY_FORM: ProfileFormState = {
  firstName: '',
  lastName: '',
  email: '',
  departmentName: '',
  cellPhone: '',
  workPhone: '',
  jobTitle: '',
};

function formFromProfile(profile: MyProfile): ProfileFormState {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    email: profile.email ?? '',
    departmentName: profile.departmentName ?? '',
    cellPhone: profile.cellPhone ?? '',
    workPhone: profile.workPhone ?? '',
    jobTitle: profile.jobTitle ?? '',
  };
}

function profileUpdateFromForm(
  form: ProfileFormState,
  jobTitleColumnAvailable: boolean,
): UpdateMyProfileRequest {
  const payload: UpdateMyProfileRequest = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    cellPhone: form.cellPhone.trim(),
    workPhone: form.workPhone.trim(),
    departmentName: form.departmentName.trim(),
  };
  if (jobTitleColumnAvailable) {
    payload.jobTitle = form.jobTitle.trim();
  }
  return payload;
}

function sameForm(left: ProfileFormState, right: ProfileFormState): boolean {
  return (
    left.firstName === right.firstName &&
    left.lastName === right.lastName &&
    left.email === right.email &&
    left.departmentName === right.departmentName &&
    left.cellPhone === right.cellPhone &&
    left.workPhone === right.workPhone &&
    left.jobTitle === right.jobTitle
  );
}

export function ProfilePage({ addToast }: ProfilePageProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setForm(formFromProfile(profileQuery.data));
    }
  }, [profileQuery.data]);

  const originalForm = useMemo(
    () => (profileQuery.data ? formFromProfile(profileQuery.data) : EMPTY_FORM),
    [profileQuery.data],
  );
  const isDirty = !sameForm(form, originalForm);
  const displayName = `${form.firstName} ${form.lastName}`.trim() || form.email || 'My Profile';

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateMyProfileRequest) => updateMyProfile(payload),
    onSuccess: async (profile) => {
      setForm(formFromProfile(profile));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['companies'] }),
        queryClient.invalidateQueries({ queryKey: ['lookups'] }),
      ]);
      if (profile.entraSyncWarnings?.length) {
        addToast(profile.entraSyncWarnings.join(' '), 'warning');
      } else {
        addToast('Profile updated.', 'success');
      }
    },
    onError: (error) => {
      addToast(friendlyApiError(error, 'Could not update profile.'), 'error');
    },
  });

  function updateField(key: keyof ProfileFormState, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileQuery.data || updateMutation.isPending) return;
    updateMutation.mutate(
      profileUpdateFromForm(form, profileQuery.data.jobTitleColumnAvailable),
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text-primary">My Profile</h1>
          <p className="mt-1 truncate text-sm text-text-secondary">{displayName}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-ems-accent/30 bg-ems-accent-dim text-ems-accent">
          <UserRound className="h-5 w-5" aria-hidden />
        </div>
      </div>

      {profileQuery.isLoading ? (
        <div className="rounded-md border border-border bg-surface px-4 py-8 text-sm text-text-secondary">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin align-text-bottom" aria-hidden />
          Loading profile...
        </div>
      ) : profileQuery.isError ? (
        <div className="rounded-md border border-ems-coral/30 bg-ems-coral-dim px-4 py-3 text-sm text-ems-coral">
          {friendlyApiError(profileQuery.error, 'Could not load profile.')}
        </div>
      ) : profileQuery.data ? (
        <form onSubmit={handleSubmit} className="rounded-md border border-border bg-surface">
          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <ProfileField
              label="First Name"
              value={form.firstName}
              onChange={(value) => updateField('firstName', value)}
              required
              maxLength={100}
            />
            <ProfileField
              label="Last Name"
              value={form.lastName}
              onChange={(value) => updateField('lastName', value)}
              maxLength={100}
            />
            <ProfileField
              label="Email"
              value={form.email}
              onChange={() => undefined}
              readOnly
              className="md:col-span-2"
            />
            <ProfileField
              label="Department"
              value={form.departmentName}
              onChange={(value) => updateField('departmentName', value)}
              required
              maxLength={100}
            />
            {profileQuery.data.jobTitleColumnAvailable ? (
              <ProfileField
                label="Job Title"
                value={form.jobTitle}
                onChange={(value) => updateField('jobTitle', value)}
                maxLength={150}
              />
            ) : (
              <RoleSummary roles={profileQuery.data.roleNames} />
            )}
            <ProfileField
              label="Mobile Phone"
              value={form.cellPhone}
              onChange={(value) => updateField('cellPhone', value)}
              maxLength={30}
            />
            <ProfileField
              label="Work Phone"
              value={form.workPhone}
              onChange={(value) => updateField('workPhone', value)}
              maxLength={30}
            />
            {profileQuery.data.jobTitleColumnAvailable ? (
              <RoleSummary roles={profileQuery.data.roleNames} className="md:col-span-2" />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-elevated px-4 py-3">
            <button
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary hover:bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => setForm(originalForm)}
            >
              Reset
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-ems-accent bg-ems-accent px-3 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isDirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Save Profile
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  required,
  readOnly,
  maxLength,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase text-text-muted">
        {label}
        {required ? <span className="ml-0.5 text-ems-coral">*</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        className="h-9 w-full rounded-md border border-border bg-elevated px-3 text-sm text-text-primary outline-none transition focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15 read-only:bg-background read-only:text-text-secondary"
      />
    </label>
  );
}

function RoleSummary({
  roles,
  className = '',
}: {
  roles: string[];
  className?: string;
}) {
  const cleanedRoles = roles.filter(Boolean);
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1 text-xs font-semibold uppercase text-text-muted">
        Roles
      </div>
      <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-border bg-elevated px-2 py-1">
        {cleanedRoles.length ? (
          cleanedRoles.map((role) => (
            <span
              key={role}
              className="inline-flex max-w-full items-center truncate rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-text-secondary"
            >
              {role}
            </span>
          ))
        ) : (
          <span className="text-sm text-text-muted">None</span>
        )}
      </div>
    </div>
  );
}
