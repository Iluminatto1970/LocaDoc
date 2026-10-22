import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, PlusCircle, FolderClock, ClipboardList, 
  ShieldAlert, LogOut, User, Building2, Users, Edit3, 
  Shield, CheckCircle2, Palmtree, CalendarDays, Cpu, 
  LayoutDashboard, Settings, CreditCard, Menu, X, ChevronRight, DollarSign, FileCode
} from 'lucide-react';

export type AppTab = 
  | 'dashboard'
  | 'imoveis' 
  | 'minutas'
  | 'temporada'
  | 'cobrancas'
  | 'gerador' 
  | 'editor' 
  | 'visualizador' 
  | 'inventario' 
  | 'auditoria' 
  | 'historico' 
  | 'usuarios'
  | 'saas'
  | 'api_gemini';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  hasActiveContract: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasActiveContract,
}) => {
  const { user, logout, setShowAuthModal, canAddClients } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCondomino = user?.role === 'cliente' || user?.role === 'condomino';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navigateTo = (tab: AppTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Zone 1: Title bar with System Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-xs group-hover:bg-slate-800 transition-colors shrink-0">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <div className="hidden min-[360px]:block">
                <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight">
                  LocaDoc
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase block">
                  Gestão Imobiliária & Cobranças
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Links (Hidden on small mobile, scrollable on desktop) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-full">
            {/* Dashboard Tab */}
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Dashboard</span>
            </button>

            {/* Imóveis Tab */}
            <button
              type="button"
              onClick={() => navigateTo('imoveis')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'imoveis'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{isCondomino ? 'Meu Imóvel' : 'Imóveis'}</span>
            </button>

            {/* Minutas & Modelos Tab */}
            {!isCondomino && (
              <button
                type="button"
                onClick={() => navigateTo('minutas')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'minutas'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-amber-500" />
                <span>Minutas</span>
              </button>
            )}

            {/* Cobranças & Recibos Tab (NEW) */}
            <button
              type="button"
              onClick={() => navigateTo('cobrancas')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cobrancas'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200/50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isCondomino ? 'Minhas Cobranças & Recibos' : 'Cobranças & Recibos'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            {/* Temporada Tab */}
            <button
              type="button"
              onClick={() => navigateTo('temporada')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'temporada'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50/80 border border-amber-200/60'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">Temporada</span>
            </button>

            {/* Contrato Oficial */}
            <button
              type="button"
              onClick={() => navigateTo('visualizador')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'visualizador'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isCondomino ? 'Meu Contrato' : 'Contrato'}</span>
            </button>

            {/* Editor de Contrato */}
            <button
              type="button"
              onClick={() => navigateTo('editor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isCondomino ? 'Meus Dados' : 'Editor'}</span>
            </button>

            {!isCondomino && (
              <button
                type="button"
                onClick={() => navigateTo('gerador')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'gerador'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>OCR</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('inventario')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'inventario'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Inventário</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('auditoria')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'auditoria'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Auditoria</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('historico')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'historico'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FolderClock className="w-3.5 h-3.5" />
              <span>Histórico</span>
            </button>

            {/* User management tab for Admins */}
            {canAddClients && !isCondomino && (
              <button
                type="button"
                onClick={() => navigateTo('usuarios')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ADM</span>
              </button>
            )}

            {/* SaaS Tab */}
            {!isCondomino && (
              <button
                type="button"
                onClick={() => navigateTo('saas')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'saas'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>SaaS</span>
              </button>
            )}

            {/* LLMs & API Settings Tab */}
            {!isCondomino && (
              <button
                type="button"
                onClick={() => navigateTo('api_gemini')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'api_gemini'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-amber-500" />
                <span>LLMs</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Quick Settings & User Session */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick settings button in header */}
            {!isCondomino && (
              <button
                type="button"
                onClick={() => navigateTo('api_gemini')}
                title="Configurações do Sistema & APIs LLM"
                className={`hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 cursor-pointer transition-all border ${
                  activeTab === 'api_gemini'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Settings className={`w-3.5 h-3.5 text-amber-500 ${activeTab === 'api_gemini' ? 'animate-spin' : ''}`} />
                <span className="font-bold">APIs</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[140px]">
                      {user?.name && !user.name.toLowerCase().includes('roberto') && !user.name.toLowerCase().includes('magalh')
                        ? user.name
                        : 'Iluminatto Moraes'}
                    </span>
                    {user.role === 'superadmin' || user.email === 'iluminatto@gmail.com' ? (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] font-bold rounded">
                        Super Admin
                      </span>
                    ) : user.role === 'admin' ? (
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 text-[10px] font-bold rounded">
                        Adm
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-medium rounded">
                        Cliente
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block -mt-0.5 truncate max-w-[140px]">
                    {user?.email && !user.email.toLowerCase().includes('roberto')
                      ? user.email
                      : 'iluminatto@gmail.com'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  title="Desconectar da conta"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay (Ultra Responsive for Phones and Tablets) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu Content */}
          <div className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-left duration-250">
            <div>
              {/* Drawer Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white leading-tight">LocaDoc Gestão</h2>
                    <p className="text-[11px] text-slate-400">Contratos, Cobranças & Vistorias</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Identity in Drawer */}
              {user && (
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      {user.name && !user.name.toLowerCase().includes('roberto') ? user.name : 'Iluminatto Moraes'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {user.email}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                    user.role === 'superadmin' ? 'bg-amber-100 text-amber-900' : user.role === 'admin' ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Categorized Navigation Links */}
              <div className="p-4 space-y-5">
                {/* Group 1: Gestão Principal & Financeiro */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                    Operações & Financeiro
                  </span>

                  <button
                    type="button"
                    onClick={() => navigateTo('dashboard')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>Painel Dashboard</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('cobrancas')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'cobrancas' ? 'bg-emerald-600 text-white' : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span>Cobranças Mensais & Recibos</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-extrabold uppercase">
                      Ativo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('imoveis')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'imoveis' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`w-4 h-4 ${activeTab === 'imoveis' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>{isCondomino ? 'Meu Imóvel Locado' : 'Gerenciador de Imóveis'}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('temporada')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'temporada' ? 'bg-amber-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Palmtree className={`w-4 h-4 ${activeTab === 'temporada' ? 'text-white' : 'text-amber-500'}`} />
                      <span>Temporada & Diárias (Airbnb)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>

                {/* Group 2: Contratos & Documentos */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                    Contratos & Minutas
                  </span>

                  {!isCondomino && (
                    <button
                      type="button"
                      onClick={() => navigateTo('minutas')}
                      className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                        activeTab === 'minutas' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileCode className={`w-4 h-4 ${activeTab === 'minutas' ? 'text-amber-400' : 'text-amber-500'}`} />
                        <span>Minutas & Modelos de Contratos</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigateTo('visualizador')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'visualizador' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${activeTab === 'visualizador' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>Contrato Oficial & Impressão</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('editor')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'editor' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Edit3 className={`w-4 h-4 ${activeTab === 'editor' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>Editor de Contrato & Modelos</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {!isCondomino && (
                    <button
                      type="button"
                      onClick={() => navigateTo('gerador')}
                      className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                        activeTab === 'gerador' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <PlusCircle className={`w-4 h-4 ${activeTab === 'gerador' ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span>Extração de Dados por OCR</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigateTo('historico')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'historico' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderClock className={`w-4 h-4 ${activeTab === 'historico' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>Histórico de Contratos</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>

                {/* Group 3: Vistoria & LGPD */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                    Vistoria & Conformidade
                  </span>

                  <button
                    type="button"
                    onClick={() => navigateTo('inventario')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'inventario' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ClipboardList className={`w-4 h-4 ${activeTab === 'inventario' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>Anexo I (Inventário & Fotos)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('auditoria')}
                    className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      activeTab === 'auditoria' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <span>Auditoria & Hash SHA-256</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>

                {/* Group 4: Administração & SaaS */}
                {!isCondomino && (
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                      Administração
                    </span>

                    {canAddClients && (
                      <button
                        type="button"
                        onClick={() => navigateTo('usuarios')}
                        className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                          activeTab === 'usuarios' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4" />
                          <span>Condôminos & ADM</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigateTo('saas')}
                      className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                        activeTab === 'saas' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <span>SaaS Multi-Tenant</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('api_gemini')}
                      className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                        activeTab === 'api_gemini' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-amber-500" />
                        <span>Configurações & APIs</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 px-3 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Desconectar Sessão</span>
              </button>
              <div className="text-[10px] text-center text-slate-400">
                LocaDoc © 2026 • Lei 8.245/91
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Persistent quick access on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex items-center justify-around shadow-lg no-print">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors cursor-pointer min-w-[50px] ${
            activeTab === 'dashboard' ? 'text-amber-500 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Início</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('imoveis')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors cursor-pointer min-w-[50px] ${
            activeTab === 'imoveis' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">Imóveis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cobrancas')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors cursor-pointer min-w-[50px] relative ${
            activeTab === 'cobrancas' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-600'
          }`}
        >
          <div className="relative">
            <CreditCard className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-1"></span>
          </div>
          <span className="text-[10px]">Cobranças</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('visualizador')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors cursor-pointer min-w-[50px] ${
            activeTab === 'visualizador' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Contrato</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer min-w-[50px]"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Mais</span>
        </button>
      </div>
    </>
  );
};
