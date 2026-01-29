import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    CheckCircle2,
    ShieldCheck,
    CreditCard,
    QrCode,
    Building2,
    User,
    Mail,
    Phone,
    Lock,
    ArrowRight,
    Loader2
} from 'lucide-react';


interface Plan {
    id: string;
    name: string;
    display_name: string;
    price_display: string;
    price_cents: number;
    description: string;
}

export default function Checkout() {
    const [searchParams] = useSearchParams();
    const planSlug = searchParams.get('plan') || 'pro';

    // State
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpfCnpj: '',
        password: '',
        paymentMethod: 'PIX' as 'PIX' | 'CREDIT_CARD'
    });

    const [error, setError] = useState('');

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');
    const [discountValue, setDiscountValue] = useState(0);
    const [finalPrice, setFinalPrice] = useState(0);

    // Update final price when plan loads
    useEffect(() => {
        if (plan) {
            setFinalPrice(plan.price_cents / 100);
        }
    }, [plan]);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setValidatingCoupon(true);
        setCouponError('');
        setCouponSuccess('');

        try {
            const apiUrl = import.meta.env.PROD
                ? 'https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/commerce/validate-coupon'
                : '/api/commerce/validate-coupon';

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode, plan_slug: planSlug })
            });

            const data = await res.json();

            if (data.valid) {
                setCouponApplied(true);
                setDiscountValue(data.discount / 100);
                setFinalPrice(data.final_price / 100);
                setCouponSuccess(`Desconto de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.discount / 100)} aplicado!`);
            } else {
                setCouponError(data.message || 'Cupom inválido');
                setCouponApplied(false);
            }
        } catch (err) {
            console.error(err);
            setCouponError('Erro ao validar cupom');
        } finally {
            setValidatingCoupon(false);
        }
    };

    useEffect(() => {
        loadPlan();
    }, [planSlug]);

    const loadPlan = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/public-plans');
            if (res.ok) {
                const data = await res.json();
                const foundPlan = data.plans?.find((p: any) => p.slug === planSlug || p.name === planSlug) || data.plans?.[0];

                if (foundPlan) {
                    setPlan({
                        id: foundPlan.id,
                        name: foundPlan.name,
                        display_name: foundPlan.display_name,
                        price_display: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(foundPlan.price_cents / 100),
                        price_cents: foundPlan.price_cents,
                        description: foundPlan.description || 'Plano selecionado'
                    });
                }
            } else {
                console.error('Failed to load plans');
            }
        } catch (err) {
            console.error('Error loading plans', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        console.log('[CHECKOUT] Submit started', { formData, planSlug });

        try {
            // Validate
            if (!formData.name || !formData.email || !formData.cpfCnpj || !formData.password) {
                throw new Error('Preencha todos os campos obrigatórios.');
            }

            console.log('[CHECKOUT] Calling API...');

            // Call API - Use full URL to avoid routing issues
            const apiUrl = import.meta.env.PROD
                ? 'https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/commerce/initiate'
                : '/api/commerce/initiate';

            console.log('[CHECKOUT] API URL:', apiUrl);

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: {
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        password: formData.password
                    },
                    company: {
                        name: formData.name, // Use name as company name for now
                        cnpj: formData.cpfCnpj
                    },
                    plan_slug: planSlug,
                    payment_method: formData.paymentMethod,
                    coupon_code: couponApplied ? couponCode : undefined
                })
            });

            console.log('[CHECKOUT] Response status:', res.status);

            const data = await res.json();
            console.log('[CHECKOUT] Response data:', data);

            if (data.status === 'pending' && data.can_retry) {
                setError(data.message || 'Houve um problema. Tente novamente.');
                return;
            }

            if (data.status === 'existing_user') {
                setError('Este email já está cadastrado. Faça login para continuar.');
                return;
            }

            if (!res.ok && data.error) {
                throw new Error(data.error);
            }

            // Success -> Redirect to Payment URL (Asaas)
            if (data.payment_url) {
                console.log('[CHECKOUT] Redirecting to:', data.payment_url);
                window.location.href = data.payment_url;
            }

        } catch (err: any) {
            console.error('[CHECKOUT] Error:', err);
            setError(err.message || 'Erro desconhecido');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Clean */}
            <header className="bg-white border-b border-slate-200 py-4">
                <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="/compia_logo_azul.png" alt="COMPIA" className="h-8" />
                        <span className="text-xl font-bold text-slate-900 border-l border-slate-300 pl-3 ml-1">Checkout Seguro</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full">
                        <ShieldCheck className="w-4 h-4" />
                        Ambiente Criptografado
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
                <div className="grid md:grid-cols-12 gap-8">

                    {/* LEFT COLUMN - ORDER SUMMARY */}
                    <div className="md:col-span-5 order-2 md:order-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                Resumo do Pedido
                            </h3>

                            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{plan?.display_name}</h4>
                                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{plan?.description}</p>
                                    </div>
                                    <span className="font-bold text-lg text-blue-600">{plan?.price_display}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-2">Renovação mensal automática. Cancele quando quiser.</div>
                            </div>

                            <div className="space-y-4 mb-8">
                                {/* Coupon Section */}
                                <div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Cupom de desconto"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            disabled={couponApplied || validatingCoupon}
                                            className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-white ${couponError ? 'border-red-300 focus:border-red-500' :
                                                couponApplied ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode || couponApplied || validatingCoupon}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${couponApplied ? 'bg-green-100 text-green-700 cursor-default' :
                                                'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                                }`}
                                        >
                                            {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : couponApplied ? 'Aplicado' : 'Aplicar'}
                                        </button>
                                    </div>
                                    {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                                    {couponSuccess && <p className="text-xs text-green-600 mt-1">{couponSuccess}</p>}
                                </div>

                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                                    <span>Subtotal</span>
                                    <span>{plan?.price_display}</span>
                                </div>

                                {couponApplied && discountValue > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 border-b border-green-100 pb-2">
                                        <span>Desconto</span>
                                        <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountValue)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-lg font-bold text-slate-900">
                                    <span>Total</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPrice)}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl flex gap-3 items-start">
                                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold mb-1">Garantia de 7 dias</p>
                                    <p className="opacity-90">Se não ficar satisfeito, devolvemos 100% do seu dinheiro sem perguntas.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - CHECKOUT FORM */}
                    <div className="md:col-span-7 order-1 md:order-2">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">

                            <h2 className="text-2xl font-bold text-slate-900 mb-8">Dados de Acesso</h2>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-5">
                                <div className="grid md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                placeholder="Seu nome"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Celular / WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Profissional</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <input
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                            placeholder="seu@empresa.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF ou CNPJ</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input
                                                name="cpfCnpj"
                                                value={formData.cpfCnpj}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                placeholder="00.000.000/0000-00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Criar Senha</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input
                                                name="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                placeholder="Min. 6 caracteres"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="my-8 border-slate-100" />

                            <h2 className="text-xl font-bold text-slate-900 mb-6">Pagamento</h2>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, paymentMethod: 'PIX' })}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${formData.paymentMethod === 'PIX'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                                        }`}
                                >
                                    <QrCode className="w-8 h-8" />
                                    <span className="font-bold">PIX Instantâneo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, paymentMethod: 'CREDIT_CARD' })}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${formData.paymentMethod === 'CREDIT_CARD'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                                        }`}
                                >
                                    <CreditCard className="w-8 h-8" />
                                    <span className="font-bold">Cartão de Crédito</span>
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-green-600/20 transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
                            >
                                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                    <>
                                        Finalizar Compra Segura
                                        <ArrowRight className="w-6 h-6" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-2">
                                <Lock className="w-3 h-3" />
                                Seus dados estão 100% seguros e criptografados.
                            </p>

                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
