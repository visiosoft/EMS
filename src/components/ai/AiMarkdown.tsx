import React, { createContext, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';

/**
 * Renders AI assistant answers (GitHub-flavored Markdown) with EMS theme tokens.
 * Raw HTML is not rendered (react-markdown default), so model output stays safe.
 */

// Minimal hast shape — enough to inspect table cells and paragraph children.
interface HastNode {
    type: string;
    tagName?: string;
    value?: string;
    properties?: Record<string, unknown>;
    children?: HastNode[];
}

const hastText = (node?: HastNode): string =>
    !node ? '' : node.type === 'text' ? node.value ?? '' : (node.children ?? []).map(hastText).join('');

const childElements = (node: HastNode | undefined, tagName: string): HastNode[] =>
    (node?.children ?? []).filter((c) => c.type === 'element' && c.tagName === tagName);

const NUMERIC_RE = /^[-+]?[$€£]?\s?\d[\d,]*(\.\d+)?\s?%?$/;
const PLACEHOLDER_RE = /^(—|–|-|n\/a|none|not set|.*not set.*|null)?$/i;

// Identifier-like columns stay left-aligned even when their values are digits.
const IDENTIFIER_HEADER_RE = /\b(id|code|zip|postal|phone|year)\b/i;

/** Column indexes whose body cells are all numeric (placeholders like "—" are ignored). */
function numericColumns(table: HastNode | undefined): Set<number> {
    const rows = childElements(childElements(table, 'tbody')[0], 'tr');
    const headers = childElements(childElements(childElements(table, 'thead')[0], 'tr')[0], 'th').map((th) => hastText(th));
    const result = new Set<number>();
    if (rows.length === 0) return result;
    const colCount = Math.max(...rows.map((r) => childElements(r, 'td').length));
    for (let col = 0; col < colCount; col++) {
        if (IDENTIFIER_HEADER_RE.test(headers[col] ?? '') || /ID$/.test(headers[col] ?? '')) continue;
        const values = rows.map((r) => hastText(childElements(r, 'td')[col]).trim());
        const real = values.filter((v) => !PLACEHOLDER_RE.test(v));
        if (real.length > 0 && real.every((v) => NUMERIC_RE.test(v))) result.add(col);
    }
    return result;
}

const NumericColsContext = createContext<Set<number>>(new Set());

/** Injects a column index into each th/td so cells can align numbers to the right. */
function TableRow({ children }: { children?: React.ReactNode }) {
    let col = 0;
    return (
        <tr className="border-b border-border/60 last:border-0 even:bg-surface/60 hover:bg-hover/60 transition-colors">
            {React.Children.map(children, (child) =>
                React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ col?: number }>, { col: col++ }) : child,
            )}
        </tr>
    );
}

function TableCell({ header, col, children }: { header?: boolean; col?: number; children?: React.ReactNode }) {
    const numericCols = useContext(NumericColsContext);
    const numeric = col != null && numericCols.has(col);
    const align = numeric ? 'text-right tabular-nums whitespace-nowrap' : 'text-left';
    return header ? (
        <th className={`px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-secondary ${align}`}>
            {children}
        </th>
    ) : (
        <td className={`px-3 py-2 align-top text-text-primary ${align}`}>{children}</td>
    );
}

const CALLOUTS = {
    note: { icon: Info, className: 'border-ems-blue/40 bg-ems-blue/10', iconClass: 'text-ems-blue' },
    tip: { icon: Lightbulb, className: 'border-indigo-400/40 bg-indigo-500/10', iconClass: 'text-indigo-600 dark:text-indigo-300' },
    warning: { icon: AlertTriangle, className: 'border-ems-amber/40 bg-ems-amber/10', iconClass: 'text-ems-amber' },
} as const;

const CALLOUT_ALIASES: Record<string, keyof typeof CALLOUTS> = {
    note: 'note',
    info: 'note',
    tip: 'tip',
    'next step': 'tip',
    warning: 'warning',
    important: 'warning',
    caution: 'warning',
};

/** "**Note:** …" → callout kind; a paragraph that is only bold text → section title. */
function classifyParagraph(node?: HastNode): { kind: 'title' } | { kind: 'callout'; callout: keyof typeof CALLOUTS } | null {
    const kids = (node?.children ?? []).filter((c) => !(c.type === 'text' && !c.value?.trim()));
    const first = kids[0];
    if (!first || first.type !== 'element' || first.tagName !== 'strong') return null;
    if (kids.length === 1) return { kind: 'title' };
    const label = hastText(first).trim().replace(/:$/, '').toLowerCase();
    const callout = CALLOUT_ALIASES[label];
    return callout ? { kind: 'callout', callout } : null;
}

