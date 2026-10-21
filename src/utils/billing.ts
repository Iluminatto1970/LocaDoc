import { CobrancaMensal, ReciboPagamento, ContractData, FormaPagamento } from '../types/contract';
import { formatCurrencyBRL, numeroPorExtensoReais } from './defaults';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

export async function calculateTextSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera código simulado PIX Copia e Cola compatível com padrão EMV BR Code
 */
export function generatePixCopyAndPaste(
  chavePix: string,
  valor: number,
  beneficiario: string,
  cidade: string,
  referencia: string
): string {
  const cleanChave = chavePix.replace(/\s+/g, '');
  const cleanBeneficiario = beneficiario.slice(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const cleanCidade = cidade.slice(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const valStr = valor.toFixed(2);
  const txid = referencia.replace(/[^A-Za-z0-9]/g, '').slice(0, 20) || 'LOCADOC';

  return `00020126580014br.gov.bcb.pix01${cleanChave.length.toString().padStart(2, '0')}${cleanChave}520400005303986540${valStr.length.toString().padStart(2, '0')}${valStr}5802BR59${cleanBeneficiario.length.toString().padStart(2, '0')}${cleanBeneficiario}60${cleanCidade.length.toString().padStart(2, '0')}${cleanCidade}62070503${txid}6304`;
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Gera cronograma de cobranças mensais para um contrato ativo
 */
export function generateScheduleForContract(
  contract: ContractData,
  totalMeses: number = 12,
  mesInicioIndex: number = 0
): CobrancaMensal[] {
  const diaVenc = contract.valores?.diaVencimento || 10;
  const valorAluguel = contract.valores?.aluguel || 3000;
  const valorCondominio = (contract.objeto as any)?.condominioSugerido || 0;
  const valorIptu = (contract.objeto as any)?.iptuSugerido || 0;
  const valorTotal = valorAluguel + valorCondominio + valorIptu;

  const chavePix = contract.valores?.chavePix || contract.locador?.email || 'iluminatto@gmail.com';
  const beneficiario = contract.locador?.nome || 'Iluminatto Moraes';
  const cidade = contract.foro?.comarcaCidadeUf?.split('/')[0] || 'Sao Paulo';

  const schedule: CobrancaMensal[] = [];
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth(); // 0-indexed

  for (let i = 0; i < totalMeses; i++) {
    const targetDate = new Date(anoAtual, mesAtual + mesInicioIndex + i, diaVenc);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    const mesRefStr = `${MESES_PT[targetMonth]}/${targetYear}`;
    const isoDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(diaVenc).padStart(2, '0')}`;
    
    // Status inicial: se o vencimento for antes de hoje, atrasado; senão pendente
    const isPast = targetDate < hoje;
    const initialStatus = isPast ? 'atrasado' : 'pendente';

    const cobrancaId = `cob-${contract.id}-${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const pixCode = generatePixCopyAndPaste(
      chavePix,
      valorTotal,
      beneficiario,
      cidade,
      `ALUGUEL${targetMonth + 1}${targetYear}`
    );

    schedule.push({
      id: cobrancaId,
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
      numeroParcela: i + 1,
      totalParcelas: totalMeses,
      mesReferencia: mesRefStr,
      dataVencimento: isoDateStr,
      valorAluguel,
      valorCondominio,
      valorIptu,
      valorTotal,
      status: initialStatus,
      pixCopiaECola: pixCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return schedule;
}

/**
 * Criação e emissão de recibo oficial de quitação com hash SHA-256
 */
export async function createPaymentReceipt(
  cobranca: CobrancaMensal,
  dadosPagamento: {
    dataPagamento: string;
    valorPago: number;
    formaPagamento: FormaPagamento;
    transacaoId?: string;
    observacoes?: string;
    emitidoPor: string;
  }
): Promise<ReciboPagamento> {
  const reciboNumero = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const codigoVerificacao = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const payloadForHash = `${reciboNumero}|${cobranca.id}|${cobranca.contratoId}|${cobranca.locadorNome}|${cobranca.locatarioNome}|${dadosPagamento.valorPago}|${dadosPagamento.dataPagamento}|${codigoVerificacao}`;
  const hashAutenticacaoSha256 = await calculateTextSHA256(payloadForHash);

  const recibo: ReciboPagamento = {
    id: reciboNumero,
    cobrancaId: cobranca.id,
    contratoId: cobranca.contratoId,
    imovelTitulo: cobranca.imovelTitulo,
    imovelEndereco: cobranca.imovelEndereco || 'Imóvel residencial sob locação',
    locadorNome: cobranca.locadorNome,
    locadorCpfCnpj: cobranca.locadorCpfCnpj || '000.000.000-00',
    locadorEmail: cobranca.locadorEmail,
    locatarioNome: cobranca.locatarioNome,
    locatarioCpf: cobranca.locatarioCpf || '000.000.000-00',
    locatarioEmail: cobranca.locatarioEmail,
    mesReferencia: cobranca.mesReferencia,
    dataVencimento: cobranca.dataVencimento,
    dataPagamento: dadosPagamento.dataPagamento,
    valorAluguel: cobranca.valorAluguel,
    valorCondominio: cobranca.valorCondominio || 0,
    valorIptu: cobranca.valorIptu || 0,
    outrosEncargos: cobranca.outrosEncargos || 0,
    desconto: cobranca.desconto || 0,
    valorTotalPago: dadosPagamento.valorPago,
    valorTotalPagoExtenso: numeroPorExtensoReais(dadosPagamento.valorPago),
    formaPagamento: dadosPagamento.formaPagamento,
    transacaoId: dadosPagamento.transacaoId || `PIX-AUTH-${Date.now().toString().slice(-8)}`,
    hashAutenticacaoSha256,
    codigoVerificacao,
    emitidoPor: dadosPagamento.emitidoPor,
    emitidoEm: new Date().toISOString(),
    observacoes: dadosPagamento.observacoes || 'Pagamento recebido e quitado nos termos do Art. 22, VI da Lei nº 8.245/1991.',
  };

  return recibo;
}

export const INITIAL_DEMO_COBRANCAS: CobrancaMensal[] = [
  {
    id: 'cob-demo-01',
    contratoId: 'contrato-demo-01',
    imovelId: 'imovel-01',
    imovelTitulo: 'Apto 102 - Residencial Jardins',
    imovelEndereco: 'Rua das Flores, 123, Apto 102, Jardim Paulista, São Paulo/SP',
    locatarioNome: 'Mariana Duarte Costa',
    locatarioEmail: 'mariana.costa@email.com',
    locatarioCpf: '321.654.987-00',
    locatarioTelefone: '(11) 98888-2222',
    locadorNome: 'Iluminatto Moraes',
    locadorEmail: 'iluminatto@gmail.com',
    locadorCpfCnpj: '38.452.128/0001-90',
    locadorChavePix: 'iluminatto@gmail.com',
    numeroParcela: 1,
    totalParcelas: 12,
    mesReferencia: 'Abril/2026',
    dataVencimento: '2026-04-10',
    valorAluguel: 3500,
    valorCondominio: 650,
    valorIptu: 210,
    valorTotal: 4360,
    status: 'pago',
    dataPagamento: '2026-04-09',
    valorPago: 4360,
    formaPagamento: 'pix',
    transacaoIdOuComprovante: 'E2E-PIX-202604091428593410',
    observacoesPagamento: 'Pago antecipado com PIX.',
    reciboEmitido: true,
    reciboId: 'REC-2026-1042',
    reciboHashSha256: '9f83a8b27c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    pixCopiaECola: '00020126580014br.gov.bcb.pix0119iluminatto@gmail.com52040000530398654074360.005802BR5916ILUMINATTO MORAES6009SAO PAULO62070503LOCADOC6304',
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-04-09T14:30:00.000Z',
  },
  {
    id: 'cob-demo-02',
    contratoId: 'contrato-demo-01',
    imovelId: 'imovel-01',
    imovelTitulo: 'Apto 102 - Residencial Jardins',
    imovelEndereco: 'Rua das Flores, 123, Apto 102, Jardim Paulista, São Paulo/SP',
    locatarioNome: 'Mariana Duarte Costa',
    locatarioEmail: 'mariana.costa@email.com',
    locatarioCpf: '321.654.987-00',
    locatarioTelefone: '(11) 98888-2222',
    locadorNome: 'Iluminatto Moraes',
    locadorEmail: 'iluminatto@gmail.com',
    locadorCpfCnpj: '38.452.128/0001-90',
    locadorChavePix: 'iluminatto@gmail.com',
    numeroParcela: 2,
    totalParcelas: 12,
    mesReferencia: 'Maio/2026',
    dataVencimento: '2026-05-10',
    valorAluguel: 3500,
    valorCondominio: 650,
    valorIptu: 210,
    valorTotal: 4360,
    status: 'pendente',
    pixCopiaECola: '00020126580014br.gov.bcb.pix0119iluminatto@gmail.com52040000530398654074360.005802BR5916ILUMINATTO MORAES6009SAO PAULO62070503LOCADOC6304',
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'cob-demo-03',
    contratoId: 'contrato-demo-01',
    imovelId: 'imovel-01',
    imovelTitulo: 'Apto 102 - Residencial Jardins',
    imovelEndereco: 'Rua das Flores, 123, Apto 102, Jardim Paulista, São Paulo/SP',
    locatarioNome: 'Mariana Duarte Costa',
    locatarioEmail: 'mariana.costa@email.com',
    locatarioCpf: '321.654.987-00',
    locatarioTelefone: '(11) 98888-2222',
    locadorNome: 'Iluminatto Moraes',
    locadorEmail: 'iluminatto@gmail.com',
    locadorCpfCnpj: '38.452.128/0001-90',
    locadorChavePix: 'iluminatto@gmail.com',
    numeroParcela: 3,
    totalParcelas: 12,
    mesReferencia: 'Junho/2026',
    dataVencimento: '2026-06-10',
    valorAluguel: 3500,
    valorCondominio: 650,
    valorIptu: 210,
    valorTotal: 4360,
    status: 'pendente',
    pixCopiaECola: '00020126580014br.gov.bcb.pix0119iluminatto@gmail.com52040000530398654074360.005802BR5916ILUMINATTO MORAES6009SAO PAULO62070503LOCADOC6304',
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
  }
];

export const INITIAL_DEMO_RECIBOS: ReciboPagamento[] = [
  {
    id: 'REC-2026-1042',
    cobrancaId: 'cob-demo-01',
    contratoId: 'contrato-demo-01',
    imovelTitulo: 'Apto 102 - Residencial Jardins',
    imovelEndereco: 'Rua das Flores, 123, Apto 102, Jardim Paulista, São Paulo/SP',
    locadorNome: 'Iluminatto Moraes',
    locadorCpfCnpj: '38.452.128/0001-90',
    locadorEmail: 'iluminatto@gmail.com',
    locatarioNome: 'Mariana Duarte Costa',
    locatarioCpf: '321.654.987-00',
    locatarioEmail: 'mariana.costa@email.com',
    mesReferencia: 'Abril/2026',
    dataVencimento: '2026-04-10',
    dataPagamento: '2026-04-09',
    valorAluguel: 3500,
    valorCondominio: 650,
    valorIptu: 210,
    outrosEncargos: 0,
    desconto: 0,
    valorTotalPago: 4360,
    valorTotalPagoExtenso: 'quatro mil e trezentos e sessenta reais',
    formaPagamento: 'pix',
    transacaoId: 'E2E-PIX-202604091428593410',
    hashAutenticacaoSha256: '9f83a8b27c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    codigoVerificacao: 'LOCA-7821-QUITA',
    emitidoPor: 'Iluminatto Moraes (Superadmin)',
    emitidoEm: '2026-04-09T14:30:00.000Z',
    observacoes: 'Quitação plena da competência de Abril/2026 para os efeitos do Art. 22, VI da Lei 8.245/91.',
  }
];

export function getSavedCobrancas(): CobrancaMensal[] {
  try {
    const raw = localStorage.getItem('locadoc_cobrancas_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler cobranças do localStorage:', e);
  }
  return INITIAL_DEMO_COBRANCAS;
}

export function getSavedRecibos(): ReciboPagamento[] {
  try {
    const raw = localStorage.getItem('locadoc_recibos_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler recibos do localStorage:', e);
  }
  return INITIAL_DEMO_RECIBOS;
}
