import { PenTool } from 'lucide-react';
import { useState } from 'react';

interface SignaturePreviewProps {
  signature?: string;
  signerName: string;
  signerRole: string;
  title: string;
  showDate?: boolean;
}

export default function SignaturePreview({
  signature,
  signerName,
  signerRole,
  title,
  showDate = true
}: SignaturePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const hasSignature = signature && signature.trim() !== '';
  const displayName = signerName || "(sem nome)";

  return (
    <div className="border border-slate-200 rounded-lg p-4 print:border-gray-400">
      <h3 className={`font-medium mb-2 ${hasSignature ? 'text-slate-900' : 'text-slate-500'}`}>
        {title}
      </h3>

      <div className={`rounded p-3 mb-2 min-h-[80px] flex items-center justify-center ${hasSignature ? 'bg-slate-50 print:bg-gray-100' : 'bg-slate-100'
        }`}>
        {hasSignature ? (
          <img
            src={signature}
            alt={title}
            className={`max-h-16 max-w-full object-contain ${imageError ? 'hidden' : ''}`}
            style={{
              WebkitPrintColorAdjust: 'exact',
              colorAdjust: 'exact'
            }}
            onError={() => setImageError(true)}
            onLoad={() => {
              console.log(`${title} loaded successfully`);
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <PenTool className="w-6 h-6" />
            <span className="text-sm italic">Assinatura não disponível</span>
          </div>
        )}

        {imageError && (
          <div className="flex items-center gap-2 text-red-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">Erro ao carregar assinatura</span>
          </div>
        )}

      </div>

      <div className={`text-sm ${hasSignature ? 'text-slate-600' : 'text-slate-500'}`}>
        <p><strong>Nome:</strong> {displayName}</p>
        <p><strong>Cargo:</strong> {signerRole}</p>
        {showDate && (
          <p><strong>Data:</strong> {new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
        )}
      </div>
    </div>
  );
}
