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

    useEffect(() => {
        loadPlan();
    }, [planSlug]);

    const loadPlan = async () => {
        try {
            // Mock or Fetch Plan - For now using mock to speed up UI dev
            // In real impl, would fetch /api/financial/plans?slug=...
            const mockPlans: Record<string, Plan> = {
                'pro': {
                    id: 'pro-id',
                    name: 'pro',
                    display_name: 'Plano Inteligente',
                    price_display: 'R$ 397,00',
                    price_cents: 39700,
                    description: 'Acesso completo a todos os assistentes IA e inspeções ilimitadas.'
                },
                'starter': {
                    id: 'starter-id',
                    name: 'starter',
                    display_name: 'Plano Técnico',
                    price_display: 'R$ 199,00',
                    price_cents: 19900,
                    description: 'Para profissionais que estão começando.'
                }
            };
            setPlan(mockPlans[planSlug] || mockPlans['pro']);
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

        try {
            // Validate
            if (!formData.name || !formData.email || !formData.cpfCnpj || !formData.password) {
                throw new Error('Preencha todos os campos obrigatórios.');
            }

            // Call API
            const res = await fetch('/api/commerce/initiate', {
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
                        tax_id: formData.cpfCnpj
                    },
                    plan_slug: planSlug,
                    payment_method: formData.paymentMethod
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao processar checkout.');

            // Success -> Redirect to Payment URL (Asaas) or Show PIX Modal
            if (data.payment_url) {
                window.location.href = data.payment_url;
            }

        } catch (err: any) {
            console.error(err);
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
                                <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
                                    <span>Subtotal</span>
                                    <span>{plan?.price_display}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-slate-900">
                                    <span>Total</span>
                                    <span>{plan?.price_display}</span>
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
