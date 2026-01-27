import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Menu,
  X,
  Zap,
  Shield as ShieldIcon,
  Leaf,
  Building,
  Wrench,
  MapPin,
  ChevronRight,
  Calendar,
  History,
  FileAudio,
  BrainCircuit,
  Copy,
  Activity,
  Trees,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DynamicPricing from '@/react-app/components/landing/DynamicPricing';



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
      className={`transition - all duration - 1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className} `}
      style={{ transitionDelay: `${delay} ms` }}
    >
      {children}
    </div>
  );
};

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const sectors = [
    {
      id: 'agro',
      label: 'Agronegócio',
      title: 'Campo Conectado',
      description: 'Do plantio à colheita. Garanta a manutenção de maquinário e o controle fitossanitário mesmo sem internet.',
      features: ['Inspeção de Maquinário Agrícola', 'Monitoramento de Pragas (MIP)', 'Checklist de Safra e Plantio'],
      icon: <Leaf className="w-5 h-5" />,
      colorTheme: 'green'
    },
    {
      id: 'const',
      label: 'Construção',
      title: 'Canteiro Digital',
      description: 'Adeus papel e prancheta. Fichas de Verificação de Serviço (FVS) e Diários de Obra direto no celular.',
      features: ['Ficha de Verificação (FVS)', 'Diário de Obra (RDO)', 'Conformidade NR-18'],
      icon: <Building className="w-5 h-5" />,
      colorTheme: 'orange'
    },
    {
      id: 'ind',
      label: 'Indústria',
      title: 'Chão de Fábrica 4.0',
      description: 'Manutenção e operação integradas. Reduza paradas não programadas com inspeções preditivas.',
      features: ['Rondas de Manutenção', 'Auditoria de 5S', 'Permissão de Trabalho (PT)'],
      icon: <Wrench className="w-5 h-5" />,
      colorTheme: 'blue'
    },
    {
      id: 'sst',
      label: 'Segurança (SST)',
      title: 'Vida em Primeiro Lugar',
      description: 'Gestão completa de riscos e conformidade legal. Evite multas e proteja sua equipe.',
      features: ['Entrega Digital de EPIs', 'Inspeção de Extintores', 'Investigação de Acidentes'],
      icon: <ShieldIcon className="w-5 h-5" />,
      colorTheme: 'indigo'
    },
    {
      id: 'qual',
      label: 'Qualidade',
      title: 'Excelência Garantida',
      description: 'Padronize processos e garanta a qualidade final com auditorias rigorosas e rastreáveis.',
      features: ['Auditoria Interna ISO 9001', 'Relatórios de Não Conformidade', 'Inspeção de Recebimento'],
      icon: <CheckCircle2 className="w-5 h-5" />,
      colorTheme: 'emerald'
    },
    {
      id: 'env',
      label: 'Meio Ambiente',
      title: 'Sustentabilidade Real',
      description: 'Monitore impactos e garanta o cumprimento de condicionantes ambientais.',
      features: ['Gestão de Resíduos (MTR)', 'Auditoria Ambiental', 'Inspeção de Barragens'],
      icon: <Trees className="w-5 h-5" />,
      colorTheme: 'green'
    },
    {
      id: 'fac',
      label: 'Manutenção & Frota',
      title: 'Gestão de Ativos',
      description: 'Prolongue a vida útil dos seus equipamentos com planos de manutenção preventiva.',
      features: ['Manutenção de Ar (PMOC)', 'Checklist de Veículos', 'Inspeção Predial'],
      icon: <Truck className="w-5 h-5" />,
      colorTheme: 'blue'
    }
  ];

  const activeSectorData = sectors.find(s => s.id === activeSector) || sectors[0];

  const getColorClasses = (theme: string) => {
    const map: any = {
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', btn: 'bg-green-600', icon: 'text-green-600', light: 'bg-green-100' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', btn: 'bg-orange-600', icon: 'text-orange-600', light: 'bg-orange-100' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', btn: 'bg-blue-600', icon: 'text-blue-600', light: 'bg-blue-100' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', btn: 'bg-indigo-600', icon: 'text-indigo-600', light: 'bg-indigo-100' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', btn: 'bg-emerald-600', icon: 'text-emerald-600', light: 'bg-emerald-100' },
    };
    return map[theme] || map.blue;
  };

  const themeClasses = getColorClasses(activeSectorData.colorTheme);

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">

      {/* Navbar */}
      <nav className={`fixed w - full z - 50 transition - all duration - 300 ${scrolled ? 'bg-white/80 backdrop-blur-lg border-b border-slate-200/60 py-3' : 'bg-transparent py-5'} `}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="relative group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src="/compia_logo.png" alt="Compia" className="relative h-9 w-auto" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              COMPIA
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#recursos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Diferenciais</a>
            <a href="#setores" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Setores</a>
            <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Planos</a>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
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
              <a href="#recursos" className="text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>Diferenciais</a>
              <a href="#setores" className="text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>Setores</a>
              <a href="#planos" className="text-slate-600 font-medium" onClick={() => setIsMenuOpen(false)}>Planos</a>
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
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] -z-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent -z-10"></div>

        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[100px] -z-10"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-semibold mb-8 shadow-sm animate-fade-in hover:scale-105 transition-transform cursor-default">
              <Zap size={14} className="fill-yellow-400 text-yellow-500" />
              Nova Geração de Auditoria IA
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight mb-8 leading-[1.1] animate-slide-up">
              Garanta Conformidade Total. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">Em Tempo Real.</span>
            </h1>

            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up animation-delay-200 font-medium">
              A plataforma definitiva para auditorias de alta complexidade. Gere evidências irrefutáveis com <strong>GPS Atômico</strong> e elimine 100% do retrabalho administrativo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up animation-delay-300">
              <button
                onClick={() => navigate('/auth/signup')}
                className="w-full sm:w-auto px-8 py-4 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-all hover:-translate-y-1 shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 group ring-4 ring-blue-500/10"
              >
                Começar Auditoria Grátis
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all hover:border-slate-300 shadow-sm hover:shadow-md"
              >
                Já sou cliente
              </button>
            </div>

            {/* Trust Badges - Authority Injection */}
            <div className="mt-12 pt-8 border-t border-slate-200/60 animate-fade-in animation-delay-500">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">SEGURANÇA E CONFORMIDADE</p>
              <div className="flex justify-center items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="flex items-center gap-2">
                  <ShieldIcon className="w-5 h-5 text-slate-600" />
                  <span className="font-bold text-slate-600 text-sm">LGPD Ready</span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-slate-600" />
                  <span className="font-bold text-slate-600 text-sm">ISO 27001</span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-slate-600" />
                  <span className="font-bold text-slate-600 text-sm">SLA 99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Capabilities - Comprehensive Grid */}
      <section id="recursos" className="py-24 relative bg-white">
        <div className="container mx-auto px-6">
          <RevealOnScroll className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Tudo o que você precisa</h2>
            <p className="text-lg text-slate-600">Uma suíte completa de ferramentas para digitalizar sua operação.</p>
          </RevealOnScroll>

          <RevealOnScroll className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'IA Generativa',
                desc: 'Crie checklists completos em segundos. Basta dizer o que precisa.',
                icon: <BrainCircuit className="w-6 h-6 text-purple-600" />,
                bg: 'bg-purple-50'
              },
              {
                title: 'Importação Inteligente',
                desc: 'Copie e cole seus procedimentos em papel e o sistema cria o formulário.',
                icon: <Copy className="w-6 h-6 text-blue-600" />,
                bg: 'bg-blue-50'
              },
              {
                title: 'Análise Multimodal',
                desc: 'Audite com voz, fotos e arquivos. A IA vê e ouve tudo para gerar insights.',
                icon: <FileAudio className="w-6 h-6 text-pink-600" />,
                bg: 'bg-pink-50'
              },
              {
                title: 'Planos de Ação 5W2H',
                desc: 'Gere planos de correção automáticos e detalhados a partir das não-conformidades.',
                icon: <Zap className="w-6 h-6 text-yellow-600" />,
                bg: 'bg-yellow-50'
              },
              {
                title: 'Agenda Inteligente',
                desc: 'Programe inspeções recorrentes e delegue tarefas para outros técnicos.',
                icon: <Calendar className="w-6 h-6 text-indigo-600" />,
                bg: 'bg-indigo-50'
              },
              {
                title: 'GPS Atômico',
                desc: 'Prova de presença imutável em cada checklist. Adeus fraudes.',
                icon: <MapPin className="w-6 h-6 text-emerald-600" />,
                bg: 'bg-emerald-50'
              },
              {
                title: 'Logs de Auditoria',
                desc: 'Rastreabilidade total. Saiba quem fez, quando e onde, com histórico imutável.',
                icon: <History className="w-6 h-6 text-slate-600" />,
                bg: 'bg-slate-50'
              },
              {
                title: 'Dashboards Vivos',
                desc: 'Acompanhe indicadores em tempo real. Da operação à diretoria.',
                icon: <Activity className="w-6 h-6 text-orange-600" />,
                bg: 'bg-orange-50'
              }
            ].map((feat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group">
                <div className={`w-12 h-12 ${feat.bg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Multi-Industry Sectors (Interactive Mockup) */}
      <section id="setores" className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <RevealOnScroll className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Um Sistema, Múltiplos Mundos</h2>
            <p className="text-lg text-slate-500 font-medium">O Compia fala a língua do seu problema.</p>
          </RevealOnScroll>

          <RevealOnScroll delay={100}>
            <div className="flex justify-center flex-wrap gap-2 mb-12">
              {sectors.map((sector) => (
                <button
                  key={sector.id}
                  onClick={() => setActiveSector(sector.id)}
                  className={`px - 5 py - 2.5 rounded - full text - sm font - semibold transition - all duration - 300 border ${activeSector === sector.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    } `}
                >
                  {sector.label}
                </button>
              ))}
            </div>

            <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="grid md:grid-cols-2">
                {/* Content Side */}
                <div className={`p - 10 md: p - 14 flex flex - col justify - center ${themeClasses.bg} relative overflow - hidden`}>
                  <h3 className={`text - 3xl font - bold ${themeClasses.text} mb - 4 relative z - 10`}>{activeSectorData.title}</h3>
                  <p className="text-slate-600 mb-8 relative z-10 leading-relaxed font-medium">{activeSectorData.description}</p>
                  <ul className="space-y-4 relative z-10">
                    {activeSectorData.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                        <div className={`p - 1 rounded - full bg - white / 50 ${themeClasses.text} `}>
                          <CheckCircle2 size={16} />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  {/* Decor */}
                  <div className={`absolute - bottom - 20 - right - 20 w - 64 h - 64 ${themeClasses.light} rounded - full blur - 3xl opacity - 50`}></div>
                </div>

                {/* Mockup Side (CSS Pure UI) */}
                <div className="bg-slate-50 p-10 md:p-14 flex items-center justify-center relative border-l border-slate-100">
                  {/* Background Grid Pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(#00000005_1px,transparent_1px),linear-gradient(90deg,#00000005_1px,transparent_1px)] bg-[size:16px_16px]"></div>

                  {/* Abstract UI Card */}
                  <div className="w-64 bg-white rounded-xl shadow-lg border border-slate-200 relative z-10 overflow-hidden transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                    {/* Header */}
                    <div className="h-4 bg-slate-100 border-b border-slate-100 flex items-center px-3 gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    </div>
                    {/* Body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w - 8 h - 8 rounded - lg ${themeClasses.light} flex items - center justify - center ${themeClasses.text} `}>
                          {activeSectorData.icon}
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-20 bg-slate-200 rounded"></div>
                          <div className="h-1.5 w-12 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                      {/* Fake Content Lines */}
                      <div className="h-2 w-full bg-slate-100 rounded"></div>
                      <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                      <div className="h-2 w-5/6 bg-slate-100 rounded"></div>

                      {/* Action Button */}
                      <div className={`mt - 4 h - 8 w - full rounded - md ${themeClasses.btn} opacity - 90`}></div>
                    </div>
                  </div>

                  {/* Floating Element */}
                  <div className="absolute top-20 right-10 bg-white p-3 rounded-lg shadow-lg border border-slate-100 animate-bounce delay-700 z-20">
                    <CheckCircle2 className={`${themeClasses.text} w - 5 h - 5`} />
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* How It Works - Simplified Grid */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20"></div>
        <div className="container mx-auto px-6 relative z-10">
          <RevealOnScroll className="max-w-3xl mx-auto mb-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Fluxo de Trabalho Contínuo</h2>
            <div className="h-1 w-20 bg-blue-500 mx-auto rounded-full"></div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-4 gap-12 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-[20px] left-0 w-full h-0.5 bg-slate-800 -z-10"></div>

            {[
              { step: "01", title: "Colete", desc: "App offline, fotos e áudio." },
              { step: "02", title: "Processe", desc: "IA analisa e estrutura dados." },
              { step: "03", title: "Relate", desc: "PDFs automáticos." },
              { step: "04", title: "Gerencie", desc: "Dashboards e planos." }
            ].map((item, idx) => (
              <RevealOnScroll key={idx} delay={idx * 100} className="relative group text-center">
                <div className="w-10 h-10 mx-auto bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center font-bold text-sm mb-6 group-hover:border-blue-500 group-hover:bg-blue-600 transition-all duration-300 relative z-10">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section (Dynamic) */}
      <DynamicPricing />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/compia_logo.png" alt="Compia" className="h-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-300" />
              <span className="font-bold text-slate-400 text-sm">© 2026 Compia Inc.</span>
            </div>

            <div className="flex gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-indigo-600 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Termos</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
