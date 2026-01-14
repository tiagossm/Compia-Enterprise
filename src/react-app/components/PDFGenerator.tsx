import { useState, useEffect, useRef } from 'react';
import {
  FileDown, Loader2, X, Image as ImageIcon,
  Layout, Target, ShieldCheck, Volume2
} from 'lucide-react';
import { InspectionType, InspectionItemType, InspectionMediaType } from '@/shared/types';
import { useToast } from '@/react-app/hooks/useToast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Hack to fix Leaflet's default icon path issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface AuditLogEntry {
  id: number;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  user_name?: string;
  created_at: string;
  ip_address?: string;
}

interface PDFGeneratorProps {
  inspection: InspectionType;
  items: InspectionItemType[];
  templateItems?: any[];
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
  auditLogs?: AuditLogEntry[];
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

  useEffect(() => {
    if (isOpen) {
      // Load Compia logo
      urlToBase64('/compia_logo.png')
        .then(base64 => {
          if (base64) setCompiaLogoB64(base64);
        });
    }
  }, [isOpen]);

  // Color options removed per user request

  const { success, error } = useToast();

  /* New Map Rendering Logic for PDF */
  const hiddenMapRef = useRef<HTMLDivElement>(null);

  const generateMapImage = async (): Promise<string> => {
    // Check if map is enabled and container exists
    if (!includeHeatmap || !hiddenMapRef.current) return '';

    // Filter valid media
    const validMedia = media.filter(m => {
      const lat = Number(m.latitude);
      const lng = Number(m.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    const hasInspectionGeo = inspection.location_start_lat && inspection.location_start_lng;

    if (validMedia.length === 0 && !hasInspectionGeo) return '';

    return new Promise((resolve) => {
      try {
        console.log("Generating Map Snapshot for PDF...");
        // Ensure container is empty
        if (hiddenMapRef.current) {
          hiddenMapRef.current.innerHTML = '';
        }

        // Initialize Map
        const map = L.map(hiddenMapRef.current!, {
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: false,
          zoomAnimation: false,
          dragging: false
        }).setView([-23.550520, -46.633308], 10);

        // Add Satellite Layer (Best for Reports)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '',
          maxNativeZoom: 17,
          maxZoom: 22
        }).addTo(map);

        const points: [number, number, number][] = [];
        const latlngs: [number, number][] = [];
        const bounds = L.latLngBounds([]);

        // Process Media Points
        validMedia.forEach(m => {
          const lat = Number(m.latitude);
          const lng = Number(m.longitude);

          points.push([lat, lng, 0.6]);
          latlngs.push([lat, lng]);
          bounds.extend([lat, lng]);

          // Marker
          L.marker([lat, lng], {
            icon: new L.Icon.Default()
          }).addTo(map);
        });

        // Process Inspection Start Point
        if (hasInspectionGeo) {
          const lat = Number(inspection.location_start_lat);
          const lng = Number(inspection.location_start_lng);
          bounds.extend([lat, lng]);
          L.marker([lat, lng], {
            icon: new L.Icon.Default()
          }).addTo(map);
        }

        // Perimeter
        if (latlngs.length > 2) {
          L.polygon(latlngs, {
            color: '#ef4444',
            weight: 3,
            opacity: 0.8,
            fillColor: '#ef4444',
            fillOpacity: 0.1,
            dashArray: '10, 10' // Larger dash for print visibility
          }).addTo(map);
        }

        // Heatmap
        if ((L as any).heatLayer && points.length > 0) {
          (L as any).heatLayer(points, {
            radius: 35, // Larger radius for static image
            blur: 25,
            maxZoom: 15,
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
          }).addTo(map);
        }

        // Fit Bounds
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Wait for tiles to load and then capture
        // 2.5 seconds to be safe for satellite tiles
        setTimeout(async () => {
          try {
            const canvas = await html2canvas(hiddenMapRef.current!, {
              useCORS: true,
              allowTaint: true,
              // @ts-ignore
              scale: 2, // Retain high quality
              logging: false,
              backgroundColor: null // Transparent background if possible
            });

            const imgData = canvas.toDataURL('image/png', 0.8);

            // Cleanup
            map.remove();
            if (hiddenMapRef.current) hiddenMapRef.current.innerHTML = '';

            resolve(imgData);
          } catch (e) {
            console.error("Map Html2Canvas Capture Error:", e);
            map.remove();
            resolve('');
          }
        }, 2500);

      } catch (err) {
        console.error("Map Generation Error:", err);
        resolve('');
      }
    });
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
      container.style.width = '800px'; // Fixed width to prevent cutoff
      container.style.backgroundColor = 'white';

      // Generate Map Image
      const mapImageB64 = await generateMapImage();
      container.innerHTML = generatePDFHTML(mapImageB64);

      // Remove fixed footer from HTML capture to avoid artifacts, we will add it manually in PDF
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

      // Extra delay for fonts
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

      // Helper to add footer to current page
      const addFooterToPage = (skipLogo = false) => {
        const margin = 10;
        const pageHeight = 297;
        const pageWidth = 210;

        if (compiaLogoB64 && !skipLogo) {
          try {
            const logoWidth = 12; // mm (Increased slightly for visibility)
            let logoHeight = logoWidth * 0.35; // Default aspect

            // Calculate aspect ratio to prevent distortion
            const props = pdf.getImageProperties(compiaLogoB64);
            if (props && props.width > 0) {
              const ratio = props.height / props.width;
              logoHeight = logoWidth * ratio;
            }

            // Position bottom right
            pdf.addImage(compiaLogoB64, 'PNG', pageWidth - margin - logoWidth, pageHeight - margin - 5, logoWidth, logoHeight);
          } catch (e) {
            console.error('Error adding logo to PDF', e);
            // Verify fallback behavior or just skip
          }
        }

        if (!skipLogo) {
          pdf.setFontSize(8);
          pdf.setTextColor(100); // Gray
          pdf.text('compia.tech', pageWidth - margin, pageHeight - margin + 2, { align: 'right' });
        }
      };

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);

      // If single page, check if we want to skip logo (usually single page means it's the last page too)
      // But for single page report, having branding is fine unless it overlaps.
      // Assuming 'last page' logic primarily for multi-page where the footer is at the end.
      // If it's a single page, heightLeft would be <= 0 immediately.
      // Let's check logic: heightLeft starts as imgHeight.
      // If imgHeight <= pdfHeight, it's 1 page.
      // We want to skip ONLY if it overlaps with the actual footer content.
      // Since we don't know exactly where the content ends visually vs the fixed footer, 
      // the user request specifically was "redundante na ultima pagina".
      // So we will skip it on the last page loop.

      const isSinglePage = imgHeight <= pdfHeight;
      // If it's single page, we might still want it if the content doesn't go to the bottom?
      // But user said "End of report" has the logo.
      // So safe to skip on last page always if the end of report footer is present.

      addFooterToPage(isSinglePage);

      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);

