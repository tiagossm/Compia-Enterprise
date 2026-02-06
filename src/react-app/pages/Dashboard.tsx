import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import Layout from '@/react-app/components/Layout';
import DashboardCharts from '@/react-app/components/DashboardCharts';
import WelcomeHero from '@/react-app/components/WelcomeHero';
import { ExtendedMochaUser } from '@/shared/user-types';
import UnassignedUserBanner from '@/react-app/components/UnassignedUserBanner';
import {
  Shield,
  Target,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  PlusCircle,
  FileCheck,
  BarChart3,
  Zap
} from 'lucide-react';

import OrgAdminDashboard from '@/react-app/components/dashboard/OrgAdminDashboard';
import SystemAdminDashboard from '@/react-app/components/dashboard/SystemAdminDashboard';
import InspectorStatsWidget from '@/react-app/components/dashboard/InspectorStatsWidget';
import GamificationCard from '@/react-app/components/gamification/GamificationCard';
import SkeletonLoader from '@/react-app/components/ui/SkeletonLoader';


interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

interface ActionPlanSummary {
  total_actions: number;
  pending_actions: number;
  in_progress_actions: number;
  completed_actions: number;
  upcoming_deadline: number;
  overdue_actions: number;
  high_priority_pending: number;
  ai_generated_count: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const extendedUser = user as ExtendedMochaUser;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actionSummary, setActionSummary] = useState<ActionPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedOrganization]); // Re-fetch when global org changes

  const fetchDashboardData = async () => {
    try {
      let statsUrl = '/api/dashboard/stats';
      let actionUrl = '/api/dashboard/action-plan-summary';

      if (selectedOrganization && selectedOrganization.id !== 0) {
        statsUrl += `?organization_id=${selectedOrganization.id}`;
        actionUrl += `?organization_id=${selectedOrganization.id}`;
      }

      const [statsResponse, actionResponse] = await Promise.all([
        fetch(statsUrl),
        fetch(actionUrl)
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (actionResponse.ok) {
        const actionData = await actionResponse.json();
        setActionSummary(actionData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRate = () => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  const getActionCompletionRate = () => {
    if (!actionSummary || actionSummary.total_actions === 0) return 0;
    return Math.round((actionSummary.completed_actions / actionSummary.total_actions) * 100);
  };


  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <SkeletonLoader className="h-48 w-full rounded-xl" />
          <SkeletonLoader className="h-64 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonLoader className="h-64 w-full rounded-xl" />
            <SkeletonLoader className="h-64 w-full rounded-xl col-span-2" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {extendedUser?.profile?.role === 'system_admin' && <SystemAdminDashboard />}
        {extendedUser?.profile?.role === 'org_admin' && <OrgAdminDashboard />}
        {extendedUser?.profile?.role === 'inspector' && (
          <>
            <GamificationCard />
            <InspectorStatsWidget />
          </>
        )}

        {/* Only show standard dashboard for non-admins provided they have an org, or if admins want to see it below */}
        {extendedUser?.profile?.role !== 'system_admin' && extendedUser?.profile?.role !== 'org_admin' && (
          <>
            {/* User Assignment Alert - for users without organization */}
            {extendedUser?.profile && !extendedUser.profile.organization_id && (
              <UnassignedUserBanner
                userEmail={user?.email || ''}
                userName={extendedUser.profile.name}
              />
            )}

            {/* Stats Bar with Quick Actions */}
            <WelcomeHero
              stats={stats}
              completionRate={getCompletionRate()}
              showOrgSelector={false}
            />



            {/* Priority Alerts - Light Theme */}
            {actionSummary && (actionSummary.overdue_actions > 0 || actionSummary.high_priority_pending > 0) && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-bl-full -mr-16 -mt-16 opacity-50"></div>

                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-red-100 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">
                      Atenção Necessária
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {actionSummary.overdue_actions > 0 && (
                        <div className="flex items-center gap-2 text-red-700">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold">{actionSummary.overdue_actions}</span>
                          <span className="text-sm">ações atrasadas</span>
                        </div>
                      )}
                      {actionSummary.high_priority_pending > 0 && (
                        <div className="flex items-center gap-2 text-rose-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-bold">{actionSummary.high_priority_pending}</span>
                          <span className="text-sm">ações de alta prioridade</span>
                        </div>
                      )}
                    </div>
                    <a
                      href="/action-plans"
                      className="inline-flex items-center text-sm font-semibold text-red-600 hover:text-red-800 mt-3 hover:underline"
                    >
                      Resolver Pendências →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Section */}
            {stats && actionSummary && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">
                <DashboardCharts stats={stats} actionSummary={actionSummary} />
              </div>
            )}

            {/* Grid Split: Quick Actions & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Quick Actions - Clean White */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Ações Rápidas
                  </h2>
                </div>

                <div className="space-y-3 flex-1">
                  <a
                    href="/inspections/new"
                    className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all group"
                  >
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Nova Inspeção</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Iniciar auditoria agora</p>
                    </div>
                  </a>

                  <a
                    href="/checklists"
                    className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all group"
                  >
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Gerenciar Checklists</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Criar ou editar modelos</p>
                    </div>
                  </a>

                  <a
                    href="/reports"
                    className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all group"
                  >
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Relatórios e Dados</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Visão analítica completa</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Action Plan Summary Enhanced - Clean White */}
              {actionSummary && (
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">
                          Status dos Planos de Ação
                        </h2>
                      </div>
                    </div>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      {getActionCompletionRate()}% Resolvido
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-2xl font-bold text-slate-800">
                        {actionSummary.total_actions}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Total</p>
                    </div>

                    <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-2xl font-bold text-amber-600">
                        {actionSummary.pending_actions}
                      </p>
                      <p className="text-xs font-semibold text-amber-600/70 uppercase tracking-wide mt-1">Pendentes</p>
                    </div>

                    <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-2xl font-bold text-blue-600">
                        {actionSummary.in_progress_actions}
                      </p>
                      <p className="text-xs font-semibold text-blue-600/70 uppercase tracking-wide mt-1">Andamento</p>
                    </div>

                    <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-2xl font-bold text-emerald-600">
                        {actionSummary.completed_actions}
                      </p>
                      <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wide mt-1">Concluídas</p>
                    </div>
                  </div>

                  {actionSummary.ai_generated_count > 0 && (
                    <div className="p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-md shadow-sm text-violet-600">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-violet-900 text-sm">
                            IA Assistente em Ação
                          </p>
                          <p className="text-xs text-violet-700">
                            <span className="font-bold">{actionSummary.ai_generated_count}</span> ações geradas automaticamente
                          </p>
                        </div>
                      </div>
                      <a href="/action-plans" className="text-xs font-bold text-violet-600 hover:text-violet-800 hover:underline">
                        Ver detalhes
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Admin Quick Actions - Clean White */}
            {(extendedUser?.profile?.role === 'system_admin' || extendedUser?.profile?.role === 'org_admin') && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Painel Administrativo
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href="/users"
                    className="flex items-center gap-4 p-5 border border-gray-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Gerenciar Usuários</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Controle de acesso e permissões da equipe
                      </p>
                    </div>
                  </a>

                  <a
                    href="/organizations"
                    className="flex items-center gap-4 p-5 border border-gray-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  >
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Organizações</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {extendedUser?.profile?.role === 'system_admin' ? 'Empresas, consultorias e clientes' : 'Minha organização'}
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            )}


          </>
        )}
      </div>
    </Layout>
  );
}
