import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import StatsCard from '@/react-app/components/StatsCard';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  Filter
} from 'lucide-react';

export default function Reports() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao carregar estatísticas:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Relatórios</h1>
            <p className="text-slate-600 text-sm">
              Análise e métricas das inspeções de segurança
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center px-3 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm">
              <Filter className="w-4 h-4 mr-1" />
              Filtros
            </button>
            <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <StatsCard
            title="Total de Inspeções"
            value={stats.total}
            icon={BarChart3}
            color="blue"
            trend={{
              value: "12% vs mês anterior",
              isPositive: true
            }}
          />
          <StatsCard
            title="Pendentes"
            value={stats.pending}
            icon={AlertTriangle}
            color="yellow"
          />
          <StatsCard
            title="Em Andamento"
            value={stats.inProgress}
            icon={TrendingUp}
            color="blue"
          />
          <StatsCard
            title="Concluídas"
            value={stats.completed}
            icon={CheckCircle2}
            color="green"
            trend={{
              value: "8% vs mês anterior",
              isPositive: true
            }}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inspeções por Mês */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-semibold text-slate-900">
                Inspeções por Mês
              </h2>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p>Gráfico de inspeções mensais</p>
                <p className="text-sm text-slate-400 mt-1">Em desenvolvimento</p>
              </div>
            </div>
          </div>

          {/* Status das Inspeções */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-semibold text-slate-900">
                Distribuição por Status
              </h2>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-100 to-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-700">{stats.total}</span>
                </div>
                <p>Total de inspeções</p>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div className="text-center">
                    <div className="w-4 h-4 bg-yellow-400 rounded mx-auto mb-1"></div>
                    <span>Pendentes: {stats.pending}</span>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-blue-400 rounded mx-auto mb-1"></div>
                    <span>Em Andamento: {stats.inProgress}</span>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-green-400 rounded mx-auto mb-1"></div>
                    <span>Concluídas: {stats.completed}</span>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-red-400 rounded mx-auto mb-1"></div>
                    <span>Canceladas: 0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
            Métricas de Performance
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-3xl font-bold text-blue-700 mb-2">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
              <p className="text-blue-600 font-medium">Taxa de Conclusão</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-3xl font-bold text-green-700 mb-2">
                {stats.total > 0 ? Math.round(((stats.completed + stats.inProgress) / stats.total) * 100) : 0}%
              </div>
              <p className="text-green-600 font-medium">Taxa de Produtividade</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-3xl font-bold text-orange-700 mb-2">
                {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
              </div>
              <p className="text-orange-600 font-medium">Itens Pendentes</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
          <h2 className="font-heading text-xl font-semibold mb-2">
            Relatórios Detalhados
          </h2>
          <p className="text-slate-300 mb-4">
            Gere relatórios personalizados para análise aprofundada das inspeções
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
              Relatório Mensal
            </button>
            <button className="px-4 py-2 bg-white/20 border border-white/30 text-white rounded-lg hover:bg-white/30 transition-colors">
              Relatório de Conformidade
            </button>
            <button className="px-4 py-2 bg-white/20 border border-white/30 text-white rounded-lg hover:bg-white/30 transition-colors">
              Relatório por Inspetor
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
