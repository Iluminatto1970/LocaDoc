import React, { useState, useRef, useEffect } from 'react';
import { ContractData, GarantiaData, UploadedDocFile, TenantUploadedDocument, ContractTemplate, ContractOperationType, VendaInfo } from '../types/contract';
import { numeroPorExtensoReais, calculateSHA256, generateContractFullText, formatCurrencyBRL } from '../utils/defaults';
import { getSavedTemplates, saveContractTemplate, interpolateTemplate, DEFAULT_TEMPLATES } from '../utils/templates';
import { useAuth } from '../context/AuthContext';
import { 
  Save, Eye, User, Home, Calendar, DollarSign, Shield, 
  Scale, Users, CheckCircle2, RefreshCw, Lock, AlertTriangle, ShieldCheck,
  ScanText, Upload, Building2, Camera, Image as ImageIcon, Sparkles, Plus, 
  Trash2, KeyRound, ExternalLink, FileCheck, Check, AlertCircle, X, Download, Settings,
  FileText, Edit3, Paperclip, FileUp, Bold, Italic, Underline, List, FileCode, CheckCircle, XCircle,
  Layers, BookmarkPlus, Copy, ArrowRightLeft, FileCheck2, Tag, Handshake, ShoppingCart
} from 'lucide-react';
import { OcrInspectorModal } from './OcrInspectorModal';

interface ContractEditorProps {
  contract: ContractData;
  onSave: (updated: ContractData) => void;
  onPreviewRequested: () => void;
  onOpenSettings?: () => void;
}

