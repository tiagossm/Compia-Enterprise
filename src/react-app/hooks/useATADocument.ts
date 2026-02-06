// Hook for managing ATA document generation and actions
// Handles AI processing, document generation, and checklist filling

import { useState, useCallback } from 'react';
import { ataService, ATA, ATAGenerateResult } from '@/services/ataService';
import { useToast } from '@/react-app/hooks/useToast';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType
} from 'docx';
import { saveAs } from 'file-saver';

interface ATADocumentState {
    ata: ATA | null;
    isProcessing: boolean;
    isGeneratingDoc: boolean;
    generateResult: ATAGenerateResult | null;
    error: string | null;
}

interface UseATADocumentProps {
    inspectionId: number;
    inspectionData?: {
        items: Array<{ id: number; title: string; description?: string; category?: string }>;
        info: {
            project_name?: string;
            location?: string;
            inspector_name?: string;
            scheduled_date?: string;
            id?: number;
        };
    };
    onChecklistUpdate?: (updates: Array<{ item_id: number; status: string; observation: string; item_title?: string; confidence?: number }>) => void;
}

export function useATADocument({ inspectionId, inspectionData, onChecklistUpdate }: UseATADocumentProps) {
    const toast = useToast();

    const [state, setState] = useState<ATADocumentState>({
        ata: null,
        isProcessing: false,
        isGeneratingDoc: false,
        generateResult: null,
        error: null
    });

    /**
     * Load ATA data
     */
    const loadATA = useCallback(async (ataId?: number) => {
        try {
            let ata: ATA | null = null;

            if (ataId) {
                ata = await ataService.get(ataId);
            } else {
                ata = await ataService.getByInspection(inspectionId);
            }

            setState(prev => ({ ...prev, ata, error: null }));
            return ata;
        } catch (error: any) {
            console.error('Failed to load ATA:', error);
            setState(prev => ({ ...prev, error: error.message }));
            return null;
        }
    }, [inspectionId]);

    /**
     * Generate ATA transcript using AI
     */
    const generateATA = useCallback(async (ataId: number): Promise<ATAGenerateResult | null> => {
        setState(prev => ({ ...prev, isProcessing: true, error: null }));

        try {
            const context = {
                items: inspectionData?.items?.map(item => ({
                    id: item.id,
                    title: `${item.category || ''}: ${item.title || item.description || ''}`.trim(),
                    description: item.description
                })) || [],
                info: {
                    project_name: inspectionData?.info?.project_name,
                    location: inspectionData?.info?.location,
                    inspector_name: inspectionData?.info?.inspector_name,
                    scheduled_date: inspectionData?.info?.scheduled_date
                }
            };

            const result = await ataService.generateTranscript(ataId, context);

            // Reload ATA to get updated data
            const updatedATA = await ataService.get(ataId);

            setState(prev => ({
                ...prev,
                ata: updatedATA,
                generateResult: result,
                isProcessing: false
            }));

            toast.success('ATA gerada com sucesso', 'Revise a transcrição e valide a ATA.');

            return result;

        } catch (error: any) {
            console.error('Failed to generate ATA:', error);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: error.message
            }));

            toast.error('Erro ao gerar ATA', error.message || 'Tente novamente.');

            return null;
        }
    }, [inspectionData, toast]);

    /**
     * Update ATA content (for editing)
     */
    const updateATA = useCallback(async (updates: Partial<ATA>) => {
        if (!state.ata) return;

        try {
            const updatedATA = await ataService.update(state.ata.id, updates);
            setState(prev => ({ ...prev, ata: updatedATA }));

            toast.success('ATA atualizada', 'As alterações foram salvas.');

        } catch (error: any) {
            console.error('Failed to update ATA:', error);
            toast.error('Erro ao atualizar', error.message);
        }
    }, [state.ata, toast]);

    /**
     * Validate ATA (mark as final)
     */
    const validateATA = useCallback(async () => {
        if (!state.ata) return;

        try {
            const validatedATA = await ataService.validate(state.ata.id);
            setState(prev => ({ ...prev, ata: validatedATA }));

            toast.success('ATA validada', 'A ATA foi marcada como final.');

        } catch (error: any) {
            console.error('Failed to validate ATA:', error);
            toast.error('Erro ao validar', error.message);
        }
    }, [state.ata, toast]);

    /**
     * Fill checklist with ATA identified items
     */
    const fillChecklist = useCallback(async () => {
        if (!state.ata?.identified_items || state.ata.identified_items.length === 0) {
            toast.info('Nenhum item identificado', 'A ATA não possui itens para preencher o checklist.');
            return;
        }

        try {
            if (onChecklistUpdate) {
                onChecklistUpdate(state.ata.identified_items);

                toast.success('Checklist preenchido', `${state.ata.identified_items.length} itens foram atualizados.`);
            }
        } catch (error: any) {
            console.error('Failed to fill checklist:', error);
            toast.error('Erro ao preencher checklist', error.message);
        }
    }, [state.ata, onChecklistUpdate, toast]);

    /**
     * Generate and download .docx document
     */
    const downloadDoc = useCallback(async () => {
        if (!state.ata) return;

        setState(prev => ({ ...prev, isGeneratingDoc: true }));

        try {
            const info = inspectionData?.info || {};
            const ata = state.ata;

            // Parse non-conformities from generateResult or identified_items
            const nonConformities = state.generateResult?.non_conformities ||
                (ata.identified_items || [])
                    .filter(item => item.status === 'NC')
                    .map(item => ({
                        title: `Item #${item.item_id}`,
                        description: item.observation,
                        suggested_action: 'Ação corretiva necessária',
                        suggested_deadline: '7 dias'
                    }));

            // Count statistics
            const conformes = ata.identified_items?.filter(i => i.status === 'C').length || 0;
            const naoConformes = ata.identified_items?.filter(i => i.status === 'NC').length || 0;

            // Format duration
            const duration = ata.total_duration_seconds || 0;
            const durationStr = `${Math.floor(duration / 60)} minutos`;

            // Create document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // Header
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: 'ATA DE INSPEÇÃO',
                                    bold: true,
                                    size: 32,
                                    color: '2563eb'
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Inspeção #${info.id || inspectionId}`,
                                    size: 24,
                                    color: '666666'
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),

                        // Info section
                        new Paragraph({
                            text: 'INFORMAÇÕES GERAIS',
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Data: ', bold: true }),
                                new TextRun({ text: info.scheduled_date || new Date().toLocaleDateString('pt-BR') })
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Local: ', bold: true }),
                                new TextRun({ text: info.location || 'Não informado' })
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Projeto: ', bold: true }),
                                new TextRun({ text: info.project_name || 'Não informado' })
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Inspetor: ', bold: true }),
                                new TextRun({ text: info.inspector_name || 'Não informado' })
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'Duração: ', bold: true }),
                                new TextRun({ text: durationStr })
                            ],
                            spacing: { after: 400 }
                        }),

                        // Summary section
                        new Paragraph({
                            text: 'RESUMO EXECUTIVO',
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 }
                        }),
                        new Paragraph({
                            text: ata.summary || 'Resumo não disponível.',
                            spacing: { after: 200 }
                        }),

                        // Statistics
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'RESULTADO GERAL:', bold: true })
                            ],
                            spacing: { before: 200, after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: `✅ Conformes: ${conformes} itens` })
                            ],
                            spacing: { after: 50 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: `❌ Não Conformes: ${naoConformes} itens`, color: 'dc2626' })
                            ],
                            spacing: { after: 400 }
                        }),

                        // Non-conformities section (if any)
                        ...(nonConformities.length > 0 ? [
                            new Paragraph({
                                text: 'NÃO CONFORMIDADES IDENTIFICADAS',
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 400, after: 200 }
                            }),
                            ...nonConformities.flatMap((nc, index) => [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${index + 1}. ${nc.title}`,
                                            bold: true,
                                            color: 'dc2626'
                                        })
                                    ],
                                    spacing: { before: 200, after: 100 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: 'Descrição: ', bold: true }),
                                        new TextRun({ text: nc.description })
                                    ],
                                    spacing: { after: 50 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: 'Ação Requerida: ', bold: true }),
                                        new TextRun({ text: nc.suggested_action })
                                    ],
                                    spacing: { after: 50 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: 'Prazo: ', bold: true }),
                                        new TextRun({ text: nc.suggested_deadline })
                                    ],
                                    spacing: { after: 200 }
                                })
                            ])
                        ] : []),

                        // Transcript section
                        new Paragraph({
                            text: 'TRANSCRIÇÃO COMPLETA',
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 }
                        }),
                        ...(ata.transcript || 'Transcrição não disponível.')
                            .split('\n')
                            .map(line => new Paragraph({
                                text: line,
                                spacing: { after: 100 }
                            })),

                        // Footer
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '─'.repeat(50),
                                    color: 'cccccc'
                                })
                            ],
                            spacing: { before: 600, after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: 'Documento gerado automaticamente por COMPIA',
                                    size: 18,
                                    color: '999999',
                                    italics: true
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 50 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Data de geração: ${new Date().toLocaleString('pt-BR')}`,
                                    size: 18,
                                    color: '999999',
                                    italics: true
                                })
                            ],
                            alignment: AlignmentType.CENTER
                        })
                    ]
                }]
            });

            // Generate and download
            const blob = await Packer.toBlob(doc);
            const fileName = `ATA_Inspecao_${inspectionId}_${new Date().toISOString().split('T')[0]}.docx`;
            saveAs(blob, fileName);

            toast.success('Documento gerado', `${fileName} foi baixado.`);

        } catch (error: any) {
            console.error('Failed to generate document:', error);
            toast.error('Erro ao gerar documento', error.message);
        } finally {
            setState(prev => ({ ...prev, isGeneratingDoc: false }));
        }
    }, [state.ata, state.generateResult, inspectionId, inspectionData, toast]);

    return {
        // State
        ata: state.ata,
        isProcessing: state.isProcessing,
        isGeneratingDoc: state.isGeneratingDoc,
        generateResult: state.generateResult,
        error: state.error,

        // Actions
        loadATA,
        generateATA,
        updateATA,
        validateATA,
        fillChecklist,
        downloadDoc
    };
}

export default useATADocument;
