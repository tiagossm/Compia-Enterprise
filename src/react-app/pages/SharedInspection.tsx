import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Share2,
  Eye,
  Calendar,
  User,
  MapPin,
  Building2,
  Shield,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { InspectionType, InspectionItemType, InspectionMediaType } from '@/shared/types';
import ChecklistForm from '@/react-app/components/ChecklistForm';
import InspectionStatusBadge from '@/react-app/components/InspectionStatusBadge';

export default function SharedInspection() {
  const { token } = useParams<{ token: string }>();
  const [inspection, setInspection] = useState<InspectionType | null>(null);
  const [items, setItems] = useState<InspectionItemType[]>([]);
  const [templateItems, setTemplateItems] = useState<any[]>([]);
  const [media, setMedia] = useState<InspectionMediaType[]>([]);
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [responses, setResponses] = useState<Record<number, any>>({});

  useEffect(() => {
    if (token) {
      fetchSharedInspection();
    }
  }, [token]);

  const fetchSharedInspection = async () => {
    try {
      const response = await fetch(`/api/shared/${token}`);
      if (response.ok) {
        const data = await response.json();

        if (data.expired) {
          setError('Este link de compartilhamento expirou.');
          return;
        }

        if (!data.active) {
          setError('Este link de compartilhamento foi desativado.');
          return;
        }

        setShareInfo(data.share);
        setInspection(data.inspection);

        // Separate template-based items from manual items
        const allItems = data.items || [];
        const manualItems = allItems.filter((item: any) => !item.template_id);
        const templateBasedItems = allItems.filter((item: any) => item.template_id);

        setItems(manualItems);
        setTemplateItems(templateBasedItems);
        setMedia(data.media || []);

        // Load template responses
        const templateResponses = templateBasedItems.reduce((acc: Record<number, any>, item: any) => {
          if (item.field_responses) {
            try {
              const fieldData = JSON.parse(item.field_responses);
              if (fieldData.response_value !== undefined) {
                acc[fieldData.field_id] = fieldData.response_value;
              }
            } catch (error) {
              console.error('Error parsing field response:', error);
            }
          }
          return acc;
        }, {});
        setResponses(templateResponses);

        // Update access count
        await fetch(`/api/shared/${token}/access`, { method: 'POST' });

      } else if (response.status === 404) {
        setError('Link de compartilhamento não encontrado.');
      } else {
        setError('Erro ao carregar inspeção compartilhada.');
      }
    } catch (error) {
      console.error('Error fetching shared inspection:', error);
      setError('Erro ao carregar inspeção compartilhada.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formResponses: any[]) => {
    if (shareInfo?.permission !== 'edit') {
      alert('Você não tem permissão para editar esta inspeção.');
      return;
    }

    try {
      const response = await fetch(`/api/shared/${token}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: formResponses
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar respostas');
      }

      alert('Respostas salvas com sucesso!');

      // Refresh inspection details
      await fetchSharedInspection();
    } catch (error) {
      console.error('Error saving responses:', error);
      alert('Erro ao salvar respostas. Tente novamente.');
    }
  };



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'critica': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando inspeção compartilhada...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-8 h-8 text-slate-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Inspeção não encontrada
          </h2>
          <p className="text-slate-600">
            A inspeção compartilhada não pôde ser carregada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Share2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h1 className="font-heading text-2xl font-bold text-slate-900">
                  {inspection.title}
                </h1>
                <p className="text-slate-600">Inspeção Compartilhada</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(inspection.priority)}`}>
                  {inspection.priority.charAt(0).toUpperCase() + inspection.priority.slice(1)}
                </span>
                <InspectionStatusBadge status={inspection.status} />
              </div>
            </div>

            {/* Share Info */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  {shareInfo?.permission === 'edit' ? 'Você pode visualizar e editar esta inspeção' : 'Você pode apenas visualizar esta inspeção'}
                </p>
                <p className="text-sm text-blue-700">
                  {shareInfo?.access_count > 0 && `Acessada ${shareInfo.access_count} vez(es) • `}
                  {shareInfo?.expires_at && `Expira em ${new Date(shareInfo.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
            </div>
          </div>

          {/* Inspection Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
              Informações da Inspeção
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inspection.company_name && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Empresa</p>
                    <p className="font-medium text-slate-900">{inspection.company_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Local</p>
                  <p className="font-medium text-slate-900">{inspection.location}</p>
                  {inspection.address && (
                    <p className="text-sm text-slate-500">{inspection.address}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Inspetor</p>
                  <p className="font-medium text-slate-900">{inspection.inspector_name}</p>
                  {inspection.inspector_email && (
                    <p className="text-sm text-slate-500">{inspection.inspector_email}</p>
                  )}
                </div>
              </div>
              {inspection.scheduled_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Data Agendada</p>
                    <p className="font-medium text-slate-900">
                      {new Date(inspection.scheduled_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {inspection.description && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Descrição</p>
                <p className="text-slate-700">{inspection.description}</p>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
              Checklist da Inspeção
            </h2>

            {/* Template Checklist */}
            {templateItems.length > 0 && (
              <div className="mb-8">
                <h3 className="font-heading text-base font-semibold text-slate-900 mb-4">
                  Checklist do Template
                </h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <ChecklistForm
                    fields={templateItems.map(item => {
                      const fieldData = JSON.parse(item.field_responses);
                      return {
                        id: fieldData.field_id,
                        field_name: item.item_description,
                        field_type: fieldData.field_type,
                        is_required: fieldData.is_required,
                        options: fieldData.options,
                        order_index: 0,
                        template_id: item.template_id,
                        compliance_enabled: fieldData.compliance_enabled ?? true,
                        compliance_mode: fieldData.compliance_mode ?? 'auto',
                        compliance_config: fieldData.compliance_config
                      };
                    })}
                    onSubmit={handleFormSubmit}
                    initialValues={responses}
                    readonly={shareInfo?.permission !== 'edit'}
                  />
                </div>
              </div>
            )}

            {/* Manual Items */}
            {items.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-heading text-base font-semibold text-slate-900">
                  Itens Manuais
                </h3>

                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                          {item.category}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 mb-1">{item.item_description}</p>
                      {item.observations && (
                        <p className="text-sm text-slate-600">{item.observations}</p>
                      )}
                    </div>
                    {item.is_compliant !== null && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${item.is_compliant
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {item.is_compliant ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {item.is_compliant ? 'Conforme' : 'Não Conforme'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && templateItems.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhum item de checklist encontrado</p>
                <p className="text-slate-400 text-sm mt-1">
                  Esta inspeção ainda não possui itens de checklist
                </p>
              </div>
            )}
          </div>

          {/* Media */}
          {media.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
                Mídias da Inspeção
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.map((mediaItem) => (
                  <div key={mediaItem.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {mediaItem.media_type === 'image' && (
                      <img
                        src={mediaItem.file_url}
                        alt={mediaItem.file_name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {mediaItem.file_name}
                      </p>
                      {mediaItem.description && (
                        <p className="text-slate-600 text-sm mt-1">
                          {mediaItem.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <p className="text-slate-600 mb-4">
              Esta inspeção foi compartilhada através do sistema Compia
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Shield className="w-4 h-4 mr-2" />
              Acessar Sistema Completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
