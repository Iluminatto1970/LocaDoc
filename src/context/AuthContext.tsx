import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types/contract';
import { auth, googleProvider, db, browserPopupRedirectResolver } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, SESSION_EXPIRED_EVENT, getAuthToken, apiFetch } from '../lib/api';

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  usersList: UserAccount[];
  login: (emailOrUser: string, pass: string) => Promise<LoginResult>;
  register: (name: string, email: string, pass: string, creci?: string, telefone?: string, unidade?: string, bloco?: string, cpf?: string) => Promise<LoginResult>;
  addUser: (name: string, email: string, pass: string, role: UserRole, creci?: string, telefone?: string, unidade?: string, bloco?: string, cpf?: string) => Promise<LoginResult>;
  approveUser: (userId: string, newStatus: 'aprovado' | 'bloqueado' | 'pendente') => Promise<void>;
  updateUser: (
    userId: string,
    changes: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      creci?: string;
      telefone?: string;
      unidade?: string;
      bloco?: string;
      cpf?: string;
    }
  ) => Promise<LoginResult>;
  deleteUser: (userId: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
  isLoadingAuth: boolean;
  canAddAdmins: boolean;
  canAddClients: boolean;
  canApproveUsers: boolean;
  refreshUsers: () => Promise<void>;
}

// Master Superadmin user: Iluminatto Moraes
export const MASTER_USER: UserAccount = {
  id: 'usr-master-iluminatto',
  name: 'Iluminatto Moraes',
  email: 'iluminatto@gmail.com',
  role: 'superadmin',
  status: 'aprovado',
  creci: 'Super Administrador',
  createdAt: '2026-01-01T00:00:00.000Z',
};

// A sessão (token HMAC + usuário) é gerenciada por src/lib/api.ts

// Senhas nunca são persistidas no navegador nem no Firestore
const stripPassword = (account: UserAccount): UserAccount => {
  const safe: UserAccount = { ...account };
  delete safe.password;
  return safe;
};

// Helper to check and eliminate any stale references to Roberto Magalhães
const isRobertoReference = (str?: string): boolean => {
  if (!str) return false;
  const s = str.toLowerCase();
  return s.includes('roberto') || s.includes('magalh');
};

export const MASTER_EMAIL = 'iluminatto@gmail.com';

/** A conta master é sempre Super Administrador, independente do que vier da origem. */
const asMasterIfMasterEmail = (account: UserAccount): UserAccount => {
  if (account.email?.toLowerCase() !== MASTER_EMAIL) return account;
  return { ...account, role: 'superadmin', status: 'aprovado', creci: account.creci || 'Super Administrador' };
};

