import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Sparkles,
    Key,
    Cpu,
    Terminal,
    Database,
    CheckCircle2,
    XCircle,
    Loader2,
    RotateCcw,
    Save,
    HelpCircle,
    Eye,
    EyeOff,
    Sliders,
    BookOpen,
    TableProperties,
    Search,
    ChevronDown,
    ChevronUp,
    Layers,
} from 'lucide-react';
import {
    fetchAiSettings,
    updateAiSettings,
    testAiConnection,
    fetchAiTools,
    fetchDefaultAiPrompt,
    fetchSchemaRules,
    updateSchemaRules,
    type AiProvider,
    type UpdateAiSettingsPayload,
    type SchemaTableRule,
} from '@/api/aiApi';
import { friendlyApiError } from '@/lib/friendlyApiError';

interface Props {
    addToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    onSaved?: () => void;
}

const PROMPT_PRESETS = [
    {
        name: 'EMS Standard Assistant',
        description: 'Balanced for general queries, booking pipeline, venues, and contacts.',
        prompt: `You are the NKU Event Management System (EMS) Intelligence Assistant.
You assist internal staff, bookers, operations, and management with accurate information regarding live events, touring attractions, engagements, venues, contracts, ticket sales, companies, and contacts.

### 🛡️ ANTI-HALLUCINATION & FACT-GROUNDING RULES:
1. Always call API tools or SQL queries before answering questions about real events, figures, or contacts.
2. If data is not found in the system, clearly say "No matching records found". Never fabricate data.
3. Ground your response in retrieved facts and cite relevant IDs, names, or dates.`,
    },
    {
        name: 'Financial & Box Office Analyst',
        description: 'Specialized for ticket sales velocity, gross potential, settlements, and performance reports.',
        prompt: `You are the NKU Event Management Financial & Box Office Analyst.
Your role is to analyze ticket sales, gross revenues, average ticket prices, capacity fill rates, and financial terms across engagements and tours.

### 🛡️ ANTI-HALLUCINATION RULES:
1. Every dollar figure and ticket count MUST come directly from retrieved API or SQL tool data.
2. When summarizing performances, provide exact gross totals, tickets sold, and remaining capacity.
3. If financial records or daily sales are absent for an event, explicitly state that data is pending settlement.`,
    },
    {
        name: 'Booking & Operations Specialist',
        description: 'Focused on venue routing, promoter contacts, hold dates, and contract terms.',
        prompt: `You are the NKU EMS Booking & Tour Operations Specialist.
Your focus is on touring routes, venue specifications, promoter contacts, agency representation, and contract fulfillment.

### 🛡️ ANTI-HALLUCINATION RULES:
1. Look up venue capacities, locations, and promoter contact information using tools.
2. Clearly distinguish between "In Progress", "Confirmed", and "Cancelled" engagements.
3. Never guess contact email addresses or phone numbers.`,
    },
];

