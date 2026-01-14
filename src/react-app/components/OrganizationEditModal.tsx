import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Save,
  AlertCircle,
  Users,
  Shield,
  FileText,
  TrendingUp,
  Settings,
  Crown,
  Search,
  CheckCircle,
  Loader2,
  Upload,
  Image,
  Trash2
} from 'lucide-react';
import { Organization } from '../../shared/types';

interface OrganizationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onUpdate: (organizationId: number, data: Partial<Organization>) => void;
}

export default function OrganizationEditModal({
  isOpen,
  onClose,
  organization,
  onUpdate
}: OrganizationEditModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [formData, setFormData] = useState({
    name: '',
    type: 'company' as 'company' | 'consultancy' | 'client',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    website: '',
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
    faturamento_anual: '',
    subscription_plan: 'basic' as 'basic' | 'pro' | 'enterprise',
    max_users: 50,
    max_subsidiaries: 0,
    is_active: true,
    logo_url: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        type: (organization.type as 'company' | 'consultancy' | 'client') || 'company',
        description: organization.description || '',
        contact_email: organization.contact_email || '',
        contact_phone: organization.contact_phone || '',
        address: organization.address || '',
        website: organization.website || '',
        cnpj: organization.cnpj || '',
        razao_social: organization.razao_social || '',
        nome_fantasia: organization.nome_fantasia || '',
        cnae_principal: organization.cnae_principal || '',
        cnae_descricao: organization.cnae_descricao || '',
        natureza_juridica: organization.natureza_juridica || '',
        data_abertura: organization.data_abertura || '',
        capital_social: organization.capital_social?.toString() || '',
        porte_empresa: organization.porte_empresa || '',
        situacao_cadastral: organization.situacao_cadastral || '',
        numero_funcionarios: organization.numero_funcionarios?.toString() || '',
        setor_industria: organization.setor_industria || '',
        subsetor_industria: organization.subsetor_industria || '',
        certificacoes_seguranca: organization.certificacoes_seguranca || '',
        data_ultima_auditoria: organization.data_ultima_auditoria || '',
        nivel_risco: organization.nivel_risco || 'medio',
        contato_seguranca_nome: organization.contato_seguranca_nome || '',
        contato_seguranca_email: organization.contato_seguranca_email || '',
        contato_seguranca_telefone: organization.contato_seguranca_telefone || '',
        historico_incidentes: organization.historico_incidentes || '',
        observacoes_compliance: organization.observacoes_compliance || '',
        faturamento_anual: organization.faturamento_anual?.toString() || '',
        subscription_plan: (organization.subscription_plan as 'basic' | 'pro' | 'enterprise') || 'basic',
        max_users: organization.max_users || 50,
        max_subsidiaries: organization.max_subsidiaries || 0,
        is_active: organization.is_active ?? true,
        logo_url: organization.logo_url || ''
      });
      setErrors({});
      setCnpjStatus('idle');
    }
  }, [organization]);

  const handleCnpjLookup = async () => {
    if (!formData.cnpj.trim()) {
      alert('Digite um CNPJ para buscar');
      return;
    }

    setCnpjLoading(true);
    setCnpjStatus('idle');

    try {
      const cleanCnpj = formData.cnpj.replace(/[.\-/\s]/g, '');
      const response = await fetch(`/api/cnpj/${cleanCnpj}`);

      if (response.ok) {
        const data = await response.json();

        if (data && data.success && data.data) {
          const company = data.data;

          setFormData(prev => ({
            ...prev,
            razao_social: company.razao_social || prev.razao_social,
            nome_fantasia: company.nome_fantasia || prev.nome_fantasia,
            cnae_principal: company.cnae_principal || prev.cnae_principal,
            cnae_descricao: company.cnae_descricao || prev.cnae_descricao,
            natureza_juridica: company.natureza_juridica || prev.natureza_juridica,
            data_abertura: company.data_abertura || prev.data_abertura,
            capital_social: company.capital_social ? company.capital_social.toString() : prev.capital_social,
            porte_empresa: company.porte_empresa || prev.porte_empresa,
            situacao_cadastral: company.situacao_cadastral || prev.situacao_cadastral,
            address: company.address || prev.address,
            contact_email: company.contact_email || prev.contact_email,
            contact_phone: company.contact_phone || prev.contact_phone,
            website: company.website || prev.website
          }));
        }

        setCnpjStatus('success');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao buscar CNPJ');
        setCnpjStatus('error');
      }
    } catch (error) {
      console.error('CNPJ lookup error:', error);
      alert('Erro ao buscar CNPJ. Verifique sua conexão.');
      setCnpjStatus('error');
    } finally {
      setCnpjLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da organização é obrigatório';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Email inválido';
    }

    if (formData.website && !formData.website.startsWith('http')) {
      newErrors.website = 'Website deve começar com http:// ou https://';
    }

    if (formData.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Converter campos numéricos
      const submitData = {
        ...formData,
        numero_funcionarios: formData.numero_funcionarios ? parseInt(formData.numero_funcionarios) : undefined,
        capital_social: formData.capital_social ? parseFloat(formData.capital_social) : undefined,
        faturamento_anual: formData.faturamento_anual ? parseFloat(formData.faturamento_anual) : undefined
      };

      await onUpdate(organization.id, submitData);
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar organização:', error);
      setErrors({ submit: 'Erro ao atualizar organização. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Editar Organização
              </h2>
              <p className="text-sm text-gray-600">{organization.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{errors.submit}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Dados Básicos
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'company'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                Informações Empresariais
              </button>
              <button
                onClick={() => setActiveTab('safety')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'safety'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Segurança & Compliance
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'subscription'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Crown className="w-4 h-4 inline mr-2" />
                Configurações
              </button>
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* CNPJ Lookup Section */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    Busca Automática por CNPJ
                  </h3>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.cnpj ? 'border-red-300' : 'border-gray-300'
                          }`}
                        placeholder="Digite o CNPJ (apenas números ou com formatação)"
                        maxLength={18}
                      />
                      {errors.cnpj && <p className="mt-1 text-sm text-red-600">{errors.cnpj}</p>}
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
                          Atualizar
                        </>
                      )}
                    </button>
                  </div>

                  {cnpjStatus === 'success' && (
                    <div className="mt-3 flex items-center text-green-700 text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Dados da empresa atualizados com sucesso!
                    </div>
                  )}

                  {cnpjStatus === 'error' && (
                    <div className="mt-3 flex items-center text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Não foi possível carregar os dados. Verifique o CNPJ.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Organização *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="Ex: Empresa ABC Ltda"
                      required
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="company">Empresa</option>
                      <option value="consultancy">Consultoria</option>
                      <option value="client">Cliente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descrição da organização"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email de Contato
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.contact_email ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="contato@empresa.com"
                    />
                    {errors.contact_email && <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="inline h-4 w-4 mr-1" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.website ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="https://www.empresa.com"
                    />
                    {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Endereço completo"
                  />
                </div>

                {/* Logo Upload Section */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Image className="inline h-4 w-4 mr-1" />
                    Logo da Organização
                  </label>
                  <div className="flex items-start gap-4">
                    {formData.logo_url ? (
                      <div className="relative">
                        <img
                          src={formData.logo_url}
                          alt="Logo"
                          className="w-24 h-24 object-contain border border-gray-200 rounded-lg bg-white p-1"
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
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
                        <Image className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4 mr-2 text-gray-600" />
                        <span className="text-sm text-gray-600">Escolher imagem</span>
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
                      <p className="text-xs text-gray-500 mt-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razão Social
                    </label>
                    <input
                      type="text"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Razão social da empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nome fantasia"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CNAE Principal
                    </label>
                    <input
                      type="text"
                      value={formData.cnae_principal}
                      onChange={(e) => setFormData({ ...formData, cnae_principal: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Código CNAE"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porte da Empresa
                    </label>
                    <select
                      value={formData.porte_empresa}
                      onChange={(e) => setFormData({ ...formData, porte_empresa: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição CNAE
                  </label>
                  <textarea
                    value={formData.cnae_descricao}
                    onChange={(e) => setFormData({ ...formData, cnae_descricao: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descrição da atividade principal"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Número de Funcionários
                    </label>
                    <input
                      type="number"
                      value={formData.numero_funcionarios}
                      onChange={(e) => setFormData({ ...formData, numero_funcionarios: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 50"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Abertura
                    </label>
                    <input
                      type="date"
                      value={formData.data_abertura}
                      onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      Faturamento Anual (R$)
                    </label>
                    <input
                      type="number"
                      value={formData.faturamento_anual}
                      onChange={(e) => setFormData({ ...formData, faturamento_anual: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 1000000"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Setor da Indústria
                    </label>
                    <select
                      value={formData.setor_industria}
                      onChange={(e) => setFormData({ ...formData, setor_industria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione o setor</option>
                      <option value="Construção Civil">Construção Civil</option>
                      <option value="Indústria">Indústria</option>
                      <option value="Petróleo e Gás">Petróleo e Gás</option>
                      <option value="Mineração">Mineração</option>
                      <option value="Química">Química</option>
                      <option value="Metalúrgica">Metalúrgica</option>
                      <option value="Alimentícia">Alimentícia</option>
                      <option value="Têxtil">Têxtil</option>
                      <option value="Logística">Logística</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Educação">Educação</option>
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Serviços">Serviços</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subsetor
                    </label>
                    <input
                      type="text"
                      value={formData.subsetor_industria}
                      onChange={(e) => setFormData({ ...formData, subsetor_industria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Construção Pesada, Offshore, etc."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Safety & Compliance Tab */}
            {activeTab === 'safety' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Nível de Risco
                    </label>
                    <select
                      value={formData.nivel_risco}
                      onChange={(e) => setFormData({ ...formData, nivel_risco: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="baixo">Baixo</option>
                      <option value="medio">Médio</option>
                      <option value="alto">Alto</option>
                      <option value="critico">Crítico</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data da Última Auditoria de SST
                    </label>
                    <input
                      type="date"
                      value={formData.data_ultima_auditoria}
                      onChange={(e) => setFormData({ ...formData, data_ultima_auditoria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certificações de Segurança
                  </label>
                  <textarea
                    value={formData.certificacoes_seguranca}
                    onChange={(e) => setFormData({ ...formData, certificacoes_seguranca: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: ISO 45001, OHSAS 18001, ISO 14001, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsável pela Segurança
                    </label>
                    <input
                      type="text"
                      value={formData.contato_seguranca_nome}
                      onChange={(e) => setFormData({ ...formData, contato_seguranca_nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nome do responsável"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Responsável
                    </label>
                    <input
                      type="email"
                      value={formData.contato_seguranca_email}
                      onChange={(e) => setFormData({ ...formData, contato_seguranca_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="seguranca@empresa.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone do Responsável
                    </label>
                    <input
                      type="tel"
                      value={formData.contato_seguranca_telefone}
                      onChange={(e) => setFormData({ ...formData, contato_seguranca_telefone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(11) 9999-9999"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Histórico de Incidentes Relevantes
                  </label>
                  <textarea
                    value={formData.historico_incidentes}
                    onChange={(e) => setFormData({ ...formData, historico_incidentes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Resumo de incidentes graves ou estatísticas relevantes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações de Compliance
                  </label>
                  <textarea
                    value={formData.observacoes_compliance}
                    onChange={(e) => setFormData({ ...formData, observacoes_compliance: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Informações sobre conformidade regulatória, pendências, etc."
                  />
                </div>
              </div>
            )}

            {/* Subscription Settings Tab */}
            {activeTab === 'subscription' && (
              <div className="bg-blue-50 rounded-lg p-6 space-y-6">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  Configurações de Assinatura
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plano de Assinatura
                    </label>
                    <select
                      value={formData.subscription_plan}
                      onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="basic">Básico</option>
                      <option value="pro">Profissional</option>
                      <option value="enterprise">Empresarial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de Usuários
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 50 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de Subsidiárias
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.max_subsidiaries}
                      onChange={(e) => setFormData({ ...formData, max_subsidiaries: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Organização ativa
                  </label>
                </div>
              </div>
            )}

            {/* Navigation and Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {activeTab !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = ['basic', 'company', 'safety', 'subscription'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1]);
                      }
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Anterior
                  </button>
                )}
                {activeTab !== 'subscription' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = ['basic', 'company', 'safety', 'subscription'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) {
                        setActiveTab(tabs[currentIndex + 1]);
                      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Próximo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
