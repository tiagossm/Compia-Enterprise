import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import {
    CreditCard,
    Package,
    TrendingUp,
    Users,
    FileText,
    Calendar,
    CheckCircle,
    AlertTriangle,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface Plan {
    id: string;
    name: string;
    display_name: string;
    price_cents: number;
    price_display: string;
    billing_period: string;
    limits: {
        users: number;
        storage_gb: number;
        inspections_monthly: number;
    };
    features: Record<string, boolean>;
}

interface BillingInfo {
    subscription: {
        plan_name: string;
        plan_display_name: string;
        status: string;
        price_display: string;
        current_period_end: string;
        limits: Record<string, number>;
    } | null;
    usage: {
        active_users_count: number;
        inspections_count: number;
        ai_analyses_count: number;
        storage_used_mb: number;
    };
    invoices: Array<{
        id: string;
        amount_display: string;
        status: string;
        due_date: string;
        paid_at: string | null;
        payment_link: string | null;
    }>;
    has_active_subscription: boolean;
}

interface UsageData {
    usage: {
        users: { current: number; limit: number; percentage: number };
        inspections: { current: number; limit: number; percentage: number };
        storage: { current: number; limit: number; percentage: number };
    };
    alerts: Array<{ type: string; level: string }>;
}

export default function Billing() {
    const { selectedOrganization } = useOrganization();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadBillingData();
    }, [selectedOrganization?.id]);

    const loadBillingData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load plans
            const plansRes = await fetchWithAuth('/api/financial/plans');
            if (plansRes.ok) {
                const data = await plansRes.json();
                setPlans(data.plans || []);
            }

            // Load billing info
            const orgParam = selectedOrganization?.id ? `?organization_id=${selectedOrganization.id}` : '';
            const billingRes = await fetchWithAuth(`/api/billing/current${orgParam}`);
            if (billingRes.ok) {
                const data = await billingRes.json();
                setBillingInfo(data);
            }

            // Load usage
            const usageRes = await fetchWithAuth(`/api/billing/usage${orgParam}`);
            if (usageRes.ok) {
                const data = await usageRes.json();
                setUsageData(data);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados de billing');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { color: string; label: string }> = {
            active: { color: 'bg-green-100 text-green-700', label: 'Ativo' },
            trial: { color: 'bg-blue-100 text-blue-700', label: 'Período de Teste' },
            past_due: { color: 'bg-yellow-100 text-yellow-700', label: 'Pagamento Pendente' },
            canceled: { color: 'bg-red-100 text-red-700', label: 'Cancelado' },
            pending: { color: 'bg-gray-100 text-gray-700', label: 'Pendente' },
            paid: { color: 'bg-green-100 text-green-700', label: 'Pago' },
            overdue: { color: 'bg-red-100 text-red-700', label: 'Atrasado' }
        };
        const config = statusMap[status] || { color: 'bg-gray-100 text-gray-700', label: status };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    const UsageProgressBar = ({ label, current, limit, percentage }: { label: string; current: number; limit: number; percentage: number }) => {
        const getBarColor = () => {
            if (percentage >= 100) return 'bg-red-500';
            if (percentage >= 80) return 'bg-yellow-500';
            return 'bg-green-500';
        };

        return (
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-medium text-slate-900">{current} / {limit}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getBarColor()} transition-all duration-300`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                {percentage >= 80 && (
                    <div className="flex items-center text-xs text-yellow-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {percentage >= 100 ? 'Limite atingido!' : 'Próximo do limite'}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-heading text-2xl font-bold text-slate-900">Faturamento</h1>
                    <p className="text-slate-600 text-sm mt-1">
                        Gerencie seu plano, uso e histórico de faturas
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Plan */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-heading text-xl font-semibold text-slate-900">
                                Plano Atual
                            </h2>
                            {billingInfo?.subscription && getStatusBadge(billingInfo.subscription.status)}
                        </div>

                        {billingInfo?.subscription ? (
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <Package className="w-10 h-10 text-blue-600 mr-4" />
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">
                                            {billingInfo.subscription.plan_display_name}
                                        </h3>
                                        <p className="text-slate-500">
                                            {billingInfo.subscription.price_display}/mês
                                        </p>
                                    </div>
                                </div>

                                {billingInfo.subscription.current_period_end && (
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Próxima cobrança: {new Date(billingInfo.subscription.current_period_end).toLocaleDateString('pt-BR')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-700 mb-2">Sem plano ativo</h3>
                                <p className="text-slate-500 mb-4">Escolha um plano abaixo para começar</p>
                            </div>
                        )}
                    </div>

                    {/* Usage Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-heading text-lg font-semibold text-slate-900 mb-6">
                            Uso do Plano
                        </h2>

                        {usageData?.usage ? (
                            <div className="space-y-6">
                                <UsageProgressBar
                                    label="Usuários"
                                    current={usageData.usage.users.current}
                                    limit={usageData.usage.users.limit}
                                    percentage={usageData.usage.users.percentage}
                                />
                                <UsageProgressBar
                                    label="Inspeções (mês)"
                                    current={usageData.usage.inspections.current}
                                    limit={usageData.usage.inspections.limit}
                                    percentage={usageData.usage.inspections.percentage}
                                />
                                <UsageProgressBar
                                    label="Armazenamento (GB)"
                                    current={usageData.usage.storage.current}
                                    limit={usageData.usage.storage.limit}
                                    percentage={usageData.usage.storage.percentage}
                                />
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">Dados de uso indisponíveis</p>
                        )}
                    </div>
                </div>

                {/* Available Plans */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
                        Planos Disponíveis
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => {
                            const isCurrentPlan = billingInfo?.subscription?.plan_name === plan.name;

                            return (
                                <div
                                    key={plan.id}
                                    className={`rounded-xl border-2 p-6 transition-all ${isCurrentPlan
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-blue-300'
                                        }`}
                                >
                                    {isCurrentPlan && (
                                        <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs rounded-full mb-4">
                                            Plano Atual
                                        </span>
                                    )}

                                    <h3 className="text-xl font-bold text-slate-900">{plan.display_name}</h3>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">
                                        {plan.price_display}
                                        <span className="text-sm font-normal text-slate-500">/mês</span>
                                    </p>

                                    <ul className="mt-6 space-y-3">
                                        <li className="flex items-center text-sm text-slate-600">
                                            <Users className="w-4 h-4 mr-2 text-green-500" />
                                            {plan.limits.users === 9999 ? 'Usuários ilimitados' : `Até ${plan.limits.users} usuários`}
                                        </li>
                                        <li className="flex items-center text-sm text-slate-600">
                                            <FileText className="w-4 h-4 mr-2 text-green-500" />
                                            {plan.limits.inspections_monthly === 99999 ? 'Inspeções ilimitadas' : `${plan.limits.inspections_monthly} inspeções/mês`}
                                        </li>
                                        <li className="flex items-center text-sm text-slate-600">
                                            <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                                            {plan.limits.storage_gb} GB de armazenamento
                                        </li>
                                        {plan.features.ai_multimodal && (
                                            <li className="flex items-center text-sm text-slate-600">
                                                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                                IA Multimodal
                                            </li>
                                        )}
                                        {plan.features.dashboard && (
                                            <li className="flex items-center text-sm text-slate-600">
                                                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                                Dashboard Gerencial
                                            </li>
                                        )}
                                    </ul>

                                    {!isCurrentPlan && (
                                        <button className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                            {plan.price_cents === 0 ? 'Fale Conosco' : 'Selecionar Plano'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Invoice History */}
                {billingInfo?.invoices && billingInfo.invoices.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
                            Histórico de Faturas
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Vencimento</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Valor</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Pago em</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billingInfo.invoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-4 text-sm text-slate-900">
                                                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('pt-BR') : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                                {invoice.amount_display}
                                            </td>
                                            <td className="py-3 px-4">
                                                {getStatusBadge(invoice.status)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('pt-BR') : '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {invoice.payment_link && invoice.status !== 'paid' && (
                                                    <a
                                                        href={invoice.payment_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                                                    >
                                                        <CreditCard className="w-4 h-4 mr-1" />
                                                        Pagar
                                                        <ExternalLink className="w-3 h-3 ml-1" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
