export type UserRole = 'superadmin' | 'admin' | 'cliente' | 'condomino';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'aprovado' | 'pendente' | 'bloqueado';
  /** Hash scrypt da senha (nunca texto puro) */
  password?: string;
  creci?: string;
  telefone?: string;
  cpf?: string;
  unidade?: string;
  bloco?: string;
  condominioNome?: string;
  createdAt: string;
  createdBy?: string;
}

export interface StoredSession {
  userId: string;
  expiresAt: number;
}
