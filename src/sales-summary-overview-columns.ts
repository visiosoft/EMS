const OVERVIEW_TABLE_PATCH_FLAG = '__iaeSalesSummaryOverviewColumnsInstalled';
const OVERVIEW_TABLE_RAF_FLAG = '__iaeSalesSummaryOverviewColumnsRaf';
const OVERVIEW_TABLE_OBSERVER_FLAG = '__iaeSalesSummaryOverviewColumnsObserver';
const OVERVIEW_STYLE_ID = 'iae-sales-summary-overview-columns-style';
const OVERVIEW_GROUP_ROW_ATTR = 'data-iae-overview-group-row';
const OVERVIEW_COLUMN_KEY_ATTR = 'data-iae-overview-column-key';
const OVERVIEW_TABLE_ATTR = 'data-iae-overview-table';

type OverviewPatchWindow = Window & typeof globalThis & {
  [OVERVIEW_TABLE_PATCH_FLAG]?: boolean;
  [OVERVIEW_TABLE_RAF_FLAG]?: number;
  [OVERVIEW_TABLE_OBSERVER_FLAG]?: MutationObserver;
};

type OverviewColumnKey =
  | 'attraction'
  | 'eventDate'
  | 'venue'
  | 'sellableCapacity'
  | 'grossPotential'
  | 'grossSalesToDate'
  | 'totalSold'
  | 'venueCapacitySoldPct'
  | 'grossPotentialSoldPct'
  | 'yesterdayRevenue'
  | 'ticketsSoldYesterday'
  | 'grossSales7Days'
  | 'ticketsSoldPrevious7Days'
  | 'grossSales14Days'
  | 'ticketsSoldPrevious14Days'
  | 'grossUnsoldRevenue'
  | 'unsoldTickets'
  | 'actions';

const OVERVIEW_ORIGINAL_COLUMN_ORDER: OverviewColumnKey[] = [
  'attraction',
  'eventDate',
  'venue',
  'sellableCapacity',
  'grossPotential',
  'grossSalesToDate',
  'totalSold',
  'venueCapacitySoldPct',
  'grossPotentialSoldPct',
  'yesterdayRevenue',
  'ticketsSoldYesterday',
  'grossSales7Days',
  'ticketsSoldPrevious7Days',
  'grossSales14Days',
  'ticketsSoldPrevious14Days',
  'grossUnsoldRevenue',
  'unsoldTickets',
  'actions',
];

const OVERVIEW_TARGET_COLUMN_ORDER: OverviewColumnKey[] = [
  'attraction',
  'eventDate',
  'venue',
  'sellableCapacity',
  'grossPotential',
  'totalSold',
  'grossSalesToDate',
  'venueCapacitySoldPct',
  'grossPotentialSoldPct',
  'ticketsSoldYesterday',
  'yesterdayRevenue',
  'ticketsSoldPrevious7Days',
  'grossSales7Days',
  'ticketsSoldPrevious14Days',
  'grossSales14Days',
  'unsoldTickets',
  'grossUnsoldRevenue',
  'actions',
];

const OVERVIEW_METRIC_COLUMN_ORDER = OVERVIEW_TARGET_COLUMN_ORDER.filter(
  (key) => key !== 'attraction' && key !== 'eventDate' && key !== 'venue' && key !== 'actions',
);

const OVERVIEW_HEADER_LABELS: Partial<Record<OverviewColumnKey, string>> = {
  sellableCapacity: 'Sellable Capacity',
  grossPotential: 'Gross Potential $',
  totalSold: 'Total Tickets Sold To Date',
  grossSalesToDate: 'Total Sales $ To Date',
  venueCapacitySoldPct: '% of Seats Sold',
  grossPotentialSoldPct: '% of $ Potential Sold',
  ticketsSoldYesterday: 'Total Tickets Sold Yesterday',
  yesterdayRevenue: 'Total $ Sold Yesterday',
  ticketsSoldPrevious7Days: '7 Day Total Tickets Sold',
  grossSales7Days: '7 Day $ Sold',
  ticketsSoldPrevious14Days: '14 Day Total Tickets Sold',
  grossSales14Days: '14 Day $ Sold',
  unsoldTickets: 'Total Unsold Tickets',
  grossUnsoldRevenue: 'Total Unsold $',
};

const OVERVIEW_COLUMN_GROUPS: Array<{ label: string; keys: OverviewColumnKey[] }> = [
  { label: 'Total Inventory', keys: ['sellableCapacity', 'grossPotential'] },
  { label: 'Lifetime', keys: ['totalSold', 'grossSalesToDate', 'venueCapacitySoldPct', 'grossPotentialSoldPct'] },
  { label: "Yesterday's Wrap", keys: ['ticketsSoldYesterday', 'yesterdayRevenue'] },
  { label: 'Seven-Day Wrap', keys: ['ticketsSoldPrevious7Days', 'grossSales7Days'] },
  { label: 'Fourteen-Day Wrap', keys: ['ticketsSoldPrevious14Days', 'grossSales14Days'] },
  { label: 'Unsold Inventory & Value', keys: ['unsoldTickets', 'grossUnsoldRevenue'] },
];

