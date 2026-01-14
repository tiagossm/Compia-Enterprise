import React, { useRef, useEffect, useState } from 'react';
import { Save, RotateCcw, Pen, Edit3 } from 'lucide-react';

interface SignerData {
  name: string;
  email?: string;
  role: string;
}

interface InspectionSignatureProps {
  onSignatureSaved: (signature: string, signerData?: SignerData) => void;
  existingSignature?: string;
  signerName: string;
  signerRole: string;
  signerEmail?: string;
  readonly?: boolean;
  editable?: boolean; // Allow editing name/email/role before signing
  signedAt?: string;
}

export default function InspectionSignature({
  onSignatureSaved,
  existingSignature,
  signerName,
  signerRole,
  signerEmail,
  readonly = false,
  editable = false,
  signedAt
}: InspectionSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!existingSignature);
  const [editedData, setEditedData] = useState<SignerData>({
    name: signerName,
    email: signerEmail || '',
    role: signerRole
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (increased for better quality)
    canvas.width = 800;
    canvas.height = 400;

    // Set line properties
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';

    // Clear canvas with white background first
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load existing signature if available
    if (existingSignature && existingSignature.trim() !== '') {
      console.log(`Loading existing signature for ${signerName}:`, existingSignature.substring(0, 50) + '...');
      const img = new Image();
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasSignature(true);
          console.log(`Successfully loaded signature for ${signerName}`);
        } catch (error) {
          console.error(`Error drawing signature for ${signerName}:`, error);
        }
      };
      img.onerror = (error) => {
        console.error(`Error loading signature image for ${signerName}:`, error);
      };
      img.src = existingSignature;
    }

    // Register touch events with passive: false to allow preventDefault
    const handleTouchStart = (e: TouchEvent) => {
      if (readonly) return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      setIsDrawing(true);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (readonly) return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setIsDrawing(false);
    };

    // Add event listeners with passive: false
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [existingSignature, signerName, readonly]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readonly) return;

    e.preventDefault(); // Prevent scrolling on touch

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readonly) return;

    e.preventDefault(); // Prevent scrolling on touch

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (readonly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    try {
      const dataURL = canvas.toDataURL('image/png');
      console.log(`Saving signature for ${editedData.name}:`, dataURL.substring(0, 50) + '...');
      // Pass edited data along with signature
      onSignatureSaved(dataURL, editable ? editedData : undefined);
    } catch (error) {
      console.error('Error generating signature:', error);
      alert('Erro ao salvar assinatura. Tente novamente.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
          Assinatura Digital
          {editable && <Edit3 className="w-4 h-4 text-blue-500" />}
        </h3>
        {editable && !readonly ? (
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Nome</label>
              <input
                type="text"
                value={editedData.name}
                onChange={(e) => setEditedData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-500">Email</label>
                <input
                  type="email"
                  value={editedData.email}
                  onChange={(e) => setEditedData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Cargo</label>
                <input
                  type="text"
                  value={editedData.role}
                  onChange={(e) => setEditedData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  placeholder="Ex: Gerente de SST"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">Data: {new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            <p><span className="font-medium">Nome:</span> {signerName}</p>
            {signerEmail && (
              <p><span className="font-medium">Email:</span> {signerEmail}</p>
            )}
            <p><span className="font-medium">Cargo:</span> {signerRole}</p>
            <p><span className="font-medium">Data:</span> {signedAt ? new Date(signedAt).toLocaleDateString('pt-BR') + ' ' + new Date(signedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-slate-300 rounded cursor-crosshair w-full h-48 sm:h-52"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{
            touchAction: 'none',
            minHeight: '180px',
            maxHeight: '220px'
          }}
        />

        {!readonly && !hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-slate-400">
              <Pen className="w-5 h-5" />
              <span className="text-sm">Assine aqui</span>
            </div>
          </div>
        )}
      </div>

      {!readonly && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-4">
          <button
            type="button"
            onClick={clearSignature}
            className="flex items-center justify-center px-3 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpar
          </button>
          <button
            type="button"
            onClick={saveSignature}
            disabled={!hasSignature}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Assinatura
          </button>
        </div>
      )}
    </div>
  );
}
