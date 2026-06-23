# IAE Event Flow Backend (NestJS)

This backend is a NestJS API service added to the existing frontend workspace.

## 1) Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill your real DB password:

```env
PORT=3001
DB_HOST=192.168.100.181
DB_PORT=1433
DB_USERNAME=SA
DB_PASSWORD=<PASTE_YOUR_PASSWORD_HERE>
DB_NAME=master
DB_ENCRYPT=true
DB_TRUST_SERVER_CERT=true
```

## 2) Run backend

```bash
cd backend
npm run start:dev
```

## 3) Test API and DB connection

- API health: `http://localhost:3001/api` (or your `PORT` from `.env`)
- DB health (JSON): `http://localhost:3001/api/db-health`
- DB check (HTML in browser): `http://localhost:3001/api/db-check`

Expected DB health response:

```json
{
  "message": "NestJS backend is running",
  "service": "iae-event-flow-backend",
  "timestamp": "2026-04-08T00:00:00.000Z",
  "db": {
    "connected": true
  }
}
```

## 4) HubSpot sandbox contact sync

Configure `backend/.env` with a HubSpot sandbox private app token:

```env
HUBSPOT_ACCESS_TOKEN=<PASTE_SANDBOX_PRIVATE_APP_TOKEN_HERE>
HUBSPOT_SYNC_SOURCE=backend_sandbox_test
```

The HubSpot app/token needs these scopes:

```text
crm.objects.contacts.read
crm.objects.contacts.write
crm.schemas.contacts.read
crm.schemas.contacts.write
crm.objects.companies.read
crm.objects.companies.write
crm.schemas.companies.read
crm.schemas.companies.write
```

Preview eligible external contacts without writing to HubSpot:

```bash
curl -X POST "http://localhost:3001/api/internal/hubspot/contacts/sync?dryRun=true&limit=1000"
```

Run the sandbox sync:

```bash
curl -X POST "http://localhost:3001/api/internal/hubspot/contacts/sync?dryRun=false&limit=1000"
```

Company/contact creates and updates also enqueue a targeted HubSpot sync after
the database save commits. Those trigger syncs run in the background and log
warnings if HubSpot rejects or times out, so normal app saves are not blocked by
HubSpot availability.

The manual sync creates any missing IAE contact/company properties, upserts all
companies from `dbo.Company`, upserts contacts by email, and creates HubSpot
company-contact associations where contact assignments exist.
Contacts receive `firstname`, `lastname`, `email`, `phone`, `mobilephone`,
`iae_contact_sync_key`, `iae_contact_id`, `iae_contact_info_id`,
`iae_is_staff`, `iae_sync_source`, `iae_company_ids`, `iae_company_names`,
`iae_role_ids`, `iae_role_names`, `iae_department_ids`, and
`iae_department_names`. Contact upsert uses `iae_contact_sync_key`, not email,
and duplicate backend email addresses are merged into one HubSpot contact with
combined company/role/department values.
Companies receive `name`, `address`, `city`, `state`, `zip`, `country`,
`iae_company_id`, `iae_company_type_id`, `iae_company_type_name`, `iae_dma_id`,
`iae_dma_market_name`, and `iae_sync_source`.

## 5) MSSQL access (SQLCMD)

From the DB server itself:

```bash
sqlcmd -S localhost -U SA -P '<PASTE_YOUR_SA_PASSWORD>' -C
```

From your app VM/project machine (remote connection):

```bash
sqlcmd -S 192.168.100.181,1433 -U SA -P '<PASTE_YOUR_SA_PASSWORD>' -C
```

Inside `sqlcmd`, run:

```sql
SELECT @@VERSION;
GO
SELECT name FROM sys.databases;
GO
```

Exit sqlcmd:

```sql
QUIT
```

## 6) If remote connection fails

On DB server, verify SQL Server listens on 1433 and firewall allows inbound 1433.

Quick network test from app VM:

```bash
nc -zv 192.168.100.181 1433
```

If this is blocked, ask infra team to open TCP port `1433` from app VM to DB VM.

## 7) `EADDRINUSE` (port already in use)

Usually another Nest (or other) process is still bound to that port—often from a previous run or a second terminal.

- Prefer **one** backend: stop duplicates with **Ctrl+C**, or use `npm run dev:full` from the repo root once.
- Default API port is **3001** if `PORT` is unset. If your `backend/.env` still has `PORT=3000`, either remove it or change it to `3001` (or any free port).
- Free a stuck port on Linux (example for 3000):

```bash
fuser -k 3000/tcp
```

Or find the PID: `ss -tlnp | grep ':3000'` then `kill <pid>`.
