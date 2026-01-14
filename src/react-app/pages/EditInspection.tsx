import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Layout from '@/react-app/components/Layout';
// import { useOrganization } from '@/react-app/context/OrganizationContext';
import { Save, ArrowLeft, FileCheck, MapPin, Navigation } from 'lucide-react';
import AutoSuggestField from '@/react-app/components/AutoSuggestField';
import NewUserModal from '@/react-app/components/NewUserModal';
import NewOrganizationModal from '@/react-app/components/NewOrganizationModal';


export default function EditInspection() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [aiAssistants, setAiAssistants] = useState<any[]>([]);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    company_name: '',
    cep: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    inspector_name: '',
    inspector_email: '',
    responsible_name: '',
    responsible_email: '',
    priority: 'media' as const,
    scheduled_date: '',
    template_id: '',
    action_plan_type: '5w2h' as const,
    status: 'pendente' as const,
    ai_assistant_id: ''
  });

  useEffect(() => {
    if (id) {
      fetchInspection();
    }
    fetchAiAssistants();
  }, [id]);

  const fetchAiAssistants = async () => {
    try {
      const response = await fetch('/api/ai-assistants');
      if (response.ok) {
        const data = await response.json();
        setAiAssistants(data.assistants || []);
      } else {
        console.error('Erro na resposta da API de assistentes:', response.status, response.statusText);
        setAiAssistants([]);
      }
    } catch (error) {
      console.error('Erro ao carregar assistentes de IA:', error);
      setAiAssistants([]);
    }
  };

  const fetchInspection = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/inspections/${id}`);
      if (response.ok) {
        const data = await response.json();
        const inspection = data.inspection;

        setFormData({
          title: inspection.title || '',
          description: inspection.description || '',
          location: inspection.location || '',
          company_name: inspection.company_name || '',
          cep: inspection.cep || '',
          address: inspection.address || '',
          latitude: inspection.latitude,
          longitude: inspection.longitude,
          inspector_name: inspection.inspector_name || '',
          inspector_email: inspection.inspector_email || '',
          responsible_name: inspection.responsible_name || '',
          responsible_email: inspection.responsible_email || '',
          priority: inspection.priority || 'media',
          scheduled_date: inspection.scheduled_date || '',
          template_id: '', // Template não pode ser alterado após criação
          action_plan_type: inspection.action_plan_type || '5w2h',
          status: inspection.status || 'pendente',
          ai_assistant_id: inspection.ai_assistant_id || ''
        });

        setSelectedOrgId(inspection.organization_id);
      } else {
        throw new Error('Falha ao carregar inspeção');
      }
    } catch (error) {
      console.error('Erro ao carregar inspeção:', error);
      alert(`Erro ao carregar inspeção: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
      navigate('/inspections');
    } finally {
      setLoadingData(false);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Remove template_id e outros campos que não devem ser atualizados na tabela inspections
      const { template_id, ...updateData } = formData;
      const inspectionData = {
        ...updateData,
        organization_id: selectedOrgId
      };

      const response = await fetch(`/api/inspections/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inspectionData),
      });

      if (response.ok) {
        navigate(`/inspections/${id}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || 'Erro ao atualizar inspeção');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert(`Erro ao atualizar inspeção: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep }));

    if (cep.length === 8) {
      try {
        const response = await fetch(`/api/cep/${cep}`);
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            address: data.address
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          alert('Erro ao obter localização GPS');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocalização não é suportada neste navegador');
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-600">Carregando inspeção...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/inspections/${id}`)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Editar Inspeção
            </h1>
            <p className="text-slate-600 mt-1">
              Atualize os dados da inspeção de segurança do trabalho
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Informações Gerais */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-lg font-semibold text-slate-900">📋 Informações Gerais</h3>
                <p className="text-sm text-slate-600">Dados básicos da inspeção</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                    Título da Inspeção *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Inspeção de Equipamentos de Proteção"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descreva os objetivos e escopo da inspeção..."
                  />
                </div>
              </div>
            </div>

            {/* Organização e Empresa */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-lg font-semibold text-slate-900">🏢 Organização e Empresa</h3>
                <p className="text-sm text-slate-600">Informações da empresa inspecionada</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Organização
                  </label>
                  <div className="p-3 bg-gray-50 rounded text-sm text-gray-500">
                    A organização não pode ser alterada na edição.
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="company_name" className="block text-sm font-medium text-slate-700 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    required
                    value={formData.company_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: ABC Indústria Ltda"
                  />
                </div>
              </div>
            </div>

            {/* Status, Configurações e IA */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-lg font-semibold text-slate-900">🤖 Status, Configurações e IA</h3>
                <p className="text-sm text-slate-600">Status atual, configurações da inspeção e assistente de IA</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ai_assistant_id" className="block text-sm font-medium text-slate-700 mb-2">
                    🤖 Assistente de IA Especializado
                  </label>
                  <select
                    id="ai_assistant_id"
                    name="ai_assistant_id"
                    value={formData.ai_assistant_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Assistente Geral de Segurança do Trabalho</option>
                    {aiAssistants.map(assistant => (
                      <option key={assistant.id} value={assistant.id}>
                        {assistant.name} - {assistant.specialization}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Escolha um especialista para que as análises de IA sejam mais precisas
                  </p>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-2">
                    Status da Inspeção
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-lg font-semibold text-slate-900">📍 Localização</h3>
                <p className="text-sm text-slate-600">Local e endereço da inspeção</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-2">
                    Local *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Galpão A - Setor de Produção"
                  />
                </div>
                <div>
                  <label htmlFor="cep" className="block text-sm font-medium text-slate-700 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleCEPChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000-000"
                    maxLength={8}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700">
                      Endereço Completo
                    </label>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="flex items-center px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      Usar GPS
                    </button>
                  </div>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Endereço será preenchido automaticamente pelo CEP ou digite manualmente"
                  />
                  {formData.latitude && formData.longitude && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Localização GPS:</span>
                      <span className="text-sm text-green-600">{Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Responsáveis e Agendamento */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-lg font-semibold text-slate-900">👨‍🔧 Responsáveis e Agendamento</h3>
                <p className="text-sm text-slate-600">Técnico responsável e cronograma</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AutoSuggestField
                  label="Nome do Técnico"
                  name="inspector_name"
                  value={formData.inspector_name}
                  onChange={(value, email) => {
                    setFormData(prev => ({
                      ...prev,
                      inspector_name: value,
                      inspector_email: email || prev.inspector_email
                    }));
                  }}
                  placeholder="Nome completo do responsável"
                  required
                  apiEndpoint="/api/autosuggest/inspectors"
                  onAddNew={() => setShowNewUserModal(true)}
                  addNewText="Novo Inspetor"
                  showEmail={true}
                />
                <div>
                  <label htmlFor="inspector_email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email do Técnico
                  </label>
                  <input
                    type="email"
                    id="inspector_email"
                    name="inspector_email"
                    value={formData.inspector_email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <AutoSuggestField
                  label="Nome do Responsável da Empresa"
                  name="responsible_name"
                  value={formData.responsible_name}
                  onChange={(value, email) => {
                    setFormData(prev => ({
                      ...prev,
                      responsible_name: value,
                      responsible_email: email || prev.responsible_email
                    }));
                  }}
                  placeholder="Nome do responsável técnico da empresa"
                  apiEndpoint="/api/autosuggest/responsibles"
                  showEmail={true}
                />
                <div className="mt-4">
                  <label htmlFor="responsible_email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email do Responsável da Empresa
                  </label>
                  <input
                    type="email"
                    id="responsible_email"
                    name="responsible_email"
                    value={formData.responsible_email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="responsavel@empresa.com"
                  />
                </div>
                <div>
                  <label htmlFor="scheduled_date" className="block text-sm font-medium text-slate-700 mb-2">
                    Data Agendada
                  </label>
                  <input
                    type="date"
                    id="scheduled_date"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="action_plan_type" className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Plano de Ação
                  </label>
                  <select
                    id="action_plan_type"
                    name="action_plan_type"
                    value={formData.action_plan_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="5w2h">5W2H (Completo)</option>
                    <option value="simple">Simples</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Escolha entre plano 5W2H completo ou formato simples
                  </p>
                </div>
              </div>
            </div>

            {/* Template Information */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-lg font-semibold text-slate-900">📋 Informações do Template</h3>
                <p className="text-sm text-slate-600">Template de checklist utilizado na criação</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-800">Template não pode ser alterado</span>
                </div>
                <p className="text-sm text-amber-700">
                  O template de checklist é definido apenas na criação da inspeção. Para usar um template diferente,
                  crie uma nova inspeção. Você pode adicionar itens manuais na página de detalhes da inspeção.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate(`/inspections/${id}`)}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        {/* Modals */}
        <NewUserModal
          isOpen={showNewUserModal}
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={(user) => {
            setFormData(prev => ({
              ...prev,
              inspector_name: user.name,
              inspector_email: user.email
            }));
          }}
          organizationId={selectedOrgId || undefined}
        />

        <NewOrganizationModal
          isOpen={showNewOrgModal}
          onClose={() => setShowNewOrgModal(false)}
          onSuccess={() => { }}
          parentOrganizations={[]}
        />
      </div>
    </Layout>
  );
}
