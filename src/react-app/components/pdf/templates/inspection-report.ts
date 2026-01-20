import { InspectionType, InspectionItemType, InspectionMediaType, InspectionTemplateItem, ActionItem, InspectionHistoryEntry } from '@/shared/types';
import { formatResponseValue } from '@/shared/utils/formatters';

interface GeneratePDFHTMLProps {
  inspection: InspectionType;
  items: InspectionItemType[];
  templateItems: InspectionTemplateItem[];
  media: InspectionMediaType[];
  responses: Record<number, any>;
  signatures: { inspector?: string; responsible?: string };
  qrCodeDataUrl?: string;
  shareLink?: string;
  actionItems: ActionItem[];
  auditLogs: InspectionHistoryEntry[];
  stats: any;
  options: {
    includeChecklist: boolean;
    includeStats: boolean;
    includeMedia: boolean;
    includeAudio: boolean;
    includeActionPlan: boolean;
    actionPlanMode: 'full' | 'compact' | 'inline';
    includeSignatures: boolean;
    includeQRCode: boolean;
    includeHeatmap: boolean;
    includeLogs: boolean;
    logsMode: 'summary' | 'complete';
    showLogos: boolean;
    primaryColor: string;
    compiaLogoB64?: string;
    customLogoB64?: string;
    parentOrganizationLogoUrl?: string;
    organizationLogoUrl?: string;
  };
  mapImageB64?: string;
}

