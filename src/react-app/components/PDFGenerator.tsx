import { useState, useEffect } from 'react';
import {
  FileDown, Loader2, X, Image as ImageIcon,
  Layout, Target, ShieldCheck, Volume2
} from 'lucide-react';
import { InspectionType, InspectionItemType, InspectionMediaType, InspectionTemplateItem, InspectionHistoryEntry } from '@/shared/types';
import { calculateInspectionStats } from '@/shared/utils/compliance';
import { useToast } from '@/react-app/hooks/useToast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// New Imports
import { useMapSnapshot } from './pdf/hooks/useMapSnapshot';
import { generatePDFHTML } from './pdf/templates/inspection-report';



interface PDFGeneratorProps {
  inspection: InspectionType;
  items: InspectionItemType[];
  templateItems?: InspectionTemplateItem[];
  media: InspectionMediaType[];
  responses: Record<number, any>;
  signatures: { inspector?: string; responsible?: string };
  isOpen: boolean;
  onClose: () => void;
  qrCodeDataUrl?: string;
  shareLink?: string;
  actionItems?: any[];
  organizationLogoUrl?: string;
  parentOrganizationLogoUrl?: string;
  organizationName?: string;
  parentOrganizationName?: string;
  auditLogs?: InspectionHistoryEntry[];
}

