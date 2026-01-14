import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchWithAuth } from '@/react-app/utils/auth';
import Layout from '@/react-app/components/Layout';
import StatsCard from '@/react-app/components/StatsCard';
import {
  Building2,
  ArrowLeft,
  Users,
  ClipboardList,
  Target,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ExternalLink,
  Globe
} from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  type: string;
  description?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  // New professional fields
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnae_principal?: string;
  cnae_descricao?: string;
  natureza_juridica?: string;
  data_abertura?: string;
  capital_social?: number;
  porte_empresa?: string;
  situacao_cadastral?: string;
  numero_funcionarios?: number;
  setor_industria?: string;
  subsetor_industria?: string;
  certificacoes_seguranca?: string;
  data_ultima_auditoria?: string;
  nivel_risco?: string;
  contato_seguranca_nome?: string;
  contato_seguranca_email?: string;
  contato_seguranca_telefone?: string;
  historico_incidentes?: string;
  observacoes_compliance?: string;
  website?: string;
  faturamento_anual?: number;
}

interface OrganizationStats {
  users_count: number;
  inspections_count: number;
  pending_inspections: number;
  completed_inspections: number;
  active_actions: number;
  overdue_actions: number;
  recent_inspections: Array<{
    id: number;
    title: string;
    status: string;
    created_at: string;
    inspector_name: string;
  }>;
}