function textOf(node: Element | null | undefined): string {
  return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function installOverviewWorkbookStyles() {
  if (typeof document === 'undefined' || document.getElementById(OVERVIEW_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = OVERVIEW_STYLE_ID;
  style.textContent = `
    table[${OVERVIEW_TABLE_ATTR}="1"] { border-collapse: collapse !important; }
    table[${OVERVIEW_TABLE_ATTR}="1"] thead { background: #eeeeee !important; }
    table[${OVERVIEW_TABLE_ATTR}="1"] thead th {
      background: #eeeeee !important;
      border-color: #111827 !important;
      border-style: solid !important;
      border-width: 1px !important;
      color: #111827 !important;
      font-size: 11px !important;
      font-style: normal !important;
      font-weight: 700 !important;
      line-height: 1.15 !important;
      min-height: 38px !important;
      text-align: center !important;
      vertical-align: middle !important;
      white-space: normal !important;
    }
    table[${OVERVIEW_TABLE_ATTR}="1"] thead th > button {
      color: #111827 !important;
      font-size: 11px !important;
      font-style: normal !important;
      font-weight: 700 !important;
      justify-content: center !important;
      line-height: 1.15 !important;
      min-height: 38px !important;
      text-align: center !important;
      width: 100% !important;
    }
    table[${OVERVIEW_TABLE_ATTR}="1"] thead th > button > span,
    table[${OVERVIEW_TABLE_ATTR}="1"] thead th span {
      font-style: normal !important;
      white-space: normal !important;
    }
    table[${OVERVIEW_TABLE_ATTR}="1"] tr[${OVERVIEW_GROUP_ROW_ATTR}="1"] th {
      border-bottom-width: 2px !important;
      padding-bottom: 4px !important;
      padding-top: 4px !important;
    }
    table[${OVERVIEW_TABLE_ATTR}="1"] tbody td {
      border-color: #d1d5db !important;
      border-style: solid !important;
      border-width: 0 1px 1px 1px !important;
    }
  `;
  document.head.appendChild(style);
}

function overviewColumnKey(node: Element): OverviewColumnKey | null {
  const value = node.getAttribute(OVERVIEW_COLUMN_KEY_ATTR) as OverviewColumnKey | null;
  return value && OVERVIEW_TARGET_COLUMN_ORDER.includes(value) ? value : null;
}

function setOverviewColumnKey(node: Element, key: OverviewColumnKey) {
  if (node.getAttribute(OVERVIEW_COLUMN_KEY_ATTR) !== key) {
    node.setAttribute(OVERVIEW_COLUMN_KEY_ATTR, key);
  }
}

function assignOverviewKeysByPosition(nodes: Element[], keys: OverviewColumnKey[]) {
  nodes.forEach((node, index) => {
    if (!overviewColumnKey(node) && keys[index]) {
      setOverviewColumnKey(node, keys[index]);
    }
  });
}

function keyedOverviewChildren<T extends Element>(parent: ParentNode): Map<OverviewColumnKey, T> {
  const byKey = new Map<OverviewColumnKey, T>();
  Array.from(parent.children).forEach((child) => {
    const key = overviewColumnKey(child);
    if (key) byKey.set(key, child as T);
  });
  return byKey;
}

function overviewChildKeys(parent: ParentNode): Array<OverviewColumnKey | null> {
  return Array.from(parent.children).map((child) => overviewColumnKey(child));
}

function overviewOrderMatches(parent: ParentNode, order: OverviewColumnKey[]) {
  const keys = overviewChildKeys(parent).filter((key): key is OverviewColumnKey => key != null);
  if (keys.length !== order.length) return false;
  return order.every((key, index) => keys[index] === key);
}

function reorderOverviewChildren(parent: Element, order: OverviewColumnKey[]) {
  if (overviewOrderMatches(parent, order)) return;
  const byKey = keyedOverviewChildren<Element>(parent);
  order.forEach((key) => {
    const child = byKey.get(key);
    if (child) parent.appendChild(child);
  });
}

function isSalesSummaryOverviewTable(table: HTMLTableElement): boolean {
  const headText = textOf(table.tHead ?? table.querySelector('thead'));
  const hasOriginalHeaders =
    headText.includes('Opening Performance Date') &&
    headText.includes('Gross Sales To Date') &&
    headText.includes('Tickets Sold Yesterday') &&
    headText.includes('Gross Unsold Revenue');
  const hasWorkbookHeaders =
    headText.includes('Total Inventory') &&
    headText.includes('Gross Potential $') &&
    headText.includes('Total Unsold Tickets');
  return hasOriginalHeaders || hasWorkbookHeaders;
}

function applyOverviewHeaderLabel(th: HTMLTableCellElement) {
  const key = overviewColumnKey(th);
  const label = key ? OVERVIEW_HEADER_LABELS[key] : undefined;
  if (!label) return;

  const button = th.querySelector('button');
  const labelSpan = button?.querySelector('span');
  if (labelSpan && labelSpan.textContent !== label) {
    labelSpan.textContent = label;
  } else if (!labelSpan && button && button.textContent !== label) {
    button.textContent = label;
  } else if (!button && th.textContent !== label) {
    th.textContent = label;
  }
  if (button && button.getAttribute('title') !== `Sort by ${label}`) {
    button.setAttribute('title', `Sort by ${label}`);
  }
}

function makeOverviewGroupCell(label: string, colSpan: number): HTMLTableCellElement {
  const th = document.createElement('th');
  th.scope = 'colgroup';
  th.colSpan = colSpan;
  th.textContent = label;
  th.className = 'px-3 py-1.5 text-center text-[11px] font-semibold text-text-primary';
  return th;
}

function patchSalesSummaryOverviewTable(table: HTMLTableElement) {
  if (!isSalesSummaryOverviewTable(table)) return;

  const thead = table.tHead;
  const colgroup = table.querySelector('colgroup');
  if (!thead || !colgroup) return;

  table.setAttribute(OVERVIEW_TABLE_ATTR, '1');

  const groupRows = Array.from(thead.querySelectorAll<HTMLTableRowElement>(`tr[${OVERVIEW_GROUP_ROW_ATTR}="1"]`));
  groupRows.slice(1).forEach((row) => row.remove());
  let groupRow = groupRows[0] ?? null;
  let headerRow = Array.from(thead.rows).find((row) => row !== groupRow) ?? null;
  if (!headerRow) return;

  if (groupRow && headerRow.cells.length === OVERVIEW_ORIGINAL_COLUMN_ORDER.length) {
    groupRow.remove();
    groupRow = null;
    headerRow = thead.rows[0] ?? null;
    if (!headerRow) return;
  }

  assignOverviewKeysByPosition(Array.from(colgroup.children), OVERVIEW_ORIGINAL_COLUMN_ORDER);
  reorderOverviewChildren(colgroup, OVERVIEW_TARGET_COLUMN_ORDER);

  if (!groupRow) {
    assignOverviewKeysByPosition(Array.from(headerRow.cells), OVERVIEW_ORIGINAL_COLUMN_ORDER);

    const headerByKey = keyedOverviewChildren<HTMLTableCellElement>(headerRow);
    groupRow = document.createElement('tr');
    groupRow.setAttribute(OVERVIEW_GROUP_ROW_ATTR, '1');

    (['attraction', 'eventDate', 'venue'] as OverviewColumnKey[]).forEach((key) => {
      const th = headerByKey.get(key);
      if (!th) return;
      th.rowSpan = 2;
      groupRow?.appendChild(th);
    });

    OVERVIEW_COLUMN_GROUPS.forEach((group) => {
      groupRow?.appendChild(makeOverviewGroupCell(group.label, group.keys.length));
    });

    const actionTh = headerByKey.get('actions');
    if (actionTh) {
      actionTh.rowSpan = 2;
      groupRow.appendChild(actionTh);
    }

    thead.insertBefore(groupRow, headerRow);
  }

  Array.from(headerRow.cells).forEach(applyOverviewHeaderLabel);
  reorderOverviewChildren(headerRow, OVERVIEW_METRIC_COLUMN_ORDER);

  Array.from(table.tBodies).forEach((body) => {
    Array.from(body.rows).forEach((row) => {
      if (row.cells.length !== OVERVIEW_ORIGINAL_COLUMN_ORDER.length) return;
      assignOverviewKeysByPosition(Array.from(row.cells), OVERVIEW_ORIGINAL_COLUMN_ORDER);
      reorderOverviewChildren(row, OVERVIEW_TARGET_COLUMN_ORDER);
    });
  });
}

function patchSalesSummaryOverviewTables() {
  if (typeof document === 'undefined') return;
  installOverviewWorkbookStyles();
  document.querySelectorAll<HTMLTableElement>('table').forEach(patchSalesSummaryOverviewTable);
}

function scheduleSalesSummaryOverviewPatch() {
  if (typeof window === 'undefined') return;
  const patchedWindow = window as OverviewPatchWindow;
  if (patchedWindow[OVERVIEW_TABLE_RAF_FLAG]) return;
  patchedWindow[OVERVIEW_TABLE_RAF_FLAG] = window.requestAnimationFrame(() => {
    patchedWindow[OVERVIEW_TABLE_RAF_FLAG] = undefined;
    patchSalesSummaryOverviewTables();
  });
}

function installSalesSummaryOverviewColumnsPatch() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const patchedWindow = window as OverviewPatchWindow;
  if (patchedWindow[OVERVIEW_TABLE_PATCH_FLAG]) return;
  patchedWindow[OVERVIEW_TABLE_PATCH_FLAG] = true;

  scheduleSalesSummaryOverviewPatch();
  patchedWindow[OVERVIEW_TABLE_OBSERVER_FLAG] = new MutationObserver(scheduleSalesSummaryOverviewPatch);
  patchedWindow[OVERVIEW_TABLE_OBSERVER_FLAG]?.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

installSalesSummaryOverviewColumnsPatch();

export {};