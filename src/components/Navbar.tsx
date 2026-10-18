import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, PlusCircle, FolderClock, ClipboardList, 
  ShieldAlert, LogOut, User, Building2, Users, Edit3, 
  Shield, CheckCircle2, Palmtree, CalendarDays, Cpu, LayoutDashboard, Settings
} from 'lucide-react';

export type AppTab = 
  | 'dashboard'
  | 'imoveis' 
  | 'temporada'
  | 'gerador' 
  | 'editor' 
  | 'visualizador' 
  | 'inventario' 
  | 'auditoria' 
  | 'historico' 
  | 'usuarios'
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

  const isCondomino = user?.role === 'cliente' || user?.role === 'condomino';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Title bar with System Name */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-xs group-hover:bg-slate-800 transition-colors">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap block">
                LocaDoc
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase block -mt-0.5">
                Gestão Imobiliária & Contratos
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Responsive) */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-full">
          {/* Dashboard Tab (First / Home) */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Dashboard</span>
          </button>

          {!isCondomino && (
            <button
              type="button"
              onClick={() => setActiveTab('imoveis')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'imoveis'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Imóveis</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('temporada')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'temporada'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50/80 border border-amber-200/60'
            }`}
          >
            <Palmtree className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold">Temporada / Diárias</span>
            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold tracking-wide">
              Airbnb
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visualizador')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'visualizador'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isCondomino ? 'Meu Contrato' : 'Contrato Oficial'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isCondomino ? 'Meus Dados Cadastrais' : 'Preencher Contrato'}</span>
          </button>

          {!isCondomino && (
            <button
              type="button"
              onClick={() => setActiveTab('gerador')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'gerador'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Extração por Documentos</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('inventario')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'inventario'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>{isCondomino ? 'Inventário da Unidade' : 'Anexo I (Inventário & Fotos)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'auditoria'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Auditoria & Segurança LGPD</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderClock className="w-3.5 h-3.5" />
            <span>{isCondomino ? 'Histórico' : 'Contratos'}</span>
          </button>

          {/* User management tab for Admins and Iluminatto Superadmin */}
          {canAddClients && !isCondomino && (
            <button
              type="button"
              onClick={() => setActiveTab('usuarios')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'usuarios'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Condôminos & ADM</span>
            </button>
          )}

          {/* LLMs & API Settings Tab in Nav */}
          {!isCondomino && (
            <button
              type="button"
              onClick={() => setActiveTab('api_gemini')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'api_gemini'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-500" />
              <span>Configurações & APIs</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold tracking-wide">
                LLMs
              </span>
            </button>
          )}
        </nav>

        {/* Zone 3: Quick Settings & User Session */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick settings button in header */}
          {!isCondomino && (
            <button
              type="button"
              onClick={() => setActiveTab('api_gemini')}
              title="Configurações do Sistema, Endpoints Customizados & Chaves LLM"
              className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all border ${
                activeTab === 'api_gemini'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Settings className={`w-3.5 h-3.5 text-amber-500 ${activeTab === 'api_gemini' ? 'animate-spin' : ''}`} />
              <span className="font-bold">Configurações</span>
            </button>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-[150px]">
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
                <span className="text-[11px] text-slate-500 block -mt-0.5 truncate max-w-[150px]">
                  {user?.email && !user.email.toLowerCase().includes('roberto')
                    ? user.email
                    : 'iluminatto@gmail.com'}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Desconectar da conta"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Acessar Plataforma</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
