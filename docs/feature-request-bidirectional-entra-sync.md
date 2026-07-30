# Feature Request: Bidirectional Entra Sync for Employee Onboarding

**Date:** 2026-07-15  
**Requested By:** (via email)  
**Priority:** TBD  
**Status:** Under Review

## Summary

Use the Employee Profile screen as a new-employee onboarding form, with changes automatically synchronized back to Entra (Azure AD).

## Current State

### What exists today

| Capability | Status | Location |
|------------|--------|----------|
| Entra → EMS contact sync (preview + apply) | ✅ Implemented | Admin Settings > Contact Sync |
| EMS → Entra contact sync (preview + apply) | ✅ Implemented | Admin Settings > Contact Sync |
| My Profile self-service write-back to Entra | ✅ Implemented | My Profile page |
| Employee Profile admin write-back to Entra | ❌ Not implemented | Employee Profile (admin view) |
| Create new Entra user from EMS | ✅ Implemented (via sync) | Contact Sync apply |

### Existing write-back fields (EMS → Entra)

These fields are already mapped for Graph API writes:

- `displayName`
- `givenName` / `surname`
- `userPrincipalName` / `mailNickname`
- `mobilePhone` / `businessPhones`
- `department`
- `jobTitle`
- `accountEnabled`

### Integration architecture

- **Auth:** Entra JWT verification (backend), MSAL browser (frontend)
- **Graph tokens:** Delegated (user) token via `x-entra-graph-access-token` header; App-only token via client_credentials for sync writes
- **Key services:**
  - `internal-contact-sync.service.ts` — bidirectional sync engine
  - `user-profile.service.ts` — My Profile save + Entra write-back
  - `employee-profile.service.ts` — Admin employee profile (DB-only, no Entra write-back)

## Gap Analysis

To use Employee Profile as an onboarding form, the following gaps need to be addressed:

### 1. Employee Profile → Entra write-back
The admin Employee Profile save (`employee-profile.service.ts`) currently writes only to the local database. It needs to also push mapped fields to Entra, similar to how `user-profile.service.ts` does for My Profile.

### 2. New user creation flow
While `internal-contact-sync.service.ts` can create Entra users, there is no UI flow to create a brand-new employee from the Employee Profile screen and have it automatically provision an Entra account.

### 3. Field ownership clarity
Need to define which system is the "source of truth" for each field during onboarding vs. ongoing updates:
- Who owns `jobTitle` — HR entering it in EMS, or IT setting it in Entra?
- What happens if both systems are updated independently?
- Should certain fields be locked in EMS after initial Entra sync?

### 4. Required Entra fields for user creation
Creating an Entra user requires at minimum:
- `displayName`
- `userPrincipalName`
- `mailNickname`
- `accountEnabled`
- `passwordProfile` (temporary password)

The Employee Profile form may need additional required fields for this flow.

### 5. Permissions / Graph API scopes
Current app registration needs `User.ReadWrite.All` (application permission) for write-back. This is already configured for contact sync — confirm it covers the onboarding scenario.

## Estimated Effort

| Task | Scope |
|------|-------|
| Add Entra write-back to Employee Profile save | Medium — reuse existing sync service patterns |
| Add "Create New Employee" flow with Entra provisioning | Medium-Large — new UI + backend orchestration |
| Field ownership / conflict resolution rules | Design decision needed |
| Testing with Entra sandbox tenant | Required before production |

## Risks

- **Conflict resolution:** Without clear field ownership, bidirectional sync can cause data ping-pong
- **Permissions:** App-only Graph writes require admin-consented `User.ReadWrite.All`
- **Audit trail:** All Entra writes should be logged for compliance
- **Rate limits:** Microsoft Graph has throttling limits for batch user operations

## Recommendation

The foundation for bidirectional sync already exists. The most practical path:

1. **Short-term:** Extend `employee-profile.service.ts` to call the existing sync service for write-back on save (similar to `user-profile.service.ts` pattern)
2. **Medium-term:** Add a "Create Employee in Entra" action to the Employee Profile screen, reusing `internal-contact-sync.service.ts` user creation logic
3. **Long-term:** Define field ownership rules and implement conflict detection
