import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import {
    Sparkles,
    Send,
    Loader2,
    X,
    Settings,
    Trash2,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    Database,
    Maximize2,
    Minimize2,
    AlertCircle,
    Code2,
    ThumbsUp,
    ThumbsDown,
    Menu,
    Plus,
    Search,
    MessageSquare,
    FileText,
    Layers,
    BarChart3,
    LineChart,
    ClipboardList,
    Users,
    type LucideIcon,
} from 'lucide-react';
import {
    sendAiChat,
    fetchAiSettings,
    sendAiFeedback,
    type ChatMessage,
    type ChatResponse,
    type AiProvider,
} from '@/api/aiApi';
import { AiSettingsPanel } from './AiSettingsPanel';
import { AiMarkdown } from './AiMarkdown';
import {
    type Conversation,
    type DisplayMessage,
    formatConversationTime,
    groupConversations,
    loadConversations,
    matchesSearch,
    newId,
    saveConversations,
    titleFromPrompt,
} from './chatHistory';
import { Modal } from '@/components/ems/Primitives';
import { friendlyApiError } from '@/lib/friendlyApiError';

interface StarterPrompt {
    label: string;
    text: string;
    category: 'Guide' | 'Data';
    icon: LucideIcon;
}

const STARTER_PROMPTS: StarterPrompt[] = [
    { label: 'Add a new venue & set seating capacity', text: 'How do I add a new venue and set seating capacity?', category: 'Guide', icon: FileText },
    { label: 'Top 5 venues in New York by capacity', text: 'Find top 5 venues in New York by seating capacity', category: 'Data', icon: BarChart3 },
    { label: 'Recent daily ticket sales & revenue', text: 'Show summary of recent daily ticket sales and revenue', category: 'Data', icon: LineChart },
    { label: 'Create a tour project & pitch venues', text: 'How do I create a tour project and pitch venues?', category: 'Guide', icon: Layers },
    { label: 'Record daily sales for an engagement', text: 'How do I record daily sales for an engagement?', category: 'Guide', icon: ClipboardList },
    { label: 'Promoter companies & main contacts', text: 'List promoter companies and their main contact people', category: 'Data', icon: Users },
];

const CATEGORY_BADGE: Record<StarterPrompt['category'], string> = {
    Guide: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
    Data: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
};

const NO_MESSAGES: DisplayMessage[] = [];

interface ChatRequest {
    conversationId: string;
    history: ChatMessage[];
}

