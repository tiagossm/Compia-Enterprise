import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  Zap,
  Shield as ShieldIcon,
  Leaf,
  Building,
  Wrench,
  Mic,
  MapPin,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Plan {
  name: string;
  slug: string;
  description: string;
  price: string;
  features: string[];
  featured?: boolean;
}

const RevealOnScroll = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  // New state for multi-industry tabs
  const [activeSector, setActiveSector] = useState('agro');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/financial/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.filter((p: Plan) => p.slug !== 'enterprise')); // Show all except custom enterprise if needed
        } else {
          // Fallback static data if API fails to render specifically for landing page demo
          setPlans([
            {
              name: "Starter",
              slug: "starter",
              description: "Ideal para consultores individuais.",
              price: "R$ 49/mês",
              features: ["1 Usuário", "Até 10 inspeções/mês", "Relatórios PDF", "App Offshore/Offline"]
            },
            {
              name: "Professional",
              slug: "professional",
              description: "Para pequenas equipes de segurança.",
              price: "R$ 149/mês",
              features: ["Até 5 Usuários", "Inspeções ilimitadas", "Dashboards básicos", "Customização de checklist", "IA Mãos Livres (Beta)"],
              featured: true
            },
            {
              name: "Business",
              slug: "business",
              description: "Gestão completa para médias empresas.",
              price: "R$ 399/mês",
              features: ["Até 15 Usuários", "Dashboards avançados", "API de integração", "Gerente de conta", "IA Mãos Livres", "GPS Atômico"]
            }
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch plans", error);
      }
    }
    fetchPlans();
  }, []);

  const sectors = [
    {
      id: 'agro',
      label: 'Agronegócio',
      title: 'Campo Conectado',
      description: 'Monitoramento de pragas, aplicação de insumos e manutenção de frota no campo.',
      features: ['Geolocalização offline', 'Manejo de pragas', 'Inspeção de maquinário'],
      icon: <Leaf className="w-6 h-6" />,
      color: 'text-green-600 bg-green-50'
    },
    {
      id: 'const',
      label: 'Construção',
      title: 'Canteiro Seguro',
      description: 'Diário de obra digital, controle de EPIs e conformidade com NR-18.',
      features: ['Diário de Obra', 'Controle de EPI', 'Conformidade NR-18'],
      icon: <Building className="w-6 h-6" />,
      color: 'text-orange-600 bg-orange-50'
    },
    {
      id: 'ind',
      label: 'Indústria',
      title: 'Chão de Fábrica 4.0',
      description: 'Manutenção preditiva, auditorias de qualidade e rondas operacionais.',
      features: ['Manutenção Preditiva', 'Auditoria ISO 9001', 'Rondas de turno'],
      icon: <Wrench className="w-6 h-6" />,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      id: 'sst',
      label: 'SST & EHS',
      title: 'Segurança Total',
      description: 'Gestão completa de riscos, perigos e conformidade legal (NRs).',
      features: ['Gestão de Riscos', 'Inspeções de Segurança', 'Gestão de Não Conformidades'],
      icon: <ShieldIcon className="w-6 h-6" />,
      color: 'text-indigo-600 bg-indigo-50'
    }
  ];

  const activeSectorData = sectors.find(s => s.id === activeSector) || sectors[0];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <img src="/compia_logo.png" alt="Compia" className="relative h-10 w-auto transform transition-transform group-hover:scale-105" />
            </div>
            <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-slate-900' : 'text-slate-900'} transition-colors`}>
              COMPIA
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#recursos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Diferenciais</a>
            <a href="#setores" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Setores</a>
            <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Planos</a>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
            >
              Entrar
            </button>
          </div>

          <button className="md:hidden text-slate-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 py-4 px-6 shadow-xl animate-fade-in">
            <div className="flex flex-col space-y-4">
              <a href="#recursos" className="text-slate-600 hover:text-blue-600 font-medium" onClick={() => setIsMenuOpen(false)}>Diferenciais</a>
              <a href="#setores" className="text-slate-600 hover:text-blue-600 font-medium" onClick={() => setIsMenuOpen(false)}>Setores</a>
              <a href="#planos" className="text-slate-600 hover:text-blue-600 font-medium" onClick={() => setIsMenuOpen(false)}>Planos</a>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 text-center text-white bg-slate-900 rounded-lg font-semibold"
              >
                Acessar Plataforma
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-8 animate-fade-in">
              <Zap size={14} className="fill-blue-700" />
              Nova Geração de Auditoria
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight mb-6 leading-tight animate-slide-up">
              Transforme Conversas de <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Campo em Dados.</span>
            </h1>

            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up animation-delay-200">
              A plataforma definitiva para <strong>Agro, Indústria, Construção e SST</strong>.
              Gere relatórios complexos apenas falando, com evidência irrefutável via <strong>GPS Atômico</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up animation-delay-300">
              <button
                onClick={() => navigate('/auth/signup')}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all hover:scale-105 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all hover:border-slate-300"
              >
                Ver Demonstração
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Killer Features - Cards */}
      <section id="recursos" className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <RevealOnScroll className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Mic className="text-indigo-600 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">IA "Mãos Livres"</h3>
              <p className="text-slate-600 leading-relaxed">
                Não digite relatórios. Fale o que vê e a IA transcreve, categoriza e gera o plano de ação automaticamente.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="text-blue-600 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">GPS Atômico</h3>
              <p className="text-slate-600 leading-relaxed">
                Prova de presença imutável. Registre coordenadas exatas e timestamp blindado em cada inspeção.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Layers className="text-orange-600 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Mapas de Calor</h3>
              <p className="text-slate-600 leading-relaxed">
                Visualização espacial de riscos. Identifique zonas críticas na sua planta ou fazenda em segundos.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Multi-Industry Sectors */}
      <section id="setores" className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6">
          <RevealOnScroll className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Um Sistema, Múltiplos Mundos</h2>
            <p className="text-lg text-slate-600">O Compia se adapta à linguagem e necessidades do seu setor.</p>
          </RevealOnScroll>

          <RevealOnScroll delay={200}>
            <div className="flex justify-center flex-wrap gap-2 mb-12">
              {sectors.map((sector) => (
                <button
                  key={sector.id}
                  onClick={() => setActiveSector(sector.id)}
                  className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 border ${activeSector === sector.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                >
                  {sector.label}
                </button>
              ))}
            </div>

            <div className="max-w-5xl mx-auto bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-100 relative overflow-hidden transition-all duration-500">
              {/* Background Decor */}
              <div className={`absolute top-0 right-0 w-64 h-64 opacity-10 rounded-full blur-3xl transition-colors duration-500 ${activeSectorData.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 ')}`}></div>

              <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                <div className="flex-1 space-y-6">
                  <div className={`inline-flex p-3 rounded-xl ${activeSectorData.color}`}>
                    {React.cloneElement(activeSectorData.icon as React.ReactElement, { className: "w-8 h-8" })}
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900">{activeSectorData.title}</h3>
                  <p className="text-lg text-slate-600 leading-relaxed">{activeSectorData.description}</p>

                  <ul className="space-y-4 pt-4">
                    {activeSectorData.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-slate-700 font-medium animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual Placeholder for Sector Interface */}
                <div className="flex-1 w-full relative group">
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2 transform rotate-1 group-hover:rotate-0 transition-transform duration-500">
                    <div className="bg-slate-100 rounded-xl h-64 w-full flex items-center justify-center overflow-hidden relative">
                      {/* Simple abstract UI representation */}
                      <div className="absolute inset-0 bg-slate-50 opacity-50"></div>
                      <div className="z-10 text-center">
                        {React.cloneElement(activeSectorData.icon as React.ReactElement, { className: "w-16 h-16 text-slate-300 mb-2 mx-auto" })}
                        <div className="text-slate-400 font-medium text-sm">Interface {activeSectorData.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="container mx-auto px-6 relative z-10">
          <RevealOnScroll className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Do Campo ao Escritório em Segundos</h2>
            <p className="text-slate-400 text-lg">Fluxo de trabalho fluido, sem papel e sem delay.</p>
          </RevealOnScroll>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Colete", desc: "App offline, fotos e áudio." },
              { step: "02", title: "Processe", desc: "IA analisa e estrutura dados." },
              { step: "03", title: "Relate", desc: "PDFs automáticos e instantâneos." },
              { step: "04", title: "Gerencie", desc: "Dashboards e planos de ação." }
            ].map((item, idx) => (
              <RevealOnScroll key={idx} delay={idx * 100} className="relative group">
                <div className="text-6xl font-black text-slate-800 absolute -top-8 -left-4 z-0 group-hover:text-slate-700 transition-colors select-none">{item.step}</div>
                <div className="relative z-10 pl-6">
                  <h3 className="text-xl font-bold mb-2 text-blue-400">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Escolha o plano ideal</h2>
            <p className="text-lg text-slate-600">Simples, transparente e sem contratos de fidelidade.</p>
          </RevealOnScroll>

          <RevealOnScroll delay={200} className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl flex flex-col ${plan.featured
                  ? 'bg-slate-900 text-white shadow-2xl scale-105 border-2 border-blue-500 z-10'
                  : 'bg-white text-slate-900 border border-slate-200'
                  }`}
              >
                {plan.featured && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                    Mais Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className={`text-3xl font-bold mb-4 ${plan.featured ? 'text-white' : 'text-slate-900'}`}>{plan.price}</div>
                <p className={`mb-8 ${plan.featured ? 'text-slate-400' : 'text-slate-500'}`}>{plan.description}</p>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${plan.featured ? 'text-blue-400' : 'text-green-500'}`} />
                      <span className={plan.featured ? 'text-slate-300' : 'text-slate-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/auth/signup')}
                  className={`w-full py-4 rounded-xl font-bold transition-colors ${plan.featured
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                >
                  Começar Agora
                </button>
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img src="/compia_logo.png" alt="Compia" className="h-8" />
                <span className="font-bold text-lg text-slate-900">COMPIA</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Plataforma Universal de Auditoria.
                Tecnologia de ponta para quem opera no mundo real.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#recursos" className="hover:text-blue-600">Recursos</a></li>
                <li><a href="#planos" className="hover:text-blue-600">Planos</a></li>
                <li><a href="#" className="hover:text-blue-600">Segurança</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600">Sobre</a></li>
                <li><a href="#" className="hover:text-blue-600">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600">Carreiras</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600">Privacidade</a></li>
                <li><a href="#" className="hover:text-blue-600">Termos</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
            © {new Date().getFullYear()} Compia. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
