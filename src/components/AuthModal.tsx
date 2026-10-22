import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ShieldCheck, KeyRound, Building, CheckCircle2, ArrowRight, Shield, Phone, Loader2, X, ExternalLink, Copy, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, login, register, isAuthenticated, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('iluminatto@gmail.com');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [creci, setCreci] = useState('');
  const [telefone, setTelefone] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!showAuthModal && isAuthenticated) {
    return null;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Credenciais inválidas. Verifique seu login e senha.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!name || !email || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    const res = await register(name, email, password, creci, telefone);
    if (!res.success) {
      setError(res.error || 'Erro ao criar conta. Tente novamente.');
    } else {
      setSuccessMsg(res.error || 'Solicitação enviada com sucesso! Aguarde a aprovação do Administrador.');
      setTab('login');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
              <Building className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">LocaDoc</h2>
              <p className="text-xs text-slate-400">Sistema de Gestão de Contratos e Vistorias</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Área de acesso restrito. É necessário estar autenticado para criar ou gerenciar contratos e imóveis.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Acessar com Senha
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Solicitar Acesso (Cliente)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {unauthorizedDomain && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-3 shadow-xs animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block text-sm">
                      Autorizar Domínio no Firebase ({unauthorizedDomain})
                    </span>
                    <p className="text-amber-800 text-[11px] leading-relaxed mt-0.5">
                      O Google Sign-In exige que este endereço esteja cadastrado na lista de <strong>Authorized Domains</strong> do seu projeto Firebase.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnauthorizedDomain(null)}
                  className="text-amber-500 hover:text-amber-800 p-0.5 rounded cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Domínio a adicionar:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    <span>{unauthorizedDomain}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(unauthorizedDomain);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2000);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer transition-colors"
                      title="Copiar domínio"
                    >
                      {copiedDomain ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-slate-600 space-y-1">
                  <p>1. Abra o link do Firebase Console abaixo.</p>
                  <p>2. Vá em <strong>Authentication &rarr; Settings &rarr; Authorized domains</strong>.</p>
                  <p>3. Clique em <strong>Add domain</strong>, cole <strong className="font-mono text-amber-900">{unauthorizedDomain}</strong> e salve.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0839703506/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Abrir Firebase Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setUnauthorizedDomain(null);
                    setEmail('iluminatto@gmail.com');
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Entrar com Senha Direta
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start justify-between gap-2 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-700 p-0.5 rounded cursor-pointer shrink-0 transition-colors"
                title="Fechar alerta"
                aria-label="Fechar mensagem de erro"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Usuário ou E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                    placeholder="seu.email@exemplo.com ou usuário"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-900"
                  />
                </div>
              </div>

              {/* Google Sign-In with Firebase Auth */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={async () => {
                  setError('');
                  setIsGoogleLoading(true);
                  try {
                    await signInWithGoogle();
                  } catch (err: any) {
                    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
                      const host = window.location.hostname || 'loca-doc.vercel.app';
                      setUnauthorizedDomain(host);
                      setIsGoogleLoading(false);
                      return;
                    }
                    let msg = err?.message || 'Tente novamente';
                    if (err?.code === 'auth/popup-closed-by-user') {
                      msg = 'A janela de autenticação do Google foi fechada antes de concluir.';
                    } else if (err?.code === 'auth/cancelled-popup-request') {
                      msg = 'Operação cancelada pelo usuário.';
                    } else if (err?.code === 'auth/popup-blocked') {
                      msg = 'O navegador bloqueou o popup de autenticação. Permita popups para esta página ou entre com a sua senha abaixo.';
                    } else if (err?.code === 'auth/internal-error') {
                      msg = 'Comunicação com o Google bloqueada por restrição de cookies/popup no navegador. Você pode acessar diretamente preenchendo sua senha abaixo.';
                    } else if (err?.code === 'auth/network-request-failed') {
                      msg = 'Falha de rede ao contatar o servidor Google. Verifique sua conexão.';
                    }
                    setError('Falha ao autenticar com Google: ' + msg);
                  } finally {
                    setIsGoogleLoading(false);
                  }
                }}
                className={`w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs sm:text-sm rounded-lg shadow-2xs transition-all flex items-center justify-center gap-3 cursor-pointer mb-2 ${
                  isGoogleLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Autenticando no Google...' : 'Entrar com Conta Google'}</span>
              </button>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CRECI ou CPF
                    </label>
                    <input
                      type="text"
                      value={creci}
                      onChange={(e) => setCreci(e.target.value)}
                      placeholder="Opcional"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Definir Senha de Acesso *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie uma senha segura"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-900"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Após o cadastro, sua conta passará por aprovação da administração antes da liberação.
                </p>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors mt-2 cursor-pointer"
                >
                  Solicitar Cadastro
                </button>
              </form>
            </div>
          )}

          {isAuthenticated && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Fechar janela
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
