import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import {
  AlertCircle, CheckCircle2, RotateCcw, X, FileCheck, FileText, Calendar
} from 'lucide-react';
import InspectionSignature from '@/react-app/components/InspectionSignature';
import InspectionSummary from '@/react-app/components/InspectionSummary';
import { useAuth } from '@/react-app/context/AuthContext';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import InspectionShare from '@/react-app/components/InspectionShare';
import PDFGenerator from '@/react-app/components/PDFGenerator';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import FloatingActionBar from '@/react-app/components/FloatingActionBar';
import HeatmapViewer from '@/react-app/components/HeatmapViewer';
import { useInspectionLogic } from '@/react-app/hooks/useInspectionLogic';
// (AudioRecorder hands-free disabled)

// Sub-components
import InspectionHeader from '@/react-app/components/inspection-detail/InspectionHeader';
import InspectionInfoCards from '@/react-app/components/inspection-detail/InspectionInfoCards';
import InspectionItemsList from '@/react-app/components/inspection-detail/InspectionItemsList';
import InspectionMediaSection from '@/react-app/components/inspection-detail/InspectionMediaSection';
import InspectionActionItems from '@/react-app/components/inspection-detail/InspectionActionItems';
import InspectionActionPlanLegacy from '@/react-app/components/inspection-detail/InspectionActionPlanLegacy';

