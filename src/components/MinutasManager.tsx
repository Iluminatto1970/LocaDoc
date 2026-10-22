import React, { useState, useEffect, useRef } from 'react';
import { ContractTemplate, ImovelData, ContractData, ContractOperationType } from '../types/contract';
import { getSavedTemplates, saveContractTemplate, interpolateTemplate, DEFAULT_TEMPLATES } from '../utils/templates';
import { formatCurrencyBRL, getEmptyContract, numeroPorExtensoReais } from '../utils/defaults';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import {
  FileText, Plus, Upload, Download, Edit3, Trash2, Copy, Sparkles,
  Check, CheckCircle2, Layers, Building2, Eye, ArrowRight, Search,
  Handshake, Palmtree, Tag, HelpCircle, X, Bookmark, FileCode,
  FileCheck, ShieldCheck, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';

interface MinutasManagerProps {
  imoveis: ImovelData[];
  onGenerateContractWithTemplate: (template: ContractTemplate, imovel?: ImovelData) => void;
  onLinkTemplateToImovel?: (templateId: string, imovelId: string) => void;
}

export const MinutasManager: React.FC<MinutasManagerProps> = ({
  imoveis,
  onGenerateContractWithTemplate,
  onLinkTemplateToImovel,
}) => {
  const { user } = useAuth();
  const isTenant = user?.role === 'cliente' || user?.role === 'condomino';

  const [templates, setTemplates] = useState<ContractTemplate[]>(() => getSavedTemplates());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  
  // Modal states
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<ContractTemplate | null>(null);
  const [showLinkModal, setShowLinkModal] = useState<ContractTemplate | null>(null);
  const [selectedImovelForPreview, setSelectedImovelForPreview] = useState<string>(imoveis[0]?.id || '');
  
  // Form states for creating/editing template
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<ContractTemplate['categoria']>('aluguel_residencial');
  const [descricao, setDescricao] = useState('');
  const [conteudoTexto, setConteudoTexto] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTemplates(getSavedTemplates());
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleOpenNewModal = (initialCategory?: ContractTemplate['categoria']) => {
    setEditingTemplate(null);
    setTitulo('');
    setCategoria(initialCategory || 'aluguel_residencial');
    setDescricao('');
    setConteudoTexto(`INSTRUMENTO PARTICULAR DE CONTRATO
Regido pela Legislação Brasileira em vigor

DAS PARTES CONTRATANTES:
LOCADOR/VENDEDOR: {{LOCADOR_NOME}}, inscrito no CPF sob nº {{LOCADOR_CPF}}, residente em {{LOCADOR_ENDERECO}}, e-mail: {{LOCADOR_EMAIL}}.
LOCATÁRIO/COMPRADOR: {{LOCATARIO_NOME}}, inscrito no CPF sob nº {{LOCATARIO_CPF}}, e-mail: {{LOCATARIO_EMAIL}}.

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto o imóvel situado em {{IMOVEL_ENDERECO}}.
Descrição: {{IMOVEL_COMPOSTOS}}

CLÁUSULA 2ª - DO VALOR E PAGAMENTO
O valor convencionado é de {{VALOR_ALUGUEL}} (ou {{VALOR_VENDA}}), a ser pago mediante chave PIX: {{CHAVE_PIX}}.

CLÁUSULA 3ª - DA VIGÊNCIA E CONDIÇÕES
Vigência de {{PRAZO_MESES}} meses, com início em {{DATA_INICIO}} e término em {{DATA_TERMINO}}.

CLÁUSULA 4ª - DA VISTORIA DIGITAL
A vistoria conta com Hash Pericial SHA-256 de integridade: [{{HASH_SHA256}}].

FORO ELEITO: {{CIDADE_FORO}}.
Data: {{DATA_EXTENSO}}.

_____________________________
LOCADOR/VENDEDOR: {{LOCADOR_NOME}}

_____________________________
LOCATÁRIO/COMPRADOR: {{LOCATARIO_NOME}}

TESTEMUNHAS:
1. {{TESTEMUNHA_1}}
2. {{TESTEMUNHA_2}}`);
    setShowEditorModal(true);
  };

  const handleOpenEditModal = (tpl: ContractTemplate) => {
    setEditingTemplate(tpl);
    setTitulo(tpl.titulo);
    setCategoria(tpl.categoria);
    setDescricao(tpl.descricao || '');
    setConteudoTexto(tpl.conteudoTexto);
    setShowEditorModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudoTexto.trim()) {
      showToast('Por favor, preencha o título e o conteúdo da minuta.');
      return;
    }

    const payload: ContractTemplate = {
      id: editingTemplate ? editingTemplate.id : `tpl-${Date.now()}`,
      titulo: titulo.trim(),
      categoria,
      descricao: descricao.trim() || 'Minuta de contrato personalizada cadastrada no sistema.',
      conteudoTexto: conteudoTexto.trim(),
      isDefault: editingTemplate?.isDefault || false,
      organizationId: user?.id || 'usr-master-iluminatto',
      createdAt: editingTemplate ? editingTemplate.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveContractTemplate(payload);
    setTemplates(getSavedTemplates());
    setShowEditorModal(false);
    showToast(`Minuta "${payload.titulo}" salva com sucesso!`);
  };

  const handleDeleteTemplate = async (tplId: string) => {
    const remaining = templates.filter((t) => t.id !== tplId);
    setTemplates(remaining);
    localStorage.setItem('locadoc_contract_templates', JSON.stringify(remaining));
    try {
      await deleteDoc(doc(db, 'contract_templates', tplId));
    } catch (err) {
      console.warn('Erro ao deletar minuta no Firestore:', err);
    }
    setDeleteConfirmId(null);
    showToast('Minuta excluída com sucesso.');
  };

  const handleDuplicateTemplate = async (source: ContractTemplate) => {
    const copy: ContractTemplate = {
      ...source,
      id: `tpl-${Date.now()}`,
      titulo: `${source.titulo} (Cópia Personalizada)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveContractTemplate(copy);
    setTemplates(getSavedTemplates());
    showToast(`Cópia da minuta "${source.titulo}" criada!`);
  };

  // Upload external template from .txt or .md or .doc file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setTitulo(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        setConteudoTexto(text);
        setDescricao(`Minuta importada a partir do arquivo "${file.name}"`);
        setShowEditorModal(true);
        showToast(`Arquivo "${file.name}" importado para a minuta!`);
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Insert template tag into textarea
  const insertTagAtCursor = (tag: string) => {
    const el = textAreaRef.current;
    if (!el) {
      setConteudoTexto((prev) => prev + ` ${tag} `);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = conteudoTexto;
    const next = current.substring(0, start) + tag + current.substring(end);
    setConteudoTexto(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Helper to preview interpolated template
  const getInterpolatedPreview = (tpl: ContractTemplate) => {
    const dummyContract = getEmptyContract();
    const targetImovel = imoveis.find((im) => im.id === selectedImovelForPreview) || imoveis[0];

    if (targetImovel) {
      dummyContract.objeto.endereco = targetImovel.endereco;
      dummyContract.objeto.compostos = targetImovel.compostos;
      dummyContract.valores.aluguel = targetImovel.valorAluguelSugerido || 3000;
      dummyContract.valores.aluguelExtenso = numeroPorExtensoReais(targetImovel.valorAluguelSugerido || 3000);
      dummyContract.vendaInfo = {
        valorVenda: targetImovel.valorVendaSugerido || 500000,
        valorVendaExtenso: numeroPorExtensoReais(targetImovel.valorVendaSugerido || 500000),
        sinalEntrada: Math.round((targetImovel.valorVendaSugerido || 500000) * 0.2),
        sinalEntradaExtenso: numeroPorExtensoReais(Math.round((targetImovel.valorVendaSugerido || 500000) * 0.2)),
        saldoFinanciamento: Math.round((targetImovel.valorVendaSugerido || 500000) * 0.8),
        condicoesPagamento: 'Sinal de 20% no ato e saldo restante financiado.',
        matriculaImovel: targetImovel.matriculaCartorio || '124.580',
        cartorioRegistro: targetImovel.cartorioNome || '14º Oficial de Registro de Imóveis',
      };
    }

    return interpolateTemplate(tpl.conteudoTexto, dummyContract);
  };

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tpl.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tpl.conteudoTexto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'todos' || tpl.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getCategoryLabel = (cat: ContractTemplate['categoria']) => {
    switch (cat) {
      case 'aluguel_residencial':
        return { label: 'Locação Residencial', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'aluguel_comercial':
        return { label: 'Locação Comercial', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'venda_imovel':
        return { label: 'Compra e Venda', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'temporada':
        return { label: 'Temporada (Diárias)', color: 'bg-amber-100 text-amber-900 border-amber-200' };
      default:
        return { label: 'Minuta Customizada', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const TAGS_LIST = [
    { tag: '{{LOCADOR_NOME}}', desc: 'Nome do Proprietário / Vendedor' },
    { tag: '{{LOCADOR_CPF}}', desc: 'CPF do Locador' },
    { tag: '{{LOCADOR_RG}}', desc: 'RG do Locador' },
    { tag: '{{LOCADOR_ENDERECO}}', desc: 'Endereço do Locador' },
    { tag: '{{LOCADOR_EMAIL}}', desc: 'E-mail do Locador' },
    { tag: '{{LOCATARIO_NOME}}', desc: 'Nome do Inquilino / Comprador' },
    { tag: '{{LOCATARIO_CPF}}', desc: 'CPF do Inquilino / Comprador' },
    { tag: '{{LOCATARIO_RG}}', desc: 'RG do Inquilino' },
    { tag: '{{LOCATARIO_EMAIL}}', desc: 'E-mail do Inquilino' },
    { tag: '{{IMOVEL_ENDERECO}}', desc: 'Endereço Completo do Imóvel' },
    { tag: '{{IMOVEL_COMPOSTOS}}', desc: 'Descrição dos Cômodos e Mobília' },
    { tag: '{{IMOVEL_MATRICULA}}', desc: 'Matrícula no RGI' },
    { tag: '{{IMOVEL_CARTORIO}}', desc: 'Cartório de Registro' },
    { tag: '{{VALOR_ALUGUEL}}', desc: 'Valor do Aluguel (R$)' },
    { tag: '{{VALOR_ALUGUEL_EXTENSO}}', desc: 'Aluguel por Extenso' },
    { tag: '{{VALOR_VENDA}}', desc: 'Preço Total de Venda (R$)' },
    { tag: '{{VALOR_SINAL}}', desc: 'Sinal / Arras de Venda (R$)' },
    { tag: '{{SALDO_FINANCIAMENTO}}', desc: 'Saldo Financiamento Habitacional' },
    { tag: '{{CHAVE_PIX}}', desc: 'Chave PIX de Pagamento' },
    { tag: '{{PRAZO_MESES}}', desc: 'Vigência em Meses' },
    { tag: '{{DATA_INICIO}}', desc: 'Data Início da Locação/Posse' },
    { tag: '{{DATA_TERMINO}}', desc: 'Data Término da Locação' },
    { tag: '{{GARANTIA_DESCRICAO}}', desc: 'Cláusula de Garantia (Caução/Fiador)' },
    { tag: '{{HASH_SHA256}}', desc: 'Hash Pericial da Vistoria' },
    { tag: '{{CIDADE_FORO}}', desc: 'Comarca de Eleição do Foro' },
    { tag: '{{DATA_EXTENSO}}', desc: 'Data Extensa Atual' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
            <FileCode className="w-3.5 h-3.5" />
            <span>Repositório de Minutas & Modelos</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Gestão de Minutas & Modelos de Contratos
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Cadastre, envie novas minutas personalizadas ou vincule contratos exclusivos para cada imóvel da sua carteira (Locação Residencial, Comercial, Temporada e Compra e Venda).
          </p>
        </div>

        {!isTenant && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Hidden file input for uploading .txt / .md templates */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-600 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              title="Importar minuta a partir de um arquivo de texto"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Subir Minuta (.txt/.md)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenNewModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Nova Minuta Manual</span>
            </button>
          </div>
        )}
      </div>

      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Operation Categories & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'todos', label: 'Todas as Minutas', icon: Layers },
            { id: 'aluguel_residencial', label: 'Locação Residencial', icon: FileText },
            { id: 'aluguel_comercial', label: 'Locação Comercial', icon: Building2 },
            { id: 'venda_imovel', label: 'Compra e Venda', icon: Handshake },
            { id: 'temporada', label: 'Temporada', icon: Palmtree },
            { id: 'personalizado', label: 'Customizadas', icon: Sparkles },
          ].map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou cláusula..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((tpl) => {
          const catInfo = getCategoryLabel(tpl.categoria);
          const imoveisUsandoEste = imoveis.filter((im) => im.modeloContratoPadraoId === tpl.id);

          return (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${catInfo.color}`}>
                    {catInfo.label}
                  </span>
                  {tpl.isDefault && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-slate-900 text-amber-400">
                      Oficial do Sistema
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                    {tpl.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {tpl.descricao}
                  </p>
                </div>

                {/* Linked properties pill */}
                {imoveisUsandoEste.length > 0 && (
                  <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center gap-1.5 text-[11px] text-amber-900">
                    <Bookmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">
                      Vinculado a <strong>{imoveisUsandoEste.length}</strong> imóvel(is)
                    </span>
                  </div>
                )}

                {/* Preview text excerpt */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-600 line-clamp-3 leading-relaxed">
                  {tpl.conteudoTexto}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5 justify-between">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(tpl)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                    title="Pré-visualizar Minuta Interpolada"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Minuta</span>
                  </button>

                  {!isTenant && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateTemplate(tpl)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Duplicar como Minuta Personalizada"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(tpl)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar Cláusulas da Minuta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!tpl.isDefault && (
                        deleteConfirmId === tpl.id ? (
                          <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(tpl.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Minuta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Button: Gerar Contrato com esta minuta */}
                <button
                  type="button"
                  onClick={() => setShowLinkModal(tpl)}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gerar Contrato com Esta Minuta</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-amber-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Escolher Imóvel para Gerar Contrato ou Vincular */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Vincular Minuta a um Imóvel</h3>
                  <p className="text-[11px] text-slate-400">{showLinkModal.titulo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Selecione o imóvel cadastrado para gerar o contrato exclusivo já preenchido com todos os dados da unidade e desta minuta:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {imoveis.map((imovel) => (
                  <div
                    key={imovel.id}
                    onClick={() => {
                      onGenerateContractWithTemplate(showLinkModal, imovel);
                      setShowLinkModal(null);
                    }}
                    className="p-3 bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-950">
                        {imovel.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">
                        {imovel.endereco}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                        {imovel.finalidade}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}

                {imoveis.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                    Nenhum imóvel cadastrado no momento. Você pode gerar um contrato avulso.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onGenerateContractWithTemplate(showLinkModal);
                    setShowLinkModal(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Gerar Contrato Avulso (Sem Imóvel)
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editor / Criação de Minuta */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingTemplate ? 'Editar Minuta Contratual' : 'Cadastrar Nova Minuta de Contrato'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defina cláusulas e variáveis dinâmicas que serão interpoladas automaticamente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Título da Minuta *</label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Contrato de Locação Residencial Mobiliada com Caução"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-slate-900 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Categoria da Operação</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-indigo-700"
                  >
                    <option value="aluguel_residencial">Locação Residencial</option>
                    <option value="aluguel_comercial">Locação Comercial</option>
                    <option value="venda_imovel">Compra e Venda</option>
                    <option value="temporada">Temporada (Short-term)</option>
                    <option value="personalizado">Personalizado / Aditivo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Descrição / Finalidade</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Minuta jurídica com cláusulas de vistoria detalhada e regras de condomínio"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              {/* Dynamic Variables Toolbelt */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Variáveis Dinâmicas Disponíveis (Clique para inserir no cursor):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Preenchimento automático</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {TAGS_LIST.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => insertTagAtCursor(t.tag)}
                      title={t.desc}
                      className="px-2 py-1 bg-white hover:bg-amber-100 hover:border-amber-400 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-800 transition-colors cursor-pointer"
                    >
                      {t.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for template contents */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Texto Integral da Minuta *</label>
                <textarea
                  ref={textAreaRef}
                  rows={12}
                  required
                  value={conteudoTexto}
                  onChange={(e) => setConteudoTexto(e.target.value)}
                  className="w-full p-3.5 text-xs bg-white border border-slate-300 rounded-2xl font-mono leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Escreva ou cole a minuta aqui..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Salvar Minuta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview com Interpolação ao Vivo */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Visualização da Minuta com Dados Reais</h3>
                  <p className="text-[11px] text-slate-400">{showPreviewModal.titulo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Select Property for live simulation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Simular com o Imóvel:</span>
                </span>
                <select
                  value={selectedImovelForPreview}
                  onChange={(e) => setSelectedImovelForPreview(e.target.value)}
                  className="w-full max-w-xs p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                >
                  {imoveis.map((im) => (
                    <option key={im.id} value={im.id}>
                      {im.titulo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rendered Text Box */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl max-h-[50vh] overflow-y-auto text-xs font-mono text-slate-900 whitespace-pre-wrap leading-relaxed">
                {getInterpolatedPreview(showPreviewModal)}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const target = imoveis.find((im) => im.id === selectedImovelForPreview) || imoveis[0];
                    onGenerateContractWithTemplate(showPreviewModal, target);
                    setShowPreviewModal(null);
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-slate-950" />
                  <span>Gerar Contrato Oficial com Esta Minuta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
