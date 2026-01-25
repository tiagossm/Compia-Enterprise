
import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import {
    Tag,
    Package,
    Plus,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    Save,
    X,
    Ticket
} from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface Plan {
    id: string;
    name: string;
    display_name: string;
    price_cents: number;
    billing_period: 'monthly' | 'yearly';
    is_active: boolean;
    limits: any;
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
}

export default function SystemPlans() {
    const [activeTab, setActiveTab] = useState<'plans' | 'coupons'>('plans');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [plansRes, couponsRes] = await Promise.all([
                fetchWithAuth('/api/system-admin/plans'),
                fetchWithAuth('/api/system-admin/coupons')
            ]);

            if (plansRes.ok) setPlans((await plansRes.json()).plans);
            if (couponsRes.ok) setCoupons((await couponsRes.json()).coupons);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePlan = async (plan: Partial<Plan>) => {
        try {
            const method = plan.id ? 'PUT' : 'POST';
            const url = plan.id ? `/api/system-admin/plans/${plan.id}` : '/api/system-admin/plans';

            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(plan)
            });

            if (res.ok) {
                loadData();
                setShowPlanModal(false);
                setEditingItem(null);
            }
        } catch (e) {
            console.error("Error saving plan", e);
        }
    };

    const handleSaveCoupon = async (coupon: Partial<Coupon>) => {
        try {
            const method = coupon.id ? 'PUT' : 'POST';
            const url = coupon.id ? `/api/system-admin/coupons/${coupon.id}` : '/api/system-admin/coupons';

            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(coupon)
            });

            if (res.ok) {
                loadData();
                setShowCouponModal(false);
                setEditingItem(null);
            }
        } catch (e) {
            console.error("Error saving coupon", e);
        }
    };

    const handleDelete = async (type: 'plan' | 'coupon', id: string) => {
        if (!confirm('Tem certeza? Isso pode afetar assinaturas existentes.')) return;

        try {
            const url = `/api/system-admin/${type}s/${id}`;
            await fetchWithAuth(url, { method: 'DELETE' });
            loadData();
        } catch (e) {
            console.error("Error deleting", e);
        }
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="font-heading text-2xl font-bold text-slate-900">Gestão de Planos & Ofertas</h1>
                        <p className="text-slate-600">Gerencie preços, limites e cupons de desconto.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'plans'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        Planos de Assinatura
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

                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    {activeTab === 'plans' ? (
                        <div>
                            <div className="flex justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Package className="w-5 h-5 text-indigo-600" />
                                    Planos Disponíveis
                                </h2>
                                <button
                                    onClick={() => { setEditingItem({}); setShowPlanModal(true); }}
                                    className="btn-primary flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    <Plus className="w-4 h-4" /> Novo Plano
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Nome</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Preço</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Slug</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {plans.map(plan => (
                                            <tr key={plan.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-900">{plan.display_name}</td>
                                                <td className="px-4 py-3">R$ {(plan.price_cents / 100).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-500">{plan.name}</td>
                                                <td className="px-4 py-3">
                                                    {plan.is_active
                                                        ? <span className="text-green-600 text-xs px-2 py-1 bg-green-100 rounded-full">Ativo</span>
                                                        : <span className="text-slate-500 text-xs px-2 py-1 bg-slate-100 rounded-full">Inativo</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setEditingItem(plan); setShowPlanModal(true); }}
                                                        className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Ticket className="w-5 h-5 text-indigo-600" />
                                    Cupons Ativos
                                </h2>
                                <button
                                    onClick={() => { setEditingItem({}); setShowCouponModal(true); }}
                                    className="btn-primary flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    <Plus className="w-4 h-4" /> Criar Cupom
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Código</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Desconto</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Usos</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {coupons.map(coupon => (
                                            <tr key={coupon.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-mono font-bold text-indigo-700">{coupon.code}</td>
                                                <td className="px-4 py-3">
                                                    {coupon.discount_type === 'percentage'
                                                        ? `${coupon.discount_value}%`
                                                        : `R$ ${(coupon.discount_value / 100).toFixed(2)}`
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {coupon.uses_count} / {coupon.max_uses || '∞'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {coupon.is_active
                                                        ? <span className="text-green-600 text-xs px-2 py-1 bg-green-100 rounded-full">Ativo</span>
                                                        : <span className="text-slate-500 text-xs px-2 py-1 bg-slate-100 rounded-full">Inativo</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDelete('coupon', coupon.id)}
                                                        className="text-red-600 hover:bg-red-50 p-1.5 rounded"
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
                </div>

                {/* Plan Modal */}
                {showPlanModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                            <h3 className="text-lg font-bold mb-4">{editingItem.id ? 'Editar Plano' : 'Novo Plano'}</h3>
                            <form onSubmit={(e) => { e.preventDefault(); handleSavePlan(editingItem); }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Nome Exibição</label>
                                        <input
                                            className="w-full border rounded p-2"
                                            value={editingItem.display_name || ''}
                                            onChange={e => setEditingItem({ ...editingItem, display_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Preço (Centavos)</label>
                                            <input
                                                type="number"
                                                className="w-full border rounded p-2"
                                                value={editingItem.price_cents || 0}
                                                onChange={e => setEditingItem({ ...editingItem, price_cents: parseInt(e.target.value) })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Slug (ID Único)</label>
                                            <input
                                                className="w-full border rounded p-2"
                                                value={editingItem.name || ''}
                                                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="planActive"
                                            checked={editingItem.is_active !== false}
                                            onChange={e => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                                        />
                                        <label htmlFor="planActive">Plano Ativo</label>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 border rounded text-slate-600">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Coupon Modal */}
                {showCouponModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                            <h3 className="text-lg font-bold mb-4">Novo Cupom</h3>
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveCoupon(editingItem); }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Código (Ex: PROMO20)</label>
                                        <input
                                            className="w-full border rounded p-2 uppercase"
                                            value={editingItem.code || ''}
                                            onChange={e => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Tipo</label>
                                            <select
                                                className="w-full border rounded p-2"
                                                value={editingItem.discount_type || 'percentage'}
                                                onChange={e => setEditingItem({ ...editingItem, discount_type: e.target.value })}
                                            >
                                                <option value="percentage">Porcentagem (%)</option>
                                                <option value="fixed_amount">Valor Fixo (R$)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Valor</label>
                                            <input
                                                type="number"
                                                className="w-full border rounded p-2"
                                                value={editingItem.discount_value || 0}
                                                onChange={e => setEditingItem({ ...editingItem, discount_value: parseInt(e.target.value) })}
                                                required
                                            />
                                            <span className="text-xs text-slate-400">Se valor fixo, em centavos. Se %, 1-100.</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Máximo de Usos (0 = Infinito)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded p-2"
                                            value={editingItem.max_uses || ''}
                                            onChange={e => setEditingItem({ ...editingItem, max_uses: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowCouponModal(false)} className="px-4 py-2 border rounded text-slate-600">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Criar Cupom</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
