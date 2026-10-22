import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { Navbar, AppTab } from './components/Navbar';
import { DocumentUploader } from './components/DocumentUploader';
import { ContractViewer } from './components/ContractViewer';
import { ContractEditor } from './components/ContractEditor';
import { InventarioManager } from './components/InventarioManager';
import { ShaAuditor } from './components/ShaAuditor';
import { ContractHistory } from './components/ContractHistory';
import { PublicMobileView } from './components/PublicMobileView';
import { ImoveisManager, DEFAULT_IMOVEIS } from './components/ImoveisManager';
import { TemporadaManager, DEFAULT_TEMPORADA_IMOVEIS } from './components/TemporadaManager';
import { UserManager } from './components/UserManager';
import { ApiGeminiManager } from './components/ApiGeminiManager';
import { SaasManager } from './components/SaasManager';
import { MinutasManager } from './components/MinutasManager';
import { CobrancasManager } from './components/CobrancasManager';
import { DashboardOverview } from './components/DashboardOverview';
import { ContractData, InventarioItem, ImovelData, ImovelTemporadaData, ContractOperationType, ContractTemplate } from './types/contract';
import { getSampleContract, getEmptyContract, numeroPorExtensoReais } from './utils/defaults';
import { getSavedTemplates, interpolateTemplate } from './utils/templates';
import { db } from './lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, Lock, Shield } from 'lucide-react';

