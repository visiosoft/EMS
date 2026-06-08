const OVERVIEW_TABLE_PATCH_FLAG = '__iaeSalesSummaryOverviewColumnsInstalled';
const OVERVIEW_TABLE_RAF_FLAG = '__iaeSalesSummaryOverviewColumnsRaf';
const OVERVIEW_TABLE_OBSERVER_FLAG = '__iaeSalesSummaryOverviewColumnsObserver';
const OVERVIEW_GROUP_ROW_ATTR = 'data-iae-overview-group-row';
const OVERVIEW_COLUMN_KEY_ATTR = 'data-iae-overview-column-key';

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
    headText.includes('Gross Ticket Sales Potential') &&
    headText.includes('Cumulative Tickets Sold to Date') &&
    headText.includes('Unsold # of Tickets');
  const hasOverviewHeaders =
    headText.includes('Gross Potential $') &&
    headText.includes('Total Tickets Sold To Date') &&
    headText.includes('Total Unsold Tickets');
  return hasOriginalHeaders || hasOverviewHeaders;
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
  th.className = 'border-b border-border bg-surface/95 px-3 py-1.5 text-center text-[11px] font-semibold text-text-primary';
  return th;
}

function patchSalesSummaryOverviewTable(table: HTMLTableElement) {
  if (!isSalesSummaryOverviewTable(table)) return;

  const thead = table.tHead;
  const colgroup = table.querySelector('colgroup');
  if (!thead || !colgroup) return;

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
    groupRow.className = 'border-b border-border bg-surface/95';

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