export function AskAiSlider({ addToast }: { addToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
    const [isExpandedWidth, setIsExpandedWidth] = useState(false);

    // ─── Conversations (saved per signed-in account in localStorage) ─────────
    const { accounts } = useMsal();
    const userKey = accounts[0]?.homeAccountId;
    const [store, setStore] = useState(() => ({ userKey, conversations: loadConversations(userKey) }));
    if (store.userKey !== userKey) {
        setStore({ userKey, conversations: loadConversations(userKey) });
    }
    const conversations = store.conversations;
    const [activeId, setActiveId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [confirmClearAll, setConfirmClearAll] = useState(false);

    const activeConversation = conversations.find((c) => c.id === activeId);
    const messages = activeConversation?.messages ?? NO_MESSAGES;

    useEffect(() => {
        saveConversations(store.userKey, store.conversations);
    }, [store]);

    const updateConversations = (updater: (list: Conversation[]) => Conversation[]) =>
        setStore((prev) => ({ ...prev, conversations: updater(prev.conversations) }));

    const appendMessage = (conversationId: string, message: DisplayMessage) =>
        updateConversations((list) =>
            list.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() } : c)),
        );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: settings } = useQuery({
        queryKey: ['ai-settings'],
        queryFn: fetchAiSettings,
        staleTime: 60 * 1000,
    });

    const [selectedProvider, setSelectedProvider] = useState<AiProvider | undefined>(undefined);
    const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (settings) {
            if (!selectedProvider) setSelectedProvider(settings.provider);
            if (!selectedModel) setSelectedModel(settings.model);
        }
    }, [settings, selectedProvider, selectedModel]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Space or Ctrl+J to toggle Ask AI
            if ((e.ctrlKey && e.code === 'Space') || (e.ctrlKey && e.key.toLowerCase() === 'j')) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && !historyOpen) {
            setTimeout(() => textareaRef.current?.focus(), 150);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, historyOpen, activeId, messages]);

    const handleFeedback = async (logId?: string, feedback?: 'thumbs_up' | 'thumbs_down', msgId?: string) => {
        if (!logId || !feedback || !msgId || !activeId) return;
        const conversationId = activeId;
        updateConversations((list) =>
            list.map((c) =>
                c.id === conversationId
                    ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, feedback } : m)) }
                    : c,
            ),
        );
        try {
            await sendAiFeedback({ logId, feedback });
            if (addToast) addToast(`Feedback saved (${feedback === 'thumbs_up' ? '👍' : '👎'})`, 'success');
        } catch (err) {
            console.error('Failed to submit feedback:', err);
        }
    };

    const chatMutation = useMutation({
        mutationFn: async ({ history }: ChatRequest) => {
            return sendAiChat(history, {
                providerOverride: selectedProvider,
                modelOverride: selectedModel,
            });
        },
        onSuccess: (res: ChatResponse, { conversationId }) => {
            appendMessage(conversationId, {
                id: newId('msg'),
                logId: res.id,
                role: 'assistant',
                content: res.answer,
                toolsUsed: res.toolsUsed,
                timestamp: new Date(),
                model: res.model,
                provider: res.provider,
            });
        },
        onError: (err: any, { conversationId }) => {
            appendMessage(conversationId, {
                id: newId('msg'),
                role: 'assistant',
                content: `⚠️ **Error generating response**: ${friendlyApiError(err)}.\n\n*Please ensure your API key is configured in AI Settings.*`,
                timestamp: new Date(),
            });
        },
    });

    const isActiveChatPending = chatMutation.isPending && chatMutation.variables?.conversationId === activeId;

    const handleSend = (textToSend?: string) => {
        const promptText = (textToSend ?? input).trim();
        if (!promptText || chatMutation.isPending) return;

        const userMsg: DisplayMessage = {
            id: newId('msg'),
            role: 'user',
            content: promptText,
            timestamp: new Date(),
        };

        let conversationId: string;
        let history: DisplayMessage[];
        if (activeConversation) {
            conversationId = activeConversation.id;
            history = [...activeConversation.messages, userMsg];
            appendMessage(conversationId, userMsg);
        } else {
            conversationId = newId('chat');
            history = [userMsg];
            const now = Date.now();
            updateConversations((list) => [
                { id: conversationId, title: titleFromPrompt(promptText), messages: [userMsg], createdAt: now, updatedAt: now },
                ...list,
            ]);
            setActiveId(conversationId);
        }
        setInput('');
        setHistoryOpen(false);

        chatMutation.mutate({
            conversationId,
            history: history.map((m) => ({ role: m.role, content: m.content })),
        });
    };

    const startNewChat = () => {
        setActiveId(null);
        setInput('');
        setHistoryOpen(false);
    };

    const openConversation = (id: string) => {
        setActiveId(id);
        setHistoryOpen(false);
    };

    const deleteConversation = (id: string) => {
        updateConversations((list) => list.filter((c) => c.id !== id));
        if (activeId === id) setActiveId(null);
    };

    const clearAllConversations = () => {
        updateConversations(() => []);
        setActiveId(null);
        setConfirmClearAll(false);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        addToast?.('Copied to clipboard', 'info');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleToolExpanded = (msgId: string, toolIdx: number) => {
        const key = `${msgId}_${toolIdx}`;
        setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const historyGroups = useMemo(
        () => groupConversations(conversations.filter((c) => matchesSearch(c, historySearch))),
        [conversations, historySearch],
    );

    const activeProviderKey = selectedProvider === 'openai' ? settings?.hasOpenaiKey : settings?.hasAnthropicKey;

    const headerButton = 'p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors';

    return (
        <>
            {/* ─── Floating Trigger Button (Bottom Right) ────────────────────────── */}
            <div className="fixed bottom-5 right-6 z-40 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-medium text-sm shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                    title="Ask AI Assistant (Ctrl+Space)"
                >
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
                    <span>Ask AI</span>
                    <span className="hidden sm:inline-block text-[10px] font-mono opacity-80 bg-white/20 px-1.5 py-0.5 rounded">
                        Ctrl+Space
                    </span>
                </button>
            </div>

            {/* ─── Slider Drawer / Sheet ─────────────────────────────────────────── */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in">
                    <div
                        className={`flex flex-col h-full sm:h-[calc(100%-1.5rem)] sm:my-3 sm:mr-3 bg-background sm:border sm:border-border sm:rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${isExpandedWidth ? 'w-full sm:w-[760px]' : 'w-full sm:w-[500px]'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-border shrink-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setHistoryOpen((v) => !v)}
                                    className={`${headerButton} shrink-0 ${historyOpen ? 'bg-hover text-text-primary' : ''}`}
                                    title="Chat history"
                                >
                                    <Menu className="w-4 h-4" />
                                </button>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-sm text-text-primary truncate">NKU Assistant</h2>
                                    <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        Connected to live data
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsExpandedWidth(!isExpandedWidth)}
                                    className={headerButton}
                                    title={isExpandedWidth ? 'Collapse width' : 'Expand width'}
                                >
                                    {isExpandedWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowSettingsModal(true)}
                                    className={headerButton}
                                    title="AI Configuration & Model Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>

                                <button type="button" onClick={() => setIsOpen(false)} className={headerButton} title="Close popup">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Missing Key Banner */}
                        {!activeProviderKey && (
                            <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 shrink-0">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>No {selectedProvider === 'openai' ? 'OpenAI' : 'Claude'} API key configured.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowSettingsModal(true)}
                                    className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-200"
                                >
                                    Configure Key →
                                </button>
                            </div>
                        )}

                        {/* Active chat title */}
                        {activeConversation && (
                            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border/60 text-[11px] text-text-muted shrink-0">
                                <MessageSquare className="w-3 h-3 shrink-0" />
                                <span className="truncate">{activeConversation.title}</span>
                            </div>
                        )}

                        {/* Body: chat column, with the history drawer overlaid on top */}
                        <div className="relative flex-1 flex flex-col min-h-0">
                            {/* Chat Body */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center text-center pt-6 pb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-5">
                                            <Sparkles className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-text-primary mb-2">How can I help?</h3>
                                        <p className="text-sm text-text-muted max-w-xs leading-relaxed mb-6">
                                            Ask about tour projects, venues, ticket sales, promoters, or policies — I read straight from the live system.
                                        </p>

                                        <div className="w-full text-left space-y-2">
                                            <p className="text-xs text-text-muted px-1">Try one of these</p>
                                            <div className="space-y-2">
                                                {STARTER_PROMPTS.map((item) => (
                                                    <button
                                                        key={item.text}
                                                        type="button"
                                                        onClick={() => handleSend(item.text)}
                                                        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:bg-hover text-left transition-colors"
                                                    >
                                                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${CATEGORY_BADGE[item.category]}`}>
                                                            <item.icon className="w-4 h-4" />
                                                        </span>
                                                        <span className="text-xs sm:text-[13px] font-medium text-text-primary">{item.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {conversations.length > 0 && (
                                            <div className="w-full text-left space-y-2 mt-6">
                                                <div className="flex items-center justify-between px-1">
                                                    <p className="text-xs text-text-muted">Recent chats</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHistoryOpen(true)}
                                                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                                    >
                                                        View all
                                                    </button>
                                                </div>
                                                <div className="space-y-1">
                                                    {[...conversations]
                                                        .sort((a, b) => b.updatedAt - a.updatedAt)
                                                        .slice(0, 3)
                                                        .map((c) => (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => openConversation(c.id)}
                                                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-hover text-xs text-left transition-colors"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                                                <span className="flex-1 truncate text-text-primary">{c.title}</span>
                                                                <span className="text-[10px] text-text-muted shrink-0">
                                                                    {formatConversationTime(c.updatedAt)}
                                                                </span>
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
                                        >
                                            <div
                                                className={`rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'max-w-[90%] px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-tr-none'
                                                    : 'w-full px-4 py-3.5 bg-card border border-border text-text-primary rounded-tl-none'
                                                    }`}
                                            >
                                                {msg.role === 'assistant' ? (
                                                    <AiMarkdown content={msg.content} />
                                                ) : (
                                                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                                )}

                                                {/* Tool Execution Disclosures (Grounding Telemetry) */}
                                                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                                                    <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5">
                                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                                                            <Database className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                            <span>Grounded with {msg.toolsUsed.length} tool call{msg.toolsUsed.length > 1 ? 's' : ''}:</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            {msg.toolsUsed.map((tool, idx) => {
                                                                const isExp = expandedTools[`${msg.id}_${idx}`];
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="rounded border border-border/80 bg-surface text-[11px] font-mono overflow-hidden"
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleToolExpanded(msg.id, idx)}
                                                                            className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-hover transition-colors"
                                                                        >
                                                                            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                                                                                <Code2 className="w-3 h-3" />
                                                                                {tool.name}
                                                                            </span>
                                                                            <div className="flex items-center gap-1 text-text-muted text-[10px]">
                                                                                {tool.executionTimeMs != null && <span>{tool.executionTimeMs}ms</span>}
                                                                                {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                            </div>
                                                                        </button>

                                                                        {isExp && (
                                                                            <div className="p-2 border-t border-border/60 bg-elevated space-y-1.5 text-[10px] text-text-secondary max-h-48 overflow-y-auto">
                                                                                <div>
                                                                                    <span className="text-text-muted uppercase font-bold">Input:</span>
                                                                                    <pre className="p-1 rounded bg-surface mt-0.5 overflow-x-auto">
                                                                                        {JSON.stringify(tool.input, null, 2)}
                                                                                    </pre>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-text-muted uppercase font-bold">Output:</span>
                                                                                    <pre className="p-1 rounded bg-surface mt-0.5 overflow-x-auto whitespace-pre-wrap">
                                                                                        {tool.outputSummary}
                                                                                    </pre>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata, Copy & Feedback Actions */}
                                            <div className="flex items-center justify-between w-full px-1 text-[10px] text-text-muted">
                                                <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {msg.role === 'assistant' && (
                                                    <div className="flex items-center gap-2">
                                                        {msg.logId && (
                                                            <div className="flex items-center gap-1 border-r border-border/80 pr-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFeedback(msg.logId, 'thumbs_up', msg.id)}
                                                                    className={`p-1 rounded hover:bg-hover transition-colors ${msg.feedback === 'thumbs_up' ? 'text-emerald-500 font-bold bg-emerald-500/10' : 'hover:text-text-primary'}`}
                                                                    title="Helpful response"
                                                                >
                                                                    <ThumbsUp className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFeedback(msg.logId, 'thumbs_down', msg.id)}
                                                                    className={`p-1 rounded hover:bg-hover transition-colors ${msg.feedback === 'thumbs_down' ? 'text-rose-500 font-bold bg-rose-500/10' : 'hover:text-text-primary'}`}
                                                                    title="Not helpful response"
                                                                >
                                                                    <ThumbsDown className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(msg.content, msg.id)}
                                                            className="flex items-center gap-1 hover:text-text-primary transition-colors"
                                                        >
                                                            {copiedId === msg.id ? (
                                                                <>
                                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-emerald-500">Copied</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="w-3 h-3" />
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {isActiveChatPending && (
                                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-card border border-border text-xs text-text-secondary w-fit animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                                        <span>Searching EMS API & querying live data...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Footer / Input Area */}
                            <div className="p-3 border-t border-border space-y-2 shrink-0">
                                <div className="flex items-end gap-2 bg-surface rounded-2xl border border-border px-3 py-2 focus-within:border-indigo-400 transition-colors">
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Ask about projects, venues, sales..."
                                        className="flex-1 resize-none bg-transparent border-0 py-1.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() || chatMutation.isPending}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${input.trim() && !chatMutation.isPending
                                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                                            : 'bg-elevated text-text-muted'
                                            }`}
                                        title="Send message (Enter)"
                                    >
                                        {chatMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Quick Model Selector & Status Bar */}
                                <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                                    <select
                                        value={`${selectedProvider}:${selectedModel}`}
                                        onChange={(e) => {
                                            const [p, m] = e.target.value.split(':');
                                            setSelectedProvider(p as AiProvider);
                                            setSelectedModel(m);
                                        }}
                                        className="bg-transparent border-none text-text-primary font-medium focus:outline-none cursor-pointer text-[11px]"
                                    >
                                        <optgroup label="OpenAI">
                                            <option value="openai:gpt-4o">OpenAI · GPT-4o</option>
                                            <option value="openai:gpt-4o-mini">OpenAI · GPT-4o Mini</option>
                                            <option value="openai:o3-mini">OpenAI · o3 Mini</option>
                                        </optgroup>
                                        <optgroup label="Anthropic Claude">
                                            <option value="anthropic:claude-sonnet-4-6">Claude Sonnet 4.6 (Recommended)</option>
                                            <option value="anthropic:claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                                            <option value="anthropic:claude-opus-4-8">Claude Opus 4.8</option>
                                            <option value="anthropic:claude-opus-4-7">Claude Opus 4.7</option>
                                            <option value="anthropic:claude-opus-4-6">Claude Opus 4.6</option>
                                            <option value="anthropic:claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                                        </optgroup>
                                    </select>

                                    <span>Enter to send</span>
                                </div>
                            </div>

                            {/* ─── Chat History Drawer (slides in from the left, dims the chat) ── */}
                            {historyOpen && (
                                <div className="absolute inset-0 z-10 flex animate-in fade-in duration-150">
                                    <div className="w-[80%] max-w-[300px] h-full bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
                                            <h3 className="font-semibold text-sm text-text-primary">Chats</h3>
                                            <button
                                                type="button"
                                                onClick={() => setHistoryOpen(false)}
                                                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                                                title="Close"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="p-3 space-y-2 border-b border-border shrink-0">
                                            <button
                                                type="button"
                                                onClick={startNewChat}
                                                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                New chat
                                            </button>
                                            {conversations.length > 0 && (
                                                <div className="relative">
                                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                                    <input
                                                        type="text"
                                                        value={historySearch}
                                                        onChange={(e) => setHistorySearch(e.target.value)}
                                                        placeholder="Search chats..."
                                                        className="w-full rounded-lg bg-surface border border-border pl-8 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-indigo-400"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-y-auto px-2 py-2">
                                            {historyGroups.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-1.5">
                                                    <p className="text-sm text-text-secondary">
                                                        {historySearch ? 'No chats match your search.' : 'No saved chats yet.'}
                                                    </p>
                                                    <p className="text-xs text-text-muted">
                                                        {historySearch ? 'Try a different word.' : "Start a conversation and it'll appear here."}
                                                    </p>
                                                </div>
                                            ) : (
                                                historyGroups.map((group) => (
                                                    <div key={group.label} className="mb-3">
                                                        <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
                                                            {group.label}
                                                        </p>
                                                        <div className="space-y-0.5">
                                                            {group.items.map((c) => {
                                                                const isActive = c.id === activeId;
                                                                return (
                                                                    <div
                                                                        key={c.id}
                                                                        className={`group relative flex items-center rounded-xl transition-colors ${isActive ? 'bg-hover' : 'hover:bg-hover/70'}`}
                                                                    >
                                                                        {isActive && (
                                                                            <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-indigo-500" />
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openConversation(c.id)}
                                                                            className="flex-1 min-w-0 text-left px-3 py-2"
                                                                        >
                                                                            <p className="text-[13px] text-text-primary truncate">{c.title}</p>
                                                                            <p className="text-[11px] text-text-muted mt-0.5">
                                                                                {c.messages.length} message{c.messages.length === 1 ? '' : 's'} ·{' '}
                                                                                {formatConversationTime(c.updatedAt)}
                                                                            </p>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => deleteConversation(c.id)}
                                                                            className="mr-1.5 p-1.5 rounded-md text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                                            title="Delete chat"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {conversations.length > 0 && (
                                            <div className="flex items-center justify-end px-4 py-2.5 border-t border-border shrink-0 text-[11px] text-text-muted">
                                                {confirmClearAll ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-text-secondary">Delete all chats?</span>
                                                        <button
                                                            type="button"
                                                            onClick={clearAllConversations}
                                                            className="font-semibold text-rose-500 hover:underline"
                                                        >
                                                            Delete
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmClearAll(false)}
                                                            className="hover:text-text-primary"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmClearAll(true)}
                                                        className="flex items-center gap-1 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Clear all
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setHistoryOpen(false)}
                                        aria-label="Close chat history"
                                        className="flex-1 h-full bg-black/25 cursor-default"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── AI Settings Modal ────────────────────────────────────────────── */}
            {showSettingsModal && (
                <Modal
                    title="AI Assistant & Model Configuration"
                    onClose={() => setShowSettingsModal(false)}
                    width={720}
                >
                    <div className="p-1">
                        <AiSettingsPanel
                            addToast={addToast}
                            onSaved={() => setShowSettingsModal(false)}
                        />
                    </div>
                </Modal>
            )}
        </>
    );
}