export const ContractEditor: React.FC<ContractEditorProps> = ({
  contract,
  onSave,
  onPreviewRequested,
  onOpenSettings,
}) => {
  const { user } = useAuth();
  const isTenant = user?.role === 'cliente';

  const [formData, setFormData] = useState<ContractData>({ 
    ...contract,
    tipoOperacao: contract.tipoOperacao || (contract.tipoLocacao === 'temporada' ? 'temporada' : 'aluguel_residencial'),
    vendaInfo: contract.vendaInfo || {
      valorVenda: 450000,
      valorVendaExtenso: 'quatrocentos e cinquenta mil reais',
      sinalEntrada: 90000,
      sinalEntradaExtenso: 'noventa mil reais',
      saldoFinanciamento: 360000,
      condicoesPagamento: 'Sinal de R$ 90.000,00 mediante PIX no ato deste instrumento e saldo devedor de R$ 360.000,00 via financiamento bancário habitacional.',
      matriculaImovel: '124.580',
      cartorioRegistro: '14º Oficial de Registro de Imóveis de São Paulo/SP',
      prazoEscrituraDias: 60,
      imissaoPosse: 'na_quitacao',
    },
    vistoriaDigital: {
      ...contract.vistoriaDigital,
      fotos: contract.vistoriaDigital?.fotos || [],
      observacoesGerais: contract.vistoriaDigital?.observacoesGerais || '',
      dataVistoria: contract.vistoriaDigital?.dataVistoria || contract.prazo?.dataInicio || '',
      responsavelVistoria: contract.vistoriaDigital?.responsavelVistoria || contract.locador?.nome || '',
      chavesEntregues: contract.vistoriaDigital?.chavesEntregues || '',
    }
  });
  const [activeSection, setActiveSection] = useState<
    'partes' | 'objeto' | 'prazo' | 'valores' | 'vistoria' | 'garantia' | 'foro' | 'venda'
  >('partes');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [tenantWarning, setTenantWarning] = useState<string | null>(null);
  const [editorOcrFile, setEditorOcrFile] = useState<UploadedDocFile | null>(null);

  // Mode switcher for ContractEditor: includes dedicated template manager & quick injection
  const [editorMode, setEditorMode] = useState<'formulario' | 'texto_livre' | 'modelos_template' | 'documentos_inquilino'>('formulario');

  // Templates state
  const [templatesList, setTemplatesList] = useState<ContractTemplate[]>(() => getSavedTemplates());
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('todos');
  const [pastedRawText, setPastedRawText] = useState('');
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<ContractTemplate['categoria']>('personalizado');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [previewTemplateModal, setPreviewTemplateModal] = useState<ContractTemplate | null>(null);

  // Text editor custom text state ("espécie de editor de texto")
  const [customContractText, setCustomContractText] = useState<string>(() => {
    return formData.textoPersonalizado || generateContractFullText(formData);
  });
  const [useCustomText, setUseCustomText] = useState<boolean>(formData.usarTextoPersonalizado || false);

  // Tenant document upload & verification state
  const [tenantDocs, setTenantDocs] = useState<TenantUploadedDocument[]>(formData.documentosLocatario || []);
  const [selectedDocCategory, setSelectedDocCategory] = useState<TenantUploadedDocument['categoria']>('identidade');
  const [isUploadingTenantDoc, setIsUploadingTenantDoc] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<TenantUploadedDocument | null>(null);
  const [docFeedbackMsg, setDocFeedbackMsg] = useState<string | null>(null);
  const tenantDocFileInputRef = useRef<HTMLInputElement>(null);
  const contractTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-extraction states
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Vistoria modal lightbox
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [isCalculatingHash, setIsCalculatingHash] = useState(false);

  const locadorFileInputRef = useRef<HTMLInputElement>(null);
  const locatarioFileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const vistoriaFileInputRef = useRef<HTMLInputElement>(null);

  // Automatic OCR extraction and field population for single file
  const handleAutoExtractSingleDoc = async (file: File, targetRole: 'locador' | 'locatario') => {
    setIsExtractingDoc(true);
    setExtractionProgress(`Lendo e analisando documento de ${targetRole === 'locador' ? 'Locador' : 'Locatário'} com IA...`);
    setExtractionSuccess(null);
    setExtractionError(null);

    try {
      const hash = await calculateSHA256(file);
      const reader = new FileReader();

      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      const res = await fetch('/api/ocr-extract-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: {
            name: file.name,
            type: file.type || 'image/jpeg',
            base64,
          },
          documentType: 'rg',
          targetRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Falha ao extrair dados do documento via OCR.');
      }

      const ocr = json.data;
      handleEditorOcrApply(targetRole, ocr);

      setExtractionSuccess(
        `Documento processado com sucesso! Os campos de ${targetRole === 'locador' ? 'Locador (Proprietário)' : 'Locatário (Inquilino)'} foram preenchidos automaticamente.`
      );
      setTimeout(() => setExtractionSuccess(null), 6000);
    } catch (err: any) {
      console.error('Erro na extração de documento:', err);
      setExtractionError(err?.message || 'Falha ao processar o documento. Verifique a imagem ou conexão.');
      setTimeout(() => setExtractionError(null), 6000);
    } finally {
      setIsExtractingDoc(false);
      setExtractionProgress(null);
    }
  };

  // Automatic batch extraction for multiple files (Locador + Locatário at once)
  const handleBatchDocExtract = async (filesList: FileList | File[]) => {
    if (!filesList || filesList.length === 0) return;
    setIsExtractingDoc(true);
    setExtractionProgress('Processando lote de documentos com separação de papéis Locador/Locatário...');
    setExtractionSuccess(null);
    setExtractionError(null);

    try {
      const filesPayload: any[] = [];
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const hash = await calculateSHA256(file);
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const lower = file.name.toLowerCase();
        let targetRole: 'locador' | 'locatario' | 'imovel' | 'outro' = 'locatario';
        if (lower.includes('locador') || lower.includes('proprietario') || lower.includes('iluminatto')) {
          targetRole = 'locador';
        } else if (lower.includes('locatario') || lower.includes('inquilino') || lower.includes('mariana')) {
          targetRole = 'locatario';
        } else if (lower.includes('imovel') || lower.includes('iptu') || lower.includes('residencia')) {
          targetRole = 'imovel';
        }

        filesPayload.push({
          name: file.name,
          type: file.type || 'image/jpeg',
          base64,
          sha256: hash,
          targetRole,
        });
      }

      const res = await fetch('/api/extract-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          instructions: 'Extrair rigorosamente as partes contratantes Locador e Locatário e o endereço do imóvel.',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Falha ao processar lote de documentos.');
      }

      const ext = json.data;
      handleUpdate((prev) => ({
        ...prev,
        locador: ext.locador ? { ...prev.locador, ...ext.locador } : prev.locador,
        locatario: ext.locatario ? { ...prev.locatario, ...ext.locatario } : prev.locatario,
        objeto: ext.objeto ? { ...prev.objeto, ...ext.objeto } : prev.objeto,
        vistoLocador: ext.locador?.nome || prev.vistoLocador,
        vistoLocatario: ext.locatario?.nome || prev.vistoLocatario,
      }));

      setExtractionSuccess(
        'Lote de documentos analisado! Os dados do Locador e do Locatário foram preenchidos automaticamente com precisão.'
      );
      setTimeout(() => setExtractionSuccess(null), 6000);
    } catch (err: any) {
      console.error('Erro no lote de extração:', err);
      setExtractionError(err?.message || 'Falha ao processar documentos.');
      setTimeout(() => setExtractionError(null), 6000);
    } finally {
      setIsExtractingDoc(false);
      setExtractionProgress(null);
    }
  };

  // Quick 1-click test scenario for immediate auto-fill demonstration
  const handleLoadSampleDocs = () => {
    handleUpdate((prev) => ({
      ...prev,
      locador: {
        nome: 'Iluminatto Moraes',
        nacionalidade: 'Brasileiro',
        estadoCivil: 'Casado',
        profissao: 'Empresário / Administrador',
        rg: '14.892.301-8',
        orgaoExpedidor: 'SSP/SP',
        cpf: '111.222.333-44',
        dataNascimento: '15/04/1982',
        endereco: 'Av. Brigadeiro Faria Lima, 3477, Itaim Bibi, São Paulo/SP, CEP: 04538-133',
        telefone: '(11) 98765-4321',
        email: 'iluminatto@gmail.com',
      },
      locatario: {
        nome: 'Mariana Duarte Costa',
        nacionalidade: 'Brasileira',
        estadoCivil: 'Solteira',
        profissao: 'Engenheira de Software',
        rg: '28.456.912-4',
        orgaoExpedidor: 'SSP/SP',
        cpf: '987.654.321-99',
        dataNascimento: '22/09/1991',
        endereco: 'Rua Bela Cintra, 890, Apto 54, Consolação, São Paulo/SP, CEP: 01415-000',
        telefone: '(11) 99888-7744',
        email: 'mariana.duarte@gmail.com',
      },
      vistoLocador: 'Iluminatto Moraes',
      vistoLocatario: 'Mariana Duarte Costa',
    }));
    setExtractionSuccess('Dados de qualificação civil do Locador e Locatário auto-preenchidos com sucesso!');
    setTimeout(() => setExtractionSuccess(null), 5000);
  };

  // Vistoria Photos: Add multiple photos
  const handleAddVistoriaPhotos = async (filesList: FileList | File[]) => {
    if (!filesList || filesList.length === 0) return;
    const newPhotos: string[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newPhotos.push(base64);
    }

    handleUpdate((prev) => {
      const currentFotos = prev.vistoriaDigital?.fotos || [];
      const updatedFotos = [...currentFotos, ...newPhotos];
      return {
        ...prev,
        vistoriaDigital: {
          ...prev.vistoriaDigital,
          fotos: updatedFotos,
        },
      };
    });

    handleCalculateVistoriaPhotosHash();
  };

  // Vistoria Photos: Remove individual photo
  const handleRemoveVistoriaPhoto = (photoIdx: number) => {
    handleUpdate((prev) => {
      const currentFotos = prev.vistoriaDigital?.fotos || [];
      const updatedFotos = currentFotos.filter((_, idx) => idx !== photoIdx);
      return {
        ...prev,
        vistoriaDigital: {
          ...prev.vistoriaDigital,
          fotos: updatedFotos,
        },
      };
    });
  };

  // Vistoria Photos: Add sample inspection photos for demonstration
  const handleAddSampleVistoriaPhotos = () => {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    ];

    handleUpdate((prev) => ({
      ...prev,
      vistoriaDigital: {
        ...prev.vistoriaDigital,
        fotos: Array.from(new Set([...(prev.vistoriaDigital?.fotos || []), ...samplePhotos])),
        observacoesGerais: prev.vistoriaDigital?.observacoesGerais || 'Imóvel inspecionado com pintura nova Branco Neve Suvinil em perfeito estado, teto sem manchas ou infiltrações. Instalações elétricas 110V/220V testadas e em funcionamento pleno. Torneiras, válvulas de descarga Hydra e registros hidráulicos sem gotejamentos. Vidros íntegros e esquadrias de alumínio lubrificadas.',
        chavesEntregues: prev.vistoriaDigital?.chavesEntregues || '02 cópias de chave da porta principal (tetra), 01 chave da área de serviço, 01 controle de portão da garagem e 01 tag eletrônica de acesso à portaria social.',
        responsavelVistoria: prev.vistoriaDigital?.responsavelVistoria || prev.locador?.nome || 'Iluminatto Moraes',
      },
    }));

    handleCalculateVistoriaPhotosHash();
  };

  // Vistoria: Calculate and update SHA-256 of all photos + report
  const handleCalculateVistoriaPhotosHash = async () => {
    setIsCalculatingHash(true);
    try {
      const photosData = (formData.vistoriaDigital?.fotos || []).join('|');
      const obsData = `${formData.vistoriaDigital?.observacoesGerais || ''}|${formData.vistoriaDigital?.chavesEntregues || ''}`;
      const fullBlob = new Blob([photosData + obsData + Date.now().toString()], { type: 'text/plain' });
      const hash = await calculateSHA256(fullBlob);

      handleUpdate((prev) => ({
        ...prev,
        vistoriaDigital: {
          ...prev.vistoriaDigital,
          hashSha256: hash,
        },
      }));
    } catch (e) {
      console.error('Erro ao calcular hash da vistoria:', e);
    } finally {
      setIsCalculatingHash(false);
    }
  };

  const handleQuickDocUpload = async (file: File, target: 'locador' | 'locatario') => {
    try {
      const hash = await calculateSHA256(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setEditorOcrFile({
          id: `editor-doc-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type || 'image/jpeg',
          base64,
          previewUrl: file.type.startsWith('image/') ? base64 : undefined,
          sha256: hash,
          targetRole: target,
          tag: target === 'locador' ? 'rg_locador' : 'rg_locatario',
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro ao ler arquivo para OCR:', err);
    }
  };

  const handleEditorOcrApply = (target: 'locador' | 'locatario' | 'fiador' | 'objeto', ocr: any) => {
    if (isTenant && target !== 'locatario') return;
    if (target === 'locador') {
      handleUpdate((prev) => ({
        ...prev,
        locador: {
          ...prev.locador,
          nome: ocr.nomeCompleto || prev.locador.nome,
          cpf: ocr.cpf || prev.locador.cpf,
          rg: ocr.rg || prev.locador.rg,
          orgaoExpedidor: ocr.orgaoExpedidor || prev.locador.orgaoExpedidor,
          dataNascimento: ocr.dataNascimento || prev.locador.dataNascimento,
          nacionalidade: ocr.nacionalidade || prev.locador.nacionalidade,
          estadoCivil: ocr.estadoCivil || prev.locador.estadoCivil,
          endereco: ocr.enderecoCompleto || prev.locador.endereco,
        },
      }));
    } else if (target === 'locatario') {
      handleUpdate((prev) => ({
        ...prev,
        locatario: {
          ...prev.locatario,
          nome: ocr.nomeCompleto || prev.locatario.nome,
          cpf: ocr.cpf || prev.locatario.cpf,
          rg: ocr.rg || prev.locatario.rg,
          orgaoExpedidor: ocr.orgaoExpedidor || prev.locatario.orgaoExpedidor,
          dataNascimento: ocr.dataNascimento || prev.locatario.dataNascimento,
          nacionalidade: ocr.nacionalidade || prev.locatario.nacionalidade,
          estadoCivil: ocr.estadoCivil || prev.locatario.estadoCivil,
          endereco: ocr.enderecoCompleto || prev.locatario.endereco,
        },
        vistoLocatario: ocr.nomeCompleto?.split(' ')[0] || prev.vistoLocatario,
      }));
    }
    setEditorOcrFile(null);
  };

  const handleUpdate = (updater: (prev: ContractData) => ContractData) => {
    setFormData((prev) => {
      const updated = updater(prev);
      return updated;
    });
  };

  const handleAluguelChange = (val: number) => {
    handleUpdate((prev) => ({
      ...prev,
      valores: {
        ...prev.valores,
        aluguel: val,
        aluguelExtenso: numeroPorExtensoReais(val),
      },
      garantia: {
        ...prev.garantia,
        caucaoValor: prev.garantia.tipo === 'caucao' ? val * prev.garantia.caucaoMeses : prev.garantia.caucaoValor,
        caucaoValorExtenso: prev.garantia.tipo === 'caucao' ? numeroPorExtensoReais(val * prev.garantia.caucaoMeses) : prev.garantia.caucaoValorExtenso,
      },
    }));
  };

  const handleGarantiaTipoChange = (tipo: GarantiaData['tipo']) => {
    handleUpdate((prev) => ({
      ...prev,
      garantia: {
        ...prev.garantia,
        tipo,
        caucaoValor: prev.valores.aluguel * prev.garantia.caucaoMeses,
        caucaoValorExtenso: numeroPorExtensoReais(prev.valores.aluguel * prev.garantia.caucaoMeses),
      },
    }));
  };

  // Helper to insert snippet/tag at cursor in contract text area
  const insertTextAtCursor = (textToInsert: string) => {
    const el = contractTextAreaRef.current;
    if (!el) {
      setCustomContractText((prev) => prev + textToInsert);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = customContractText;
    const next = current.substring(0, start) + textToInsert + current.substring(end);
    setCustomContractText(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  };

  const insertFormat = (prefix: string, suffix: string) => {
    const el = contractTextAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = customContractText.substring(start, end) || 'texto';
    const replacement = `${prefix}${selected}${suffix}`;
    insertTextAtCursor(replacement);
  };

  const handleResetToDefaultText = () => {
    if (window.confirm('Deseja realmente restaurar a redação oficial padrão baseada nos dados do formulário? Quaisquer alterações manuais de texto serão sobrescritas.')) {
      const standard = generateContractFullText(formData);
      setCustomContractText(standard);
      setUseCustomText(true);
    }
  };

  const handleInsertClause = (clauseType: 'pet' | 'garagem' | 'silencio' | 'pintura' | 'solar' | 'airbnb' | 'reforma') => {
    let snippet = '';
    switch (clauseType) {
      case 'pet':
        snippet = `\n\nCLÁUSULA ADICIONAL - DOS ANIMAIS DE ESTIMAÇÃO (PETS):
Fica autorizada a permanência no imóvel de até 2 (dois) animais domésticos (cães/gatos) de porte pequeno a médio, desde que dóceis e com carteira de vacinação em dia. O(A) LOCATÁRIO(A) responsabiliza-se integralmente por eventuais danos causados pelo animal a pisos, rodapés, portas, telas ou mobília, bem como pelo estrito cumprimento das normas sanitárias e de sossego condominiais.`;
        break;
      case 'garagem':
        snippet = `\n\nCLÁUSULA ADICIONAL - DA VAGA DE GARAGEM:
A locação compreende o uso exclusivo da vaga de garagem determinada no objeto deste contrato, sendo expressamente vedado utilizá-la para depósito de materiais inflamáveis, entulhos ou descarte de objetos, devendo ser observadas as regras de manobra e demarcação do condomínio.`;
        break;
      case 'silencio':
        snippet = `\n\nCLÁUSULA ADICIONAL - DAS NORMAS CONDOMINIAIS E HORÁRIO DE SILÊNCIO:
O(A) LOCATÁRIO(A) compromete-se a respeitar rigorosamente as disposições da Convenção e do Regimento Interno do condomínio, em especial os horários de silêncio (das 22:00h às 08:00h), sob pena de arcar com as penalidades e multas aplicadas pela Administração do Condomínio.`;
        break;
      case 'pintura':
        snippet = `\n\nCLÁUSULA ADICIONAL - DA PINTURA E RESTITUIÇÃO DO IMÓVEL:
O imóvel é entregue com pintura nova em látex fosco acrílico cor branca. Ao término da locação, o(a) LOCATÁRIO(A) obriga-se a restituí-lo nas mesmíssimas condições e padrão de acabamento, devendo providenciar repintura idêntica com materiais de primeira qualidade ou indenizar o custo orçado.`;
        break;
      case 'solar':
        snippet = `\n\nCLÁUSULA ADICIONAL - DO RATEIO E ENERGIA SOLAR (FOTOVOLTAICA):
Havendo geração de energia solar associada à unidade, os créditos energéticos auferidos serão abatidos da conta de consumo mensal, correndo por conta do(a) LOCATÁRIO(A) a taxa básica de disponibilidade e o rateio acordado de compensação.`;
        break;
      case 'airbnb':
        snippet = `\n\nCLÁUSULA ADICIONAL - DA VEDAÇÃO A SUBLOCAÇÃO E HOSPEDAGEM (AIRBNB):
É terminantemente proibida a cessão, empréstimo, sublocação total ou parcial, bem como a exploração do imóvel em plataformas digitais de hospedagem por temporada (como Airbnb, Booking ou similares), constituindo grave infração contratual que enseja rescisão imediata e incidência da multa da Cláusula 9ª.`;
        break;
      case 'reforma':
        snippet = `\n\nCLÁUSULA ADICIONAL - DAS OBRAS, REFORMAS E BENFEITORIAS:
É vedada qualquer obra, demolição de paredes ou alteração estrutural no imóvel sem expressa autorização por escrito do(a) LOCADOR(A). Benfeitorias voluptuárias não serão indenizáveis e incorporar-se-ão ao imóvel caso não possam ser removidas sem prejuízo da integridade do bem.`;
        break;
    }
    insertTextAtCursor(snippet);
  };

  // Tenant document upload handling
  const handleUploadTenantFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingTenantDoc(true);
    setDocFeedbackMsg(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const newDoc: TenantUploadedDocument = {
        id: `tdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nome: file.name,
        categoria: selectedDocCategory,
        tamanho: file.size,
        tipo: file.type || 'application/octet-stream',
        base64,
        dataEnvio: new Date().toISOString(),
        status: 'em_analise',
      };

      const updatedList = [newDoc, ...tenantDocs];
      setTenantDocs(updatedList);
      setFormData((prev) => ({ ...prev, documentosLocatario: updatedList }));
      setDocFeedbackMsg(`Documento "${file.name}" anexado com sucesso! Clique em salvar para sincronizar com o banco de dados.`);
      if (tenantDocFileInputRef.current) tenantDocFileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setDocFeedbackMsg('Erro ao processar o arquivo. Tente novamente.');
    } finally {
      setIsUploadingTenantDoc(false);
    }
  };

  const handleRemoveTenantDoc = (docId: string) => {
    const updated = tenantDocs.filter((d) => d.id !== docId);
    setTenantDocs(updated);
    setFormData((prev) => ({ ...prev, documentosLocatario: updated }));
  };

  const handleApproveRejectDoc = (docId: string, status: 'aprovado' | 'rejeitado') => {
    const updated = tenantDocs.map((d) => d.id === docId ? { ...d, status } : d);
    setTenantDocs(updated);
    setFormData((prev) => ({ ...prev, documentosLocatario: updated }));
  };

  const handleSave = () => {
    if (isTenant) {
      // Inquilino can only save their own personal data and uploaded documents
      const safeContract: ContractData = {
        ...contract,
        locatario: { ...formData.locatario },
        documentosLocatario: tenantDocs,
        vistoLocatario: formData.locatario.nome || contract.vistoLocatario,
        updatedAt: new Date().toISOString(),
      };
      onSave(safeContract);
    } else {
      const updated: ContractData = {
        ...formData,
        textoPersonalizado: customContractText,
        usarTextoPersonalizado: useCustomText,
        documentosLocatario: tenantDocs,
        updatedAt: new Date().toISOString(),
      };
      onSave(updated);
    }
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  // Apply a template and automatically inject landlord, tenant, property, and terms
  const handleApplyTemplate = (tpl: ContractTemplate) => {
    const interpolated = interpolateTemplate(tpl.conteudoTexto, formData);
    setCustomContractText(interpolated);
    setUseCustomText(true);
    setFormData((prev) => ({
      ...prev,
      templateId: tpl.id,
      textoPersonalizado: interpolated,
      usarTextoPersonalizado: true,
      tipoOperacao: tpl.categoria === 'personalizado' ? prev.tipoOperacao : (tpl.categoria as ContractOperationType),
    }));
    setTemplateNotice(`Modelo "${tpl.titulo}" aplicado com sucesso! Todos os dados de locatário, locador e imóvel foram injetados automaticamente.`);
    setEditorMode('texto_livre');
    setTimeout(() => setTemplateNotice(null), 5000);
  };

  // Inject landlord, tenant, and property data into raw external text
  const handleInjectDataIntoRawText = () => {
    if (!pastedRawText.trim()) {
      setTemplateNotice('Cole primeiro o texto da nova minuta de contrato no campo correspondente.');
      setTimeout(() => setTemplateNotice(null), 4000);
      return;
    }
    const interpolated = interpolateTemplate(pastedRawText, formData);
    setCustomContractText(interpolated);
    setUseCustomText(true);
    setFormData((prev) => ({
      ...prev,
      textoPersonalizado: interpolated,
      usarTextoPersonalizado: true,
    }));
    setTemplateNotice('Texto externo importado e dados das partes injetados com sucesso! Redirecionado para o processador de texto.');
    setPastedRawText('');
    setEditorMode('texto_livre');
    setTimeout(() => setTemplateNotice(null), 5000);
  };

  // Save current edited text as a new template in the system (reusable across all properties)
  const handleSaveCurrentAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim()) {
      setTemplateNotice('Digite o título para o novo modelo de contrato.');
      setTimeout(() => setTemplateNotice(null), 4000);
      return;
    }

    const newTpl: ContractTemplate = {
      id: `tpl-${Date.now()}`,
      titulo: newTemplateTitle.trim(),
      categoria: newTemplateCategory,
      descricao: newTemplateDesc.trim() || 'Modelo personalizado criado a partir de contrato editado no sistema.',
      conteudoTexto: customContractText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveContractTemplate(newTpl);
    setTemplatesList(getSavedTemplates());
    setNewTemplateTitle('');
    setNewTemplateDesc('');
    setTemplateNotice(`Modelo "${newTpl.titulo}" salvo com sucesso no banco de dados e pronto para reuso em qualquer imóvel!`);
    setTimeout(() => setTemplateNotice(null), 5000);
  };

  const handleTabClick = (section: typeof activeSection) => {
    if (isTenant && section !== 'partes') {
      setTenantWarning('Por segurança e integridade contratual, inquilinos só possuem permissão para revisar e atualizar seus próprios dados cadastrais.');
      setTimeout(() => setTenantWarning(null), 4000);
      return;
    }
    setActiveSection(section);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header and save bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {isTenant ? 'Meus Dados Cadastrais (Inquilino / Locatário)' : 'Editor Estruturado de Cláusulas'}
            </h2>
            {isTenant && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-md">
                Modo Inquilino
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isTenant
              ? 'Conforme LGPD (Art. 18), mantenha seus dados cadastrais corretos e atualizados'
              : 'Ajuste e revise com precisão os termos do contrato e dados das partes'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedFeedback && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {isTenant ? 'Seus dados foram atualizados!' : 'Alterações salvas!'}
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isTenant ? 'Salvar Meus Dados' : 'Salvar Alterações'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleSave();
              onPreviewRequested();
            }}
            className="px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver Contrato Pronto</span>
          </button>
        </div>
      </div>

      {/* 3-Mode Switcher */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setEditorMode('formulario')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              editorMode === 'formulario'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>{isTenant ? '1. Dados Cadastrais' : 'Formulário Estruturado'}</span>
          </button>

          {!isTenant && (
            <button
              type="button"
              onClick={() => {
                if (!customContractText) {
                  setCustomContractText(generateContractFullText(formData));
                }
                setEditorMode('texto_livre');
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                editorMode === 'texto_livre'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-amber-50 border border-amber-200/60'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Editor de Texto do Contrato</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-slate-900 text-amber-300 rounded font-black tracking-wide uppercase">
                Minuta
              </span>
            </button>
          )}

          {!isTenant && (
            <button
              type="button"
              onClick={() => {
                setTemplatesList(getSavedTemplates());
                setEditorMode('modelos_template');
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                editorMode === 'modelos_template'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Modelos & Troca de Contrato</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-amber-100 text-amber-900 rounded font-bold uppercase">
                Templates
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setEditorMode('documentos_inquilino')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              editorMode === 'documentos_inquilino'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Paperclip className="w-4 h-4 text-amber-400" />
            <span>{isTenant ? '2. Enviar Meus Documentos' : 'Documentos do Inquilino'}</span>
            {tenantDocs.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-400 text-slate-950 rounded-full font-extrabold">
                {tenantDocs.length}
              </span>
            )}
          </button>
        </div>

        {editorMode === 'texto_livre' && (
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold text-amber-950">
              <input
                type="checkbox"
                checked={useCustomText}
                onChange={(e) => setUseCustomText(e.target.checked)}
                className="rounded text-amber-600"
              />
              <span>Ativar texto editado no contrato final e PDF</span>
            </label>
          </div>
        )}
      </div>

      {/* Template Notice Feedback */}
      {templateNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{templateNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setTemplateNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tenant LGPD Warning / Notice */}
      {isTenant && (
        <div className="bg-amber-50/90 border border-amber-200/90 p-4 rounded-2xl flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <span>Proteção LGPD & Blindagem Contratual Ativa</span>
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              Você está acessando como <strong>Inquilino (Locatário)</strong>. Seus direitos de acesso e retificação estão assegurados pelo Art. 18 da Lei 13.709/2018 (LGPD).
              Por segurança jurídica, <strong>apenas seus próprios dados cadastrais podem ser editados</strong>. Cláusulas de valores, multas, garantias e dados do locador são imutáveis pelo inquilino.
            </p>
          </div>
        </div>
      )}

      {tenantWarning && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-xs text-rose-800 animate-fade-in">
          <Lock className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{tenantWarning}</span>
        </div>
      )}

      {/* Principal: Importação de Documentos com Auto-Preenchimento por IA (Locador e Locatário) */}
      {!isTenant && editorMode === 'formulario' && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-slate-700/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <ScanText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
                  <span>Importar Documentos & Preenchimento Automático (IA)</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-400 text-slate-950">
                    Locador & Locatário
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Envie fotos ou PDFs (RG, CNH, Comprovante) para a IA ler e preencher automaticamente os dados de proprietário e inquilino.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  title="Configurar Chaves de API (Gemini, OpenAI, Anthropic, Groq) e Endpoints Customizados"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configurações & APIs</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLoadSampleDocs}
                className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Carregar dados de qualificação civil realistas para testar sem precisar subir fotos agora"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Preencher com Exemplo (1 Clique)</span>
              </button>
            </div>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={locadorFileInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleAutoExtractSingleDoc(e.target.files[0], 'locador')}
          />
          <input
            ref={locatarioFileInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleAutoExtractSingleDoc(e.target.files[0], 'locatario')}
          />
          <input
            ref={batchFileInputRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleBatchDocExtract(e.target.files)}
          />

          {/* Extraction Status Feedbacks */}
          {isExtractingDoc && (
            <div className="bg-indigo-900/60 border border-indigo-500/50 p-3.5 rounded-xl flex items-center gap-3 text-xs text-indigo-100 animate-pulse">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span className="font-medium">{extractionProgress || 'Processando documento via OCR e IA...'}</span>
            </div>
          )}

          {extractionSuccess && (
            <div className="bg-emerald-950/70 border border-emerald-500/60 p-3.5 rounded-xl flex items-center gap-3 text-xs text-emerald-100 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{extractionSuccess}</span>
            </div>
          )}

          {extractionError && (
            <div className="bg-rose-950/70 border border-rose-500/60 p-3.5 rounded-xl flex items-center gap-3 text-xs text-rose-100 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{extractionError}</span>
            </div>
          )}

          {/* Import Grid: 3 Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Locador */}
            <div 
              onClick={() => locadorFileInputRef.current?.click()}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 p-3.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Passo 1</span>
                  <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-white">Documento do Locador</h4>
                <p className="text-[11px] text-slate-400">
                  {formData.locador.nome ? (
                    <span className="text-emerald-400 font-semibold truncate block">✓ {formData.locador.nome}</span>
                  ) : (
                    'RG, CNH ou Comprovante do Proprietário'
                  )}
                </p>
              </div>
              <button
                type="button"
                className="mt-3 w-full py-1.5 px-2 bg-slate-700 group-hover:bg-amber-400 text-slate-200 group-hover:text-slate-950 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Locador</span>
              </button>
            </div>

            {/* Card 2: Locatário */}
            <div 
              onClick={() => locatarioFileInputRef.current?.click()}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 p-3.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Passo 2</span>
                  <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-white">Documento do Locatário</h4>
                <p className="text-[11px] text-slate-400">
                  {formData.locatario.nome ? (
                    <span className="text-emerald-400 font-semibold truncate block">✓ {formData.locatario.nome}</span>
                  ) : (
                    'RG, CNH ou Comprovante do Inquilino'
                  )}
                </p>
              </div>
              <button
                type="button"
                className="mt-3 w-full py-1.5 px-2 bg-slate-700 group-hover:bg-amber-400 text-slate-200 group-hover:text-slate-950 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Locatário</span>
              </button>
            </div>

            {/* Card 3: Ambos em Lote */}
            <div 
              onClick={() => batchFileInputRef.current?.click()}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 p-3.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Lote</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-white">Importar Ambos Juntos</h4>
                <p className="text-[11px] text-slate-400">
                  Arraste ou envie múltiplos arquivos (a IA separa os papéis)
                </p>
              </div>
              <button
                type="button"
                className="mt-3 w-full py-1.5 px-2 bg-indigo-900/60 group-hover:bg-amber-400 text-indigo-200 group-hover:text-slate-950 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-indigo-700/50"
              >
                <ScanText className="w-3.5 h-3.5" />
                <span>Importar em Lote</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Modalidade do Negócio Imobiliário */}
      {!isTenant && editorMode === 'formulario' && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Modalidade:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'aluguel_residencial', label: '🏠 Aluguel Residencial' },
                { id: 'venda_imovel', label: '🤝 Compra e Venda' },
                { id: 'aluguel_comercial', label: '🏢 Comercial' },
                { id: 'temporada', label: '🌴 Temporada (Diárias)' },
              ].map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    const nextOp = op.id as ContractOperationType;
                    setFormData((prev) => ({
                      ...prev,
                      tipoOperacao: nextOp,
                      tipoLocacao: nextOp === 'temporada' ? 'temporada' : 'residencial_mensal',
                    }));
                    if (nextOp === 'venda_imovel') {
                      setActiveSection('venda');
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    formData.tipoOperacao === op.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTemplatesList(getSavedTemplates());
                setEditorMode('modelos_template');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Trocar Modelo</span>
            </button>
          </div>
        </div>
      )}

      {/* Section navigation tabs (Formulário) */}
      {editorMode === 'formulario' && (
        <>
          <div className="flex items-center gap-1 overflow-x-auto p-1.5 bg-slate-100 rounded-xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => handleTabClick('partes')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'partes'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{isTenant ? '1. Meus Dados Cadastrais' : '1. Partes Contratantes'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('objeto')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isTenant ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-600 hover:text-slate-900'
          } ${activeSection === 'objeto' ? 'bg-white text-slate-900 shadow-2xs' : ''}`}
        >
          {isTenant ? <Lock className="w-3 h-3 text-slate-400" /> : <Home className="w-3.5 h-3.5" />}
          <span>2. Objeto & Mobília</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('prazo')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isTenant ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-600 hover:text-slate-900'
          } ${activeSection === 'prazo' ? 'bg-white text-slate-900 shadow-2xs' : ''}`}
        >
          {isTenant ? <Lock className="w-3 h-3 text-slate-400" /> : <Calendar className="w-3.5 h-3.5" />}
          <span>3. Prazos</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('valores')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isTenant ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-600 hover:text-slate-900'
          } ${activeSection === 'valores' ? 'bg-white text-slate-900 shadow-2xs' : ''}`}
        >
          {isTenant ? <Lock className="w-3 h-3 text-slate-400" /> : <DollarSign className="w-3.5 h-3.5" />}
          <span>4. Valores & PIX</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('vistoria')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isTenant ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-600 hover:text-slate-900'
          } ${activeSection === 'vistoria' ? 'bg-white text-slate-900 shadow-2xs' : ''}`}
        >
          {isTenant ? <Lock className="w-3 h-3 text-slate-400" /> : <Shield className="w-3.5 h-3.5 text-amber-600" />}
          <span>5. Vistoria, Fotos & Laudo</span>
          {formData.vistoriaDigital?.fotos && formData.vistoriaDigital.fotos.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold ml-1">
              {formData.vistoriaDigital.fotos.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('garantia')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isTenant ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-600 hover:text-slate-900'
          } ${activeSection === 'garantia' ? 'bg-white text-slate-900 shadow-2xs' : ''}`}
        >
          {isTenant ? <Lock className="w-3 h-3 text-slate-400" /> : <Scale className="w-3.5 h-3.5" />}
          <span>6. Garantia</span>
        </button>

        {formData.tipoOperacao === 'venda_imovel' && (
          <button
            type="button"
            onClick={() => handleTabClick('venda')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              isTenant ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-600 hover:text-slate-900'
            } ${activeSection === 'venda' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-emerald-800 bg-emerald-50'}`}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>7. Compra e Venda (RGI & Sinal)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleTabClick('foro')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isTenant ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-600 hover:text-slate-900'
          } ${activeSection === 'foro' ? 'bg-white text-slate-900 shadow-2xs' : ''}`}
        >
          {isTenant ? <Lock className="w-3 h-3 text-slate-400" /> : <Users className="w-3.5 h-3.5" />}
          <span>8. Foro & Testemunhas</span>
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        
        {/* Section 1: Partes */}
        {activeSection === 'partes' && (
          <div className="space-y-8">
            {/* LOCADOR */}
            <div className={`space-y-4 ${isTenant ? 'opacity-85' : ''}`}>
              <div className="border-b border-slate-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    1.1. Qualificação do(a) Locador(a) (Proprietário)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={locadorFileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleQuickDocUpload(e.target.files[0], 'locador')}
                  />
                  {!isTenant ? (
                    <button
                      type="button"
                      onClick={() => locadorFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Escanear RG/CNH do Locador com OCR"
                    >
                      <ScanText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Escanear Doc / Imagem do Locador</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" /> Somente Leitura (Proprietário)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.nome}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, nome: e.target.value } }))}
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.cpf}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, cpf: e.target.value } }))}
                    placeholder="000.000.000-00"
                    className={`w-full p-2.5 text-xs border rounded-lg font-mono ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RG nº</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.rg}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, rg: e.target.value } }))}
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão Expedidor</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.orgaoExpedidor}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, orgaoExpedidor: e.target.value } }))}
                    placeholder="SSP/SP"
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nacionalidade</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.nacionalidade}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, nacionalidade: e.target.value } }))}
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Civil</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.estadoCivil}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, estadoCivil: e.target.value } }))}
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Profissão</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.profissao}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, profissao: e.target.value } }))}
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.telefone}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, telefone: e.target.value } }))}
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    disabled={isTenant}
                    value={formData.locador.email}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, email: e.target.value } }))}
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço Residencial Completo</label>
                  <input
                    type="text"
                    disabled={isTenant}
                    value={formData.locador.endereco}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locador: { ...p.locador, endereco: e.target.value } }))}
                    placeholder="Rua, Número, Bairro, Cidade/UF, CEP"
                    className={`w-full p-2.5 text-xs border rounded-lg ${
                      isTenant ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* LOCATÁRIO */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="border-b border-slate-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {isTenant ? '1.2. Seus Dados Cadastrais (Locatário / Inquilino)' : '1.2. Qualificação do(a) Locatário(a) (Inquilino)'}
                  </h3>
                  {isTenant && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Edição Permitida (Seus Dados)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={locatarioFileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleQuickDocUpload(e.target.files[0], 'locatario')}
                  />
                  <button
                    type="button"
                    onClick={() => locatarioFileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Escanear RG/CNH do Locatário com OCR"
                  >
                    <ScanText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isTenant ? 'Escanear Meus Documentos (OCR)' : 'Escanear Doc / Imagem do Locatário'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.locatario.nome}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, nome: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={formData.locatario.cpf}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, cpf: e.target.value } }))}
                    placeholder="000.000.000-00"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RG nº</label>
                  <input
                    type="text"
                    value={formData.locatario.rg}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, rg: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão Expedidor</label>
                  <input
                    type="text"
                    value={formData.locatario.orgaoExpedidor}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, orgaoExpedidor: e.target.value } }))}
                    placeholder="SSP/SP"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nacionalidade</label>
                  <input
                    type="text"
                    value={formData.locatario.nacionalidade}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, nacionalidade: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Civil</label>
                  <input
                    type="text"
                    value={formData.locatario.estadoCivil}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, estadoCivil: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Profissão</label>
                  <input
                    type="text"
                    value={formData.locatario.profissao}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, profissao: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.locatario.telefone}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, telefone: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.locatario.email}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, email: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Objeto & Mobília */}
        {activeSection === 'objeto' && (
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Do Objeto e da Mobília
              </h3>
            </div>

            <div className="space-y-4">
              {/* Quick property select */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Importar Dados de Imóvel Cadastrado (Preenchimento Rápido)
                </label>
                <select
                  onChange={(e) => {
                    const imovelId = e.target.value;
                    if (!imovelId) return;
                    try {
                      const saved = localStorage.getItem('locadoc_imoveis_db');
                      if (saved) {
                        const list = JSON.parse(saved);
                        const found = list.find((im: any) => im.id === imovelId);
                        if (found) {
                          handleUpdate((p) => ({
                            ...p,
                            imovelId: found.id,
                            objeto: {
                              ...p.objeto,
                              endereco: found.endereco,
                              compostos: found.compostos,
                            },
                            valores: {
                              ...p.valores,
                              aluguel: found.valorAluguelSugerido || p.valores.aluguel,
                              aluguelExtenso: numeroPorExtensoReais(found.valorAluguelSugerido || p.valores.aluguel),
                            },
                          }));
                        }
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium cursor-pointer"
                >
                  <option value="">Selecione um imóvel cadastrado no sistema...</option>
                  {(() => {
                    try {
                      const saved = localStorage.getItem('locadoc_imoveis_db');
                      if (saved) {
                        const list = JSON.parse(saved);
                        return list.map((im: any) => (
                          <option key={im.id} value={im.id}>
                            {im.titulo} — {im.endereco.split(',')[0]}
                          </option>
                        ));
                      }
                    } catch (e) {
                      return null;
                    }
                    return null;
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2.1. Endereço Completo do Imóvel Locado *
                </label>
                <input
                  type="text"
                  value={formData.objeto.endereco}
                  onChange={(e) => handleUpdate((p) => ({ ...p, objeto: { ...p.objeto, endereco: e.target.value } }))}
                  placeholder="Ex: Rua Canário, nº 850, Apto 142, Bloco B, Moema, São Paulo/SP, CEP: 04521-004"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Composição dos Cômodos e Vagas de Garagem
                </label>
                <textarea
                  rows={3}
                  value={formData.objeto.compostos}
                  onChange={(e) => handleUpdate((p) => ({ ...p, objeto: { ...p.objeto, compostos: e.target.value } }))}
                  placeholder="composto por 2 dormitórios (sendo 1 suíte), sala de estar/jantar, sacada gourmet, cozinha, área de serviço e 1 vaga de garagem nº 42."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 leading-relaxed"
                />
              </div>

              {/* Manual observations from parties */}
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Observações Manuais das Partes (Sem necessidade de documentos/fotos)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações Especiais do(a) Locador(a) (Manual)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.observacoesLocador || ''}
                    onChange={(e) => handleUpdate((p) => ({ ...p, observacoesLocador: e.target.value }))}
                    placeholder="Ex: Chaves entregues mediante conferência, vaga demarcada..."
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações Especiais do(a) Locatário(a) (Manual)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.observacoesLocatario || ''}
                    onChange={(e) => handleUpdate((p) => ({ ...p, observacoesLocatario: e.target.value }))}
                    placeholder="Ex: Declarado recebimento de controle do portão e chaves..."
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 resize-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">2.2. Mobília e Equipamentos & 2.3. Vedação de Sublocação</p>
                <p>
                  O contrato prevê cláusula expressa vinculando a mobília ao <strong>ANEXO I – LAUDO DE VISTORIA</strong> e proíbe terminantemente sublocação ou cessão parcial (inclusive plataformas como Airbnb).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Prazos */}
        {activeSection === 'prazo' && (
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                3. Do Prazo da Locação
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prazo de Vigência (Meses)
                </label>
                <input
                  type="number"
                  value={formData.prazo.vigenciaMeses}
                  onChange={(e) => handleUpdate((p) => ({ ...p, prazo: { ...p.prazo, vigenciaMeses: parseInt(e.target.value) || 12 } }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
                <span className="text-[11px] text-slate-500">Padrão: 30 meses ou 12 meses</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Início
                </label>
                <input
                  type="text"
                  value={formData.prazo.dataInicio}
                  onChange={(e) => handleUpdate((p) => ({ ...p, prazo: { ...p.prazo, dataInicio: e.target.value } }))}
                  placeholder="DD/MM/AAAA"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Término
                </label>
                <input
                  type="text"
                  value={formData.prazo.dataTermino}
                  onChange={(e) => handleUpdate((p) => ({ ...p, prazo: { ...p.prazo, dataTermino: e.target.value } }))}
                  placeholder="DD/MM/AAAA"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Valores & Pagamento */}
        {activeSection === 'valores' && (
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                4. Dos Valores, Encargos e Pagamento
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor do Aluguel Mensal (R$)
                </label>
                <input
                  type="number"
                  step="50"
                  value={formData.valores.aluguel}
                  onChange={(e) => handleAluguelChange(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor por Extenso
                </label>
                <input
                  type="text"
                  value={formData.valores.aluguelExtenso}
                  onChange={(e) => handleUpdate((p) => ({ ...p, valores: { ...p.valores, aluguelExtenso: e.target.value } }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dia do Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.valores.diaVencimento}
                  onChange={(e) => handleUpdate((p) => ({ ...p, valores: { ...p.valores, diaVencimento: parseInt(e.target.value) || 10 } }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
                <span className="text-[11px] text-slate-500">Normalmente 05 ou 10</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chave PIX do Locador
                </label>
                <input
                  type="text"
                  value={formData.valores.chavePix}
                  onChange={(e) => handleUpdate((p) => ({ ...p, valores: { ...p.valores, chavePix: e.target.value } }))}
                  placeholder="CPF, e-mail ou chave aleatória"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Índice de Reajuste Anual
                </label>
                <select
                  value={formData.valores.indiceReajuste}
                  onChange={(e) => handleUpdate((p) => ({ ...p, valores: { ...p.valores, indiceReajuste: e.target.value as any } }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="IPCA">IPCA (Recomendado / Inflação Oficial)</option>
                  <option value="IGP-M">IGP-M (Tradicional)</option>
                  <option value="INPC">INPC</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={formData.valores.banco}
                  onChange={(e) => handleUpdate((p) => ({ ...p, valores: { ...p.valores, banco: e.target.value } }))}
                  placeholder="Ex: Itaú, Nubank, Banco do Brasil"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agência
                </label>
                <input
                  type="text"
                  value={formData.valores.agencia}
                  onChange={(e) => handleUpdate((p) => ({ ...p, valores: { ...p.valores, agencia: e.target.value } }))}
                  placeholder="Ex: 0345"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conta Corrente
                </label>
                <input
                  type="text"
                  value={formData.valores.conta}
                  onChange={(e) => handleUpdate((p) => ({ ...p, valores: { ...p.valores, conta: e.target.value } }))}
                  placeholder="Ex: 12345-6"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Vistoria & Fotos / Laudo Técnico */}
        {activeSection === 'vistoria' && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-600" />
                  <span>5. Da Vistoria, Fotos e Integridade Digital (Laudo Inicial & Blindagem)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Anexe as fotos de entrada do imóvel, laudo de vistoria física, relação de chaves e assegure a blindagem jurídica com Hash SHA-256.
                </p>
              </div>

              {/* Quick actions for Vistoria */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={vistoriaFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && handleAddVistoriaPhotos(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => vistoriaFileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Adicionar Fotos da Vistoria</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddSampleVistoriaPhotos}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Carregar 4 fotos de alta definição de exemplo e laudo de vistoria completo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Inserir Fotos & Laudo de Exemplo</span>
                </button>

                <button
                  type="button"
                  onClick={handleCalculateVistoriaPhotosHash}
                  disabled={isCalculatingHash}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Gera o selo hash SHA-256 das fotos e anotações para cláusula de inviolabilidade"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isCalculatingHash ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
                  <span>{isCalculatingHash ? 'Calculando Hash...' : 'Gerar Hash SHA-256'}</span>
                </button>
              </div>
            </div>

            {/* Sub-Card 1: Fotos da Vistoria */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Galeria de Fotos da Vistoria Inicial
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {(formData.vistoriaDigital?.fotos || []).length} fotos anexadas
                  </span>
                </div>

                {(formData.vistoriaDigital?.fotos || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja remover todas as fotos da vistoria?')) {
                        handleUpdate((p) => ({
                          ...p,
                          vistoriaDigital: { ...p.vistoriaDigital, fotos: [] }
                        }));
                      }
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar todas as fotos</span>
                  </button>
                )}
              </div>

              {/* Photo Grid or Empty State */}
              {(formData.vistoriaDigital?.fotos || []).length === 0 ? (
                <div 
                  onClick={() => vistoriaFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/30 p-8 rounded-xl text-center cursor-pointer transition-colors space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Nenhuma foto da vistoria adicionada ainda
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                      Clique aqui para selecionar fotos do imóvel (cômodos, paredes, pintura, louças, eletrodomésticos) ou utilize o botão de fotos de exemplo acima.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(formData.vistoriaDigital?.fotos || []).map((fotoUrl, idx) => (
                    <div 
                      key={idx} 
                      className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video sm:aspect-4/3 w-full bg-slate-100 overflow-hidden relative">
                        <img 
                          src={fotoUrl} 
                          alt={`Vistoria foto ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] font-bold">
                          #{idx + 1}
                        </span>
                        
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPhotoModal(fotoUrl)}
                            className="p-1.5 bg-white text-slate-900 rounded-lg hover:bg-slate-100 shadow-xs cursor-pointer"
                            title="Ampliar foto"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVistoriaPhoto(idx)}
                            className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs cursor-pointer"
                            title="Excluir foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2 text-[10px] text-slate-600 truncate flex items-center justify-between">
                        <span className="font-semibold text-slate-800">Foto {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVistoriaPhoto(idx)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          title="Remover"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add more photo card */}
                  <div
                    onClick={() => vistoriaFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors bg-white hover:bg-amber-50/40 min-h-[120px]"
                  >
                    <Plus className="w-5 h-5 text-slate-500 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">+ Mais fotos</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-Card 2: Laudo Técnico e Observações */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Laudo Técnico Inicial & Observações Gerais
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdate((prev) => ({
                      ...prev,
                      vistoriaDigital: {
                        ...prev.vistoriaDigital,
                        dataVistoria: prev.vistoriaDigital?.dataVistoria || new Date().toISOString().split('T')[0],
                        responsavelVistoria: prev.vistoriaDigital?.responsavelVistoria || prev.locador?.nome || 'Iluminatto Moraes',
                        chavesEntregues: prev.vistoriaDigital?.chavesEntregues || '02 cópias de chave da porta social principal (tetra), 01 chave da área de serviço, 01 controle do portão da garagem e 01 tag de acesso social.',
                        observacoesGerais: prev.vistoriaDigital?.observacoesGerais || 'Imóvel inspecionado com pintura nova na cor Branco Neve (tinta acrílica Suvinil) em perfeito estado, sem furos, manchas ou umidade. Pisos de porcelanato íntegros, sem peças trincadas ou ocas. Instalações elétricas (tomadas, interruptores e quadro disjuntor) operando a 110V/220V. Hidráulica revisada, registros e válvulas de descarga sem gotejamento. Esquadrias e vidros íntegros e lubrificados.',
                      }
                    }));
                  }}
                  className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Preencher Texto Padrão de Laudo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Vistoria Inicial
                  </label>
                  <input
                    type="date"
                    value={formData.vistoriaDigital?.dataVistoria || ''}
                    onChange={(e) => handleUpdate((p) => ({
                      ...p,
                      vistoriaDigital: { ...p.vistoriaDigital, dataVistoria: e.target.value }
                    }))}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsável / Vistoriador(a)
                  </label>
                  <input
                    type="text"
                    value={formData.vistoriaDigital?.responsavelVistoria || ''}
                    onChange={(e) => handleUpdate((p) => ({
                      ...p,
                      vistoriaDigital: { ...p.vistoriaDigital, responsavelVistoria: e.target.value }
                    }))}
                    placeholder="Ex: Iluminatto Moraes (CRECI / Engenheiro)"
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prazo de Contestação do Inquilino
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.vistoriaDigital.prazoContestacaoHoras}
                      onChange={(e) => handleUpdate((p) => ({
                        ...p,
                        vistoriaDigital: { ...p.vistoriaDigital, prazoContestacaoHoras: parseInt(e.target.value) || 48 }
                      }))}
                      className="w-24 p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                    <span className="text-xs text-slate-600 font-medium">horas (Padrão: 48h)</span>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Chaves, Controles e Tags Entregues</span>
                    <span className="text-[11px] text-slate-500 font-normal">Identifique quantidade e finalidade</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vistoriaDigital?.chavesEntregues || ''}
                    onChange={(e) => handleUpdate((p) => ({
                      ...p,
                      vistoriaDigital: { ...p.vistoriaDigital, chavesEntregues: e.target.value }
                    }))}
                    placeholder="Ex: 02 chaves tetra porta principal, 01 chave serviço, 01 controle garagem, 01 tag de acesso social"
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Observações Técnicas e Estado do Imóvel (Laudo de Entrada)</span>
                    <span className="text-[11px] text-slate-500 font-normal">Paredes, pisos, elétrica, hidráulica, vidros</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.vistoriaDigital?.observacoesGerais || ''}
                    onChange={(e) => handleUpdate((p) => ({
                      ...p,
                      vistoriaDigital: { ...p.vistoriaDigital, observacoesGerais: e.target.value }
                    }))}
                    placeholder="Descreva detalhadamente o estado de entrega do imóvel: pintura, teto, piso, conservação de louças, registros, espelhos, janelas, persianas e armários..."
                    className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 leading-relaxed font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Sub-Card 3: Cláusula de Blindagem & Criptografia SHA-256 */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Blindagem Criptográfica & Link na Nuvem (Cláusula 5)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link Nuvem das Fotos e Vídeo da Vistoria (Google Drive, Dropbox, OneDrive)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={formData.vistoriaDigital.linkNuvem}
                      onChange={(e) => handleUpdate((p) => ({
                        ...p,
                        vistoriaDigital: { ...p.vistoriaDigital, linkNuvem: e.target.value }
                      }))}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                    {formData.vistoriaDigital.linkNuvem && (
                      <a
                        href={formData.vistoriaDigital.linkNuvem}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shrink-0"
                        title="Abrir pasta na nuvem"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Hash Criptográfico SHA-256 (64 Caracteres Hexadecimais)
                    </label>
                    <span className="text-[11px] text-amber-700 font-medium">Inviolabilidade Jurídica Assegurada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={64}
                      value={formData.vistoriaDigital.hashSha256}
                      onChange={(e) => handleUpdate((p) => ({
                        ...p,
                        vistoriaDigital: { ...p.vistoriaDigital, hashSha256: e.target.value }
                      }))}
                      placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={handleCalculateVistoriaPhotosHash}
                      disabled={isCalculatingHash}
                      className="px-3 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCalculatingHash ? 'animate-spin' : ''}`} />
                      <span>{isCalculatingHash ? 'Calculando...' : 'Recalcular'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Garantia */}
        {activeSection === 'garantia' && (
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                6. Da Garantia Locatícia
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGarantiaTipoChange('caucao')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  formData.garantia.tipo === 'caucao'
                    ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Opção 1: Caução (Depósito)
              </button>

              <button
                type="button"
                onClick={() => handleGarantiaTipoChange('fiador')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  formData.garantia.tipo === 'fiador'
                    ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Opção 2: Fiador Solidário
              </button>

              <button
                type="button"
                onClick={() => handleGarantiaTipoChange('seguro_fianca')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  formData.garantia.tipo === 'seguro_fianca'
                    ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Opção 3: Seguro Fiança
              </button>
            </div>

            {formData.garantia.tipo === 'caucao' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantidade de Meses
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      value={formData.garantia.caucaoMeses}
                      onChange={(e) => {
                        const m = parseInt(e.target.value) || 3;
                        const v = formData.valores.aluguel * m;
                        handleUpdate((p) => ({
                          ...p,
                          garantia: {
                            ...p.garantia,
                            caucaoMeses: m,
                            caucaoValor: v,
                            caucaoValorExtenso: numeroPorExtensoReais(v),
                          },
                        }));
                      }}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                    <span className="text-[11px] text-slate-500">Limite legal: até 3 meses</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor Total da Caução (R$)
                    </label>
                    <input
                      type="number"
                      value={formData.garantia.caucaoValor}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        handleUpdate((p) => ({
                          ...p,
                          garantia: {
                            ...p.garantia,
                            caucaoValor: v,
                            caucaoValorExtenso: numeroPorExtensoReais(v),
                          },
                        }));
                      }}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Banco da Conta Poupança
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.caucaoBanco || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, caucaoBanco: e.target.value } }))}
                      placeholder="Ex: Caixa Econômica, Banco do Brasil"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Agência e Conta Poupança
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.caucaoContaPoupanca}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, caucaoContaPoupanca: e.target.value } }))}
                      placeholder="Agência 1234, Poupança 013/98765-4"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Titular da Conta Poupança Vinculada
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.caucaoTitular || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, caucaoTitular: e.target.value } }))}
                      placeholder="Nome do titular da conta"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor por Extenso
                  </label>
                  <input
                    type="text"
                    value={formData.garantia.caucaoValorExtenso}
                    onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, caucaoValorExtenso: e.target.value } }))}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            )}

            {formData.garantia.tipo === 'fiador' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome Completo do Fiador
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorNome}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorNome: e.target.value } }))}
                      placeholder="Nome completo do fiador principal"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CPF do Fiador
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorCpf}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorCpf: e.target.value } }))}
                      placeholder="000.000.000-00"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      RG nº
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorRg}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorRg: e.target.value } }))}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Órgão Expedidor
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorOrgaoExpedidor || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorOrgaoExpedidor: e.target.value } }))}
                      placeholder="SSP/SP"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Profissão
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorProfissao}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorProfissao: e.target.value } }))}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Cônjuge (com outorga)
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorConjuge}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorConjuge: e.target.value } }))}
                      placeholder="Nome do cônjuge do fiador"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CPF do Cônjuge
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorCpfConjuge || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorCpfConjuge: e.target.value } }))}
                      placeholder="000.000.000-00"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telefone / E-mail do Fiador
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorTelefone || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorTelefone: e.target.value } }))}
                      placeholder="(11) 98765-4321"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Endereço Residencial do Fiador
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.fiadorEndereco}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, fiadorEndereco: e.target.value } }))}
                      placeholder="Rua, Número, Bairro, Cidade/UF, CEP"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">Cláusula de Renúncia Legal:</span> Assina(m) solidariamente com renúncia expressa ao benefício de ordem previsto no Art. 827 do Código Civil Brasileiro.
                </div>
              </div>
            )}

            {formData.garantia.tipo === 'seguro_fianca' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número da Apólice
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.seguroApolice}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, seguroApolice: e.target.value } }))}
                      placeholder="Ex: 99882233"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Companhia Seguradora
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.seguroCompanhia}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, seguroCompanhia: e.target.value } }))}
                      placeholder="Ex: Porto Seguro Aluguel, Tokio Marine, Pottencial"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vigência da Apólice (Início)
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.seguroVigenciaInicio || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, seguroVigenciaInicio: e.target.value } }))}
                      placeholder="DD/MM/AAAA"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vigência da Apólice (Término)
                    </label>
                    <input
                      type="text"
                      value={formData.garantia.seguroVigenciaTermino || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, seguroVigenciaTermino: e.target.value } }))}
                      placeholder="DD/MM/AAAA"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor da Cobertura (R$)
                    </label>
                    <input
                      type="number"
                      value={formData.garantia.seguroCoberturaValor || ''}
                      onChange={(e) => handleUpdate((p) => ({ ...p, garantia: { ...p.garantia, seguroCoberturaValor: parseFloat(e.target.value) || 0 } }))}
                      placeholder="Ex: 50000"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 8: Foro & Testemunhas */}
        {activeSection === 'foro' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                8. Do Foro e Testemunhas
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comarca do Foro de Eleição (Cidade/UF)
                </label>
                <input
                  type="text"
                  value={formData.foro.comarcaCidadeUf}
                  onChange={(e) => handleUpdate((p) => ({ ...p, foro: { ...p.foro, comarcaCidadeUf: e.target.value } }))}
                  placeholder="Ex: São Paulo/SP"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data e Local por Extenso
                </label>
                <input
                  type="text"
                  value={formData.foro.dataExtenso}
                  onChange={(e) => handleUpdate((p) => ({ ...p, foro: { ...p.foro, dataExtenso: e.target.value } }))}
                  placeholder="Ex: São Paulo/SP, 16 de Outubro de 2026"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Testemunhas Instrumentárias
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Testemunha 1</p>
                  <input
                    type="text"
                    value={formData.testemunhas[0]?.nome || ''}
                    onChange={(e) => handleUpdate((p) => {
                      const t = [...p.testemunhas] as [any, any];
                      t[0] = { ...t[0], nome: e.target.value };
                      return { ...p, testemunhas: t };
                    })}
                    placeholder="Nome Completo"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                  />
                  <input
                    type="text"
                    value={formData.testemunhas[0]?.cpf || ''}
                    onChange={(e) => handleUpdate((p) => {
                      const t = [...p.testemunhas] as [any, any];
                      t[0] = { ...t[0], cpf: e.target.value };
                      return { ...p, testemunhas: t };
                    })}
                    placeholder="CPF"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-md font-mono text-slate-900"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Testemunha 2</p>
                  <input
                    type="text"
                    value={formData.testemunhas[1]?.nome || ''}
                    onChange={(e) => handleUpdate((p) => {
                      const t = [...p.testemunhas] as [any, any];
                      t[1] = { ...t[1], nome: e.target.value };
                      return { ...p, testemunhas: t };
                    })}
                    placeholder="Nome Completo"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                  />
                  <input
                    type="text"
                    value={formData.testemunhas[1]?.cpf || ''}
                    onChange={(e) => handleUpdate((p) => {
                      const t = [...p.testemunhas] as [any, any];
                      t[1] = { ...t[1], cpf: e.target.value };
                      return { ...p, testemunhas: t };
                    })}
                    placeholder="CPF"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-md font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Compra e Venda de Imóvel */}
        {activeSection === 'venda' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Handshake className="w-4 h-4 text-emerald-600" />
                <span>Condições da Compra e Venda (Código Civil Brasileiro)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores de venda, sinal (arras), financiamento habitacional, certidões e registro imobiliário.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Total da Venda (R$)
                </label>
                <input
                  type="number"
                  value={formData.vendaInfo?.valorVenda || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleUpdate((p) => ({
                      ...p,
                      vendaInfo: {
                        ...(p.vendaInfo || {
                          sinalEntrada: 0,
                          saldoFinanciamento: 0,
                          condicoesPagamento: '',
                          matriculaImovel: '',
                          cartorioRegistro: '',
                        }),
                        valorVenda: val,
                        valorVendaExtenso: numeroPorExtensoReais(val),
                      },
                    }));
                  }}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-bold"
                  placeholder="Ex: 500000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sinal e Princípio de Pagamento / Arras (R$)
                </label>
                <input
                  type="number"
                  value={formData.vendaInfo?.sinalEntrada || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleUpdate((p) => ({
                      ...p,
                      vendaInfo: {
                        ...(p.vendaInfo || {
                          valorVenda: 0,
                          valorVendaExtenso: '',
                          saldoFinanciamento: 0,
                          condicoesPagamento: '',
                          matriculaImovel: '',
                          cartorioRegistro: '',
                        }),
                        sinalEntrada: val,
                        sinalEntradaExtenso: numeroPorExtensoReais(val),
                      },
                    }));
                  }}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  placeholder="Ex: 100000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo Restante / Financiamento Bancário (R$)
                </label>
                <input
                  type="number"
                  value={formData.vendaInfo?.saldoFinanciamento || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleUpdate((p) => ({
                      ...p,
                      vendaInfo: {
                        ...(p.vendaInfo || {
                          valorVenda: 0,
                          valorVendaExtenso: '',
                          sinalEntrada: 0,
                          condicoesPagamento: '',
                          matriculaImovel: '',
                          cartorioRegistro: '',
                        }),
                        saldoFinanciamento: val,
                      },
                    }));
                  }}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  placeholder="Ex: 400000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Matrícula Imobiliária nº (RGI)
                </label>
                <input
                  type="text"
                  value={formData.vendaInfo?.matriculaImovel || ''}
                  onChange={(e) => handleUpdate((p) => ({
                    ...p,
                    vendaInfo: {
                      ...(p.vendaInfo || {
                        valorVenda: 0,
                        valorVendaExtenso: '',
                        sinalEntrada: 0,
                        saldoFinanciamento: 0,
                        condicoesPagamento: '',
                        cartorioRegistro: '',
                      }),
                      matriculaImovel: e.target.value,
                    },
                  }))}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  placeholder="Ex: 125.430"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ofício de Registro de Imóveis (Cartório Competente)
                </label>
                <input
                  type="text"
                  value={formData.vendaInfo?.cartorioRegistro || ''}
                  onChange={(e) => handleUpdate((p) => ({
                    ...p,
                    vendaInfo: {
                      ...(p.vendaInfo || {
                        valorVenda: 0,
                        valorVendaExtenso: '',
                        sinalEntrada: 0,
                        saldoFinanciamento: 0,
                        condicoesPagamento: '',
                        matriculaImovel: '',
                      }),
                      cartorioRegistro: e.target.value,
                    },
                  }))}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  placeholder="Ex: 14º Oficial de Registro de Imóveis da Capital de São Paulo/SP"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Condições de Pagamento e Prazos Convencionados
                </label>
                <textarea
                  rows={3}
                  value={formData.vendaInfo?.condicoesPagamento || ''}
                  onChange={(e) => handleUpdate((p) => ({
                    ...p,
                    vendaInfo: {
                      ...(p.vendaInfo || {
                        valorVenda: 0,
                        valorVendaExtenso: '',
                        sinalEntrada: 0,
                        saldoFinanciamento: 0,
                        matriculaImovel: '',
                        cartorioRegistro: '',
                      }),
                      condicoesPagamento: e.target.value,
                    },
                  }))}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  placeholder="Descreva o cronograma de desembolso, entrada, liberação de FGTS/financiamento e posse..."
                />
              </div>
            </div>
          </div>
        )}

      </div>
      </>
      )}

      {/* 2. MODE: TEXT EDITOR ("uma espécie de editor de texto") */}
      {editorMode === 'texto_livre' && !isTenant && (
        <div className="space-y-4 animate-in fade-in">
          {/* Text Editor Toolbar Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  <span>Editor de Texto da Minuta Contratual</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-100 text-amber-900">
                    Processador Jurídico
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Altere livremente a redação de qualquer cláusula, insira termos especiais ou formate as condições da locação ou venda.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEditorMode('modelos_template')}
                  className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-300/80"
                  title="Trocar modelo de contrato ou importar texto externo com injeção automática de dados"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  <span>Trocar Modelo / Importar</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefaultText}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Regera o texto oficial com base nos campos preenchidos no formulário"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Texto Padrão</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Texto Editado</span>
                </button>
              </div>
            </div>

            {/* Quick formatting toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                Formatação:
              </span>
              <button
                type="button"
                onClick={() => insertFormat('**', '**')}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-800 text-xs font-bold cursor-pointer"
                title="Negrito"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('*', '*')}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-800 text-xs italic cursor-pointer"
                title="Itálico"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('<u>', '</u>')}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-800 text-xs underline cursor-pointer"
                title="Sublinhado"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n\nCLÁUSULA NOVA - DA DISPOSIÇÃO ESPECIAL:\n[Descreva aqui o termo ou obrigação acordada...]')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>+ Cláusula</span>
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\nParágrafo 1º: [Descreva o detalhe...]')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-800 text-xs font-medium cursor-pointer"
              >
                <span>+ Parágrafo</span>
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n- Item 1\n- Item 2\n- Item 3')}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-800 text-xs cursor-pointer"
                title="Lista com marcadores"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n\n------------------------------------------------------------\n\n')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-800 text-xs font-mono cursor-pointer"
                title="Linha divisória"
              >
                <span>---</span>
              </button>
            </div>

            {/* Quick Clause Snippets Insert Bar */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                Modelos de Cláusulas Adicionais Rápidas (1 Clique para Inserir):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertClause('pet')}
                  className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>🐾 Animais (Pets)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause('garagem')}
                  className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>🚗 Vaga de Garagem</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause('silencio')}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>🔇 Lei do Silêncio</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause('pintura')}
                  className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>🎨 Pintura Nova</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause('airbnb')}
                  className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>🚫 Proibição Airbnb</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause('solar')}
                  className="px-2.5 py-1 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>⚡ Energia Solar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause('reforma')}
                  className="px-2.5 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>🛠️ Obras e Reformas</span>
                </button>
              </div>
            </div>

            {/* Dynamic Variable Tags */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 block">
                Inserir Variáveis Dinâmicas do Contrato:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formData.locatario.nome || '{{locatario.nome}}')}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono border border-slate-200 cursor-pointer"
                  title="Inserir nome do locatário"
                >
                  [Nome Inquilino]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formatCurrencyBRL(formData.valores.aluguel))}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono border border-slate-200 cursor-pointer"
                  title="Inserir valor do aluguel"
                >
                  [Valor Aluguel]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formData.objeto.endereco)}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono border border-slate-200 cursor-pointer"
                  title="Inserir endereço do imóvel"
                >
                  [Endereço Imóvel]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(`dia ${formData.valores.diaVencimento} de cada mês`)}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono border border-slate-200 cursor-pointer"
                >
                  [Dia Vencimento]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formData.valores.chavePix)}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono border border-slate-200 cursor-pointer"
                >
                  [Chave PIX]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formData.vistoriaDigital.hashSha256)}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono border border-slate-200 cursor-pointer"
                >
                  [Hash SHA-256]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formatCurrencyBRL(formData.vendaInfo?.valorVenda || 0))}
                  className="px-2 py-0.5 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-mono border border-emerald-200 cursor-pointer font-bold"
                  title="Inserir valor total de venda"
                >
                  [Valor Venda]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formatCurrencyBRL(formData.vendaInfo?.sinalEntrada || 0))}
                  className="px-2 py-0.5 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-mono border border-emerald-200 cursor-pointer font-bold"
                  title="Inserir sinal de entrada / arras"
                >
                  [Sinal / Arras]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formatCurrencyBRL(formData.vendaInfo?.saldoFinanciamento || 0))}
                  className="px-2 py-0.5 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-mono border border-emerald-200 cursor-pointer"
                  title="Inserir saldo financiamento"
                >
                  [Saldo Financiamento]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formData.vendaInfo?.matriculaImovel || '000.000')}
                  className="px-2 py-0.5 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-mono border border-emerald-200 cursor-pointer"
                  title="Inserir matrícula do imóvel"
                >
                  [Matrícula RGI]
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(formData.vendaInfo?.cartorioRegistro || 'Cartório de Imóveis')}
                  className="px-2 py-0.5 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-mono border border-emerald-200 cursor-pointer"
                  title="Inserir cartório de registro"
                >
                  [Cartório]
                </button>
              </div>
            </div>
          </div>

          {/* Textarea Document Paper Area */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-700">Folha de Redação Contratual</span>
              <span>
                {customContractText.split(/\s+/).filter(Boolean).length} palavras | {customContractText.length} caracteres
              </span>
            </div>

            <textarea
              ref={contractTextAreaRef}
              value={customContractText}
              onChange={(e) => {
                setCustomContractText(e.target.value);
                setUseCustomText(true);
              }}
              rows={28}
              className="w-full p-4 text-xs sm:text-sm font-serif leading-relaxed text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-y shadow-inner"
              placeholder="Digite ou edite os termos do contrato aqui..."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-slate-600 font-medium">
                  {useCustomText ? 'Modo de Texto Personalizado ATIVO no contrato oficial' : 'Texto salvo em rascunho'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditorMode('modelos_template')}
                  className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Salvar como Novo Modelo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    onPreviewRequested();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Salvar e Visualizar Minuta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODE: TEMPLATE MANAGEMENT & QUICK INJECTION ("opção de envio de novos modelos de contrato, ou mesmo apos envio dos dados ter opção de enviar novo texto de contrato que o sistema so adiciona os dados do locatario e locador em questão, ou escolhe o tipo de contrato") */}
      {editorMode === 'modelos_template' && !isTenant && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Biblioteca de Modelos & Injeção de Minutas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Mesmo após o preenchimento ou envio dos dados, você pode escolher outro modelo ou colar qualquer texto de contrato externo. O sistema injeta automaticamente todas as qualificações do locatário/comprador e locador/vendedor.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!customContractText) {
                  setCustomContractText(generateContractFullText(formData));
                }
                setEditorMode('texto_livre');
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Abrir no Processador de Texto</span>
            </button>
          </div>

          {/* Quick Option 1: Paste any external raw contract text */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Colar Novo Texto de Contrato Bruto (Injeção Automática)
                </h4>
                <p className="text-xs text-slate-500">
                  Tem uma minuta personalizada em Word ou cartório? Cole abaixo para o sistema injetar instantaneamente os dados do locatário e locador já preenchidos.
                </p>
              </div>
            </div>

            <textarea
              value={pastedRawText}
              onChange={(e) => setPastedRawText(e.target.value)}
              rows={6}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-slate-900 leading-relaxed shadow-inner"
              placeholder="Cole aqui o texto do novo contrato... Use tags dinâmicas como {{LOCADOR_NOME}}, {{LOCATARIO_NOME}}, {{IMOVEL_ENDERECO}}, {{VALOR_ALUGUEL}}, {{VALOR_VENDA}}, {{CHAVE_PIX}} etc."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">
                Variáveis suportadas: <code>{'{{LOCADOR_NOME}}'}</code>, <code>{'{{LOCATARIO_NOME}}'}</code>, <code>{'{{VALOR_ALUGUEL}}'}</code>, <code>{'{{VALOR_VENDA}}'}</code>, <code>{'{{IMOVEL_ENDERECO}}'}</code>.
              </span>
              <button
                type="button"
                onClick={handleInjectDataIntoRawText}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Injetar Dados Atuais & Ir para Editor</span>
              </button>
            </div>
          </div>

          {/* Quick Option 2: Pre-defined & Custom Templates Library */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookmarkPlus className="w-4 h-4 text-amber-500" />
                  <span>Modelos de Contrato no Sistema</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Selecione o modelo desejado para aplicar à locação ou venda deste imóvel:
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'aluguel_residencial', label: 'Residencial' },
                  { id: 'venda_imovel', label: 'Compra e Venda' },
                  { id: 'aluguel_comercial', label: 'Comercial' },
                  { id: 'temporada', label: 'Temporada' },
                  { id: 'personalizado', label: 'Personalizados' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedTemplateCategory(f.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      selectedTemplateCategory === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templatesList
                .filter((t) => selectedTemplateCategory === 'todos' || t.categoria === selectedTemplateCategory)
                .map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          tpl.categoria === 'venda_imovel'
                            ? 'bg-emerald-100 text-emerald-900'
                            : tpl.categoria === 'temporada'
                            ? 'bg-amber-100 text-amber-900'
                            : tpl.categoria === 'aluguel_comercial'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {tpl.categoria.replace('_', ' ')}
                        </span>
                        {tpl.isDefault && (
                          <span className="text-[10px] text-slate-400 font-semibold">Oficial do Sistema</span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900">{tpl.titulo}</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {tpl.descricao}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Aplicar Modelo & Injetar Dados</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTemplateModal(tpl)}
                        className="py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        title="Ver esqueleto do modelo com tags dinâmicas"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Option 3: Save Current Contract as a New Reusable Template */}
          <form onSubmit={handleSaveCurrentAsTemplate} className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md space-y-4 border border-slate-700">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <BookmarkPlus className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Salvar a Minuta Deste Contrato como Novo Modelo do Sistema
                </h4>
                <p className="text-xs text-slate-400">
                  Gostou da redação que acabou de formatar? Salve-a no catálogo para aplicar com 1 clique a qualquer outro imóvel ou cliente no futuro.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Título do Novo Modelo</label>
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Ex: Minuta Padrão Imóveis Luxo com Vistoria 48h"
                  className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Categoria</label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                  className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="aluguel_residencial">Locação Residencial</option>
                  <option value="venda_imovel">Compra e Venda</option>
                  <option value="aluguel_comercial">Locação Comercial</option>
                  <option value="temporada">Temporada / Diárias</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Descrição ou Observações do Modelo</label>
                <input
                  type="text"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  placeholder="Ex: Utilizado para apartamentos com caução de 3 meses e vistoria pericial..."
                  className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Minuta como Novo Modelo</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. MODE: TENANT DOCUMENTS & PROFILE ("o inquilino tambem pode enviar seus dados e arquivos de informações") */}
      {editorMode === 'documentos_inquilino' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <Paperclip className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isTenant ? 'Envio de Dados & Documentos do Inquilino' : 'Documentos Comprobatórios do Inquilino'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTenant
                    ? 'Envie suas informações cadastrais e fotos/PDFs de documentos para validação da administração (LGPD Art. 18)'
                    : 'Confira, aprove ou solicite reenvio de documentos pessoais e comprovantes enviados pelo locatário'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Salvar Dados e Documentos</span>
            </button>
          </div>

          {/* Feedback message */}
          {docFeedbackMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{docFeedbackMsg}</span>
            </div>
          )}

          {/* Inquilino Personal Data Form (for tenant or admin editing tenant) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-amber-500" />
              <span>Qualificação Civil do(a) Locatário(a) (Inquilino)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.locatario.nome}
                  onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, nome: e.target.value } }))}
                  placeholder="Nome completo do inquilino"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF/MF *</label>
                <input
                  type="text"
                  value={formData.locatario.cpf}
                  onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, cpf: e.target.value } }))}
                  placeholder="000.000.000-00"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">RG / Órgão Emissor</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.locatario.rg}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, rg: e.target.value } }))}
                    placeholder="Número RG"
                    className="col-span-2 p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                  <input
                    type="text"
                    value={formData.locatario.orgaoExpedidor}
                    onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, orgaoExpedidor: e.target.value } }))}
                    placeholder="SSP/SP"
                    className="p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  value={formData.locatario.email}
                  onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, email: e.target.value } }))}
                  placeholder="email@exemplo.com.br"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  value={formData.locatario.telefone}
                  onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, telefone: e.target.value } }))}
                  placeholder="(11) 98765-4321"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Profissão</label>
                <input
                  type="text"
                  value={formData.locatario.profissao}
                  onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, profissao: e.target.value } }))}
                  placeholder="Ex: Engenheiro(a) de Software"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Civil</label>
                <input
                  type="text"
                  value={formData.locatario.estadoCivil}
                  onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, estadoCivil: e.target.value } }))}
                  placeholder="Solteiro(a), Casado(a)..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço Residencial de Origem</label>
                <input
                  type="text"
                  value={formData.locatario.endereco || ''}
                  onChange={(e) => handleUpdate((p) => ({ ...p, locatario: { ...p.locatario, endereco: e.target.value } }))}
                  placeholder="Rua, número, complemento, bairro, cidade/UF, CEP"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Document Upload Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                <span>Anexar Novo Arquivo / Documento de Comprovação</span>
              </h4>
              <span className="text-xs text-slate-500">
                Formatos aceitos: PDF, PNG, JPG ou JPEG (até 15MB)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria do Documento *
                </label>
                <select
                  value={selectedDocCategory}
                  onChange={(e) => setSelectedDocCategory(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="identidade">🪪 Documento de Identificação (RG / CNH)</option>
                  <option value="renda">💵 Comprovante de Renda (Holerite / Extrato)</option>
                  <option value="residencia">🏠 Comprovante de Residência Atual</option>
                  <option value="conjuge_fiador">💍 Documentos de Cônjuge ou Fiador</option>
                  <option value="outro">📁 Outros Documentos / Comprovantes</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <input
                  ref={tenantDocFileInputRef}
                  type="file"
                  onChange={handleUploadTenantFile}
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => tenantDocFileInputRef.current?.click()}
                  disabled={isUploadingTenantDoc}
                  className="w-full py-3 px-4 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50 rounded-xl text-xs font-semibold text-amber-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FileUp className="w-4 h-4 text-amber-600" />
                  <span>
                    {isUploadingTenantDoc
                      ? 'Processando arquivo...'
                      : 'Selecionar Arquivo no Dispositivo (Clique para Escolher)'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* List of Uploaded Documents */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Documentos Anexados ao Contrato ({tenantDocs.length})
              </span>
              <span className="text-xs text-slate-500">
                Armazenamento Seguro em Nuvem (Google Cloud Firestore)
              </span>
            </div>

            {tenantDocs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Paperclip className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">Nenhum documento anexado ainda</p>
                <p className="text-xs text-slate-500">
                  {isTenant
                    ? 'Envie sua CNH/RG e comprovante de renda utilizando o seletor acima.'
                    : 'O inquilino ainda não enviou os documentos comprobatórios.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tenantDocs.map((d) => (
                  <div key={d.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        {d.tipo.includes('pdf') ? (
                          <FileText className="w-5 h-5 text-red-600" />
                        ) : d.tipo.includes('image') ? (
                          <ImageIcon className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Paperclip className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                            {d.nome}
                          </h5>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            d.status === 'aprovado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'rejeitado'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {d.status === 'aprovado'
                              ? 'Aprovado'
                              : d.status === 'rejeitado'
                              ? 'Rejeitado'
                              : 'Em Análise'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="capitalize font-medium">
                            {d.categoria === 'identidade'
                              ? 'Documento com Foto (RG/CNH)'
                              : d.categoria === 'renda'
                              ? 'Comprovante de Renda'
                              : d.categoria === 'residencia'
                              ? 'Comprovante de Residência'
                              : d.categoria === 'conjuge_fiador'
                              ? 'Cônjuge / Fiador'
                              : 'Outro'}
                          </span>
                          <span>•</span>
                          <span>{(d.tamanho / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{new Date(d.dataEnvio).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {d.base64 && (
                        <button
                          type="button"
                          onClick={() => setSelectedDocPreview(d)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visualizar</span>
                        </button>
                      )}

                      {d.base64 && (
                        <a
                          href={d.base64}
                          download={d.nome}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      )}

                      {!isTenant && (
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                          <button
                            type="button"
                            onClick={() => handleApproveRejectDoc(d.id, 'aprovado')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Aprovar Documento"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveRejectDoc(d.id, 'rejeitado')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Rejeitar Documento"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveTenantDoc(d.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Excluir Arquivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Lightbox Preview Modal */}
      {selectedDocPreview && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedDocPreview(null)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-amber-500" />
                <span>{selectedDocPreview.nome}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDocPreview(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/5 min-h-[300px]">
              {selectedDocPreview.tipo.includes('image') && selectedDocPreview.base64 ? (
                <img
                  src={selectedDocPreview.base64}
                  alt={selectedDocPreview.nome}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : selectedDocPreview.tipo.includes('pdf') && selectedDocPreview.base64 ? (
                <iframe
                  src={selectedDocPreview.base64}
                  title={selectedDocPreview.nome}
                  className="w-full h-[65vh] rounded-lg border border-slate-200"
                />
              ) : (
                <div className="text-center space-y-2 p-8">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">{selectedDocPreview.nome}</p>
                  <p className="text-xs text-slate-500">Visualização integrada não suportada para este formato.</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
              <span>{(selectedDocPreview.tamanho / 1024).toFixed(1)} KB • {selectedDocPreview.categoria}</span>
              {selectedDocPreview.base64 && (
                <a
                  href={selectedDocPreview.base64}
                  download={selectedDocPreview.nome}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo Original</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OCR Inspector Modal for Quick Document Scanning */}
      <OcrInspectorModal
        file={editorOcrFile}
        isOpen={!!editorOcrFile}
        onClose={() => setEditorOcrFile(null)}
        onApplyToContract={handleEditorOcrApply}
      />

      {/* Lightbox Photo Preview Modal for Vistoria */}
      {selectedPhotoModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div 
            className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Registro Fotográfico da Vistoria Inicial</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/5 min-h-[320px]">
              <img 
                src={selectedPhotoModal} 
                alt="Foto vistoria ampliada" 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
              <span>Registro digital fotográfico integrante do Contrato de Locação (Cláusula 5)</span>
              <a
                href={selectedPhotoModal}
                download="vistoria-foto.jpg"
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Foto</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplateModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewTemplateModal(null)}
        >
          <div 
            className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900">{previewTemplateModal.titulo}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplateModal(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-slate-50/50 space-y-2">
              <p className="text-xs text-slate-600 italic">{previewTemplateModal.descricao}</p>
              <pre className="p-4 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                {previewTemplateModal.conteudoTexto}
              </pre>
            </div>
            <div className="p-3.5 border-t border-slate-200 flex items-center justify-between bg-white">
              <span className="text-xs text-slate-500">
                Ao aplicar, todas as tags como {'{{LOCADOR_NOME}}'} serão substituídas pelos dados reais deste contrato.
              </span>
              <button
                type="button"
                onClick={() => {
                  handleApplyTemplate(previewTemplateModal);
                  setPreviewTemplateModal(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Aplicar este Modelo Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