export function AiSettingsPanel({ addToast, onSaved }: Props) {
    const queryClient = useQueryClient();

    const { data: settings, isLoading, isError, error } = useQuery({
        queryKey: ['ai-settings'],
        queryFn: fetchAiSettings,
    });

    const { data: toolsData } = useQuery({
        queryKey: ['ai-tools'],
        queryFn: fetchAiTools,
    });

    const { data: schemaData, isLoading: schemaLoading } = useQuery({
        queryKey: ['ai-schema-rules'],
        queryFn: fetchSchemaRules,
    });

    const [provider, setProvider] = useState<AiProvider>('openai');
    const [model, setModel] = useState('gpt-4o');
    const [openaiKey, setOpenaiKey] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [temperature, setTemperature] = useState(0.2);
    const [maxTokens, setMaxTokens] = useState(3000);
    const [enableSqlFallback, setEnableSqlFallback] = useState(true);
    const [enableApiTools, setEnableApiTools] = useState(true);

    // Table rules dictionary state
    const [tableRulesMap, setTableRulesMap] = useState<Record<string, string>>({});
    const [tableSearch, setTableSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

    const [showOpenaiKey, setShowOpenaiKey] = useState(false);
    const [showAnthropicKey, setShowAnthropicKey] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'schema' | 'prompt' | 'tools'>('config');

    const [testResult, setTestResult] = useState<{
        success?: boolean;
        message?: string;
        latencyMs?: number;
        testing?: boolean;
    } | null>(null);

    useEffect(() => {
        if (settings) {
            setProvider(settings.provider || 'openai');
            setModel(settings.model || (settings.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o'));
            setSystemPrompt(settings.systemPrompt || '');
            setTemperature(settings.temperature ?? 0.2);
            setMaxTokens(settings.maxTokens ?? 3000);
            setEnableSqlFallback(settings.enableSqlFallback ?? true);
            setEnableApiTools(settings.enableApiTools ?? true);
            if (settings.tableRules) {
                setTableRulesMap(settings.tableRules);
            }
        }
    }, [settings]);

    useEffect(() => {
        if (schemaData?.tables) {
            const map: Record<string, string> = {};
            for (const t of schemaData.tables) {
                map[t.tableName] = t.businessRules || '';
            }
            setTableRulesMap((prev) => ({ ...map, ...prev }));
        }
    }, [schemaData]);

    const saveMutation = useMutation({
        mutationFn: async (payload: UpdateAiSettingsPayload) => {
            const res = await updateAiSettings(payload);
            // Also update schema table rules
            await updateSchemaRules({ rules: tableRulesMap });
            return res;
        },
        onSuccess: (updated) => {
            queryClient.setQueryData(['ai-settings'], updated);
            queryClient.invalidateQueries({ queryKey: ['ai-schema-rules'] });
            addToast?.('AI settings & Schema Business Rules saved successfully', 'success');
            setOpenaiKey('');
            setAnthropicKey('');
            onSaved?.();
        },
        onError: (err) => {
            addToast?.(`Failed to save AI settings: ${friendlyApiError(err)}`, 'error');
        },
    });

    const handleSave = () => {
        const payload: UpdateAiSettingsPayload = {
            provider,
            model,
            systemPrompt,
            temperature,
            maxTokens,
            enableSqlFallback,
            enableApiTools,
            tableRules: tableRulesMap,
        };
        if (openaiKey.trim()) payload.openaiApiKey = openaiKey.trim();
        if (anthropicKey.trim()) payload.anthropicApiKey = anthropicKey.trim();

        saveMutation.mutate(payload);
    };

    const handleTestConnection = async () => {
        setTestResult({ testing: true });
        try {
            const activeKey = provider === 'openai' ? (openaiKey.trim() || undefined) : (anthropicKey.trim() || undefined);
            const res = await testAiConnection({
                provider,
                apiKey: activeKey,
                model,
            });
            setTestResult({
                success: res.success,
                message: res.message,
                latencyMs: res.latencyMs,
                testing: false,
            });
            if (res.success) {
                addToast?.(`Connection test successful! (${res.latencyMs}ms)`, 'success');
            } else {
                addToast?.(res.message || 'Connection test failed', 'error');
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Connection test failed',
                testing: false,
            });
            addToast?.(`Connection test failed: ${friendlyApiError(err)}`, 'error');
        }
    };

    const handleResetPrompt = async () => {
        try {
            const def = await fetchDefaultAiPrompt();
            setSystemPrompt(def.prompt);
            addToast?.('System prompt reset to default', 'info');
        } catch {
            setSystemPrompt(PROMPT_PRESETS[0].prompt);
        }
    };

    const handleTableRuleChange = (tableName: string, value: string) => {
        setTableRulesMap((prev) => ({
            ...prev,
            [tableName]: value,
        }));
    };

    const toggleColumns = (tableName: string) => {
        setExpandedColumns((prev) => ({
            ...prev,
            [tableName]: !prev[tableName],
        }));
    };

    // Categories list
    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const t of schemaData?.tables || []) {
            if (t.category) set.add(t.category);
        }
        return ['All', ...Array.from(set).sort()];
    }, [schemaData]);

    // Filtered schema tables
    const filteredTables = useMemo(() => {
        const list = schemaData?.tables || [];
        const q = tableSearch.toLowerCase().trim();

        return list.filter((t) => {
            const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
            if (!matchCat) return false;
            if (!q) return true;

            const inName = t.tableName.toLowerCase().includes(q);
            const inDesc = (t.description || '').toLowerCase().includes(q);
            const inCols = (t.columns || []).some((c) => c.toLowerCase().includes(q));
            const inRules = (tableRulesMap[t.tableName] || '').toLowerCase().includes(q);

            return inName || inDesc || inCols || inRules;
        });
    }, [schemaData, tableSearch, selectedCategory, tableRulesMap]);

    const rulesCount = useMemo(() => {
        return Object.values(tableRulesMap).filter((v) => v && v.trim().length > 0).length;
    }, [tableRulesMap]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16 gap-3 text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin text-ems-accent" />
                <span>Loading AI Assistant settings...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 rounded-lg border border-ems-coral/30 bg-ems-coral-dim text-ems-coral text-sm">
                Could not load AI settings: {friendlyApiError(error)}
            </div>
        );
    }

    const currentModels = provider === 'openai'
        ? (settings?.availableModels.openai || ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'])
        : (settings?.availableModels.anthropic || [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-haiku-20240307',
            'claude-3-7-sonnet-20250219',
            'claude-3-opus-20240229',
        ]);

    return (
        <div className="space-y-6">
            {/* Navigation tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('config')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${activeTab === 'config'
                            ? 'bg-ems-accent text-background'
                            : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                        }`}
                >
                    <Cpu className="w-4 h-4" />
                    <span>Model & API Keys</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('schema')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${activeTab === 'schema'
                            ? 'bg-ems-accent text-background'
                            : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                        }`}
                >
                    <TableProperties className="w-4 h-4" />
                    <span>Schema & Table Rules ({rulesCount}/{schemaData?.tables?.length ?? 0})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('prompt')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${activeTab === 'prompt'
                            ? 'bg-ems-accent text-background'
                            : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                        }`}
                >
                    <Sliders className="w-4 h-4" />
                    <span>System Prompt & Presets</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('tools')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${activeTab === 'tools'
                            ? 'bg-ems-accent text-background'
                            : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                        }`}
                >
                    <Database className="w-4 h-4" />
                    <span>API Tools Catalog ({toolsData?.tools?.length ?? 0})</span>
                </button>
            </div>

            {/* ─── Tab 1: Model & API Keys ─────────────────────────────────────────── */}
            {activeTab === 'config' && (
                <div className="space-y-6">
                    {/* Provider Selection Cards */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                            Select AI Provider
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setProvider('openai');
                                    setModel('gpt-4o');
                                }}
                                className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${provider === 'openai'
                                        ? 'border-ems-accent bg-ems-accent/10 shadow-sm'
                                        : 'border-border bg-card hover:border-text-muted/40'
                                    }`}
                            >
                                <div className={`p-2 rounded-md ${provider === 'openai' ? 'bg-ems-accent text-background' : 'bg-elevated text-text-muted'}`}>
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm text-text-primary">OpenAI</span>
                                        {settings?.hasOpenaiKey && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                                                Key Configured
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-muted mt-1">
                                        GPT-4o, GPT-4o-mini, o3-mini. Fast function calling & broad knowledge.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setProvider('anthropic');
                                    setModel('claude-3-5-sonnet-20241022');
                                }}
                                className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${provider === 'anthropic'
                                        ? 'border-ems-accent bg-ems-accent/10 shadow-sm'
                                        : 'border-border bg-card hover:border-text-muted/40'
                                    }`}
                            >
                                <div className={`p-2 rounded-md ${provider === 'anthropic' ? 'bg-ems-accent text-background' : 'bg-elevated text-text-muted'}`}>
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm text-text-primary">Anthropic Claude</span>
                                        {settings?.hasAnthropicKey && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                                                Key Configured
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-muted mt-1">
                                        Claude 3.5 Sonnet, 3.5 Haiku & 3.7. Superior reasoning & strict grounding.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                                Active AI Model
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                                >
                                    {currentModels.map((m) => (
                                        <option key={m} value={m}>
                                            {m} {m === 'gpt-4o' || m === 'claude-3-5-sonnet-20241022' ? '(Recommended)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Or enter custom model ID"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full sm:w-64 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                                />
                            </div>
                        </div>

                        {/* API Keys Configuration */}
                        <div className="pt-2 border-t border-border/60 space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5" />
                                API Key Credentials
                            </h4>

                            {provider === 'openai' ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-text-secondary">OpenAI API Key (sk-...)</label>
                                        {settings?.hasOpenaiKey && (
                                            <span className="text-xs text-text-muted font-mono">
                                                Current: {settings.openaiKeyMasked}
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showOpenaiKey ? 'text' : 'password'}
                                            placeholder={settings?.hasOpenaiKey ? 'Enter new key to replace current key...' : 'sk-proj-...'}
                                            value={openaiKey}
                                            onChange={(e) => setOpenaiKey(e.target.value)}
                                            className="w-full bg-surface border border-border rounded-md px-3 py-2 pr-10 text-sm font-mono text-text-primary focus:outline-none focus:border-ems-accent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                                            className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
                                        >
                                            {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-text-secondary">Anthropic Claude API Key (sk-ant-...)</label>
                                        {settings?.hasAnthropicKey && (
                                            <span className="text-xs text-text-muted font-mono">
                                                Current: {settings.anthropicKeyMasked}
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showAnthropicKey ? 'text' : 'password'}
                                            placeholder={settings?.hasAnthropicKey ? 'Enter new key to replace current key...' : 'sk-ant-api03-...'}
                                            value={anthropicKey}
                                            onChange={(e) => setAnthropicKey(e.target.value)}
                                            className="w-full bg-surface border border-border rounded-md px-3 py-2 pr-10 text-sm font-mono text-text-primary focus:outline-none focus:border-ems-accent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                                            className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
                                        >
                                            {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Test Connection Button & Status */}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testResult?.testing}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                    {testResult?.testing ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-ems-accent" />
                                            Testing Connection...
                                        </>
                                    ) : (
                                        <>
                                            <Terminal className="w-3.5 h-3.5 text-ems-accent" />
                                            Test {provider === 'openai' ? 'OpenAI' : 'Claude'} Connection
                                        </>
                                    )}
                                </button>

                                {testResult && !testResult.testing && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        {testResult.success ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                Online ({testResult.latencyMs}ms)
                                            </span>
                                        ) : (
                                            <span className="text-ems-coral flex items-center gap-1">
                                                <XCircle className="w-4 h-4 shrink-0" />
                                                {testResult.message}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hyperparameters */}
                        <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-text-secondary">
                                        Temperature ({temperature.toFixed(2)})
                                    </label>
                                    <span className="text-[11px] text-text-muted">Low = Exact / High = Creative</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-ems-accent cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">
                                    Max Completion Tokens
                                </label>
                                <input
                                    type="number"
                                    min="256"
                                    max="8000"
                                    step="256"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 3000)}
                                    className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab 2: Schema & Table Business Rules ─────────────────────────────── */}
            {activeTab === 'schema' && (
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <TableProperties className="w-4 h-4 text-ems-accent" />
                                    Database Schema & Per-Table Business Rules
                                </h3>
                                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                                    Write business rules, column mappings, calculations, or status interpretations directly next to each table. The AI will strictly ground itself on these rules whenever generating queries or answering questions.
                                </p>
                            </div>
                            <span className="text-xs px-2.5 py-1 rounded bg-elevated border border-border text-text-secondary font-medium">
                                {rulesCount} of {schemaData?.tables?.length ?? 0} tables documented
                            </span>
                        </div>

                        {/* Search & Category Filter */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search table name, description, column (e.g. SeatingCapacity, GrossPotential)..."
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-ems-accent"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <span className="text-[11px] text-text-muted uppercase font-semibold">Category:</span>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-ems-accent"
                                >
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tables List */}
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {schemaLoading ? (
                            <div className="flex items-center justify-center py-12 gap-2 text-text-muted text-xs">
                                <Loader2 className="w-4 h-4 animate-spin text-ems-accent" />
                                <span>Loading database schema dictionary...</span>
                            </div>
                        ) : filteredTables.length === 0 ? (
                            <div className="p-8 text-center text-text-muted text-xs border border-dashed border-border rounded-lg bg-card">
                                No database tables match your filter "{tableSearch}".
                            </div>
                        ) : (
                            filteredTables.map((table) => {
                                const isColsOpen = expandedColumns[table.tableName];
                                const currentRule = tableRulesMap[table.tableName] ?? table.businessRules ?? '';
                                const hasCustomRule = currentRule.trim().length > 0;

                                return (
                                    <div
                                        key={table.tableName}
                                        className={`rounded-lg border transition-all ${hasCustomRule
                                                ? 'border-border bg-card'
                                                : 'border-border/60 bg-surface/50 hover:bg-card'
                                            }`}
                                    >
                                        {/* Table Card Header */}
                                        <div className="p-3.5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-elevated/40 rounded-t-lg">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-sm font-bold text-text-primary">
                                                    dbo.{table.tableName}
                                                </span>
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted uppercase tracking-wider">
                                                    {table.category}
                                                </span>
                                                {hasCustomRule && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Rule Defined
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => toggleColumns(table.tableName)}
                                                className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary font-medium"
                                            >
                                                <Layers className="w-3.5 h-3.5 text-ems-accent" />
                                                <span>{table.columns?.length ?? 0} Columns</span>
                                                {isColsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>

                                        {/* Collapsible Columns Viewer */}
                                        {isColsOpen && table.columns && table.columns.length > 0 && (
                                            <div className="p-3 bg-surface/80 border-b border-border/60">
                                                <p className="text-[10px] font-semibold uppercase text-text-muted mb-1.5">
                                                    Table Columns:
                                                </p>
                                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                                                    {table.columns.map((col) => (
                                                        <span
                                                            key={col}
                                                            className="px-2 py-0.5 rounded text-[11px] font-mono bg-card border border-border text-text-secondary"
                                                        >
                                                            {col}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Table Description & Rules Editor */}
                                        <div className="p-3.5 space-y-2">
                                            {table.description && (
                                                <p className="text-xs text-text-muted italic">
                                                    {table.description}
                                                </p>
                                            )}

                                            <div>
                                                <label className="block text-xs font-semibold text-text-secondary mb-1">
                                                    Business Rules & Domain Notes for dbo.{table.tableName}:
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    placeholder={`Write specific business rules for dbo.${table.tableName} (e.g. what columns mean, calculation formulas, active statuses, foreign key joins)...`}
                                                    value={currentRule}
                                                    onChange={(e) => handleTableRuleChange(table.tableName, e.target.value)}
                                                    className="w-full bg-surface border border-border rounded-md p-2.5 text-xs text-text-primary font-mono focus:outline-none focus:border-ems-accent resize-y leading-relaxed"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ─── Tab 3: System Prompt & Training ─────────────────────────────────── */}
            {activeTab === 'prompt' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">Custom System Prompt & Domain Instructions</h3>
                            <p className="text-xs text-text-muted mt-0.5">
                                Train how the AI responds, grounds its answers, and selects appropriate API tools.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleResetPrompt}
                            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded border border-border bg-elevated transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset to Default
                        </button>
                    </div>

                    {/* Prompt Presets & Quick Rule Snippets */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                                Instruction Presets
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {PROMPT_PRESETS.map((p) => (
                                    <button
                                        key={p.name}
                                        type="button"
                                        onClick={() => {
                                            setSystemPrompt(p.prompt);
                                            addToast?.(`Loaded ${p.name} preset`, 'info');
                                        }}
                                        className="text-left p-2.5 rounded-md border border-border bg-card hover:bg-hover transition-colors"
                                    >
                                        <p className="text-xs font-semibold text-text-primary">{p.name}</p>
                                        <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{p.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Insert Business Rule Snippets */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                                Quick Insert Domain Rules
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const snippet = `\n\n### 🏢 BUSINESS RULES - OFFER & PROJECT PIPELINE:
- "Drafted Offer" = Proposal created internally, not yet issued to promoter.
- "In Consideration" = Offer formally transmitted to the promoter/venue; holding calendar date.
- "Confirmed" = Binding deal; venue contract executed and date locked on routing schedule.
- Primary Venue: Look up dbo.EngagementProjectVenue or dbo.EngagementVenue where IsPrimary = 1.`;
                                        setSystemPrompt((prev) => prev + snippet);
                                        addToast?.('Appended Offer Pipeline rules to prompt', 'info');
                                    }}
                                    className="text-xs px-2.5 py-1.5 rounded border border-border bg-elevated hover:bg-hover text-text-primary transition-colors flex items-center gap-1.5"
                                >
                                    <span>+ Offer & Project Pipeline</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const snippet = `\n\n### 💰 BUSINESS RULES - REVENUE & BOX OFFICE CONVENTIONS:
- Total Gross = Sum of all Performance Gross revenues across the engagement.
- Gross Potential = Total capacity multiplied by weighted average ticket price.
- Sellable Capacity = Physical seating capacity minus production kills / sightline holds.
- When reporting sales velocity, compare TotalSold to SellableCapacity percentage.`;
                                        setSystemPrompt((prev) => prev + snippet);
                                        addToast?.('Appended Revenue & Box Office rules to prompt', 'info');
                                    }}
                                    className="text-xs px-2.5 py-1.5 rounded border border-border bg-elevated hover:bg-hover text-text-primary transition-colors flex items-center gap-1.5"
                                >
                                    <span>+ Revenue & Box Office</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const snippet = `\n\n### 📍 BUSINESS RULES - VENUE & DMA CONVENTIONS:
- Physical venue seating capacity is stored in dbo.Venue.SeatingCapacity.
- Venues are linked to dbo.Company (CompanyType = 'Venue').
- Markets and Nielsen DMA rankings should be queried from dbo.DMA and dbo.DMAPopulation.
- When searching venues in a state, match on Address.StateProvince (e.g. 'NY', 'CA', 'TX').`;
                                        setSystemPrompt((prev) => prev + snippet);
                                        addToast?.('Appended Venue & DMA rules to prompt', 'info');
                                    }}
                                    className="text-xs px-2.5 py-1.5 rounded border border-border bg-elevated hover:bg-hover text-text-primary transition-colors flex items-center gap-1.5"
                                >
                                    <span>+ Venue & DMA Rules</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const snippet = `\n\n### 👥 BUSINESS RULES - CONTACTS & PERSONNEL:
- Key contact roles include: "Booker", "Agent", "Tour Manager", "Venue Contact", "Executive".
- Contacts are joined to companies via dbo.ContactAssignment with ContactID and CompanyID.
- Always include contact email and phone number when presenting key personnel.`;
                                        setSystemPrompt((prev) => prev + snippet);
                                        addToast?.('Appended Contact & Personnel rules to prompt', 'info');
                                    }}
                                    className="text-xs px-2.5 py-1.5 rounded border border-border bg-elevated hover:bg-hover text-text-primary transition-colors flex items-center gap-1.5"
                                >
                                    <span>+ Contact Roles</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Prompt Textarea */}
                    <div className="space-y-1.5">
                        <textarea
                            rows={14}
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Enter comprehensive system instructions, anti-hallucination guardrails, and role details..."
                            className="w-full bg-surface border border-border rounded-lg p-3 text-sm font-mono text-text-primary focus:outline-none focus:border-ems-accent resize-y leading-relaxed"
                        />
                        <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                            <span>{systemPrompt.length.toLocaleString()} characters · {systemPrompt.split(/\s+/).filter(Boolean).length} words</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Fact-grounding rules active
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab 4: API Tools Catalog & Hybrid SQL ────────────────────────────── */}
            {activeTab === 'tools' && (
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border">
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary">Tool Execution Modes</h3>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Configure which data retrieval channels the AI is permitted to use.
                                </p>
                            </div>
                            <a
                                href="/api/docs"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs text-ems-accent hover:underline font-medium"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                Open OpenAPI / Swagger Docs ↗
                            </a>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface">
                                <input
                                    type="checkbox"
                                    id="enableApiTools"
                                    checked={enableApiTools}
                                    onChange={(e) => setEnableApiTools(e.target.checked)}
                                    className="mt-1 accent-ems-accent"
                                />
                                <label htmlFor="enableApiTools" className="text-xs cursor-pointer">
                                    <span className="font-semibold text-text-primary block">
                                        Option A – Reuse Domain APIs (Recommended)
                                    </span>
                                    <span className="text-text-muted mt-0.5 block">
                                        Calls structured backend services for Projects, Engagements, Companies, Contacts, Venues, and Daily Sales.
                                    </span>
                                </label>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface">
                                <input
                                    type="checkbox"
                                    id="enableSqlFallback"
                                    checked={enableSqlFallback}
                                    onChange={(e) => setEnableSqlFallback(e.target.checked)}
                                    className="mt-1 accent-ems-accent"
                                />
                                <label htmlFor="enableSqlFallback" className="text-xs cursor-pointer">
                                    <span className="font-semibold text-text-primary block">
                                        Hybrid SQL Fallback (Read-Only)
                                    </span>
                                    <span className="text-text-muted mt-0.5 block">
                                        Allows the AI to formulate and execute safe read-only SQL queries when standard endpoints do not have the custom join or aggregation.
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Active Tools List */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                            Active Registered Tools ({toolsData?.tools?.length ?? 0})
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {toolsData?.tools?.map((tool) => (
                                <div key={tool.name} className="p-3 rounded-lg border border-border bg-card">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-ems-accent">{tool.name}</span>
                                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-elevated text-text-muted">
                                            {tool.name === 'execute_readonly_sql' ? 'SQL Fallback' : 'REST API Tool'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-1">{tool.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 rounded-md bg-ems-accent text-background font-semibold text-sm hover:bg-ems-accent/90 transition-all shadow-sm disabled:opacity-50"
                >
                    {saveMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving Settings & Rules...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save AI Settings & Table Rules
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

