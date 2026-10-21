import React, { useState, useEffect } from 'react';
import { ImovelData, ContractData, ContractTemplate } from '../types/contract';
import { formatCurrencyBRL } from '../utils/defaults';
import { getSavedTemplates } from '../utils/templates';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { 
  Building2, Plus, Edit2, Trash2, Home, MapPin, DollarSign, 
  FileText, Check, X, Image as ImageIcon, Sparkles, Upload, 
  Eye, CheckCircle2, Search, ArrowRight, AlertCircle, Layers, Handshake, Tag, Bookmark
} from 'lucide-react';

interface ImoveisManagerProps {
  onGenerateContractForImovel: (imovel: ImovelData, forceOperacao?: any) => void;
  imoveisList?: ImovelData[];
  onViewContractRequested?: () => void;
}

export const DEFAULT_IMOVEIS: ImovelData[] = [
  {
    id: 'imovel-01',
    userId: 'usr-master-iluminatto',
    titulo: 'Apto 102 - Residencial Jardins',
    tipo: 'apartamento',
    finalidade: 'aluguel',
    endereco: 'Rua das Flores, 123, Apto 102, Jardim Paulista, São Paulo/SP, CEP: 01400-000',
    bairro: 'Jardim Paulista',
    cidadeUf: 'São Paulo/SP',
    cep: '01400-000',
    compostos: '2 dormitórios (1 suíte com armários), sala 2 ambientes integrada à sacada gourmet, cozinha planejada, área de serviço, banheiro social e vaga de garagem nº 24',
    vagaGaragem: 'Vaga nº 24 - 1º Subsolo',
    valorAluguelSugerido: 3500,
    valorVendaSugerido: 780000,
    condominioSugerido: 650,
    iptuSugerido: 210,
    matriculaCartorio: '124.580',
    cartorioNome: '14º Oficial de Registro de Imóveis de SP',
    modeloContratoPadraoId: 'tpl-locacao-residencial',
    fotos: [],
    observacoes: 'Apartamento mobiliado e decorado de alto padrão. Pintura nova.',
    status: 'locado',
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'imovel-02',
    userId: 'usr-master-iluminatto',
    titulo: 'Studio 45 - Moema Smart Living',
    tipo: 'studio',
    finalidade: 'ambos',
    endereco: 'Av. Ibirapuera, 2450, Studio 45, Moema, São Paulo/SP, CEP: 04028-002',
    bairro: 'Moema',
    cidadeUf: 'São Paulo/SP',
    cep: '04028-002',
    compostos: 'Studio integrado com dormitório, bancada de home office, cozinha compacta com eletros embutidos, sacada com fechamento em vidro e 1 vaga de garagem coberta',
    vagaGaragem: 'Vaga nº 08 rotativa',
    valorAluguelSugerido: 2800,
    valorVendaSugerido: 495000,
    condominioSugerido: 480,
    iptuSugerido: 140,
    matriculaCartorio: '98.320',
    cartorioNome: '14º Oficial de Registro de Imóveis de SP',
    modeloContratoPadraoId: 'tpl-locacao-residencial',
    fotos: [],
    observacoes: 'Totalmente mobiliado, pronto para morar com ar-condicionado e Smart TV.',
    status: 'disponivel',
    createdAt: '2026-01-15T14:30:00.000Z',
    updatedAt: '2026-01-15T14:30:00.000Z',
  },
];