function MainApp() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  const [contracts, setContracts] = useState<ContractData[]>(() => {
    const saved = localStorage.getItem('locadoc_contracts_db');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: ContractData) => {
            if (
              c.locador?.nome?.toLowerCase().includes('roberto') ||
              c.locador?.nome?.toLowerCase().includes('magalh') ||
              c.locador?.nome?.toLowerCase().includes('carlos')
            ) {
              return {
                ...c,
                locador: {
                  ...c.locador,
                  nome: 'Iluminatto Moraes',
                  email: 'iluminatto@gmail.com',
                },
                vistoLocador: 'Iluminatto Moraes',
              };
            }
            return c;
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [getSampleContract()];
  });

  const [activeContractId, setActiveContractId] = useState<string>(() => {
    const savedId = localStorage.getItem('locadoc_active_id');
    return savedId || 'contrato-demo-01';
  });

  // Start application on Dashboard tab
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  const [imoveis, setImoveis] = useState<ImovelData[]>(() => {
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

  const [temporadaImoveis, setTemporadaImoveis] = useState<ImovelTemporadaData[]>(() => {
    const saved = localStorage.getItem('locadoc_temporada_imoveis');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_TEMPORADA_IMOVEIS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [publicViewContract, setPublicViewContract] = useState<ContractData | null>(null);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);

  // Global startup sanitizer: permanently purge any stale "Roberto Magalhães" from localStorage
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('locadoc_') || key.includes('contract'))) {
          const val = localStorage.getItem(key);
          if (
            val &&
            (val.toLowerCase().includes('roberto') ||
              val.toLowerCase().includes('magalh') ||
              val.toLowerCase().includes('carlos eduardo'))
          ) {
            const cleanVal = val
              .replace(/Roberto\s+Magalh[ãa]es/gi, 'Iluminatto Moraes')
              .replace(/Carlos\s+Eduardo\s+Silveira/gi, 'Iluminatto Moraes')
              .replace(/Carlos\s+E\.\s+Silveira/gi, 'Iluminatto Moraes');
            localStorage.setItem(key, cleanVal);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Check URL parameters on mount for public QR Code access (?view=public&id=share-xxx)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const viewParam = searchParams.get('view');
    const shareId = searchParams.get('id') || searchParams.get('share');

    if (viewParam === 'public' && shareId) {
      // First check local storage
      const cached = localStorage.getItem(`locadoc_public_${shareId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setPublicViewContract(parsed);
          return;
        } catch (e) {
          console.error(e);
        }
      }

      // Query Firestore public_contracts
      const fetchPublicDoc = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'public_contracts', shareId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.contractData) {
              setPublicViewContract(data.contractData as ContractData);
            }
          }
        } catch (err) {
          console.warn('Erro ao carregar documento público do Firestore:', err);
        }
      };

      fetchPublicDoc();
    }
  }, []);

  // Sync with Firestore when user is authenticated
  useEffect(() => {
    if (!user?.id) return;

    const loadUserContractsFromFirestore = async () => {
      setIsSyncingFirestore(true);
      try {
        const q = query(collection(db, 'contracts'), where('userId', '==', user.id));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const remoteContracts: ContractData[] = [];
          querySnapshot.forEach((docSnap) => {
            remoteContracts.push(docSnap.data() as ContractData);
          });
          
          if (remoteContracts.length > 0) {
            setContracts((prev) => {
              const remoteIds = new Set(remoteContracts.map((c) => c.id));
              const merged = [...remoteContracts, ...prev.filter((c) => !remoteIds.has(c.id))];
              return merged;
            });
          }
        } else {
          // Seed initial contract for this user in Firestore
          const initial = contracts[0] || getSampleContract();
          await setDoc(doc(db, 'contracts', initial.id), {
            ...initial,
            userId: user.id,
          });
        }
      } catch (err) {
        console.warn('Sincronização Firestore (modo local ativo):', err);
      } finally {
        setIsSyncingFirestore(false);
      }
    };

    loadUserContractsFromFirestore();
  }, [user?.id]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('locadoc_contracts_db', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('locadoc_active_id', activeContractId);
  }, [activeContractId]);

  // Strict LGPD Data Isolation:
  // Superadmin / Admin: sees all contracts.
  // Condômino / Cliente: sees ONLY their own contracts (userId, locatario email, or locatario CPF)!
  const visibleContracts = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'superadmin' || user.role === 'admin') {
      return contracts;
    }
    const userEmail = user.email?.trim().toLowerCase();
    const userCpfClean = user.cpf ? user.cpf.replace(/\D/g, '') : '';

    return contracts.filter((c) => {
      const isOwner = c.userId === user.id;
      const isTenantEmail = c.locatario?.email && c.locatario.email.trim().toLowerCase() === userEmail;
      const tenantCpfClean = c.locatario?.cpf ? c.locatario.cpf.replace(/\D/g, '') : '';
      const isTenantCpf = Boolean(userCpfClean && tenantCpfClean && userCpfClean === tenantCpfClean);

      return isOwner || isTenantEmail || isTenantCpf;
    });
  }, [contracts, user]);

  const visibleImoveis = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'superadmin' || user.role === 'admin') {
      return imoveis;
    }
    const myImovelIds = new Set(visibleContracts.map((c) => c.imovelId).filter(Boolean));
    return imoveis.filter((i) => myImovelIds.has(i.id) || i.userId === user.id);
  }, [imoveis, visibleContracts, user]);

  const activeContract = visibleContracts.find((c) => c.id === activeContractId) 
    || visibleContracts[0] 
    || (user?.role === 'condomino' || user?.role === 'cliente' ? null : getSampleContract())
    || getSampleContract();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const persistToFirestore = async (contract: ContractData) => {
    if (!user?.id) return;
    try {
      await setDoc(
        doc(db, 'contracts', contract.id),
        {
          ...contract,
          userId: user.id,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Erro ao salvar no Firestore:', err);
    }
  };

  const handleContractGenerated = async (newContract: ContractData) => {
    if (user?.role === 'cliente') {
      showToast('Acesso negado: Inquilinos não têm permissão para gerar novos contratos.');
      return;
    }
    const withUser = { ...newContract, userId: user?.id || 'usr-master-iluminatto' };
    setContracts((prev) => [withUser, ...prev.filter((c) => c.id !== withUser.id)]);
    setActiveContractId(withUser.id);
    setActiveTab('visualizador');
    showToast('Contrato e ANEXO I gerados com sucesso!');
    await persistToFirestore(withUser);
  };

  const handleUpdateCurrentContract = async (updated: ContractData) => {
    let finalContract = updated;
    if (user?.role === 'cliente') {
      // Security & LGPD: Inquilino cannot modify financial, guarantee, property or landlord data!
      const current = contracts.find((c) => c.id === updated.id);
      if (current) {
        finalContract = {
          ...current,
          locatario: { ...updated.locatario },
          vistoLocatario: updated.locatario.nome || current.vistoLocatario,
          updatedAt: new Date().toISOString(),
        };
      }
      showToast('Seus dados cadastrais foram atualizados com sucesso!');
    } else {
      showToast('Contrato atualizado com sucesso!');
    }
    const withUser = { ...finalContract, userId: user?.id || finalContract.userId || 'usr-master-iluminatto' };
    setContracts((prev) => prev.map((c) => (c.id === withUser.id ? withUser : c)));
    await persistToFirestore(withUser);
  };

  const handleUpdateInventario = async (newItems: InventarioItem[]) => {
    if (user?.role === 'cliente') {
      showToast('Acesso restrito: Inquilinos podem apenas conferir o inventário e assinar o visto de recebimento.');
      return;
    }
    const updated = {
      ...activeContract,
      inventario: newItems,
      updatedAt: new Date().toISOString(),
    };
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    await persistToFirestore(updated);
  };

  const handleUpdateVistos = async (vistoLocador: string, vistoLocatario: string) => {
    const updated = {
      ...activeContract,
      vistoLocador: user?.role === 'cliente' ? activeContract.vistoLocador : vistoLocador,
      vistoLocatario,
      updatedAt: new Date().toISOString(),
    };
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    await persistToFirestore(updated);
  };

  const handleApplyHash = async (hash: string) => {
    if (user?.role === 'cliente') {
      showToast('Acesso negado: O hash criptográfico de blindagem é gerado e homologado pelo Locador/Administrador.');
      return;
    }
    const updated = {
      ...activeContract,
      vistoriaDigital: {
        ...activeContract.vistoriaDigital,
        hashSha256: hash,
      },
      updatedAt: new Date().toISOString(),
    };
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    showToast('Hash criptográfico vinculado à Cláusula 5.2 do contrato!');
    setActiveTab('visualizador');
    await persistToFirestore(updated);
  };

  const handleNewBlankContract = async () => {
    if (user?.role === 'cliente') {
      showToast('Acesso negado: Inquilinos não têm permissão para criar novos contratos.');
      return;
    }
    const blank = getEmptyContract();
    const withUser = { ...blank, userId: user?.id || 'usr-master-iluminatto' };
    setContracts((prev) => [withUser, ...prev]);
    setActiveContractId(withUser.id);
    setActiveTab('editor');
    showToast('Novo contrato iniciado para preenchimento manual!');
    await persistToFirestore(withUser);
  };

  const handleDeleteContract = async (id: string) => {
    if (user?.role === 'cliente') {
      showToast('Acesso negado (LGPD/Segurança): Inquilinos não têm permissão para excluir contratos.');
      return;
    }
    const remaining = contracts.filter((c) => c.id !== id);
    if (remaining.length > 0) {
      setContracts(remaining);
      setActiveContractId(remaining[0].id);
      showToast('Contrato excluído.');
    }
    if (user?.id) {
      try {
        await deleteDoc(doc(db, 'contracts', id));
      } catch (err) {
        console.warn('Erro ao deletar do Firestore:', err);
      }
    }
  };

  const handleDuplicateContract = async (source: ContractData) => {
    if (user?.role === 'cliente') {
      showToast('Acesso negado: Inquilinos não têm permissão para duplicar contratos.');
      return;
    }
    const copy: ContractData = {
      ...source,
      id: `contrato-${Date.now()}`,
      userId: user?.id || source.userId || 'usr-master-iluminatto',
      titulo: `${source.titulo} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'rascunho',
    };
    setContracts((prev) => [copy, ...prev]);
    setActiveContractId(copy.id);
    setActiveTab('editor');
    showToast('Contrato duplicado com sucesso!');
    await persistToFirestore(copy);
  };

  // Generate contract directly from registered property (per-property contract and template)
  const handleGenerateContractForImovel = async (imovel: ImovelData, forceOperacao?: ContractOperationType) => {
    const base = getEmptyContract();
    const isVenda = forceOperacao === 'venda_imovel' || (!forceOperacao && imovel.finalidade === 'venda');
    const operacao: ContractOperationType = isVenda 
      ? 'venda_imovel' 
      : imovel.finalidade === 'temporada' 
      ? 'temporada' 
      : 'aluguel_residencial';

    const valorVenda = imovel.valorVendaSugerido || 500000;
    const valorAluguel = imovel.valorAluguelSugerido || 3000;
    const sinalEntrada = Math.round(valorVenda * 0.2);

    let initialContract: ContractData = {
      ...base,
      id: `contrato-${Date.now()}`,
      imovelId: imovel.id,
      operacao,
      titulo: isVenda ? `Contrato de Compra e Venda - ${imovel.titulo}` : `Contrato de Locação - ${imovel.titulo}`,
      userId: user?.id || 'usr-master-iluminatto',
      objeto: {
        endereco: imovel.endereco,
        compostos: imovel.compostos + (imovel.vagaGaragem ? ` | Garagem: ${imovel.vagaGaragem}` : ''),
      },
      valores: {
        ...base.valores,
        aluguel: valorAluguel,
        aluguelExtenso: numeroPorExtensoReais(valorAluguel),
      },
      garantia: {
        ...base.garantia,
        caucaoValor: valorAluguel * 3,
        caucaoValorExtenso: numeroPorExtensoReais(valorAluguel * 3),
      },
      vendaInfo: isVenda ? {
        valorVenda,
        valorVendaExtenso: numeroPorExtensoReais(valorVenda),
        sinalEntrada,
        sinalEntradaExtenso: numeroPorExtensoReais(sinalEntrada),
        saldoFinanciamento: valorVenda - sinalEntrada,
        saldoRestante: valorVenda - sinalEntrada,
        condicoesPagamento: 'Sinal de 20% pago na assinatura do compromisso e saldo financiado pelo SFH ou quitado na escritura definitiva.',
        matriculaImovel: imovel.matriculaCartorio || '',
        cartorioRegistro: imovel.cartorioNome || 'Ofício de Registro de Imóveis Competente',
        dataPosse: 'Imissão de posse definitiva após a quitação integral do saldo do preço.',
      } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'rascunho',
    };

    // Obter modelo exclusivo deste imóvel ou minuta personalizada própria do imóvel
    const templates = getSavedTemplates();
    let templateTextToUse = '';
    
    if (imovel.minutaPersonalizadaImovel && imovel.minutaPersonalizadaImovel.trim().length > 20) {
      // O imóvel possui seu próprio texto/minuta exclusivo!
      templateTextToUse = imovel.minutaPersonalizadaImovel;
    } else if (imovel.modeloContratoPadraoId) {
      const found = templates.find((t) => t.id === imovel.modeloContratoPadraoId);
      if (found) {
        templateTextToUse = found.conteudoTexto;
      }
    }

    if (!templateTextToUse) {
      // Fallback para template de venda ou residencial
      const defaultId = isVenda ? 'tpl-compra-venda' : 'tpl-locacao-residencial';
      const foundDef = templates.find((t) => t.id === defaultId) || templates[0];
      if (foundDef) templateTextToUse = foundDef.conteudoTexto;
    }

    if (templateTextToUse) {
      const filledText = interpolateTemplate(templateTextToUse, initialContract);
      initialContract.textoPersonalizado = filledText;
      initialContract.usarTextoPersonalizado = true;
    }

    setContracts((prev) => [initialContract, ...prev]);
    setActiveContractId(initialContract.id);
    setActiveTab('editor');
    showToast(`Contrato com minuta própria gerado para "${imovel.titulo}"!`);
    await persistToFirestore(initialContract);
  };

  const handleContractGeneratedFromTemporada = async (shortTermContract: ContractData) => {
    setContracts((prev) => [shortTermContract, ...prev.filter((c) => c.id !== shortTermContract.id)]);
    setActiveContractId(shortTermContract.id);
    showToast('Contrato de Temporada & Voucher de Acesso emitidos com sucesso!');
    await persistToFirestore(shortTermContract);
  };

  const handleGenerateContractWithTemplate = async (template: ContractTemplate, imovel?: ImovelData) => {
    const base = getEmptyContract();
    const isVenda = template.categoria === 'venda_imovel' || (imovel && imovel.finalidade === 'venda');
    const isTemporada = template.categoria === 'temporada' || (imovel && imovel.finalidade === 'temporada');
    const operacao: ContractOperationType = isVenda
      ? 'venda_imovel'
      : isTemporada
      ? 'temporada'
      : 'aluguel_residencial';

    const valorVenda = imovel?.valorVendaSugerido || 500000;
    const valorAluguel = imovel?.valorAluguelSugerido || 3000;
    const sinalEntrada = Math.round(valorVenda * 0.2);

    const newContract: ContractData = {
      ...base,
      id: `contrato-${Date.now()}`,
      imovelId: imovel?.id,
      operacao,
      templateId: template.id,
      titulo: imovel ? `${template.titulo} - ${imovel.titulo}` : template.titulo,
      userId: user?.id || 'usr-master-iluminatto',
      objeto: imovel ? {
        endereco: imovel.endereco,
        compostos: imovel.compostos + (imovel.vagaGaragem ? ` | Garagem: ${imovel.vagaGaragem}` : ''),
      } : base.objeto,
      valores: {
        ...base.valores,
        aluguel: valorAluguel,
        aluguelExtenso: numeroPorExtensoReais(valorAluguel),
      },
      garantia: {
        ...base.garantia,
        caucaoValor: valorAluguel * 3,
        caucaoValorExtenso: numeroPorExtensoReais(valorAluguel * 3),
      },
      vendaInfo: isVenda ? {
        valorVenda,
        valorVendaExtenso: numeroPorExtensoReais(valorVenda),
        sinalEntrada,
        sinalEntradaExtenso: numeroPorExtensoReais(sinalEntrada),
        saldoFinanciamento: valorVenda - sinalEntrada,
        saldoRestante: valorVenda - sinalEntrada,
        condicoesPagamento: 'Sinal de 20% na assinatura e saldo financiado pelo SFH ou quitado na escritura definitiva.',
        matriculaImovel: imovel?.matriculaCartorio || '',
        cartorioRegistro: imovel?.cartorioNome || 'Ofício de Registro de Imóveis Competente',
        dataPosse: 'Imissão de posse definitiva após a quitação integral do saldo do preço.',
      } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'rascunho',
    };

    const filledText = interpolateTemplate(template.conteudoTexto, newContract);
    newContract.textoPersonalizado = filledText;
    newContract.usarTextoPersonalizado = true;

    setContracts((prev) => [newContract, ...prev]);
    setActiveContractId(newContract.id);
    setActiveTab('editor');
    showToast(`Contrato gerado com a minuta "${template.titulo}"!`);
    await persistToFirestore(newContract);
  };

  const handleLinkTemplateToImovel = async (templateId: string, imovelId: string) => {
    setImoveis((prev) => {
      const updated = prev.map((im) => {
        if (im.id === imovelId) {
          return { ...im, modeloContratoPadraoId: templateId };
        }
        return im;
      });
      localStorage.setItem('locadoc_imoveis_db', JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'imoveis', imovelId), { modeloContratoPadraoId: templateId }, { merge: true });
    } catch (e) {
      console.warn('Erro ao sincronizar minuta com Firestore:', e);
    }

    showToast('Minuta vinculada com sucesso a este imóvel!');
  };

  // If in public view mode (e.g. opened via QR Code scan on mobile)
  if (publicViewContract) {
    return (
      <PublicMobileView
        contract={publicViewContract}
        onBackToApp={() => {
          setPublicViewContract(null);
          if (window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  // Auth Protection: "nao se deve poder criar nada sem estar logado"
  if (!isAuthenticated && !isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveContract={!!activeContract}
      />

      <AuthModal />

      {/* Main Content Area */}
      <main className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
        {/* Toast feedback */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-3 no-print">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* View Switcher */}
        {activeTab === 'dashboard' && (
          <DashboardOverview
            contracts={visibleContracts}
            imoveis={visibleImoveis}
            temporadaImoveis={temporadaImoveis}
            onSelectContract={(c) => {
              setActiveContractId(c.id);
              setActiveTab('visualizador');
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onNewContract={() => {
              if (user?.role === 'cliente' || user?.role === 'condomino') {
                showToast('Acesso restrito: Condôminos não têm permissão para criar novos contratos.');
                return;
              }
              handleNewBlankContract();
            }}
            onNewImovel={() => setActiveTab('imoveis')}
            onUpdateContract={handleUpdateCurrentContract}
          />
        )}

        {activeTab === 'imoveis' && (
          <ImoveisManager
            imoveisList={visibleImoveis}
            onGenerateContractForImovel={handleGenerateContractForImovel}
            onViewContractRequested={() => setActiveTab('visualizador')}
            onNavigateToMinutas={() => setActiveTab('minutas')}
          />
        )}

        {activeTab === 'minutas' && (
          <MinutasManager
            imoveis={visibleImoveis}
            onGenerateContractWithTemplate={handleGenerateContractWithTemplate}
            onLinkTemplateToImovel={handleLinkTemplateToImovel}
          />
        )}

        {activeTab === 'cobrancas' && (
          <CobrancasManager
            contracts={visibleContracts}
            onOpenContract={(contractId) => {
              setActiveContractId(contractId);
              setActiveTab('visualizador');
            }}
          />
        )}

        {activeTab === 'temporada' && (
          <TemporadaManager
            onContractGeneratedFromTemporada={handleContractGeneratedFromTemporada}
            onOpenContractViewer={(contractId) => {
              setActiveContractId(contractId);
              setActiveTab('visualizador');
            }}
          />
        )}

        {activeTab === 'editor' && (
          <ContractEditor
            contract={activeContract}
            onSave={handleUpdateCurrentContract}
            onPreviewRequested={() => setActiveTab('visualizador')}
            onOpenSettings={() => setActiveTab('api_gemini')}
          />
        )}

        {activeTab === 'gerador' && (
          <DocumentUploader
            onContractGenerated={handleContractGenerated}
            currentContract={activeContract}
            onOpenSettings={() => setActiveTab('api_gemini')}
          />
        )}

        {activeTab === 'visualizador' && (
          <ContractViewer
            contract={activeContract}
            onEditRequested={() => setActiveTab('editor')}
            onUpdateContract={handleUpdateCurrentContract}
            onOpenPublicView={(c) => setPublicViewContract(c)}
          />
        )}

        {activeTab === 'inventario' && (
          <InventarioManager
            contract={activeContract}
            onUpdateInventario={handleUpdateInventario}
            onUpdateVistos={handleUpdateVistos}
          />
        )}

        {activeTab === 'auditoria' && (
          <ShaAuditor
            contract={activeContract}
            onApplyHashToContract={handleApplyHash}
          />
        )}

        {activeTab === 'historico' && (
          <ContractHistory
            contracts={visibleContracts}
            onSelectContract={(c) => {
              setActiveContractId(c.id);
              setActiveTab('visualizador');
            }}
            onNewContract={handleNewBlankContract}
            onDeleteContract={handleDeleteContract}
            onDuplicateContract={handleDuplicateContract}
          />
        )}

        {activeTab === 'usuarios' && (
          <UserManager />
        )}

        {activeTab === 'saas' && (
          <SaasManager />
        )}

        {activeTab === 'api_gemini' && (
          <ApiGeminiManager />
        )}
      </main>

      {/* Discreet footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} LocaDoc — Sistema de Gestão de Contratos de Locação Mobiliada & Vistoria Patrimonial.</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Lei nº 8.245/91 e Código Civil Brasileiro</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Sessão Autenticada
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
