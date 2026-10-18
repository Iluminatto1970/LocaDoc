import React, { useState, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { UploadedDocFile, ContractData, DocumentTargetRole } from '../types/contract';
import { calculateSHA256 } from '../utils/defaults';
import { useAuth } from '../context/AuthContext';
import { 
  Upload, FileText, Image as ImageIcon, FileCheck, Trash2, 
  Sparkles, CheckCircle2, ShieldCheck, Copy, Check, AlertCircle, FilePlus2, 
  Layers, ScanText, User, Building2, KeyRound, Home, Camera, Shield, Eye, Settings
} from 'lucide-react';
import { OcrInspectorModal } from './OcrInspectorModal';

interface DocumentUploaderProps {
  onContractGenerated: (contract: ContractData) => void;
  currentContract: ContractData;
  onOpenSettings?: () => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onContractGenerated,
  currentContract,
  onOpenSettings,
}) => {
  const { user } = useAuth();
  const isTenant = user?.role === 'cliente';

  const [files, setFiles] = useState<UploadedDocFile[]>([]);
  const [activeZone, setActiveZone] = useState<DocumentTargetRole>('locador');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [ocrModalFile, setOcrModalFile] = useState<UploadedDocFile | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const locadorInputRef = useRef<HTMLInputElement>(null);
  const locatarioInputRef = useRef<HTMLInputElement>(null);
  const imovelInputRef = useRef<HTMLInputElement>(null);
  const globalInputRef = useRef<HTMLInputElement>(null);

  const handleOcrApply = (target: 'locador' | 'locatario' | 'fiador' | 'objeto', ocr: any) => {
    if (isTenant && target !== 'locatario') {
      setErrorMessage('Por segurança e LGPD, inquilinos só podem aplicar dados em seu próprio cadastro (Locatário).');
      return;
    }

    const updatedContract = { ...currentContract };
    if (target === 'locador') {
      updatedContract.locador = {
        ...updatedContract.locador,
        nome: ocr.nomeCompleto || updatedContract.locador.nome,
        cpf: ocr.cpf || updatedContract.locador.cpf,
        rg: ocr.rg || updatedContract.locador.rg,
        orgaoExpedidor: ocr.orgaoExpedidor || updatedContract.locador.orgaoExpedidor,
        dataNascimento: ocr.dataNascimento || updatedContract.locador.dataNascimento,
        nacionalidade: ocr.nacionalidade || updatedContract.locador.nacionalidade,
        estadoCivil: ocr.estadoCivil || updatedContract.locador.estadoCivil,
        endereco: ocr.enderecoCompleto || updatedContract.locador.endereco,
      };
    } else if (target === 'locatario') {
      updatedContract.locatario = {
        ...updatedContract.locatario,
        nome: ocr.nomeCompleto || updatedContract.locatario.nome,
        cpf: ocr.cpf || updatedContract.locatario.cpf,
        rg: ocr.rg || updatedContract.locatario.rg,
        orgaoExpedidor: ocr.orgaoExpedidor || updatedContract.locatario.orgaoExpedidor,
        dataNascimento: ocr.dataNascimento || updatedContract.locatario.dataNascimento,
        nacionalidade: ocr.nacionalidade || updatedContract.locatario.nacionalidade,
        estadoCivil: ocr.estadoCivil || updatedContract.locatario.estadoCivil,
        endereco: ocr.enderecoCompleto || updatedContract.locatario.endereco,
      };
      updatedContract.vistoLocatario = ocr.nomeCompleto?.split(' ')[0] || updatedContract.vistoLocatario;
    } else if (target === 'fiador') {
      updatedContract.garantia = {
        ...updatedContract.garantia,
        tipo: 'fiador',
        fiadorNome: ocr.nomeCompleto || updatedContract.garantia.fiadorNome,
        fiadorCpf: ocr.cpf || updatedContract.garantia.fiadorCpf,
        fiadorRg: ocr.rg || updatedContract.garantia.fiadorRg,
        fiadorOrgaoExpedidor: ocr.orgaoExpedidor || updatedContract.garantia.fiadorOrgaoExpedidor,
        fiadorEndereco: ocr.enderecoCompleto || updatedContract.garantia.fiadorEndereco,
        fiadorNacionalidade: ocr.nacionalidade || 'Brasileiro',
        fiadorEstadoCivil: ocr.estadoCivil || 'Casado',
      };
    } else if (target === 'objeto') {
      updatedContract.objeto = {
        ...updatedContract.objeto,
        endereco: ocr.enderecoCompleto || updatedContract.objeto.endereco,
      };
    }
    onContractGenerated(updatedContract);
  };

  const guessRoleFromFilename = (filename: string): DocumentTargetRole => {
    const lower = filename.toLowerCase();
    if (lower.includes('locador') || lower.includes('proprietario') || lower.includes('iluminatto')) return 'locador';
    if (lower.includes('locatario') || lower.includes('inquilino') || lower.includes('mariana')) return 'locatario';
    if (lower.includes('fiador') || lower.includes('avalista')) return 'fiador';
    if (lower.includes('laudo') || lower.includes('vistoria') || lower.includes('inventario') || lower.includes('foto') || lower.includes('mobilia')) return 'laudo';
    if (lower.includes('imovel') || lower.includes('iptu') || lower.includes('matricula') || lower.includes('residencia') || lower.includes('comprovante')) return 'imovel';
    return 'outro';
  };

  // Handle file selections with explicit or inferred targetRole
  const handleFileSelection = async (selectedFiles: FileList | File[], explicitRole?: DocumentTargetRole) => {
    setErrorMessage('');
    const newFiles: UploadedDocFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const hash = await calculateSHA256(file);
        
        // Read file as base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;

        const role = explicitRole || (activeZone !== 'outro' ? activeZone : guessRoleFromFilename(file.name));

        newFiles.push({
          id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          base64,
          sha256: hash,
          previewUrl: file.type.startsWith('image/') ? base64 : undefined,
          targetRole: role,
          tag: role === 'locador' ? 'rg_locador' : role === 'locatario' ? 'rg_locatario' : role === 'imovel' ? 'imovel' : role === 'laudo' ? 'laudo' : 'outro',
        });
      } catch (err) {
        console.error('Erro ao ler arquivo:', err);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent, role?: DocumentTargetRole) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files, role || activeZone);
    }
  };

  const updateFileRole = (id: string, newRole: DocumentTargetRole) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          return {
            ...f,
            targetRole: newRole,
            tag: newRole === 'locador' ? 'rg_locador' : newRole === 'locatario' ? 'rg_locatario' : newRole === 'imovel' ? 'imovel' : newRole === 'laudo' ? 'laudo' : 'outro',
          };
        }
        return f;
      })
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const loadSampleScenario = () => {
    setErrorMessage('');
    const sampleFiles: UploadedDocFile[] = [
      {
        id: 'sample-1',
        name: 'CNH_Locador_Iluminatto_Moraes.pdf',
        size: 348920,
        type: 'application/pdf',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        tag: 'rg_locador',
        targetRole: 'locador',
        description: 'Documento oficial do Locador (Proprietário)',
      },
      {
        id: 'sample-2',
        name: 'RG_Locataria_Mariana_Duarte.jpg',
        size: 852100,
        type: 'image/jpeg',
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        tag: 'rg_locatario',
        targetRole: 'locatario',
        description: 'Documento oficial do Locatário (Inquilino)',
      },
      {
        id: 'sample-3',
        name: 'Comprovante_Residencia_e_IPTU_Moema.pdf',
        size: 512000,
        type: 'application/pdf',
        sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        tag: 'imovel',
        targetRole: 'imovel',
        description: 'Dados cadastrais e endereço oficial do imóvel',
      },
      {
        id: 'sample-4',
        name: 'Relatorio_Fotos_Inventario_Mobiliado.pdf',
        size: 1420000,
        type: 'application/pdf',
        sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        tag: 'laudo',
        targetRole: 'laudo',
        description: 'Laudo fotográfico pericial do mobiliário (Cláusula 5.2)',
      },
    ];

    setFiles(sampleFiles);
    setExtraInstructions(
      'Aluguel mensal acordado de R$ 4.800,00 com vencimento no dia 10 via PIX (iluminatto@gmail.com). Garantia por caução equivalente a 3 meses de aluguel. Reajuste pelo IPCA. Manter o inventário completo de todos os eletrodomésticos e móveis da vistoria.'
    );
  };

  const handleGenerateContract = async () => {
    if (files.length === 0 && !extraInstructions.trim()) {
      setErrorMessage('Por favor, adicione ao menos um documento com distinção de Locador ou Locatário, ou insira as especificações da locação.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setProcessingStep('Iniciando análise com separação estrita de Locador e Locatário...');

    try {
      const timer1 = setTimeout(() => {
        setProcessingStep('Processando documentos do Locador (qualificação civil, endereço, conta PIX)...');
      }, 1000);

      const timer2 = setTimeout(() => {
        setProcessingStep('Processando documentos do Locatário (identificação, RG, CPF, estado civil)...');
      }, 2400);

      const timer3 = setTimeout(() => {
        setProcessingStep('Compilando especificações do imóvel, vistoria e gerando ANEXO I com hash SHA-256...');
      }, 4000);

      // Call server backend with targetRole declared
      const payloadFiles = files
        .filter((f) => f.base64)
        .map((f) => ({
          name: f.name,
          mimeType: f.type,
          base64: f.base64,
          targetRole: f.targetRole,
        }));

      // Combined instructions with filenames & roles & hashes
      const hashesSummary = files
        .map((f) => `Arquivo: "${f.name}" | Destinação: ${f.targetRole.toUpperCase()} | SHA-256: ${f.sha256}`)
        .join('\n');

      const fullInstructions = `
${extraInstructions}

DISTRIBUIÇÃO DOS DOCUMENTOS ANEXADOS POR TITULARIDADE:
${hashesSummary}

Use o hash do laudo/vistoria abaixo para a Cláusula 5.2:
${files.find((f) => f.targetRole === 'laudo')?.sha256 || files[0]?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
`;

      const response = await apiFetch('/api/extract-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: payloadFiles,
          instructions: fullInstructions,
          existingData: currentContract,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Falha ao processar os documentos no servidor.');
      }

      const extracted = result.data;

      // Merge into complete contract structure
      const newContract: ContractData = {
        ...currentContract,
        id: `contrato-${Date.now()}`,
        titulo: `Contrato de Locação - ${extracted.objeto?.endereco ? extracted.objeto.endereco.split(',')[0] : 'Imóvel Mobiliado'}`,
        updatedAt: new Date().toISOString(),
        status: 'gerado',
        locador: {
          ...currentContract.locador,
          ...(extracted.locador || {}),
        },
        locatario: {
          ...currentContract.locatario,
          ...(extracted.locatario || {}),
        },
        objeto: {
          ...currentContract.objeto,
          ...(extracted.objeto || {}),
        },
        prazo: {
          ...currentContract.prazo,
          ...(extracted.prazo || {}),
        },
        valores: {
          ...currentContract.valores,
          ...(extracted.valores || {}),
        },
        vistoriaDigital: {
          ...currentContract.vistoriaDigital,
          hashSha256: files.find((f) => f.targetRole === 'laudo')?.sha256 || files[0]?.sha256 || extracted.vistoriaDigital?.hashSha256 || currentContract.vistoriaDigital.hashSha256,
          linkNuvem: extracted.vistoriaDigital?.linkNuvem || currentContract.vistoriaDigital.linkNuvem,
          prazoContestacaoHoras: extracted.vistoriaDigital?.prazoContestacaoHoras || 48,
        },
        garantia: {
          ...currentContract.garantia,
          ...(extracted.garantia || {}),
        },
        foro: {
          ...currentContract.foro,
          ...(extracted.foro || {}),
        },
        testemunhas: extracted.testemunhas && extracted.testemunhas.length >= 2
          ? [extracted.testemunhas[0], extracted.testemunhas[1]]
          : currentContract.testemunhas,
        inventario: extracted.inventario && extracted.inventario.length > 0
          ? extracted.inventario.map((item: any, idx: number) => ({
              id: `item-${Date.now()}-${idx}`,
              comodo: item.comodo || 'Sala de Estar',
              item: item.item || 'Item Mobiliário',
              marcaModelo: item.marcaModelo || 'Padrão',
              estado: item.estado || 'Bom estado de conservação',
              observacoes: item.observacoes || 'Sem avarias',
            }))
          : currentContract.inventario,
        vistoLocador: extracted.locador?.nome ? extracted.locador.nome.split(' ')[0] : currentContract.vistoLocador,
        vistoLocatario: extracted.locatario?.nome ? extracted.locatario.nome.split(' ')[0] : currentContract.vistoLocatario,
      };

      onContractGenerated(newContract);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro inesperado na geração do contrato. Verifique seus arquivos.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const locadorCount = files.filter((f) => f.targetRole === 'locador').length;
  const locatarioCount = files.filter((f) => f.targetRole === 'locatario').length;
  const imovelCount = files.filter((f) => f.targetRole === 'imovel' || f.targetRole === 'laudo').length;
  const fiadorCount = files.filter((f) => f.targetRole === 'fiador').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Intro Hero Strip */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                Processamento Documental Digital Automatizado
              </span>
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Distinção Locador × Locatário
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Entrada de Documentos com Distinção de Partes
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Carregue fotos ou PDFs e informe claramente se o documento pertence ao{' '}
              <strong className="text-blue-700 font-semibold">Locador (Proprietário)</strong> ou ao{' '}
              <strong className="text-emerald-700 font-semibold">Locatário (Inquilino)</strong>. 
              Isso impede a mistura de CPFs, RGs e dados bancários e gera o contrato oficial e o{' '}
              <strong className="text-slate-800 font-semibold">ANEXO I – Laudo de Vistoria</strong> com total segurança.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center justify-center gap-2 border border-amber-300 cursor-pointer"
                title="Configurar Chaves LLM (Gemini, OpenAI, etc.) ou Endpoint Customizado"
              >
                <Settings className="w-4 h-4 text-amber-600" />
                <span>Configurar APIs & Endpoints</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadSampleScenario}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4 text-slate-600" />
              <span>Carregar Cenário de Exemplo</span>
            </button>
            <span className="text-[11px] text-slate-400 text-center">
              Inclui CNH Locador, RG Locatária, IPTU e Laudo
            </span>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-blue-700 uppercase">Doc. Locador</p>
              <p className="text-base font-bold text-blue-900">{locadorCount} anexado(s)</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase">Doc. Locatário</p>
              <p className="text-base font-bold text-emerald-900">{locatarioCount} anexado(s)</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase">Imóvel & Laudo</p>
              <p className="text-base font-bold text-amber-900">{imovelCount} anexado(s)</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-purple-700 uppercase">Garantia / Fiador</p>
              <p className="text-base font-bold text-purple-900">{fiadorCount} anexado(s)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Distinction Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Locador */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => handleDrop(e, 'locador')}
          className="bg-white rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-900 rounded-md flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>1. DOCUMENTOS DO LOCADOR</span>
              </span>
              <span className="text-xs font-semibold text-blue-700">Proprietário</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              CNH, RG, CPF e Comprovante de Residência
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Envie fotos ou PDFs dos documentos civis do proprietário e dados bancários/chave PIX para recebimento do aluguel.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <input
              ref={locadorInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'locador')}
            />
            <button
              type="button"
              onClick={() => locadorInputRef.current?.click()}
              className="w-full py-2.5 px-4 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center gap-2 border border-blue-200 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Anexar Documento do Locador</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Ou arraste e solte arquivos aqui
            </p>
          </div>
        </div>

        {/* Card 2: Locatário */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => handleDrop(e, 'locatario')}
          className="bg-white rounded-2xl p-6 border-2 border-emerald-200 hover:border-emerald-400 transition-all shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-900 rounded-md flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. DOCUMENTOS DO LOCATÁRIO</span>
              </span>
              <span className="text-xs font-semibold text-emerald-700">Inquilino</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              CNH, RG, CPF, Holerite ou Comprovante do Inquilino
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Envie fotos ou PDFs dos documentos do inquilino para qualificação pessoal, estado civil e profissão.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <input
              ref={locatarioInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'locatario')}
            />
            <button
              type="button"
              onClick={() => locatarioInputRef.current?.click()}
              className="w-full py-2.5 px-4 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Anexar Documento do Locatário</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Ou arraste e solte arquivos aqui
            </p>
          </div>
        </div>

      </div>

      {/* Complementary Zone: Imóvel, Laudo de Vistoria & Fiador */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => handleDrop(e, 'laudo')}
        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <Camera className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Documentos do Imóvel, Fotos de Mobília & Laudo de Vistoria (ANEXO I)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Anexe fotos de eletrodomésticos, carnê de IPTU, matrícula do imóvel ou CNH do Fiador.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <input
            ref={imovelInputRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'laudo')}
          />
          <button
            type="button"
            onClick={() => imovelInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Anexar Imóvel / Vistoria</span>
          </button>
        </div>
      </div>

      {/* Uploaded File List with Role Switcher & SHA-256 Hashes */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Documentos Carregados e Distinção de Partes ({files.length})
              </span>
              <span className="text-[11px] text-slate-400">
                (Clique nas etiquetas para reatribuir)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors font-medium cursor-pointer"
            >
              Remover todos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {files.map((file) => {
              const isLocador = file.targetRole === 'locador';
              const isLocatario = file.targetRole === 'locatario';
              const isImovel = file.targetRole === 'imovel';
              const isLaudo = file.targetRole === 'laudo';
              const isFiador = file.targetRole === 'fiador';

              return (
                <div
                  key={file.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    isLocador
                      ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                      : isLocatario
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                      : isLaudo || isImovel
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Thumbnail or File Type Icon */}
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative group">
                        {file.previewUrl ? (
                          <img
                            src={file.previewUrl}
                            alt={file.name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setPreviewImage(file.previewUrl!)}
                            title="Clique para ampliar imagem"
                          />
                        ) : file.type.includes('pdf') ? (
                          <FileText className="w-5 h-5 text-red-600" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        {file.sha256 && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]" title={file.sha256}>
                              SHA-256: {file.sha256.substring(0, 14)}...
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(file.sha256!)}
                              title="Copiar Hash SHA-256"
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {copiedHash === file.sha256 ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setOcrModalFile(file)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Ver dados lidos via OCR óptico"
                      >
                        <ScanText className="w-3.5 h-3.5 text-amber-600" />
                        <span>OCR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Excluir arquivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Explicit Role Assignment Selector */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Destinação:
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => updateFileRole(file.id, 'locador')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isLocador
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50'
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                        <span>Locador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateFileRole(file.id, 'locatario')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isLocatario
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        <User className="w-3 h-3" />
                        <span>Locatário</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateFileRole(file.id, 'laudo')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isLaudo || isImovel
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        <span>Vistoria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateFileRole(file.id, 'fiador')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isFiador
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>Fiador</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional instructions box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Instruções Específicas ou Ajustes Particulares (Opcional)
          </label>
          <textarea
            rows={3}
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder="Exemplo: Aluguel de R$ 4.800, vencimento todo dia 10 via PIX (iluminatto@gmail.com). Garantia por caução de 3 meses. Manter o inventário completo de todos os eletrodomésticos e móveis da vistoria..."
            className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-900 resize-none leading-relaxed"
          />
          <p className="text-[11px] text-slate-500">
            A inteligência artificial respeitará estritamente a separação entre documentos do Locador e do Locatário ao redigir o contrato.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit action */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleGenerateContract}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
              isProcessing
                ? 'bg-amber-600/70 text-white cursor-wait'
                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-[0.99]'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando documentos com distinção de partes...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span>Gerar Contrato de Locação & ANEXO I com Dados Separados</span>
              </>
            )}
          </button>

          {isProcessing && processingStep && (
            <p className="text-xs text-center text-slate-600 mt-2.5 animate-pulse font-medium">
              {processingStep}
            </p>
          )}
        </div>
      </div>

      {/* Trust & Legal Integrity Note */}
      <div className="p-4 bg-slate-100 rounded-xl border border-slate-200/80 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">
            Blindagem Pericial & Integridade Cadastral
          </p>
          <p className="leading-relaxed">
            A categorização inequívoca de documentos entre Locador e Locatário atende às exigências de segurança jurídica 
            da Lei nº 8.245/91 e à proteção de dados pessoais (LGPD). As imagens de vistoria são carimbadas com 
            hash SHA-256 e vinculadas à Cláusula 5.2.
          </p>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Visualização ampliada" className="max-h-[80vh] w-auto object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-900"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* OCR Inspector Modal */}
      <OcrInspectorModal
        file={ocrModalFile}
        isOpen={!!ocrModalFile}
        onClose={() => setOcrModalFile(null)}
        onApplyToContract={handleOcrApply}
      />

    </div>
  );
};