export const ImoveisManager: React.FC<ImoveisManagerProps> = ({
  onGenerateContractForImovel,
  imoveisList,
  onViewContractRequested,
}) => {
  const { user } = useAuth();
  const isTenant = user?.role === 'cliente' || user?.role === 'condomino';

  const [imoveis, setImoveis] = useState<ImovelData[]>(() => {
    if (imoveisList && imoveisList.length > 0) return imoveisList;
    const saved = localStorage.getItem('locadoc_imoveis_db');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_IMOVEIS;
  });

  // Keep synced with parent imoveisList if provided
  useEffect(() => {
    if (imoveisList) {
      setImoveis(imoveisList);
    }
  }, [imoveisList]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingImovel, setEditingImovel] = useState<ImovelData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<ImovelData['tipo']>('apartamento');
  const [finalidade, setFinalidade] = useState<ImovelData['finalidade']>('aluguel');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidadeUf, setCidadeUf] = useState('São Paulo/SP');
  const [cep, setCep] = useState('');
  const [compostos, setCompostos] = useState('');
  const [vagaGaragem, setVagaGaragem] = useState('');
  const [valorAluguelSugerido, setValorAluguelSugerido] = useState<number>(3000);
  const [valorVendaSugerido, setValorVendaSugerido] = useState<number>(500000);
  const [condominioSugerido, setCondominioSugerido] = useState<number>(500);
  const [iptuSugerido, setIptuSugerido] = useState<number>(150);
  const [matriculaCartorio, setMatriculaCartorio] = useState('');
  const [cartorioNome, setCartorioNome] = useState('');
  const [modeloContratoPadraoId, setModeloContratoPadraoId] = useState('tpl-locacao-residencial');
  const [minutaPersonalizadaImovel, setMinutaPersonalizadaImovel] = useState('');
  const [templatesList, setTemplatesList] = useState<ContractTemplate[]>(() => getSavedTemplates());
  const [fotos, setFotos] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<ImovelData['status']>('disponivel');

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('locadoc_imoveis_db', JSON.stringify(imoveis));
  }, [imoveis]);

  // Sync with Firestore
  useEffect(() => {
    const fetchImoveis = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'imoveis'));
        if (!querySnapshot.empty) {
          const list: ImovelData[] = [];
          querySnapshot.forEach((d) => {
            list.push(d.data() as ImovelData);
          });
          if (list.length > 0) {
            setImoveis(list);
          }
        }
      } catch (err) {
        console.warn('Sincronização de imóveis no Firestore (modo offline ativo):', err);
      }
    };
    fetchImoveis();
  }, []);

  const handleOpenAddModal = () => {
    setEditingImovel(null);
    setTitulo('');
    setTipo('apartamento');
    setFinalidade('aluguel');
    setEndereco('');
    setBairro('');
    setCidadeUf('São Paulo/SP');
    setCep('');
    setCompostos('2 cômodos, sala, cozinha, banheiro e vaga de garagem');
    setVagaGaragem('Vaga nº XX');
    setValorAluguelSugerido(3000);
    setValorVendaSugerido(550000);
    setCondominioSugerido(500);
    setIptuSugerido(150);
    setMatriculaCartorio('');
    setCartorioNome('');
    setModeloContratoPadraoId('tpl-locacao-residencial');
    setMinutaPersonalizadaImovel('');
    setTemplatesList(getSavedTemplates());
    setFotos([]);
    setObservacoes('');
    setStatus('disponivel');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (imovel: ImovelData) => {
    setEditingImovel(imovel);
    setTitulo(imovel.titulo);
    setTipo(imovel.tipo);
    setFinalidade(imovel.finalidade || 'aluguel');
    setEndereco(imovel.endereco);
    setBairro(imovel.bairro || '');
    setCidadeUf(imovel.cidadeUf || '');
    setCep(imovel.cep || '');
    setCompostos(imovel.compostos);
    setVagaGaragem(imovel.vagaGaragem || '');
    setValorAluguelSugerido(imovel.valorAluguelSugerido || 0);
    setValorVendaSugerido(imovel.valorVendaSugerido || 0);
    setCondominioSugerido(imovel.condominioSugerido || 0);
    setIptuSugerido(imovel.iptuSugerido || 0);
    setMatriculaCartorio(imovel.matriculaCartorio || '');
    setCartorioNome(imovel.cartorioNome || '');
    setModeloContratoPadraoId(imovel.modeloContratoPadraoId || 'tpl-locacao-residencial');
    setMinutaPersonalizadaImovel(imovel.minutaPersonalizadaImovel || '');
    setTemplatesList(getSavedTemplates());
    setFotos(imovel.fotos || []);
    setObservacoes(imovel.observacoes || '');
    setStatus(imovel.status);
    setFormError(null);
    setShowModal(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!titulo.trim() || !endereco.trim()) {
      setFormError('Preencha os campos obrigatórios (Título e Endereço).');
      return;
    }

    const payload: ImovelData = {
      id: editingImovel ? editingImovel.id : `imovel-${Date.now()}`,
      userId: user?.id || 'usr-master-iluminatto',
      titulo: titulo.trim(),
      tipo,
      finalidade,
      endereco: endereco.trim(),
      bairro: bairro.trim(),
      cidadeUf: cidadeUf.trim(),
      cep: cep.trim(),
      compostos: compostos.trim(),
      vagaGaragem: vagaGaragem.trim(),
      valorAluguelSugerido: Number(valorAluguelSugerido) || 0,
      valorVendaSugerido: Number(valorVendaSugerido) || 0,
      condominioSugerido: Number(condominioSugerido) || 0,
      iptuSugerido: Number(iptuSugerido) || 0,
      matriculaCartorio: matriculaCartorio.trim(),
      cartorioNome: cartorioNome.trim(),
      modeloContratoPadraoId,
      minutaPersonalizadaImovel: minutaPersonalizadaImovel.trim(),
      fotos,
      observacoes: observacoes.trim(),
      status,
      createdAt: editingImovel ? editingImovel.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingImovel) {
      setImoveis((prev) => prev.map((im) => (im.id === editingImovel.id ? payload : im)));
    } else {
      setImoveis((prev) => [payload, ...prev]);
    }

    setShowModal(false);

    // Save to Firestore
    try {
      await setDoc(doc(db, 'imoveis', payload.id), payload);
    } catch (err) {
      console.warn('Erro ao salvar imóvel no Firestore:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setImoveis((prev) => prev.filter((im) => im.id !== id));
    try {
      await deleteDoc(doc(db, 'imoveis', id));
    } catch (err) {
      console.warn('Erro ao excluir imóvel no Firestore:', err);
    }
  };

  const filteredImoveis = imoveis.filter(
    (im) =>
      im.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      im.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (im.bairro && im.bairro.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isTenant ? 'Meu Imóvel Locado' : 'Cadastro e Gestão de Imóveis'}
              </h2>
              {isTenant && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-md">
                  Inquilino Participante
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTenant
                ? 'Informações, vistoria e laudo fotográfico da unidade residencial alugada a você'
                : 'Cadastre múltiplos imóveis para gerar contratos e laudos de vistoria com 1 clique'}
            </p>
          </div>
        </div>

        {!isTenant && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Cadastrar Novo Imóvel</span>
          </button>
        )}
      </div>

      {/* Tenant Isolation Banner */}
      {isTenant && (
        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center gap-3 text-xs shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-400">Isolamento Estrito de Dados Ativo (LGPD Art. 46)</p>
            <p className="text-slate-300">
              Você tem acesso estritamente restrito à sua unidade residencial locada. Imóveis de outros proprietários ou desocupados permanecem isolados na administração.
            </p>
          </div>
        </div>
      )}

      {/* Search and filters (only for admins or if tenant has multiple rented units) */}
      {!isTenant && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, endereço ou bairro..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
            />
          </div>

          <span className="text-xs text-slate-500">
            Total de <strong>{filteredImoveis.length}</strong> imóvel(is) cadastrado(s)
          </span>
        </div>
      )}

      {/* Empty state for tenant */}
      {filteredImoveis.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto">
            <Home className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Nenhum imóvel vinculado no momento</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isTenant
              ? 'Nenhum imóvel está diretamente vinculado ao seu contrato de inquilino ativo. Caso já tenha um contrato, verifique na aba Meu Contrato ou contate a administração.'
              : 'Nenhum imóvel encontrado com o termo de busca pesquisado.'}
          </p>
        </div>
      )}

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredImoveis.map((imovel) => (
          <div
            key={imovel.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-700">
                      {imovel.tipo}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        imovel.status === 'disponivel'
                          ? 'bg-emerald-100 text-emerald-800'
                          : imovel.status === 'locado'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {imovel.status === 'disponivel'
                        ? 'Disponível'
                        : imovel.status === 'locado'
                        ? 'Locado'
                        : 'Em Manutenção'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        imovel.finalidade === 'venda'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : imovel.finalidade === 'ambos'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : imovel.finalidade === 'temporada'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {imovel.finalidade === 'venda'
                        ? 'Venda'
                        : imovel.finalidade === 'ambos'
                        ? 'Locação / Venda'
                        : imovel.finalidade === 'temporada'
                        ? 'Temporada'
                        : 'Locação'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                    {imovel.titulo}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <Bookmark className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate max-w-[240px]">
                      {imovel.minutaPersonalizadaImovel
                        ? 'Minuta Exclusiva Deste Imóvel'
                        : templatesList.find((t) => t.id === imovel.modeloContratoPadraoId)?.titulo || 'Modelo Padrão'}
                    </span>
                  </div>
                </div>

                {!isTenant && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(imovel)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar Imóvel"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteId === imovel.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                        <span className="text-[10px] text-red-700 font-bold px-1">Excluir?</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleDelete(imovel.id);
                            setConfirmDeleteId(null);
                          }}
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
                        onClick={() => setConfirmDeleteId(imovel.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Imóvel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Photos preview strip */}
              {imovel.fotos && imovel.fotos.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {imovel.fotos.slice(0, 4).map((f, i) => (
                    <img
                      key={i}
                      src={f}
                      alt="Foto imóvel"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                  ))}
                  {imovel.fotos.length > 4 && (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      +{imovel.fotos.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Address */}
              <div className="flex items-start gap-1.5 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{imovel.endereco}</span>
              </div>

              {/* Composition */}
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100">
                <span className="font-semibold text-slate-900">Composição: </span>
                {imovel.compostos}
                {imovel.vagaGaragem && (
                  <span className="block mt-1 font-semibold text-amber-800">
                    Garagem: {imovel.vagaGaragem}
                  </span>
                )}
              </div>

              {/* Suggested values */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                {(imovel.finalidade === 'aluguel' || imovel.finalidade === 'ambos' || imovel.finalidade === 'temporada' || !imovel.finalidade) && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {imovel.finalidade === 'temporada' ? 'Diária média:' : 'Aluguel contratual:'}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrencyBRL(imovel.valorAluguelSugerido || 0)}
                    </span>
                  </div>
                )}
                {(imovel.finalidade === 'venda' || imovel.finalidade === 'ambos') && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Preço de Venda:</span>
                    <span className="font-bold text-indigo-700 text-sm">
                      {formatCurrencyBRL(imovel.valorVendaSugerido || 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action: Gerar Contrato or Ver Contrato */}
            <div className="pt-4 mt-3 border-t border-slate-100">
              {isTenant ? (
                <button
                  type="button"
                  onClick={onViewContractRequested}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver Meu Contrato Desta Unidade</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-amber-400" />
                </button>
              ) : imovel.finalidade === 'ambos' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onGenerateContractForImovel(imovel, 'aluguel_residencial')}
                    className="py-2 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Emitir Contrato de Locação com Minuta do Imóvel"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Contrato Locação</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onGenerateContractForImovel(imovel, 'venda_imovel')}
                    className="py-2 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Emitir Contrato de Compra e Venda com Minuta do Imóvel"
                  >
                    <Handshake className="w-3.5 h-3.5 shrink-0" />
                    <span>Contrato Venda</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onGenerateContractForImovel(imovel, imovel.finalidade === 'venda' ? 'venda_imovel' : undefined)}
                  className={`w-full py-2 px-3 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    imovel.finalidade === 'venda'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  }`}
                >
                  {imovel.finalidade === 'venda' ? <Handshake className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>
                    {imovel.finalidade === 'venda' ? 'Gerar Contrato de Venda' : 'Gerar Contrato para Este Imóvel'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Cadastro/Edição de Imóvel */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingImovel ? 'Editar Cadastro do Imóvel' : 'Cadastrar Novo Imóvel'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Insira todos os dados cadastrais e fotos do imóvel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-semibold text-red-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título / Identificador *
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Apto 102 - Jardins"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Imóvel
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="apartamento">Apartamento</option>
                    <option value="casa">Casa</option>
                    <option value="studio">Studio</option>
                    <option value="cobertura">Cobertura</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Finalidade / Operação *
                  </label>
                  <select
                    value={finalidade}
                    onChange={(e) => setFinalidade(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-indigo-700"
                  >
                    <option value="aluguel">Locação Residencial / Comercial</option>
                    <option value="venda">Venda de Imóvel (Compra e Venda)</option>
                    <option value="ambos">Ambos (Disponível para Locação ou Venda)</option>
                    <option value="temporada">Locação por Temporada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endereço Residencial Completo (para Cláusula 2.1) *
                </label>
                <input
                  type="text"
                  required
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Número, Bloco/Apto, Bairro, Cidade/UF, CEP: 00000-000"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Ex: Jardim Paulista"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={cidadeUf}
                    onChange={(e) => setCidadeUf(e.target.value)}
                    placeholder="Ex: São Paulo/SP"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Composição dos Cômodos e Mobília Resumida (Cláusula 2.1)
                </label>
                <textarea
                  rows={2}
                  value={compostos}
                  onChange={(e) => setCompostos(e.target.value)}
                  placeholder="Ex: Composto por 2 dormitórios (1 suíte), sala ampla, cozinha, banheiro social e vaga de garagem..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vaga de Garagem
                  </label>
                  <input
                    type="text"
                    value={vagaGaragem}
                    onChange={(e) => setVagaGaragem(e.target.value)}
                    placeholder="Ex: Vaga nº 24 no 1º subsolo"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aluguel Sugerido (R$)
                  </label>
                  <input
                    type="number"
                    value={valorAluguelSugerido}
                    onChange={(e) => setValorAluguelSugerido(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status do Imóvel
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="locado">Locado</option>
                    <option value="manutencao">Em Manutenção</option>
                  </select>
                </div>
              </div>

              {/* Se for Venda ou Ambos: dados de venda e matrícula cartorial */}
              {(finalidade === 'venda' || finalidade === 'ambos') && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Handshake className="w-4 h-4 text-indigo-600" />
                    <span>Dados para Compra e Venda / Matrícula no RGI</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Valor de Venda Sugerido (R$) *
                      </label>
                      <input
                        type="number"
                        value={valorVendaSugerido}
                        onChange={(e) => setValorVendaSugerido(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Matrícula do Imóvel no RGI
                      </label>
                      <input
                        type="text"
                        value={matriculaCartorio}
                        onChange={(e) => setMatriculaCartorio(e.target.value)}
                        placeholder="Ex: Matrícula nº 124.580"
                        className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cartório de Registro de Imóveis
                      </label>
                      <input
                        type="text"
                        value={cartorioNome}
                        onChange={(e) => setCartorioNome(e.target.value)}
                        placeholder="Ex: 14º Oficial de Registro de Imóveis"
                        className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Seção Exclusiva: Cada Imóvel pode ter seu Próprio Contrato */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                  <span>Contrato Exclusivo Deste Imóvel (Minuta / Modelo Próprio)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Cada imóvel pode ter seu próprio modelo ou minuta individual. O sistema preenche automaticamente os dados do locatário/comprador e locador ao gerar o documento.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Modelo de Contrato Vinculado a Este Imóvel
                  </label>
                  <select
                    value={modeloContratoPadraoId}
                    onChange={(e) => setModeloContratoPadraoId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {templatesList.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.titulo} ({tpl.categoria.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Minuta / Cláusulas Exclusivas deste Imóvel (Opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={minutaPersonalizadaImovel}
                    onChange={(e) => setMinutaPersonalizadaImovel(e.target.value)}
                    placeholder="Se este imóvel tiver uma minuta exclusiva ou cláusulas particulares (regras específicas de condomínio, mobília tombada, prazos especiais), cole aqui..."
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-500">
                    Suporta variáveis automáticas: {'{{LOCADOR_NOME}}'}, {'{{LOCATARIO_NOME}}'}, {'{{IMOVEL_ENDERECO}}'}, {'{{VALOR_ALUGUEL}}'}, {'{{VALOR_VENDA}}'}, {'{{CHAVE_PIX}}'}.
                  </span>
                </div>
              </div>

              {/* Photos upload section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Fotos do Imóvel (Várias fotos permitidas)
                  </label>
                  <label className="text-xs text-amber-700 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Adicionar Fotos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {fotos.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {fotos.map((f, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-300 aspect-square">
                        <img src={f} alt="Foto" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover Foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                    Nenhuma foto anexada ainda. Clique em "Adicionar Fotos" para anexar fotos do imóvel.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Gerais do Imóvel
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais, regras do condomínio, mobília específica, etc."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Salvar Imóvel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
