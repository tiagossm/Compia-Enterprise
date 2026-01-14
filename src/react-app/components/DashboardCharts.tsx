import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface DashboardChartsProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  } | null;
  actionSummary: {
    total_actions: number;
    pending_actions: number;
    in_progress_actions: number;
    completed_actions: number;
    overdue_actions: number;
    high_priority_pending: number;
  } | null;
}

export default function DashboardCharts({ stats, actionSummary }: DashboardChartsProps) {
  if (!stats || !actionSummary) {
    return null;
  }

  // STANDARD B2B PALETTE
  const COLORS = {
    primary: '#1565C0', // Blue 800
    success: '#10B981', // Emerald 500
    warning: '#F59E0B', // Amber 500
    error: '#EF4444',   // Red 500
    info: '#3B82F6',    // Blue 500
    slate800: '#1E293B',
    slate500: '#64748B',
    grid: '#F1F5F9'
  };

  // Inspection status data for pie chart
  const inspectionData = [
    { name: 'Concluídas', value: stats.completed, color: COLORS.success },
    { name: 'Em Andamento', value: stats.inProgress, color: COLORS.primary }, // Use Primary for active work
    { name: 'Pendentes', value: stats.pending, color: COLORS.warning },
  ].filter(item => item.value > 0);

  // Action plan progress data
  const actionData = [
    { name: 'Concluídas', value: actionSummary.completed_actions, color: COLORS.success },
    { name: 'Em Andamento', value: actionSummary.in_progress_actions, color: COLORS.primary },
    { name: 'Pendentes', value: actionSummary.pending_actions, color: COLORS.warning },
    { name: 'Atrasadas', value: actionSummary.overdue_actions, color: COLORS.error },
  ].filter(item => item.value > 0);

  // Monthly trend simulation (in real app, this would come from API)
  const trendData = [
    { month: 'Jan', inspections: 12, actions: 28 },
    { month: 'Fev', inspections: 15, actions: 32 },
    { month: 'Mar', inspections: 18, actions: 41 },
    { month: 'Abr', inspections: 22, actions: 38 },
    { month: 'Mai', inspections: 25, actions: 45 },
    { month: 'Jun', inspections: stats.total, actions: actionSummary.total_actions },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-medium text-slate-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inspection Status Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Distribuição de Inspeções
        </h3>
        {inspectionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={inspectionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {inspectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [value, 'Inspeções']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: COLORS.slate800
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Action Plan Status */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Status dos Planos de Ação
        </h3>
        {actionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={actionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: COLORS.slate500 }}
                stroke={COLORS.slate500}
              />
              <YAxis
                tick={{ fontSize: 12, fill: COLORS.slate500 }}
                stroke={COLORS.slate500}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
              >
                {actionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
            Nenhum dado disponível
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Tendência Mensal
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="inspectionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="actionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.1} />
                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: COLORS.slate500 }}
              stroke={COLORS.slate500}
            />
            <YAxis
              tick={{ fontSize: 12, fill: COLORS.slate500 }}
              stroke={COLORS.slate500}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="inspections"
              stroke={COLORS.primary}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#inspectionsGradient)"
              name="Inspeções"
            />
            <Area
              type="monotone"
              dataKey="actions"
              stroke={COLORS.success}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#actionsGradient)"
              name="Ações"
            />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