        // Check if this is the last page
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

  if (!isOpen) return null;

  const formatResponseValue = (value: any, fieldType: string) => {
    switch (fieldType) {
      case 'boolean':
        const isTrue = value === true || value === 'true';
        const isFalse = value === false || value === 'false';

        if (!isTrue && !isFalse) {
          return 'Não respondido';
        }

        return isTrue ? 'Conforme ✓' : 'Não Conforme ✗';
      case 'rating':
        if (value === null || value === undefined || value === '') {
          return 'Não respondido';
        }
        return `${value}/5 estrelas`;
      case 'multiselect':
        if (value === null || value === undefined || value === '') {
          return 'Não respondido';
        }
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
      default:
        if (value === null || value === undefined || value === '') {
          return 'Não respondido';
        }
        return String(value);
    }
  };

  // Calculate statistics
  const stats = {
    totalItems: 0,
    compliantItems: 0,
    nonCompliantItems: 0,
    conformanceRate: 0
  };

  // Debug log para entender os dados
  console.log('[PDFGenerator] Received data:', {
    items: items?.length || 0,
    templateItems: templateItems?.length || 0,
    media: media?.length || 0,
    responsesKeys: Object.keys(responses || {}).length
  });

  // Count manual items - always count all items, not just those with compliance set
  items.forEach(item => {
    stats.totalItems++;
    if (item.is_compliant === true) {
      stats.compliantItems++;
    } else if (item.is_compliant === false) {
      stats.nonCompliantItems++;
    }
  });

  // Count template items - use item.id to lookup responses (same as InspectionSummary)
  templateItems.forEach((item) => {
    stats.totalItems++;
    try {
      const fieldData = JSON.parse(item.field_responses);
      // Use item.id instead of fieldData.field_id - this is how responses are indexed
      const response = responses[item.id];

      if (fieldData.field_type === 'boolean') {
        if (response === true || response === 'true') {
          stats.compliantItems++;
        } else if (response === false || response === 'false') {
          stats.nonCompliantItems++;
        }
      } else if (response !== null && response !== undefined && response !== '') {
        stats.compliantItems++;
      }
    } catch (error) {
      console.error('Error processing template item:', error);
    }
  });

  stats.conformanceRate = stats.totalItems > 0 ? Math.round((stats.compliantItems / stats.totalItems) * 100) : 0;

