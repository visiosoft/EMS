import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/** Whitelist: SQL Server bracket identifier without injection. */
function isSafeSqlIdent(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 128 &&
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
  );
}

/**
 * Tried in order; first name that exists on dbo.Venue (string type) wins.
 * Override with VENUE_COL_TICKETING_SYSTEM / VENUE_COL_VENUE_WEBSITE in environment.
 */
const TICKETING_STRING_COLUMN_CANDIDATES = [
  'TicketingSystem',
  'TicketingSystemName',
  'TicketingProvider',
  'TicketingProviderName',
  'TicketSystem',
  'Ticketing',
];

const WEBSITE_STRING_COLUMN_CANDIDATES = [
  'VenueWebsite',
  'TicketingURL',
  'WebsiteURL',
  'Website',
  'WebSite',
  'VenueURL',
  'URL',
];

const STRING_TYPE_NAMES = new Set([
  'char',
  'nchar',
  'varchar',
  'nvarchar',
  'text',
  'ntext',
]);

export type ResolvedVenueTicketingWebsiteColumns = {
  ticketing: string | null;
  website: string | null;
};

type StringColMap = Map<string, string>;

function pickAuto(
  candidates: string[],
  stringCols: StringColMap,
): string | null {
  for (const c of candidates) {
    const found = stringCols.get(c.toLowerCase());
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * If `env` is set, use that column name (must exist in stringCols or be a safe identifier the DBA provided).
 * If `env` is empty, use first candidate that exists on the table.
 */
function pickOne(
  env: string | undefined,
  candidates: string[],
  stringCols: StringColMap,
  label: 'ticketing' | 'venue website',
): string | null {
  const e = (env ?? '').trim();
  if (e) {
    if (!isSafeSqlIdent(e)) {
      throw new Error(
        `VENUE_COL_${label === 'ticketing' ? 'TICKETING_SYSTEM' : 'VENUE_WEBSITE'} must be a single SQL identifier (letters, numbers, _).`,
      );
    }
    const found = stringCols.get(e.toLowerCase());
    if (found) {
      return found;
    }
    // Explicit override: column name not in our sys scan (e.g. permission) — trust ident.
    return e;
  }
  return pickAuto(candidates, stringCols);
}

/**
 * Resolves dbo.Venue string columns for ticketing system and venue website.
 *
 * - `VENUE_COL_TICKETING_SYSTEM` — optional, exact column name
 * - `VENUE_COL_VENUE_WEBSITE` — optional, exact column name
 * - If unset, auto-detect from candidate lists using sys.columns (string types only)
 */
export async function resolveVenueTicketingWebsiteColumns(
  dataSource: DataSource,
  config: ConfigService,
): Promise<ResolvedVenueTicketingWebsiteColumns> {
  const fromEnvT = config.get<string>('VENUE_COL_TICKETING_SYSTEM');
  const fromEnvW = config.get<string>('VENUE_COL_VENUE_WEBSITE');

  type Row = { colName: string; typeName: string };
  const rows = await dataSource.query(
    `SELECT c.name AS colName, t.name AS typeName
     FROM sys.columns c
     INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
     INNER JOIN sys.tables tb ON c.object_id = tb.object_id
     INNER JOIN sys.schemas s ON tb.schema_id = s.schema_id
     WHERE s.name = 'dbo' AND tb.name = 'Venue'`,
  );

  const stringCols: StringColMap = new Map();
  for (const r of rows) {
    const col = r.colName != null ? String(r.colName) : '';
    const typ = (r.typeName != null ? String(r.typeName) : '').toLowerCase();
    if (!col || !STRING_TYPE_NAMES.has(typ)) {
      continue;
    }
    stringCols.set(col.toLowerCase(), col);
  }

  return {
    ticketing: pickOne(
      fromEnvT,
      TICKETING_STRING_COLUMN_CANDIDATES,
      stringCols,
      'ticketing',
    ),
    website: pickOne(
      fromEnvW,
      WEBSITE_STRING_COLUMN_CANDIDATES,
      stringCols,
      'venue website',
    ),
  };
}
