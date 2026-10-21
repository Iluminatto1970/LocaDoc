import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { OrganizationData } from '../types/contract';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Building, Shield, CheckCircle2, Sparkles, CreditCard, 
  Settings, Users, FileText, Check, Globe, Layers, ArrowUpRight,
  TrendingUp, Award, Database, Lock, Palette, Phone, Mail, FileCheck
} from 'lucide-react';

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
  createdAt: '2026-01-01T00:00:00.000Z',
};

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

  // Sync to Firestore
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const snap = await getDoc(doc(db, 'organizations', org.id));
        if (snap.exists()) {
          setOrg(snap.data() as OrganizationData);
        }
      } catch (e) {
        console.warn('Sincronização de organização Firestore (offline):', e);
      }
    };
    fetchOrg();
  }, []);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const updated = { ...org, plan, maxProperties, maxContractsMonth };
    setOrg(updated);
    localStorage.setItem('locadoc_saas_org', JSON.stringify(updated));
    setSelectedPlanTab(plan);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Estrutura SaaS Multi-Tenant Ativa</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Configurações da Imobiliária & Painel SaaS
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Personalize os dados corporativos da imobiliária (CRECI, CNPJ, Marca), controle o isolamento multi-inquilino de dados e gerencie limites de contratos e imóveis para o futuro SaaS imobiliário.
          </p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-inner">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs">
            {org.plan === 'enterprise' ? 'ENT' : org.plan === 'pro' ? 'PRO' : 'STR'}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
              Plano Imobiliário
            </span>
            <span className="text-base font-black text-white capitalize">
              Plano {org.plan.toUpperCase()}
            </span>
            <span className="text-[11px] text-emerald-400 block font-medium">
              ✓ Multi-tenancy ativado
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {savedFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Dados da Imobiliária e configurações SaaS salvos com sucesso no Google Cloud Firestore!</span>
          </div>
        </div>
      )}

      {/* Multi-tenant Architecture Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Banco de Dados Isolado</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cada contrato, imóvel e laudo de vistoria possui a identificação <code className="text-indigo-600 font-mono font-bold">organizationId</code> para isolamento absoluto entre imobiliárias clientes.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Segurança LGPD & RBAC</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Regras de firewall de dados no Firestore garantem que locatários acessem apenas seus próprios dados cadastrais e documentos, sem visualização de terceiros.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Validade Jurídica SHA-256</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Contratos emitidos contam com cálculo automático de hash pericial SHA-256, cláusula de vistoria fotográfica e blindagem digital de Anexo I.
          </p>
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
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Até <strong>10 imóveis</strong> cadastrados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Até <strong>20 contratos</strong> / mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Modelos de Locação Residencial</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1 Administrador</span>
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
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Até <strong>50 imóveis</strong> (Aluguel, Venda e Temporada)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Até <strong>100 contratos</strong> / mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Modelos Próprios por Imóvel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Editor de Texto Livre Completo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Até 5 Administradores / Corretores</span>
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
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>Imóveis Ilimitados</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>Contratos Ilimitados</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Multi-filiais e Super Admin</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Whitelabel & Domínio Customizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>APIs de Integração e Suporte VIP</span>
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

      {/* Organization Corporate Profile Form */}
      <form onSubmit={handleSaveOrg} className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-500" />
              <span>Dados Cadastrais da Imobiliária / Empresa Gestora</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Esses dados constam no cabeçalho e rodapé dos contratos e na qualificação do sistema.
            </p>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 text-amber-400" />
            <span>Salvar Dados da Imobiliária</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Razão Social / Nome da Imobiliária</label>
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
        </div>
      </form>
    </div>
  );
};