  const generatePDFHTML = (mapImageB64: string = '') => {
    // Helper for Inline Mode: Track rendered actions to avoid duplication
    // We use a Set to track rendered action IDs or instances
    const renderedActions = new Set<any>();

    const getMatchingActions = (item: any) => {
      if (!includeActionPlan) return [];
      return actionItems.filter((action: any) => {
        // 1. Direct ID Match (if available)
        if (action.inspection_item_id && action.inspection_item_id === item.id) return true;

        // 2. Text Heuristic (Title contains Item Desc or vice-versa)
        // Normalize text
        const normTitle = (action.title || '').toLowerCase();
        const normDesc = (item.item_description || '').toLowerCase();
        const normWhat = (action.what_description || '').toLowerCase();

        // Safety check for empty strings
        if (!normTitle || !normDesc) return false;

        // Check inclusion (requires meaningful length overlap)
        if (normDesc.length > 5 && (normTitle.includes(normDesc) || normDesc.includes(normTitle))) return true;

        // 3. "What" description contains item desc
        if (normWhat && normDesc.length > 5 && normWhat.includes(normDesc)) return true;

        return false;
      });
    };
    // Helper to render Action Plan Section (prevents syntax errors in template)
    const renderActionPlanSection = () => {
      if (!includeActionPlan || actionItems.length === 0) return '';

      // Filter out actions already rendered in inline mode
      const remainingActions = actionPlanMode === 'inline'
        ? actionItems.filter((a: any) => !renderedActions.has(a))
        : actionItems;

      if (remainingActions.length === 0) return '';

      if (actionPlanMode === 'full') {
        return `
            <div class="page-break">
            <h2>Planos de Ação Executivos</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <p style="color: #1e40af; font-weight: 600; margin-bottom: 15px;">
                Total de ${actionItems.length} ${actionItems.length === 1 ? 'ação identificada' : 'ações identificadas'}
                </p>
                ${actionItems.map((action: any, index: number) => `
                <div class="checklist-item" style="margin-bottom: 20px; break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <h4 style="color: #111827; font-size: 16px; font-weight: 600; margin: 0;">${index + 1}. ${action.title}</h4>
                    <div style="display: flex; gap: 8px;">
                        <span style="background: ${action.priority === 'alta' || action.priority === 'critica' ? '#fef2f2; color: #991b1b' : action.priority === 'media' ? '#fefce8; color: #92400e' : '#f0fdf4; color: #166534'}; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${action.priority || 'média'}
                        </span>
                        <span style="background: ${action.status === 'completed' ? '#f0fdf4; color: #166534' : action.status === 'in_progress' ? '#eff6ff; color: #1d4ed8' : '#f3f4f6; color: #374151'}; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${action.status === 'pending' ? 'Pendente' : action.status === 'in_progress' ? 'Em Progresso' : action.status === 'completed' ? 'Concluído' : action.status}
                        </span>
                    </div>
                    </div>
                    
                    ${action.is_ai_generated ? `
                    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 6px; color: #7c3aed; font-size: 11px;">
                    <span>Gerado por Inteligência Artificial</span>
                    </div>` : ''}
                    
                    <div class="w5-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px;">
                    ${action.what_description ? `<div class="w5-card"><div class="w5-label">O que:</div><div class="w5-value">${action.what_description}</div></div>` : ''}
                    ${action.where_location ? `<div class="w5-card"><div class="w5-label">Onde:</div><div class="w5-value">${action.where_location}</div></div>` : ''}
                    ${action.why_reason ? `<div class="w5-card"><div class="w5-label">Por que:</div><div class="w5-value">${action.why_reason}</div></div>` : ''}
                    ${action.how_method ? `<div class="w5-card"><div class="w5-label">Como:</div><div class="w5-value">${action.how_method}</div></div>` : ''}
                    ${action.who_responsible ? `<div class="w5-card"><div class="w5-label">Quem:</div><div class="w5-value">${action.who_responsible}</div></div>` : ''}
                    ${action.when_deadline ? `<div class="w5-card"><div class="w5-label">Quando:</div><div class="w5-value">${new Date(action.when_deadline).toLocaleDateString('pt-BR')}</div></div>` : ''}
                    ${action.how_much_cost ? `<div class="w5-card" style="grid-column: 1/-1;"><div class="w5-label">Quanto:</div><div class="w5-value">${action.how_much_cost}</div></div>` : ''}
                    </div>
                    
                    ${action.assigned_to ? `
                    <div style="margin-top: 12px; padding: 8px; background: #f8fafc; border-radius: 4px; font-size: 11px;">
                    <span style="font-weight: 600; color: #374151;">Atribuído a:</span>
                    <span style="color: #111827; margin-left: 6px;">${action.assigned_to}</span>
                    </div>` : ''}
                </div>
                `).join('')}
            </div>
            </div>`;
      }

      if (actionPlanMode === 'compact') {
        return `
            <div class="page-break">
                <h2>Planos de Ação (Resumo)</h2>
                <table class="info-grid" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr style="background: #f8fafc;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 11px;">Ação / O que</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 11px;">Responsável</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 11px;">Prazo</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 11px;">Status</th>
                </tr>
                ${actionItems.map((action: any) => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <div style="font-weight: 600; color: #0f172a;">${action.title}</div>
                    <div style="color: #64748b; font-size: 10px; margin-top: 4px;">${action.what_description || ''}</div>
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${action.who_responsible || action.assigned_to || '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${action.when_deadline ? new Date(action.when_deadline).toLocaleDateString('pt-BR') : '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                        <span style="background: ${action.status === 'completed' ? '#f0fdf4; color: #166534' : action.status === 'in_progress' ? '#eff6ff; color: #1d4ed8' : '#f3f4f6; color: #374151'}; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                        ${action.status === 'pending' ? 'Pendente' : action.status === 'in_progress' ? 'Andamento' : action.status === 'completed' ? 'Concluído' : action.status}
                        </span>
                    </td>
                </tr>
                `).join('')}
                </table>
            </div>
            `;
      }

      // Inline mode remaining items
      return `
        <div style="margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
            <h3 style="font-size: 16px; color: #1e293b; margin-bottom: 15px;">Outras Ações Identificadas</h3>
            ${remainingActions.map((action: any, index: number) => `
            <div style="margin-bottom: 15px; padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; break-inside: avoid;">
                <div style="display: flex; justify-content: space-between;">
                    <div style="font-weight: 600; font-size: 13px; color: #0f172a;">${index + 1}. ${action.title}</div>
                    <div style="font-size: 10px; color: #64748b;">${action.priority || 'Média'}</div>
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: #334155;">
                    <strong>O que:</strong> ${action.what_description || 'N/A'}
                </div>
                <div style="margin-top: 4px; font-size: 11px; color: #334155;">
                    <strong>Como:</strong> ${action.how_method || 'N/A'}
                </div>
                <div style="margin-top: 6px; display: flex; gap: 10px; font-size: 10px; color: #64748b;">
                    <span>Resp: ${action.who_responsible || '-'}</span>
                    <span>Prazo: ${action.when_deadline ? new Date(action.when_deadline).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
            </div>
            `).join('')}
        </div>
      `;
    };

    // Icons for file types
    const ICONS = {
      pdf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      audio: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
      video: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
      file: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
    };

    const renderMediaSection = (itemMedia: any[]) => {
      if (!includeMedia || !itemMedia || itemMedia.length === 0) return '';

      const isImage = (m: any) => m.media_type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(m.file_name || '');
      const images = itemMedia.filter(isImage);
      const files = itemMedia.filter((m: any) => !isImage(m));

      if (images.length === 0 && files.length === 0) return '';

      return `
        <div class="media-section">
          <div class="response-label" style="margin-bottom: 8px;">Evidências (${itemMedia.length}):</div>
          ${images.length > 0 ? `
          <div class="media-grid">
            ${images.map((img: any) => `
              <div class="media-card">
                <img src="${img.file_url}" alt="${img.file_name}" />
                <div class="media-caption">
                    <div style="font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${img.file_name}</div>
                    ${img.latitude && img.longitude ? `
                    <div style="font-size: 8px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 2px;">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${Number(img.latitude).toFixed(6)}, ${Number(img.longitude).toFixed(6)}
                    </div>
                    ` : ''}
                </div>
              </div>
            `).join('')}
          </div>` : ''}
          
          ${files.length > 0 ? `
          <div class="files-grid">
            ${files.map((f: any) => {
        let icon = ICONS.file;
        let typeLabel = f.media_type ? f.media_type.toUpperCase() : 'ARQUIVO';
        const nameValues = f.file_name ? f.file_name.toLowerCase() : '';

        if (f.media_type === 'audio' || nameValues.endsWith('.webm') || nameValues.endsWith('.mp3')) {
          icon = ICONS.audio;
          typeLabel = 'ÁUDIO';
        } else if (f.media_type === 'video' || nameValues.endsWith('.mp4')) {
          icon = ICONS.video;
          typeLabel = 'VÍDEO';
        } else if (nameValues.endsWith('.pdf')) {
          icon = ICONS.pdf;
          typeLabel = 'PDF';
        }

        return `
              <div class="file-pill">
                <div class="file-layout">
                    <div class="file-icon-cell">
                        <div class="file-icon">${icon}</div>
                    </div>
                    <div class="file-info-cell">
                        <div class="file-name" title="${f.file_name}">${f.file_name}</div>
                        <div class="file-type">${typeLabel}</div>
                    </div>
                </div>
              </div>`;
      }).join('')}
          </div>` : ''}
        </div>`;
    };
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Inspeção - ${inspection.title}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <style>
    @page {
      margin: 15mm;
      size: A4;
    }
    @media print {
      body { 
        margin: 0; 
        padding: 15mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break { page-break-before: always; }
      .checklist-item { page-break-inside: avoid; }
      .signature-box { page-break-inside: avoid; }
      /* Ocultar header/footer padrão do navegador */
      @page { margin-top: 10mm; margin-bottom: 10mm; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.5; 
      color: #1f2937; 
      background: white;
      padding: 30px; 
      font-size: 12px;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      border-bottom: 1px solid #d1d5db; 
      padding-bottom: 20px;
    }
    .logos-container {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 20px;
      margin-bottom: 15px;
    }
    .logo { max-height: 120px; max-width: 300px; object-fit: contain; }
    .report-title {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    h1 { 
      color: #111827; 
      font-size: 22px; 
      font-weight: 600; 
      margin-bottom: 4px;
    }
    h2 { 
      color: ${primaryColor}; 
      font-size: 16px; 
      margin: 25px 0 12px 0; 
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
    }
    h3 { 
      color: #4b5563; 
      font-size: 14px; 
      margin: 15px 0 8px 0;
      font-weight: 600;
    }
    .meta-info { 
      font-size: 11px; 
      color: #9ca3af; 
      margin-top: 8px;
    }
    .info-grid { 
      display: table;
      width: 100%;
      margin: 15px 0;
      border: 1px solid #374151;
      border-collapse: collapse;
    }
    .info-row {
      display: table-row;
    }
    .info-item { 
      display: table-cell;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      vertical-align: top;
    }
    .info-label { 
      font-weight: 600; 
      color: #374151; 
      display: block;
      margin-bottom: 2px;
      font-size: 10px;
      text-transform: uppercase;
    }
    .info-value { color: #1f2937; font-size: 12px; }
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 15px; 
      margin: 20px 0;
    }
    .stat-card { 
      background: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 15px; 
      border-radius: 4px; 
      text-align: center;
    }
    .stat-card.compliant { border-left: 4px solid #10b981; }
    .stat-card.non-compliant { border-left: 4px solid #ef4444; }
    .stat-card.rate { border-left: 4px solid ${primaryColor}; }
    .stat-number { font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 25px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .checklist-item { 
      background: white;
      border: 1px solid #e5e7eb; 
      border-radius: 4px; 
      padding: 15px; 
      margin: 10px 0;
      page-break-inside: avoid;
    }
    .inline-action {
      margin-top: 12px;
      margin-left: 20px;
      padding: 12px;
      background: #fff1f2;
      border-left: 3px solid #e11d48;
      border-radius: 0 4px 4px 0;
    }
    .inline-action-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .item-header { 
      display: flex; 
      align-items: flex-start; 
      gap: 10px; 
      margin-bottom: 10px;
    }
    .item-number { 
      color: #6b7280; 
      font-weight: 600; 
      font-size: 12px;
      min-width: 25px;
    }
    .item-title { font-weight: 600; color: #111827; font-size: 14px; }
    .item-response { 
      background: #f9fafb; 
      padding: 10px; 
      border-radius: 4px; 
      margin: 8px 0;
      border-left: 3px solid #d1d5db;
    }
    .response-label { font-weight: 600; color: #6b7280; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; }
    .conforme { color: #059669; font-weight: 600; }
    .nao-conforme { color: #dc2626; font-weight: 600; }
    .media-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 12px; 
      margin: 12px 0;
    }
    .media-item { 
      border: 1px solid #d1d5db; 
      border-radius: 6px; 
      overflow: hidden;
      background: #f8fafc;
      break-inside: avoid;
      height: 300px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .media-item img { 
      width: auto; 
      height: auto;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain; 
      padding: 0;
      background: transparent;
    }
    .media-info { padding: 6px 8px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .media-filename { font-size: 9px; font-weight: 600; color: #374151; word-break: break-all; }
    .media-description { font-size: 8px; color: #6b7280; margin-top: 2px; }
    .signatures-section { 
      margin-top: 40px; 
      page-break-before: auto;
    }
    .signatures-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 30px; 
      margin-top: 20px;
    }
    .signature-box { 
      text-align: center; 
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }
    .signature-preview { 
      height: 100px; 
      border: 1px solid #e5e7eb; 
      border-radius: 4px; 
      margin: 10px 0;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .signature-preview img { max-height: 80px; max-width: 100%; object-fit: contain; }
    .signature-line { 
      border-top: 1px solid #374151; 
      margin: 15px auto 8px auto; 
      width: 200px;
    }
    .signature-name { font-weight: 600; color: #111827; font-size: 13px; }
    .signature-role { font-size: 11px; color: #6b7280; }
    .footer { 
      margin-top: 50px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb;
      font-size: 10px; 
      color: #9ca3af;
      text-align: center;
      page-break-inside: avoid;
    }
    .footer-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }
    .footer-logo {
        width: 24px;
        height: 24px;
        object-fit: contain;
        opacity: 0.8;
    }
    .footer-brand {
        font-size: 14px;
        font-weight: 700;
        color: #1e40af; /* Primary blue */
        letter-spacing: -0.5px;
    }
    .footer-legal {
        max-width: 400px;
        line-height: 1.4;
    }
    /* Media Styling */
    .media-section { margin-top: 10px; }
   /* Fix Media Grid to 3 Columns */
    /* Fix Media Grid to 3 Columns using legacy inline-block for max html2canvas compatibility */
    .media-grid { 
      display: block;
      width: 100%;
      margin-bottom: 10px;
      font-size: 0; /* Remove whitespace between inline-blocks */
    }
    .media-card {
      display: inline-block;
      width: 32%; /* Fixed 32% ~ 3 cols */
      margin-right: 1.33%;
      margin-bottom: 10px;
      vertical-align: top;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      background: white;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      font-size: 11px; /* Reset font size for content */
      break-inside: avoid;
    }
    .media-card:nth-child(3n) {
        margin-right: 0;
    }
    .media-card img {
        display: block;
        width: 100%;
        height: 100px;
        object-fit: cover;
        background: #f8fafc;
    }
    .media-caption {
        padding: 6px;
        font-size: 9px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
    }

    /* Files/Audio Grid Styling */
    .files-grid {
        display: block;
        width: 100%;
        margin-top: 10px;
        font-size: 0;
    }
    .file-pill {
        display: inline-block;
        width: 48%; /* 2 columns */
        margin-right: 2%;
        margin-bottom: 8px;
        padding: 8px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        border-radius: 6px;
        vertical-align: top;
        box-sizing: border-box;
    }
    .file-pill:nth-child(2n) {
        margin-right: 0;
    }
    .file-layout {
        display: table;
        width: 100%;
        border-collapse: collapse;
    }
    .file-icon-cell {
        display: table-cell;
        width: 30px;
        vertical-align: middle;
        text-align: center;
    }
    .file-info-cell {
        display: table-cell;
        vertical-align: middle;
        padding-left: 8px;
    }
    .file-icon svg {
        width: 24px; 
        height: 24px;
        display: block;
    }
    .file-name {
        font-size: 11px;
        font-weight: 600;
        color: #334155;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        width: 100%;
    }
    .file-type {
        font-size: 9px;
        color: #94a3b8;
        margin-top: 2px;
    }
    
    /* Indentation for content below question */
    .content-indented {
        margin-left: 35px;
        margin-top: 8px;
    }

    /* Icon Row in Header */
    .item-icons {
        display: flex;
        gap: 6px;
        margin-left: auto; /* Push to right or keep next to title? User said 'iconografia fiel' */
        align-items: center;
    }
    .item-icon-indicator {
        width: 16px;
        height: 16px;
        color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    ${(() => {
        if (!showLogos) return ''; // User disabled logos

        const logos = [];
        // Custom logo has priority
        if (customLogoB64) logos.push(customLogoB64);
        // Then organization logos if no custom
        if (parentOrganizationLogoUrl && !customLogoB64) logos.push(parentOrganizationLogoUrl);
        if (organizationLogoUrl && !customLogoB64) logos.push(organizationLogoUrl);

        if (logos.length === 0) return '';
        return `
    <div class="logos-container">
      ${logos.map(logo => `<img class="logo" src="${logo}" alt="Logo" />`).join('')}
    </div>`;
      })()}
    <div class="report-title">Relatório de Inspeção Técnica</div>
  </div>

  <!-- Inspection Header -->
  <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">${inspection.title}</h1>
        <p style="font-size: 13px; color: #64748b; margin: 0;">Detalhes da inspeção</p>
      </div>
      <div style="display: flex; gap: 8px;">
        ${inspection.priority ? `<span style="padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; background: ${inspection.priority === 'alta' || inspection.priority === 'critica' ? '#fef2f2; color: #991b1b' : inspection.priority === 'media' ? '#fefce8; color: #92400e' : '#f0fdf4; color: #166534'};">${inspection.priority}</span>` : ''}
        <span style="padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; background: ${inspection.status === 'concluida' ? '#f0fdf4; color: #166534' : inspection.status === 'em_andamento' ? '#fffbeb; color: #92400e' : '#f1f5f9; color: #475569'};">
          ${inspection.status === 'concluida' ? 'Concluída' : inspection.status === 'em_andamento' ? 'Em Andamento' : inspection.status === 'pendente' ? 'Pendente' : inspection.status === 'cancelada' ? 'Cancelada' : 'Rascunho'}
        </span>
      </div>
    </div>
    <p style="font-size: 11px; color: #94a3b8; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
  </div>

  <!-- Info Grid with Icons -->
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
    <!-- Empresa -->
    ${inspection.company_name ? `
    <div style="display: flex; gap: 12px;">
      <div style="width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">Empresa</p>
        <p style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0;">${inspection.company_name}</p>
      </div>
    </div>` : ''}
    
    <!-- Local -->
    <div style="display: flex; gap: 12px;">
      <div style="width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">Local</p>
        <p style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0;">${inspection.location}</p>
        ${inspection.address ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">${inspection.address}</p>` : ''}
      </div>
    </div>
    
