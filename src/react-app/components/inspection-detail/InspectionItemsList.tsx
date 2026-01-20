import { InspectionType, InspectionItemType } from '@/shared/types';
import ChecklistForm from '@/react-app/components/ChecklistForm';
import NewItemForm from './NewItemForm';
import NewActionForm from './NewActionForm';
import ManualItemsList from './ManualItemsList';
import InspectionListControls from './InspectionListControls';

interface InspectionItemsListProps {
    inspection: InspectionType;
    items: InspectionItemType[];
    templateItems: any[]; // Using any to handle extra fields like field_responses not in base type
    responses: Record<number, any>;
    media: any[];
    aiAnalyzing: boolean;
    isSubmitting: boolean;
    showNewAction: boolean;
    setShowNewAction: (show: boolean) => void;
    showAddItem: boolean;
    setShowAddItem: (show: boolean) => void;
    onAddItemClick: (item: any) => Promise<boolean> | boolean | void;
    onCreateActionClick: (action: any) => Promise<boolean> | boolean | void;
    generateAIAnalysis: () => void;
    updateItemAnalysis: (itemId: number, analysis: string | null) => Promise<void> | void;
    handleFormSubmit: (responses: any[]) => Promise<void> | void;
    handleDeleteItem: (itemId: number) => Promise<boolean> | Promise<void> | void;
    updateItemCompliance: (itemId: number, item: InspectionItemType, isCompliant: boolean) => Promise<boolean> | Promise<void> | void;
    // ChecklistForm requires strict Promise<void> for await compatibility
    handleAutoSave: (responses: Record<string, any>, comments: Record<string, any>, complianceStatuses?: Record<string, any>) => Promise<void>;
}

export default function InspectionItemsList({
    inspection,
    items,
    templateItems,
    responses,
    media,
    aiAnalyzing,
    isSubmitting,
    showNewAction,
    setShowNewAction,
    showAddItem,
    setShowAddItem,
    onAddItemClick,
    onCreateActionClick,
    generateAIAnalysis,
    updateItemAnalysis,
    handleFormSubmit,
    handleDeleteItem,
    updateItemCompliance,
    handleAutoSave
}: InspectionItemsListProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <InspectionListControls
                inspectionId={inspection.id!}
                aiAnalyzing={aiAnalyzing}
                isSubmitting={isSubmitting}
                generateAIAnalysis={generateAIAnalysis}
                onShowNewAction={() => setShowNewAction(true)}
                onShowAddItem={() => setShowAddItem(true)}
            />

            {/* New Action Form */}
            {showNewAction && (
                <NewActionForm
                    onCreateAction={async (action) => {
                        await onCreateActionClick(action);
                        setShowNewAction(false);
                        return true;
                    }}
                    onCancel={() => setShowNewAction(false)}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Add Item Form */}
            {showAddItem && (
                <NewItemForm
                    onAddItem={async (item) => {
                        await onAddItemClick(item);
                        setShowAddItem(false);
                        return true;
                    }}
                    onCancel={() => setShowAddItem(false)}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Template Checklist */}
            {templateItems.length > 0 && (
                <div className="mb-8">
                    {/* Banner de aviso para inspeção finalizada */}
                    {inspection.status === 'concluida' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-amber-800">Inspeção Finalizada</p>
                                <p className="text-xs text-amber-700">Esta inspeção está concluída. Para fazer alterações, reabra a inspeção usando o botão "Reabrir".</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <ChecklistForm
                            key={`${inspection.id}-${inspection.status}`}
                            fields={templateItems.map((item, index) => {
                                const fieldData = JSON.parse(item.field_responses || '{}');
                                return {
                                    // Use item.id (inspection_item.id) as the field ID for proper backend mapping
                                    id: parseInt(item.id!),
                                    field_id: fieldData.field_id, // Keep original field_id for reference
                                    // Prioritize item_description from DB column over JSON which might be stale/corrupt
                                    field_name: item.item_description || fieldData.field_name,
                                    field_type: fieldData.field_type,
                                    is_required: fieldData.is_required || false,
                                    options: fieldData.options || null,
                                    order_index: index,
                                    template_id: item.template_id,
                                    compliance_enabled: fieldData.compliance_enabled ?? true,
                                    compliance_mode: fieldData.compliance_mode ?? 'auto',
                                    compliance_config: fieldData.compliance_config,
                                    // Pass initial values
                                    initial_value: fieldData.response_value,
                                    initial_comment: fieldData.comment,
                                    initial_compliance_status: fieldData.compliance_status,
                                    initial_ai_analysis: item.ai_pre_analysis
                                };
                            })}
                            onUpdateAiAnalysis={updateItemAnalysis as any} // Cast safely after checking usage
                            onSubmit={handleFormSubmit}
                            initialValues={responses}
                            readonly={inspection.status === 'concluida'}
                            inspectionId={inspection.id!}
                            inspectionItems={templateItems}
                            initialMedia={media.reduce((acc, m) => {
                                // Group media by inspection_item_id (which matches field.id in ChecklistForm)
                                const itemId = m.inspection_item_id;
                                if (itemId) {
                                    if (!acc[itemId]) acc[itemId] = [];
                                    acc[itemId].push(m);
                                }
                                return acc;
                            }, {} as Record<number, any[]>)}
                            showComplianceSelector={inspection?.compliance_enabled !== false}
                            onAutoSave={handleAutoSave}
                        />
                    </div>
                </div>
            )}

            {/* Manual Items */}
            <ManualItemsList
                items={items}
                hasTemplateItems={templateItems.length > 0}
                updateItemCompliance={updateItemCompliance}
                handleDeleteItem={handleDeleteItem}
            />
        </div>
    );
}
