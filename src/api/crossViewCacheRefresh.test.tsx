/**
 * Reproduces the reported flow: the Contacts screen is loaded first (and, like the EMS
 * shell does, stays mounted while hidden), a contact is then linked to a company from the
 * Companies screen, and the Contacts screen must show the new company without a page reload.
 */
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/entra', () => ({
  acquireApiAccessToken: vi.fn(async () => 'token'),
  requestApiAccessToken: vi.fn(async () => 'token'),
  acquireGraphAccessToken: vi.fn(async () => null),
  getActiveAccount: () => null,
  getAccountEmail: () => '',
  getAccountName: () => '',
  getAccountOid: () => '',
  isApiAccessTokenConfigured: () => false,
}));

import { apiFetch } from './config';
import { queryClient } from './queryClient';

type ManagedContact = { contactId: number; companyNames: string[] };

let serverCompanyNames: string[] = [];
let contactListFetches = 0;

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (method === 'POST' && url.includes('/api/companies/1/contacts')) {
    serverCompanyNames = ['Acme Venue'];
    return json({ contactAssignmentId: 99 });
  }
  if (method === 'GET' && url.includes('/api/contacts')) {
    contactListFetches += 1;
    return json({ data: [{ contactId: 7, companyNames: [...serverCompanyNames] }], total: 1 });
  }
  throw new Error(`Unexpected request: ${method} ${url}`);
});

function ContactsScreen() {
  const q = useQuery({
    queryKey: ['contacts', 'managed', 0, 25],
    queryFn: () =>
      apiFetch<{ data: ManagedContact[]; total: number }>('/contacts?offset=0&limit=25'),
  });
  const row = q.data?.data[0];
  return (
    <div data-testid="contact-companies">
      {row ? (row.companyNames.join(', ') || 'no companies') : 'loading'}
    </div>
  );
}

function renderContactsScreen() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ContactsScreen />
    </QueryClientProvider>,
  );
}

async function linkContactToCompany() {
  await apiFetch('/companies/1/contacts', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }),
  });
}

describe('contact linked to a company appears on the Contacts screen without a reload', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    queryClient.clear();
    serverCompanyNames = [];
    contactListFetches = 0;
  });

  it('refreshes a Contacts screen that stayed mounted while the link was made', async () => {
    renderContactsScreen();
    await screen.findByText('no companies');

    await linkContactToCompany();

    await waitFor(
      () => expect(screen.getByTestId('contact-companies')).toHaveTextContent('Acme Venue'),
      { timeout: 3000 },
    );
    expect(contactListFetches).toBe(2);
  });

  it('refreshes a Contacts screen that was unmounted while the link was made', async () => {
    const first = renderContactsScreen();
    await screen.findByText('no companies');
    first.unmount();

    await linkContactToCompany();

    renderContactsScreen();
    await waitFor(
      () => expect(screen.getByTestId('contact-companies')).toHaveTextContent('Acme Venue'),
      { timeout: 3000 },
    );
  });
});
