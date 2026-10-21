export interface LocadorData {
  nome: string;
  nacionalidade: string;
  estadoCivil: string;
  profissao: string;
  rg: string;
  orgaoExpedidor: string;
  cpf: string;
  dataNascimento?: string;
  endereco: string;
  telefone: string;
  email: string;
}

export interface LocatarioData {
  nome: string;
  nacionalidade: string;
  estadoCivil: string;
  profissao: string;
  rg: string;
  orgaoExpedidor: string;
  cpf: string;
  dataNascimento?: string;
  endereco?: string;
  telefone: string;
  email: string;
}

export interface ObjetoData {
  endereco: string;
  compostos: string;
}

export interface PrazoData {
  vigenciaMeses: number;
  dataInicio: string;
  dataTermino: string;
}

export interface ValoresData {
  aluguel: number;
  aluguelExtenso: string;
  diaVencimento: number;
  chavePix: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta?: string;
  indiceReajuste: 'IPCA' | 'IGP-M' | 'INPC';
}

export interface VistoriaDigitalData {
  linkNuvem: string;
  hashSha256: string;
  prazoContestacaoHoras: number;
  fotos?: string[];
  observacoesGerais?: string;
  dataVistoria?: string;
  responsavelVistoria?: string;
  chavesEntregues?: string;
}

export interface GarantiaData {
  tipo: 'caucao' | 'fiador' | 'seguro_fianca';
  // Opção 1: Caução
  caucaoValor: number;
  caucaoValorExtenso: string;
  caucaoMeses: number;
  caucaoContaPoupanca: string;
  caucaoBanco?: string;
  caucaoAgencia?: string;
  caucaoContaNumero?: string;
  caucaoTitular?: string;

  // Opção 2: Fiador
  fiadorNome: string;
  fiadorConjuge: string;
  fiadorCpf: string;
  fiadorCpfConjuge?: string;
  fiadorRg: string;
  fiadorOrgaoExpedidor?: string;
  fiadorEndereco: string;
  fiadorProfissao: string;
  fiadorNacionalidade?: string;
  fiadorEstadoCivil?: string;
  fiadorTelefone?: string;
  fiadorEmail?: string;

  // Opção 3: Seguro Fiança
  seguroApolice: string;
  seguroCompanhia: string;
  seguroVigenciaInicio?: string;
  seguroVigenciaTermino?: string;
  seguroCoberturaValor?: number;
}

export interface ForoData {
  comarcaCidadeUf: string;
  cidadeUf: string;
  dataExtenso: string;
}

export interface TestemunhaData {
  nome: string;
  cpf: string;
}

export interface InventarioItem {
  id: string;
  comodo: string;
  item: string;
  marcaModelo: string;
  estado: string;
  observacoes: string;
  observacoesLocador?: string;
  observacoesLocatario?: string;
  fotos?: string[]; // Multiple photos per inventory item
}

export type ContractOperationType = 'aluguel_residencial' | 'aluguel_comercial' | 'venda_imovel' | 'temporada';

export interface VendaInfo {
  valorVenda: number;
  valorVendaExtenso: string;
  sinalEntrada: number;
  sinalEntradaExtenso?: string;
  saldoFinanciamento: number;
  saldoRestante?: number;
  condicoesPagamento: string;
  matriculaImovel: string;
  cartorioRegistro: string;
  prazoEscrituraDias?: number;
  imissaoPosse?: 'na_escritura' | 'no_sinal' | 'na_quitacao';
  dataPosse?: string;
}

export interface ContractTemplate {
  id: string;
  titulo: string;
  categoria: 'aluguel_residencial' | 'aluguel_comercial' | 'venda_imovel' | 'temporada' | 'personalizado';
  descricao: string;
  conteudoTexto: string;
  isDefault?: boolean;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'pro' | 'enterprise';
  maxProperties: number;
  maxContractsMonth: number;
  cnpj?: string;
  creciJuridico?: string;
  logoUrl?: string;
  corPrimaria?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  createdAt: string;
}

