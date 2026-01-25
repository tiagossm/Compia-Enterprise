
import { useInspectionData } from './useInspectionData';
import { useInspectionActions } from './useInspectionActions';
import { useInspectionFlow } from './useInspectionFlow';
import { useAIAnalysis } from './useAIAnalysis';
import { inspectionService } from '@/services/inspectionService';

export function useInspectionLogic(id: string | undefined) {
    // 1. Data Layer
    const {
        inspection, items, templateItems, media, responses, signatures,
        actionPlan, actionItems, auditLogs, loading,
        setItems, setTemplateItems, setResponses, setMedia, setSignatures,
        setInspection, setActionPlan, setAuditLogs,
        fetchInspectionDetails
    } = useInspectionData(id);

    // 2. Actions Layer (Passes setters to update local state optimistically)
    const {
        isSubmitting,
        handleDeleteItem,
        handleAddItem,
        updateItemCompliance,
        updateItemAnalysis,
        handleCreateManualAction,
        handleFormSubmit,
        handleAutoSave,
        handleMediaUploaded,
        handleMediaDeleted
    } = useInspectionActions(id, {
        setItems, setTemplateItems, setResponses, setMedia,
        refresh: fetchInspectionDetails,
        templateItems
    });

    // 3. Flow Layer (Signatures, Finalizing)
    const {
        isFlowSubmitting,
        isReopening,
        handleSignatureSaved,
        handleFinalizeInspection,
        handleReopenInspection
    } = useInspectionFlow(id, {
        inspection, templateItems, responses, signatures
    }, {
        setSignatures, setInspection, refresh: fetchInspectionDetails
    });

    // 4. AI Layer
    const {
        aiAnalyzing,
        generateAIAnalysis,
        processAudioNote
    } = useAIAnalysis(id, {
        inspection, items, media
    }, {
        setActionPlan,
        refresh: fetchInspectionDetails
    });

    // 5. Shared/Misc methods from original hook needing exact signature match
    const fetchAuditLogs = async () => {
        if (id && id !== 'undefined') {
            try {
                const logs = await inspectionService.fetchHistory(id);
                setAuditLogs(logs.history || []);
            } catch (e) {
                console.error(e);
            }
        }
    };

    return {
        // State
        inspection, items, templateItems, media, responses, signatures,
        actionPlan, actionItems, auditLogs, loading,
        aiAnalyzing,
        isSubmitting: isSubmitting || isFlowSubmitting, // Merge loading states
        isReopening,

        // Data Methods
        fetchInspectionDetails,

        // Action Methods
        handleDeleteItem, handleAddItem, updateItemCompliance, updateItemAnalysis,
        handleFormSubmit, handleMediaUploaded, handleMediaDeleted, handleCreateManualAction,
        handleAutoSave,

        // Flow Methods
        handleSignatureSaved, handleFinalizeInspection, handleReopenInspection,

        // AI Methods
        generateAIAnalysis,
        processAudioNote,

        // Misc
        fetchAuditLogs
    };
}