export default function OrganizationProfile() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrganizationData();
    }
  }, [id]);

  const fetchOrganizationData = async () => {
    try {
      const [orgResponse, statsResponse] = await Promise.all([
        fetchWithAuth(`/api/organizations/${id}`),
        fetchWithAuth(`/api/organizations/${id}/stats`)
      ]);

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganization(orgData.organization);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'company': return 'Empresa';
      case 'consultancy': return 'Consultoria';
      case 'client': return 'Cliente';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'bg-blue-100 text-blue-800';
      case 'consultancy': return 'bg-purple-100 text-purple-800';
      case 'client': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'em_andamento':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'concluida':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!organization) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Organização não encontrada
          </h2>
          <p className="text-slate-600 mb-6">
            A organização solicitada não existe ou você não tem acesso a ela.
          </p>
          <Link
            to="/organizations"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Organizações
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to="/organizations"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-100 rounded-xl">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-heading text-3xl font-bold text-slate-900">
                    {organization.name}
                  </h1>
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(organization.type)}`}>
                    {getTypeLabel(organization.type)}
                  </span>
                  <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${organization.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {organization.is_active ? 'Ativa' : 'Inativa'}
                  </div>
                </div>
                {organization.description && (
                  <p className="text-slate-600">{organization.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/inspections?org=${organization.id}`}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Ver Inspeções
            </Link>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Informações da Empresa
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Company Data */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-800 pb-2 border-b border-slate-200">
                Dados Básicos
              </h3>

              {organization.cnpj && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">CNPJ:</span>
                  <span className="text-sm text-slate-900 font-mono">{organization.cnpj}</span>
                </div>
              )}

              {organization.razao_social && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Razão Social:</span>
                  <span className="text-sm text-slate-900">{organization.razao_social}</span>
                </div>
              )}

              {organization.nome_fantasia && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Nome Fantasia:</span>
                  <span className="text-sm text-slate-900">{organization.nome_fantasia}</span>
                </div>
              )}

              {organization.porte_empresa && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Porte:</span>
                  <span className="text-sm text-slate-900">{organization.porte_empresa}</span>
                </div>
              )}

              {organization.situacao_cadastral && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Situação:</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full text-xs ${organization.situacao_cadastral.toLowerCase().includes('ativa')
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {organization.situacao_cadastral}
                  </span>
                </div>
              )}

              {organization.data_abertura && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Data de Abertura:</span>
                  <span className="text-sm text-slate-900">
                    {new Date(organization.data_abertura).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            {/* Business Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-800 pb-2 border-b border-slate-200">
                Detalhes do Negócio
              </h3>

              {organization.setor_industria && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Setor:</span>
                  <span className="text-sm text-slate-900">{organization.setor_industria}</span>
                </div>
              )}

              {organization.subsetor_industria && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Subsetor:</span>
                  <span className="text-sm text-slate-900">{organization.subsetor_industria}</span>
                </div>
              )}

              {organization.cnae_principal && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">CNAE:</span>
                  <span className="text-sm text-slate-900 font-mono">{organization.cnae_principal}</span>
                </div>
              )}

              {organization.numero_funcionarios && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Funcionários:</span>
                  <span className="text-sm text-slate-900 font-semibold">{organization.numero_funcionarios.toLocaleString('pt-BR')}</span>
                </div>
              )}

              {organization.faturamento_anual && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Faturamento Anual:</span>
                  <span className="text-sm text-slate-900 font-semibold">
                    R$ {organization.faturamento_anual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {organization.nivel_risco && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Nível de Risco:</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full text-xs ${organization.nivel_risco === 'baixo' ? 'bg-green-100 text-green-800' :
                    organization.nivel_risco === 'medio' ? 'bg-yellow-100 text-yellow-800' :
                      organization.nivel_risco === 'alto' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {organization.nivel_risco.charAt(0).toUpperCase() + organization.nivel_risco.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {organization.cnae_descricao && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h4 className="text-sm font-medium text-slate-600 mb-2">Atividade Principal (CNAE):</h4>
              <p className="text-sm text-slate-700">{organization.cnae_descricao}</p>
            </div>
          )}
        </div>

        {/* Safety & Compliance Information */}
        {(organization.certificacoes_seguranca || organization.contato_seguranca_nome || organization.data_ultima_auditoria) && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Segurança e Compliance
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-800 pb-2 border-b border-slate-200">
                  Certificações e Auditorias
                </h3>

                {organization.certificacoes_seguranca && (
                  <div>
                    <span className="text-sm font-medium text-slate-600 block mb-1">Certificações:</span>
                    <p className="text-sm text-slate-900">{organization.certificacoes_seguranca}</p>
                  </div>
                )}

                {organization.data_ultima_auditoria && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Última Auditoria:</span>
                    <span className="text-sm text-slate-900">
                      {new Date(organization.data_ultima_auditoria).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-slate-800 pb-2 border-b border-slate-200">
                  Responsável pela Segurança
                </h3>

                {organization.contato_seguranca_nome && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Nome:</span>
                    <span className="text-sm text-slate-900">{organization.contato_seguranca_nome}</span>
                  </div>
                )}

                {organization.contato_seguranca_email && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Email:</span>
                    <a
                      href={`mailto:${organization.contato_seguranca_email}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {organization.contato_seguranca_email}
                    </a>
                  </div>
                )}

                {organization.contato_seguranca_telefone && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Telefone:</span>
                    <a
                      href={`tel:${organization.contato_seguranca_telefone}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {organization.contato_seguranca_telefone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {(organization.historico_incidentes || organization.observacoes_compliance) && (
              <div className="mt-6 pt-4 border-t border-slate-200 space-y-4">
                {organization.historico_incidentes && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-2">Histórico de Incidentes:</h4>
                    <p className="text-sm text-slate-700 bg-amber-50 p-3 rounded-lg">{organization.historico_incidentes}</p>
                  </div>
                )}

                {organization.observacoes_compliance && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-2">Observações de Compliance:</h4>
                    <p className="text-sm text-slate-700 bg-blue-50 p-3 rounded-lg">{organization.observacoes_compliance}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contact Information */}
        {(organization.contact_email || organization.contact_phone || organization.address || organization.website) && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Informações de Contato
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {organization.contact_email && (
                <div className="flex items-center text-sm text-slate-600">
                  <Mail className="w-4 h-4 mr-2 text-blue-500" />
                  <a
                    href={`mailto:${organization.contact_email}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {organization.contact_email}
                  </a>
                </div>
              )}
              {organization.contact_phone && (
                <div className="flex items-center text-sm text-slate-600">
                  <Phone className="w-4 h-4 mr-2 text-green-500" />
                  <a
                    href={`tel:${organization.contact_phone}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {organization.contact_phone}
                  </a>
                </div>
              )}
              {organization.website && (
                <div className="flex items-center text-sm text-slate-600">
                  <Globe className="w-4 h-4 mr-2 text-purple-500" />
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    Website
                  </a>
                </div>
              )}
              {organization.address && (
                <div className="flex items-center text-sm text-slate-600">
                  <MapPin className="w-4 h-4 mr-2 text-red-500" />
                  <span>{organization.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Usuários"
              value={stats.users_count}
              icon={Users}
              color="blue"
            />
            <StatsCard
              title="Inspeções"
              value={stats.inspections_count}
              icon={ClipboardList}
              color="green"
            />
            <StatsCard
              title="Ações Ativas"
              value={stats.active_actions}
              icon={Target}
              color="yellow"
            />
            <StatsCard
              title="Ações Atrasadas"
              value={stats.overdue_actions}
              icon={AlertCircle}
              color="red"
            />
          </div>
        )}

        {/* Detailed Stats */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inspection Status Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Status das Inspeções
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-amber-600 mr-3" />
                    <span className="font-medium text-amber-900">Pendentes</span>
                  </div>
                  <span className="text-xl font-bold text-amber-600">
                    {stats.pending_inspections}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-3" />
                    <span className="font-medium text-green-900">Concluídas</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {stats.completed_inspections}
                  </span>
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Informações da Organização
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Tipo</span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(organization.type)}`}>
                    {getTypeLabel(organization.type)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${organization.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {organization.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Criada em</span>
                  <div className="flex items-center text-sm text-slate-900">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(organization.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Inspections */}
        {stats?.recent_inspections && stats.recent_inspections.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Inspeções Recentes
              </h3>
              <Link
                to={`/inspections?org=${organization.id}`}
                className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Ver todas
                <ExternalLink className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recent_inspections.map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(inspection.status)}
                      <span className="text-sm font-medium text-slate-900">
                        {inspection.title}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      por {inspection.inspector_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {new Date(inspection.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <Link
                      to={`/inspections/${inspection.id}`}
                      className="flex items-center px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={`/inspections/new?org=${organization.id}`}
              className="flex items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-slate-900">Nova Inspeção</span>
            </Link>
            <Link
              to={`/users?org=${organization.id}`}
              className="flex items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Users className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-slate-900">Gerenciar Equipe</span>
            </Link>
            <Link
              to={`/organizations/${organization.id}/edit`}
              className="flex items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Building2 className="w-5 h-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-slate-900">Editar Dados</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout >
  );
}