export interface ImovelData {
  id: string;
  userId: string;
  organizationId?: string;
  titulo: string;
  tipo: 'apartamento' | 'casa' | 'studio' | 'cobertura' | 'comercial' | 'outro';
  finalidade: 'aluguel' | 'venda' | 'ambos' | 'temporada';
  endereco: string;
  bairro?: string;
  cidadeUf?: string;
  cep?: string;
  compostos: string;
  vagaGaragem?: string;
  valorAluguelSugerido?: number;
  valorVendaSugerido?: number;
  condominioSugerido?: number;
  iptuSugerido?: number;
  matriculaCartorio?: string;
  cartorioNome?: string;
  modeloContratoPadraoId?: string; // Modelo específico vinculado a este imóvel
  minutaPersonalizadaImovel?: string; // Cláusulas ou minuta específica exclusiva do imóvel
  fotos?: string[];
  observacoes?: string;
  status: 'disponivel' | 'locado' | 'vendido' | 'manutencao';
  createdAt: string;
  updatedAt: string;
}

export interface TemporadaInfo {
  dataCheckIn: string;
  dataCheckOut: string;
  horarioCheckIn: string;
  horarioCheckOut: string;
  quantidadeDiarias: number;
  valorDiaria: number;
  taxaLimpeza: number;
  caucaoDanos: number;
  totalGeral: number;
  maxHospedes: number;
  regrasCasa: string[];
  fechaduraDigitalSenha?: string;
  wifiRede?: string;
  wifiSenha?: string;
}

export interface ImovelTemporadaData {
  id: string;
  userId: string;
  titulo: string;
  tipo: 'apartamento' | 'casa' | 'studio' | 'chale' | 'cobertura' | 'flat';
  cidadeUf: string;
  bairro: string;
  endereco: string;
  valorDiaria: number;
  taxaLimpeza: number;
  caucaoDanos: number;
  capacidadeHospedes: number;
  quartos: number;
  camas: string;
  banheiros: number;
  horarioCheckIn: string;
  horarioCheckOut: string;
  minimoDiarias: number;
  comodidades: string[];
  regrasCasa: string[];
  fotos: string[];
  descricao: string;
  fechaduraDigitalSenha?: string;
  wifiRede?: string;
  wifiSenha?: string;
  avaliacaoMedia?: number;
  totalAvaliacoes?: number;
  status: 'disponivel' | 'reservado' | 'manutencao';
  createdAt: string;
  updatedAt: string;
}

export interface ReservaTemporada {
  id: string;
  imovelId: string;
  imovelTitulo: string;
  imovelCidade: string;
  userId: string;
  hospedeNome: string;
  hospedeCpf: string;
  hospedeEmail: string;
  hospedeTelefone: string;
  dataCheckIn: string;
  dataCheckOut: string;
  quantidadeDiarias: number;
  quantidadeHospedes: number;
  valorDiaria: number;
  subtotalDiarias: number;
  taxaLimpeza: number;
  caucaoDanos: number;
  valorTotal: number;
  status: 'confirmada' | 'em_andamento' | 'concluida' | 'cancelada';
  contratoId?: string;
  hashSha256?: string;
  fechaduraDigitalCodigo?: string;
  wifiRede?: string;
  wifiSenha?: string;
  createdAt: string;
}

export interface TenantUploadedDocument {
  id: string;
  nome: string;
  categoria: 'identidade' | 'renda' | 'residencia' | 'conjuge_fiador' | 'outro';
  tamanho: number;
  tipo: string;
  base64?: string;
  dataEnvio: string;
  status: 'em_analise' | 'aprovado' | 'rejeitado';
  observacoesAdmin?: string;
}

export interface ContractData {
  id: string;
  userId?: string;
  tenantId?: string;
  organizationId?: string;
  imovelId?: string;
  tipoOperacao?: ContractOperationType;
  operacao?: ContractOperationType;
  tipoLocacao?: 'residencial_mensal' | 'temporada';
  templateId?: string;
  temporadaInfo?: TemporadaInfo;
  vendaInfo?: VendaInfo;
  titulo: string;
  textoPersonalizado?: string;
  usarTextoPersonalizado?: boolean;
  documentosLocatario?: TenantUploadedDocument[];
  createdAt: string;
  updatedAt: string;
  status: 'rascunho' | 'gerado' | 'pronto' | 'ativo';
  locador: LocadorData;
  locatario: LocatarioData;
  objeto: ObjetoData;
  prazo: PrazoData;
  valores: ValoresData;
  vistoriaDigital: VistoriaDigitalData;
  garantia: GarantiaData;
  foro: ForoData;
  testemunhas: [TestemunhaData, TestemunhaData];
  inventario: InventarioItem[];
  vistoLocador: string;
  vistoLocatario: string;
  observacoesLocador?: string;
  observacoesLocatario?: string;
  publicShareId?: string;
  publicExpiresAt?: string;
}

