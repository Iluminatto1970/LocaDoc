import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Cpu, Key, Globe, Terminal, CheckCircle2, AlertCircle, 
  RefreshCw, Copy, Check, ExternalLink, ShieldCheck, Code, 
  Zap, Server, Lock, ArrowRight, Activity, Eye, EyeOff, 
  Save, RotateCcw, Database, HardDrive, Layers, Sparkles,
  Bot, Settings, Sliders, Network, Radio
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { AdminTeamManager } from './AdminTeamManager';

export type LlmProviderId = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'custom';

interface ProviderConfig {
  id: LlmProviderId;
  name: string;
  configured: boolean;
  isCustomKey?: boolean;
  keyPreview: string;
  endpoint: string;
  isCustomEndpoint?: boolean;
  defaultModel: string;
  supportedModels: string[];
}

interface MultiLlmStatusResponse {
  activeProvider: LlmProviderId;
  providers: Record<LlmProviderId, ProviderConfig>;
}

interface TestConnectionResult {
  success: boolean;
  provider?: string;
  message?: string;
  latencyMs?: number;
  modelUsed?: string;
  endpointUsed?: string;
  isCustomKey?: boolean;
  isCustomEndpoint?: boolean;
  responseSample?: string;
  timestamp?: string;
  error?: string;
}

interface DatabaseStatusData {
  status: string;
  provider: string;
  engine: string;
  projectId: string;
  databaseId: string;
  securityRules: string;
  collections: Array<{ name: string; description: string }>;
  resilience: string;
}

