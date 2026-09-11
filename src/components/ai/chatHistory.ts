import type { AiProvider, ToolCallRecord } from '@/api/aiApi';

export interface DisplayMessage {
    id: string;
    logId?: string;
    role: 'user' | 'assistant';
    content: string;
    toolsUsed?: ToolCallRecord[];
    timestamp: Date;
    model?: string;
    provider?: AiProvider;
    feedback?: 'thumbs_up' | 'thumbs_down';
}

export interface Conversation {
    id: string;
    title: string;
    messages: DisplayMessage[];
    createdAt: number;
    updatedAt: number;
}

const MAX_CONVERSATIONS = 50;
const TITLE_MAX_LENGTH = 60;

const storageKey = (userKey?: string) => `ems.ai.chats.v1:${userKey || 'anonymous'}`;

export const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function titleFromPrompt(text: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > TITLE_MAX_LENGTH ? `${clean.slice(0, TITLE_MAX_LENGTH - 1)}…` : clean || 'New chat';
}

/** Chats are kept per signed-in account in this browser's localStorage. */
export function loadConversations(userKey?: string): Conversation[] {
    try {
        const raw = localStorage.getItem(storageKey(userKey));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((c: Conversation) => ({
            ...c,
            messages: (c.messages ?? []).map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
    } catch {
        return [];
    }
}

export function saveConversations(userKey: string | undefined, conversations: Conversation[]): void {
    let trimmed = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
    // On quota errors keep dropping the oldest half until the history fits.
    while (true) {
        try {
            localStorage.setItem(storageKey(userKey), JSON.stringify(trimmed));
            return;
        } catch {
            if (trimmed.length <= 1) return;
            trimmed = trimmed.slice(0, Math.floor(trimmed.length / 2));
        }
    }
}

export function groupConversations(list: Conversation[], now = new Date()): { label: string; items: Conversation[] }[] {
    const DAY = 86_400_000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const groups = [
        { label: 'Today', min: startOfToday },
        { label: 'Yesterday', min: startOfToday - DAY },
        { label: 'Previous 7 days', min: startOfToday - 7 * DAY },
        { label: 'Older', min: -Infinity },
    ];
    const buckets = groups.map((g) => ({ label: g.label, items: [] as Conversation[] }));
    for (const c of [...list].sort((a, b) => b.updatedAt - a.updatedAt)) {
        buckets[groups.findIndex((g) => c.updatedAt >= g.min)].items.push(c);
    }
    return buckets.filter((b) => b.items.length > 0);
}

export function formatConversationTime(ts: number, now = new Date()): string {
    const d = new Date(ts);
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    });
}

export function matchesSearch(c: Conversation, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q));
}
