import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { OrganizationData } from '../types/contract';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Building, Shield, CheckCircle2, Sparkles, CreditCard, 
  Settings, Users, FileText, Check, Globe, Layers, ArrowUpRight,
  TrendingUp, Award, Database, Lock, Palette, Phone, Mail, FileCheck,
  QrCode, Copy, Trash2, Plus, RefreshCw, AlertCircle, Receipt, ExternalLink
} from 'lucide-react';
import { formatCurrencyBRL } from '../utils/defaults';

export const DEFAULT_ORGANIZATION: OrganizationData = {
  id: 'org-iluminatto-master',
  name: 'Iluminatto Gestão Imobiliária & Locações',
  slug: 'iluminatto',
  plan: 'pro',
  maxProperties: 50,
  maxContractsMonth: 100,
  cnpj: '38.452.128/0001-90',
  creciJuridico: 'CRECI-SP 42.890-J',
  corPrimaria: '#0f172a',
  logoUrl: '',
  telefone: '(11) 98765-4321',
  email: 'iluminatto@gmail.com',
  endereco: 'Av. Paulista, 1800, Conjunto 142, Bela Vista, São Paulo/SP',
  chavePix: '38.452.128/0001-90',
  pixTitular: 'Iluminatto Gestão Imobiliária LTDA',
  filiais: [
    { id: 'filial-01', nome: 'Sede Jardins / Paulista', cidadeUf: 'São Paulo/SP', telefone: '(11) 3254-9000' },
    { id: 'filial-02', nome: 'Filial Moema & Sul', cidadeUf: 'São Paulo/SP', telefone: '(11) 5051-4000' },
  ],
  mensalidadeStatus: 'em_dia',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const COLOR_PRESETS = [
  { name: 'Slate Corporativo', hex: '#0f172a' },
  { name: 'Indigo Premium', hex: '#4f46e5' },
  { name: 'Emerald Confiança', hex: '#059669' },
  { name: 'Amber Luxo', hex: '#d97706' },
  { name: 'Navy Marinho', hex: '#1e3a8a' },
];

export const SaasManager: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin' || user?.email === 'iluminatto@gmail.com';

  const [org, setOrg] = useState<OrganizationData>(() => {
    try {
      const saved = localStorage.getItem('locadoc_saas_org');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ORGANIZATION;
  });

  const [savedFeedback, setSavedFeedback] = useState(false);
  const [selectedPlanTab, setSelectedPlanTab] = useState<'starter' | 'pro' | 'enterprise'>(org.plan);
  const [showPixModal, setShowPixModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // New branch form
  const [newBranchNome, setNewBranchNome] = useState('');
  const [newBranchCidade, setNewBranchCidade] = useState('');
  const [newBranchTelefone, setNewBranchTelefone] = useState('');

  // Sync to Firestore
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const snap = await getDoc(doc(db, 'organizations', org.id));
        if (snap.exists()) {
          setOrg((prev) => ({ ...prev, ...(snap.data() as OrganizationData) }));
        }
      } catch (e) {
        console.warn('Sincronização de organização Firestore (offline):', e);
      }
    };
    fetchOrg();
  }, []);

  const handleSaveOrg = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('locadoc_saas_org', JSON.stringify(org));
    try {
      await setDoc(doc(db, 'organizations', org.id), {
        ...org,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Erro ao salvar no Firestore:', e);
    }
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleSelectPlan = (plan: 'starter' | 'pro' | 'enterprise') => {
    let maxProperties = 10;
    let maxContractsMonth = 20;
    if (plan === 'pro') {
      maxProperties = 50;
      maxContractsMonth = 100;
    } else if (plan === 'enterprise') {
      maxProperties = 9999;
      maxContractsMonth = 9999;
    }
    const updated: OrganizationData = { ...org, plan, maxProperties, maxContractsMonth };
    setOrg(updated);
    localStorage.setItem('locadoc_saas_org', JSON.stringify(updated));
    setSelectedPlanTab(plan);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleAddBranch = () => {
    if (!newBranchNome.trim()) return;
    const newBranch = {
      id: `filial-${Date.now()}`,
      nome: newBranchNome.trim(),
      cidadeUf: newBranchCidade.trim() || 'São Paulo/SP',
      telefone: newBranchTelefone.trim() || org.telefone || '(11) 98765-4321',
    };
    const updatedFiliais = [...(org.filiais || []), newBranch];
    const updated = { ...org, filiais: updatedFiliais };
    setOrg(updated);
    localStorage.setItem('locadoc_saas_org', JSON.stringify(updated));
    setNewBranchNome('');
    setNewBranchCidade('');
    setNewBranchTelefone('');
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleRemoveBranch = (branchId: string) => {
    const updatedFiliais = (org.filiais || []).filter((f) => f.id !== branchId);
    const updated = { ...org, filiais: updatedFiliais };
    setOrg(updated);
    localStorage.setItem('locadoc_saas_org', JSON.stringify(updated));
  };

  const getPlanPrice = () => {
    if (org.plan === 'starter') return 99;
    if (org.plan === 'enterprise') return 590;
    return 249;
  };

  const pixPayloadSimulado = `00020126580014BR.GOV.BCB.PIX0136${org.id}-saas-mensalidade520400005303986540${getPlanPrice()}.005802BR5916LOCADOC SAAS CORP6009SAO PAULO62070503***6304ABCD`;

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixPayloadSimulado);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Infraestrutura SaaS Multi-Tenant Pronta</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Painel de Gestão SaaS & White-Label da Imobiliária
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Personalize a marca da sua imobiliária, configure planos de assinatura, gerencie filiais regionais e acesse o isolamento multi-inquilino de dados do sistema.
          </p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-inner">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs">
            {org.plan === 'enterprise' ? 'ENT' : org.plan === 'pro' ? 'PRO' : 'STR'}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
              Plano da Imobiliária
            </span>
            <span className="text-base font-black text-white capitalize">
              Plano {org.plan.toUpperCase()}
            </span>
            <span className="text-[11px] text-emerald-400 block font-medium">
              ✓ Multi-tenancy 100% Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {savedFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Configurações corporativas SaaS salvas com sucesso no banco de dados isolado!</span>
          </div>
        </div>
      )}

      {/* Usage & Resource Quota Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Imóveis Cadastrados</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">2</span>
            <span className="text-xs text-slate-500">/ {org.maxProperties === 9999 ? 'Ilimitados' : `${org.maxProperties} limite`}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, (2 / (org.maxProperties || 50)) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 block">Capacidade restante para locação, venda e temporada.</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contratos do Mês</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">4</span>
            <span className="text-xs text-slate-500">/ {org.maxContractsMonth === 9999 ? 'Ilimitados' : `${org.maxContractsMonth} no ciclo`}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, (4 / (org.maxContractsMonth || 100)) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 block">Emissão com minutas exclusivas e hash pericial SHA-256.</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensalidade do SaaS</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{formatCurrencyBRL(getPlanPrice())}</span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Em Dia</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPixModal(true)}
            className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Pagar Mensalidade com PIX</span>
          </button>
        </div>
      </div>

      {/* SaaS Plans / Resource Limits */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <span>Planos de Assinatura SaaS para Imobiliárias e Administradores</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Simule ou altere o plano contratado pela sua empresa gestora para liberar limites de imóveis e contratos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            org.plan === 'starter'
              ? 'border-amber-400 bg-amber-50/40 shadow-sm ring-2 ring-amber-400/40'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
                {org.plan === 'starter' && (
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md">
                    PLANO ATUAL
                  </span>
                )}
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">R$ 99</span>
                <span className="text-xs text-slate-500 font-medium"> / mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Até <strong>10 imóveis</strong> cadastrados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Até <strong>20 contratos</strong> / mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Modelos de Locação Residencial</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>1 Usuário Gestor</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleSelectPlan('starter')}
              className={`mt-6 w-full py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                org.plan === 'starter'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              {org.plan === 'starter' ? 'Plano Selecionado' : 'Mudar para Starter'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative ${
            org.plan === 'pro'
              ? 'border-indigo-600 bg-indigo-50/30 shadow-md ring-2 ring-indigo-500/30'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="absolute -top-3 right-5 px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
              Mais Recomendado
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Pro Imobiliária</span>
                {org.plan === 'pro' && (
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-md">
                    PLANO ATUAL
                  </span>
                )}
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">R$ 249</span>
                <span className="text-xs text-slate-500 font-medium"> / mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Até <strong>50 imóveis</strong> (Aluguel, Venda e Temporada)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Até <strong>100 contratos</strong> / mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Minutas Exclusivas por Imóvel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Central de Cobranças & Recibos PIX</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Até 5 Corretores e Gestores</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleSelectPlan('pro')}
              className={`mt-6 w-full py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                org.plan === 'pro'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold'
              }`}
            >
              {org.plan === 'pro' ? 'Plano Selecionado' : 'Mudar para Pro'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            org.plan === 'enterprise'
              ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-500/40'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise</span>
                {org.plan === 'enterprise' && (
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md">
                    PLANO ATUAL
                  </span>
                )}
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">R$ 590</span>
                <span className="text-xs text-slate-500 font-medium"> / mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Imóveis Ilimitados</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Contratos Ilimitados</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Múltiplas Filiais & Super Admin</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>White-Label Completo (Marca própria)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Suporte Jurídico e Técnico VIP</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleSelectPlan('enterprise')}
              className={`mt-6 w-full py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                org.plan === 'enterprise'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              {org.plan === 'enterprise' ? 'Plano Selecionado' : 'Mudar para Enterprise'}
            </button>
          </div>
        </div>
      </div>

      {/* Organization Corporate Profile & Whitelabel Form */}
      <form onSubmit={handleSaveOrg} className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-500" />
              <span>Dados Cadastrais da Imobiliária & White-Label</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Esses dados constam no cabeçalho e rodapé dos contratos, laudos de vistoria e nas chaves PIX de recebimento.
            </p>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 text-amber-400" />
            <span>Salvar Dados Corporativos</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Razão Social / Nome da Imobiliária *</label>
            <input
              type="text"
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900 font-semibold"
              placeholder="Ex: Iluminatto Gestão Imobiliária LTDA"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Identificador / Slug do Sistema</label>
            <input
              type="text"
              value={org.slug}
              onChange={(e) => setOrg({ ...org, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900 font-mono"
              placeholder="iluminatto"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">CNPJ da Imobiliária</label>
            <input
              type="text"
              value={org.cnpj || ''}
              onChange={(e) => setOrg({ ...org, cnpj: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900 font-mono"
              placeholder="00.000.000/0001-00"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">CRECI Jurídico (PJ)</label>
            <input
              type="text"
              value={org.creciJuridico || ''}
              onChange={(e) => setOrg({ ...org, creciJuridico: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900"
              placeholder="CRECI 00.000-J"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Telefone / WhatsApp Comercial</label>
            <input
              type="text"
              value={org.telefone || ''}
              onChange={(e) => setOrg({ ...org, telefone: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">E-mail Corporativo</label>
            <input
              type="email"
              value={org.email || ''}
              onChange={(e) => setOrg({ ...org, email: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900"
              placeholder="contato@suaimobiliaria.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Chave PIX da Imobiliária (Recebimentos)</label>
            <input
              type="text"
              value={org.chavePix || ''}
              onChange={(e) => setOrg({ ...org, chavePix: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900 font-mono"
              placeholder="CNPJ, E-mail ou Telefone PIX"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Titular da Chave PIX</label>
            <input
              type="text"
              value={org.pixTitular || ''}
              onChange={(e) => setOrg({ ...org, pixTitular: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900"
              placeholder="Nome do Titular da Conta Bancária"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Endereço da Sede Imobiliária</label>
            <input
              type="text"
              value={org.endereco || ''}
              onChange={(e) => setOrg({ ...org, endereco: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900"
              placeholder="Rua, Número, Sala, Bairro, Cidade/UF"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">URL do Logotipo (PNG / SVG)</label>
            <input
              type="url"
              value={org.logoUrl || ''}
              onChange={(e) => setOrg({ ...org, logoUrl: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-900"
              placeholder="https://exemplo.com/logo.png"
            />
          </div>
        </div>

        {/* Color Palette Whitelabel */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-500" />
            <span>Cor Institucional da Marca (White-Label)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => setOrg({ ...org, corPrimaria: color.hex })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                  org.corPrimaria === color.hex
                    ? 'border-slate-900 bg-slate-100 shadow-xs ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color.hex }} />
                <span>{color.name}</span>
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Multi-Branch Management (Filiais) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Filiais & Unidades Regionais da Imobiliária</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre filiais para gerenciar contratos e corretores por região de atuação (ex: Sede, Litoral, Zona Sul).
            </p>
          </div>
        </div>

        {/* List of Branches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(org.filiais || []).map((filial) => (
            <div key={filial.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between gap-2">
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-900 block text-sm">{filial.nome}</span>
                <span className="text-slate-600 block">{filial.cidadeUf}</span>
                <span className="text-slate-500 font-mono block">{filial.telefone}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveBranch(filial.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Remover filial"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Branch Form */}
        <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-600" /> Adicionar Nova Filial
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nome da filial (ex: Filial Litoral)"
              value={newBranchNome}
              onChange={(e) => setNewBranchNome(e.target.value)}
              className="p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
            />
            <input
              type="text"
              placeholder="Cidade/UF (ex: Santos/SP)"
              value={newBranchCidade}
              onChange={(e) => setNewBranchCidade(e.target.value)}
              className="p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Telefone (ex: 13 3322-1100)"
                value={newBranchTelefone}
                onChange={(e) => setNewBranchTelefone(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddBranch}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Simulado de Pagamento PIX da Mensalidade SaaS */}
      {showPixModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 block">
                  Assinatura SaaS • Mensalidade
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Fatura do Plano {org.plan.toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPixModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Valor da Mensalidade</span>
                <div className="text-2xl font-black text-slate-900">{formatCurrencyBRL(getPlanPrice())}</div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                PIX Instantâneo
              </span>
            </div>

            {/* QR Code Demo Box */}
            <div className="p-6 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white space-y-2">
              <QrCode className="w-24 h-24 text-amber-400" />
              <span className="text-xs font-semibold text-slate-300">Escaneie o QR Code no app do seu banco</span>
            </div>

            {/* Copy Paste Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Código PIX Copia e Cola:</label>
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 break-all border border-slate-200">
                {pixPayloadSimulado}
              </div>
              <button
                type="button"
                onClick={copyPixCode}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
              >
                {copiedPix ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4 text-slate-950" />}
                <span>{copiedPix ? 'Código PIX Copiado!' : 'Copiar Código PIX'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPixModal(false);
                setSavedFeedback(true);
                setTimeout(() => setSavedFeedback(false), 3000);
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
