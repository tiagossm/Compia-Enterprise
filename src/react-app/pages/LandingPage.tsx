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

interface CounterProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

const Counter: React.FC<CounterProps> = ({ target, duration = 2000, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      setCount(Math.floor(progress * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return <span>{prefix}{count}{suffix}</span>;
};

const testimonials = [
  {
    quote: "Os assistentes IA identificaram riscos que passavam despercebidos nas inspeções manuais.",
    author: "Carlos Silva",
    role: "Eng. de Segurança",
    company: "Industrial Metalúrgica",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    quote: "Reduzimos 70% do tempo para gerar relatórios técnicos de NR-12.",
    author: "Ana Santos",
    role: "Téc. de Segurança",
    company: "Construtora Nacional",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b814?w=150&h=150&fit=crop&crop=face"
  },
  {
    quote: "A conformidade com as NRs ficou mais precisa e documentada.",
    author: "Roberto Lima",
    role: "Coordenador de SST",
    company: "Petroquímica Brasil",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  }
];

const useCases = [
  {
    title: "NR-12 – Máquinas e Equipamentos",
    description: "Proteções, dispositivos de segurança e análises especializadas.",
    icon: <Wrench className="w-8 h-8" />,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "NR-35 – Trabalho em Altura",
    description: "AR, PT, verificações de EPIs/EPCs.",
    icon: <Building className="w-8 h-8" />,
    color: "from-purple-500 to-pink-500"
  },
  {
    title: "NR-17 – Ergonomia",
    description: "AET automatizada com recomendações específicas.",
    icon: <Heart className="w-8 h-8" />,
    color: "from-green-500 to-teal-500"
  },
  {
    title: "NR-10 – Eletricidade",
    description: "Prontuários, análises de risco e procedimentos.",
    icon: <Zap className="w-8 h-8" />,
    color: "from-yellow-500 to-orange-500"
  },
  {
    title: "Qualidade & Compliance",
    description: "Auditorias ISO 9001, não conformidades e rastreabilidade.",
    icon: <Award className="w-8 h-8" />,
    color: "from-indigo-500 to-purple-500"
  },
  {
    title: "Meio Ambiente",
    description: "ISO 14001, resíduos e evidências de compliance ambiental.",
    icon: <Leaf className="w-8 h-8" />,
    color: "from-emerald-500 to-green-500"
  }
];

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img
                src="https://mocha-cdn.com/01990832-c49f-733d-bfcf-59bd1aee484d/logo_preto_ico_azulclaro.svg"
                alt="COMPIA Logo"
                className="h-28 w-28"
                style={{ height: '113px', width: '113px' }}
                fetchPriority="high"
              />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('produto')} className="text-gray-700 hover:text-blue-600 transition-colors">Produto</button>
              <button onClick={() => scrollToSection('como-funciona')} className="text-gray-700 hover:text-blue-600 transition-colors">Como funciona</button>
              <button onClick={() => scrollToSection('casos-uso')} className="text-gray-700 hover:text-blue-600 transition-colors">Casos de uso</button>
              <button onClick={() => scrollToSection('recursos')} className="text-gray-700 hover:text-blue-600 transition-colors">Recursos</button>
              <button onClick={() => scrollToSection('depoimentos')} className="text-gray-700 hover:text-blue-600 transition-colors">Depoimentos</button>
              <button onClick={() => scrollToSection('precos')} className="text-gray-700 hover:text-blue-600 transition-colors">Preços</button>
              <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
                Teste grátis
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-100 py-4">
              <div className="flex flex-col space-y-4">
                <button onClick={() => scrollToSection('produto')} className="text-gray-700 text-left px-4 py-2">Produto</button>
                <button onClick={() => scrollToSection('como-funciona')} className="text-gray-700 text-left px-4 py-2">Como funciona</button>
                <button onClick={() => scrollToSection('casos-uso')} className="text-gray-700 text-left px-4 py-2">Casos de uso</button>
                <button onClick={() => scrollToSection('recursos')} className="text-gray-700 text-left px-4 py-2">Recursos</button>
                <button onClick={() => scrollToSection('depoimentos')} className="text-gray-700 text-left px-4 py-2">Depoimentos</button>
                <button onClick={() => scrollToSection('precos')} className="text-gray-700 text-left px-4 py-2">Preços</button>
                <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg mx-4">Teste grátis</a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Inspeções inteligentes<br />
                para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">qualquer área</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-700 mb-4 max-w-4xl mx-auto">
                Digitalize, padronize e analise inspeções e checklists em minutos — com colaboração em tempo real, <strong>Assistentes IA por NR</strong> e insights automáticos.
              </p>

              <p className="text-lg text-gray-600 mb-8 max-w-4xl mx-auto">
                <strong>Inteligência Artificial em Segurança do Trabalho</strong>: analise conformidade com NRs e gere planos de ação automaticamente — sem perder a versatilidade para Qualidade, Meio Ambiente e Operações.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <a href="/login" className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 flex items-center group">
                  Teste grátis por 14 dias
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <button className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all duration-300 flex items-center group">
                  <Play className="mr-2 w-5 h-5" />
                  Agendar demonstração
                </button>
              </div>

              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-2">4,9/5 por profissionais</span>
                </div>
                <div className="hidden sm:block">•</div>
                <div>+<Counter target={1000} />+ inspeções executadas</div>
                <div className="hidden sm:block">•</div>
                <div>Dados e conformidade garantidos</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="produto" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Brain className="w-12 h-12 text-blue-600" />,
                title: "Assistentes IA especializados por NR",
                description: "Análises técnicas específicas para NR-12, NR-35, NR-10, NR-17 e demais normas regulamentadoras."
              },
              {
                icon: <Target className="w-12 h-12 text-green-600" />,
                title: "Do checklist ao plano 5W2H",
                description: "Identifique não conformidades e gere automaticamente planos com responsáveis, prazos e SLA."
              },
              {
                icon: <Shield className="w-12 h-12 text-purple-600" />,
                title: "Compliance em tempo real",
                description: "Execute inspeções em campo (online/offline), analise riscos com IA e mantenha conformidade contínua."
              },
              {
                icon: <FileText className="w-12 h-12 text-orange-600" />,
                title: "Relatórios técnicos automáticos",
                description: "Laudos, AET (NR-17), análises e documentação técnica gerados por assistentes virtuais."
              }
            ].map((benefit, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 group"
              >
                <div className="inline-flex items-center justify-center p-3 bg-white rounded-lg shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a href="/login" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
              Experimente agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* How it Works */}
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

      {/* Use Cases Carousel */}
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

      {/* AI Assistants Spotlight */}
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

      {/* Features */}
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

      {/* Metrics */}
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

      {/* Testimonials Carousel */}
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

      {/* Security & Compliance */}
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

      {/* Pricing */}
      <section id="precos" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Planos & Preços</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Técnico",
                description: "Para profissionais iniciando a digitalização",
                features: ["Até 10 inspeções/mês", "2 assistentes IA", "Relatórios básicos", "Suporte por email"]
              },
              {
                name: "Empresa",
                description: "Assistentes IA, análises avançadas e múltiplas unidades",
                features: ["Inspeções ilimitadas", "Todos os assistentes IA", "Dashboards avançados", "Múltiplas unidades", "Suporte prioritário"],
                featured: true
              },
              {
                name: "Corporativo",
                description: "Customizações, integrações e suporte técnico dedicado",
                features: ["Tudo do Empresa", "Customizações", "Integrações API", "Suporte dedicado", "Treinamento especializado"]
              }
            ].map((plan, index) => (
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
                <p className={`mb-6 ${plan.featured ? 'text-blue-100' : 'text-gray-600'}`}>
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckCircle className={`w-5 h-5 mr-3 ${plan.featured ? 'text-blue-200' : 'text-green-500'}`} />
                      <span className={plan.featured ? 'text-blue-100' : 'text-gray-700'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${plan.featured
                    ? 'bg-white text-blue-600 hover:bg-gray-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {index === 2 ? 'Falar com vendas' : 'Começar teste grátis'}
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

      {/* FAQ */}
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

      {/* Final CTA */}
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

      {/* Footer */}
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
    </div>
  );
}