const components: Components = {
    h1: ({ children }) => <h3 className="text-[15px] font-semibold text-text-primary mt-4 first:mt-0 mb-2">{children}</h3>,
    h2: ({ children }) => <h3 className="text-[15px] font-semibold text-text-primary mt-4 first:mt-0 mb-2">{children}</h3>,
    h3: ({ children }) => <h4 className="text-sm font-semibold text-text-primary mt-4 first:mt-0 mb-1.5">{children}</h4>,
    h4: ({ children }) => (
        <h5 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mt-3 first:mt-0 mb-1">{children}</h5>
    ),
    p: ({ node, children }) => {
        const kind = classifyParagraph(node as HastNode);
        if (kind?.kind === 'title') {
            return <div className="text-[15px] font-semibold text-text-primary mt-4 first:mt-0 mb-2 [&_strong]:font-semibold">{children}</div>;
        }
        if (kind?.kind === 'callout') {
            const { icon: Icon, className, iconClass } = CALLOUTS[kind.callout];
            return (
                <div className={`flex gap-2.5 rounded-lg border px-3 py-2.5 my-3 text-[13px] leading-relaxed ${className}`}>
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
                    <div className="text-text-primary">{children}</div>
                </div>
            );
        }
        return <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>;
    },
    strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
    em: ({ children }) => <em className="italic text-text-muted">{children}</em>,
    a: ({ href, children }) => (
        <a
            href={href}
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/40 underline-offset-2 hover:decoration-indigo-500 dark:hover:decoration-indigo-300"
        >
            {children}
        </a>
    ),
    ul: ({ children }) => (
        <ul className="my-2 space-y-1 pl-5 list-disc marker:text-indigo-500 dark:marker:text-indigo-400 first:mt-0 last:mb-0">{children}</ul>
    ),
    ol: ({ children, start }) => (
        <ol start={start} className="my-2 space-y-1.5 pl-5 list-decimal marker:font-semibold marker:text-indigo-500 dark:marker:text-indigo-400 first:mt-0 last:mb-0">
            {children}
        </ol>
    ),
    li: ({ children }) => <li className="pl-1 leading-relaxed [&>ul]:my-1 [&>ol]:my-1">{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className="my-3 border-l-2 border-indigo-400/60 dark:border-indigo-500/50 bg-surface/60 rounded-r-md pl-3 pr-2 py-1.5 text-text-secondary">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-4 border-border" />,
    code: ({ children }) => (
        <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-text-primary">{children}</code>
    ),
    pre: ({ node, children }) => {
        const codeEl = childElements(node as HastNode, 'code')[0];
        const classes = (codeEl?.properties?.className as string[] | undefined) ?? [];
        const lang = classes.find((c) => c.startsWith('language-'))?.replace('language-', '');
        return (
            <div className="my-3 rounded-lg border border-border bg-surface overflow-hidden">
                {lang && (
                    <div className="px-3 py-1 border-b border-border text-[10px] font-mono uppercase tracking-wider text-text-muted bg-elevated/60">
                        {lang}
                    </div>
                )}
                <pre className="p-3 overflow-x-auto text-[11.5px] leading-relaxed font-mono [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[11.5px]">
                    {children}
                </pre>
            </div>
        );
    },
    table: ({ node, children }) => (
        <NumericColsContext.Provider value={numericColumns(node as HastNode)}>
            <div className="my-3 rounded-lg border border-border overflow-x-auto bg-card">
                <table className="w-full border-collapse text-xs">{children}</table>
            </div>
        </NumericColsContext.Provider>
    ),
    thead: ({ children }) => <thead className="bg-elevated/70 border-b border-border">{children}</thead>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    // `col` is injected by TableRow via cloneElement.
    th: (props) => (
        <TableCell header col={(props as { col?: number }).col}>
            {props.children}
        </TableCell>
    ),
    td: (props) => <TableCell col={(props as { col?: number }).col}>{props.children}</TableCell>,
};

export function AiMarkdown({ content }: { content: string }) {
    return (
        <div className="break-words text-text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
