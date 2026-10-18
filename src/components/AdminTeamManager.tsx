import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserAccount } from '../types/contract';
import {
  ShieldCheck, UserPlus, Pencil, Trash2, X, Check, Shield, Users
} from 'lucide-react';

/**
 * Painel de Gestão de Administradores (ADM) — visível apenas para o Super Admin.
 * Permite CRUD completo (criar, listar, editar, excluir) de contas de Administrador
 * diretamente dentro da aba "Configurações & APIs".
 */
export const AdminTeamManager: React.FC = () => {
  const { user, usersList, addUser, updateUser, deleteUser } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', telefone: '', creci: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (user?.role !== 'superadmin') return null;

  const admins = usersList.filter((u) => u.role === 'superadmin' || u.role === 'admin');
  const isMaster = (u: UserAccount) =>
    u.id === 'usr-master-iluminatto' || u.email.toLowerCase() === 'iluminatto@gmail.com';

  const resetFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleOpenCreate = () => {
    resetFeedback();
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', telefone: '', creci: '' });
    setShowForm(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    resetFeedback();
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      telefone: u.telefone || '',
      creci: u.creci || '',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg('Preencha os campos obrigatórios (Nome e E-mail).');
      return;
    }

    if (editingUser) {
      const res = await updateUser(editingUser.id, {
        name: form.name,
        email: form.email,
        password: form.password.trim() || undefined,
        telefone: form.telefone,
        creci: form.creci,
      });
      if (!res.success) {
        setErrorMsg(res.error || 'Erro ao atualizar administrador.');
        return;
      }
      setSuccessMsg(`Administrador ${form.name} atualizado com sucesso!`);
    } else {
      if (!form.password.trim()) {
        setErrorMsg('Defina uma senha de acesso para o novo administrador.');
        return;
      }
      const res = await addUser(form.name, form.email, form.password, 'admin', form.creci, form.telefone);
      if (!res.success) {
        setErrorMsg(res.error || 'Erro ao criar administrador.');
        return;
      }
      setSuccessMsg(`Administrador ${form.name} cadastrado com sucesso!`);
    }

    handleCloseForm();
  };

  const handleDelete = async (u: UserAccount) => {
    resetFeedback();
    const ok = await deleteUser(u.id);
    setConfirmDeleteId(null);
    if (ok) {
      setSuccessMsg(`Administrador ${u.name} excluído com sucesso.`);
    } else {
      setErrorMsg(`Não foi possível excluir ${u.name}. Verifique suas permissões.`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span>Equipe de Administração (ADM)</span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-extrabold">
                Super Admin
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Adicione, edite e exclua administradores da plataforma. Apenas você (Administrador Principal) pode gerenciar ADMs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Administrador</span>
        </button>
      </div>

      <div className="p-4 space-y-2.5">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {admins.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Users className="w-6 h-6" />
            <span>Nenhum administrador cadastrado ainda.</span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {admins.map((u) => (
              <li key={u.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
                    {u.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="truncate">{u.name}</span>
                      {isMaster(u) ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-100 text-amber-900 rounded shrink-0">
                          Principal
                        </span>
                      ) : u.role === 'admin' ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-800 rounded shrink-0 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          ADM
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {u.email}
                      {u.creci ? ` • ${u.creci}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isMaster(u) && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar Administrador"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === u.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                          <span className="text-[10px] text-red-700 font-bold px-1">Excluir?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded cursor-pointer"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(u.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Administrador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal: Criar / Editar Administrador */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  {editingUser ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingUser ? 'Editar Administrador' : 'Novo Administrador'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingUser
                      ? 'Atualize os dados de acesso da conta ADM'
                      : 'Conceda acesso total de administração ao novo integrante'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do administrador"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="admin@dominio.com.br"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Defina uma senha"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CRECI</label>
                  <input
                    type="text"
                    value={form.creci}
                    onChange={(e) => setForm((f) => ({ ...f, creci: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Esta conta será criada com função <strong>Administrador (ADM)</strong>, com permissão para gerenciar condôminos, contratos e aprovações.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
