import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserAccount, UserRole } from '../types/contract';
import { 
  Users, UserPlus, Shield, ShieldCheck, ShieldAlert, 
  Check, X, Trash2, Key, Mail, Phone, Lock, AlertCircle, 
  Search, CheckCircle2, UserCheck, UserX, Building2, Home, Pencil
} from 'lucide-react';

export const UserManager: React.FC = () => {
  const { user, usersList, addUser, updateUser, approveUser, deleteUser, canAddAdmins, canAddClients } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'todos' | 'superadmin' | 'admin' | 'condomino' | 'cliente' | 'pendentes'>('todos');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for new user / condomino
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('condomino');
  const [formUnidade, setFormUnidade] = useState('');
  const [formBloco, setFormBloco] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formCreci, setFormCreci] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Edit (Update) modal state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'condomino' as UserRole,
    telefone: '',
    creci: '',
  });

  const isSuperAdmin = user?.role === 'superadmin';

  const isMasterAccount = (u: UserAccount) =>
    u.id === 'usr-master-iluminatto' || u.email.toLowerCase() === 'iluminatto@gmail.com';

  const canEditAccount = (u: UserAccount) => {
    if (isMasterAccount(u)) return false;
    if (isSuperAdmin) return true;
    // Admins can only edit non-admin accounts
    return user?.role === 'admin' && u.role !== 'admin';
  };

  const handleOpenEdit = (u: UserAccount) => {
    setErrorMsg('');
    setSuccessMsg('');
    setEditingUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      telefone: u.telefone || '',
      creci: u.creci || '',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (!editForm.name.trim() || !editForm.email.trim()) {
      setErrorMsg('Preencha os campos obrigatórios (Nome e E-mail).');
      return;
    }

    if (editForm.role === 'admin' && !isSuperAdmin) {
      setErrorMsg('Apenas o Administrador Principal (Iluminatto Moraes) pode promover usuários a Administrador.');
      return;
    }

    const res = await updateUser(editingUser.id, {
      name: editForm.name,
      email: editForm.email,
      password: editForm.password.trim() || undefined,
      role: editForm.role,
      telefone: editForm.telefone,
      creci: editForm.creci,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao atualizar usuário.');
    } else {
      setSuccessMsg(`Usuário ${editForm.name} atualizado com sucesso!`);
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    const ok = await deleteUser(u.id);
    setConfirmDeleteUserId(null);
    if (ok) {
      setSuccessMsg(`Usuário ${u.name} excluído com sucesso.`);
    } else {
      setErrorMsg(`Não foi possível excluir ${u.name}. Verifique suas permissões.`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setErrorMsg('Preencha os campos obrigatórios (Nome, E-mail e Senha).');
      return;
    }

    if (formRole === 'admin' && !isSuperAdmin) {
      setErrorMsg('Apenas o Administrador Principal (Iluminatto Moraes) pode criar novos Administradores.');
      return;
    }

    const res = await addUser(
      formName,
      formEmail,
      formPassword,
      formRole,
      formCreci,
      formTelefone,
      formUnidade,
      formBloco,
      formCpf
    );

    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao criar usuário.');
    } else {
      setSuccessMsg(`Usuário ${formName} (${formRole.toUpperCase()}) cadastrado com sucesso!`);
      setShowAddModal(false);
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormUnidade('');
      setFormBloco('');
      setFormCpf('');
      setFormCreci('');
      setFormTelefone('');
      setFormRole('condomino');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.unidade && u.unidade.toLowerCase().includes(search.toLowerCase())) ||
      (u.bloco && u.bloco.toLowerCase().includes(search.toLowerCase())) ||
      (u.cpf && u.cpf.toLowerCase().includes(search.toLowerCase())) ||
      (u.creci && u.creci.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (roleFilter === 'pendentes') return u.status === 'pendente';
    if (roleFilter !== 'todos') return u.role === roleFilter;

    return true;
  });

  const pendingCount = usersList.filter((u) => u.status === 'pendente').length;

  if (user?.role === 'cliente' || user?.role === 'condomino') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto shadow-xs">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito · Diretrizes LGPD</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          A listagem e gestão de condôminos e administradores é restrita à Administração. Em conformidade com o Art. 46 da Lei 13.709/2018 (LGPD), dados de outros condôminos e inquilinos são rigorosamente isolados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Role Explanatory Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Gestão de Condôminos & Administradores (ADM)
              </h2>
              {isSuperAdmin ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-md">
                  Super Admin
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-md">
                  Administrador ADM
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Controle de acessos e unidades condominiais. Condôminos cadastrados possuem isolamento estrito de dados (LGPD) e acessam exclusivamente seus contratos e laudos patrimoniais.
            </p>
          </div>
        </div>

        {canAddClients && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Novo Condômino / ADM</span>
          </button>
        )}
      </div>

      {/* Pending Approval Notice if any */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Existem <strong>{pendingCount}</strong> cadastro(s) pendente(s) de aprovação para acessar a plataforma.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRoleFilter('pendentes')}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 font-bold text-amber-950 rounded-lg transition-colors cursor-pointer"
          >
            Ver Pendentes
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por condômino, unidade, e-mail ou CPF..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {(
            [
              { key: 'todos', label: 'Todos' },
              { key: 'condomino', label: 'Condôminos' },
              { key: 'admin', label: 'Admins (ADM)' },
              { key: 'superadmin', label: 'Super Admin' },
              { key: 'cliente', label: 'Inquilinos' },
              { key: 'pendentes', label: `Pendentes (${pendingCount})` },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setRoleFilter(filter.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                roleFilter === filter.key
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users & Condôminos Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Condômino / Usuário</th>
                <th className="p-3.5">Unidade / Bloco</th>
                <th className="p-3.5">E-mail</th>
                <th className="p-3.5">Função (Role)</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Contato / CPF</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isMaster = u.id === 'usr-master-iluminatto' || u.email.toLowerCase() === 'iluminatto@gmail.com';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {isMaster && (
                            <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.5 rounded">
                              Principal
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{u.email}</td>
                    <td className="p-3.5">
                      {u.role === 'superadmin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900">
                          <Shield className="w-3 h-3 text-amber-600" />
                          <span>Super Admin</span>
                        </span>
                      ) : u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800">
                          <ShieldCheck className="w-3 h-3 text-blue-600" />
                          <span>Administrador</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          <span>Cliente</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {u.status === 'aprovado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aprovado</span>
                        </span>
                      ) : u.status === 'pendente' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          <span>Aguardando Aprovação</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <span>Bloqueado</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {u.telefone || u.creci ? (
                        <div>
                          {u.telefone && <div>{u.telefone}</div>}
                          {u.creci && <div className="text-[11px] text-slate-400">{u.creci}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {!isMaster && (
                        <div className="flex items-center justify-end gap-1.5">
                          {u.status === 'pendente' && (
                            <button
                              type="button"
                              onClick={() => approveUser(u.id, 'aprovado')}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Aprovar Usuário"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Aprovar</span>
                            </button>
                          )}

                          {u.status === 'aprovado' && (
                            <button
                              type="button"
                              onClick={() => approveUser(u.id, 'bloqueado')}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Suspender Acesso"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          {u.status === 'bloqueado' && (
                            <button
                              type="button"
                              onClick={() => approveUser(u.id, 'aprovado')}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Reativar Acesso"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit: Superadmin edits anyone (except master). Admin edits non-admin accounts. */}
                          {canEditAccount(u) && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar Usuário"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete: Superadmin can delete anyone except himself. Admin can only delete clients. */}
                          {(isSuperAdmin || (u.role === 'cliente' && user?.role === 'admin')) && (
                            confirmDeleteUserId === u.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                                <span className="text-[10px] text-red-700 font-bold px-1">Excluir?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUserId(u.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Adicionar Novo Usuário */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Cadastrar Novo Usuário</h3>
                  <p className="text-[11px] text-slate-400">
                    Defina credenciais de acesso com senha
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="usuario@dominio.com.br"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha de Acesso *
                </label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Defina uma senha"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Conta (Função) *
                </label>
                {canAddAdmins ? (
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="cliente">Cliente (Acesso a contratos e vistorias)</option>
                    <option value="admin">Administrador (Pode gerenciar e aprovar clientes)</option>
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium flex items-center justify-between">
                    <span>Cliente</span>
                    <span className="text-[10px] text-slate-500">
                      (Apenas Iluminatto pode adicionar Admins)
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CRECI ou CPF
                  </label>
                  <input
                    type="text"
                    value={formCreci}
                    onChange={(e) => setFormCreci(e.target.value)}
                    placeholder="Opcional"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuário / Administrador */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Editar Usuário</h3>
                  <p className="text-[11px] text-blue-200">
                    {editingUser.name} • Função atual: {editingUser.role.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-blue-200 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do usuário"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="usuario@dominio.com.br"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Senha (deixe em branco para manter)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Conta (Função) *
                </label>
                {isSuperAdmin ? (
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="cliente">Cliente (Acesso a contratos e vistorias)</option>
                    <option value="condomino">Condômino (Acesso restrito à própria unidade)</option>
                    <option value="admin">Administrador (Pode gerenciar e aprovar clientes)</option>
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium flex items-center justify-between">
                    <span>{editForm.role === 'admin' ? 'Administrador' : 'Cliente'}</span>
                    <span className="text-[10px] text-slate-500">
                      (Apenas o Administrador Principal altera funções)
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editForm.telefone}
                    onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CRECI ou CPF
                  </label>
                  <input
                    type="text"
                    value={editForm.creci}
                    onChange={(e) => setEditForm((f) => ({ ...f, creci: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
