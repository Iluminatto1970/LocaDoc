import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ContractData } from '../types/contract';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  QrCode, Copy, Check, ExternalLink, X, Smartphone, 
  Share2, ShieldCheck, Download, Clock 
} from 'lucide-react';

interface QrCodeModalProps {
  contract: ContractData;
  isOpen: boolean;
  onClose: () => void;
  onOpenPublicView: (contract: ContractData) => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  contract,
  isOpen,
  onClose,
  onOpenPublicView,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);

  useEffect(() => {
    if (!isOpen) return;

    const generateAndPublish = async () => {
      setIsPublishing(true);
      try {
        const shareId = contract.publicShareId || `share-${contract.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;
        const baseUrl = window.location.origin;
        const targetUrl = `${baseUrl}/?view=public&id=${shareId}`;
        setShareUrl(targetUrl);

        // Generate QR code data URL
        const dataUrl = await QRCode.toDataURL(targetUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(dataUrl);

        // Store public share in Firestore and localStorage
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const sharePayload = {
          id: shareId,
          contractId: contract.id,
          userId: contract.userId || 'anonymous',
          titulo: contract.titulo,
          contractData: contract,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        };

        // Local cache for offline/instant read
        localStorage.setItem(`locadoc_public_${shareId}`, JSON.stringify(contract));

        // Firestore cloud save
        try {
          await setDoc(doc(db, 'public_contracts', shareId), sharePayload);
        } catch (dbErr) {
          console.warn('Salvando localmente, Firestore opcional:', dbErr);
        }
      } catch (err) {
        console.error('Erro ao gerar QR code:', err);
      } finally {
        setIsPublishing(false);
      }
    };

    generateAndPublish();
  }, [isOpen, contract, expiresInDays]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QRCode_Contrato_${contract.titulo.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">QR Code de Acesso Rápido</h3>
              <p className="text-[11px] text-slate-400">Visualização pública para celular das partes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-center">
          <p className="text-xs text-slate-600 leading-relaxed">
            Aponte a câmera do celular para abrir o contrato formatado e o <strong>Anexo I de Vistoria</strong> diretamente em tela cheia móvel.
          </p>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-xs relative inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code do Contrato"
                  className="w-56 h-56 object-contain rounded-lg"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Link Box */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
              URL Pública de Visualização:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0 flex items-center gap-1 border border-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Expiration and actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Validade:</span>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                className="p-1 text-xs border border-slate-300 rounded bg-white text-slate-800 font-medium"
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={365}>1 ano</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Salvar Imagem</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPublicView(contract);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Ver Modo Celular</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
