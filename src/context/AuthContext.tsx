import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types/contract';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  usersList: UserAccount[];
  login: (emailOrUser: string, pass: string) => LoginResult;
  register: (name: string, email: string, pass: string, creci?: string, telefone?: string, unidade?: string, bloco?: string, cpf?: string) => Promise<LoginResult>;
  addUser: (name: string, email: string, pass: string, role: UserRole, creci?: string, telefone?: string, unidade?: string, bloco?: string, cpf?: string) => Promise<LoginResult>;
  approveUser: (userId: string, newStatus: 'aprovado' | 'bloqueado' | 'pendente') => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
  isLoadingAuth: boolean;
  canAddAdmins: boolean;
  canAddClients: boolean;
  canApproveUsers: boolean;
}

// Master Superadmin user: Iluminatto Moraes
export const MASTER_USER: UserAccount = {
  id: 'usr-master-iluminatto',
  name: 'Iluminatto Moraes',
  email: 'iluminatto@gmail.com',
  role: 'superadmin',
  status: 'aprovado',
  password: '@Vito4747',
  creci: 'Super Administrador',
  createdAt: '2026-01-01T00:00:00.000Z',
};

// Helper to check and eliminate any stale references to Roberto Magalhães
const isRobertoReference = (str?: string): boolean => {
  if (!str) return false;
  const s = str.toLowerCase();
  return s.includes('roberto') || s.includes('magalh');
};

const sanitizeUser = (raw: any): UserAccount => {
  if (!raw || typeof raw !== 'object' || isRobertoReference(raw.name) || isRobertoReference(raw.email)) {
    return MASTER_USER;
  }
  return raw as UserAccount;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge any stale traces of Roberto immediately from localStorage on component mount
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('locadoc_auth_user');
      if (saved) {
        if (isRobertoReference(saved)) {
          localStorage.setItem('locadoc_auth_user', JSON.stringify(MASTER_USER));
          return MASTER_USER;
        }
        const parsed = JSON.parse(saved);
        if (parsed && !isRobertoReference(parsed.name) && !isRobertoReference(parsed.email)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    // Default logged-in user is Master Admin Iluminatto Moraes
    localStorage.setItem('locadoc_auth_user', JSON.stringify(MASTER_USER));
    return MASTER_USER;
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
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
          if (!cleanList.some((u) => u.email.toLowerCase() === 'iluminatto@gmail.com')) {
            cleanList.unshift(MASTER_USER);
          }
          localStorage.setItem('locadoc_users_db', JSON.stringify(cleanList));
          return cleanList;
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
    const cleanList = usersList.filter(
      (u) => !isRobertoReference(u.name) && !isRobertoReference(u.email)
    );
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

            remoteUsers.push({
              id: d.id,
              name: dName || 'Usuário',
              email: dEmail,
              role: (data.role as UserRole) || 'cliente',
              status: data.status || 'aprovado',
              password: data.password || '',
              creci: data.creci,
              telefone: data.telefone,
              createdAt: data.createdAt,
              createdBy: data.createdBy,
            });
          }

          // Ensure master Iluminatto Moraes is always the primary user
          if (!remoteUsers.some((u) => u.email.toLowerCase() === 'iluminatto@gmail.com')) {
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
            password: MASTER_USER.password,
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
        const fbEmail = fbUser.email?.toLowerCase() || '';
        const isMaster = fbEmail === 'iluminatto@gmail.com';

        // Check if user already exists in usersList
        const existing = usersList.find((u) => u.email.toLowerCase() === fbEmail);

        const currentRole: UserRole = isMaster ? 'superadmin' : existing?.role || 'cliente';
        const currentStatus = isMaster ? 'aprovado' : existing?.status || 'aprovado';

        const userObj: UserAccount = {
          id: fbUser.uid,
          name: isMaster ? 'Iluminatto Moraes' : fbUser.displayName || existing?.name || fbEmail.split('@')[0],
          email: fbEmail,
          role: currentRole,
          status: currentStatus,
          creci: existing?.creci || (isMaster ? 'Super Administrador' : undefined),
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
        // Fallback to active master Iluminatto Moraes
        const saved = localStorage.getItem('locadoc_auth_user');
        if (saved && !isRobertoReference(saved)) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            setUser(MASTER_USER);
            localStorage.setItem('locadoc_auth_user', JSON.stringify(MASTER_USER));
          }
        } else {
          setUser(MASTER_USER);
          localStorage.setItem('locadoc_auth_user', JSON.stringify(MASTER_USER));
        }
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [usersList]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (error: any) {
      console.error('Erro no Google Sign-In:', error);
      throw error;
    }
  };

  const login = (emailOrUser: string, pass: string): LoginResult => {
    const cleanInput = emailOrUser.trim().toLowerCase();

    // Check Master login directly (accepts 'iluminatto' or 'iluminatto@gmail.com')
    if (
      (cleanInput === 'iluminatto' || cleanInput === 'iluminatto@gmail.com') &&
      pass === '@Vito4747'
    ) {
      setUser(MASTER_USER);
      localStorage.setItem('locadoc_auth_user', JSON.stringify(MASTER_USER));
      setShowAuthModal(false);
      return { success: true };
    }

    // Check across registered users
    const found = usersList.find(
      (u) =>
        (u.email.toLowerCase() === cleanInput ||
          u.name.toLowerCase() === cleanInput ||
          u.email.split('@')[0].toLowerCase() === cleanInput) &&
        u.password === pass
    );

    if (found) {
      if (found.status === 'pendente') {
        return {
          success: false,
          error: 'Esta conta está pendente de aprovação por um Administrador.',
        };
      }
      if (found.status === 'bloqueado') {
        return {
          success: false,
          error: 'Esta conta foi desativada temporariamente pelo Administrador.',
        };
      }

      setUser(found);
      localStorage.setItem('locadoc_auth_user', JSON.stringify(found));
      setShowAuthModal(false);
      return { success: true };
    }

    return {
      success: false,
      error: 'E-mail/usuário ou senha incorretos.',
    };
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
      status: 'aprovado', // Auto-approved for instant testing / access
      password: pass,
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

    // Sync to backend /api/auth/register
    try {
      await fetch('/api/auth/register', {
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
    } catch (e) {
      console.warn('Erro ao sincronizar com backend:', e);
    }

    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', newUser.id), {
        uid: newUser.id,
        displayName: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        password: newUser.password,
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
      password: pass,
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
      await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email,
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
    } catch (e) {
      console.warn('Erro ao sincronizar com backend:', e);
    }

    try {
      await setDoc(doc(db, 'users', newUser.id), {
        uid: newUser.id,
        displayName: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        password: newUser.password,
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
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    const target = usersList.find((u) => u.id === userId);
    if (!target) return;

    if (target.id === MASTER_USER.id || target.email.toLowerCase() === 'iluminatto@gmail.com') {
      console.warn('O Administrador Principal (Iluminatto Moraes) não pode ser excluído.');
      return;
    }

    if (target.role === 'admin' && user?.role !== 'superadmin') {
      console.warn('Apenas o Administrador Principal pode excluir outros Administradores.');
      return;
    }

    setUsersList((prev) => prev.filter((u) => u.id !== userId));

    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      console.warn('Erro ao excluir do Firestore:', e);
    }
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    localStorage.removeItem('locadoc_auth_user');
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
        deleteUser,
        signInWithGoogle,
        logout,
        showAuthModal,
        setShowAuthModal,
        isLoadingAuth,
        canAddAdmins,
        canAddClients,
        canApproveUsers,
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
