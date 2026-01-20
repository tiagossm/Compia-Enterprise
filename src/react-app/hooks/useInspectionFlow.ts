
import { useState } from 'react';
import { inspectionService } from '@/services/inspectionService';
import { useToast } from '@/react-app/hooks/useToast';
import { InspectionType } from '@/shared/types';

export function useInspectionFlow(
    id: string | undefined,
    data: {
        inspection: InspectionType | null;
        templateItems: any[];
        responses: Record<number, any>;
        signatures: { inspector?: string; responsible?: string };
    },
    setters: {
        setSignatures: React.Dispatch<React.SetStateAction<{ inspector?: string; responsible?: string }>>;
        setInspection: React.Dispatch<React.SetStateAction<InspectionType | null>>;
        refresh: () => void;
    }
) {
    const { success, error, warning } = useToast();
    const [isReopening, setIsReopening] = useState(false);
    const [isFlowSubmitting, setIsFlowSubmitting] = useState(false); // Separate submitting state for flow

    const handleSignatureSaved = async (type: 'inspector' | 'responsible', signature: string, signerData?: { name: string; email?: string; role: string }) => {
        if (!signature) {
            error('Erro', 'Assinatura inválida');
            return false;
        }

        setters.setSignatures(prev => ({ ...prev, [type]: signature }));
        if (type === 'responsible' && signerData) {
            setters.setInspection(prev => prev ? ({ ...prev, responsible_name: signerData.name, responsible_email: signerData.email, responsible_role: signerData.role }) : null);
        }

        success('Salvo', 'Assinatura capturada.');

        try {
            await inspectionService.saveSignatures(id!, {
                inspector_signature: type === 'inspector' ? signature : data.signatures.inspector,
                responsible_signature: type === 'responsible' ? signature : data.signatures.responsible,
                responsible_name: type === 'responsible' ? (signerData?.name || data.inspection?.responsible_name) : undefined,
                responsible_email: type === 'responsible' ? (signerData?.email || data.inspection?.responsible_email) : undefined,
                responsible_role: type === 'responsible' ? (signerData?.role || data.inspection?.responsible_role) : undefined
            });
            return true;
        } catch (e) {
            console.error(e);
            // Even if background save fails, local state is updated.
            return true;
        }
    };

    const handleFinalizeInspection = async () => {
        // Validation Logic
        const missingItems = data.templateItems.filter(item => {
            const val = data.responses[item.id];
            // Basic validity check
            const isValid = val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
            return !isValid;
        });

        if (missingItems.length > 0) {
            warning('Pendências', `Faltam ${missingItems.length} itens para responder.`);
            return false;
        }

        if (!data.signatures.inspector || !data.signatures.responsible) {
            warning('Assinaturas', 'Necessário assinaturas do inspetor e responsável.');
            return false;
        }

        setIsFlowSubmitting(true);
        try {
            await inspectionService.finalize(id!, {
                inspector_signature: data.signatures.inspector,
                responsible_signature: data.signatures.responsible,
                responsible_name: data.inspection?.responsible_name,
                responsible_email: data.inspection?.responsible_email,
                responsible_role: data.inspection?.responsible_role
            });

            success('Concluído', 'Inspeção finalizada com sucesso!');
            setters.setInspection(prev => prev ? { ...prev, status: 'concluida', completed_date: new Date().toISOString() } : null);
            return true;
        } catch (err) {
            console.error(err);
            error('Erro', 'Falha ao finalizar inspeção.');
            return false;
        } finally {
            setIsFlowSubmitting(false);
        }
    };

    const handleReopenInspection = async (justification: string) => {
        if (!justification.trim()) {
            warning('Atenção', 'Informe uma justificativa.');
            return false;
        }
        setIsReopening(true);
        try {
            await inspectionService.reopen(parseInt(id!), justification);
            success('Reaberta', 'Inspeção reaberta.');
            setters.refresh(); // Reload to get new status
            return true;
        } catch (err) {
            console.error(err);
            error('Erro', 'Falha ao reabrir.');
            return false;
        } finally {
            setIsReopening(false);
        }
    };

    return {
        isFlowSubmitting,
        isReopening,
        handleSignatureSaved,
        handleFinalizeInspection,
        handleReopenInspection
    };
}
