import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
    Cpu,
    Database,
    ArrowRight,
    Maximize2,
    Minimize2,
    ShieldCheck,
    AlertCircle,
    Code2,
} from 'lucide-react';
import {
    sendAiChat,
    fetchAiSettings,
    type ChatMessage,
    type ChatResponse,
    type ToolCallRecord,
    type AiProvider,
} from '@/api/aiApi';
import { AiSettingsPanel } from './AiSettingsPanel';
import { Modal } from '@/components/ems/Primitives';
import { friendlyApiError } from '@/lib/friendlyApiError';

interface DisplayMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolsUsed?: ToolCallRecord[];
    timestamp: Date;
    model?: string;
    provider?: AiProvider;
}

const STARTER_PROMPTS = [
    'What projects are currently in Confirmed status for 2026?',
    'Find top 5 venues in New York by capacity',
    'Show summary of recent daily ticket sales and gross revenue',
    'List promoter companies and their main contact people',
];

export function AskAiSlider({ addToast }: { addToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
    const [isExpandedWidth, setIsExpandedWidth] = useState(false);

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
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 150);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, messages]);

    const chatMutation = useMutation({
        mutationFn: async (chatHistory: ChatMessage[]) => {
            return sendAiChat(chatHistory, {
                providerOverride: selectedProvider,
                modelOverride: selectedModel,
            });
        },
        onSuccess: (res: ChatResponse) => {
            const assistantMsg: DisplayMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: res.answer,
                toolsUsed: res.toolsUsed,
                timestamp: new Date(),
                model: res.model,
                provider: res.provider,
            };
            setMessages((prev) => [...prev, assistantMsg]);
        },
        onError: (err: any) => {
            const errorMsg: DisplayMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: `⚠️ **Error generating response**: ${friendlyApiError(err)}.\n\n*Please ensure your API key is configured in AI Settings.*`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        },
    });

    const handleSend = (textToSend?: string) => {
        const promptText = (textToSend ?? input).trim();
        if (!promptText || chatMutation.isPending) return;

        const userMsg: DisplayMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: promptText,
            timestamp: new Date(),
        };

        const newHistory: DisplayMessage[] = [...messages, userMsg];
        setMessages(newHistory);
        setInput('');

        // Format chat payload
        const payload: ChatMessage[] = newHistory.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        chatMutation.mutate(payload);
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

    const activeProviderKey = selectedProvider === 'openai' ? settings?.hasOpenaiKey : settings?.hasAnthropicKey;

    return (
        <>
            {/* ─── Floating Trigger Button (Bottom Right) ────────────────────────── */}
            <div className="fixed bottom-5 right-6 z-40 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
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
                        className={`flex flex-col h-full bg-background border-l border-border shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${isExpandedWidth ? 'w-full sm:w-[760px]' : 'w-full sm:w-[500px]'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/80 backdrop-blur">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-md bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-sm">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-semibold text-sm text-text-primary">NKU AI Assistant</h2>
                                        <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.2 rounded-full bg-elevated border border-border text-text-secondary">
                                            {selectedProvider === 'openai' ? 'OpenAI' : 'Claude'} · {selectedModel || 'Default'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> Grounded in live API & database
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setIsExpandedWidth(!isExpandedWidth)}
                                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                                    title={isExpandedWidth ? 'Collapse width' : 'Expand width'}
                                >
                                    {isExpandedWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMessages([])}
                                    disabled={messages.length === 0}
                                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-hover transition-colors disabled:opacity-30"
                                    title="Clear chat history"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowSettingsModal(true)}
                                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                                    title="AI Configuration & Model Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                                    title="Close popup"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Missing Key Banner */}
                        {!activeProviderKey && (
                            <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
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

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="py-6 space-y-6 text-center">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1.5 max-w-sm mx-auto">
                                        <h3 className="font-semibold text-base text-text-primary">How can I help you today?</h3>
                                        <p className="text-xs text-text-muted leading-relaxed">
                                            Ask anything about touring projects, engagements, ticket sales, venues, promoter companies, or policies.
                                        </p>
                                    </div>

                                    <div className="space-y-2 text-left max-w-md mx-auto">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-1">
                                            Suggested Prompts
                                        </p>
                                        <div className="space-y-1.5">
                                            {STARTER_PROMPTS.map((prompt) => (
                                                <button
                                                    key={prompt}
                                                    type="button"
                                                    onClick={() => handleSend(prompt)}
                                                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-hover text-xs text-text-primary text-left transition-colors group"
                                                >
                                                    <span>{prompt}</span>
                                                    <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-ems-accent group-hover:translate-x-0.5 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
                                    >
                                        <div
                                            className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'bg-ems-accent text-background font-medium rounded-tr-none'
                                                    : 'bg-card border border-border text-text-primary rounded-tl-none'
                                                }`}
                                        >
                                            {/* Message Content with simple Markdown rendering */}
                                            <div className="whitespace-pre-wrap break-words space-y-1.5">
                                                {msg.content}
                                            </div>

                                            {/* Tool Execution Disclosures (Grounding Telemetry) */}
                                            {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                                                <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                                                        <Database className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
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
                                                                        <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold">
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

                                        {/* Metadata & Copy Action */}
                                        <div className="flex items-center gap-2 px-1 text-[10px] text-text-muted">
                                            <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {msg.role === 'assistant' && (
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
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}

                            {chatMutation.isPending && (
                                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-card border border-border text-xs text-text-secondary w-fit animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin text-ems-accent" />
                                    <span>Searching EMS API & querying live data...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Footer / Input Area */}
                        <div className="p-3 border-t border-border bg-surface space-y-2">
                            <div className="relative flex items-center">
                                <textarea
                                    ref={textareaRef}
                                    rows={2}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Ask a question about projects, venues, sales, or contracts... (Enter to send)"
                                    className="w-full resize-none rounded-xl bg-background border border-border px-3.5 py-2.5 pr-12 text-xs sm:text-sm text-text-primary focus:outline-none focus:border-ems-accent shadow-inner leading-relaxed"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || chatMutation.isPending}
                                    className="absolute right-2 bottom-2.5 p-2 rounded-lg bg-ems-accent text-background disabled:opacity-40 hover:bg-ems-accent/90 transition-all shadow-sm"
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
                                <div className="flex items-center gap-2">
                                    <span>Model:</span>
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
                                            <option value="anthropic:claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</option>
                                            <option value="anthropic:claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                                            <option value="anthropic:claude-3-haiku-20240307">Claude 3 Haiku</option>
                                            <option value="anthropic:claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                                            <option value="anthropic:claude-3-opus-20240229">Claude 3 Opus</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span>Shift+Enter for newline</span>
                                </div>
                            </div>
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