    <!-- Inspetor -->
    <div style="display: flex; gap: 12px;">
      <div style="width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">
        ${inspection.inspector_avatar_url
        ? `<img src="${inspection.inspector_avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
      }
      </div>
      <div>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">Inspetor</p>
        <p style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0;">${inspection.inspector_name}</p>
        ${inspection.inspector_email ? `<p style="font-size: 11px; color: #3b82f6; margin: 2px 0 0 0;">${inspection.inspector_email}</p>` : ''}
      </div>
    </div>
  </div>

  <!-- Additional Info Row -->
  <div style="display: flex; gap: 40px; margin-bottom: 20px; flex-wrap: wrap;">
    ${inspection.cep ? `
    <div style="display: flex; gap: 12px; align-items: center;">
      <div style="width: 28px; height: 28px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div>
        <p style="font-size: 10px; color: #64748b; margin: 0;">CEP</p>
        <p style="font-size: 12px; font-weight: 500; color: #1e293b; margin: 0;">${inspection.cep}</p>
      </div>
    </div>` : ''}
    ${inspection.scheduled_date ? `
    <div style="display: flex; gap: 12px; align-items: center;">
      <div style="width: 28px; height: 28px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <div>
        <p style="font-size: 10px; color: #64748b; margin: 0;">Data da Inspeção</p>
        <p style="font-size: 12px; font-weight: 500; color: #1e293b; margin: 0;">${new Date(inspection.scheduled_date).toLocaleDateString('pt-BR')}</p>
      </div>
    </div>` : ''}
    ${inspection.responsible_name ? `
    <div style="display: flex; gap: 12px; align-items: center;">
      <div style="width: 28px; height: 28px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div>
        <p style="font-size: 10px; color: #64748b; margin: 0;">Responsável</p>
        <p style="font-size: 12px; font-weight: 500; color: #1e293b; margin: 0;">${inspection.responsible_name}</p>
        ${inspection.responsible_email ? `<p style="font-size: 10px; color: #3b82f6; margin: 1px 0 0 0;">${inspection.responsible_email}</p>` : ''}
      </div>
    </div>` : ''}
  </div>

  <!-- Description -->
  ${inspection.description ? `
  <div style="background: #f8fafc; border-left: 3px solid #3b82f6; padding: 12px 16px; margin-bottom: 25px; border-radius: 0 6px 6px 0;">
    <p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Descrição</p>
    <p style="font-size: 13px; color: #334155; margin: 0; line-height: 1.5;">${inspection.description}</p>
  </div>` : ''}

  ${includeStats ? `
  <h2>Estatísticas da Inspeção</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-number">${stats.totalItems}</div>
      <div class="stat-label">Total de Itens</div>
    </div>
    <div class="stat-card compliant">
      <div class="stat-number">${stats.compliantItems}</div>
      <div class="stat-label">Conformes</div>
    </div>
    <div class="stat-card non-compliant">
      <div class="stat-number">${stats.nonCompliantItems}</div>
      <div class="stat-label">Não Conformes</div>
    </div>
    <div class="stat-card rate">
      <div class="stat-number">${stats.conformanceRate}%</div>
      <div class="stat-label">Taxa de Conformidade</div>
    </div>
  </div>` : ''}

  ${includeChecklist && templateItems.length > 0 ? `
  <h2>Checklist Respondido</h2>
  ${templateItems.map((item, index) => {
        try {
          const fieldData = JSON.parse(item.field_responses);
          // Fix: Use item.id to lookup responses (consistent with stats calculation)
          const response = responses[item.id];
          const comment = (responses as Record<string, any>)[`comment_${item.id}`];
          const itemMedia = media.filter(m => m.inspection_item_id === item.id);

          // Determine icons based on content
          const hasImages = itemMedia.some(m => m.media_type === 'image');
          const hasAudio = itemMedia.some(m => m.media_type === 'audio');
          const hasFiles = itemMedia.some(m => m.media_type !== 'image' && m.media_type !== 'audio'); // Assuming other files are attachments

          // Icons SVGs
          const CameraIcon = hasImages ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>` : '';
          const MicIcon = hasAudio ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>` : '';
          const ClipIcon = hasFiles ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>` : '';

          return `
      <div class="checklist-item">
        <div class="item-header">
          <div class="item-number">${index + 1}</div>
          <div class="item-title">${item.item_description}</div>
          <div class="item-icons">
             ${CameraIcon}
             ${MicIcon}
             ${ClipIcon}
          </div>
        </div>

        <div class="content-indented">
            <div class="item-response">
            <div class="response-label">Resposta:</div>
            <div class="${response === true || response === 'true' ? 'conforme' : response === false || response === 'false' ? 'nao-conforme' : ''}">${formatResponseValue(response, fieldData.field_type)}</div>
            </div>
            ${comment ? `
            <div class="item-response">
            <div class="response-label">Observação:</div>
            <div>${comment}</div>
            </div>` : ''}
            ${item.ai_pre_analysis ? `
            <div class="ai-analysis">
            <div class="ai-label">Análise IA:</div>
            <div>${item.ai_pre_analysis}</div>
            </div>` : ''}
            ${includeActionPlan && item.ai_action_plan ? (() => {
              try {
                const actionPlan = JSON.parse(item.ai_action_plan);
                if (!actionPlan?.actions?.length) return '';
                return `
                <div class="action-plan">
                <h4>Plano de Ação (IA)</h4>
                ${actionPlan.summary ? `<p style="margin-bottom: 10px;">${actionPlan.summary}</p>` : ''}
                ${actionPlan.actions.map((action: any, i: number) => `
                    <div class="action-item">
                    <strong>Ação ${i + 1}:</strong> ${action.item || action.what}
                    <div class="w5-grid">
                        <div class="w5-card"><div class="w5-label">O que:</div><div class="w5-value">${action.what}</div></div>
                        <div class="w5-card"><div class="w5-label">Onde:</div><div class="w5-value">${action.where}</div></div>
                        <div class="w5-card"><div class="w5-label">Por que:</div><div class="w5-value">${action.why}</div></div>
                        <div class="w5-card"><div class="w5-label">Como:</div><div class="w5-value">${action.how}</div></div>
                        <div class="w5-card"><div class="w5-label">Quando:</div><div class="w5-value">${action.when}</div></div>
                        <div class="w5-card"><div class="w5-label">Quem:</div><div class="w5-value">${action.who}</div></div>
                        <div class="w5-card" style="grid-column: 1/-1;"><div class="w5-label">Quanto:</div><div class="w5-value">${action.how_much}</div></div>
                    </div>
                    </div>
                `).join('')}
                </div>`;
              } catch (e) {
                return '';
              }
            })() : ''
            }
            ${renderMediaSection(itemMedia)}
        </div>
      </div>`;
        } catch (e) {
          return '';
        }
      }).join('')}` : ''
      }

  ${includeChecklist && items.length > 0 ? `
  <h2>Itens Manuais</h2>
  ${items.map((item, index) => {
        const itemMedia = media.filter(m => m.inspection_item_id === item.id);
        const hasImages = itemMedia.some(m => m.media_type === 'image');
        const hasAudio = itemMedia.some(m => m.media_type === 'audio');

        const CameraIcon = hasImages ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>` : '';
        const MicIcon = hasAudio ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>` : '';

        return `
    <div class="checklist-item">
      <div class="item-header">
        <div class="item-number">${index + 1}</div>
        <div>
          <div class="item-title">${item.item_description}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">📂 ${item.category}</div>
        </div>
        <div class="item-icons">
             ${CameraIcon}
             ${MicIcon}
        </div>
      </div>
      <div class="content-indented">
          <div class="item-response">
            <div class="response-label">Status:</div>
            <div class="${item.is_compliant === true ? 'conforme' : item.is_compliant === false ? 'nao-conforme' : ''}">
              ${item.is_compliant === true ? 'Conforme ✓' : item.is_compliant === false ? 'Não Conforme ✗' : 'Não Avaliado'}
            </div>
          </div>
          ${item.observations ? `
          <div class="item-response">
            <div class="response-label">Observações:</div>
            <div>${item.observations}</div>
          </div>` : ''}
          ${renderMediaSection(itemMedia)}

          ${(() => {
            if (actionPlanMode !== 'inline') return '';
            const matchingActions = getMatchingActions(item);
            if (matchingActions.length === 0) return '';
            matchingActions.forEach(a => renderedActions.add(a));
            return matchingActions.map(action => `
               <div class="inline-action">
                   <div class="inline-action-header">
                       <span style="font-weight: 600; color: #9f1239; font-size: 13px;">⚡ Plano de Ação: ${action.title}</span>
                       <span style="font-size: 9px; padding: 2px 6px; background: white; border-radius: 4px;">${action.priority || 'Média'}</span>
                   </div>
                   <div style="font-size: 11px; color: #881337;">
                      ${action.what_description || 'Ação corretiva necessária.'}
                   </div>
                   <div style="margin-top: 6px; font-size: 10px; color: #881337; display: flex; gap: 12px;">
                        <span><strong>Quem:</strong> ${action.who_responsible || '-'}</span>
                        <span><strong>Quando:</strong> ${action.when_deadline ? new Date(action.when_deadline).toLocaleDateString('pt-BR') : '-'}</span>
                   </div>
               </div>
             `).join('');
          })()}
      </div>
    </div>`;
      }).join('')}` : ''
      }

  ${renderActionPlanSection()}

  ${includeSignatures ? `
  <div class="signatures-section page-break">
    <h2>Assinaturas Digitais</h2>
    <div class="signatures-grid">
      <div class="signature-box">
        <div class="signature-label">Assinatura do Inspetor</div>
        ${signatures.inspector ? `
          <div class="signature-preview">
            <img src="${signatures.inspector}" alt="Assinatura Inspetor" />
          </div>
        ` : '<div class="signature-preview" style="color: #ccc;">Pendente</div>'}
        <div class="signature-line"></div>
        <div class="signature-name">${inspection.inspector_name}</div>
        <div class="signature-role">Inspetor Responsável</div>
        ${inspection.completed_date ? `<div class="signature-role" style="font-size: 9px; margin-top: 2px;">Data: ${new Date(inspection.completed_date).toLocaleString('pt-BR')}</div>` : ''}
      </div>
      
      <div class="signature-box">
        <div class="signature-label">Assinatura do Responsável</div>
        ${signatures.responsible ? `
          <div class="signature-preview">
            <img src="${signatures.responsible}" alt="Assinatura Responsável" />
          </div>
        ` : '<div class="signature-preview" style="color: #ccc;">Pendente</div>'}
        <div class="signature-line"></div>
        <div class="signature-name">${inspection.responsible_name || 'Não definido'}</div>
        <div class="signature-role">${inspection.responsible_role || 'Cliente / Responsável'}</div>
        ${inspection.completed_date && signatures.responsible ? `<div class="signature-role" style="font-size: 9px; margin-top: 2px;">Data: ${new Date(inspection.completed_date).toLocaleString('pt-BR')}</div>` : ''}
      </div>
    </div>
  </div>` : ''
      }

  ${includeHeatmap ? `
  <div class="page-break">
    <h2>Mapa de Calor (GPS)</h2>
    <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; break-inside: avoid;">
       <div style="height: 480px; width: 100%; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
          ${mapImageB64 ? `<img src="${mapImageB64}" style="width:100%; height:100%; object-fit:cover;" />` : '<span style="color:#94a3b8;">Mapa indisponível</span>'}
       </div>
       <div style="padding: 8px; background: #fff; color: #64748b; font-size: 10px; text-align: center; border-top: 1px solid #e2e8f0;">
         Visualização de densidade e pontos de evidência georreferenciados.
       </div>
    </div>
  </div>` : ''
      }

  ${includeLogs ? `
  <div class="page-break">
    <h2>Histórico de Auditoria${logsMode === 'complete' ? ' (Completo)' : ''}</h2>
    <table class="info-grid" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr style="background: #f8fafc;">
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">Evento</th>
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">Data/Hora</th>
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">Detalhes</th>
        ${logsMode === 'complete' ? '<th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">Usuário</th>' : ''}
      </tr>
      ${logsMode === 'complete' && auditLogs.length > 0 ? auditLogs.map(log => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <span style="background: ${log.action === 'FINALIZE' ? '#dcfce7' : log.action === 'DELETE' ? '#fee2e2' : log.action === 'REOPEN' ? '#fef3c7' : '#e0f2fe'}; color: ${log.action === 'FINALIZE' ? '#166534' : log.action === 'DELETE' ? '#991b1b' : log.action === 'REOPEN' ? '#92400e' : '#1e40af'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
            ${(() => {
          const actionMap: Record<string, string> = {
            'FINALIZE': 'Finalização',
            'REOPEN': 'Reabertura',
            'UPDATE': 'Edição',
            'CREATE': 'Criação',
            'DELETE': 'Exclusão',
            'MEDIA_UPLOAD': 'Upload de Mídia',
            'MEDIA_DELETE': 'Exclusão de Mídia'
          };
          return actionMap[log.action] || log.action;
        })()}
          </span>
          ${log.field_changed ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">Campo: ${log.field_changed}</div>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${new Date(log.created_at).toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          ${log.old_value && log.new_value ? `<span style="color: #991b1b; text-decoration: line-through;">${log.old_value.substring(0, 50)}</span> → <span style="color: #166534;">${log.new_value.substring(0, 50)}</span>` : log.new_value || log.old_value || '-'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${log.user_name || 'Sistema'}</td>
      </tr>
      `).join('') : `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Criação</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(inspection.created_at).toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Inspetor: ${inspection.inspector_name}</td>
      </tr>
      ${inspection.started_at_user_time ? `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Início Execução</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(inspection.started_at_user_time).toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          ${inspection.location_start_lat ? `GPS: ${inspection.location_start_lat.toFixed(6)}, ${inspection.location_start_lng?.toFixed(6)}` : 'Local não registrado'}
        </td>
      </tr>` : ''}
      ${inspection.completed_date ? `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Conclusão</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(inspection.completed_date).toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          Status: ${inspection.status}
        </td>
      </tr>` : ''}
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Emissão do Relatório</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date().toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Via Sistema Compia</td>
      </tr>
      `}
    </table>
  </div>` : ''
      }

  ${qrCodeDataUrl ? `
      <div class="page-break" style="text-align: center; margin-top: 40px; padding: 30px; border-top: 3px solid ${primaryColor}; background: linear-gradient(135deg, #f0f9ff, #e0f2fe);">
    <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px;">
      Acesse o Relatório Digital
    </h2>
    
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px; align-items: center; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center;">
        <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); display: inline-block;">
          <img src="${qrCodeDataUrl}" alt="QR Code do Relatório" style="width: 150px; height: 150px; display: block;">
        </div>
        <p style="font-size: 12px; color: ${primaryColor}; margin-top: 15px; font-weight: 600;">
          Escaneie com a câmera do celular
        </p>
      </div>
      
      <div style="text-align: left;">
        <h3 style="color: ${primaryColor}; font-size: 16px; margin-bottom: 15px;">Recursos Digitais:</h3>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px; line-height: 1.8;">
          <li style="margin-bottom: 8px;"><strong>Evidências Interativas:</strong> Visualize fotos, vídeos e áudios</li>
          <li style="margin-bottom: 8px;"><strong>GPS Navegável:</strong> Coordenadas clicáveis para mapas</li>
          <li style="margin-bottom: 8px;"><strong>Análises da IA:</strong> Planos de ação detalhados</li>
          <li style="margin-bottom: 8px;"><strong>Assinaturas Digitais:</strong> Verificação de autenticidade</li>
          <li style="margin-bottom: 8px;"><strong>Dashboard Dinâmico:</strong> Estatísticas atualizadas</li>
        </ul>
        
        ${shareLink ? `
        <div style="margin-top: 20px; padding: 10px; background: white; border-radius: 8px; border: 1px solid #d1d5db;">
          <p style="font-size: 10px; color: #374151; margin: 0 0 5px 0;"><strong>🔗 Link direto:</strong></p>
          <p style="font-size: 9px; color: #6b7280; word-break: break-all; margin: 0;">${shareLink}</p>
        </div>
        ` : ''}
      </div>
    </div>
  </div>
  ` : ''
      }

                      <div class="footer">
                        <div class="footer-content">
                           <div style="margin-bottom: 8px;">
                               <img class="footer-logo" src="${compiaLogoB64 || '/compia_logo.png'}" alt="Compia" onerror="this.style.display='none'" />
                           </div>
                           <div class="footer-brand">Compia.tech</div>
                           <div class="footer-legal">
                               Relatório gerado automaticamente<br/>
                               Este documento possui validade legal conforme legislação vigente<br/>
                               Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                           </div>
                           ${inspection.latitude && inspection.longitude ? `
                           <div style="font-size: 9px; margin-top: 4px;"><strong>GPS:</strong> 
                               <a href="https://www.google.com/maps/search/?api=1&query=${inspection.latitude},${inspection.longitude}" target="_blank" style="color: #2563eb;">
                               ${Number(inspection.latitude).toFixed(6)}, ${Number(inspection.longitude).toFixed(6)}
                               </a>
                           </div>` : ''}
                           <div style="font-size: 9px; color: #cbd5e1; margin-top: 4px;">
                               Mídias completas: Disponíveis na versão digital
                           </div>
                           <div style="margin-top: 8px;">
                                © ${new Date().getFullYear()} Compia - Todos os direitos reservados | compia.app
                           </div>
                        </div>
                      </div>

  <!-- Map Logic Handled via Server-Side Rendering (Image Injection) -->
</body >
</html > `;
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      // Show initial progress
      success('Gerando PDF', 'Renderizando mapa e compilando dados... Por favor, aguarde.');

      // 1. Generate Map Image first
      const mapImageB64 = await generateMapImage();

      const htmlContent = generatePDFHTML(mapImageB64);

      // Create Blob URL to avoid about:blank in print header
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      // Open with Blob URL - this gives the window a proper URL instead of about:blank
      const printWindow = window.open(blobUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (!printWindow) {
        URL.revokeObjectURL(blobUrl); // Clean up
        throw new Error('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.');
      }

      // Set up error handling for the new window
      printWindow.onerror = (msg, url, lineNo, columnNo, error) => {
        console.error('Erro na janela de PDF:', { msg, url, lineNo, columnNo, error });
        URL.revokeObjectURL(blobUrl); // Clean up
        throw new Error('Erro ao carregar conteúdo do PDF');
      };
      // Enhanced loading wait with multiple fallbacks
      await new Promise((resolve, reject) => {
        let resolved = false;

        // Primary load event
        printWindow.onload = () => {
          if (!resolved) {
            resolved = true;
            resolve(true);
          }
        };

        // Fallback for when document is ready
        const checkReady = () => {
          if (printWindow.document.readyState === 'complete' && !resolved) {
            resolved = true;
            resolve(true);
          }
        };

        // Check readiness multiple times
        setTimeout(checkReady, 500);
        setTimeout(checkReady, 1000);
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(true); // Force resolve after timeout
          }
        }, 3000);

        // Error timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Timeout ao carregar conteúdo do PDF'));
          }
        }, 10000);
      });

      // Additional delay to ensure all images are loaded
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Focus window and trigger print dialog
      printWindow.focus();

      // Check if window is still available before printing
      if (printWindow.closed) {
        throw new Error('A janela foi fechada prematuramente');
      }

      // Trigger print dialog with error handling
      try {
        printWindow.print();
      } catch (printError) {
        console.warn('Erro ao abrir diálogo de impressão:', printError);
        // Even if print dialog fails, the window is open for manual printing
      }

      success('PDF Pronto', 'Relatório aberto em nova janela! Use Ctrl+P (Windows) ou Cmd+P (Mac) para imprimir/salvar. Se a impressão não abriu automaticamente, use o menu do navegador.');

      // Don't auto-close the window - let user control it
      // User can close it manually after printing/saving

      onClose();
    } catch (err) {
      console.error('Erro detalhado ao gerar PDF:', err);

      let errorMessage = 'Erro desconhecido ao gerar relatório';
      let errorTitle = 'Erro ao Gerar PDF';

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        errorMessage = err.message;

        if (msg.includes('pop-up') || msg.includes('janela')) {
          errorTitle = 'Bloqueador de Pop-ups';
          errorMessage = 'Desative o bloqueador de pop-ups do seu navegador e tente novamente.';
        } else if (msg.includes('timeout')) {
          errorTitle = 'Timeout';
          errorMessage = 'O PDF demorou muito para carregar. Tente novamente com menos imagens ou conteúdo.';
        } else if (msg.includes('fechada')) {
          errorTitle = 'Janela Fechada';
          errorMessage = 'A janela do PDF foi fechada. Tente gerar o relatório novamente.';
        }
      }

      error(errorTitle, errorMessage);
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
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Preview Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                {inspection.title}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Total de Itens:</span> {stats.totalItems}
                </div>
                <div>
                  <span className="font-medium">Conformidade:</span> {stats.conformanceRate}%
                </div>
                <div>
                  <span className="font-medium">Mídias:</span> {media.length}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {inspection.status === 'concluida' ? 'Finalizada' : 'Em andamento'}
                </div>
              </div>
            </div>

            {/* Options */}
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

            {/* Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2">📄 Será incluído no PDF:</h4>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>✓ Informações da inspeção e estatísticas</li>
                <li>✓ Todas as respostas do checklist</li>
                <li>✓ Análises da IA (quando disponíveis)</li>
                {includeMedia && <li>✓ Evidências visuais (fotos, vídeos, áudios)</li>}
                {includeActionPlan && <li>✓ Planos de ação 5W2H detalhados</li>}
                {includeSignatures && <li>✓ Assinaturas digitais</li>}
                <li>✓ Rodapé com data/hora de geração</li>
              </ul>
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
              <button
                onClick={onClose}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Hidden Map Container for Rendering */}
      <div
        ref={hiddenMapRef}
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
