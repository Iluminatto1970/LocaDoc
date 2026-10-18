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

export interface ImovelData {
  id: string;
  userId: string;
  titulo: string;
  tipo: 'apartamento' | 'casa' | 'studio' | 'cobertura' | 'outro';
  endereco: string;
  bairro?: string;
  cidadeUf?: string;
  cep?: string;
  compostos: string;
  vagaGaragem?: string;
  valorAluguelSugerido?: number;
  condominioSugerido?: number;
  iptuSugerido?: number;
  fotos?: string[];
  observacoes?: string;
  status: 'disponivel' | 'locado' | 'manutencao';
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

export interface ContractData {
  id: string;
  userId?: string;
  imovelId?: string;
  tipoLocacao?: 'residencial_mensal' | 'temporada';
  temporadaInfo?: TemporadaInfo;
  titulo: string;
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
  name: string;
  email: string;
  role: UserRole;
  status: 'aprovado' | 'pendente' | 'bloqueado';
  password?: string;
  creci?: string;
  telefone?: string;
  cpf?: string;
  unidade?: string; // Ex: 'Apto 142'
  bloco?: string;   // Ex: 'Bloco B'
  condominioNome?: string;
  createdAt?: string;
  createdBy?: string;
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
