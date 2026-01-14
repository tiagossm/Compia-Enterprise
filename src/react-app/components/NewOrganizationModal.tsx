import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import DialogWrapper from './DialogWrapper';
import {
  X,
  Building2,
  Loader2,
  Crown,
  Search,
  CheckCircle,
  AlertCircle,
  Users,
  Shield,
  FileText,
  TrendingUp,
  Upload,
  Image,
  Trash2
} from 'lucide-react';
import { ExtendedMochaUser, USER_ROLES, ORGANIZATION_LEVELS } from '@/shared/user-types';

interface NewOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentOrganizations: any[];
}

export default function NewOrganizationModal({
  isOpen,
  onClose,
  onSuccess,
  parentOrganizations
}: NewOrganizationModalProps) {
  const { user } = useAuth();
  const extendedUser = user as ExtendedMochaUser;
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState('basic');
  const [availableOrganizations, setAvailableOrganizations] = useState<any[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'company',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    parent_organization_id: '',
    subscription_plan: 'basic',
    max_users: 50,
    max_subsidiaries: 0,
    // New professional fields
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    cnae_principal: '',
    cnae_descricao: '',
    natureza_juridica: '',
    data_abertura: '',
    capital_social: '',
    porte_empresa: '',
    situacao_cadastral: '',
    numero_funcionarios: '',
    setor_industria: '',
    subsetor_industria: '',
    certificacoes_seguranca: '',
    data_ultima_auditoria: '',
    nivel_risco: 'medio',
    contato_seguranca_nome: '',
    contato_seguranca_email: '',
    contato_seguranca_telefone: '',
    historico_incidentes: '',
    observacoes_compliance: '',
    website: '',
    faturamento_anual: '',
    logo_url: ''
  });

  const handleCnpjLookup = async () => {
    if (!formData.cnpj.trim()) {
      alert('Digite um CNPJ para buscar');
      return;
    }

    setCnpjLoading(true);
    setCnpjStatus('idle');

    try {
      // Remove formatação do CNPJ (pontos, barras, traços, espaços)
      const cleanCnpj = formData.cnpj.replace(/[.\-/\s]/g, '');
      const response = await fetch(`/api/cnpj/${cleanCnpj}`);

      if (response.ok) {
        const data = await response.json();

        // Verificar se os dados da empresa estão disponíveis
        if (data && data.success && data.data) {
          const company = data.data; // Usar os dados da resposta da API

          // Auto-fill form with CNPJ data
          setFormData(prev => ({
            ...prev,
            name: company.nome_fantasia || company.nome || company.razao_social || prev.name,
            razao_social: company.razao_social || '',
            nome_fantasia: company.nome_fantasia || '',
            cnae_principal: company.cnae_principal || '',
            cnae_descricao: company.cnae_descricao || '',
            natureza_juridica: company.natureza_juridica || '',
            data_abertura: company.data_abertura || '',
            capital_social: company.capital_social ? company.capital_social.toString() : '',
            porte_empresa: company.porte_empresa || '',
            situacao_cadastral: company.situacao_cadastral || '',
            address: company.address || prev.address,
            contact_email: company.contact_email || prev.contact_email,
            contact_phone: company.contact_phone || prev.contact_phone,
            website: company.website || prev.website
          }));
        } else {
          throw new Error('Dados da empresa não encontrados na resposta');
        }

        setCnpjStatus('success');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao buscar CNPJ');
        setCnpjStatus('error');
      }
    } catch (error) {
      console.error('CNPJ lookup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar CNPJ. Verifique sua conexão.';
      alert(errorMessage);
      setCnpjStatus('error');
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestBody = { ...formData };
      if (requestBody.parent_organization_id === '') {
        requestBody.parent_organization_id = undefined as any;
      }

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        console.log('Organização criada com sucesso, iniciando refresh...');

        // Reset form data
        setFormData({
          name: '',
          type: 'company',
          description: '',
          contact_email: '',
          contact_phone: '',
          address: '',
          parent_organization_id: '',
          subscription_plan: 'basic',
          max_users: 50,
          max_subsidiaries: 0,
          cnpj: '',
          razao_social: '',
          nome_fantasia: '',
          cnae_principal: '',
          cnae_descricao: '',
          natureza_juridica: '',
          data_abertura: '',
          capital_social: '',
          porte_empresa: '',
          situacao_cadastral: '',
          numero_funcionarios: '',
          setor_industria: '',
          subsetor_industria: '',
          certificacoes_seguranca: '',
          data_ultima_auditoria: '',
          nivel_risco: 'medio',
          contato_seguranca_nome: '',
          contato_seguranca_email: '',
          contato_seguranca_telefone: '',
          historico_incidentes: '',
          observacoes_compliance: '',
          website: '',
          faturamento_anual: '',
          logo_url: ''
        });
        setCnpjStatus('idle');
        setActiveTab('basic');

        // Trigger refresh BEFORE closing modal to ensure it happens
        console.log('Chamando onSuccess para refresh...');
        onSuccess();

        // Small delay to ensure refresh completes before closing
        setTimeout(() => {
          onClose();
          alert('Organização criada com sucesso!');
        }, 500);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar organização');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert(error instanceof Error ? error.message : 'Erro ao criar organização. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar organizações disponíveis
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!isOpen) return;

      setLoadingOrganizations(true);
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          console.log('Organizações carregadas para seleção pai:', data);
          setAvailableOrganizations(data.organizations || []);
        } else {
          console.error('Erro ao carregar organizações para seleção pai');
        }
      } catch (error) {
        console.error('Erro ao carregar organizações:', error);
      } finally {
        setLoadingOrganizations(false);
      }
    };

    loadOrganizations();
  }, [isOpen]);

  const getAvailableParentOrganizations = () => {
    // Usar as organizações carregadas via API em vez das props
    const orgsToFilter = availableOrganizations.length > 0 ? availableOrganizations : parentOrganizations;

    if (extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN) {
      return orgsToFilter.filter(org =>
        org.organization_level !== ORGANIZATION_LEVELS.SUBSIDIARY
      );
    } else if (extendedUser?.profile?.role === USER_ROLES.ORG_ADMIN) {
      return orgsToFilter.filter(org =>
        org.id === extendedUser.profile?.managed_organization_id
      );
    }
    return orgsToFilter || [];
  };

  if (!isOpen) return null;

  return (
    <DialogWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Organização"
      description={extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN
        ? 'Criar uma nova empresa cliente ou subsidiária'
        : 'Criar uma nova subsidiária'
      }
      maxWidth="max-w-6xl"
      className="max-h-[95vh] overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Nova Organização
              </h2>
              <p className="text-sm text-slate-600">
                {extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN
                  ? 'Criar uma nova empresa cliente ou subsidiária'
                  : 'Criar uma nova subsidiária'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Dados Básicos
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              Informações Empresariais
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'safety'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Segurança & Compliance
            </button>
            {extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN && (
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'subscription'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                <Crown className="w-4 h-4 inline mr-2" />
                Assinatura
              </button>
            )}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* CNPJ Lookup Section */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  Busca Automática por CNPJ
                </h3>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o CNPJ (apenas números ou com formatação)"
                      maxLength={18}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCnpjLookup}
                    disabled={cnpjLoading || !formData.cnpj.trim()}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {cnpjLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Buscar
                      </>
                    )}
                  </button>
                </div>

                {cnpjStatus === 'success' && (
                  <div className="mt-3 flex items-center text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Dados da empresa carregados com sucesso!
                  </div>
                )}

                {cnpjStatus === 'error' && (
                  <div className="mt-3 flex items-center text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Não foi possível carregar os dados. Verifique o CNPJ ou preencha manualmente.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome da Organização *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Empresa ABC Ltda"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="company">Empresa</option>
                    <option value="consultancy">Consultoria</option>
                    <option value="client">Cliente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descrição opcional da organização..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email de Contato
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contato@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone de Contato
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 9999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Endereço completo da organização"
                />
              </div>

              {/* Hierarchical Organization Selection */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  Estrutura Hierárquica
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Organização Pai
                  </label>
                  <select
                    value={formData.parent_organization_id}
                    onChange={(e) => setFormData({ ...formData, parent_organization_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loadingOrganizations}
                  >
                    <option value="">
                      {loadingOrganizations
                        ? 'Carregando organizações...'
                        : extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN
                          ? 'Nenhuma (Empresa Cliente Independente)'
                          : 'Selecione a organização pai'
                      }
                    </option>
                    {getAvailableParentOrganizations().map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.organization_level === ORGANIZATION_LEVELS.MASTER ? 'Master' : 'Empresa'})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {loadingOrganizations
                      ? 'Carregando organizações disponíveis...'
                      : extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN
                        ? 'Deixe vazio para criar uma empresa cliente independente'
                        : 'Selecione sua organização como pai para criar uma subsidiária'
                    }
                  </p>
                  {availableOrganizations.length === 0 && !loadingOrganizations && (
                    <p className="text-xs text-orange-600 mt-1">
                      Nenhuma organização disponível encontrada. Verifique suas permissões.
                    </p>
                  )}
                  {availableOrganizations.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {availableOrganizations.length} organização(ões) disponível(eis)
                    </p>
                  )}
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <Image className="inline h-4 w-4 mr-1" />
                  Logo da Organização
                </label>
                <div className="flex items-start gap-4">
                  {formData.logo_url ? (
                    <div className="relative">
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="w-24 h-24 object-contain border border-slate-200 rounded-lg bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Remover logo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-white">
                      <Image className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="flex items-center justify-center px-4 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <Upload className="w-4 h-4 mr-2 text-slate-600" />
                      <span className="text-sm text-slate-600">Escolher imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              setFormData({ ...formData, logo_url: base64 });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-2">
                      PNG, JPG ou SVG. Máx 2MB. A logo aparecerá nos relatórios de inspeção.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Information Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    placeholder="Razão social da empresa"
                    readOnly={cnpjStatus === 'success'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    placeholder="Nome fantasia"
                    readOnly={cnpjStatus === 'success'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CNAE Principal
                  </label>
                  <input
                    type="text"
                    value={formData.cnae_principal}
                    onChange={(e) => setFormData({ ...formData, cnae_principal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    placeholder="Código CNAE"
                    readOnly={cnpjStatus === 'success'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Porte da Empresa
                  </label>
                  <select
                    value={formData.porte_empresa}
                    onChange={(e) => setFormData({ ...formData, porte_empresa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione o porte</option>
                    <option value="MEI">MEI</option>
                    <option value="ME">Microempresa</option>
                    <option value="EPP">Empresa de Pequeno Porte</option>
                    <option value="MEDIA">Média Empresa</option>
                    <option value="GRANDE">Grande Empresa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descrição CNAE
                </label>
                <textarea
                  value={formData.cnae_descricao}
                  onChange={(e) => setFormData({ ...formData, cnae_descricao: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                  placeholder="Descrição da atividade principal"
                  readOnly={cnpjStatus === 'success'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Número de Funcionários
                  </label>
                  <input
                    type="number"
                    value={formData.numero_funcionarios}
                    onChange={(e) => setFormData({ ...formData, numero_funcionarios: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 50"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Data de Abertura
                  </label>
                  <input
                    type="date"
                    value={formData.data_abertura}
                    onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    readOnly={cnpjStatus === 'success'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Faturamento Anual (R$)
                  </label>
                  <input
                    type="number"
                    value={formData.faturamento_anual}
                    onChange={(e) => setFormData({ ...formData, faturamento_anual: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 1000000"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Setor da Indústria
                  </label>
                  <select
                    value={formData.setor_industria}
                    onChange={(e) => setFormData({ ...formData, setor_industria: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione o setor</option>
                    <option value="Construção Civil">Construção Civil</option>
                    <option value="Indústria">Indústria</option>
                    <option value="Manufatura">Manufatura</option>
                    <option value="Mineração">Mineração</option>
                    <option value="Petróleo e Gás">Petróleo e Gás</option>
                    <option value="Energia">Energia</option>
                    <option value="Logística">Logística</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Varejo">Varejo</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Natureza Jurídica
                  </label>
                  <input
                    type="text"
                    value={formData.natureza_juridica}
                    onChange={(e) => setFormData({ ...formData, natureza_juridica: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    placeholder="Natureza jurídica"
                    readOnly={cnpjStatus === 'success'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Safety & Compliance Tab */}
          {activeTab === 'safety' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                <h3 className="font-medium text-slate-900 mb-2">Informações do Responsável de Segurança</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.contato_seguranca_nome}
                      onChange={(e) => setFormData({ ...formData, contato_seguranca_nome: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Nome do responsável SST"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email Corporativo
                    </label>
                    <input
                      type="email"
                      value={formData.contato_seguranca_email}
                      onChange={(e) => setFormData({ ...formData, contato_seguranca_email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="email.sst@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Telefone / Ramal
                    </label>
                    <input
                      type="tel"
                      value={formData.contato_seguranca_telefone}
                      onChange={(e) => setFormData({ ...formData, contato_seguranca_telefone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="(11) 9999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nível de Risco Calculado
                    </label>
                    <select
                      value={formData.nivel_risco}
                      onChange={(e) => setFormData({ ...formData, nivel_risco: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="baixo">Baixo (Grau 1 e 2)</option>
                      <option value="medio">Médio (Grau 3)</option>
                      <option value="alto">Alto (Grau 4)</option>
                      <option value="critico">Crítico (Atividades Especiais)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Histórico de Incidentes
                </label>
                <textarea
                  value={formData.historico_incidentes}
                  onChange={(e) => setFormData({ ...formData, historico_incidentes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Resumo de incidentes relevantes nos últimos 12 meses..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observações de Compliance
                </label>
                <textarea
                  value={formData.observacoes_compliance}
                  onChange={(e) => setFormData({ ...formData, observacoes_compliance: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Detalhes sobre certificações, auditorias pendentes ou requisitos especiais..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Certificações de Segurança (Separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.certificacoes_seguranca}
                  onChange={(e) => setFormData({ ...formData, certificacoes_seguranca: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ex: ISO 45001, OHSAS 18001, NR-12"
                />
              </div>
            </div>
          )}

          {/* Subscription Tab (Admin Only) */}
          {activeTab === 'subscription' && extendedUser?.profile?.role === USER_ROLES.SYSTEM_ADMIN && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plano de Assinatura
                  </label>
                  <select
                    value={formData.subscription_plan}
                    onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="basic">Básico</option>
                    <option value="pro">Profissional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Limite de Usuários
                  </label>
                  <input
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Limite de Subsidiárias
                  </label>
                  <input
                    type="number"
                    value={formData.max_subsidiaries}
                    onChange={(e) => setFormData({ ...formData, max_subsidiaries: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Criar Organização
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DialogWrapper>
  );
}
