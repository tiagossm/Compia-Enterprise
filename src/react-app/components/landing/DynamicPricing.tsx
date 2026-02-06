import { useState, useEffect } from 'react';
import { Check, ArrowRight, Loader, Zap } from 'lucide-react';

interface Plan {
    id: string;
    name: string;
    slug: string;
    display_name: string;
    description: string;
    price_cents: number;
    billing_period: 'monthly' | 'yearly';
    features: Record<string, boolean>;
    limits: Record<string, number>;
    is_active: boolean;
}

export default function DynamicPricing() {
    const [allPlans, setAllPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        async function fetchPlans() {
            try {
                // Use absolute URL to guarantee hit on Supabase Edge Functions
                // (Relative /api/... only works with Vercel Rewrites or Vite Proxy)
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                // Fallback for development if env is missing, though it should allow relative in dev
                const baseUrl = supabaseUrl ? `${supabaseUrl}/functions/v1` : '';
                const apiUrl = `${baseUrl}/api/public-plans`;
                const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                const res = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${anonKey}`, // Required by Supabase Gateway even with --no-verify-jwt often
                        'apikey': anonKey
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    let fetchedPlans = data.plans || [];

                    // --- WORKAROUND: CORRIGIR PLANO "ANAL" (ANUAL) ---
                    fetchedPlans = fetchedPlans.map((p: Plan) => {
                        const isYearly = p.slug.includes('anual') || p.slug.includes('yearly') || p.name.includes('anual') || p.name.includes('yearly');
                        if (isYearly) {
                            return { ...p, billing_period: 'yearly' };
                        }
                        return p;
                    });

                    setAllPlans(fetchedPlans);
                } else {
                    console.warn('API de planos falhou, usando estático.', res.status);
                    setAllPlans(getStaticFallback());
                }
            } catch (err) {
                console.error("Failed to fetch plans", err);
                setAllPlans(getStaticFallback());
            } finally {
                setLoading(false);
            }
        }
        fetchPlans();
    }, []);

    const getStaticFallback = (): Plan[] => [
        {
            id: 'starter-m', name: 'starter', slug: 'starter-monthly', display_name: 'Essencial', description: 'Eficiência básica.',
            price_cents: 4900, billing_period: 'monthly', features: { ai_agents: true }, limits: {}, is_active: true
        },
        {
            id: 'pro-m', name: 'professional', slug: 'pro-monthly', display_name: 'Inteligente', description: 'IA completa.',
            price_cents: 9900, billing_period: 'monthly', features: { ai_agents: true, dashboard: true }, limits: {}, is_active: true
        },
        // Fallback yearly
        {
            id: 'starter-y', name: 'starter', slug: 'starter-yearly', display_name: 'Essencial', description: 'Eficiência básica.',
            price_cents: 49000, billing_period: 'yearly', features: { ai_agents: true }, limits: {}, is_active: true
        },
        {
            id: 'pro-y', name: 'professional', slug: 'pro-yearly', display_name: 'Inteligente', description: 'IA completa.',
            price_cents: 99000, billing_period: 'yearly', features: { ai_agents: true, dashboard: true }, limits: {}, is_active: true
        }
    ];

    if (loading) {
        return <div className="py-20 flex justify-center"><Loader className="w-8 h-8 text-blue-600 animate-spin" /></div>;
    }

    // Filter plans based on selected cycle and tier
    // Tier 1: Starter/Basic/Essencial
    // Tier 2: Pro/Business/Inteligente
    const getPlanByTier = (tier: 'starter' | 'pro') => {
        return allPlans.find(p => {
            const matchCycle = p.billing_period === cycle;
            // Loose matching to accommodate DB variations
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
            title: starterPlan?.display_name || 'Essencial',
            description: starterPlan?.description || 'Para quem está começando a digitalizar.',
            features: ['Até 5 Usuários', 'Checklists Ilimitados', 'Fotos e GPS', 'Relatórios em PDF'],
            highlight: false
        },
        {
            key: 'pro',
            plan: proPlan,
            title: proPlan?.display_name || 'Inteligente',
            description: proPlan?.description || 'Automação total com nossa IA.',
            features: ['Usuários Ilimitados', 'IA Generativa (Voz)', 'Dashboards', 'Gestor de Conta', 'Integração API'],
            highlight: true
        }
    ];

    return (
        <div id="planos" className="py-32 scroll-mt-32 bg-slate-50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                        Investimento que se paga
                    </h2>
                    <p className="text-xl text-slate-600 mb-8">
                        Escolha o plano ideal para sua operação. Cancele quando quiser.
                    </p>

                    {/* CYCLE TOGGLE */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="bg-white p-1 rounded-full border border-slate-200 shadow-sm inline-flex relative">
                            <button
                                onClick={() => setCycle('monthly')}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${cycle === 'monthly'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setCycle('yearly')}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${cycle === 'yearly'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                Anual
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                    -20% OFF
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
                    {displayPlans.map((item) => {
                        // Use fallback price logic if plan is missing but defined in metadata
                        const price = item.plan ? (item.plan.price_cents / 100) : 0;
                        const formattedPrice = price > 0
                            ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                            : 'Consultar';

                        return (
                            <div
                                key={item.key}
                                className={`relative rounded-3xl p-8 transition-all duration-300 flex flex-col ${item.highlight
                                    ? 'bg-white ring-4 ring-blue-500/20 shadow-2xl scale-105 z-10'
                                    : 'bg-white/60 border border-slate-200 hover:bg-white hover:shadow-xl'
                                    }`}
                            >
                                {item.highlight && (
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-2xl shadow-sm">
                                        MAIS POPULAR
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-slate-500 text-sm h-10">{item.description}</p>
                                </div>

                                <div className="mb-8 flex items-baseline gap-1">
                                    {item.plan ? (
                                        <>
                                            <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{formattedPrice}</span>
                                            <span className="text-slate-500 font-medium">/{cycle === 'monthly' ? 'mês' : 'ano'}</span>
                                        </>
                                    ) : (
                                        <span className="text-lg text-slate-400 italic">Indisponível no momento</span>
                                    )}
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {item.features.map((feat, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                                            <div className={`p-0.5 rounded-full flex-shrink-0 ${item.highlight ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => {
                                        if (item.plan) {
                                            // Direct to Checkout instead of Signup
                                            window.location.href = `/checkout?plan=${item.plan.slug}`;
                                        }
                                    }}
                                    disabled={!item.plan}
                                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${!item.plan
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : item.highlight
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                                        }`}

                                >
                                    {item.highlight && <Zap className="w-4 h-4 fill-white" />}
                                    {loading ? 'Carregando...' : 'Começar Agora'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-16 text-center border-t border-slate-200/60 pt-8 max-w-2xl mx-auto">
                    <p className="text-slate-500 text-sm">
                        Precisa de um plano Enterprise para mais de 50 usuários ou integração SSO?
                        <a href="mailto:vendas@compia.tech" className="ml-1 text-blue-600 font-bold hover:underline">
                            Fale com nosso time de vendas
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