export const ApiGeminiManager: React.FC = () => {
  // Active configuration tab: overview, specific LLMs, database, endpoints
  const [activeTab, setActiveTab] = useState<LlmProviderId | 'overview' | 'database' | 'endpoints'>('overview');
  
  // Multi-LLM State loaded from backend
  const [llmStatus, setLlmStatus] = useState<MultiLlmStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [activeProvider, setActiveProvider] = useState<LlmProviderId>('gemini');

  // Quick preset loader for custom / local endpoints
  const handleApplyPreset = (preset: 'ollama' | 'lmstudio' | 'deepseek' | 'openrouter' | 'vllm') => {
    if (preset === 'ollama') {
      setCustomEndpoint('http://localhost:11434/v1');
      setCustomModel('llama3.3');
      setCustomKey('');
      setFeedback({ type: 'success', text: 'Preset Ollama aplicado (http://localhost:11434/v1 - Modelo: llama3.3)' });
    } else if (preset === 'lmstudio') {
      setCustomEndpoint('http://localhost:1234/v1');
      setCustomModel('local-model');
      setCustomKey('');
      setFeedback({ type: 'success', text: 'Preset LM Studio aplicado (http://localhost:1234/v1 - Modelo: local-model)' });
    } else if (preset === 'deepseek') {
      setCustomEndpoint('https://api.deepseek.com/v1');
      setCustomModel('deepseek-chat');
      setFeedback({ type: 'success', text: 'Preset DeepSeek Oficial aplicado. Insira sua chave sk-...' });
    } else if (preset === 'openrouter') {
      setCustomEndpoint('https://openrouter.ai/api/v1');
      setCustomModel('deepseek/deepseek-r1');
      setFeedback({ type: 'success', text: 'Preset OpenRouter aplicado. Insira sua chave sk-or-...' });
    } else if (preset === 'vllm') {
      setCustomEndpoint('http://localhost:8000/v1');
      setCustomModel('default');
      setFeedback({ type: 'success', text: 'Preset vLLM/Proxy aplicado (http://localhost:8000/v1)' });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // Provider Inputs State
  // 1. Gemini
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiEndpoint, setGeminiEndpoint] = useState('https://generativelanguage.googleapis.com');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  
  // 2. OpenAI
  const [openAiKey, setOpenAiKey] = useState('');
  const [openAiEndpoint, setOpenAiEndpoint] = useState('https://api.openai.com/v1');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o-mini');

  // 3. Anthropic Claude
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicEndpoint, setAnthropicEndpoint] = useState('https://api.anthropic.com/v1');
  const [anthropicModel, setAnthropicModel] = useState('claude-3-5-haiku-20241022');

  // 4. Groq / DeepSeek
  const [groqKey, setGroqKey] = useState('');
  const [groqEndpoint, setGroqEndpoint] = useState('https://api.groq.com/openai/v1');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');

  // 5. Custom / Local API (Ollama, LM Studio, etc.)
  const [customKey, setCustomKey] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('http://localhost:11434/v1');
  const [customModel, setCustomModel] = useState('llama3');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({
    gemini: false,
    openai: false,
    anthropic: false,
    groq: false,
    custom: false,
  });

  // Saving state & feedback
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Connection tester state
  const [testPrompt, setTestPrompt] = useState('Responda em 1 linha: "Conexão com a API efetuada com sucesso!"');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Database status state
  const [dbStatus, setDbStatus] = useState<DatabaseStatusData | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
    testedAt?: string;
  } | null>(null);

  // Load configuration from backend and localStorage
  const fetchLlmConfig = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await apiFetch('/api/llm/config');
      if (res.ok) {
        const data: MultiLlmStatusResponse = await res.json();
        setLlmStatus(data);
        setActiveProvider(data.activeProvider || 'gemini');

        // Populate endpoints & models from backend if present
        if (data.providers?.gemini) {
          if (data.providers.gemini.endpoint) setGeminiEndpoint(data.providers.gemini.endpoint);
        }
        if (data.providers?.openai) {
          if (data.providers.openai.endpoint) setOpenAiEndpoint(data.providers.openai.endpoint);
          if (data.providers.openai.defaultModel) setOpenAiModel(data.providers.openai.defaultModel);
        }
        if (data.providers?.anthropic) {
          if (data.providers.anthropic.endpoint) setAnthropicEndpoint(data.providers.anthropic.endpoint);
          if (data.providers.anthropic.defaultModel) setAnthropicModel(data.providers.anthropic.defaultModel);
        }
        if (data.providers?.groq) {
          if (data.providers.groq.endpoint) setGroqEndpoint(data.providers.groq.endpoint);
          if (data.providers.groq.defaultModel) setGroqModel(data.providers.groq.defaultModel);
        }
        if (data.providers?.custom) {
          if (data.providers.custom.endpoint) setCustomEndpoint(data.providers.custom.endpoint);
          if (data.providers.custom.defaultModel) setCustomModel(data.providers.custom.defaultModel);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações de LLM:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchDatabaseStatus = async () => {
    try {
      const res = await apiFetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Erro ao obter status do banco de dados:', err);
    }
  };

  useEffect(() => {
    fetchLlmConfig();
    fetchDatabaseStatus();

    // Check localStorage cache for custom endpoints if user previously set them
    try {
      const savedProvider = localStorage.getItem('locadoc_active_llm_provider') as LlmProviderId;
      if (savedProvider) setActiveProvider(savedProvider);
      
      const savedGeminiEp = localStorage.getItem('locadoc_gemini_endpoint');
      if (savedGeminiEp) setGeminiEndpoint(savedGeminiEp);

      const savedOpenAiEp = localStorage.getItem('locadoc_openai_endpoint');
      if (savedOpenAiEp) setOpenAiEndpoint(savedOpenAiEp);

      const savedCustomEp = localStorage.getItem('locadoc_custom_endpoint');
      if (savedCustomEp) setCustomEndpoint(savedCustomEp);
    } catch (e) {
      // ignore local storage errors
    }
  }, []);

  // Save specific provider configuration
  const handleSaveProvider = async (provider: LlmProviderId) => {
    setIsSaving(true);
    setFeedback(null);

    let apiKey = '';
    let endpoint = '';
    let model = '';

    if (provider === 'gemini') {
      apiKey = geminiKey;
      endpoint = geminiEndpoint;
      model = geminiModel;
    } else if (provider === 'openai') {
      apiKey = openAiKey;
      endpoint = openAiEndpoint;
      model = openAiModel;
    } else if (provider === 'anthropic') {
      apiKey = anthropicKey;
      endpoint = anthropicEndpoint;
      model = anthropicModel;
    } else if (provider === 'groq') {
      apiKey = groqKey;
      endpoint = groqEndpoint;
      model = groqModel;
    } else if (provider === 'custom') {
      apiKey = customKey;
      endpoint = customEndpoint;
      model = customModel;
    }

    try {
      const res = await apiFetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          endpoint,
          model,
          activeProvider,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Configurações de ${provider.toUpperCase()} salvas com sucesso!`,
        });

        // Cache safe values in localStorage
        try {
          localStorage.setItem(`locadoc_${provider}_endpoint`, endpoint);
          localStorage.setItem('locadoc_active_llm_provider', activeProvider);
        } catch (e) {}

        // Clear raw input field for security
        if (provider === 'gemini') setGeminiKey('');
        if (provider === 'openai') setOpenAiKey('');
        if (provider === 'anthropic') setAnthropicKey('');
        if (provider === 'groq') setGroqKey('');
        if (provider === 'custom') setCustomKey('');

        await fetchLlmConfig();
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Erro ao salvar configuração no servidor.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Falha de comunicação com o servidor ao salvar.',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Reset provider to defaults
  const handleResetProvider = async (provider: LlmProviderId) => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, reset: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Configurações de ${provider.toUpperCase()} restauradas para o padrão do servidor.`,
        });
        if (provider === 'gemini') {
          setGeminiKey('');
          setGeminiEndpoint('https://generativelanguage.googleapis.com');
        } else if (provider === 'openai') {
          setOpenAiKey('');
          setOpenAiEndpoint('https://api.openai.com/v1');
        } else if (provider === 'anthropic') {
          setAnthropicKey('');
          setAnthropicEndpoint('https://api.anthropic.com/v1');
        } else if (provider === 'groq') {
          setGroqKey('');
          setGroqEndpoint('https://api.groq.com/openai/v1');
        } else if (provider === 'custom') {
          setCustomKey('');
          setCustomEndpoint('http://localhost:11434/v1');
        }
        await fetchLlmConfig();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao restaurar configurações.',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Set active primary provider
  const handleSelectActiveProvider = async (prov: LlmProviderId) => {
    setActiveProvider(prov);
    try {
      localStorage.setItem('locadoc_active_llm_provider', prov);
      await apiFetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProvider: prov }),
      });
      setFeedback({
        type: 'success',
        text: `Provedor padrão de IA atualizado para: ${prov.toUpperCase()}`,
      });
      setTimeout(() => setFeedback(null), 4000);
      await fetchLlmConfig();
    } catch (e) {}
  };

  // Universal connection test runner
  const handleRunTest = async (targetProvider: LlmProviderId) => {
    setIsTesting(true);
    setTestResult(null);

    let apiKey = '';
    let endpoint = '';
    let model = '';

    if (targetProvider === 'gemini') {
      apiKey = geminiKey;
      endpoint = geminiEndpoint;
      model = geminiModel;
    } else if (targetProvider === 'openai') {
      apiKey = openAiKey;
      endpoint = openAiEndpoint;
      model = openAiModel;
    } else if (targetProvider === 'anthropic') {
      apiKey = anthropicKey;
      endpoint = anthropicEndpoint;
      model = anthropicModel;
    } else if (targetProvider === 'groq') {
      apiKey = groqKey;
      endpoint = groqEndpoint;
      model = groqModel;
    } else if (targetProvider === 'custom') {
      apiKey = customKey;
      endpoint = customEndpoint;
      model = customModel;
    }

    try {
      const res = await apiFetch('/api/llm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetProvider,
          apiKey: apiKey.trim() || undefined,
          endpoint: endpoint.trim() || undefined,
          model: model.trim() || undefined,
          prompt: testPrompt,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        provider: targetProvider,
        error: err?.message || 'Falha na comunicação de rede com o servidor.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Firestore live ping
  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    const start = Date.now();

    try {
      const pingDocRef = doc(db, 'test', 'live_diagnostic');
      await setDoc(pingDocRef, {
        lastPingAt: new Date().toISOString(),
        client: 'LocaDoc Web Admin - Configurações',
        status: 'OK',
      }, { merge: true });

      await getDocFromServer(pingDocRef);
      const latency = Date.now() - start;

      setDbTestResult({
        success: true,
        latencyMs: latency,
        message: 'Banco de dados Firestore 100% OPERACIONAL e respondendo com baixa latência.',
        testedAt: new Date().toLocaleTimeString('pt-BR'),
      });
    } catch (err: any) {
      const latency = Date.now() - start;
      console.error('Erro no teste de Firestore:', err);
      setDbTestResult({
        success: false,
        latencyMs: latency,
        error: err?.message || 'Erro ao contatar o Cloud Firestore.',
        testedAt: new Date().toLocaleTimeString('pt-BR'),
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const curlExamples: Record<string, string> = {
    'gemini': `curl -X POST http://localhost:3000/api/llm/test-connection \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "gemini",
    "model": "gemini-3.8-flash",
    "prompt": "Teste de conexão"
  }'`,
    'openai': `curl -X POST http://localhost:3000/api/llm/test-connection \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "sk-...",
    "endpoint": "https://api.openai.com/v1"
  }'`,
    'custom': `curl -X POST http://localhost:3000/api/llm/test-connection \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "custom",
    "endpoint": "http://localhost:11434/v1",
    "model": "llama3"
  }'`,
    'extract': `curl -X POST http://localhost:3000/api/extract-documents \\
  -H "Content-Type: application/json" \\
  -d '{
    "files": [{ "name": "rg.jpg", "type": "image/jpeg", "base64": "..." }],
    "instructions": "Extrair qualificação Locador e Locatário"
  }'`,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Central de Configurações de IA & LLMs
              </span>
              <span className="text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Multi-Provedores & Modelos Locais
              </span>
              <span className="text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Proxy Server-Side Seguro
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Configurações de IA, Endpoints Customizados & Chaves LLM
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Personalize endpoints, chaves de API para os principais modelos de IA (<strong>Google Gemini</strong>, <strong>OpenAI GPT-4o</strong>, <strong>Anthropic Claude</strong>, <strong>Groq / DeepSeek</strong>) ou conecte sua própria <strong>API Customizada / Servidor Local</strong> (Ollama, LM Studio, vLLM ou Proxy Corporativo).
            </p>
          </div>

          <button
            type="button"
            onClick={fetchLlmConfig}
            disabled={isLoadingStatus}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer shrink-0 self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>Atualizar Status</span>
          </button>
        </div>

        {/* Active Provider Quick Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Provedor Principal Ativo para Extração e OCR:</span>
            <span className="px-2.5 py-1 rounded-lg font-bold bg-amber-400 text-slate-950 uppercase tracking-wide flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              {activeProvider.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">Trocar rápido:</span>
            {(['gemini', 'openai', 'anthropic', 'groq', 'custom'] as LlmProviderId[]).map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => handleSelectActiveProvider(prov)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer capitalize ${
                  activeProvider === prov
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {prov === 'custom' ? 'Local/Custom' : prov}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
              : 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navigation Tabs for Settings */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-500" />
          <span>Hub de Conexões & Visão Geral</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-indigo-600" />
          <span>API Custom & Endpoints Locais</span>
          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-indigo-100 text-indigo-900 font-extrabold tracking-wide">
            Ollama / Proxies
          </span>
          {llmStatus?.providers?.custom?.configured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gemini')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'gemini'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-amber-500" />
          <span>Google Gemini</span>
          {llmStatus?.providers?.gemini?.configured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('openai')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'openai'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-emerald-600" />
          <span>OpenAI (GPT-4o)</span>
          {llmStatus?.providers?.openai?.configured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('anthropic')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'anthropic'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Anthropic Claude</span>
          {llmStatus?.providers?.anthropic?.configured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('groq')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'groq'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-orange-500" />
          <span>Groq & DeepSeek</span>
          {llmStatus?.providers?.groq?.configured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'database'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Banco Firestore</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'endpoints'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-slate-700" />
          <span>Documentação cURL</span>
        </button>
      </div>

      {/* TAB CONTENT 0: OVERVIEW & CONNECTION HUB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Gestão de Administradores (CRUD) — exclusiva do Super Admin */}
          <AdminTeamManager />

          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span>Painel Geral de Conexões e Motores de IA</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Gerencie os provedores configurados e escolha qual motor de inteligência artificial realizará o OCR e auto-preenchimento dos contratos.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Motor Selecionado:</span>
                <span className="px-2.5 py-1 rounded-lg font-bold bg-amber-400 text-slate-950 uppercase tracking-wide">
                  {activeProvider.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Card 1: API Customizada / Local */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeProvider === 'custom'
                  ? 'bg-indigo-50/60 border-indigo-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
                    <Network className="w-5 h-5 text-indigo-600" />
                  </div>
                  {activeProvider === 'custom' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Motor Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      Disponível
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">Endpoint & API Custom / Local</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Ollama, LM Studio, OpenRouter, DeepSeek ou Proxy Corporativo
                </p>

                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-mono mb-4">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Endpoint:</span>
                    <span className="text-slate-800 truncate max-w-[170px] font-semibold" title={customEndpoint}>
                      {customEndpoint}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Modelo:</span>
                    <span className="text-slate-800 font-semibold">{customModel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    className="flex-1 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Configurar
                  </button>
                  {activeProvider !== 'custom' && (
                    <button
                      type="button"
                      onClick={() => handleSelectActiveProvider('custom')}
                      className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Google Gemini */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeProvider === 'gemini'
                  ? 'bg-amber-50/60 border-amber-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                    <Cpu className="w-5 h-5 text-amber-600" />
                  </div>
                  {activeProvider === 'gemini' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Motor Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Pronto
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">Google Gemini API</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  SDK Oficial @google/genai com suporte nativo a visão multimodal e OCR
                </p>

                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-mono mb-4">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Chave:</span>
                    <span className="text-slate-800 font-semibold">{llmStatus?.providers?.gemini?.keyPreview || 'Ambiente (.env)'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Modelo:</span>
                    <span className="text-slate-800 font-semibold">{geminiModel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('gemini')}
                    className="flex-1 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Configurar
                  </button>
                  {activeProvider !== 'gemini' && (
                    <button
                      type="button"
                      onClick={() => handleSelectActiveProvider('gemini')}
                      className="flex-1 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>

              {/* Card 3: OpenAI (GPT-4o) */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeProvider === 'openai'
                  ? 'bg-emerald-50/60 border-emerald-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5 text-emerald-600" />
                  </div>
                  {activeProvider === 'openai' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Motor Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {llmStatus?.providers?.openai?.configured ? 'Configurado' : 'Aguardando Chave'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">OpenAI (GPT-4o)</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Modelos GPT-4o, GPT-4o-mini e o1 via API REST oficial
                </p>

                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-mono mb-4">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Chave:</span>
                    <span className="text-slate-800 font-semibold">{llmStatus?.providers?.openai?.keyPreview || 'Não configurada'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Modelo:</span>
                    <span className="text-slate-800 font-semibold">{openAiModel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('openai')}
                    className="flex-1 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Configurar
                  </button>
                  {activeProvider !== 'openai' && (
                    <button
                      type="button"
                      onClick={() => handleSelectActiveProvider('openai')}
                      className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>

              {/* Card 4: Anthropic Claude */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeProvider === 'anthropic'
                  ? 'bg-amber-50/60 border-amber-600 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-700/10 text-amber-900 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5 text-amber-700" />
                  </div>
                  {activeProvider === 'anthropic' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-800 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Motor Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {llmStatus?.providers?.anthropic?.configured ? 'Configurado' : 'Aguardando Chave'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">Anthropic Claude</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Claude 3.5 Haiku e Claude 3.7 Sonnet para extração jurídica
                </p>

                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-mono mb-4">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Chave:</span>
                    <span className="text-slate-800 font-semibold">{llmStatus?.providers?.anthropic?.keyPreview || 'Não configurada'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Modelo:</span>
                    <span className="text-slate-800 font-semibold">{anthropicModel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('anthropic')}
                    className="flex-1 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Configurar
                  </button>
                  {activeProvider !== 'anthropic' && (
                    <button
                      type="button"
                      onClick={() => handleSelectActiveProvider('anthropic')}
                      className="flex-1 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>

              {/* Card 5: Groq Cloud & DeepSeek */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeProvider === 'groq'
                  ? 'bg-orange-50/60 border-orange-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-700 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5 text-orange-600" />
                  </div>
                  {activeProvider === 'groq' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Motor Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {llmStatus?.providers?.groq?.configured ? 'Configurado' : 'Aguardando Chave'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">Groq Cloud & DeepSeek</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Inferência LPU ultra-rápida (500+ tokens/s) para Llama 3.3 e DeepSeek
                </p>

                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-mono mb-4">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Chave:</span>
                    <span className="text-slate-800 font-semibold">{llmStatus?.providers?.groq?.keyPreview || 'Não configurada'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Modelo:</span>
                    <span className="text-slate-800 font-semibold">{groqModel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('groq')}
                    className="flex-1 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Configurar
                  </button>
                  {activeProvider !== 'groq' && (
                    <button
                      type="button"
                      onClick={() => handleSelectActiveProvider('groq')}
                      className="flex-1 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 1: GOOGLE GEMINI */}
      {activeTab === 'gemini' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Google Gemini API</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold">
                    Nativo & Recomendado
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  SDK Oficial @google/genai com suporte nativo a visão multimodal e OCR de documentos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                Chave atual: <strong>{llmStatus?.providers?.gemini?.keyPreview || 'Ambiente (.env)'}</strong>
              </span>
              {activeProvider === 'gemini' && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md text-xs font-bold border border-amber-300">
                  Provedor Padrão Ativo
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input API Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Chave de API Gemini (API Key)
              </label>
              <div className="relative">
                <input
                  type={showPassword.gemini ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Insira sua GEMINI_API_KEY (ex: AIzaSyB...)"
                  className="w-full p-2.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, gemini: !p.gemini }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title={showPassword.gemini ? 'Ocultar' : 'Exibir'}
                >
                  {showPassword.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Obtenha gratuitamente no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline font-semibold">Google AI Studio</a>. Se deixar em branco, o backend utiliza a chave do ambiente.
              </p>
            </div>

            {/* Input Endpoint */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Endpoint Customizado / Base URL
              </label>
              <input
                type="text"
                value={geminiEndpoint}
                onChange={(e) => setGeminiEndpoint(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500">
                URL base oficial do Google ou endereço do seu proxy reverso corporativo.
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Modelo Gemini Selecionado
              </label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado para OCR & Extração)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultrarrápido & Econômico)</option>
                <option value="gemini-4-argon">gemini-4-argon (Raciocínio Jurídico Avançado)</option>
              </select>
            </div>

            {/* Active Provider Button */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-800">
                Definir como Motor de IA do Sistema
              </label>
              <button
                type="button"
                onClick={() => handleSelectActiveProvider('gemini')}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeProvider === 'gemini'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>{activeProvider === 'gemini' ? 'Atualmente Selecionado como Principal' : 'Ativar Gemini como Principal'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons & Tester */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveProvider('gemini')}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Configuração Gemini'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetProvider('gemini')}
                disabled={isSaving}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRunTest('gemini')}
              disabled={isTesting}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão com Gemini'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: OPENAI */}
      {activeTab === 'openai' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>OpenAI API</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold">
                    GPT-4o & GPT-4o-mini
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Integre chaves de API da OpenAI ou endpoints do Azure OpenAI Service com autenticação Bearer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                Chave atual: <strong>{llmStatus?.providers?.openai?.keyPreview || 'Não configurada'}</strong>
              </span>
              {activeProvider === 'openai' && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md text-xs font-bold border border-amber-300">
                  Provedor Padrão Ativo
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input OpenAI Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Chave de API OpenAI (API Key)
              </label>
              <div className="relative">
                <input
                  type={showPassword.openai ? 'text' : 'password'}
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-proj-... ou sk-..."
                  className="w-full p-2.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, openai: !p.openai }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Obtenha em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">platform.openai.com</a>.
              </p>
            </div>

            {/* Input OpenAI Endpoint */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Endpoint OpenAI / Proxy Customizado
              </label>
              <input
                type="text"
                value={openAiEndpoint}
                onChange={(e) => setOpenAiEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Padrão: <code>https://api.openai.com/v1</code> ou endereço do seu Azure OpenAI Gateway.
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Modelo OpenAI Selecionado
              </label>
              <select
                value={openAiModel}
                onChange={(e) => setOpenAiModel(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Rápido, econômico e eficiente)</option>
                <option value="gpt-4o">gpt-4o (Máxima precisão analítica e visão)</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="o1-mini">o1-mini (Raciocínio complexo)</option>
              </select>
            </div>

            {/* Active Provider Button */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-800">
                Definir como Motor de IA do Sistema
              </label>
              <button
                type="button"
                onClick={() => handleSelectActiveProvider('openai')}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeProvider === 'openai'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeProvider === 'openai' ? 'Atualmente Selecionado como Principal' : 'Ativar OpenAI como Principal'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons & Tester */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveProvider('openai')}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Configuração OpenAI'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetProvider('openai')}
                disabled={isSaving}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRunTest('openai')}
              disabled={isTesting}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão com OpenAI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ANTHROPIC CLAUDE */}
      {activeTab === 'anthropic' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-800/10 text-amber-900 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Anthropic Claude API</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold">
                    Claude 3.7 & 3.5 Haiku
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Configuração para a API nativa da Anthropic com autenticação x-api-key.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                Chave atual: <strong>{llmStatus?.providers?.anthropic?.keyPreview || 'Não configurada'}</strong>
              </span>
              {activeProvider === 'anthropic' && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md text-xs font-bold border border-amber-300">
                  Provedor Padrão Ativo
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input Anthropic Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Chave de API Anthropic (x-api-key)
              </label>
              <div className="relative">
                <input
                  type={showPassword.anthropic ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full p-2.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, anthropic: !p.anthropic }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword.anthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Obtenha em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-amber-800 hover:underline font-semibold">console.anthropic.com</a>.
              </p>
            </div>

            {/* Input Endpoint */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Endpoint Anthropic / Proxy
              </label>
              <input
                type="text"
                value={anthropicEndpoint}
                onChange={(e) => setAnthropicEndpoint(e.target.value)}
                placeholder="https://api.anthropic.com/v1"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-800"
              />
              <p className="text-[11px] text-slate-500">
                Padrão: <code>https://api.anthropic.com/v1</code>
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Modelo Claude Selecionado
              </label>
              <select
                value={anthropicModel}
                onChange={(e) => setAnthropicModel(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-800"
              >
                <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 (Velocidade & Precisão)</option>
                <option value="claude-3-7-sonnet-20250219">claude-3-7-sonnet-20250219 (Raciocínio Híbrido)</option>
                <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
              </select>
            </div>

            {/* Active Provider Button */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-800">
                Definir como Motor de IA do Sistema
              </label>
              <button
                type="button"
                onClick={() => handleSelectActiveProvider('anthropic')}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeProvider === 'anthropic'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeProvider === 'anthropic' ? 'Atualmente Selecionado como Principal' : 'Ativar Claude como Principal'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons & Tester */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveProvider('anthropic')}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Configuração Claude'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetProvider('anthropic')}
                disabled={isSaving}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRunTest('anthropic')}
              disabled={isTesting}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-xl border border-amber-300 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-amber-800' : 'text-amber-800'}`} />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão com Claude'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: GROQ CLOUD */}
      {activeTab === 'groq' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-700 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Groq Cloud API</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-extrabold">
                    LPU Ultra-Baixa Latência
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Infraestrutura de inferência ultra-rápida (500+ tokens/seg) para Meta Llama 3.3 e DeepSeek R1.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                Chave atual: <strong>{llmStatus?.providers?.groq?.keyPreview || 'Não configurada'}</strong>
              </span>
              {activeProvider === 'groq' && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md text-xs font-bold border border-amber-300">
                  Provedor Padrão Ativo
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input Groq Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Chave de API Groq (gsk_...)
              </label>
              <div className="relative">
                <input
                  type={showPassword.groq ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full p-2.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, groq: !p.groq }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Obtenha gratuitamente em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-semibold">console.groq.com</a>.
              </p>
            </div>

            {/* Input Endpoint */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Endpoint Groq (OpenAI Compatible)
              </label>
              <input
                type="text"
                value={groqEndpoint}
                onChange={(e) => setGroqEndpoint(e.target.value)}
                placeholder="https://api.groq.com/openai/v1"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-500">
                Padrão: <code>https://api.groq.com/openai/v1</code>
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Modelo Groq Selecionado
              </label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recomendado Groq)</option>
                <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b (Raciocínio Matemático & Lógico)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (32k Janela de Contexto)</option>
              </select>
            </div>

            {/* Active Provider Button */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-800">
                Definir como Motor de IA do Sistema
              </label>
              <button
                type="button"
                onClick={() => handleSelectActiveProvider('groq')}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeProvider === 'groq'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeProvider === 'groq' ? 'Atualmente Selecionado como Principal' : 'Ativar Groq como Principal'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons & Tester */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveProvider('groq')}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Configuração Groq'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetProvider('groq')}
                disabled={isSaving}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRunTest('groq')}
              disabled={isTesting}
              className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-950 font-bold text-xs rounded-xl border border-orange-300 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-orange-600' : 'text-orange-600'}`} />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão com Groq'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: CUSTOM ENDPOINT & LOCAL API (OLLAMA, LM STUDIO, PROXY) */}
      {activeTab === 'custom' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
                <Network className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Endpoint Customizado & API Local / Corporativa</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-extrabold">
                    Ollama, LM Studio & Proxies
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Conecte qualquer serviço local ou servidor próprio com protocolo compatível OpenAI / REST.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                Endpoint atual: <strong>{llmStatus?.providers?.custom?.endpoint || 'http://localhost:11434/v1'}</strong>
              </span>
              {activeProvider === 'custom' && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md text-xs font-bold border border-amber-300">
                  Provedor Padrão Ativo
                </span>
              )}
            </div>
          </div>

          {/* 1-Click Preset Selector for Popular Custom / Local LLMs */}
          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Presets Rápidos de 1 Clique (Auto-Preenchimento):
              </span>
              <span className="text-[11px] text-indigo-700 font-medium hidden sm:inline">
                Clique para carregar endpoint e modelo recomendados
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyPreset('ollama')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-950 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>🦙 Ollama Local (localhost:11434)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('lmstudio')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-950 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>🖥️ LM Studio (localhost:1234)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('deepseek')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-950 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>🐳 DeepSeek Oficial (api.deepseek.com)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('openrouter')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-950 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>🌐 OpenRouter (openrouter.ai)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('vllm')}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-950 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>🏢 vLLM / Proxy (localhost:8000)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Input Endpoint */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-800">
                URL Base do Endpoint / Servidor Customizado
              </label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1 ou https://meu-proxy.com/v1"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Exemplos: <code>http://localhost:11434/v1</code> (Ollama), <code>http://localhost:1234/v1</code> (LM Studio), <code>https://api.deepseek.com/v1</code> ou URL do seu proxy corporativo.
              </p>
            </div>

            {/* Input Model Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Nome do Modelo Customizado
              </label>
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Ex: llama3.3, deepseek-r1, mistral, gpt-4o"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Nome da tag no Ollama ou identificador do modelo no servidor.
              </p>
            </div>

            {/* Input Custom Key (Optional) */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-800">
                Chave de API / Token Bearer (Opcional para servidores locais)
              </label>
              <div className="relative">
                <input
                  type={showPassword.custom ? 'text' : 'password'}
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Deixe em branco para servidores locais sem autenticação ou cole o Token Bearer"
                  className="w-full p-2.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => ({ ...p, custom: !p.custom }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword.custom ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Se o seu endpoint requer autenticação no header <code>Authorization: Bearer &lt;token&gt;</code>, informe-o aqui.
              </p>
            </div>

            {/* Active Provider Button */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-800">
                Definir como Motor de IA do Sistema
              </label>
              <button
                type="button"
                onClick={() => handleSelectActiveProvider('custom')}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeProvider === 'custom'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeProvider === 'custom' ? 'Atualmente Selecionado como Principal' : 'Ativar Customizado'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons & Tester */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveProvider('custom')}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Endpoint Customizado'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetProvider('custom')}
                disabled={isSaving}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRunTest('custom')}
              disabled={isTesting}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-xs rounded-xl border border-indigo-300 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão Customizada'}</span>
            </button>
          </div>

          {/* Local LLM Guidance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-slate-700" />
                Como rodar o Ollama Localmente
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                1. Baixe o Ollama em <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">ollama.com</a>.<br />
                2. No terminal: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">ollama run llama3.3</code> ou <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">ollama run deepseek-r1:8b</code>.<br />
                3. O Ollama atende na porta 11434 com endpoint <code>http://localhost:11434/v1</code>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                Privacidade 100% Offline & Local
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Ao utilizar modelos locais, nenhum documento, foto ou qualificação de locador/locatário sai do seu computador. Os dados são processados totalmente na sua rede, garantindo isolamento total LGPD.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* UNIVERSAL CONNECTION TEST CONSOLE (Visible on all LLM tabs) */}
      {['gemini', 'openai', 'anthropic', 'groq', 'custom'].includes(activeTab) && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Console de Teste em Tempo Real ({activeTab.toUpperCase()})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Dispara requisição ao vivo e calcula a latência de ponta a ponta
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prompt de Teste Rápido
              </label>
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-sans"
              />
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono space-y-2 animate-in fade-in ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2">
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold">
                      {testResult.success ? 'Conexão Bem-Sucedida!' : 'Falha na Conexão'}
                    </span>
                  </div>

                  {testResult.latencyMs !== undefined && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/10">
                      Latência: {testResult.latencyMs} ms
                    </span>
                  )}
                </div>

                {testResult.endpointUsed && (
                  <p className="text-[11px] text-slate-600 truncate">
                    Endpoint: {testResult.endpointUsed}
                  </p>
                )}

                {testResult.responseSample && (
                  <div className="p-2.5 bg-white/80 rounded-lg border border-black/5 text-slate-800 text-[11px] leading-relaxed">
                    <strong>Resposta da IA:</strong> {testResult.responseSample}
                  </div>
                )}

                {testResult.error && (
                  <p className="text-[11px] text-rose-700 font-sans leading-relaxed">
                    <strong>Erro:</strong> {testResult.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: FIRESTORE DATABASE STATUS */}
      {activeTab === 'database' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Banco de Dados Cloud Firestore</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online & Operacional
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Google Cloud Firestore (NoSQL Document Database) com persistência em nuvem e regras de segurança ativas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestDatabase}
              disabled={isTestingDb}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
              <span>{isTestingDb ? 'Testando Conexão...' : 'Testar Conexão com Firestore'}</span>
            </button>
          </div>

          {/* DB Live Test Result */}
          {dbTestResult && (
            <div
              className={`p-4 rounded-xl border text-xs font-mono space-y-1.5 animate-in fade-in ${
                dbTestResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {dbTestResult.message || 'Teste concluído!'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-900">
                  Latência: {dbTestResult.latencyMs} ms
                </span>
              </div>
              {dbTestResult.error && (
                <p className="text-rose-700 font-sans text-[11px]">{dbTestResult.error}</p>
              )}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">Engine / Provedor</span>
              <p className="font-bold text-slate-900">{dbStatus?.engine || 'NoSQL Cloud Document Database'}</p>
              <p className="text-[11px] text-slate-500">{dbStatus?.provider || 'Google Cloud Firebase'}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">ID do Banco de Dados</span>
              <p className="font-mono text-slate-900 text-[11px] break-all font-semibold">
                {dbStatus?.databaseId || 'ai-studio-locadocgeradorde-7867a8c2-6fef-4c09-b211-0184757f7ba3'}
              </p>
              <p className="text-[11px] text-slate-500">Região: us-central1 (Cloud Multi-Zone)</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">Políticas de Segurança</span>
              <p className="font-semibold text-slate-900">{dbStatus?.securityRules || 'firestore.rules ativo'}</p>
              <p className="text-[11px] text-emerald-700 font-bold">RBAC & Isolamento LGPD Enforced</p>
            </div>
          </div>

          {/* Collections List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Coleções Sincronizadas no Firestore
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(dbStatus?.collections || [
                { name: 'contracts', description: 'Contratos de locação e laudos com selo SHA-256' },
                { name: 'imoveis', description: 'Catálogo de imóveis residenciais e comerciais' },
                { name: 'temporada_imoveis', description: 'Imóveis para aluguel por temporada e diárias estilo Airbnb' },
                { name: 'temporada_reservas', description: 'Reservas e vouchers de hospedagem temporária' },
                { name: 'users', description: 'Contas e perfis de usuários com isolamento estrito LGPD' },
                { name: 'public_contracts', description: 'Visualização pública via QR Code' },
              ]).map((col, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 text-xs">/{col.name}</span>
                  <span className="text-[11px] text-slate-500 text-right">{col.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: CURL EXAMPLES & REST DOCUMENTATION */}
      {activeTab === 'endpoints' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Documentação da API & Exemplos em cURL
                </h2>
                <p className="text-xs text-slate-500">
                  Consulte os comandos cURL prontos para integração com seus sistemas externos ou scripts de automação.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(curlExamples).map(([key, cmd]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="font-mono text-slate-900 uppercase">{key}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cmd, key)}
                    className="text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSection === key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar cURL</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">
                  {cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