export default function PDFGenerator({
  inspection,
  items,
  templateItems = [],
  media,
  responses,
  signatures,
  isOpen,
  onClose,
  qrCodeDataUrl,
  shareLink,
  actionItems = [],
  organizationLogoUrl,
  parentOrganizationLogoUrl,
  auditLogs = [],
}: PDFGeneratorProps) {
  // Helper to convert image URL to Base64
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return '';
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [primaryColor] = useState('#1e40af'); // Fixed blue
  const [compiaLogoB64, setCompiaLogoB64] = useState('');

  // Options States
  const [customLogoB64, setCustomLogoB64] = useState('');
  const [includeChecklist, setIncludeChecklist] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeActionPlan, setIncludeActionPlan] = useState(true);
  const [actionPlanMode, setActionPlanMode] = useState<'full' | 'compact' | 'inline'>('full');
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeQRCode, setIncludeQRCode] = useState(true);
  const [includeHeatmap, setIncludeHeatmap] = useState(true);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [logsMode, setLogsMode] = useState<'summary' | 'complete'>('summary');
  const [showLogos, setShowLogos] = useState(true);

  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Load Compia logo
      urlToBase64('/compia_logo.png')
        .then(base64 => {
          if (base64) setCompiaLogoB64(base64);
        });
    }
  }, [isOpen]);

  // Hook for map snapshot
  const { mapContainerRef, generateMapSnapshot } = useMapSnapshot({
    media,
    inspection,
    includeHeatmap
  });

  if (!isOpen) return null;

  // Calculate statistics using shared utility
  const stats = calculateInspectionStats(items, templateItems, responses);

  const getOptions = () => ({
    includeChecklist,
    includeStats,
    includeMedia,
    includeAudio,
    includeActionPlan,
    actionPlanMode,
    includeSignatures,
    includeQRCode,
    includeHeatmap,
    includeLogs,
    logsMode,
    showLogos,
    primaryColor,
    compiaLogoB64,
    customLogoB64,
    parentOrganizationLogoUrl,
    organizationLogoUrl
  });

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      success('Gerando PDF', 'Renderizando mapa e compilando dados... Por favor, aguarde.');

      // 1. Generate Map Image first
      const mapImageB64 = await generateMapSnapshot();

      const htmlContent = generatePDFHTML({
        inspection,
        items,
        templateItems,
        media,
        responses,
        signatures,
        qrCodeDataUrl,
        shareLink,
        actionItems,
        auditLogs,
        stats,
        options: getOptions(),
        mapImageB64
      });

      // Create Blob URL to avoid about:blank in print header
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      // Open with Blob URL
      const printWindow = window.open(blobUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (!printWindow) {
        URL.revokeObjectURL(blobUrl);
        throw new Error('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.');
      }

      // Print Window Handling
      printWindow.onerror = (msg, url, lineNo, columnNo, error) => {
        console.error('Erro na janela de PDF:', { msg, url, lineNo, columnNo, error });
        URL.revokeObjectURL(blobUrl);
        throw new Error('Erro ao carregar conteúdo do PDF');
      };

      await new Promise((resolve, reject) => {
        let resolved = false;
        printWindow.onload = () => { if (!resolved) { resolved = true; resolve(true); } };

        const checkReady = () => {
          if (printWindow.document.readyState === 'complete' && !resolved) {
            resolved = true;
            resolve(true);
          }
        };

        setTimeout(checkReady, 500);
        setTimeout(checkReady, 1000);
        setTimeout(() => { if (!resolved) { resolved = true; resolve(true); } }, 3000);
        setTimeout(() => { if (!resolved) { resolved = true; reject(new Error('Timeout ao carregar conteúdo do PDF')); } }, 10000);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      printWindow.focus();

      if (printWindow.closed) throw new Error('A janela foi fechada prematuramente');

      try {
        printWindow.print();
      } catch (printError) {
        console.warn('Erro ao abrir diálogo de impressão:', printError);
      }

      success('PDF Pronto', 'Relatório aberto em nova janela!');
      onClose();
    } catch (err) {
      console.error('Erro detalhado ao gerar PDF:', err);
      let errorMessage = 'Erro desconhecido ao gerar relatório';
      if (err instanceof Error) errorMessage = err.message;
      error('Erro ao Gerar PDF', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Mobile PDF Generation via html2canvas
  const handleDownloadMobile = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      success('Gerando PDF Mobile', 'Processando imagens e layout... Isso pode levar alguns segundos.');

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '0';
      container.style.width = '800px';
      container.style.backgroundColor = 'white';

      const mapImageB64 = await generateMapSnapshot();
      container.innerHTML = generatePDFHTML({
        inspection,
        items,
        templateItems,
        media,
        responses,
        signatures,
        qrCodeDataUrl,
        shareLink,
        actionItems,
        auditLogs,
        stats,
        options: getOptions(),
        mapImageB64
      });

      const fixedFooter = container.querySelector('.footer-fixed');
      if (fixedFooter) fixedFooter.remove();

      document.body.appendChild(container);

      // Wait for images
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      await new Promise(r => setTimeout(r, 1500));

      const canvas = await html2canvas(container, {
        // @ts-ignore
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 800
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;

      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      const addFooterToPage = (skipLogo = false) => {
        const margin = 10;
        const pageHeight = 297;
        const pageWidth = 210;

        if (compiaLogoB64 && !skipLogo) {
          try {
            const logoWidth = 12;
            const logoHeight = logoWidth * 0.35;
            pdf.addImage(compiaLogoB64, 'PNG', pageWidth - margin - logoWidth, pageHeight - margin - 5, logoWidth, logoHeight);
          } catch (e) {
            console.error('Error adding logo to PDF', e);
          }
        }
        if (!skipLogo) {
          pdf.setFontSize(8);
          pdf.setTextColor(100);
          pdf.text('compia.tech', pageWidth - margin, pageHeight - margin + 2, { align: 'right' });
        }
      };

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);

      const isSinglePage = imgHeight <= pdfHeight;
      addFooterToPage(isSinglePage);

      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        const isLastPage = heightLeft - pdfHeight <= 0;
        addFooterToPage(isLastPage);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Relatorio_Mobile_${inspection.id}.pdf`);
      document.body.removeChild(container);
      success('Concluído', 'PDF Mobile baixado com sucesso!');

    } catch (err) {
      console.error(err);
      error('Erro', 'Falha ao gerar PDF Mobile. Tente a opção Desktop.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileDown className="w-6 h-6 text-blue-600" />
              <h2 className="font-heading text-2xl font-bold text-slate-900">
                Gerar Relatório PDF
              </h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Preview Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">{inspection.title}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div><span className="font-medium">Total de Itens:</span> {stats.totalItems}</div>
                <div><span className="font-medium">Conformidade:</span> {stats.conformanceRate}%</div>
                <div><span className="font-medium">Mídias:</span> {media.length}</div>
                <div><span className="font-medium">Status:</span> {inspection.status === 'concluida' ? 'Finalizada' : 'Em andamento'}</div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {/* 1. Estrutura do Relatório */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-slate-700" />
                  <h3 className="font-semibold text-slate-900 text-sm">Estrutura do Relatório</h3>
                </div>
                <div className="p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeChecklist} onChange={e => setIncludeChecklist(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">Incluir Checklist Detalhado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showLogos} onChange={e => setShowLogos(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">Incluir Logos (Cabeçalho)</span>
                  </label>
                  {showLogos && (
                    <div className="ml-6 p-2 bg-slate-50 rounded border border-slate-200">
                      <label className="block text-xs text-slate-600 mb-1">Upload de Logo Customizada (opcional):</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setCustomLogoB64(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {customLogoB64 && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={customLogoB64} alt="Preview" className="h-8 object-contain rounded border" />
                          <button onClick={() => setCustomLogoB64('')} className="text-xs text-red-600 hover:underline">Remover</button>
                        </div>
                      )}
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeStats} onChange={e => setIncludeStats(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">Mostrar Estatísticas de Conformidade</span>
                  </label>
                </div>
              </div>

              {/* 2. Mídias e Evidências */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-700" />
                  <h3 className="font-semibold text-slate-900 text-sm">Mídias e Evidências</h3>
                </div>
                <div className="p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeMedia} onChange={e => setIncludeMedia(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">Incluir Imagens</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeAudio} onChange={e => setIncludeAudio(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-slate-700 text-sm">Referência a Áudios</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        Mostra ícone <Volume2 className="w-3 h-3 inline" /> com link para ouvir online
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Planos de Ação */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-700" />
                  <h3 className="font-semibold text-slate-900 text-sm">Planos de Ação</h3>
                </div>
                <div className="p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeActionPlan} onChange={e => setIncludeActionPlan(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">Incluir Plano de Ação (5W2H)</span>
                  </label>
                  {includeActionPlan && (
                    <div className="ml-6 p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                      <p className="text-xs font-semibold text-slate-700">Formato de Exibição:</p>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="actionPlanMode" checked={actionPlanMode === 'full'} onChange={() => setActionPlanMode('full')} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-xs text-slate-600">Completo (Cards Detalhados)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="actionPlanMode" checked={actionPlanMode === 'compact'} onChange={() => setActionPlanMode('compact')} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-xs text-slate-600">Compacto (Tabela Resumo)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="actionPlanMode" checked={actionPlanMode === 'inline'} onChange={() => setActionPlanMode('inline')} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-xs text-slate-600">Abaixo dos Itens (Lista Simples)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Validação e Rastreabilidade */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <h3 className="font-semibold text-slate-900 text-sm">Validação e Rastreabilidade</h3>
                </div>
                <div className="p-4 grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeSignatures} onChange={e => setIncludeSignatures(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">Assinaturas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeQRCode} onChange={e => setIncludeQRCode(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">QR Code</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeHeatmap} onChange={e => setIncludeHeatmap(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700 text-sm">Mapa de Calor (GPS)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={includeLogs} onChange={e => setIncludeLogs(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-slate-700 text-sm">Logs de Auditoria</span>
                    </label>
                    {includeLogs && (
                      <select
                        value={logsMode}
                        onChange={e => setLogsMode(e.target.value as 'summary' | 'complete')}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700"
                      >
                        <option value="summary">Resumido</option>
                        <option value="complete">Completo</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
              <div className="flex gap-3">
                <button
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                  PC / Print
                </button>
                <button
                  onClick={handleDownloadMobile}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                  Mobile
                </button>
              </div>
              <button onClick={onClose} className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
      {/* Hidden Map Container for Rendering */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '800px',
          height: '600px',
          visibility: 'visible'
        }}
      />
    </div>
  );
}