export type UserRole = 'superadmin' | 'admin' | 'cliente' | 'condomino';

export interface UserAccount {
  id: string;
  organizationId?: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'aprovado' | 'pendente' | 'bloqueado';
  password?: string;
  creci?: string;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  rg?: string;
  orgaoExpedidor?: string;
  profissao?: string;
  estadoCivil?: string;
  rendaMensal?: number;
  enderecoOrigem?: string;
  unidade?: string; // Ex: 'Apto 142'
  bloco?: string;   // Ex: 'Bloco B'
  condominioNome?: string;
  documentosEnviados?: TenantUploadedDocument[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type DocumentTargetRole = 'locador' | 'locatario' | 'imovel' | 'fiador' | 'laudo' | 'outro';

export interface UploadedDocFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64?: string;
  previewUrl?: string;
  sha256?: string;
  tag?: 'rg_locador' | 'rg_locatario' | 'comprovante' | 'imovel' | 'laudo' | 'outro';
  targetRole: DocumentTargetRole;
  description?: string;
}

export type CobrancaStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado';
export type FormaPagamento = 'pix' | 'ted' | 'boleto' | 'dinheiro' | 'cartao' | 'outro';

export interface CobrancaMensal {
  id: string;
  contratoId: string;
  imovelId?: string;
  imovelTitulo: string;
  imovelEndereco?: string;
  
  // Dados do Locatário (Pagador)
  locatarioNome: string;
  locatarioEmail: string;
  locatarioCpf?: string;
  locatarioTelefone?: string;
  tenantId?: string; // UID do usuário caso seja usuário cadastrado
  
  // Dados do Locador (Beneficiário)
  locadorNome: string;
  locadorEmail: string;
  locadorCpfCnpj?: string;
  locadorChavePix?: string;
  
  // Cronograma e Mês de Referência
  numeroParcela?: number;
  totalParcelas?: number;
  mesReferencia: string; // Ex: 'Maio/2026' ou '2026-05'
  dataVencimento: string; // YYYY-MM-DD
  
  // Discriminação dos valores
  valorAluguel: number;
  valorCondominio?: number;
  valorIptu?: number;
  outrosEncargos?: number;
  descricaoEncargos?: string;
  desconto?: number;
  valorTotal: number;
  
  // Status da Cobrança e Registro de Liquidação
  status: CobrancaStatus;
  dataPagamento?: string; // YYYY-MM-DD ou ISO
  valorPago?: number;
  formaPagamento?: FormaPagamento;
  transacaoIdOuComprovante?: string;
  observacoesPagamento?: string;
  
  // Comprovante / Recibo Automático Vinculado
  reciboEmitido?: boolean;
  reciboId?: string;
  reciboHashSha256?: string;
  
  // Dados para Pagamento
  pixCopiaECola?: string;
  codigoBarrasBoleto?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ReciboPagamento {
  id: string; // Ex: 'REC-2026-0001'
  cobrancaId: string;
  contratoId: string;
  imovelTitulo: string;
  imovelEndereco: string;
  
  // Partes
  locadorNome: string;
  locadorCpfCnpj: string;
  locadorEmail: string;
  
  locatarioNome: string;
  locatarioCpf: string;
  locatarioEmail: string;
  
  // Valores e Competência
  mesReferencia: string;
  dataVencimento: string;
  dataPagamento: string;
  
  valorAluguel: number;
  valorCondominio: number;
  valorIptu: number;
  outrosEncargos: number;
  desconto: number;
  valorTotalPago: number;
  valorTotalPagoExtenso: string;
  
  formaPagamento: FormaPagamento;
  transacaoId?: string;
  
  // Integridade e Autenticação
  hashAutenticacaoSha256: string;
  codigoVerificacao: string;
  emitidoPor: string;
  emitidoEm: string;
  observacoes?: string;
}
