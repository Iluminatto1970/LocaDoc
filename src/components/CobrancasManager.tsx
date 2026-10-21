import React, { useState, useEffect } from 'react';
import { CobrancaMensal, ReciboPagamento, ContractData, FormaPagamento, CobrancaStatus } from '../types/contract';
import { formatCurrencyBRL, numeroPorExtensoReais } from '../utils/defaults';
import { 
  getSavedCobrancas, getSavedRecibos, generateScheduleForContract, 
  createPaymentReceipt, generatePixCopyAndPaste, calculateTextSHA256 
} from '../utils/billing';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  CreditCard, Calendar, CheckCircle2, Clock, AlertTriangle, 
  Search, Filter, Plus, FileText, Printer, Share2, Copy, 
  DollarSign, Check, X, Building, User, ArrowRight, ShieldCheck, 
  Sparkles, RefreshCw, Send, ChevronRight, Hash, ShieldAlert
} from 'lucide-react';

interface CobrancasManagerProps {
  contracts: ContractData[];
  onOpenContract?: (contractId: string) => void;
}

export const CobrancasManager: React.FC<CobrancasManagerProps> = ({
  contracts,
  onOpenContract,
}) => {
  const { user } = useAuth();
  const isCondomino = user?.role === 'cliente' || user?.role === 'condomino';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [cobrancas, setCobrancas] = useState<CobrancaMensal[]>(() => getSavedCobrancas());
  const [recibos, setRecibos] = useState<ReciboPagamento[]>(() => getSavedRecibos());

  const [statusFilter, setStatusFilter] = useState<'todos' | CobrancaStatus>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState<CobrancaMensal | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<ReciboPagamento | null>(null);
  const [showNewCobrancaModal, setShowNewCobrancaModal] = useState(false);
  const [showAutoScheduleConfirm, setShowAutoScheduleConfirm] = useState(false);

  // Payment form state
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [transacaoId, setTransacaoId] = useState('');
  const [observacoesPagamento, setObservacoesPagamento] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Manual Cobranca form state
  const [newContratoId, setNewContratoId] = useState<string>(contracts[0]?.id || '');
  const [newMesReferencia, setNewMesReferencia] = useState('');
  const [newDataVencimento, setNewDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [newValorAluguel, setNewValorAluguel] = useState<number>(3000);
  const [newValorCondominio, setNewValorCondominio] = useState<number>(0);
  const [newValorIptu, setNewValorIptu] = useState<number>(0);
  const [newOutrosEncargos, setNewOutrosEncargos] = useState<number>(0);
  const [newDescricaoEncargos, setNewDescricaoEncargos] = useState('');

  // Toast feedback
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Sync cobrancas with localStorage
  useEffect(() => {
    localStorage.setItem('locadoc_cobrancas_db', JSON.stringify(cobrancas));
  }, [cobrancas]);

  // Sync recibos with localStorage
  useEffect(() => {
    localStorage.setItem('locadoc_recibos_db', JSON.stringify(recibos));
  }, [recibos]);

  // Sync from Firestore on initial mount
  useEffect(() => {
    const fetchFirestoreData = async () => {
      try {
        const cobSnapshot = await getDocs(collection(db, 'cobrancas'));
        if (!cobSnapshot.empty) {
          const list: CobrancaMensal[] = [];
          cobSnapshot.forEach((d) => list.push(d.data() as CobrancaMensal));
          if (list.length > 0) setCobrancas(list);
        }

        const recSnapshot = await getDocs(collection(db, 'recibos'));
        if (!recSnapshot.empty) {
          const recList: ReciboPagamento[] = [];
          recSnapshot.forEach((d) => recList.push(d.data() as ReciboPagamento));
          if (recList.length > 0) setRecibos(recList);
        }
      } catch (err) {
        console.warn('Sincronização Firestore de Cobranças (offline):', err);
      }
    };
    fetchFirestoreData();
  }, []);

  // Filter cobrancas according to user role (LGPD)
  const visibleCobrancas = cobrancas.filter((cob) => {
    if (isCondomino && user) {
      const matchEmail = cob.locatarioEmail?.toLowerCase() === user.email.toLowerCase();
      const matchTenantId = cob.tenantId === user.id;
      return matchEmail || matchTenantId;
    }
    return true;
  });

  const filteredCobrancas = visibleCobrancas.filter((cob) => {
    const matchStatus = statusFilter === 'todos' || cob.status === statusFilter;
    const matchMonth = selectedMonth === 'todos' || cob.mesReferencia === selectedMonth;
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      cob.imovelTitulo.toLowerCase().includes(term) ||
      cob.locatarioNome.toLowerCase().includes(term) ||
      cob.mesReferencia.toLowerCase().includes(term) ||
      cob.contratoId.toLowerCase().includes(term);
    return matchStatus && matchMonth && matchSearch;
  });

  // Calculate statistics
  const totalPrevisto = visibleCobrancas.reduce((acc, c) => acc + (c.status !== 'cancelado' ? c.valorTotal : 0), 0);
  const totalRecebido = visibleCobrancas.filter((c) => c.status === 'pago').reduce((acc, c) => acc + (c.valorPago || c.valorTotal), 0);
  const totalAtrasado = visibleCobrancas.filter((c) => c.status === 'atrasado').reduce((acc, c) => acc + c.valorTotal, 0);
  const countAtrasados = visibleCobrancas.filter((c) => c.status === 'atrasado').length;
  const countPendentes = visibleCobrancas.filter((c) => c.status === 'pendente').length;
  const countPagos = visibleCobrancas.filter((c) => c.status === 'pago').length;
  const taxaAdimplencia = totalPrevisto > 0 ? Math.round((totalRecebido / totalPrevisto) * 100) : 100;

  // List of unique months for filter
  const uniqueMonths = Array.from(new Set(visibleCobrancas.map((c) => c.mesReferencia)));

  // Batch auto schedule for active contracts
  const handleAutoGenerateSchedules = async () => {
    const activeContracts = contracts.filter((c) => c.status === 'ativo' || c.status === 'gerado' || c.status === 'pronto');
    const targetContracts = activeContracts.length > 0 ? activeContracts : contracts;

    if (targetContracts.length === 0) {
      showToast('Nenhum contrato encontrado para gerar agendamento.');
      setShowAutoScheduleConfirm(false);
      return;
    }

    let generatedCount = 0;
    const newItems: CobrancaMensal[] = [];

    targetContracts.forEach((contract) => {
      const schedule = generateScheduleForContract(contract, 12);
      schedule.forEach((item) => {
        // Verifica se já existe cobrança para este contrato e mês
        const exists = cobrancas.some((c) => c.contratoId === item.contratoId && c.mesReferencia === item.mesReferencia);
        if (!exists) {
          newItems.push(item);
          generatedCount++;
        }
      });
    });

    if (newItems.length > 0) {
      const updated = [...newItems, ...cobrancas];
      setCobrancas(updated);
      showToast(`${generatedCount} cobranças mensais agendadas com sucesso para os contratos ativos!`);

      // Persist in Firestore
      try {
        for (const item of newItems) {
          await setDoc(doc(db, 'cobrancas', item.id), item);
        }
      } catch (e) {
        console.warn('Erro ao salvar cobranças no Firestore:', e);
      }
    } else {
      showToast('Todas as cobranças dos contratos ativos já estão previamente agendadas.');
    }

    setShowAutoScheduleConfirm(false);
  };

  // Open payment modal
  const handleOpenPayment = (cob: CobrancaMensal) => {
    setShowPaymentModal(cob);
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setValorPago(cob.valorTotal);
    setFormaPagamento('pix');
    setTransacaoId(`PIX-AUTH-${Date.now().toString().slice(-8)}`);
    setObservacoesPagamento('');
  };

  // Submit payment & generate official receipt
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;

    setIsSubmittingPayment(true);
    try {
      const recibo = await createPaymentReceipt(showPaymentModal, {
        dataPagamento,
        valorPago: Number(valorPago),
        formaPagamento,
        transacaoId,
        observacoes: observacoesPagamento,
        emitidoPor: user?.name || 'Administrador do Sistema',
      });

      // Update cobranca
      const updatedCobranca: CobrancaMensal = {
        ...showPaymentModal,
        status: 'pago',
        dataPagamento,
        valorPago: Number(valorPago),
        formaPagamento,
        transacaoIdOuComprovante: transacaoId,
        observacoesPagamento,
        reciboEmitido: true,
        reciboId: recibo.id,
        reciboHashSha256: recibo.hashAutenticacaoSha256,
        updatedAt: new Date().toISOString(),
      };

      setCobrancas((prev) => prev.map((c) => (c.id === updatedCobranca.id ? updatedCobranca : c)));
      setRecibos((prev) => [recibo, ...prev.filter((r) => r.id !== recibo.id)]);

      // Save to Firestore
      try {
        await setDoc(doc(db, 'cobrancas', updatedCobranca.id), updatedCobranca);
        await setDoc(doc(db, 'recibos', recibo.id), recibo);
      } catch (err) {
        console.warn('Erro ao sincronizar liquidação no Firestore:', err);
      }

      setShowPaymentModal(null);
      setShowReceiptModal(recibo);
      showToast(`Recebimento liquidado com sucesso! Comprovante ${recibo.id} emitido.`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar recebimento.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open receipt modal for an already paid charge
  const handleViewReceipt = (cob: CobrancaMensal) => {
    const existingRecibo = recibos.find((r) => r.cobrancaId === cob.id || r.id === cob.reciboId);
    if (existingRecibo) {
      setShowReceiptModal(existingRecibo);
    } else {
      // Fallback: create receipt on the fly
      createPaymentReceipt(cob, {
        dataPagamento: cob.dataPagamento || cob.dataVencimento,
        valorPago: cob.valorPago || cob.valorTotal,
        formaPagamento: cob.formaPagamento || 'pix',
        transacaoId: cob.transacaoIdOuComprovante,
        observacoes: cob.observacoesPagamento,
        emitidoPor: user?.name || 'Administrador',
      }).then((r) => {
        setRecibos((prev) => [r, ...prev]);
        setShowReceiptModal(r);
      });
    }
  };

  // Copy PIX Code to clipboard
  const handleCopyPix = (pixCode: string, id: string) => {
    navigator.clipboard.writeText(pixCode);
    setCopiedId(id);
    showToast('Código PIX Copia e Cola copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Share via WhatsApp
  const handleSendWhatsAppNotification = (cob: CobrancaMensal) => {
    const telefone = cob.locatarioTelefone?.replace(/\D/g, '') || '';
    const msg = `Olá ${cob.locatarioNome}, segue o aviso da cobrança de aluguel referente ao imóvel *${cob.imovelTitulo}* (${cob.mesReferencia}).%0A%0A*Vencimento:* ${cob.dataVencimento.split('-').reverse().join('/')}%0A*Valor Total:* ${formatCurrencyBRL(cob.valorTotal)}%0A*Chave PIX:* ${cob.locadorChavePix}%0A%0AEm caso de dúvidas estamos à disposição!`;
    const url = telefone ? `https://wa.me/55${telefone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  // Share Receipt via WhatsApp
  const handleSendWhatsAppReceipt = (recibo: ReciboPagamento) => {
    const msg = `*COMPROVANTE DE QUITAÇÃO DE ALUGUEL*%0A*Recibo Nº:* ${recibo.id}%0A*Imóvel:* ${recibo.imovelTitulo}%0A*Competência:* ${recibo.mesReferencia}%0A*Locatário:* ${recibo.locatarioNome}%0A*Valor Pago:* ${formatCurrencyBRL(recibo.valorTotalPago)}%0A*Data Liquidação:* ${recibo.dataPagamento.split('-').reverse().join('/')}%0A*Autenticação Digital SHA-256:* ${recibo.hashAutenticacaoSha256.substring(0, 16)}...%0A%0AObrigado pela pontualidade!`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Copy Receipt Text
  const handleCopyReceiptText = (recibo: ReciboPagamento) => {
    const text = `RECIBO DE QUITAÇÃO DE ALUGUEL - ${recibo.id}
Locador: ${recibo.locadorNome} (${recibo.locadorCpfCnpj})
Locatário: ${recibo.locatarioNome} (${recibo.locatarioCpf})
Imóvel: ${recibo.imovelTitulo} - ${recibo.imovelEndereco}
Competência: ${recibo.mesReferencia}
Data de Pagamento: ${recibo.dataPagamento.split('-').reverse().join('/')}
Valor Total Pago: ${formatCurrencyBRL(recibo.valorTotalPago)} (${recibo.valorTotalPagoExtenso})
Forma: ${recibo.formaPagamento.toUpperCase()} | Transação: ${recibo.transacaoId || 'N/A'}
Hash SHA-256 de Autenticidade: ${recibo.hashAutenticacaoSha256}
Código de Verificação: ${recibo.codigoVerificacao}
Emitido por: ${recibo.emitidoPor} em ${new Date(recibo.emitidoEm).toLocaleString('pt-BR')}`;

    navigator.clipboard.writeText(text);
    showToast('Texto completo do comprovante copiado com sucesso!');
  };

  // Create manual single cobranca
  const handleCreateManualCobranca = async (e: React.FormEvent) => {
    e.preventDefault();
    const contract = contracts.find((c) => c.id === newContratoId) || contracts[0];
    if (!contract) {
      showToast('Nenhum contrato selecionado.');
      return;
    }

    const valorTotal = Number(newValorAluguel) + Number(newValorCondominio) + Number(newValorIptu) + Number(newOutrosEncargos);
    const chavePix = contract.valores?.chavePix || contract.locador?.email || 'iluminatto@gmail.com';
    const cobId = `cob-manual-${Date.now()}`;

    const newCob: CobrancaMensal = {
      id: cobId,
      contratoId: contract.id,
      imovelId: contract.imovelId,
      imovelTitulo: contract.titulo.replace('Contrato - ', '').replace('Contrato de Locação - ', ''),
      imovelEndereco: contract.objeto?.endereco || '',
      locatarioNome: contract.locatario?.nome || 'Inquilino',
      locatarioEmail: contract.locatario?.email || '',
      locatarioCpf: contract.locatario?.cpf || '',
      locatarioTelefone: contract.locatario?.telefone || '',
      tenantId: contract.tenantId || contract.userId,
      locadorNome: contract.locador?.nome || 'Iluminatto Moraes',
      locadorEmail: contract.locador?.email || 'iluminatto@gmail.com',
      locadorCpfCnpj: contract.locador?.cpf || '38.452.128/0001-90',
      locadorChavePix: chavePix,
      mesReferencia: newMesReferencia || `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      dataVencimento: newDataVencimento,
      valorAluguel: Number(newValorAluguel),
      valorCondominio: Number(newValorCondominio),
      valorIptu: Number(newValorIptu),
      outrosEncargos: Number(newOutrosEncargos),
      descricaoEncargos: newDescricaoEncargos,
      valorTotal,
      status: 'pendente',
      pixCopiaECola: generatePixCopyAndPaste(chavePix, valorTotal, contract.locador?.nome || 'Iluminatto', 'Sao Paulo', 'ALUGUEL'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCobrancas((prev) => [newCob, ...prev]);
    setShowNewCobrancaModal(false);
    showToast(`Nova cobrança criada para "${newCob.imovelTitulo}"!`);

    try {
      await setDoc(doc(db, 'cobrancas', newCob.id), newCob);
    } catch (e) {
      console.warn('Erro ao salvar cobrança avulsa:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-3 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{feedbackMsg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Agendamento de Cobranças & Recebimentos
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 rounded-md">
                Lei nº 8.245/91
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Gestão automatizada do fluxo financeiro de contratos ativos. Controle de vencimentos, liquidação de pagamentos e emissão imediata de comprovantes com hash de autenticidade digital.
            </p>
          </div>
        </div>

        {/* Action Buttons for Admins */}
        {!isCondomino && (
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <button
              type="button"
              onClick={() => setShowAutoScheduleConfirm(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Gerar 12 meses de cobranças para todos os contratos ativos"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Agendar Contratos Ativos</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewCobrancaModal(true)}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Cobrança Avulsa</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Previsto</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
            {formatCurrencyBRL(totalPrevisto)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {visibleCobrancas.length} parcelas registradas
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Recebido</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 font-mono">
            {formatCurrencyBRL(totalRecebido)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
            <span>{taxaAdimplencia}% de adimplência</span>
            <span>•</span>
            <span>{countPagos} pagas</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Em Atraso</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-600 font-mono">
            {formatCurrencyBRL(totalAtrasado)}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
            {countAtrasados} parcela{countAtrasados !== 1 ? 's' : ''} vencida{countAtrasados !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Recibos Emitidos</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-indigo-600 font-mono">
            {recibos.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Comprovantes com Hash SHA-256
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {[
            { id: 'todos', label: 'Todos', count: visibleCobrancas.length },
            { id: 'pendente', label: 'Pendentes', count: countPendentes },
            { id: 'pago', label: 'Pagos', count: countPagos },
            { id: 'atrasado', label: 'Atrasados', count: countAtrasados },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-slate-700 text-amber-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Month Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {uniqueMonths.length > 0 && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="todos">Todos os Meses</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por inquilino, imóvel..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Charges List Table / Cards */}
      {filteredCobrancas.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Nenhuma cobrança encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter !== 'todos' || searchTerm
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente limpar os filtros.'
              : 'Clique em "Agendar Contratos Ativos" para gerar automaticamente o cronograma mensal com base nos contratos cadastrados.'}
          </p>
          {!isCondomino && (
            <button
              type="button"
              onClick={() => setShowAutoScheduleConfirm(true)}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Gerar Cronograma de Cobranças Agora</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCobrancas.map((cob) => {
            const isPaid = cob.status === 'pago';
            const isLate = cob.status === 'atrasado';

            return (
              <div
                key={cob.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 shadow-2xs transition-all hover:border-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isPaid ? 'border-emerald-200/70 bg-emerald-50/10' : isLate ? 'border-rose-200/80 bg-rose-50/10' : 'border-slate-200'
                }`}
              >
                {/* Left: Info & Property */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-mono">
                      {cob.mesReferencia}
                    </span>

                    {cob.numeroParcela && cob.totalParcelas && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Parcela {String(cob.numeroParcela).padStart(2, '0')}/{String(cob.totalParcelas).padStart(2, '0')}
                      </span>
                    )}

                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isLate
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {cob.status}
                    </span>

                    {isPaid && cob.formaPagamento && (
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                        Liquidado via {cob.formaPagamento}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {cob.imovelTitulo}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cob.locatarioNome}</span>
                    </span>

                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Vencimento: <strong className={isLate ? 'text-rose-600' : 'text-slate-700'}>
                          {cob.dataVencimento.split('-').reverse().join('/')}
                        </strong>
                      </span>
                    </span>

                    {isPaid && cob.dataPagamento && (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>Pago em: {cob.dataPagamento.split('-').reverse().join('/')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: Values breakdown */}
                <div className="text-left md:text-right shrink-0 py-1 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    Aluguel: {formatCurrencyBRL(cob.valorAluguel)}
                    {cob.valorCondominio ? ` + Cond: ${formatCurrencyBRL(cob.valorCondominio)}` : ''}
                    {cob.valorIptu ? ` + IPTU: ${formatCurrencyBRL(cob.valorIptu)}` : ''}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                    {formatCurrencyBRL(cob.valorTotal)}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                  {!isPaid ? (
                    <>
                      {/* Copy PIX button */}
                      {cob.pixCopiaECola && (
                        <button
                          type="button"
                          onClick={() => handleCopyPix(cob.pixCopiaECola!, cob.id)}
                          className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            copiedId === cob.id
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title="Copiar Código PIX Copia e Cola"
                        >
                          {copiedId === cob.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">PIX</span>
                        </button>
                      )}

                      {/* WhatsApp Notify */}
                      {!isCondomino && (
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppNotification(cob)}
                          className="p-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Enviar Cobrança via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Cobrar</span>
                        </button>
                      )}

                      {/* Register Payment button (Admins only) */}
                      {!isCondomino && (
                        <button
                          type="button"
                          onClick={() => handleOpenPayment(cob)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Registrar Pagamento</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* View Receipt button (Admins and Tenants) */}
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(cob)}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ver Comprovante</span>
                      </button>

                      {/* WhatsApp Receipt link */}
                      {!isCondomino && (
                        <button
                          type="button"
                          onClick={() => {
                            const rec = recibos.find((r) => r.cobrancaId === cob.id);
                            if (rec) handleSendWhatsAppReceipt(rec);
                            else handleViewReceipt(cob);
                          }}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          title="Enviar Recibo por WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Confirm Auto Schedule for Active Contracts */}
      {showAutoScheduleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Gerar Agendamento Automático</h3>
                  <p className="text-[11px] text-slate-400">Contratos Ativos & Cronograma Mensal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoScheduleConfirm(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                O sistema irá escanear todos os seus contratos e gerar automaticamente as <strong>12 parcelas mensais</strong> de cada unidade ativa, respeitando o dia de vencimento estipulado no contrato, calculando aluguel, condomínio e gerando os códigos PIX de liquidação.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Proteção contra Duplicidade</span>
                </span>
                <p className="text-[11px] text-amber-800">
                  Parcelas já criadas ou pagas para o mesmo mês não serão sobrepostas.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAutoScheduleConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAutoGenerateSchedules}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Confirmar & Gerar Cronograma</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pagamento / Liquidação de Aluguel */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Registrar Recebimento de Aluguel</h3>
                  <p className="text-[11px] text-slate-400">
                    Liquidação financeira & Emissão automática de recibo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              {/* Summary of charge being paid */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{showPaymentModal.imovelTitulo}</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                    {showPaymentModal.mesReferencia}
                  </span>
                </div>
                <div className="text-slate-500">
                  Locatário: <strong className="text-slate-800">{showPaymentModal.locatarioNome}</strong>
                </div>
                <div className="text-slate-500">
                  Valor Previsto da Parcela: <strong className="text-slate-900 font-mono">{formatCurrencyBRL(showPaymentModal.valorTotal)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Efetivamente Recebido (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valorPago}
                    onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="pix">PIX (Instantâneo)</option>
                    <option value="ted">Transferência Bancária (TED/DOC)</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="dinheiro">Dinheiro em Espécie</option>
                    <option value="cartao">Cartão de Débito/Crédito</option>
                    <option value="outro">Outro Meio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID da Transação / Comprovante
                  </label>
                  <input
                    type="text"
                    value={transacaoId}
                    onChange={(e) => setTransacaoId(e.target.value)}
                    placeholder="Ex: E2E-PIX-98213..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações da Quitação (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={observacoesPagamento}
                  onChange={(e) => setObservacoesPagamento(e.target.value)}
                  placeholder="Ex: Quitado sem multas com desconto pontualidade..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  O sistema gerará um <strong>Comprovante com Hash SHA-256</strong> que atesta a quitação legal do período.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmittingPayment ? 'Processando...' : 'Confirmar & Emitir Recibo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Comprovante / Recibo Oficial de Quitação */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Top Toolbar (No-Print) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">Comprovante Oficial de Quitação de Aluguel</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyReceiptText(showReceiptModal)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReceipt(showReceiptModal)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 sm:p-8 space-y-6 text-slate-800 bg-white font-sans">
              {/* Receipt Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    LocaDoc — Gestão Imobiliária & Locações
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    RECIBO DE QUITAÇÃO DE ALUGUEL E ENCARGOS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Emitido nos termos do Art. 22, Inciso VI da Lei Federal nº 8.245/1991
                  </p>
                </div>
                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                  <div className="text-xs font-bold text-slate-900 font-mono">
                    Nº: {showReceiptModal.id}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Data: {new Date(showReceiptModal.emitidoEm).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block mb-1 text-[11px] uppercase tracking-wider">
                    Locador / Beneficiário:
                  </span>
                  <div className="space-y-0.5 text-slate-700">
                    <p className="font-semibold text-slate-900">{showReceiptModal.locadorNome}</p>
                    <p>CPF/CNPJ: {showReceiptModal.locadorCpfCnpj}</p>
                    <p>E-mail: {showReceiptModal.locadorEmail}</p>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-900 block mb-1 text-[11px] uppercase tracking-wider">
                    Locatário / Pagador:
                  </span>
                  <div className="space-y-0.5 text-slate-700">
                    <p className="font-semibold text-slate-900">{showReceiptModal.locatarioNome}</p>
                    <p>CPF: {showReceiptModal.locatarioCpf}</p>
                    <p>E-mail: {showReceiptModal.locatarioEmail}</p>
                  </div>
                </div>
              </div>

              {/* Property & Period */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Imóvel: {showReceiptModal.imovelTitulo}</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                    Competência: {showReceiptModal.mesReferencia}
                  </span>
                </div>
                <p className="text-slate-600">{showReceiptModal.imovelEndereco}</p>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left font-bold">Discriminação das Verbas</th>
                      <th className="py-2 px-3 text-right font-bold">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="py-2 px-3 text-slate-800 font-sans">Aluguel Residencial</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrencyBRL(showReceiptModal.valorAluguel)}</td>
                    </tr>
                    {showReceiptModal.valorCondominio > 0 && (
                      <tr>
                        <td className="py-2 px-3 text-slate-800 font-sans">Taxa Ordinária de Condomínio</td>
                        <td className="py-2 px-3 text-right">{formatCurrencyBRL(showReceiptModal.valorCondominio)}</td>
                      </tr>
                    )}
                    {showReceiptModal.valorIptu > 0 && (
                      <tr>
                        <td className="py-2 px-3 text-slate-800 font-sans">IPTU Proporcional</td>
                        <td className="py-2 px-3 text-right">{formatCurrencyBRL(showReceiptModal.valorIptu)}</td>
                      </tr>
                    )}
                    {showReceiptModal.outrosEncargos > 0 && (
                      <tr>
                        <td className="py-2 px-3 text-slate-800 font-sans">Outros Encargos / Despesas</td>
                        <td className="py-2 px-3 text-right">{formatCurrencyBRL(showReceiptModal.outrosEncargos)}</td>
                      </tr>
                    )}
                    {showReceiptModal.desconto > 0 && (
                      <tr className="text-emerald-700">
                        <td className="py-2 px-3 font-sans">Desconto Pontualidade</td>
                        <td className="py-2 px-3 text-right font-mono">- {formatCurrencyBRL(showReceiptModal.desconto)}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td className="py-2.5 px-3 font-sans text-sm">TOTAL PAGO & LIQUIDADO</td>
                      <td className="py-2.5 px-3 text-right text-base text-emerald-700 font-mono">
                        {formatCurrencyBRL(showReceiptModal.valorTotalPago)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Value in words */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-900">Valor por Extenso: </span>
                <span className="italic text-slate-700 capitalize">
                  {showReceiptModal.valorTotalPagoExtenso}.
                </span>
              </div>

              {/* Legal Quitacao Clause */}
              <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                Pelo presente instrumento, o(a) LOCADOR(A) confere ao(à) LOCATÁRIO(A) a mais ampla, rasa e irrevogável quitação do aluguel e encargos referentes à competência de <strong>{showReceiptModal.mesReferencia}</strong>, ressalvadas eventuais diferenças apuradas posteriormente ou cobranças extraordinárias de concessionárias públicas.
              </p>

              {/* Cryptographic Hash & Security Verification */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Autenticação Digital & Hash SHA-256</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    Cód: {showReceiptModal.codigoVerificacao}
                  </span>
                </div>

                <div className="font-mono text-[10px] text-slate-400 break-all leading-tight">
                  HASH: {showReceiptModal.hashAutenticacaoSha256}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Meio: {showReceiptModal.formaPagamento.toUpperCase()} ({showReceiptModal.transacaoId})</span>
                  <span>Data Liquidação: {showReceiptModal.dataPagamento.split('-').reverse().join('/')}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-900">
                    {showReceiptModal.locadorNome}
                  </div>
                  <span className="text-[11px] text-slate-500">Locador(a) / Administrador</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-900">
                    {showReceiptModal.locatarioNome}
                  </div>
                  <span className="text-[11px] text-slate-500">Locatário(a) / Pagador(a)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Cobrança Avulsa */}
      {showNewCobrancaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Criar Cobrança Avulsa / Personalizada</h3>
                  <p className="text-[11px] text-slate-400">Lance uma fatura específica vinculada ao contrato</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCobrancaModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualCobranca} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vincular ao Contrato / Imóvel *
                </label>
                <select
                  value={newContratoId}
                  onChange={(e) => setNewContratoId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} — {c.locatario?.nome || 'Inquilino'} ({formatCurrencyBRL(c.valores?.aluguel || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mês de Referência *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMesReferencia}
                    onChange={(e) => setNewMesReferencia(e.target.value)}
                    placeholder="Ex: Julho/2026"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDataVencimento}
                    onChange={(e) => setNewDataVencimento(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Aluguel (R$)</label>
                  <input
                    type="number"
                    value={newValorAluguel}
                    onChange={(e) => setNewValorAluguel(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Condomínio</label>
                  <input
                    type="number"
                    value={newValorCondominio}
                    onChange={(e) => setNewValorCondominio(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">IPTU</label>
                  <input
                    type="number"
                    value={newValorIptu}
                    onChange={(e) => setNewValorIptu(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Outros/Taxas</label>
                  <input
                    type="number"
                    value={newOutrosEncargos}
                    onChange={(e) => setNewOutrosEncargos(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição dos Encargos / Observação (Opcional)
                </label>
                <input
                  type="text"
                  value={newDescricaoEncargos}
                  onChange={(e) => setNewDescricaoEncargos(e.target.value)}
                  placeholder="Ex: Parcela complementar ou taxa extraordinária..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Valor Total da Cobrança:</span>
                <span className="font-mono text-sm text-indigo-700">
                  {formatCurrencyBRL(
                    Number(newValorAluguel) + Number(newValorCondominio) + Number(newValorIptu) + Number(newOutrosEncargos)
                  )}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewCobrancaModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Lançar Cobrança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
