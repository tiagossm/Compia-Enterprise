import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  Star,
  Quote,
  Play,
  Menu,
  X,
  Brain,
  FileText,
  Target,
  Building,
  Wrench,
  Heart,
  Leaf,
  Award,
  Lock,
  Cloud,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const useCases = [
  {
    title: "NR-12 – Máquinas",
    description: "Análise de proteções e dispositivos de segurança.",
    icon: <Target className="w-6 h-6 text-primary" />
  },
  {
    title: "NR-35 – Trabalho em Altura",
    description: "Verificação de EPIs, EPCs e procedimentos.",
    icon: <Building className="w-6 h-6 text-primary" />
  },
  {
    title: "NR-17 – Ergonomia",
    description: "AET automatizada com recomendações ergonômicas.",
    icon: <Heart className="w-6 h-6 text-primary" />
  },
  {
    title: "NR-10 – Eletricidade",
    description: "Prontuários e análise de risco elétrico.",
    icon: <Zap className="w-6 h-6 text-primary" />
  },
  {
    title: "Qualidade ISO 9001",
    description: "Gestão de não conformidades e rastreabilidade.",
    icon: <Award className="w-6 h-6 text-primary" />
  },
  {
    title: "Meio Ambiente",
    description: "Controle de resíduos e evidências ambientais.",
    icon: <Leaf className="w-6 h-6 text-primary" />
  }
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await fetch('/api/financial/plans');
        if (res.ok) {
          const data = await res.json();
          const formattedPlans = (data.plans || []).map((p: any) => ({
            name: p.display_name,
            slug: p.slug,
            description: p.description || (p.name === 'pro' ? 'Para operações que exigem IA e análise avançada' : 'Para profissionais iniciando a digitalização'),
            price: p.price_display,
            features: [
              p.limits?.inspections_monthly >= 99999 ? "Inspeções ilimitadas" : `Até ${p.limits?.inspections_monthly} inspeções/mês`,
              p.limits?.users >= 9999 ? "Usuários ilimitados" : `Até ${p.limits?.users} usuários`,
              `${p.limits?.storage_gb}GB Armazenamento`,
              ...(p.features?.ai_multimodal ? ["IA Multimodal (Fotos/Vídeo)"] : []),
              ...(p.features?.dashboard ? ["Dashboards Avançados"] : ["Relatórios Básicos"])
            ],
            featured: p.name === 'pro'
          }));

          if (!formattedPlans.find((p: any) => p.slug === 'enterprise')) {
            formattedPlans.push({
              name: "Corporativo",
              slug: "enterprise",
              description: "Customizações, integrações e suporte dedicado",
              features: ["Múltiplas unidades (Multi-tenant)", "Integrações API & Webhooks", "Suporte técnico dedicado", "Treinamento especializado", "SLA Garantido"],
              price: "Sob consulta"
            });
          }
          setPlans(formattedPlans);
        }
      } catch (error) {
        console.error("Failed to load plans", error);
        setPlans([
          {
            name: "Técnico",
            slug: "basic",
            description: "Para profissionais iniciando a digitalização",
            features: ["Até 10 inspeções/mês", "Checklists manuais", "Relatórios PDF básicos", "Suporte por email"],
            price: "R$ 199,00"
          },
          {
            name: "Inteligente",
            slug: "pro",
            description: "Poder total da IA para suas auditorias",
            features: ["Inspeções ilimitadas", "Assistentes IA por NR", "Dashboards avançados", "Múltiplas unidades", "Suporte prioritário"],
            featured: true,
            price: "R$ 397,00"
          },
          {
            name: "Corporativo",
            slug: "enterprise",
            description: "Escala e controle total para grandes operações",
            features: ["Múltiplas unidades", "Integração API", "Gestor de conta dedicado", "Treinamento on-site"],
            price: "Sob consulta"
          }
        ]);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <img
                src="/compia_logo.png"
                alt="COMPIA"
                className="h-10 w-auto"
              />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('recursos')} className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Recursos</button>
              <button onClick={() => scrollToSection('como-funciona')} className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Como funciona</button>
              <button onClick={() => scrollToSection('precos')} className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Planos</button>
              <a href="/login" className="text-sm font-bold text-primary hover:text-primary-hover transition-colors">
                Entrar
              </a>
              <a href="/register?plan=basic" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20">
                Criar conta
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-slate-600"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-slate-100 py-4 absolute w-full left-0 shadow-xl">
              <div className="flex flex-col space-y-2 px-4">
                <button onClick={() => scrollToSection('recursos')} className="text-slate-600 text-left px-4 py-3 rounded hover:bg-slate-50 font-medium">Recursos</button>
                <button onClick={() => scrollToSection('como-funciona')} className="text-slate-600 text-left px-4 py-3 rounded hover:bg-slate-50 font-medium">Como funciona</button>
                <button onClick={() => scrollToSection('precos')} className="text-slate-600 text-left px-4 py-3 rounded hover:bg-slate-50 font-medium">Planos</button>
                <a href="/login" className="text-primary text-left px-4 py-3 font-bold">Fazer Login</a>
                <a href="/register" className="bg-primary text-white text-center px-4 py-3 rounded-lg font-bold mt-2">Criar conta grátis</a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Clean & Minimal */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            Inspeções Inteligentes, <br />
            <span className="text-primary">Conformidade Garantida.</span>
          </h1>

          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            A plataforma definitiva para digitalizar auditorias de campo.
            Use Inteligência Artificial para identificar riscos e gerar relatórios técnicos em segundos, não horas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="/register" className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-primary/40 transform hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center">
              Começar teste grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <a href="/login" className="px-8 py-4 rounded-xl font-bold text-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all w-full sm:w-auto border border-slate-200 hover:border-slate-300">
              Ver demonstração
            </a>
          </div>

          <p className="mt-6 text-sm text-slate-400 font-medium uppercase tracking-wide">
            Sem cartão de crédito necessário • 14 dias grátis
          </p>
        </div>
      </section>

      {/* Como Funciona - 3 Passos Simples */}
      <section id="como-funciona" className="py-20 bg-slate-50 border-y border-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Fluxo de Trabalho Simplificado</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Linha conectora (Desktop) */}
            <div className="hidden md:block absolute top-[28px] left-[16%] right-[16%] h-0.5 bg-slate-200 -z-10"></div>

            {[
              {
                step: "1",
                title: "Inspecione",
                description: "App mobile offline para coleta de evidências, fotos e checklists em campo.",
                icon: <CheckCircle className="w-6 h-6 text-white" />
              },
              {
                step: "2",
                title: "Analise",
                description: "Nossa IA processa as evidências, identifica desvios e sugere a correta classificação.",
                icon: <Brain className="w-6 h-6 text-white" />
              },
              {
                step: "3",
                title: "Resolva",
                description: "Geração automática de Planos de Ação 5W2H e relatórios executivos.",
                icon: <FileText className="w-6 h-6 text-white" />
              }
            ].map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6 z-10">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos Principais (Benefits + Use Cases merged) */}
      <section id="recursos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Texto */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Tecnologia construída para a realidade da Indústria
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Deixamos de lado as planilhas complexas para oferecer uma ferramenta que entende o chão de fábrica.
                Seja para Segurança do Trabalho, Controle de Qualidade ou Manutenção.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {useCases.map((uc, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-blue-50 rounded text-primary shrink-0">
                      {uc.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{uc.title}</h4>
                      <p className="text-sm text-slate-500">{uc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ilustração Visual (Placeholder Limpo) */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-slate-100 rounded-3xl transform rotate-3 scale-95 opacity-50"></div>
              <div className="relative bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800">
                {/* Mockup de Interface Simplificado */}
                <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-slate-400 text-xs tracking-widest font-mono">COMPIA.SYS</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="w-10 h-10 rounded bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <Lock size={20} />
                    </div>
                    <div>
                      <div className="text-red-400 font-bold text-sm mb-1">Risco Crítico Detectado</div>
                      <div className="text-slate-300 text-xs">A proteção da prensa hidráulica PH-03 encontra-se violada. Requer parada imediata.</div>
                      <div className="mt-2 text-xs text-slate-500 bg-slate-900 inline-block px-2 py-1 rounded">NR-12.3.1 - Proteções fixas</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 opacity-60">
                    <div className="w-10 h-10 rounded bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <div className="text-green-400 font-bold text-sm mb-1">Conforme</div>
                      <div className="text-slate-300 text-xs">Sinalização de solo adequada e visível.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between items-center px-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-800"></div>
                    <div className="w-8 h-8 rounded-full bg-slate-500 border-2 border-slate-800"></div>
                  </div>
                  <div className="text-blue-400 text-xs font-bold uppercase tracking-wide animate-pulse">
                    Análise IA Concluída
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section - Real Plans */}
      <section id="precos" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Escolha o plano ideal</h2>
            <p className="text-slate-600">Simples, transparente e sem contratos de fidelidade.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {loadingPlans ? (
              <div className="col-span-3 text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Carregando planos...</p>
              </div>
            ) : plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl transition-all duration-300 flex flex-col ${plan.featured
                  ? 'bg-white shadow-2xl border-2 border-primary scale-105 z-10'
                  : 'bg-white border border-slate-200 shadow-sm hover:shadow-lg'
                  }`}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Mais Escolhido
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline text-slate-900">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    {plan.price !== 'Sob consulta' && <span className="text-slate-500 ml-1 font-medium">/mês</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-4 h-10">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                      <span className="text-sm text-slate-600 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    window.location.href = plan.slug === 'enterprise'
                      ? 'mailto:contato@compia.tech'
                      : `/register?plan=${plan.slug}`;
                  }}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${plan.featured
                    ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200'
                    }`}
                >
                  {plan.slug === 'enterprise' ? 'Falar com Consultor' : 'Começar Agora'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xl tracking-tight">COMPIA</span>
              <span className="text-slate-600">|</span>
              <span className="text-xs text-slate-400">Plataforma de Auditoria Inteligente</span>
            </div>

            <div className="flex gap-8 text-sm font-medium">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Suporte</a>
            </div>

            <div className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} Compia Tech. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

{/* How it Works */ }
<section id="como-funciona" className="py-16 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Como funciona</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto"></div>
    </div>

    <div className="grid md:grid-cols-3 gap-8 relative">
      {/* Connection line */}
      <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 -translate-y-1/2"></div>

      {[
        {
          step: "1",
          title: "Inspecione",
          description: "Execute checklists no app ou web, com fotos, geolocalização, evidências e assinatura. Funciona offline.",
          icon: <CheckCircle className="w-8 h-8" />
        },
        {
          step: "2",
          title: "Analise com IA",
          description: "Assistentes especializados verificam conformidade, identificam riscos e sugerem correções por NR.",
          icon: <Brain className="w-8 h-8" />
        },
        {
          step: "3",
          title: "Aja & acompanhe",
          description: "Planos 5W2H automáticos, alertas de prazo e dashboards de indicadores de segurança.",
          icon: <BarChart3 className="w-8 h-8" />
        }
      ].map((step, index) => (
        <div
          key={index}
          className="relative text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
              {step.step}
            </div>
          </div>

          <div className="mt-6">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-lg mb-4">
              {step.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
            <p className="text-gray-600">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

{/* Use Cases Carousel */ }
<section id="casos-uso" className="py-16 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Casos de uso</h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">SST por NR e além</p>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto mt-4"></div>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {useCases.map((useCase, index) => (
        <div
          key={index}
          className="group cursor-pointer"
        >
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 hover:border-transparent hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div className={`absolute inset-0 bg-gradient-to-br ${useCase.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

            <div className="p-6">
              <div className={`inline-flex items-center justify-center p-3 rounded-lg bg-gradient-to-br ${useCase.color} text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {useCase.icon}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {useCase.title}
              </h3>

              <p className="text-gray-600 text-sm">{useCase.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="text-center">
      <a href="/login" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
        Ver modelos por NR
        <ArrowRight className="ml-2 w-5 h-5" />
      </a>
    </div>
  </div>
</section>

{/* AI Assistants Spotlight */ }
<section className="py-16 bg-gradient-to-br from-blue-600 to-cyan-700 text-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <div className="mb-8">
      <img
        src="https://mocha-cdn.com/01990832-c49f-733d-bfcf-59bd1aee484d/icone-azul-marinho.svg"
        alt="COMPIA AI Icon"
        className="w-16 h-16 mx-auto mb-6 animate-pulse"
      />
      <h2 className="text-3xl md:text-4xl font-bold mb-4">IA que entende de SST</h2>
      <p className="text-xl text-blue-100 max-w-4xl mx-auto mb-8">
        Cada assistente domina uma norma específica — <strong>NR-12</strong> (máquinas), <strong>NR-35</strong> (altura), <strong>NR-17</strong> (ergonomia), <strong>NR-10</strong> (eletricidade) e mais. Receba orientações técnicas precisas e planos de ação fundamentados.
      </p>
      <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center mx-auto">
        <Play className="mr-2 w-5 h-5" />
        Ver demonstração da IA
      </button>
    </div>
  </div>
</section>

{/* Features */ }
<section id="recursos" className="py-16 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Recursos</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto"></div>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[
        "15+ Assistentes IA especializados: um para cada NR, com conhecimento técnico embutido",
        "Checklists por norma: NR-12, NR-35, NR-10, NR-17 e modelos técnicos pré-configurados",
        "Análises técnicas automáticas: identificação de riscos, não conformidades e recomendações",
        "Planos 5W2H integrados: geração automática a partir de achados, com SLA e notificações",
        "Relatórios & dashboards: por NR, unidade, criticidade e tendências",
        "Mobile offline: execute em campo sem internet, sincronize depois",
        "Biblioteca técnica: SQR-20/25, APR/AST, checklists CIPA e documentos obrigatórios",
        "Gestão de não conformidades: rastreamento completo até a resolução",
        "Integrações/APIs: exportações CSV/PDF, webhooks e conexão com BI/ERP"
      ].map((feature, index) => (
        <div
          key={index}
          className="flex items-start space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-all duration-300"
        >
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">{feature}</span>
        </div>
      ))}
    </div>

    <div className="text-center mt-12">
      <a href="/login" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
        Falar com especialista
        <ArrowRight className="ml-2 w-5 h-5" />
      </a>
    </div>
  </div>
</section>

{/* Metrics */ }
<section className="py-16 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid md:grid-cols-4 gap-8 text-center">
      {[
        { value: 70, prefix: "-", suffix: "%", label: "no tempo de elaboração de laudos técnicos" },
        { value: 45, prefix: "+", suffix: "%", label: "de não conformidades identificadas automaticamente" },
        { value: 60, prefix: "-", suffix: "%", label: "no tempo de resposta a fiscalizações" },
        { value: 500, prefix: "+", suffix: "", label: "análises técnicas realizadas/mês" }
      ].map((metric, index) => (
        <div key={index} className="p-6">
          <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">
            <Counter target={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
          </div>
          <p className="text-gray-600">{metric.label}</p>
        </div>
      ))}
    </div>

    <div className="text-center mt-12">
      <a href="/login" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
        Quero esses resultados
        <ArrowRight className="ml-2 w-5 h-5" />
      </a>
    </div>
  </div>
</section>

{/* Testimonials Carousel */ }
<section id="depoimentos" className="py-16 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Depoimentos</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto"></div>
    </div>

    <div className="relative max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
        <Quote className="w-12 h-12 text-blue-600 mb-6" />

        <blockquote className="text-xl md:text-2xl text-gray-700 mb-8 italic">
          "{testimonials[currentTestimonial].quote}"
        </blockquote>

        <div className="flex items-center">
          <img
            src={testimonials[currentTestimonial].avatar}
            alt={testimonials[currentTestimonial].author}
            className="w-16 h-16 rounded-full mr-4"
            loading="lazy"
          />
          <div>
            <div className="font-semibold text-gray-900">{testimonials[currentTestimonial].author}</div>
            <div className="text-gray-600">{testimonials[currentTestimonial].role}</div>
            <div className="text-blue-600">{testimonials[currentTestimonial].company}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center mt-6 space-x-2">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentTestimonial(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
              }`}
          />
        ))}
      </div>
    </div>

    <div className="text-center mt-12">
      <a href="/login" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
        Ver mais cases
        <ArrowRight className="ml-2 w-5 h-5" />
      </a>
    </div>
  </div>
</section>

{/* Security & Compliance */ }
<section className="py-16 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Segurança & Conformidade</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto"></div>
    </div>

    <div className="grid md:grid-cols-3 gap-8">
      {[
        {
          icon: <Lock className="w-12 h-12 text-blue-600" />,
          title: "Dados seguros",
          description: "Criptografia, controle de acesso e trilhas de auditoria completas."
        },
        {
          icon: <Shield className="w-12 h-12 text-green-600" />,
          title: "Conformidade técnica",
          description: "Relatórios e evidências alinhados à fiscalização trabalhista."
        },
        {
          icon: <Cloud className="w-12 h-12 text-purple-600" />,
          title: "Backup automático",
          description: "Documentos protegidos e rastreáveis."
        }
      ].map((item, index) => (
        <div key={index} className="text-center p-6">
          <div className="inline-flex items-center justify-center p-3 bg-gray-50 rounded-lg mb-4">
            {item.icon}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
          <p className="text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>

{/* Pricing */ }
<section id="precos" className="py-16 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Planos & Preços</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto"></div>
    </div>
    <div className="grid md:grid-cols-3 gap-8">
      {loadingPlans ? (
        <div className="col-span-3 text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando planos atualizados...</p>
        </div>
      ) : plans.map((plan, index) => (
        <div
          key={index}
          className={`relative p-8 rounded-xl ${plan.featured
            ? 'bg-blue-600 text-white shadow-xl scale-105'
            : 'bg-white border border-gray-200'
            }`}
        >
          {plan.featured && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-blue-900 px-4 py-1 rounded-full text-sm font-semibold">
                Mais Popular
              </span>
            </div>
          )}

          <h3 className={`text-2xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
            {plan.name}
          </h3>

          { /* Price Display */}
          <div className={`text-3xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
            {plan.price}
            {plan.price !== 'Sob consulta' && <span className="text-sm font-normal opacity-75">/mês</span>}
          </div>

          <p className={`mb-6 ${plan.featured ? 'text-blue-100' : 'text-gray-600'}`}>
            {plan.description}
          </p>

          <ul className="space-y-3 mb-8">
            {plan.features.map((feature: string, idx: number) => (
              <li key={idx} className="flex items-center">
                <CheckCircle className={`w-5 h-5 mr-3 ${plan.featured ? 'text-blue-200' : 'text-green-500'}`} />
                <span className={plan.featured ? 'text-blue-100' : 'text-gray-700'}>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              if (plan.slug === 'enterprise') {
                window.location.href = 'mailto:contato@compia.tech?subject=Interesse no Plano Enterprise';
              } else if (plan.slug === 'basic') {
                window.location.href = `/register?plan=${plan.slug}`;
              } else {
                // Paid plans go to new Checkout Flow
                window.location.href = `/checkout?plan=${plan.slug}`;
              }
            }}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${plan.featured
              ? 'bg-white text-blue-600 hover:bg-gray-100'
              : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
            {plan.slug === 'enterprise' ? 'Falar com vendas' : 'Começar agora'}
          </button>
        </div>
      ))}
    </div>

    <div className="text-center mt-12 space-x-4">
      <a href="/login" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
        Ver preços
      </a>
      <button className="inline-flex items-center border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300">
        Agendar demonstração
      </button>
    </div>
  </div>
</section>

{/* FAQ */ }
<section className="py-16 bg-white">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto"></div>
    </div>

    <div className="space-y-6">
      {[
        {
          question: "A COMPIA atende todas as NRs?",
          answer: "Sim. Temos assistentes especializados para as principais normas regulamentadoras."
        },
        {
          question: "Como a IA analisa conformidade?",
          answer: "Cada assistente foi treinado com conhecimento específico da norma, identificando riscos e sugerindo correções."
        },
        {
          question: "Posso personalizar checklists por empresa?",
          answer: "Totalmente: adapte modelos às suas atividades, riscos e procedimentos internos."
        },
        {
          question: "O sistema gera documentação para fiscalização?",
          answer: "Sim. Relatórios técnicos, evidências e trilhas atendem exigências da fiscalização trabalhista."
        },
        {
          question: "Como é o treinamento da equipe?",
          answer: "Onboarding técnico com especialistas, importação de checklists atuais e acompanhamento inicial."
        }
      ].map((faq, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
          <p className="text-gray-600">{faq.answer}</p>
        </div>
      ))}
    </div>
  </div>
</section>

{/* Final CTA */ }
<section className="py-16 bg-gradient-to-br from-blue-600 to-cyan-700 text-white text-center">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl md:text-4xl font-bold mb-4">
      Eleve sua gestão com Inteligência Artificial
    </h2>
    <p className="text-xl text-blue-100 mb-8">
      Menos papel. Mais técnica. <strong>Conformidade garantida.</strong>
    </p>

    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <a href="/login" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center">
        Teste grátis por 14 dias
        <ArrowRight className="ml-2 w-5 h-5" />
      </a>
      <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 flex items-center">
        <Play className="mr-2 w-5 h-5" />
        Agendar demonstração
      </button>
    </div>
  </div>
</section>

{/* Footer */ }
<footer className="bg-gray-900 text-white py-12">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid md:grid-cols-4 gap-8">
      <div className="col-span-2">
        <div className="flex items-center space-x-2 mb-4">
          <img
            src="https://mocha-cdn.com/01990832-c49f-733d-bfcf-59bd1aee484d/icone-azul-marinho.svg"
            alt="COMPIA Icon"
            className="h-8 w-8"
          />
          <span className="text-xl font-bold">COMPIA</span>
        </div>
        <p className="text-gray-400 mb-4 max-w-md">
          Plataforma inteligente para inspeções de segurança do trabalho com IA especializada por NR.
        </p>
        <div className="flex space-x-4">
          <Phone className="w-5 h-5 text-gray-400" />
          <Mail className="w-5 h-5 text-gray-400" />
          <MapPin className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-4">Produto</h4>
        <ul className="space-y-2 text-gray-400">
          <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
          <li><a href="#" className="hover:text-white transition-colors">API</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
        </ul>
      </div>

      <div>
        <h4 className="font-semibold mb-4">Empresa</h4>
        <ul className="space-y-2 text-gray-400">
          <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
        </ul>
      </div>
    </div>

    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
      <p>COMPIA © 2025. Todos os direitos reservados.</p>
    </div>
  </div>
</footer>
    </div >
  );
}
