import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { fetchWithAuth } from '../utils/auth';
import { useAuth } from '@/react-app/context/AuthContext';
import Layout from '@/react-app/components/Layout';
// OrganizationSelector removed - organization is set automatically from user context
import {
  Save, ArrowLeft, ArrowRight, FileCheck, MapPin, Navigation, Brain,
  CheckCircle, ClipboardList, Building2, Users, Settings, Shield,
  Calendar, AlertTriangle, Sparkles
} from 'lucide-react';
import { ChecklistTemplate, ChecklistFolder } from '@/shared/checklist-types';
import { ExtendedMochaUser } from '@/shared/user-types';
import AutoSuggestField from '@/react-app/components/AutoSuggestField';
import SuggestionTags from '@/react-app/components/SuggestionTags';
import NewUserModal from '@/react-app/components/NewUserModal';
import NewOrganizationModal from '@/react-app/components/NewOrganizationModal';
import TemplateSelectionModal from '@/react-app/components/TemplateSelectionModal';
import UserAvatar from '@/react-app/components/UserAvatar';
import { parseAddressString } from '@/react-app/utils/addressParser';

interface InspectorType {
  name: string;
  email: string;
  avatar_url?: string;
}

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Informações Básicas', description: 'Título e descrição', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 2, title: 'Localização', description: 'Empresa e endereço', icon: <Building2 className="w-5 h-5" /> },
  { id: 3, title: 'Equipe', description: 'Responsáveis e data', icon: <Users className="w-5 h-5" /> },
  { id: 4, title: 'Configuração', description: 'Template e IA', icon: <Settings className="w-5 h-5" /> },
];

