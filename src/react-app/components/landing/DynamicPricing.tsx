import { useState, useEffect } from 'react';
import { Check, ArrowRight, Loader } from 'lucide-react';

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
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [, setError] = useState('');

    useEffect(() => {
        async function fetchPlans() {
            try {
                // In production, this uses the public route we just created
                const res = await fetch('/api/public-plans');
                if (res.ok) {
                    const data = await res.json();
                    setPlans(data.plans || []);
                } else {
                    // Fallback to static data if API fails (e.g. during build/preview without backend)
                    console.warn('API de planos indisponível, usando fallback estático.');
                    setPlans([
                        {
                            id: 'fallback-starter',
                            name: 'starter',
                            slug: 'starter-monthly',
                            display_name: 'Essencial',
                            description: 'Para profissionais que buscam eficiência básica.',
                            price_cents: 14900,
                            billing_period: 'monthly',
                            features: {
                                ai_agents: true,
                                dashboard: true
                            },
                            limits: {},
                            is_active: true
                        },
                        {
                            id: 'fallback-pro',
                            name: 'professional',
                            slug: 'pro-monthly',
                            display_name: 'Inteligente',
                            description: 'Gestão completa com inteligência artificial.',
                            price_cents: 39900,
                            billing_period: 'monthly',
                            features: {
                                ai_agents: true,
                                dashboard: true,
                                integrations: true
                            },
                            limits: {},
                            is_active: true
                        }
                    ]);
                }
            } catch (err) {
                console.error("Failed to fetch plans", err);
                setError('Could not load plans');
            } finally {
                setLoading(false);
            }
        }

        fetchPlans();
    }, []);

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    // Sort plans by price just in case
    const sortedPlans = [...plans].sort((a, b) => a.price_cents - b.price_cents);

    return (
        <div id="planos" className="py-32 scroll-mt-32 bg-slate-50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-pulse-slow animation-delay-500"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                        Planos Simples e Transparentes
                    </h2>
                    <p className="text-xl text-slate-600">
                        Comece pequeno e cresça com a gente. Sem taxas ocultas.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto items-start">
                    {sortedPlans.map((plan, index) => {
                        const isPopular = plan.name.includes('business') || index === 1;
                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl p-8 transition-all duration-300 ${isPopular
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20 ring-4 ring-blue-600/20 md:-mt-4 md:mb-4'
                                    : 'bg-white text-slate-900 border border-slate-200 hover:shadow-lg hover:-translate-y-1'
                                    }`}
                            >
                                {isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                                        MAIS POPULAR
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                                        {plan.display_name}
                                    </h3>
                                    <p className={`text-sm ${isPopular ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {plan.description}
                                    </p>
                                </div>

                                <div className="mb-8 flex items-end gap-1">
                                    <span className="text-sm font-bold opacity-80 mb-2">R$</span>
                                    <span className="text-5xl font-extrabold tracking-tight">{(plan.price_cents / 100).toFixed(0)}</span>
                                    <span className={`text-sm mb-2 ${isPopular ? 'text-blue-100' : 'text-slate-500'}`}>/mês</span>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {[
                                        { text: 'Inspeções Ilimitadas', included: true },
                                        { text: 'Relatórios PDF Automáticos', included: true },
                                        { text: 'Até 5 Usuários', included: true }, // Dynamic from limits would be better
                                        { text: 'IA Generativa (Mãos Livres)', included: true },
                                        { text: 'Dashboards Avançados', included: isPopular },
                                        { text: 'Integração via API', included: isPopular },
                                        { text: 'Gestor de Conta Dedicado', included: isPopular },
                                    ].map((feature, i) => (
                                        <li key={i} className={`flex items-center gap-3 text-sm ${!feature.included ? 'opacity-40' : ''}`}>
                                            <div className={`p-0.5 rounded-full ${isPopular ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className={isPopular ? 'text-blue-50' : 'text-slate-600'}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => window.location.href = `/auth/signup?plan=${plan.slug || 'pro-monthly'}`}
                                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isPopular
                                        ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                                        }`}
                                >
                                    Começar Agora
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-500 text-sm">
                        Precisa de um plano customizado para grandes volumes?
                        <a href="#" className="ml-1 text-blue-600 font-bold hover:underline">Fale com vendas</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
