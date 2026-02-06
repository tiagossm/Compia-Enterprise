import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import {
    CreditCard,
    Package,
    Calendar,
    CheckCircle,
    AlertTriangle,
    ExternalLink,
    Check
} from 'lucide-react';
import { useOrganization } from '@/react-app/context/OrganizationContext';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { Skeleton } from '@/react-app/components/Skeleton';

interface Plan {
    id: string;
    name: string;
    display_name: string;
    price_cents: number;
    price_display: string;
    billing_period: string;
    slug?: string; // Add slug optional
    limits: {
        users: number;
        storage_gb: number;
        inspections_monthly: number;
    };
    features: Record<string, boolean>;
    description?: string; // Add description optional
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

const SuccessModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Pagamento Confirmado!</h3>
            <p className="text-slate-600 mb-6">
                Sua assinatura foi atualizada com sucesso. Todos os novos limites e recursos já estão disponíveis.
            </p>
            <button
                onClick={onClose}
                className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
                Continuar usando o sistema
            </button>
        </div>
    </div>
);

const ConfirmationModal = ({
    plan,
    onConfirm,
    onCancel,
    cycle
}: {
    plan: Plan;
    onConfirm: (method: 'CREDIT_CARD' | 'PIX') => void;
    onCancel: () => void;
    cycle: 'monthly' | 'yearly';
}) => {
    const [selectedMethod, setSelectedMethod] = useState<'CREDIT_CARD' | 'PIX' | null>(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-left animate-in fade-in zoom-in duration-300">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Confirmar Assinatura</h3>

                <div className="bg-slate-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 text-sm">Plano Selecionado:</span>
                        <div className="text-right">
                            <span className="block font-bold text-blue-600">{plan.display_name}</span>
                            <span className="text-xs text-slate-500 uppercase">{cycle === 'monthly' ? 'Mensal' : 'Anual'}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-900 font-medium">Total:</span>
                        <span className="text-lg font-bold text-slate-900">
                            {(plan.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            <span className="text-xs font-normal text-slate-500 ml-1">
                                /{cycle === 'monthly' ? 'mês' : 'ano'}
                            </span>
                        </span>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setSelectedMethod('CREDIT_CARD')}
                            className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${selectedMethod === 'CREDIT_CARD'
                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                }`}
                        >
                            <CreditCard className="w-6 h-6" />
                            <span className="text-sm font-medium">Cartão</span>
                        </button>
                        <button
                            onClick={() => setSelectedMethod('PIX')}
                            className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${selectedMethod === 'PIX'
                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                }`}
                        >
                            <span className="font-bold text-lg">PIX</span>
                            <span className="text-sm font-medium">Instantâneo</span>
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => selectedMethod && onConfirm(selectedMethod)}
                        disabled={!selectedMethod}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar e Pagar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Billing() {
    const { selectedOrganization } = useOrganization();

    const [allPlans, setAllPlans] = useState<Plan[]>([]);
    const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Toggle State
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);

    useEffect(() => {
        // Check for success param
        const params = new URLSearchParams(window.location.search);
        if (params.get('status') === 'success') {
            setShowSuccessModal(true);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            // Force reload data
            loadBillingData();
        } else {
            loadBillingData();
        }
    }, [selectedOrganization?.id]);

    const loadBillingData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load plans
            const plansRes = await fetchWithAuth('/api/financial/plans');
            if (plansRes.ok) {
                const data = await plansRes.json();
                let fetchedPlans = (data.plans || [])
                    .filter((p: Plan) => p.name !== 'enterprise' && p.price_cents > 0);

                // --- WORKAROUND: CORRIGIR PLANO "ANAL" (ANUAL) ---
                fetchedPlans = fetchedPlans.map((p: Plan) => {
                    const slug = p.name || ''; // In backend 'name' is often slug
                    const isYearly = slug.includes('anual') || slug.includes('yearly') || p.display_name.includes('Anual');

                    return {
                        ...p,
                        display_name: p.name.includes('basic') || p.name.includes('starter') ? 'Essencial' :
                            p.name.includes('pro') || p.name.includes('business') ? 'Inteligente' : p.display_name,
                        billing_period: isYearly ? 'yearly' : (p.billing_period || 'monthly')
                    };
                });
                setAllPlans(fetchedPlans);
            }

            // Load billing info
            const orgParam = selectedOrganization?.id ? `?organization_id=${selectedOrganization.id}` : '';
            const billingRes = await fetchWithAuth(`/api/billing/current${orgParam}`);
            if (billingRes.ok) {
                const data = await billingRes.json();

                // Force display names
                if (data.subscription) {
                    const pName = data.subscription.plan_name;
                    if (pName.includes('basic') || pName.includes('starter')) data.subscription.plan_display_name = 'Essencial';
                    if (pName.includes('pro') || pName.includes('business')) data.subscription.plan_display_name = 'Inteligente';
                }

                setBillingInfo(data);
            }

            // Load usage
            const usageRes = await fetchWithAuth(`/api/billing/usage${orgParam}`);
            if (usageRes.ok) {
                const data = await usageRes.json();
                setUsageData(data);
            }
        } catch (err: any) {
            console.error('Error loading billing data:', err);
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

    const initiateCheckout = async (plan: Plan, method: 'CREDIT_CARD' | 'PIX') => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/billing/checkout', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: plan.id,
                    organization_id: selectedOrganization?.id,
                    billing_type: method
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.url) {
                    window.location.href = data.url;
                }
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erro ao iniciar checkout');
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Erro ao processar solicitação');
        } finally {
            setLoading(false);
            setPendingPlan(null);
        }
    };

    const handleSelectPlan = (plan: Plan) => {
        // Enterprise contact
        if (plan.price_cents === 0 || plan.name === 'enterprise') {
            window.location.href = 'mailto:contato@compia.tech?subject=Interesse no Plano Enterprise';
            return;
        }

        // Show Confirmation Modal
        setPendingPlan(plan);
    };

    // Filter plans logic
    const getPlanByTier = (tier: 'starter' | 'pro') => {
        return allPlans.find(p => {
            // Check cycle
            const matchCycle = p.billing_period === cycle;
            // Check Tier Name logic
            const matchName = tier === 'starter'
                ? (p.name.includes('starter') || p.name.includes('basic') || p.display_name.includes('Essencial'))
                : (p.name.includes('pro') || p.name.includes('business') || p.display_name.includes('Inteligente'));
            return matchCycle && matchName;
        });
    };

    const starterPlan = getPlanByTier('starter');
    const proPlan = getPlanByTier('pro');

    const displayPlans = [
        {
            key: 'starter',
            plan: starterPlan,
            title: 'Essencial',
            description: 'Para quem está começando.',
            features: ['Até 5 Usuários', 'Checklists Ilimitados', 'Fotos e GPS', 'Relatórios em PDF'],
            highlight: false
        },
        {
            key: 'pro',
            plan: proPlan,
            title: 'Inteligente',
            description: 'Automação total com IA.',
            features: ['Usuários Ilimitados', 'IA Generativa (Voz)', 'Dashboards', 'Gestor de Conta', 'Integração API'],
            highlight: true
        }
    ];

    if (loading && !billingInfo) {
        return (
            <Layout>
                <div className="space-y-8 animate-pulse">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-heading text-2xl font-bold text-slate-900">Faturamento e Planos</h1>
                    <p className="text-slate-600 text-sm mt-1">
                        Gerencie seu plano, uso e altere sua assinatura.
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
                                            {billingInfo.subscription.price_display}
                                        </p>
                                    </div>
                                </div>

                                {billingInfo.subscription.current_period_end && (
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Renova em: {new Date(billingInfo.subscription.current_period_end).toLocaleDateString('pt-BR')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-700 mb-2">Sem plano ativo</h3>
                                <p className="text-slate-500 mb-4">Selecione uma opção abaixo.</p>
                            </div>
                        )}
                    </div>

                    {/* Usage Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-heading text-lg font-semibold text-slate-900 mb-6">
                            Uso Atual
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
                                    label="Inspeções"
                                    current={usageData.usage.inspections.current}
                                    limit={usageData.usage.inspections.limit}
                                    percentage={usageData.usage.inspections.percentage}
                                />
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">Dados de uso indisponíveis</p>
                        )}
                    </div>
                </div>

                {/* Available Plans (Refactored) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <div className="text-center mb-10">
                        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-4">
                            Mude seu plano
                        </h2>
                        {/* CYCLE TOGGLE */}
                        <div className="flex items-center justify-center">
                            <div className="bg-slate-100 p-1 rounded-full border border-slate-200 inline-flex relative">
                                <button
                                    onClick={() => setCycle('monthly')}
                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${cycle === 'monthly'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    Mensal
                                </button>
                                <button
                                    onClick={() => setCycle('yearly')}
                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${cycle === 'yearly'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    Anual
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                        -20%
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {displayPlans.map((item) => {
                            const isCurrentPlan = billingInfo?.subscription &&
                                (billingInfo.subscription.plan_name.includes(item.key === 'starter' ? 'basic' : 'pro') ||
                                    billingInfo.subscription.plan_display_name === item.title) &&
                                // Very rough check for cycle
                                (cycle === 'monthly' ? !billingInfo.subscription.plan_name.includes('year') : true);

                            const price = item.plan ? (item.plan.price_cents / 100) : 0;
                            const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

                            return (
                                <div
                                    key={item.key}
                                    className={`relative rounded-2xl p-6 transition-all border-2 flex flex-col ${item.highlight
                                        ? 'border-blue-500 bg-blue-50/10'
                                        : 'border-slate-200 hover:border-blue-300'
                                        } ${isCurrentPlan ? 'opacity-70 grayscale' : ''}`}
                                >
                                    {item.highlight && (
                                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                                            RECOMENDADO
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                                        <p className="text-sm text-slate-500">{item.description}</p>
                                    </div>

                                    <div className="mb-6 flex items-baseline gap-1">
                                        {item.plan ? (
                                            <>
                                                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{formattedPrice}</span>
                                                <span className="text-slate-500">/{cycle === 'monthly' ? 'mês' : 'ano'}</span>
                                            </>
                                        ) : (
                                            <span className="text-lg text-slate-400 italic">Indisponível</span>
                                        )}
                                    </div>

                                    <ul className="space-y-3 mb-8 flex-1">
                                        {item.features.map((feat, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                <Check className={`w-4 h-4 flex-shrink-0 ${item.highlight ? 'text-blue-600' : 'text-slate-400'}`} />
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => item.plan && handleSelectPlan(item.plan)}
                                        disabled={loading || !item.plan || !!isCurrentPlan}
                                        className={`w-full py-3 rounded-lg font-bold transition-all ${item.highlight
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isCurrentPlan ? 'Plano Atual' : (loading ? 'Carregando...' : 'Selecionar Plano')}
                                    </button>
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


            {showSuccessModal && <SuccessModal onClose={() => setShowSuccessModal(false)} />}

            {pendingPlan && (
                <ConfirmationModal
                    plan={pendingPlan}
                    cycle={cycle}
                    onConfirm={(method) => initiateCheckout(pendingPlan, method)}
                    onCancel={() => setPendingPlan(null)}
                />
            )}
        </Layout >
    );
}