// ATA Components
import InspectionATARecorder from '@/react-app/components/inspection-detail/InspectionATARecorder';
import ATAPreview from '@/react-app/components/inspection-detail/ATAPreview';

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user } = useAuth(); // Needed for PDF Generator details
  const { selectedOrganization } = useOrganization(); // For ATA organization_id

  // Use the new hook for all business logic
  const {
    inspection, items, templateItems, media, responses, signatures,
    actionPlan, actionItems, auditLogs, loading, aiAnalyzing,
    isSubmitting, isReopening,
    handleDeleteItem, handleAddItem,
    updateItemCompliance, updateItemAnalysis, handleFormSubmit,
    handleSignatureSaved, handleFinalizeInspection, handleReopenInspection,
    handleMediaUploaded, handleMediaDeleted, handleCreateManualAction,
    generateAIAnalysis, fetchAuditLogs, fetchInspectionDetails, handleAutoSave
  } = useInspectionLogic(id);

  // UI-only state remains here
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenJustification, setReopenJustification] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showNewAction, setShowNewAction] = useState(false);

  // ATA (continuous audio recording) state
  const [showATAPreview, setShowATAPreview] = useState(false);
  const [currentATAId, setCurrentATAId] = useState<number | null>(null);

  // Form states moved to sub-components (NewItemForm, NewActionForm)

  // Fetch audit logs when PDF modal opens (UI Effect)
  useEffect(() => {
    if (showPDFGenerator) {
      fetchAuditLogs();
    }
  }, [showPDFGenerator]);

  // Handle switching to summary view automatically when loaded and concluded
  useEffect(() => {
    if (inspection?.status === 'concluida') {
      setShowSummary(true);
    }
  }, [inspection?.status]);


  // UI Handlers wrappers
  // Now updated to receive data from the child forms
  const onAddItemClick = async (itemData: any) => {
    const success = await handleAddItem(itemData);
    if (success) {
      setShowAddItem(false);
    }
    return success;
  };

  const onCreateActionClick = async (actionData: any) => {
    const success = await handleCreateManualAction(actionData);
    if (success) {
      setShowNewAction(false);
    }
    return success;
  };

  const onFinalizeClick = async () => {
    const success = await handleFinalizeInspection();
    if (success) {
      setShowSignatures(false);
      setShowSummary(true);
      setShowSuccessModal(true);
    }
  };

  const onReopenClick = async () => {
    const success = await handleReopenInspection(reopenJustification);
    if (success) {
      setShowReopenModal(false);
      setReopenJustification('');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Carregando detalhes da inspeção..." />
        </div>
      </Layout>
    );
  }

  if (!inspection) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Inspeção não encontrada</h2>
          <Link to="/inspections" className="text-blue-600 hover:underline">
            Voltar para inspeções
          </Link>
        </div>
      </Layout>
    );
  }

  // Show summary if inspection is finalized and summary is requested
  if (showSummary && inspection.status === 'concluida') {
    return (
      <Layout>
        <div className="pb-24"> {/* Add padding for FloatingActionBar */}
          <InspectionSummary
            inspection={inspection}
            items={items}
            templateItems={templateItems}
            media={media}
            responses={responses}
            signatures={signatures}
            actionItems={actionItems}
          />
        </div>
        {/* Floating Action Bar - also shown in summary view */}
        <FloatingActionBar
          status={inspection.status}
          onSave={() => console.log('Manual save triggered')}
          onFinalize={() => setShowSignatures(true)}
          onReopen={() => setShowReopenModal(true)}
          onGeneratePDF={() => setShowPDFGenerator(true)}
          onShare={() => setShowShareModal(true)}
          // onViewSummary removed to prevent toggling back to checklist view
          isSaving={isSubmitting}
        />
        {/* Share Modal */}
        <InspectionShare
          inspectionId={parseInt(id!)}
          inspectionTitle={inspection.title}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
        {/* PDF Generator Modal */}
        <PDFGenerator
          inspection={inspection}
          items={items}
          templateItems={templateItems}
          media={media}
          responses={responses}
          signatures={signatures}
          isOpen={showPDFGenerator}
          onClose={() => setShowPDFGenerator(false)}
          actionItems={actionItems}
          organizationLogoUrl={user?.managed_organization?.logo_url || user?.organizations?.[0]?.logo_url}
          parentOrganizationLogoUrl={user?.managed_organization?.parent_organization?.logo_url || user?.organizations?.[0]?.parent_organization?.logo_url}
          organizationName={inspection.company_name || 'Organização'}
          parentOrganizationName="Matriz"
          auditLogs={auditLogs}
        />
        {/* Reopen Modal */}
        {showReopenModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reabrir Inspeção</h3>
              <p className="text-gray-600 mb-4">Informe o motivo para reabrir esta inspeção:</p>
              <textarea
                value={reopenJustification}
                onChange={(e) => setReopenJustification(e.target.value)}
                placeholder="Justificativa para reabertura..."
                className="w-full p-3 border border-gray-200 rounded-lg mb-4"
                rows={3}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={onReopenClick}
                  disabled={isReopening || !reopenJustification.trim()}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {isReopening ? 'Reabrindo...' : 'Confirmar Reabertura'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  /* Floating Audio Recorder (Bottom Left or custom position) */
  /* We place it in a portal or fixed position if needed, or inline. */
  /* For Premium UX, let's put it as a distinct floating element or integrated in the action bar? */
  /* Let's render it just above the FloatingActionBar or as a separate fixed element. */
  /* Or better: In the layout, maybe as a button that expands? */
  /* For now, let's start simple: specific section at the top or bottom of the list. */

  // Handlers for ATA
  const handleATAReady = (ataId: number) => {
    setCurrentATAId(ataId);
    setShowATAPreview(true);
  };

  const handleViewATA = (ataId: number) => {
    setCurrentATAId(ataId);
    setShowATAPreview(true);
  };

  const handleChecklistUpdateFromATA = async (updates: Array<{ item_id: number; status: string; observation: string; item_title?: string; confidence?: number }>) => {
    // Apply ATA extracted items to the *template item responses* (InspectionTemplateItem.id).
    // `handleAutoSave` expects keys to be templateItems ids, not inspection items.
    const complianceStatuses: Record<string, string> = {};
    const comments: Record<string, string> = {};

    updates.forEach(update => {
      const templateItem = templateItems.find(ti => ti.id === update.item_id);
      if (!templateItem) return;

      const complianceStatus = update.status === 'C' ? 'compliant' :
                               update.status === 'NC' ? 'non_compliant' :
                               'not_applicable';

      complianceStatuses[String(templateItem.id)] = complianceStatus;
      if (update.observation) {
        comments[String(templateItem.id)] = update.observation;
      }
    });

    if (Object.keys(complianceStatuses).length > 0) {
      await handleAutoSave({}, comments, complianceStatuses);
      // Refresh to reflect new compliance status/comments on UI.
      await fetchInspectionDetails();
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-32 relative">
        {/* Header */}
        <InspectionHeader inspection={inspection} />

        {/* ATA Recorder - Continuous audio recording */}
        <InspectionATARecorder
          inspectionId={parseInt(id!)}
          organizationId={selectedOrganization?.id || 0}
          onATAReady={handleATAReady}
          onViewATA={handleViewATA}
        />

        {/* Assistente IA de Voz (Mãos Livres)
            Desativado: estava duplicando o uso de microfone e confundindo com a gravação de ATA.
            Se for reativar no futuro, colocar atrás de feature flag e UX separada.
        */}

        {/* Inspection Info Cards */}
        <InspectionInfoCards inspection={inspection} />

        {/* Items List (Checklist & Manual) */}
        <InspectionItemsList
          inspection={inspection}
          items={items}
          templateItems={templateItems}
          responses={responses}
          media={media}
          aiAnalyzing={aiAnalyzing}
          isSubmitting={isSubmitting}
          showNewAction={showNewAction}
          setShowNewAction={setShowNewAction}
          showAddItem={showAddItem}
          setShowAddItem={setShowAddItem}
          onAddItemClick={onAddItemClick}
          onCreateActionClick={onCreateActionClick}
          generateAIAnalysis={generateAIAnalysis}
          updateItemAnalysis={updateItemAnalysis}
          handleFormSubmit={handleFormSubmit}
          handleDeleteItem={handleDeleteItem}
          updateItemCompliance={updateItemCompliance}
          handleAutoSave={handleAutoSave}
        />

        {/* Media Upload Section */}
        <InspectionMediaSection
          media={media}
          inspectionId={parseInt(id!)}
          inspectionTitle={inspection.title}
          handleMediaUploaded={handleMediaUploaded}
          handleMediaDeleted={handleMediaDeleted}
          onOpenHeatmap={() => setShowHeatmap(true)}
        />

        {/* Heatmap Viewer Modal - Rendered here to be outside media section layout context if needed */}
        <HeatmapViewer
          media={media}
          isOpen={showHeatmap}
          onClose={() => setShowHeatmap(false)}
          inspectionTitle={inspection.title}
        />

        {/* Action Items Section */}
        <InspectionActionItems actionItems={actionItems} />

        {/* AI Action Plan Section - Legacy support */}
        <InspectionActionPlanLegacy actionPlan={actionPlan} />

        {/* Signatures Modal - Mobile Optimized */}
        {showSignatures && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900">
                    Finalizar Inspeção
                  </h2>
                  <button
                    onClick={() => setShowSignatures(false)}
                    className="text-slate-500 hover:text-slate-700 p-1"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* Debug block - Only show in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800 font-mono">
                        Debug - Signatures object:
                      </p>
                      <pre className="text-xs text-yellow-700 mt-1">
                        {JSON.stringify({
                          inspector: signatures.inspector ? 'Present' : 'Missing',
                          responsible: signatures.responsible ? 'Present' : 'Missing'
                        }, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    <InspectionSignature
                      onSignatureSaved={(signature, signerData) => handleSignatureSaved('inspector', signature, signerData)}
                      existingSignature={signatures.inspector}
                      signerName={inspection.inspector_name}
                      signerRole="Inspetor Responsável"
                      signedAt={inspection.completed_date}
                    />
                    <InspectionSignature
                      onSignatureSaved={(signature, signerData) => handleSignatureSaved('responsible', signature, signerData)}
                      existingSignature={signatures.responsible}
                      signerName={inspection.responsible_name || "Responsável Técnico"}
                      signerEmail={inspection.responsible_email}
                      signerRole={inspection.responsible_role || inspection.company_name || "Empresa"}
                      editable={true}
                      signedAt={inspection.completed_date}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-200">
                    <button
                      onClick={() => setShowSignatures(false)}
                      className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors order-2 sm:order-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={onFinalizeClick}
                      disabled={!signatures.inspector || !signatures.responsible || isSubmitting}
                      className="flex items-center justify-center px-6 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-2"
                    >
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Finalizando...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4 mr-2" />
                          <span>Finalizar Inspeção</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reopen Inspection Modal */}
        {showReopenModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-slate-900">
                      Reabrir Inspeção
                    </h2>
                    <p className="text-sm text-slate-500">
                      Esta ação será registrada para auditoria
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Atenção:</strong> Ao reabrir a inspeção, as assinaturas atuais serão arquivadas e novas assinaturas serão necessárias para finalizar novamente.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Justificativa para reabertura *
                  </label>
                  <textarea
                    value={reopenJustification}
                    onChange={(e) => setReopenJustification(e.target.value)}
                    placeholder="Informe o motivo para reabrir esta inspeção..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowReopenModal(false);
                      setReopenJustification('');
                    }}
                    className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onReopenClick}
                    disabled={!reopenJustification.trim() || isReopening}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isReopening ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Reabrindo...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Reabrir Inspeção
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600" />

              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300 delay-100">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-2">Inspeção Concluída!</h2>
              <p className="text-slate-600 mb-8">
                O relatório foi gerado e salvo com sucesso. O gestor será notificado automaticamente.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setShowSummary(true); // Switch to summary view
                  }}
                  className="w-full py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  Visualizar Relatório
                </button>

                <button
                  onClick={() => navigate('/agenda')}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Calendar size={20} />
                  Voltar para Agenda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        <InspectionShare
          inspectionId={parseInt(id!)}
          inspectionTitle={inspection.title}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />

        {/* PDF Generator Modal */}
        <PDFGenerator
          inspection={inspection}
          items={items}
          templateItems={templateItems}
          media={media}
          responses={responses}
          signatures={signatures}
          isOpen={showPDFGenerator}
          onClose={() => setShowPDFGenerator(false)}
          actionItems={actionItems}
          organizationLogoUrl={user?.managed_organization?.logo_url || user?.organizations?.[0]?.logo_url}
          parentOrganizationLogoUrl={user?.managed_organization?.parent_organization?.logo_url || user?.organizations?.[0]?.parent_organization?.logo_url}
          organizationName={inspection.company_name || 'Organização'}
          parentOrganizationName="Matriz"
          auditLogs={auditLogs}

        />

        {/* ATA Preview Modal */}
        {currentATAId && (
          <ATAPreview
            ataId={currentATAId}
            inspectionId={parseInt(id!)}
            isOpen={showATAPreview}
            onClose={() => {
              setShowATAPreview(false);
              setCurrentATAId(null);
            }}
            inspectionData={{
              items: items.filter(item => item.id !== undefined).map(item => ({
                id: item.id!,
                title: item.item_description || '',
                description: item.item_description,
                category: item.category
              })),
              info: {
                id: parseInt(id!),
                project_name: inspection.title,
                location: inspection.location,
                inspector_name: inspection.inspector_name,
                scheduled_date: inspection.scheduled_date
              }
            }}
            onChecklistUpdate={handleChecklistUpdateFromATA}
          />
        )}

        {/* Floating Action Bar */}
        <FloatingActionBar
          status={inspection.status}
          onSave={() => {
            // Trigger manual save if needed
            console.log('Manual save triggered');
          }}
          onFinalize={() => setShowSignatures(true)}
          onReopen={() => setShowReopenModal(true)}
          onGeneratePDF={() => setShowPDFGenerator(true)}
          onShare={() => setShowShareModal(true)}
          onViewSummary={() => setShowSummary(true)}
          isSaving={isSubmitting}
        />
      </div>
    </Layout>
  );
}
