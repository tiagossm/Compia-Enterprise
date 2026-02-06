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
    Loader2,
    Search
} from 'lucide-react';
import { useToast } from "@/react-app/hooks/useToast";
import SkeletonLoader from '@/react-app/components/ui/SkeletonLoader';

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
    const { error: showToastError } = useToast();

    // State
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cnpjLoading, setCnpjLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',

        // Company Data
        cpfCnpj: '',
        companyName: '', // Razão Social
        tradeName: '', // Nome Fantasia

        // Address
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',

        paymentMethod: 'PIX' as 'PIX' | 'CREDIT_CARD'
    });

    const [error, setError] = useState('');
    const [personType, setPersonType] = useState<'PJ' | 'PF'>('PJ'); // Default to PJ as B2B focus

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');
    const [discountValue, setDiscountValue] = useState(0);
    const [finalPrice, setFinalPrice] = useState(0);

    // Success State (PIX Inline)
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [pixData, setPixData] = useState<{
        qr_code: string;
        copy_paste: string;
        expiration?: string;
        payment_url?: string;
    } | null>(null);

    // Update final price when plan loads
    useEffect(() => {
        if (plan) {
            setFinalPrice(plan.price_cents / 100);
        }
    }, [plan]);

    // Format helpers
    const formatCNPJ = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    };

    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
    };

    const formatPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
    };

    const formatCEP = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/, '$1-$2')
            .slice(0, 9);
    };

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
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cpfCnpj') {
            formattedValue = personType === 'PJ' ? formatCNPJ(value) : formatCPF(value);
        }
        if (name === 'phone') formattedValue = formatPhone(value);
        if (name === 'zipCode') formattedValue = formatCEP(value);

        setFormData({ ...formData, [name]: formattedValue });
    };

    const handleCNPJBlur = async () => {
        if (personType !== 'PJ') return;

        const cleanCNPJ = formData.cpfCnpj.replace(/\D/g, '');
        if (cleanCNPJ.length !== 14) return;

        setCnpjLoading(true);
        try {
            // Use Supabase Edge Function Proxy to avoid CORS errors
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const res = await fetch(`${supabaseUrl}/functions/v1/api/cnpj/${cleanCNPJ}`, {
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'apikey': anonKey
                }
            });

            if (res.ok) {
                const responseData = await res.json();

                if (responseData.success && responseData.data) {
                    const data = responseData.data;

                    setFormData(prev => ({
                        ...prev,
                        companyName: data.razao_social || prev.companyName,
                        tradeName: data.nome_fantasia || data.razao_social || prev.tradeName,
                        zipCode: formatCEP(data.cep || prev.zipCode),
                        street: data.logradouro || prev.street,
                        number: data.numero || prev.number,
                        complement: data.complemento || prev.complement,
                        neighborhood: data.bairro || prev.neighborhood,
                        city: data.municipio || prev.city,
                        state: data.uf || prev.state,
                        phone: prev.phone || data.contact_phone || prev.phone,
                        email: prev.email || data.contact_email || prev.email
                    }));
                }
            } else {
                console.warn("CNPJ lookup failed:", res.status);
            }
        } catch (err) {
            console.error("Erro ao consultar CNPJ:", err);
            // Silent fail, user can type manually
        } finally {
            setCnpjLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            // Validate Common Fields
            if (!formData.name || !formData.email || !formData.password) {
                throw new Error('Preencha os campos obrigatórios (Nome, Email, Senha).');
            }

            if (personType === 'PJ') {
                if (!formData.companyName || !formData.cpfCnpj) {
                    throw new Error('Preencha os dados da empresa (CNPJ, Razão Social).');
                }
                const cleanCNPJ = formData.cpfCnpj.replace(/\D/g, '');
                if (cleanCNPJ.length !== 14) {
                    throw new Error('CNPJ inválido.');
                }
            } else {
                // PF Validation
                if (!formData.cpfCnpj) { // We use same field state for CPF
                    throw new Error('Preencha o CPF.');
                }
                const cleanCPF = formData.cpfCnpj.replace(/\D/g, '');
                if (cleanCPF.length !== 11) {
                    throw new Error('CPF inválido.');
                }
            }

            if (formData.password !== formData.confirmPassword) {
                throw new Error('As senhas não conferem.');
            }

            if (formData.password.length < 6) {
                throw new Error('A senha deve ter no mínimo 6 caracteres.');
            }

            if (!termsAccepted) {
                throw new Error('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
            }

            // Call API
            const apiUrl = import.meta.env.PROD
                ? 'https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/commerce/initiate'
                : '/api/commerce/initiate';

            const payload: any = {
                user: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password
                },
                plan_slug: planSlug,
                payment_method: formData.paymentMethod,
                coupon_code: couponApplied ? couponCode : undefined
            };

            // Conditionally add company data
            if (personType === 'PJ') {
                payload.company = {
                    name: formData.tradeName || formData.companyName,
                    legal_name: formData.companyName,
                    cnpj: formData.cpfCnpj,
                    address: {
                        street: formData.street,
                        number: formData.number,
                        complement: formData.complement,
                        neighborhood: formData.neighborhood,
                        city: formData.city,
                        state: formData.state,
                        zip_code: formData.zipCode
                    }
                };
            } else {
                // For PF we might send metadata or specific structure depending on backend support
                // Assuming backend creates a 'shadow' company or handles individual
                payload.individual_cpf = formData.cpfCnpj;
            }



            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });



            const data = await res.json();


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

            // Success -> Handle PIX inline or redirect for Credit Card
            if (data.pix_details && formData.paymentMethod === 'PIX') {
                // Show PIX QR Code inline
                setPixData({
                    qr_code: data.pix_details.qr_code,
                    copy_paste: data.pix_details.copy_paste,
                    expiration: data.pix_details.expiration,
                    payment_url: data.payment_url
                });
                setCheckoutSuccess(true);
            } else if (data.payment_url) {
                // Redirect for Credit Card or fallback
                window.location.href = data.payment_url;
            }

        } catch (err: any) {
            console.error('[CHECKOUT] Error:', err);
            setError(err.message || 'Erro desconhecido');
            showToastError("Erro", err.message || "Erro ao processar");
        } finally {
            setSubmitting(false);
        }
    };

    // =========================================================================
    // RENDER: SUCCESS STATE (PIX QR CODE INLINE)
    // =========================================================================
    if (checkoutSuccess && pixData) {
        return (
            <div className="min-h-screen bg-[#F8FAFC]">
                <header className="bg-white border-b border-slate-200 py-4">
                    <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <img src="/compia_logo_azul.png" alt="COMPIA" className="h-8" />
                            <span className="text-xl font-bold text-slate-900 border-l border-slate-300 pl-3 ml-1">Pagamento</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="w-4 h-4" />
                            Conta Criada
                        </div>
                    </div>
                </header>

                <main className="max-w-2xl mx-auto px-4 py-12">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <QrCode className="w-8 h-8 text-green-600" />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Falta só o pagamento!
                        </h2>
                        <p className="text-slate-500 mb-8">
                            Escaneie o QR Code ou copie o código PIX abaixo para finalizar sua assinatura.
                        </p>

                        {/* QR Code Image */}
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 inline-block mb-6">
                            <img
                                src={`data:image/png;base64,${pixData.qr_code}`}
                                alt="QR Code PIX"
                                className="w-48 h-48 mx-auto"
                            />
                        </div>

                        {/* Copy-Paste Code */}
                        <div className="bg-slate-50 rounded-xl p-4 mb-6">
                            <label className="block text-xs font-medium text-slate-500 mb-2">PIX Copia e Cola</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={pixData.copy_paste}
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 truncate"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(pixData.copy_paste);
                                        // Optionally show toast
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>

                        {pixData.expiration && (
                            <p className="text-xs text-slate-400 mb-6">
                                Válido até: {new Date(pixData.expiration).toLocaleString('pt-BR')}
                            </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {pixData.payment_url && (
                                <a
                                    href={pixData.payment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Ver Fatura Completa
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                            )}
                            <a
                                href="/login"
                                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors"
                            >
                                Já paguei, entrar agora
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>

                        <p className="text-xs text-slate-400 mt-8">
                            Após o pagamento ser confirmado, seu acesso será liberado automaticamente.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // =========================================================================
    // RENDER: LOADING STATE
    // =========================================================================
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC]">
                <header className="bg-white border-b border-slate-200 py-4">
                    <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
                        <SkeletonLoader className="h-8 w-32" />
                        <SkeletonLoader className="h-8 w-40 rounded-full" />
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
                    <div className="grid md:grid-cols-12 gap-8">
                        {/* Skeleton Left Col */}
                        <div className="md:col-span-5">
                            <div className="bg-white rounded-2xl p-6 border border-slate-100">
                                <SkeletonLoader className="h-6 w-48 mb-6" />
                                <SkeletonLoader className="h-32 w-full rounded-xl mb-6" />
                                <div className="space-y-3">
                                    <SkeletonLoader className="h-10 w-full" />
                                    <SkeletonLoader className="h-10 w-full" />
                                </div>
                            </div>
                        </div>
                        {/* Skeleton Right Col */}
                        <div className="md:col-span-7">
                            <div className="bg-white rounded-2xl p-8 border border-slate-100">
                                <SkeletonLoader className="h-8 w-64 mb-8" />
                                <div className="space-y-6">
                                    <SkeletonLoader className="h-40 w-full rounded-xl" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <SkeletonLoader className="h-12 w-full" />
                                        <SkeletonLoader className="h-12 w-full" />
                                    </div>
                                    <SkeletonLoader className="h-12 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Clean - Enhanced Shadows/Spacing */}
            <header className="bg-white border-b border-slate-200 py-4 shadow-[var(--shadow-soft)] sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src="/COMPIA_BRAND_KIT/png/2x/compia-logo-main.png" alt="COMPIA" className="h-8 md:h-9" />
                        <span className="text-lg md:text-xl font-semibold text-slate-600 border-l-2 border-slate-200 pl-4 py-0.5 hidden sm:block">
                            Checkout Seguro
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700 text-xs sm:text-sm font-semibold bg-green-50 px-4 py-2 rounded-full border border-green-100 shadow-sm">
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


                        </div>
                    </div>

                    {/* RIGHT COLUMN - CHECKOUT FORM */}
                    <div className="md:col-span-7 order-1 md:order-2">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">

                            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                                <User className="w-6 h-6 text-blue-600" />
                                Dados do Assinante
                            </h2>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 flex items-center gap-2 animate-fade-in">
                                    <Lock className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6">

                                {/* TOGGLE PERSON TYPE */}
                                <div className="bg-slate-50 p-1.5 rounded-xl flex gap-1 border border-slate-200 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setPersonType('PJ')}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${personType === 'PJ'
                                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                            }`}
                                    >
                                        Pessoa Jurídica (Empresa)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPersonType('PF')}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${personType === 'PF'
                                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                            }`}
                                    >
                                        Pessoa Física
                                    </button>
                                </div>


                                {/* DADOS DA EMPRESA (Conditional) */}
                                {personType === 'PJ' && (
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-slide-up">
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                            Dados da Empresa
                                        </h3>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">CNPJ (Busca Automática)</label>
                                                <div className="relative">
                                                    <input
                                                        name="cpfCnpj"
                                                        value={formData.cpfCnpj}
                                                        onChange={handleChange}
                                                        onBlur={handleCNPJBlur}
                                                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-medium"
                                                        placeholder="00.000.000/0000-00"
                                                    />
                                                    <div className="absolute right-3 top-3 text-slate-400">
                                                        {cnpjLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Search className="w-5 h-5" />}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 ml-1">Digite o CNPJ para preencher os dados automaticamente.</p>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Razão Social</label>
                                                <input
                                                    name="companyName"
                                                    value={formData.companyName}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white"
                                                    placeholder="Razão Social da Empresa"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Nome Fantasia</label>
                                                <input
                                                    name="tradeName"
                                                    value={formData.tradeName}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white"
                                                    placeholder="Nome Fantasia (Opcional)"
                                                />
                                            </div>
                                        </div>

                                        {/* ADDRESS PJ */}
                                        <div className="mt-4 pt-4 border-t border-slate-200 grid md:grid-cols-6 gap-3">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">CEP</label>
                                                <input name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" placeholder="00000-000" />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Rua</label>
                                                <input name="street" value={formData.street} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" placeholder="Av. Paulista" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Número</label>
                                                <input name="number" value={formData.number} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" placeholder="1000" />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Complemento</label>
                                                <input name="complement" value={formData.complement} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" placeholder="Sala 101" />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Bairro</label>
                                                <input name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Cidade</label>
                                                <input name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">UF</label>
                                                <input name="state" value={formData.state} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm" maxLength={2} />
                                            </div>
                                        </div>
                                    </div>
                                )}


                                {/* DADOS PESSOAIS (Always Visible, adapted for PF/PJ) */}
                                <div className="grid md:grid-cols-2 gap-5">
                                    {personType === 'PF' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                                <input
                                                    name="cpfCnpj"
                                                    value={formData.cpfCnpj}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium bg-white"
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Noome Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                placeholder="Seu nome completo"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                placeholder="seu@email.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SENHA */}
                                <div className="grid md:grid-cols-2 gap-5 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                    <div className="md:col-span-2 text-xs text-yellow-700 font-medium mb-1 flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        Defina sua senha de acesso ao sistema
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Senha</label>
                                        <input
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                            placeholder="Min. 6 caracteres"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Confirmar Senha</label>
                                        <input
                                            name="confirmPassword"
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500/20 bg-white ${formData.confirmPassword && formData.password !== formData.confirmPassword
                                                ? 'border-red-300 focus:border-red-500'
                                                : 'border-slate-300 focus:border-blue-500'
                                                }`}
                                            placeholder="Repita a senha"
                                        />
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

                            <div className="mb-8 flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex h-6 items-center">
                                    <input
                                        id="terms"
                                        name="terms"
                                        type="checkbox"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </div>
                                <div className="text-sm">
                                    <label htmlFor="terms" className="font-bold text-slate-700 cursor-pointer text-base">
                                        Li e concordo com os Termos
                                    </label>
                                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                        Ao criar sua conta, você concorda com nossos{' '}
                                        <a href="/terms" target="_blank" className="text-blue-600 font-bold hover:underline">Termos de Uso</a>
                                        {' '}e{' '}
                                        <a href="/privacy" target="_blank" className="text-blue-600 font-bold hover:underline">Política de Privacidade</a>.
                                        Seus dados são protegidos pela LGPD. Em caso de dúvidas: <a href="mailto:suporte@compia.tech" className="text-blue-600 hover:underline">suporte@compia.tech</a>
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
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
