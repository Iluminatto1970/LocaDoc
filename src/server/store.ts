/**
 * Camada de persistência do LocaDoc.
 *
 * Em ambiente serverless (Vercel) cada invocação pode cair em uma instância nova,
 * então o estado em memória não pode ser a fonte da verdade. Quando MONGODB_URI
 * está configurada, usuários, contratos e sessões são lidos/gravados no MongoDB
 * (Atlas); sem a variável, o app continua funcionando apenas em memória (dev local).
 */
import type { BackendUser, StoredSession } from './types';

const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
const DB_NAME = (process.env.MONGODB_DB || 'locadoc').trim();
const STATE_COLLECTION = 'locadoc_state';
const SESSION_COLLECTION = 'locadoc_sessions';
const USERS_DOC_ID = 'users';
const CONTRACTS_DOC_ID = 'contracts';

export const isPersistent = MONGODB_URI.length > 0;

// O driver é importado dinamicamente: sem MONGODB_URI ele nem é carregado.
type MongoModule = typeof import('mongodb');
let mongo: MongoModule | null = null;
let db: any = null;
let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!isPersistent) return null;
  if (db) return db;
  if (!mongo) mongo = await import('mongodb');
  const client = new mongo.MongoClient(MONGODB_URI, {
    // Serverless: pool pequeno e timeouts curtos para não travar a invocação
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });
  await client.connect();
  db = client.db(DB_NAME);
  // Sessões expiram sozinhas (TTL) sem precisar de job de limpeza
  try {
    await db.collection(SESSION_COLLECTION).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch {
    /* índice já existe */
  }
  return db;
}

export interface PersistedState {
  users: BackendUser[] | null;
  contracts: any[] | null;
}

/** Lê o estado persistido. Retorna null quando não há persistência configurada. */
export async function loadState(): Promise<PersistedState | null> {
  if (!isPersistent) return null;
  try {
    const database = await getDb();
    const docs = await database
      .collection(STATE_COLLECTION)
      .find({ _id: { $in: [USERS_DOC_ID, CONTRACTS_DOC_ID] } })
      .toArray();

    const usersDoc = docs.find((d: any) => d._id === USERS_DOC_ID);
    const contractsDoc = docs.find((d: any) => d._id === CONTRACTS_DOC_ID);
    return {
      users: Array.isArray(usersDoc?.items) ? usersDoc.items : null,
      contracts: Array.isArray(contractsDoc?.items) ? contractsDoc.items : null,
    };
  } catch (err) {
    console.error('[store] Falha ao carregar estado persistido:', err);
    return null;
  }
}

export async function saveUsers(users: BackendUser[]): Promise<void> {
  if (!isPersistent) return;
  const database = await getDb();
  await database
    .collection(STATE_COLLECTION)
    .updateOne({ _id: USERS_DOC_ID }, { $set: { items: users, updatedAt: new Date().toISOString() } }, { upsert: true });
}

export async function saveContracts(contracts: any[]): Promise<void> {
  if (!isPersistent) return;
  const database = await getDb();
  await database
    .collection(STATE_COLLECTION)
    .updateOne({ _id: CONTRACTS_DOC_ID }, { $set: { items: contracts, updatedAt: new Date().toISOString() } }, { upsert: true });
}

export async function getSession(token: string): Promise<StoredSession | null> {
  if (!isPersistent) return null;
  try {
    const database = await getDb();
    const doc = await database.collection(SESSION_COLLECTION).findOne({ _id: token });
    if (!doc) return null;
    if (typeof doc.expiresAt === 'number' && doc.expiresAt < Date.now()) {
      await database.collection(SESSION_COLLECTION).deleteOne({ _id: token });
      return null;
    }
    return { userId: doc.userId, expiresAt: doc.expiresAt };
  } catch (err) {
    console.error('[store] Falha ao ler sessão:', err);
    return null;
  }
}

export async function putSession(token: string, session: StoredSession): Promise<void> {
  if (!isPersistent) return;
  try {
    const database = await getDb();
    await database
      .collection(SESSION_COLLECTION)
      .updateOne(
        { _id: token },
        { $set: { userId: session.userId, expiresAt: new Date(session.expiresAt) } },
        { upsert: true }
      );
  } catch (err) {
    console.error('[store] Falha ao gravar sessão:', err);
  }
}

export async function deleteSession(token: string): Promise<void> {
  if (!isPersistent) return;
  try {
    const database = await getDb();
    await database.collection(SESSION_COLLECTION).deleteOne({ _id: token });
  } catch (err) {
    console.error('[store] Falha ao remover sessão:', err);
  }
}

export async function deleteUserSessions(userId: string): Promise<void> {
  if (!isPersistent) return;
  try {
    const database = await getDb();
    await database.collection(SESSION_COLLECTION).deleteMany({ userId });
  } catch (err) {
    console.error('[store] Falha ao revogar sessões do usuário:', err);
  }
}

export async function countSessions(): Promise<number> {
  if (!isPersistent) return 0;
  try {
    const database = await getDb();
    return await database.collection(SESSION_COLLECTION).countDocuments();
  } catch {
    return 0;
  }
}
