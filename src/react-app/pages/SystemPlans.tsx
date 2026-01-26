import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import {
    Package,
    Plus,
    Edit2,
    Trash2,
    Ticket,
    Zap,
    Database,
    Check,
    Download,
    AlertCircle
} from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface Plan {
    id: string;
    name: string; // slug
    display_name: string;
    description: string;
    type: 'subscription' | 'addon' | 'one_time';
    price_cents: number;
    billing_period: 'monthly' | 'yearly' | 'one_time';
    is_active: boolean;
    is_public: boolean;
    limits: {
        inspections_monthly?: number;
        users?: number;
        storage_gb?: number;
        [key: string]: any;
    };
    features: {
        ai_agents?: boolean;
        dashboard?: boolean;
        integrations?: boolean;
        [key: string]: boolean | undefined;
    };
    addon_config?: any;
}

interface Coupon {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    description?: string;
    max_uses?: number;
    uses_count: number;
    is_active: boolean;
    expires_at?: string;
    minimum_amount_cents?: number;
    valid_for_plans?: string[]; // Array of plan IDs
}

export default function SystemPlans() {
    // UI State
    const [activeTab, setActiveTab] = useState<'plans' | 'coupons'>('plans');
    const [subTab, setSubTab] = useState<'subscription' | 'addon'>('subscription');

    // Data State
    const [plans, setPlans] = useState<Plan[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);

    // Modal State
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Fetch Data
    const loadData = async () => {
        try {
            const [plansRes, couponsRes] = await Promise.all([
                fetchWithAuth('/api/system-commerce/plans'),
                fetchWithAuth('/api/system-commerce/coupons')
            ]);

            if (plansRes.ok) {
                const data = await plansRes.json();
                setPlans(data.plans || []);
            }
            if (couponsRes.ok) {
                const data = await couponsRes.json();
                setCoupons(data.coupons || []);
            }
        } catch (error) {
            console.error("Error loading plans", error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSavePlan = async () => {
        if (!editingPlan) return;
        try {
            const method = editingPlan.id ? 'PUT' : 'POST';
            const url = editingPlan.id ? `/api/system-commerce/plans/${editingPlan.id}` : '/api/system-commerce/plans';

            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(editingPlan)
            });

            if (res.ok) {
                loadData();
                setShowPlanModal(false);
                setEditingPlan(null);
            }
        } catch (e) {
            console.error("Error saving plan", e);
        }
    };

    const handleSaveCoupon = async () => {
        if (!editingCoupon) return;
        try {
            const method = editingCoupon.id ? 'PUT' : 'POST';
            const url = editingCoupon.id ? `/api/system-commerce/coupons/${editingCoupon.id}` : '/api/system-commerce/coupons';

            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(editingCoupon)
            });

            if (res.ok) {
                loadData();
                setShowCouponModal(false);
                setEditingCoupon(null);
            } else {
                const text = await res.text();
                try {
                    const err = JSON.parse(text);
                    alert(`Erro ao salvar cupom: ${err.error || 'Erro desconhecido'}`);
                } catch (e) {
                    console.error("Backend returned non-JSON error:", text);
                    alert(`Erro no servidor (${res.status}). Verifique o console para mais detalhes.`);
                }
            }
        } catch (e) {
            console.error("Error saving coupon", e);
        }
    };

    const handleExportCoupons = () => {
        const headers = ['Código', 'Descrição', 'Tipo', 'Valor', 'Min. Compra', 'Usos', 'Max. Usos', 'Expiração', 'Status', 'Planos Válidos'];
        const csvContent = [
            headers.join(','),
            ...coupons.map(c => {
                const plansNames = c.valid_for_plans
                    ? c.valid_for_plans.map(pid => plans.find(p => p.id === pid)?.display_name || pid).join('; ')
                    : 'Todos';

                return [
                    c.code,
                    `"${c.description || ''}"`,
                    c.discount_type,
                    c.discount_value,
                    c.minimum_amount_cents ? (c.minimum_amount_cents / 100).toFixed(2) : '0',
                    c.uses_count,
                    c.max_uses || 'Infinito',
                    c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Nunca',
                    c.is_active ? 'Ativo' : 'Inativo',
                    `"${plansNames}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'coupons_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async (type: 'plan' | 'coupon', id: string) => {
        if (!confirm('Tem certeza? Isso deletará o item permanentemente.')) return;
        try {
            const url = `/api/system-commerce/${type}s/${id}`;
            await fetchWithAuth(url, { method: 'DELETE' });
            loadData();
        } catch (e) {
            console.error("Error deleting", e);
        }
    }

    const filteredPlans = plans.filter(p => {
        if (subTab === 'subscription') return p.type === 'subscription';
        return p.type === 'addon' || p.type === 'one_time';
    });

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="font-heading text-2xl font-bold text-slate-900">Gestão de Planos & Ofertas</h1>
                        <p className="text-slate-600">Gerencie preços, limites e a vitrine de compras.</p>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex space-x-4 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'plans'
                            ? 'border-b-2 border-indigo-600 text-indigo-600'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        Catálogo de Produtos
                    </button>
                    <button
                        onClick={() => setActiveTab('coupons')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'coupons'
                            ? 'border-b-2 border-indigo-600 text-indigo-600'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        Cupons de Desconto
                    </button>
                </div>

                {/* Plans Content */}
                {activeTab === 'plans' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        {/* Sub Tabs */}
                        <div className="flex space-x-2 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => setSubTab('subscription')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${subTab === 'subscription'
                                    ? 'bg-white shadow text-indigo-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Assinaturas
                            </button>
                            <button
                                onClick={() => setSubTab('addon')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${subTab === 'addon'
                                    ? 'bg-white shadow text-indigo-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Adicionais (Add-ons)
                            </button>
                        </div>

                        <div className="flex justify-between mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                {subTab === 'subscription' ? <Package className="w-5 h-5 text-indigo-600" /> : <Zap className="w-5 h-5 text-amber-500" />}
                                {subTab === 'subscription' ? 'Planos de Assinatura' : 'Pacotes Adicionais'}
                            </h2>
                            <button
                                onClick={() => {
                                    setEditingPlan({
                                        id: '',
                                        name: '',
                                        display_name: '',
                                        description: '',
                                        type: subTab === 'subscription' ? 'subscription' : 'addon',
                                        price_cents: 0,
                                        billing_period: 'monthly',
                                        is_active: true,
                                        is_public: true,
                                        limits: {},
                                        features: {}
                                    });
                                    setShowPlanModal(true);
                                }}
                                className="btn-primary flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                <Plus className="w-4 h-4" /> Novo Item
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Nome</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Preço</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Cobrança</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Slug</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Visibilidade</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredPlans.map(plan => (
                                        <tr key={plan.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{plan.display_name}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{plan.description}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                R$ {(plan.price_cents / 100).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {plan.billing_period === 'monthly' && 'Mensal'}
                                                {plan.billing_period === 'yearly' && 'Anual'}
                                                {plan.billing_period === 'one_time' && 'Único'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500 font-mono text-xs">{plan.name}</td>
                                            <td className="px-4 py-3">
                                                {plan.is_public
                                                    ? <span className="text-blue-600 text-xs px-2 py-1 bg-blue-50 rounded-full border border-blue-100">Público</span>
                                                    : <span className="text-slate-500 text-xs px-2 py-1 bg-slate-50 rounded-full border border-slate-200">Oculto</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                {plan.is_active
                                                    ? <span className="text-green-600 text-xs px-2 py-1 bg-green-100 rounded-full">Ativo</span>
                                                    : <span className="text-slate-500 text-xs px-2 py-1 bg-slate-100 rounded-full">Inativo</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => { setEditingPlan(plan); setShowPlanModal(true); }}
                                                    className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete('plan', plan.id)}
                                                    className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPlans.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                                Nenhum item encontrado nesta categoria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Coupons Content */}
                {activeTab === 'coupons' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-indigo-600" />
                                Cupons Ativos
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportCoupons}
                                    className="btn-secondary px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Exportar (CSV)
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingCoupon({
                                            id: '',
                                            code: '',
                                            discount_type: 'percentage',
                                            discount_value: 0,
                                            description: '',
                                            max_uses: undefined,
                                            uses_count: 0,
                                            is_active: true,
                                            expires_at: undefined,
                                            minimum_amount_cents: 0,
                                            valid_for_plans: []
                                        });
                                        setShowCouponModal(true);
                                    }}
                                    className="btn-primary px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Novo Cupom
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Código</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Desconto</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Regras</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Usos</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Validade</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {coupons.map(coupon => (
                                        <tr key={coupon.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-mono font-bold text-indigo-700">{coupon.code}</div>
                                                <div className="text-xs text-slate-500 max-w-[150px] truncate">{coupon.description}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {coupon.discount_type === 'percentage'
                                                    ? <span className="text-emerald-600 font-bold">{coupon.discount_value}% OFF</span>
                                                    : <span className="text-emerald-600 font-bold">R$ {(coupon.discount_value / 100).toFixed(2)} OFF</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                {coupon.minimum_amount_cents ? `Mín: R$ ${(coupon.minimum_amount_cents / 100).toFixed(2)}` : 'Sem mínimo'}
                                                {coupon.valid_for_plans && coupon.valid_for_plans.length > 0 && (
                                                    <div className="text-indigo-600 mt-0.5">{coupon.valid_for_plans.length} planos</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {coupon.uses_count} / {coupon.max_uses || '∞'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Indefinida'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {coupon.is_active
                                                    ? <span className="text-green-600 text-xs px-2 py-1 bg-green-100 rounded-full">Ativo</span>
                                                    : <span className="text-slate-500 text-xs px-2 py-1 bg-slate-100 rounded-full">Inativo</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setEditingCoupon(coupon); setShowCouponModal(true); }}
                                                    className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete('coupon', coupon.id)}
                                                    className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showPlanModal && editingPlan && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                                <h3 className="text-xl font-bold text-slate-900">
                                    {editingPlan.id ? 'Editar Produto' : 'Novo Produto'}
                                </h3>
                                <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <Trash2 className="w-5 h-5 rotate-45" /> {/* Close X */}
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome de Exibição</label>
                                        <input
                                            type="text"
                                            value={editingPlan.display_name}
                                            onChange={e => setEditingPlan({ ...editingPlan, display_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ex: Plano Profissional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Preço (Centavos)</label>
                                        <input
                                            type="number"
                                            value={editingPlan.price_cents}
                                            onChange={e => setEditingPlan({ ...editingPlan, price_cents: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="19900 = R$ 199,00"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            R$ {(editingPlan.price_cents / 100).toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Slug (Identificador)</label>
                                        <input
                                            type="text"
                                            value={editingPlan.name}
                                            onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="pro-plan-monthly"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Periodicidade</label>
                                        <select
                                            value={editingPlan.billing_period}
                                            onChange={e => setEditingPlan({ ...editingPlan, billing_period: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="monthly">Mensal</option>
                                            <option value="yearly">Anual</option>
                                            <option value="one_time">Pagamento Único</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                                    <textarea
                                        value={editingPlan.description}
                                        onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        rows={2}
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="border border-slate-200 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <Database className="w-4 h-4" /> Limites
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm text-slate-600">Inspeções/Mês</label>
                                                <input
                                                    type="number"
                                                    value={editingPlan.limits?.inspections_monthly ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                        setEditingPlan({
                                                            ...editingPlan,
                                                            limits: { ...editingPlan.limits, inspections_monthly: val }
                                                        });
                                                    }}
                                                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-slate-600">Usuários</label>
                                                <input
                                                    type="number"
                                                    value={editingPlan.limits?.users ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                        setEditingPlan({
                                                            ...editingPlan,
                                                            limits: { ...editingPlan.limits, users: val }
                                                        });
                                                    }}
                                                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-slate-600">Armazenamento (GB)</label>
                                                <input
                                                    type="number"
                                                    value={editingPlan.limits?.storage_gb ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                        setEditingPlan({
                                                            ...editingPlan,
                                                            limits: { ...editingPlan.limits, storage_gb: val }
                                                        });
                                                    }}
                                                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="5"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <Zap className="w-4 h-4" /> Recursos & Integrações
                                        </h4>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingPlan.features?.ai_agents || false}
                                                    onChange={e => setEditingPlan({
                                                        ...editingPlan,
                                                        features: { ...editingPlan.features, ai_agents: e.target.checked }
                                                    })}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700">Agentes IA</span>
                                            </label>
                                            <label className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingPlan.features?.dashboard || false}
                                                    onChange={e => setEditingPlan({
                                                        ...editingPlan,
                                                        features: { ...editingPlan.features, dashboard: e.target.checked }
                                                    })}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700">Dashboards Avançados</span>
                                            </label>
                                            <label className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingPlan.features?.integrations || false}
                                                    onChange={e => setEditingPlan({
                                                        ...editingPlan,
                                                        features: { ...editingPlan.features, integrations: e.target.checked }
                                                    })}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700">Integrações (API/Webhooks)</span>
                                            </label>
                                            <label className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingPlan.is_active || false}
                                                    onChange={e => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                                                    className="rounded text-green-600 focus:ring-green-500"
                                                />
                                                <span className="text-sm font-medium text-green-700">Produto Ativo (Pode ser comprado)</span>
                                            </label>
                                            <label className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingPlan.is_public || false}
                                                    onChange={e => setEditingPlan({ ...editingPlan, is_public: e.target.checked })}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-blue-700">Público (Visível na Landing Page)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">

                                {/* Coupon Modal */}
                                <button
                                    onClick={() => setShowPlanModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSavePlan}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center shadow-sm"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Salvar Produto
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Coupon Modal */}
                {showCouponModal && editingCoupon && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                                <h3 className="text-xl font-bold text-slate-900">
                                    {editingCoupon.id ? 'Editar Cupom' : 'Novo Cupom'}
                                </h3>
                                <button onClick={() => setShowCouponModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <Trash2 className="w-5 h-5 rotate-45" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Main Info */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Código Promocional</label>
                                        <input
                                            type="text"
                                            value={editingCoupon.code}
                                            onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                                            placeholder="EXEMPLO20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Desconto</label>
                                        <select
                                            value={editingCoupon.discount_type}
                                            onChange={e => setEditingCoupon({ ...editingCoupon, discount_type: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="percentage">Porcentagem (%)</option>
                                            <option value="fixed_amount">Valor Fixo (R$)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            {editingCoupon.discount_type === 'percentage' ? 'Valor (%)' : 'Valor (Centavos)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={editingCoupon.discount_value}
                                            onChange={e => setEditingCoupon({ ...editingCoupon, discount_value: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                        {editingCoupon.discount_type === 'fixed_amount' && (
                                            <p className="text-xs text-slate-500 mt-1">R$ {(editingCoupon.discount_value / 100).toFixed(2)}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Mínimo Compra (Centavos)</label>
                                        <input
                                            type="number"
                                            value={editingCoupon.minimum_amount_cents || ''}
                                            onChange={e => setEditingCoupon({ ...editingCoupon, minimum_amount_cents: e.target.value ? parseInt(e.target.value) : undefined })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                                    <textarea
                                        value={editingCoupon.description || ''}
                                        onChange={e => setEditingCoupon({ ...editingCoupon, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        rows={2}
                                        placeholder="Descrição interna para o cupom..."
                                    />
                                </div>

                                {/* Rules */}
                                <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-slate-700">
                                        <AlertCircle className="w-4 h-4" /> Regras de Uso
                                    </h4>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Limite Máximo de Usos</label>
                                            <input
                                                type="number"
                                                value={editingCoupon.max_uses || ''}
                                                onChange={e => setEditingCoupon({ ...editingCoupon, max_uses: e.target.value ? parseInt(e.target.value) : undefined })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Ilimitado"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Data de Expiração</label>
                                            <input
                                                type="date"
                                                value={editingCoupon.expires_at ? editingCoupon.expires_at.split('T')[0] : ''}
                                                onChange={e => setEditingCoupon({ ...editingCoupon, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Válido para Planos Específicos</label>
                                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-1">
                                            {plans.map(plan => (
                                                <label key={plan.id} className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editingCoupon.valid_for_plans?.includes(plan.id) || false}
                                                        onChange={e => {
                                                            const current = editingCoupon.valid_for_plans || [];
                                                            if (e.target.checked) {
                                                                setEditingCoupon({ ...editingCoupon, valid_for_plans: [...current, plan.id] });
                                                            } else {
                                                                setEditingCoupon({ ...editingCoupon, valid_for_plans: current.filter(id => id !== plan.id) });
                                                            }
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm text-slate-700">{plan.display_name} <span className="text-xs text-slate-400">({plan.type})</span></span>
                                                </label>
                                            ))}
                                            {plans.length === 0 && <p className="text-xs text-slate-500 p-2">Nenhum plano cadastrado.</p>}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Deixe vazio para aplicar a todos os planos.</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingCoupon.is_active}
                                                onChange={e => setEditingCoupon({ ...editingCoupon, is_active: e.target.checked })}
                                                className="rounded text-green-600 focus:ring-green-500"
                                            />
                                            <span className="text-sm font-medium text-green-700">Cupom Ativo</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCouponModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveCoupon}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Salvar Cupom
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout >
    );
}