export default function NewInspection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const extendedUser = user as ExtendedMochaUser;
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const existingId = routeId || searchParams.get('id'); // Support both route param and query param
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!existingId);
  const [currentStep, setCurrentStep] = useState(1);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [folders, setFolders] = useState<ChecklistFolder[]>([]);
  const [aiAssistants, setAiAssistants] = useState<any[]>([]);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [submitProtection, setSubmitProtection] = useState(false);
  const [selectedOrgId] = useState<number | null>(
    searchParams.get('org') ? parseInt(searchParams.get('org')!) :
      extendedUser?.profile?.organization_id || null
  );

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    sectors: [] as string[], // Multiple sectors/locations
    company_name: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    // Inspectors - array for multiple
    inspectors: [{
      name: extendedUser?.profile?.name || '',
      email: extendedUser?.email || '',
      avatar_url: extendedUser?.google_user_data?.picture || ''
    }] as InspectorType[],
    inspector_name: extendedUser?.profile?.name || '', // Keep for backward compat
    inspector_email: extendedUser?.email || '',
    // Responsible from org's security contact
    responsible_name: '',
    responsible_email: '',
    responsible_role: '', // Job title/position of the responsible person
    priority: 'media' as const,
    scheduled_date: '',
    template_id: '',
    action_plan_type: '5w2h' as const,
    ai_assistant_id: '',
    compliance_enabled: true,
  });

  const location = useLocation();

  useEffect(() => {
    fetchTemplates();
    fetchFolders();
    fetchAiAssistants();

    if (existingId) {
      fetchExistingInspection(existingId);
    } else if (location.state?.prefill) {
      // Pre-fill from Calendar State
      const prefill = location.state.prefill;
      setFormData(prev => ({
        ...prev,
        title: prefill.title || '',
        description: prefill.description || '',
        scheduled_date: prefill.scheduled_date || '', // YYYY-MM-DD
        company_name: prefill.company_name || '',
        // Map address from Calendar (which comes as 'address' in prefill)
        address: prefill.address || '',
        logradouro: prefill.address || '', // Fallback for specific fields
        location: '', // Clear sector/area since 'location' in calendar is address
      }));
    }
  }, [existingId, location.state]);

  const fetchExistingInspection = async (id: string) => {
    try {
      const response = await fetchWithAuth(`/api/inspections/${id}`);
      if (response.ok) {
        const data = await response.json();
        const inspection = data.inspection;

        // Guard: Prevent editing if finalized
        if (inspection.status === 'concluida') {
          alert('Esta inspeção já foi finalizada e não pode ser editada.');
          navigate(`/inspections/${id}`); // Go to summary view
          return;
        }

        setFormData(prev => ({
          ...prev,
          title: inspection.title || '',
          description: inspection.description || '',
          // Use 'address' field if available (new migration), fall back to checking if 'location' looks like an address
          address: inspection.address || (inspection.location && inspection.location.includes(',') ? inspection.location : ''),

          // Populate granular fields from address string if they are empty
          // This ensures the address from Calendar (which is a string) shows up in the Logradouro field
          logradouro: inspection.logradouro || (inspection.address || (inspection.location && inspection.location.includes(',') ? inspection.location : '')),
          numero: inspection.numero || '',
          bairro: inspection.bairro || '',
          cidade: inspection.cidade || '',
          uf: inspection.uf || '',
          cep: inspection.cep || '',
          complemento: inspection.complemento || '',

          // If 'location' is in 'address' format (has comma/numbers), don't put it in 'location' (Sector). 
          location: (inspection.location && !inspection.location.includes(',')) ? inspection.location : '',
          sectors: (inspection.location && !inspection.location.includes(',')) ? [inspection.location] : [],

          company_name: inspection.company_name || '',
          scheduled_date: inspection.scheduled_date ? inspection.scheduled_date.split('T')[0] : '',
          priority: inspection.priority || 'media',
          inspector_name: inspection.inspector_name || prev.inspector_name,
          inspector_email: inspection.inspector_email || prev.inspector_email,
          responsible_name: inspection.responsible_name || '',
          responsible_email: inspection.responsible_email || '',
          responsible_role: inspection.responsible_role || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching inspection:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    const validation: Record<number, boolean> = {};
    validation[1] = !!(formData.title.trim());
    validation[2] = !!(formData.company_name.trim() && (formData.sectors.length > 0 || formData.location.trim()));
    validation[3] = !!(formData.inspector_name.trim());
    validation[4] = true;
    setStepValidation(validation);
  }, [formData]);

  const fetchAiAssistants = async () => {
    try {
      const response = await fetchWithAuth('/api/ai-assistants');
      if (response.ok) {
        const data = await response.json();
        setAiAssistants(data.assistants || []);
      } else {
        setAiAssistants([]);
      }
    } catch (error) {
      console.error('Erro ao carregar assistentes de IA:', error);
      setAiAssistants([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetchWithAuth('/api/checklist/checklist-templates');
      if (response.ok) {
        const data = await response.json();
        const validTemplates = (data.templates || []).filter((template: any) =>
          !template.is_category_folder && template.name && template.category
        );
        setTemplates(validTemplates);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setTemplates([]);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetchWithAuth('/api/checklist/tree');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
    }
  };

  const handleTemplateSelect = (template: ChecklistTemplate) => {
    setFormData(prev => ({ ...prev, template_id: String(template.id) }));
    setShowTemplateModal(false);
  };

  const getSelectedTemplate = () => {
    const templateId = formData.template_id;
    return templates.find(t => String(t.id) === templateId);
  };

  useEffect(() => {
    // When entering step 4, enable protection briefly
    if (currentStep === 4) {
      setSubmitProtection(true);
      const timer = setTimeout(() => setSubmitProtection(false), 1000); // 1s delay
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitProtection) return;

    setLoading(true);

    try {
      // Build location from sectors array
      const finalLocation = formData.sectors.length > 0
        ? formData.sectors.join(', ')
        : formData.location.trim();

      // Build complete address only if not editing and address is empty (or allow overwrite)
      // Since we now map calendar 'location' to 'address', we likely have an address.
      // If user edited address field, use that.
      const finalAddress = formData.address;

      const inspectionData = {
        ...formData,
        location: finalLocation,
        address: finalAddress,
        organization_id: existingId ? undefined : selectedOrgId
      };

      console.log('[NewInspection] Submitting data:', inspectionData);

      let response;
      if (existingId) {
        // Updating existing inspection (completing setup)
        response = await fetchWithAuth(`/api/inspections/${existingId}`, {
          method: 'PUT',
          body: JSON.stringify(inspectionData),
        });
      } else {
        // Creating new inspection
        response = await fetchWithAuth('/api/inspections', {
          method: 'POST',
          body: JSON.stringify(inspectionData),
        });
      }

      console.log('[NewInspection] Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('[NewInspection] Saved inspection:', result);

        // If updating, result might be the updated object or { message, inspection }
        const savedId = existingId || result.id || result.inspection?.id;

        if (savedId) {
          navigate(`/inspections/${savedId}`);
        } else {
          console.error('[NewInspection] Saved but ID is missing:', result);
          alert('Inspeção salva, mas houve um erro ao redirecionar. Verifique na lista.');
          navigate('/inspections');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Erro ao salvar inspeção');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert(`Erro ao salvar inspeção: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep }));

    if (cep.length === 8) {
      try {
        const response = await fetchWithAuth(`/api/cep/${cep}`);
        if (response.ok) {
          const result = await response.json();
          // API returns { success, data: {...}, address } - extract from data or result
          const cepData = result.data || result;
          setFormData(prev => ({
            ...prev,
            logradouro: cepData.logradouro || '',
            bairro: cepData.bairro || '',
            cidade: cepData.localidade || '',
            uf: cepData.uf || '',
            complemento: cepData.complemento || prev.complemento,
            address: result.address || cepData.address || ''
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

  const goToNextStep = () => {
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const canProceed = stepValidation[currentStep];

  const StepProgressBar = () => (
    <div className="mb-8">
      <div className="relative flex items-start justify-between">
        {/* Background Line */}
        <div className="absolute top-6 left-6 right-6 h-1 bg-slate-200 rounded-full" />
        <div
          className="absolute top-6 left-6 h-1 bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%`, maxWidth: 'calc(100% - 48px)' }}
        />

        {WIZARD_STEPS.map((step) => (
          <div key={step.id} className="flex flex-col items-center z-10" style={{ width: '25%' }}>
            <button
              type="button"
              onClick={() => (stepValidation[step.id] || step.id < currentStep) && setCurrentStep(step.id)}
              disabled={!stepValidation[step.id] && step.id > currentStep}
              className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 bg-white ${currentStep === step.id
                ? 'border-blue-500 text-blue-600 shadow-lg shadow-blue-500/30 ring-4 ring-blue-100'
                : currentStep > step.id || stepValidation[step.id]
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-slate-300 text-slate-400'
                } ${(stepValidation[step.id] || step.id < currentStep) ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`}
            >
              {currentStep > step.id ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                step.icon
              )}
            </button>
            <div className="mt-3 text-center">
              <p className={`text-xs sm:text-sm font-medium ${currentStep === step.id ? 'text-blue-600' : 'text-slate-600'}`}>
                {step.title}
              </p>
              <p className="text-xs text-slate-400 hidden md:block">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-600">Carregando dados da inspe&ccedil;&atilde;o...</span>
        </div>
      </Layout>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Informações Básicas</h3>
                <p className="text-slate-500">Defina o título e descrição da inspeção</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
                  Título da Inspeção <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 ${formData.title ? 'border-green-300 bg-green-50/30' : 'border-slate-200'}`}
                  placeholder="Ex: Auditoria de Operações da Loja SP-01"
                />
                <SuggestionTags
                  label="Sugestões de Títulos"
                  apiEndpoint="/api/autosuggest/inspection-titles"
                  onTagSelect={(value) => setFormData(prev => ({ ...prev, title: value }))}
                  maxTags={5}
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                  Descrição <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none"
                  placeholder="Descreva os objetivos e escopo da inspeção..."
                />
                <SuggestionTags
                  label="Sugestões de Descrições"
                  apiEndpoint="/api/autosuggest/inspection-descriptions"
                  onTagSelect={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  maxTags={4}
                />
              </div>
              {/* Organization is set automatically from user context (multi-tenant) */}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Localização</h3>
                <p className="text-slate-500">Informações da empresa e endereço</p>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <AutoSuggestField
                label="Nome da Empresa"
                name="company_name"
                value={formData.company_name}
                onChange={(value, _, data) => {
                  const suggestion = data as { address?: string };
                  const updates: any = { company_name: value };

                  if (suggestion?.address) {
                    const parsed = parseAddressString(suggestion.address);
                    updates.cep = parsed.cep;
                    updates.logradouro = parsed.logradouro;
                    updates.numero = parsed.numero;
                    updates.bairro = parsed.bairro;
                    updates.cidade = parsed.cidade;
                    updates.uf = parsed.uf;
                    updates.complemento = parsed.complemento;
                    updates.address = parsed.full_address; // Keep full legacy string
                  }

                  setFormData(prev => ({ ...prev, ...updates }));
                }}
                placeholder="Ex: ABC Indústria Ltda"
                required
                apiEndpoint="/api/autosuggest/companies"
                onAddNew={() => setShowNewOrgModal(true)}
                addNewText="Nova Empresa"
              />
            </div>

            {/* Sectors/Areas - Multiple chips */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Setores / Áreas Inspecionadas *
              </label>
              <div className="space-y-3">
                {/* Sector chips */}
                {formData.sectors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.sectors.map((sector, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium"
                      >
                        {sector}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            sectors: prev.sectors.filter((_, i) => i !== index)
                          }))}
                          className="ml-1 hover:text-emerald-600 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Add sector input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && formData.location.trim()) {
                        e.preventDefault();
                        if (!formData.sectors.includes(formData.location.trim())) {
                          setFormData(prev => ({
                            ...prev,
                            sectors: [...prev.sectors, prev.location.trim()],
                            location: ''
                          }));
                        }
                      }
                    }}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all"
                    placeholder="Digite um setor e pressione Enter (Ex: Galpão A, Cozinha, Recepção)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.location.trim() && !formData.sectors.includes(formData.location.trim())) {
                        setFormData(prev => ({
                          ...prev,
                          sectors: [...prev.sectors, prev.location.trim()],
                          location: ''
                        }));
                      }
                    }}
                    className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                  >
                    + Adicionar
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Adicione todos os setores ou áreas que serão inspecionados
                </p>
              </div>
            </div>

            {/* Address Section */}
            <div className="border-t border-slate-200 pt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Endereço do Local
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CEP */}
                <div>
                  <label htmlFor="cep" className="block text-sm font-medium text-slate-600 mb-1">CEP</label>
                  <input
                    type="text"
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleCEPChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="00000-000"
                    maxLength={8}
                  />
                </div>

                {/* Logradouro */}
                <div className="md:col-span-2">
                  <label htmlFor="logradouro" className="block text-sm font-medium text-slate-600 mb-1">Logradouro</label>
                  <input
                    type="text"
                    id="logradouro"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-slate-50"
                    placeholder="Preenchido pelo CEP"
                  />
                </div>

                {/* Número */}
                <div>
                  <label htmlFor="numero" className="block text-sm font-medium text-slate-600 mb-1">Número</label>
                  <input
                    type="text"
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="123 ou S/N"
                  />
                </div>

                {/* Complemento */}
                <div className="md:col-span-2">
                  <label htmlFor="complemento" className="block text-sm font-medium text-slate-600 mb-1">Complemento</label>
                  <input
                    type="text"
                    id="complemento"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="Bloco B, Sala 5, Andar 3..."
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label htmlFor="bairro" className="block text-sm font-medium text-slate-600 mb-1">Bairro</label>
                  <input
                    type="text"
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-slate-50"
                    placeholder="Preenchido pelo CEP"
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label htmlFor="cidade" className="block text-sm font-medium text-slate-600 mb-1">Cidade</label>
                  <input
                    type="text"
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-slate-50"
                    placeholder="Preenchido pelo CEP"
                  />
                </div>

                {/* UF */}
                <div>
                  <label htmlFor="uf" className="block text-sm font-medium text-slate-600 mb-1">UF</label>
                  <input
                    type="text"
                    id="uf"
                    name="uf"
                    value={formData.uf}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all bg-slate-50"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* GPS Capture */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Capturar GPS
                </button>

                {formData.latitude && formData.longitude && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      GPS: {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Equipe e Agendamento</h3>
                <p className="text-slate-500">Inspetores e cronograma</p>
              </div>
            </div>

            {/* Inspectors Section - Multiple with Avatars */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Técnicos / Inspetores *
              </label>
              <div className="space-y-3">
                {/* Inspector chips */}
                {formData.inspectors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.inspectors.map((inspector, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-violet-100 text-violet-800 rounded-full text-sm font-medium"
                      >
                        <UserAvatar
                          name={inspector.name}
                          avatarUrl={inspector.avatar_url}
                          size="xs"
                        />
                        <span>{inspector.name}</span>
                        {formData.inspectors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              inspectors: prev.inspectors.filter((_, i) => i !== index),
                              inspector_name: index === 0 ? (prev.inspectors[1]?.name || '') : prev.inspector_name,
                              inspector_email: index === 0 ? (prev.inspectors[1]?.email || '') : prev.inspector_email
                            }))}
                            className="ml-1 hover:text-violet-600 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Add inspector - only if less than 5 */}
                {formData.inspectors.length < 5 && (
                  <AutoSuggestField
                    label=""
                    name="new_inspector"
                    value=""
                    onChange={(value, email) => {
                      if (value && !formData.inspectors.some(i => i.name === value)) {
                        setFormData(prev => ({
                          ...prev,
                          inspectors: [...prev.inspectors, { name: value, email: email || '', avatar_url: '' }],
                          inspector_name: prev.inspectors.length === 0 ? value : prev.inspector_name,
                          inspector_email: prev.inspectors.length === 0 ? (email || '') : prev.inspector_email
                        }));
                      }
                    }}
                    placeholder={formData.inspectors.length === 0 ? "Adicionar inspetor principal" : "Adicionar mais inspetores..."}
                    apiEndpoint="/api/autosuggest/inspectors"
                    onAddNew={() => setShowNewUserModal(true)}
                    addNewText="Novo Inspetor"
                    showEmail={true}
                  />
                )}
                <p className="text-xs text-slate-500">
                  Você pode adicionar até 5 inspetores. O primeiro será o inspetor principal.
                </p>
              </div>
            </div>

            {/* Responsável no Local */}
            <div className="border-t border-slate-200 pt-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Shield className="w-4 h-4 inline mr-1" />
                Responsável no Local
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AutoSuggestField
                  label=""
                  name="responsible_name"
                  value={formData.responsible_name}
                  onChange={(value, email) => setFormData(prev => ({
                    ...prev,
                    responsible_name: value,
                    responsible_email: email || prev.responsible_email
                  }))}
                  placeholder="Nome do contato"
                  apiEndpoint="/api/autosuggest/responsibles"
                  showEmail={true}
                />
                <div>
                  <input
                    type="email"
                    id="responsible_email"
                    name="responsible_email"
                    value={formData.responsible_email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="email@empresa.com"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    id="responsible_role"
                    name="responsible_role"
                    value={formData.responsible_role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="Cargo (ex: Gerente de SST)"
                  />
                </div>
              </div>
            </div>

            {/* Schedule and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-6">
              <div>
                <label htmlFor="scheduled_date" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />Data Agendada
                </label>
                <input
                  type="date"
                  id="scheduled_date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-semibold text-slate-700 mb-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />Prioridade
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                >
                  <option value="baixa">🟢 Baixa</option>
                  <option value="media">🟡 Média</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="critica">🔴 Crítica</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Configuração Final</h3>
                <p className="text-slate-500">Template, IA e tipo de plano</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="ai_assistant_id" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Sparkles className="w-4 h-4 inline mr-1 text-purple-500" />Assistente de IA Especializado
                </label>
                <select id="ai_assistant_id" name="ai_assistant_id" value={formData.ai_assistant_id} onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all"
                >
                  <option value="">Assistente Geral de Segurança do Trabalho</option>
                  {aiAssistants.map(assistant => (
                    <option key={assistant.id} value={assistant.id}>{assistant.name} - {assistant.specialization}</option>
                  ))}
                </select>
                {formData.ai_assistant_id && aiAssistants.find(a => a.id == formData.ai_assistant_id) && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-purple-900">Especialista Selecionado</span>
                    </div>
                    <p className="text-purple-700 text-sm mt-1">
                      {aiAssistants.find(a => a.id == formData.ai_assistant_id)?.description}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <FileCheck className="w-4 h-4 inline mr-1" />Template de Checklist
                </label>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left flex items-center justify-between group"
                >
                  <span className={formData.template_id ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                    {getSelectedTemplate() ? getSelectedTemplate()!.name : 'Selecionar Template...'}
                  </span>
                  <FileCheck className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </button>
                {formData.template_id && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Template Selecionado</span>
                      </div>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, template_id: '' }))}
                        className="text-xs text-blue-600 hover:text-blue-800 underline">Remover</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="action_plan_type" className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Plano de Ação</label>
                <select id="action_plan_type" name="action_plan_type" value={formData.action_plan_type} onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                >
                  <option value="5w2h">5W2H (Completo)</option>
                  <option value="simple">Simples</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">5W2H: O quê, Por quê, Onde, Quando, Quem, Como, Quanto</p>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl cursor-pointer hover:border-emerald-400 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-lg text-white">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-900 block">Habilitar Análise de Conformidade</span>
                      <span className="text-sm text-emerald-700">Permite avaliar cada item como Conforme, Não Conforme ou N/A</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.compliance_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, compliance_enabled: e.target.checked }))}
                    className="w-6 h-6 text-emerald-600 border-2 border-emerald-300 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
            <div className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />Resumo da Inspeção
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500">Título</p><p className="font-medium text-slate-900">{formData.title || '-'}</p></div>
                <div><p className="text-slate-500">Empresa</p><p className="font-medium text-slate-900">{formData.company_name || '-'}</p></div>
                <div>
                  <p className="text-slate-500">Setores / Áreas</p>
                  <p className="font-medium text-slate-900">
                    {formData.sectors.length > 0 ? formData.sectors.join(', ') : formData.location || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Endereço</p>
                  <p className="font-medium text-slate-900 text-xs">
                    {formData.logradouro
                      ? `${formData.logradouro}${formData.numero ? `, ${formData.numero}` : ''} - ${formData.bairro || ''}, ${formData.cidade || ''}/${formData.uf || ''}`
                      : formData.address || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Inspetores</p>
                  <div className="flex items-center gap-2 mt-1">
                    {formData.inspectors.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {formData.inspectors.slice(0, 3).map((inspector, idx) => (
                            <UserAvatar key={idx} name={inspector.name} avatarUrl={inspector.avatar_url} size="xs" />
                          ))}
                        </div>
                        <span className="font-medium text-slate-900">
                          {formData.inspectors.map(i => i.name.split(' ')[0]).join(', ')}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-slate-900">{formData.inspector_name || '-'}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Responsável no Local</p>
                  <p className="font-medium text-slate-900">{formData.responsible_name || '-'}</p>
                </div>
                <div><p className="text-slate-500">Data Agendada</p><p className="font-medium text-slate-900">{formData.scheduled_date || 'Não agendada'}</p></div>
                <div><p className="text-slate-500">Prioridade</p><p className="font-medium text-slate-900 capitalize">{formData.priority}</p></div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/inspections')} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {existingId ? 'Editar Inspeção' : 'Nova Inspeção'}
            </h1>
            <p className="text-slate-500 mt-1">
              {existingId ? 'Atualize os dados da inspeção de segurança do trabalho' : 'Crie uma nova inspeção de segurança do trabalho'}
            </p>
          </div>
        </div>

        <StepProgressBar />

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="p-8">{renderStepContent()}</div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button type="button" onClick={currentStep === 1 ? () => navigate('/inspections') : goToPreviousStep}
                className="flex items-center px-5 py-2.5 text-slate-600 border border-slate-300 rounded-xl hover:bg-white transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />{currentStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {currentStep < 4 ? (
                <button type="button" onClick={goToNextStep} disabled={!canProceed}
                  className={`flex items-center px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${canProceed
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  Próximo<ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button type="button" disabled={loading || !canProceed || submitProtection}
                  onClick={handleSubmit} // Explicit click handler
                  className={`flex items-center px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${!loading && canProceed && !submitProtection
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{existingId ? 'Salvando...' : 'Criando...'}</>)
                    : (<><Save className="w-4 h-4 mr-2" />{existingId ? 'Salvar Alterações' : 'Criar Inspeção'}</>)}
                </button>
              )}
            </div>
          </form>
        </div>

        <NewUserModal isOpen={showNewUserModal} onClose={() => setShowNewUserModal(false)}
          onUserCreated={(user) => setFormData(prev => ({ ...prev, inspector_name: user.name, inspector_email: user.email }))}
          organizationId={selectedOrgId || undefined}
        />
        <NewOrganizationModal isOpen={showNewOrgModal} onClose={() => setShowNewOrgModal(false)} onSuccess={() => { }} parentOrganizations={[]} />
        <TemplateSelectionModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} onSelect={handleTemplateSelect} folders={folders} templates={templates} />
      </div>
    </Layout>
  );
}
