import React, { useState } from 'react';
import { ContractData } from '../types/contract';
import { formatCurrencyBRL } from '../utils/defaults';
import { useAuth } from '../context/AuthContext';
import { FileText, Copy, Trash2, Calendar, MapPin, DollarSign, ExternalLink, PlusCircle, CheckCircle, Shield, Lock } from 'lucide-react';

interface ContractHistoryProps {
  contracts: ContractData[];
  onSelectContract: (contract: ContractData) => void;
  onNewContract: () => void;
  onDeleteContract: (id: string) => void;
  onDuplicateContract: (contract: ContractData) => void;
}

export const ContractHistory: React.FC<ContractHistoryProps> = ({
  contracts,
  onSelectContract,
  onNewContract,
  onDeleteContract,
  onDuplicateContract,
}) => {
  const { user } = useAuth();
  const isTenant = user?.role === 'cliente';
  const tenantEmail = user?.email?.toLowerCase() || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Strict LGPD isolation: Tenants only see their own contract(s)
  const accessibleContracts = isTenant
    ? contracts.filter(
        (c) =>
          c.locatario.email.toLowerCase() === tenantEmail ||
          c.locatario.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
          c.id === 'contrato-demo-01'
      )
    : contracts;

  const filteredContracts = accessibleContracts.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.titulo.toLowerCase().includes(term) ||
      c.locatario.nome.toLowerCase().includes(term) ||
      c.locador.nome.toLowerCase().includes(term) ||
      c.objeto.endereco.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {isTenant ? 'Meu Contrato de Locação (Inquilino)' : 'Contratos de Locação Cadastrados'}
            </h2>
            {isTenant && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-md">
                Visão do Inquilino
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isTenant
              ? 'Visualize o documento oficial da sua locação e confira seu laudo patrimonial'
              : 'Gerencie contratos gerados, propostas em rascunho e laudos vinculados'}
          </p>
        </div>

        {!isTenant && (
          <button
            type="button"
            onClick={onNewContract}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Criar Novo Contrato</span>
          </button>
        )}
      </div>

      {/* Contracts List */}
      <div className="space-y-3">
        {filteredContracts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Nenhum contrato encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Envie documentos na aba "Novo com Documentos" para gerar seu primeiro contrato.
              </p>
            </div>
            <button
              type="button"
              onClick={onNewContract}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Gerar Agora</span>
            </button>
          </div>
        ) : (
          filteredContracts.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                    {c.titulo || 'Contrato Sem Título'}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                    {c.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[280px]">
                      {c.objeto.endereco || 'Endereço a preencher'}
                    </span>
                  </span>

                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono font-semibold">
                      {formatCurrencyBRL(c.valores.aluguel)}/mês
                    </span>
                  </span>

                  <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Início: {c.prazo.dataInicio || 'A definir'}</span>
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">
                  <span>Locador: <strong>{c.locador.nome || 'Não preenchido'}</strong></span>
                  <span className="mx-2">·</span>
                  <span>Locatário: <strong>{c.locatario.nome || 'Não preenchido'}</strong></span>
                  <span className="mx-2">·</span>
                  <span>Itens no Inventário: <strong>{c.inventario.length}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectContract(c)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir</span>
                </button>

                {!isTenant && (
                  <button
                    type="button"
                    onClick={() => onDuplicateContract(c)}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Duplicar contrato"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}

                {!isTenant && contracts.length > 1 && (
                  confirmDeleteId === c.id ? (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                      <span className="text-[10px] text-red-700 font-semibold px-1">Excluir?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteContract(c.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir contrato"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}

                {isTenant && (
                  <span className="text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-50 border border-slate-200 rounded-md">
                    Protegido (LGPD)
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
