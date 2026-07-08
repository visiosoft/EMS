"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVenueTicketingWebsiteColumns = resolveVenueTicketingWebsiteColumns;
function isSafeSqlIdent(name) {
    return (name.length > 0 &&
        name.length <= 128 &&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
}
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
function pickAuto(candidates, stringCols) {
    for (const c of candidates) {
        const found = stringCols.get(c.toLowerCase());
        if (found) {
            return found;
        }
    }
    return null;
}
function pickOne(env, candidates, stringCols, label) {
    const e = (env ?? '').trim();
    if (e) {
        if (!isSafeSqlIdent(e)) {
            throw new Error(`VENUE_COL_${label === 'ticketing' ? 'TICKETING_SYSTEM' : 'VENUE_WEBSITE'} must be a single SQL identifier (letters, numbers, _).`);
        }
        const found = stringCols.get(e.toLowerCase());
        if (found) {
            return found;
        }
        return e;
    }
    return pickAuto(candidates, stringCols);
}
async function resolveVenueTicketingWebsiteColumns(dataSource, config) {
    const fromEnvT = config.get('VENUE_COL_TICKETING_SYSTEM');
    const fromEnvW = config.get('VENUE_COL_VENUE_WEBSITE');
    const rows = await dataSource.query(`SELECT c.name AS colName, t.name AS typeName
     FROM sys.columns c
     INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
     INNER JOIN sys.tables tb ON c.object_id = tb.object_id
     INNER JOIN sys.schemas s ON tb.schema_id = s.schema_id
     WHERE s.name = 'dbo' AND tb.name = 'Venue'`);
    const stringCols = new Map();
    for (const r of rows) {
        const col = r.colName != null ? String(r.colName) : '';
        const typ = (r.typeName != null ? String(r.typeName) : '').toLowerCase();
        if (!col || !STRING_TYPE_NAMES.has(typ)) {
            continue;
        }
        stringCols.set(col.toLowerCase(), col);
    }
    return {
        ticketing: pickOne(fromEnvT, TICKETING_STRING_COLUMN_CANDIDATES, stringCols, 'ticketing'),
        website: pickOne(fromEnvW, WEBSITE_STRING_COLUMN_CANDIDATES, stringCols, 'venue website'),
    };
}
//# sourceMappingURL=venue-ticketing-columns.resolver.js.map