const sanitizeUser = (raw: any): UserAccount => {
  if (!raw || typeof raw !== 'object' || isRobertoReference(raw.name) || isRobertoReference(raw.email)) {
    return MASTER_USER;
  }
  return asMasterIfMasterEmail(raw as UserAccount);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sessão restaurada apenas se existir token emitido pelo backend
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
        // Sem token de backend não existe sessão: remove resíduos de sessões antigas
        localStorage.removeItem('locadoc_auth_user');
        return null;
      }
      const saved = localStorage.getItem('locadoc_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && !isRobertoReference(parsed.name) && !isRobertoReference(parsed.email)) {
          return stripPassword(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => !getAuthToken());

  // Sessão expirada/revogada no servidor: limpa o estado e reabre o login
  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setShowAuthModal(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  // A lista de usuários exibida na interface vem do backend (fonte da verdade do CRUD)
  const refreshUsers = async () => {
    try {
      const res = await apiFetch('/api/users');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.users)) {
        setUsersList(data.users.map((u: UserAccount) => stripPassword(asMasterIfMasterEmail(u))));
      }
    } catch (e) {
      console.warn('Não foi possível carregar os usuários do servidor:', e);
    }
  };

  // Valida o token guardado no boot: token inválido não mantém sessão fantasma
  useEffect(() => {
    const validateSession = async () => {
      if (!getAuthToken()) return;
      try {
        const res = await apiFetch('/api/auth/session');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          const fresh = stripPassword(sanitizeUser(data.user));
          setUser(fresh);
          localStorage.setItem('locadoc_auth_user', JSON.stringify(fresh));
          await refreshUsers();
        }
      } catch (e) {
        console.warn('Não foi possível validar a sessão agora:', e);
      }
    };
    validateSession();
  }, []);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Manage all users list with persistence in localStorage and Firestore
  const [usersList, setUsersList] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('locadoc_users_db');
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any stale Roberto users completely
          const cleanList = parsed.filter(
            (u) => !isRobertoReference(u.name) && !isRobertoReference(u.email)
          );
          if (!cleanList.some((u) => u.email.toLowerCase() === MASTER_EMAIL)) {
            cleanList.unshift(MASTER_USER);
          }
          const passwordFree = cleanList.map((u) => stripPassword(asMasterIfMasterEmail(u)));
          localStorage.setItem('locadoc_users_db', JSON.stringify(passwordFree));
          return passwordFree;
        }
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.setItem('locadoc_users_db', JSON.stringify([MASTER_USER]));
    return [MASTER_USER];
  });

  // Save users to localStorage
  useEffect(() => {
    const cleanList = usersList
      .filter((u) => !isRobertoReference(u.name) && !isRobertoReference(u.email))
      .map((u) => stripPassword(asMasterIfMasterEmail(u)));
    localStorage.setItem('locadoc_users_db', JSON.stringify(cleanList));
  }, [usersList]);

  // Sync users with Firestore users collection on boot, and delete any stale Roberto documents
  useEffect(() => {
    const syncUsersFromFirestore = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        if (!querySnapshot.empty) {
          const remoteUsers: UserAccount[] = [];
          
          for (const d of querySnapshot.docs) {
            const data = d.data();
            const dName = data.displayName || data.name || '';
            const dEmail = data.email || '';

            // If a document references Roberto Magalhães, purge it from Firestore immediately
            if (isRobertoReference(dName) || isRobertoReference(dEmail) || isRobertoReference(d.id)) {
              try {
                await deleteDoc(doc(db, 'users', d.id));
              } catch (delErr) {
                console.warn('Erro ao deletar registro antigo:', delErr);
              }
              continue;
            }

            remoteUsers.push(
              asMasterIfMasterEmail({
                id: d.id,
                name: dName || 'Usuário',
                email: dEmail,
                role: (data.role as UserRole) || 'cliente',
                status: data.status || 'aprovado',
                creci: data.creci,
                telefone: data.telefone,
                createdAt: data.createdAt,
                createdBy: data.createdBy,
              })
            );
          }

          // Ensure master Iluminatto Moraes is always the primary Super Administrador
          if (!remoteUsers.some((u) => u.email.toLowerCase() === MASTER_EMAIL)) {
            remoteUsers.unshift(MASTER_USER);
          }

          setUsersList(remoteUsers);
        } else {
          // Seed master user Iluminatto in Firestore
          await setDoc(doc(db, 'users', MASTER_USER.id), {
            uid: MASTER_USER.id,
            displayName: MASTER_USER.name,
            email: MASTER_USER.email,
            role: MASTER_USER.role,
            status: MASTER_USER.status,
            createdAt: MASTER_USER.createdAt,
          });
        }
      } catch (err) {
        console.warn('Sincronização de usuários (Firestore):', err);
      }
    };

    syncUsersFromFirestore();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        let token = getAuthToken();
        // Se já autenticado no Firebase mas sem token de sessão backend, auto-sincroniza
        if (!token) {
          try {
            const idToken = await fbUser.getIdToken();
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success && data?.token) {
              token = data.token;
              localStorage.setItem(AUTH_TOKEN_KEY, token);
              const authenticated = stripPassword(sanitizeUser(data.user));
              localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticated));
              setUser(authenticated);
              setShowAuthModal(false);
              setIsLoadingAuth(false);
              return;
            }
          } catch (e) {
            console.warn('[AUTH] Falha ao sincronizar token Google em background:', e);
          }
        }

        if (!token) {
          setIsLoadingAuth(false);
          return;
        }

        const fbEmail = fbUser.email?.toLowerCase() || '';
        const isMaster = fbEmail === 'iluminatto@gmail.com';

        // Check if user already exists in usersList or saved in localStorage
        const saved = localStorage.getItem('locadoc_auth_user');
        let parsedSaved: UserAccount | null = null;
        try { if (saved) parsedSaved = JSON.parse(saved); } catch {}

        const existing = usersList.find((u) => u.email.toLowerCase() === fbEmail);

        const currentRole: UserRole = isMaster
          ? 'superadmin'
          : existing?.role || parsedSaved?.role || 'condomino';
        const currentStatus = isMaster
          ? 'aprovado'
          : existing?.status || parsedSaved?.status || 'aprovado';

        const userObj: UserAccount = {
          id: existing?.id || parsedSaved?.id || fbUser.uid,
          name: isMaster
            ? 'Iluminatto Moraes'
            : fbUser.displayName || existing?.name || parsedSaved?.name || fbEmail.split('@')[0],
          email: fbEmail,
          role: currentRole,
          status: currentStatus,
          creci: existing?.creci || parsedSaved?.creci || (isMaster ? 'Super Administrador' : undefined),
        };

        const sanitized = sanitizeUser(userObj);
        setUser(sanitized);
        localStorage.setItem('locadoc_auth_user', JSON.stringify(sanitized));

        // Save/Update in Firestore
        try {
          await setDoc(
            doc(db, 'users', fbUser.uid),
            {
              uid: fbUser.uid,
              displayName: sanitized.name,
              email: sanitized.email,
              photoURL: fbUser.photoURL || '',
              role: sanitized.role,
              status: sanitized.status,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Erro ao salvar usuário no Firestore:', err);
        }
      } else {
        // Sem Firebase: restaura a sessão local apenas com token de backend válido
        const saved = localStorage.getItem('locadoc_auth_user');
        if (getAuthToken() && saved && !isRobertoReference(saved)) {
          try {
            setUser(stripPassword(JSON.parse(saved)));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [usersList]);

  // Google: o Firebase prova a identidade e o backend troca o ID token por uma sessão do LocaDoc
  const signInWithGoogle = async () => {
    try {
      const credential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      const idToken = await credential.user.getIdToken(true);

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => null as any);

      if (!res.ok || !data?.success || !data?.token) {
        console.error('[Google Auth Debug] Falha na autorização backend:', {
          status: res.status,
          statusText: res.statusText,
          data,
        });
        await signOut(auth);
        throw new Error(data?.error || `Não foi possível autorizar sua conta Google neste sistema (código ${res.status}).`);
      }

      const authenticated = stripPassword(sanitizeUser(data.user));
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticated));
      setUser(authenticated);
      setShowAuthModal(false);

      setUsersList((prev) =>
        prev.some((u) => u.id === authenticated.id)
          ? prev.map((u) => (u.id === authenticated.id ? authenticated : u))
          : [...prev, authenticated]
      );

      if (authenticated.role === 'superadmin' || authenticated.role === 'admin') {
        await refreshUsers();
      }
    } catch (error: any) {
      console.error('Erro no Google Sign-In:', error);
      throw error;
    }
  };

  // Login real: a senha é verificada somente no backend (hash scrypt + MASTER_PASSWORD)
  const login = async (emailOrUser: string, pass: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUser.trim(), password: pass }),
      });
      const data = await res.json().catch(() => null as any);

      if (!res.ok || !data?.success || !data?.token) {
        return {
          success: false,
          error: data?.error || 'E-mail/usuário ou senha incorretos.',
        };
      }

      const authenticated = stripPassword(sanitizeUser(data.user));
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem('locadoc_auth_user', JSON.stringify(authenticated));
      setUser(authenticated);
      setUsersList((prev) =>
        prev.some((u) => u.id === authenticated.id)
          ? prev.map((u) => (u.id === authenticated.id ? authenticated : u))
          : [...prev, authenticated]
      );
      setShowAuthModal(false);
      // Superadmin/Admin passam a listar os usuários reais do backend
      if (authenticated.role === 'superadmin' || authenticated.role === 'admin') {
        await refreshUsers();
      }
      return { success: true };
    } catch (err) {
      console.error('Falha no login:', err);
      return {
        success: false,
        error: 'Não foi possível conectar ao servidor de autenticação. Tente novamente.',
      };
    }
  };

  // Self Registration: creates a condomino account
  const register = async (
    name: string,
    email: string,
    pass: string,
    creci?: string,
    telefone?: string,
    unidade?: string,
    bloco?: string,
    cpf?: string
  ): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();

    if (usersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Este e-mail já está cadastrado no sistema.' };
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role: 'condomino',
      status: 'aprovado',
      creci: creci?.trim(),
      telefone: telefone?.trim(),
      unidade: unidade?.trim(),
      bloco: bloco?.trim(),
      cpf: cpf?.trim(),
      createdAt: new Date().toISOString(),
      createdBy: 'auto_cadastro',
    };

    setUsersList((prev) => [...prev, newUser]);
    setUser(newUser);
    localStorage.setItem('locadoc_auth_user', JSON.stringify(newUser));

    // O cadastro é autoritativo no backend: sem resposta válida não há sessão
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: pass,
          role: 'condomino',
          cpf: newUser.cpf,
          telefone: newUser.telefone,
          unidade: newUser.unidade,
          bloco: newUser.bloco,
        }),
      });
      const data = await res.json().catch(() => null as any);
      if (!res.ok || !data?.success) {
        setUsersList((prev) => prev.filter((u) => u.id !== newUser.id));
        setUser(null);
        localStorage.removeItem('locadoc_auth_user');
        return { success: false, error: data?.error || 'Não foi possível concluir o cadastro.' };
      }
      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setShowAuthModal(false);
      }
      // O id definitivo é o do servidor (fonte da verdade)
      if (data.user) {
        const created = stripPassword(asMasterIfMasterEmail(data.user));
        setUsersList((prev) => [...prev.filter((u) => u.id !== newUser.id), created]);
        setUser(created);
        localStorage.setItem('locadoc_auth_user', JSON.stringify(created));
      }
    } catch (e) {
      console.warn('Erro ao cadastrar no backend:', e);
      setUsersList((prev) => prev.filter((u) => u.id !== newUser.id));
      setUser(null);
      localStorage.removeItem('locadoc_auth_user');
      return { success: false, error: 'Não foi possível conectar ao servidor para concluir o cadastro.' };
    }

    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', newUser.id), {
        uid: newUser.id,
        displayName: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        creci: newUser.creci || '',
        telefone: newUser.telefone || '',
        unidade: newUser.unidade || '',
        bloco: newUser.bloco || '',
        cpf: newUser.cpf || '',
        createdAt: newUser.createdAt,
      });
    } catch (e) {
      console.warn('Erro ao salvar no Firestore:', e);
    }

    return {
      success: true,
      error: 'Cadastro de condômino realizado com sucesso! Bem-vindo ao sistema.',
    };
  };

  // Add User by Admin/Superadmin
  const addUser = async (
    name: string,
    email: string,
    pass: string,
    role: UserRole,
    creci?: string,
    telefone?: string,
    unidade?: string,
    bloco?: string,
    cpf?: string
  ): Promise<LoginResult> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // Permission enforcement:
    // Only superadmin (Iluminatto) can add new admins
    if (role === 'admin' && user.role !== 'superadmin') {
      return {
        success: false,
        error: 'Apenas o Administrador Principal (Iluminatto Moraes) pode criar novos Administradores.',
      };
    }

    // Admins and Superadmins can add condominos and clients
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return { success: false, error: 'Você não tem permissão para cadastrar usuários.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (usersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Já existe um usuário com este e-mail.' };
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role,
      status: 'aprovado', // Created by admin is auto-approved
      creci: creci?.trim(),
      telefone: telefone?.trim(),
      unidade: unidade?.trim(),
      bloco: bloco?.trim(),
      cpf: cpf?.trim(),
      createdAt: new Date().toISOString(),
      createdBy: user.name,
    };

    setUsersList((prev) => [...prev, newUser]);

    // Sync to backend /api/users
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: pass,
          role: newUser.role,
          cpf: newUser.cpf,
          telefone: newUser.telefone,
          unidade: newUser.unidade,
          bloco: newUser.bloco,
          creci: newUser.creci,
        }),
      });
      const data = await res.json().catch(() => null as any);
      if (!res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== newUser.id));
        return { success: false, error: data?.error || 'Falha ao cadastrar usuário no servidor.' };
      }
      // Substitui o registro local pelo registro oficial do servidor (id definitivo)
      if (data?.user) {
        const created = stripPassword(asMasterIfMasterEmail(data.user));
        setUsersList((prev) => [...prev.filter((u) => u.id !== newUser.id), created]);
        await refreshUsers();
      }
    } catch (e) {
      console.warn('Erro ao sincronizar com backend:', e);
      setUsersList((prev) => prev.filter((u) => u.id !== newUser.id));
      return { success: false, error: 'Não foi possível conectar ao servidor para cadastrar o usuário.' };
    }

    try {
      await setDoc(doc(db, 'users', newUser.id), {
        uid: newUser.id,
        displayName: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        creci: newUser.creci || '',
        telefone: newUser.telefone || '',
        unidade: newUser.unidade || '',
        bloco: newUser.bloco || '',
        cpf: newUser.cpf || '',
        createdAt: newUser.createdAt,
        createdBy: user.name,
      });
    } catch (e) {
      console.warn('Erro ao salvar no Firestore:', e);
    }

    return { success: true };
  };

  // Approve or toggle user status
  const approveUser = async (userId: string, newStatus: 'aprovado' | 'bloqueado' | 'pendente') => {
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
      console.warn('Sem permissão para aprovar usuários.');
      return;
    }

    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );

    try {
      await setDoc(
        doc(db, 'users', userId),
        { status: newStatus, approvedBy: user.name, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {
      console.warn('Erro ao atualizar status no Firestore:', e);
    }

    // Sync status to backend /api/users/:id/status
    try {
      const res = await apiFetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        console.warn('Backend recusou a alteração de status:', res.status);
      } else {
        await refreshUsers();
      }
    } catch (e) {
      console.warn('Erro ao sincronizar status com backend:', e);
    }
  };

  // Update user (full CRUD — name, email, password, role, contact info)
  const updateUser = async (
    userId: string,
    changes: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      creci?: string;
      telefone?: string;
      unidade?: string;
      bloco?: string;
      cpf?: string;
    }
  ): Promise<LoginResult> => {
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
      return { success: false, error: 'Você não tem permissão para editar usuários.' };
    }

    const target = usersList.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    if (target.id === MASTER_USER.id || target.email.toLowerCase() === 'iluminatto@gmail.com') {
      return { success: false, error: 'O Administrador Principal (Iluminatto Moraes) não pode ser editado.' };
    }

    // Only the superadmin can edit other Administrators
    if (target.role === 'admin' && user.role !== 'superadmin') {
      return { success: false, error: 'Apenas o Administrador Principal pode editar outros Administradores.' };
    }

    const nextRole = changes.role || target.role;
    if (nextRole === 'superadmin') {
      return { success: false, error: 'O cargo de Super Administrador é exclusivo do Administrador Principal.' };
    }
    // Only the superadmin can promote users to admin or demote admins
    if ((nextRole === 'admin' || target.role === 'admin') && user.role !== 'superadmin') {
      return { success: false, error: 'Apenas o Administrador Principal pode promover ou rebaixar Administradores.' };
    }

    const cleanEmail = changes.email ? changes.email.trim().toLowerCase() : target.email;
    if (usersList.some((u) => u.id !== userId && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Já existe um usuário com este e-mail.' };
    }

    const updatedUser: UserAccount = {
      ...target,
      name: changes.name ? changes.name.trim() : target.name,
      email: cleanEmail,
      role: nextRole,
      creci: changes.creci !== undefined ? changes.creci.trim() : target.creci,
      telefone: changes.telefone !== undefined ? changes.telefone.trim() : target.telefone,
      unidade: changes.unidade !== undefined ? changes.unidade.trim() : target.unidade,
      bloco: changes.bloco !== undefined ? changes.bloco.trim() : target.bloco,
      cpf: changes.cpf !== undefined ? changes.cpf.trim() : target.cpf,
      updatedAt: new Date().toISOString(),
      updatedBy: user.name,
    };

    setUsersList((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));

    // Sync to backend /api/users/:id
    try {
      const res = await apiFetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedUser.name,
          email: updatedUser.email,
          password: changes.password || undefined,
          role: updatedUser.role,
          cpf: updatedUser.cpf,
          telefone: updatedUser.telefone,
          unidade: updatedUser.unidade,
          bloco: updatedUser.bloco,
          creci: updatedUser.creci,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null as any);
        return { success: false, error: data?.error || 'Falha ao salvar as alterações no servidor.' };
      }
      await refreshUsers();
    } catch (e) {
      console.warn('Erro ao sincronizar edição com backend:', e);
      return { success: false, error: 'Não foi possível conectar ao servidor para salvar as alterações.' };
    }

    try {
      await setDoc(
        doc(db, 'users', userId),
        {
          displayName: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          creci: updatedUser.creci || '',
          telefone: updatedUser.telefone || '',
          unidade: updatedUser.unidade || '',
          bloco: updatedUser.bloco || '',
          cpf: updatedUser.cpf || '',
          updatedAt: updatedUser.updatedAt,
          updatedBy: user.name,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Erro ao salvar edição no Firestore:', e);
    }

    return { success: true };
  };

  // Delete user
  const deleteUser = async (userId: string): Promise<boolean> => {
    const target = usersList.find((u) => u.id === userId);
    if (!target) return false;

    if (target.id === MASTER_USER.id || target.email.toLowerCase() === 'iluminatto@gmail.com') {
      console.warn('O Administrador Principal (Iluminatto Moraes) não pode ser excluído.');
      return false;
    }

    if (target.role === 'admin' && user?.role !== 'superadmin') {
      console.warn('Apenas o Administrador Principal pode excluir outros Administradores.');
      return false;
    }

    // Exclusão é autoritativa no backend: se falhar, nada é removido localmente
    if (user) {
      try {
        const res = await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (!res.ok) {
          console.warn('Backend recusou a exclusão do usuário:', res.status);
          return false;
        }
      } catch (e) {
        console.warn('Erro ao sincronizar exclusão com backend:', e);
        return false;
      }
    }

    setUsersList((prev) => prev.filter((u) => u.id !== userId));
    await refreshUsers();

    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      console.warn('Erro ao excluir do Firestore:', e);
    }

    return true;
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.error(e);
    }

    // Revoga a sessão no servidor antes de limpar o cliente
    try {
      if (getAuthToken()) await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' });
    } catch (e) {
      console.warn('Não foi possível revogar a sessão no servidor:', e);
    }
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setShowAuthModal(true);
  };

  const canAddAdmins = user?.role === 'superadmin';
  const canAddClients = user?.role === 'superadmin' || user?.role === 'admin';
  const canApproveUsers = user?.role === 'superadmin' || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        usersList,
        login,
        register,
        addUser,
        approveUser,
        updateUser,
        deleteUser,
        signInWithGoogle,
        logout,
        showAuthModal,
        setShowAuthModal,
        isLoadingAuth,
        canAddAdmins,
        canAddClients,
        canApproveUsers,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
