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
  FileAudio,
  BrainCircuit,
  Copy,
  Activity,
  Trees,
  Truck,
  ArrowRight,
  Cloud,
  Smartphone,
  Mic,
  FileText,
  WifiOff,
  Bot,
  AlertCircle,
  XCircle,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/react-app/context/AuthContext';
import DynamicPricing from '@/react-app/components/landing/DynamicPricing';

/* --- Components --- */

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

/* --- Main Page --- */

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth(); // Add auth check
  const [activeSector, setActiveSector] = useState('agro');

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
      features: ['Inspeção de Maquinário', 'Monitoramento MIP', 'Checklist de Safra'],
      icon: <Leaf className="w-5 h-5" />,
      colorTheme: 'green'
    },
    {
      id: 'const',
      label: 'Construção',
      title: 'Canteiro Digital',
      description: 'Adeus papel. Fichas de Verificação de Serviço (FVS) e Diários de Obra direto no celular do engenheiro.',
      features: ['FVS Digital', 'Diário de Obra', 'Conformidade NR-18'],
      icon: <Building className="w-5 h-5" />,
      colorTheme: 'orange'
    },
    {
      id: 'ind',
      label: 'Indústria',
      title: 'Indústria 4.0',
      description: 'Manutenção preditiva e corretiva integrada. Reduza o downtime com inspeções inteligentes.',
      features: ['Rondas de Manutenção', 'Auditoria 5S', 'Permissão de Trabalho'],
      icon: <Wrench className="w-5 h-5" />,
      colorTheme: 'blue'
    },
    {
      id: 'sst',
      label: 'Segurança',
      title: 'Vida em Primeiro Lugar',
      description: 'Gestão de riscos e conformidade legal. Proteja sua equipe e evite multas trabalhistas.',
      features: ['Gestão de EPIs', 'Inspeção de Extintores', 'Análise de Riscos'],
      icon: <ShieldIcon className="w-5 h-5" />,
      colorTheme: 'indigo'
    },
    {
      id: 'qual',
      label: 'Qualidade',
      title: 'Excelência Garantida',
      description: 'Padronize processos e garanta a qualidade final com auditorias rigorosas e rastreáveis.',
      features: ['ISO 9001', 'Não Conformidades', 'Recebimento de Materiais'],
      icon: <CheckCircle2 className="w-5 h-5" />,
      colorTheme: 'emerald'
    },
    {
      id: 'env',
      label: 'Meio Ambiente',
      title: 'Sustentabilidade ESG',
      description: 'Monitore impactos e garanta o cumprimento de condicionantes ambientais com auditorias digitais.',
      features: ['Gestão de Resíduos', 'Licenciamento', 'Barragens'],
      icon: <Trees className="w-5 h-5" />,
      colorTheme: 'green'
    },
    {
      id: 'fac',
      label: 'Frota',
      title: 'Gestão de Ativos',
      description: 'Controle quilometragem, manutenção e estado de conservação da sua frota em tempo real.',
      features: ['Checklist Veicular', 'Manutenção Preventiva', 'Controle de Pneus'],
      icon: <Truck className="w-5 h-5" />,
      colorTheme: 'blue'
    }
  ];

  const activeSectorData = sectors.find(s => s.id === activeSector) || sectors[0];

  const themeClasses: any = {
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', btn: 'bg-green-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', btn: 'bg-orange-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', btn: 'bg-blue-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', btn: 'bg-indigo-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', btn: 'bg-emerald-600' },
  }[activeSectorData.colorTheme] || { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', btn: 'bg-blue-600' };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 antialiased">

      {/* --- Navbar --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 lg:px-12 flex justify-between items-center">

          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative">
              {/* Increased Logo Size */}
              <img src="/compia_logo.png" alt="Compia" className="h-10 md:h-12 w-auto relative z-10 transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>
            {/* Increased Text Size */}
            <span className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">COMPIA</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-10">
            <a href="#recursos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Diferenciais</a>
            <a href="#setores" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Setores</a>
            <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Planos</a>

            <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('planos');
                  if (element) {
                    const headerOffset = 120;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({
                      top: offsetPosition,
                      behavior: "smooth"
                    });
                  }
                }}
                className="px-6 py-3 text-base font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all shadow-md shadow-slate-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                Começar Agora
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-xl animate-fade-in p-6 z-40">
            <div className="flex flex-col gap-4">
              <a href="#recursos" className="text-lg font-medium text-slate-700" onClick={() => setIsMenuOpen(false)}>Diferenciais</a>
              <a href="#setores" className="text-lg font-medium text-slate-700" onClick={() => setIsMenuOpen(false)}>Setores</a>
              <a href="#planos" className="text-lg font-medium text-slate-700" onClick={() => setIsMenuOpen(false)}>Planos</a>
              <hr className="border-slate-100 my-2" />
              <button onClick={() => navigate('/login')} className="w-full py-3 text-slate-700 font-semibold border border-slate-200 rounded-lg">Entrar</button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  const element = document.getElementById('planos');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-3 text-white bg-blue-600 font-bold rounded-lg"
              >
                Começar Agora
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-40 pb-24 lg:pt-52 lg:pb-40 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 inset-x-0 h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white -z-20"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[120px] -z-10"></div>

        <div className="container mx-auto px-6 lg:px-12 relative z-10 text-center">

          {/* Removed Badge "Nova Geração 2.0" as requested */}

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-slate-900 tracking-tight mb-8 leading-tight animate-slide-up max-w-5xl mx-auto mt-12">
            O fim do relatório <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">digitado no escritório.</span>
          </h1>

          {/* Subhead - Removed "Enterprise" word */}
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up animation-delay-200">
            Fale o que você vê na obra e deixe nossa IA escrever o relatório técnico, formatar fotos e garantir a conformidade jurídica com GPS Atômico.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up animation-delay-300">
            <button
              onClick={() => {
                const element = document.getElementById('planos');
                if (element) {
                  const headerOffset = 120;
                  const elementPosition = element.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                  });
                }
              }}
              className="w-full sm:w-auto px-12 py-5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all hover:-translate-y-1 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 text-lg"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('como-funciona');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full sm:w-auto px-8 py-5 bg-white text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all border border-slate-200 flex items-center justify-center gap-2 text-lg"
            >
              Ver como funciona
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Feature Badges - Substitui Trust Badges fake */}
          <div className="mt-16 pt-8 animate-fade-in animation-delay-500">
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium">100% em Nuvem</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <WifiOff className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">Funciona Offline</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium">IA Integrada</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Smartphone className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-medium">iOS & Android</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Como Funciona --- */}
      <section id="como-funciona" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50/30 via-transparent to-transparent -z-10"></div>

        <div className="container mx-auto px-6 lg:px-12">
          <RevealOnScroll className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Simples como deve ser
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Em 3 passos você sai do campo com o relatório pronto
            </p>
          </RevealOnScroll>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <RevealOnScroll delay={0}>
              <div className="relative text-center group">
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-slate-200 to-slate-100 z-0"></div>
                <div className="relative z-10 mb-6">
                  <div className="w-32 h-32 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 border border-blue-100">
                    <Smartphone className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Abra o Checklist</h3>
                <p className="text-slate-600 leading-relaxed">Escolha o formulário ou crie um com IA em segundos. Funciona mesmo sem internet.</p>
              </div>
            </RevealOnScroll>

            {/* Step 2 */}
            <RevealOnScroll delay={100}>
              <div className="relative text-center group">
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-slate-200 to-slate-100 z-0"></div>
                <div className="relative z-10 mb-6">
                  <div className="w-32 h-32 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 border border-purple-100">
                    <Mic className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Fale o que Vê</h3>
                <p className="text-slate-600 leading-relaxed">Dite suas observações. A IA transcreve, interpreta e preenche os campos automaticamente.</p>
              </div>
            </RevealOnScroll>

            {/* Step 3 */}
            <RevealOnScroll delay={200}>
              <div className="relative text-center group">
                <div className="relative z-10 mb-6">
                  <div className="w-32 h-32 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 border border-emerald-100">
                    <FileText className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Receba o PDF</h3>
                <p className="text-slate-600 leading-relaxed">Relatório técnico formatado com fotos, GPS e assinatura digital. Pronto para enviar.</p>
              </div>
            </RevealOnScroll>
          </div>

          {/* CTA after steps */}
          <RevealOnScroll className="text-center mt-16">
            <button
              onClick={() => {
                const element = document.getElementById('planos');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all hover:-translate-y-1 shadow-lg inline-flex items-center gap-2"
            >
              Experimente Agora
              <ArrowRight className="w-5 h-5" />
            </button>
          </RevealOnScroll>
        </div>
      </section>

      {/* --- Features Grid --- */}
      <section id="recursos" className="py-32 bg-slate-50 relative">
        <div className="container mx-auto px-6 lg:px-12">
          <RevealOnScroll className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">O Sistema Operacional da Qualidade</h2>
            <p className="text-xl text-slate-600">Tudo o que você precisa para digitalizar, monitorar e comprovar a qualidade da sua operação.</p>
          </RevealOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Ata de Inspeção por Voz', desc: 'Descreva os riscos falando. A IA transcreve, interpreta e preenche o checklist técnico automaticamente.', icon: <BrainCircuit />, color: 'text-purple-600', bg: 'bg-purple-50' },
              { title: 'Importação PDF Legado', desc: 'Digitalize procedimentos antigos. Cole seu PDF e transforme em formulário digital vivo em segundos.', icon: <Copy />, color: 'text-blue-600', bg: 'bg-blue-50' },
              { title: 'Modo Mãos Livres', desc: 'Auditoria segura. Mantenha as mãos livres para subir em escadas ou manusear equipamentos enquanto dita.', icon: <FileAudio />, color: 'text-pink-600', bg: 'bg-pink-50' },
              { title: 'Planos de Ação', desc: 'Identificou um risco? O plano de correção com prazos e responsáveis é gerado na hora.', icon: <Zap />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { title: 'GPS Atômico', desc: 'Prova de presença irrefutável. Logs georreferenciados garantem que o inspetor esteve no local exato.', icon: <MapPin />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { title: 'Mapas de Calor', desc: 'Não veja apenas tabelas. Veja manchas de risco na planta da sua fábrica ou fazenda.', icon: <Activity />, color: 'text-orange-600', bg: 'bg-orange-50' }
            ].map((feature, i) => (
              <RevealOnScroll key={i} delay={i * 50}>
                <div className="bg-white p-8 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all duration-300 group h-full">
                  <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    {React.cloneElement(feature.icon as React.ReactElement, { size: 28 })}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* --- Industries Tabs --- */}
      <section id="setores" className="py-32 bg-white overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Um Sistema, Múltiplos Usos</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Não importa o setor, o Compia se adapta aos seus processos críticos.</p>
          </div>

          {/* Industry Toggle */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {sectors.map((sector) => (
              <button
                key={sector.id}
                onClick={() => setActiveSector(sector.id)}
                className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 border ${activeSector === sector.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                {sector.label}
              </button>
            ))}
          </div>

          {/* Active Content Card */}
          <RevealOnScroll className="max-w-6xl mx-auto bg-slate-50 rounded-[2.5rem] p-4 md:p-6 border border-slate-200">
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 grid md:grid-cols-2">

              {/* Text Content */}
              <div className={`p-10 md:p-16 flex flex-col justify-center ${themeClasses.bg}`}>
                <div className={`inline-flex items-center gap-2 self-start px-3 py-1 bg-white rounded-lg border border-slate-100 shadow-sm text-xs font-bold uppercase mb-6 ${themeClasses.text}`}>
                  {activeSectorData.icon}
                  {activeSectorData.label}
                </div>
                <h3 className={`text-4xl font-bold text-slate-900 mb-6`}>{activeSectorData.title}</h3>
                <p className="text-slate-600 text-lg mb-10 leading-relaxed font-medium">{activeSectorData.description}</p>

                <ul className="space-y-4">
                  {activeSectorData.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-4">
                      <div className={`p-1.5 rounded-full bg-white ${themeClasses.text} shadow-sm`}>
                        <CheckCircle2 size={18} />
                      </div>
                      <span className="text-slate-800 font-semibold">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup Area - Checklist Real */}
              <div className="bg-slate-100 p-6 md:p-10 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                {/* Realistic Checklist Card */}
                <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 relative z-10 overflow-hidden hover:shadow-3xl transition-shadow duration-500">
                  {/* Header */}
                  <div className={`${themeClasses.bg} px-5 py-4 border-b ${themeClasses.border}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${themeClasses.text} shadow-sm`}>
                        {activeSectorData.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{activeSectorData.features[0]}</h4>
                        <p className="text-xs text-slate-500">Em andamento...</p>
                      </div>
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700">Documentação verificada</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700">Equipamentos OK</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700">Sinalização: verificar</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700">EPI incompleto</span>
                    </div>
                  </div>

                  {/* Footer Progress */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>Progresso</span>
                      <span className="font-semibold text-slate-700">50%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full w-1/2 ${themeClasses.btn} rounded-full`}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* --- Dynamic Pricing Section --- */}
      <div id="planos" className="bg-slate-50">
        <DynamicPricing />
      </div>

      {/* --- Footer --- */}
      <footer className="bg-slate-900 text-white pt-16 pb-8">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/compia_logo.png" alt="Compia" className="h-8 w-auto brightness-0 invert" />
                <span className="font-bold text-xl">COMPIA</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Gestão de conformidade e auditoria digital. Transforme inspeções em relatórios profissionais com IA.
              </p>

              {/* Contact CTA */}
              <a
                href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o Compia"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Fale Conosco no WhatsApp
              </a>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="font-bold text-white mb-4">Navegação</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#setores" className="hover:text-white transition-colors">Setores</a></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Planos e Preços</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-4">Contato</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <a href="mailto:contato@compia.tech" className="hover:text-white transition-colors">
                    contato@compia.tech
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/5511999999999"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    WhatsApp: (11) 99999-9999
                  </a>
                </li>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500">
                  Seus dados estão seguros. Utilizamos criptografia de ponta a ponta e seguimos as diretrizes da LGPD.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs">© 2026 Compia. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4 text-slate-500 text-xs">
              <span>Feito com dedicação no Brasil</span>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o Compia"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110"
        title="Fale conosco no WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>

    </div>
  );
}