export const generatePDFHTML = ({
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
  options,
  mapImageB64
}: GeneratePDFHTMLProps) => {
  const {
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
  } = options;

  // Helper handling inline actions to deduplicate
  const renderedActions = new Set<any>();

  const getMatchingActions = (item: any) => {
    if (!includeActionPlan) return [];
    return actionItems.filter((action: any) => {
      // 1. Direct ID Match
      if (action.inspection_item_id && action.inspection_item_id === item.id) return true;

      // 2. Text Heuristic
      const normTitle = (action.title || '').toLowerCase();
      const normDesc = (item.item_description || '').toLowerCase();
      const normWhat = (action.what_description || '').toLowerCase();

      if (!normTitle || !normDesc) return false;

      // Check inclusion
      if (normDesc.length > 5 && (normTitle.includes(normDesc) || normDesc.includes(normTitle))) return true;

      // 3. What description
      if (normWhat && normDesc.length > 5 && normWhat.includes(normDesc)) return true;

      return false;
    });
  };

  const renderActionPlanSection = () => {
    if (!includeActionPlan || actionItems.length === 0) return '';

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
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    @page { margin: 15mm; size: A4; }
    @media print {
      body { margin: 0; padding: 15mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
      .checklist-item, .signature-box, .media-card { page-break-inside: avoid; }
      @page { margin-top: 10mm; margin-bottom: 10mm; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.5; color: #1f2937; background: white; padding: 30px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #d1d5db; padding-bottom: 20px; }
    .logos-container { display: flex; justify-content: flex-end; align-items: center; gap: 20px; margin-bottom: 15px; }
    .logo { max-height: 120px; max-width: 300px; object-fit: contain; }
    .report-title { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    h1 { color: #111827; font-size: 22px; font-weight: 600; margin-bottom: 4px; }
    h2 { color: ${primaryColor}; font-size: 16px; margin: 25px 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
    h3 { color: #4b5563; font-size: 14px; margin: 15px 0 8px 0; font-weight: 600; }
    .info-grid { display: table; width: 100%; margin: 15px 0; border: 1px solid #374151; border-collapse: collapse; }
    .info-row { display: table-row; }
    .info-item { display: table-cell; padding: 8px 12px; border: 1px solid #d1d5db; vertical-align: top; }
    .info-label { font-weight: 600; color: #374151; display: block; margin-bottom: 2px; font-size: 10px; text-transform: uppercase; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: #ffffff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; text-align: center; }
    .stat-card.compliant { border-left: 4px solid #10b981; }
    .stat-card.non-compliant { border-left: 4px solid #ef4444; }
    .stat-card.rate { border-left: 4px solid ${primaryColor}; }
    .stat-number { font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .checklist-item { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 15px; margin: 10px 0; page-break-inside: avoid; }
    .inline-action { margin-top: 12px; margin-left: 20px; padding: 12px; background: #fff1f2; border-left: 3px solid #e11d48; border-radius: 0 4px 4px 0; }
    .inline-action-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .item-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
    .item-number { color: #6b7280; font-weight: 600; font-size: 12px; min-width: 25px; }
    .item-title { font-weight: 600; color: #111827; font-size: 14px; }
    .item-response { background: #f9fafb; padding: 10px; border-radius: 4px; margin: 8px 0; border-left: 3px solid #d1d5db; }
    .response-label { font-weight: 600; color: #6b7280; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; }
    .conforme { color: #059669; font-weight: 600; }
    .nao-conforme { color: #dc2626; font-weight: 600; }
    .media-grid { display: block; width: 100%; margin-bottom: 10px; font-size: 0; }
    .media-card { display: inline-block; width: 32%; margin-right: 1.33%; margin-bottom: 10px; vertical-align: top; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 11px; break-inside: avoid; }
    .media-card:nth-child(3n) { margin-right: 0; }
    .media-card img { display: block; width: 100%; height: 100px; object-fit: cover; background: #f8fafc; }
    .media-caption { padding: 6px; font-size: 9px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .files-grid { display: block; width: 100%; margin-top: 10px; font-size: 0; }
    .file-pill { display: inline-block; width: 48%; margin-right: 2%; margin-bottom: 8px; padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; vertical-align: top; box-sizing: border-box; }
    .file-pill:nth-child(2n) { margin-right: 0; }
    .file-layout { display: table; width: 100%; border-collapse: collapse; }
    .file-icon-cell { display: table-cell; width: 30px; vertical-align: middle; text-align: center; }
    .file-info-cell { display: table-cell; vertical-align: middle; padding-left: 8px; }
    .file-name { font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; }
    .file-type { font-size: 9px; color: #94a3b8; margin-top: 2px; }
    .content-indented { margin-left: 35px; margin-top: 8px; }
    .item-icons { display: flex; gap: 6px; margin-left: auto; align-items: center; }
    .signatures-section { margin-top: 40px; page-break-before: auto; }
    .signatures-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-top: 20px; }
    .signature-box { text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 4px; }
    .signature-preview { height: 100px; border: 1px solid #e5e7eb; border-radius: 4px; margin: 10px 0; background: #fafafa; display: flex; align-items: center; justify-content: center; }
    .signature-preview img { max-height: 80px; max-width: 100%; object-fit: contain; }
    .signature-line { border-top: 1px solid #374151; margin: 15px auto 8px auto; width: 200px; }
    .signature-name { font-weight: 600; color: #111827; font-size: 13px; }
    .signature-role { font-size: 11px; color: #6b7280; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; page-break-inside: avoid; }
    .footer-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .footer-logo { width: 24px; height: 24px; object-fit: contain; opacity: 0.8; }
    .footer-brand { font-size: 14px; font-weight: 700; color: #1e40af; letter-spacing: -0.5px; }
  </style>
</head>
<body>
  <div class="header">
    ${(() => {
      if (!showLogos) return '';
      const logos = [];
      if (customLogoB64) logos.push(customLogoB64);
      if (parentOrganizationLogoUrl && !customLogoB64) logos.push(parentOrganizationLogoUrl);
      if (organizationLogoUrl && !customLogoB64) logos.push(organizationLogoUrl);
      if (logos.length === 0) return '';
      return `<div class="logos-container">${logos.map(logo => `<img class="logo" src="${logo}" alt="Logo" />`).join('')}</div>`;
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

  <!-- Info Grid -->
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
    ${inspection.company_name ? `
    <div style="display: flex; gap: 12px;">
      <div style="width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div><p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">Empresa</p><p style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0;">${inspection.company_name}</p></div>
    </div>` : ''}
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
    <div style="display: flex; gap: 12px;">
      <div style="width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">
        ${inspection.inspector_avatar_url
      ? `<img src="${inspection.inspector_avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
      </div>
      <div>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">Inspetor</p>
        <p style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0;">${inspection.inspector_name}</p>
        ${inspection.inspector_email ? `<p style="font-size: 11px; color: #3b82f6; margin: 2px 0 0 0;">${inspection.inspector_email}</p>` : ''}
      </div>
    </div>
  </div>

  ${inspection.description ? `
  <div style="background: #f8fafc; border-left: 3px solid #3b82f6; padding: 12px 16px; margin-bottom: 25px; border-radius: 0 6px 6px 0;">
    <p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase;">Descrição</p>
    <p style="font-size: 13px; color: #334155; margin: 0; line-height: 1.5;">${inspection.description}</p>
  </div>` : ''}

  ${includeStats ? `
  <h2>Estatísticas da Inspeção</h2>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-number">${stats.totalItems}</div><div class="stat-label">Total de Itens</div></div>
    <div class="stat-card compliant"><div class="stat-number">${stats.compliantItems}</div><div class="stat-label">Conformes</div></div>
    <div class="stat-card non-compliant"><div class="stat-number">${stats.nonCompliantItems}</div><div class="stat-label">Não Conformes</div></div>
    <div class="stat-card rate"><div class="stat-number">${stats.conformanceRate}%</div><div class="stat-label">Taxa de Conformidade</div></div>
  </div>` : ''}

  ${includeChecklist && templateItems.length > 0 ? `
  <h2>Checklist Respondido</h2>
  ${templateItems.map((item, index) => {
        try {
          const fieldData = JSON.parse(item.field_responses || '{}');
          const response = responses[item.id];
          const comment = (responses as Record<string, any>)[`comment_${item.id}`];
          const itemMedia = media.filter(m => m.inspection_item_id === item.id);
          const hasImages = itemMedia.some(m => m.media_type === 'image');
          const hasAudio = itemMedia.some(m => m.media_type === 'audio');
          const hasFiles = itemMedia.some(m => m.media_type !== 'image' && m.media_type !== 'audio');

          return `
      <div class="checklist-item">
        <div class="item-header">
          <div class="item-number">${index + 1}</div>
          <div class="item-title">${item.item_description}</div>
          <div class="item-icons">
             ${hasImages ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>` : ''}
             ${hasAudio && includeAudio ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>` : ''}
             ${hasFiles ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>` : ''}
          </div>
        </div>
        <div class="content-indented">
            <div class="item-response">
            <div class="response-label">Resposta:</div>
            <div class="${response === true || response === 'true' ? 'conforme' : response === false || response === 'false' ? 'nao-conforme' : ''}">${formatResponseValue(response, fieldData.field_type, false)}</div>
            </div>
            ${comment ? `<div class="item-response"><div class="response-label">Observação:</div><div>${comment}</div></div>` : ''}
            ${item.ai_pre_analysis ? `<div class="ai-analysis"><div class="ai-label">Análise IA:</div><div>${item.ai_pre_analysis}</div></div>` : ''}
            
            ${includeActionPlan && item.ai_action_plan ? (() => {
              try {
                const actionPlan = JSON.parse(item.ai_action_plan);
                if (!actionPlan?.actions?.length) return '';
                return `
                <div class="action-plan"><h4>Plano de Ação (IA)</h4>
                ${actionPlan.actions.map((action: any, i: number) => `
                    <div class="action-item"><strong>Ação ${i + 1}:</strong> ${action.item || action.what}
                    <div class="w5-grid">
                        <div class="w5-card"><div class="w5-label">O que:</div><div class="w5-value">${action.what}</div></div>
                        <div class="w5-card"><div class="w5-label">Onde:</div><div class="w5-value">${action.where}</div></div>
                        <div class="w5-card"><div class="w5-label">Por que:</div><div class="w5-value">${action.why}</div></div>
                        <div class="w5-card"><div class="w5-label">Como:</div><div class="w5-value">${action.how}</div></div>
                        <div class="w5-card"><div class="w5-label">Quando:</div><div class="w5-value">${action.when}</div></div>
                        <div class="w5-card"><div class="w5-label">Quem:</div><div class="w5-value">${action.who}</div></div>
                    </div>
                    </div>
                `).join('')}</div>`;
              } catch (e) { return ''; }
            })() : ''}
            ${renderMediaSection(itemMedia)}
        </div>
      </div>`;
        } catch (e) { return ''; }
      }).join('')}` : ''}

  ${includeChecklist && items.length > 0 ? `
  <h2>Itens Manuais</h2>
  ${items.map((item, index) => {
        const itemMedia = media.filter(m => m.inspection_item_id === item.id);
        const hasImages = itemMedia.some(m => m.media_type === 'image');
        return `
    <div class="checklist-item">
      <div class="item-header">
        <div class="item-number">${index + 1}</div>
        <div><div class="item-title">${item.item_description}</div><div style="font-size: 12px; color: #6b7280;">📂 ${item.category}</div></div>
        <div class="item-icons">${hasImages ? `<svg width="16" height="16" class="item-icon-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>` : ''}</div>
      </div>
      <div class="content-indented">
          <div class="item-response">
            <div class="response-label">Status:</div>
            <div class="${item.is_compliant === true ? 'conforme' : item.is_compliant === false ? 'nao-conforme' : ''}">
              ${item.is_compliant === true ? 'Conforme ✓' : item.is_compliant === false ? 'Não Conforme ✗' : 'Não Avaliado'}
            </div>
          </div>
          ${item.observations ? `<div class="item-response"><div class="response-label">Observações:</div><div>${item.observations}</div></div>` : ''}
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
                   <div style="font-size: 11px; color: #881337;">${action.what_description || 'Ação corretiva necessária.'}</div>
                   <div style="margin-top: 6px; font-size: 10px; color: #881337; display: flex; gap: 12px;">
                        <span><strong>Quem:</strong> ${action.who_responsible || '-'}</span>
                        <span><strong>Quando:</strong> ${action.when_deadline ? new Date(action.when_deadline).toLocaleDateString('pt-BR') : '-'}</span>
                   </div>
               </div>`).join('');
          })()}
      </div>
    </div>`;
      }).join('')}` : ''}

  ${renderActionPlanSection()}

  ${includeSignatures ? `
  <div class="signatures-section page-break">
    <h2>Assinaturas Digitais</h2>
    <div class="signatures-grid">
      <div class="signature-box">
        <div class="signature-label">Assinatura do Inspetor</div>
        ${signatures.inspector ? `<div class="signature-preview"><img src="${signatures.inspector}" alt="Assinatura Inspetor" /></div>` : '<div class="signature-preview" style="color: #ccc;">Pendente</div>'}
        <div class="signature-line"></div>
        <div class="signature-name">${inspection.inspector_name}</div>
        <div class="signature-role">Inspetor Responsável</div>
      </div>
      <div class="signature-box">
        <div class="signature-label">Assinatura do Responsável</div>
        ${signatures.responsible ? `<div class="signature-preview"><img src="${signatures.responsible}" alt="Assinatura Responsável" /></div>` : '<div class="signature-preview" style="color: #ccc;">Pendente</div>'}
        <div class="signature-line"></div>
        <div class="signature-name">${inspection.responsible_name || 'Não definido'}</div>
        <div class="signature-role">${inspection.responsible_role || 'Cliente / Responsável'}</div>
      </div>
    </div>
  </div>` : ''}

  ${includeHeatmap ? `
  <div class="page-break">
    <h2>Mapa de Calor (GPS)</h2>
    <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; break-inside: avoid;">
       <div style="height: 480px; width: 100%; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
          ${mapImageB64 ? `<img src="${mapImageB64}" style="width:100%; height:100%; object-fit:cover;" />` : '<span style="color:#94a3b8;">Mapa indisponível</span>'}
       </div>
    </div>
  </div>` : ''}

  ${includeLogs ? `
  <div class="page-break">
    <h2>Histórico de Auditoria${logsMode === 'complete' ? ' (Completo)' : ''}</h2>
    <table class="info-grid" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr style="background: #f8fafc;">
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px;">Evento</th>
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px;">Data/Hora</th>
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px;">Detalhes</th>
      </tr>
      ${logsMode === 'complete' && auditLogs.length > 0 ? auditLogs.map(log => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${log.action}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(log.created_at).toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${log.new_value || log.old_value || '-'}</td>
      </tr>`).join('') : `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Criação</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(inspection.created_at).toLocaleString('pt-BR')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Inspetor: ${inspection.inspector_name}</td>
      </tr>
      `}
    </table>
  </div>` : ''}

  ${includeQRCode && qrCodeDataUrl ? `
    <div class="page-break" style="text-align: center; margin-top: 40px; padding: 30px; border-top: 3px solid ${primaryColor}; background: linear-gradient(135deg, #f0f9ff, #e0f2fe);">
    <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 20px;">Acesse o Relatório Digital</h2>
    <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 150px; height: 150px;">
    ${shareLink ? `<p style="font-size: 9px; margin-top: 10px;">${shareLink}</p>` : ''}
  </div>` : ''}

  <div class="footer">
    <div class="footer-content">
       <div style="margin-bottom: 8px;"><img class="footer-logo" src="${compiaLogoB64 || '/compia_logo.png'}" alt="Compia" onerror="this.style.display='none'" /></div>
       <div class="footer-brand">Compia.tech</div>
       <div class="footer-legal">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
    </div>
  </div>
</body>
</html>`;
};
