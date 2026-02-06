import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, CheckCircle2, Briefcase, Eye, EyeOff } from 'lucide-react';

export default function Register() {

    const [searchParams] = useSearchParams();
    const planParam = searchParams.get('plan');

    // Treat 'basic' and 'free' as free plans. Anything else (pro, starter, enterprise) is PAID.
    const isPaidPlan = planParam && planParam !== 'basic' && planParam !== 'free';
    const selectedPlan = isPaidPlan ? (planParam || 'pro') : 'basic';

    // Auto-redirect to new Checkout Flow if Paid Plan
    useEffect(() => {
        if (isPaidPlan) {
            window.location.href = `/checkout?plan=${planParam}`;
        }
    }, [isPaidPlan, planParam]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        organizationName: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    // Lógica simples de força de senha
    const calculateStrength = (pass: string) => {
        let strength = 0;
        if (pass.length >= 6) strength += 1;
        if (pass.length >= 10) strength += 1;
        if (/[A-Z]/.test(pass)) strength += 1;
        if (/[0-9]/.test(pass)) strength += 1;
        if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
        return strength;
    };

    const passwordStrength = calculateStrength(formData.password);

    const getStrengthColor = (score: number) => {
        if (score === 0) return 'bg-slate-200';
        if (score < 3) return 'bg-red-500';
        if (score < 4) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStrengthLabel = (score: number) => {
        if (score === 0) return '';
        if (score < 3) return 'Fraca';
        if (score < 4) return 'Média';
        return 'Forte';
    };

    const validateForm = () => {
        if (!formData.name || !formData.email || !formData.password || !formData.organizationName) {
            setError('Por favor, preencha todos os campos obrigatórios.');
            return false;
        }
        if (formData.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem.');
            return false;
        }
        if (!acceptedTerms) {
            setError('Você precisa aceitar os Termos e Política de Privacidade.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const role = 'org_admin';

            const response = await fetchWithAuth('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    organization_name: formData.organizationName,
                    role: role,
                    subscription_plan: selectedPlan
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);

                // If Paid Plan -> Redirect to Billing / Checkout
                // If Free Plan -> Redirect to Login

                if (isPaidPlan) {
                    // Since we auto-login now, redirect directly to billing!
                    setSuccess(true);
                    setTimeout(() => {
                        window.location.href = '/billing?message=complete_payment';
                    }, 2000);
                } else {
                    setSuccess(true);
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 5000);
                }
            } else {
                if (response.status === 409) {
                    setError('Este email já está cadastrado. Tente fazer login.');
                } else {
                    setError(data.error || 'Erro ao criar conta. Tente novamente.');
                }
            }
        } catch (err) {
            console.error('Erro no registro:', err);
            setError('Erro de conexão. Verifique sua internet.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-3xl sm:px-10 text-center border border-slate-50">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6 animate-in zoom-in duration-300">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#303C60] mb-4 leading-snug">
                            {isPaidPlan ? 'Redirecionando para Pagamento...' : 'Solicitação Enviada!'}
                        </h2>
                        <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
                            <p className="text-slate-600 text-sm leading-relaxed text-center">
                                {isPaidPlan
                                    ? "Sua conta foi criada. Você será redirecionado para concluir a assinatura do seu plano."
                                    : "Um administrador do sistema revisará seus dados (Plano Essencial). Você receberá um e-mail quando aprovado."
                                }
                            </p>
                        </div>
                        <div className="animate-pulse text-indigo-600 font-medium">
                            Redirecionando em instantes...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F7FA] font-sans p-4">
            {/* CARD DE REGISTER HORIZONTAL */}
            <div className="w-full md:w-auto md:max-w-[95vw] bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row shadow-slate-200/50">

                {/* LADO ESQUERDO: Vitrine Estratégica matches Login */}
                <div className="w-full md:w-[600px] bg-[#0F172A] flex flex-col items-center justify-between p-8 md:p-12 text-center md:text-left relative overflow-hidden shrink-0">

                    {/* Background Decorations (Subtle Technical Mesh) */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.15)_1px,_transparent_0)] bg-[length:24px_24px]"></div>
                    <div className="absolute w-[500px] h-[500px] bg-[#0EA5E9]/10 rounded-full blur-3xl -top-32 -left-32 animate-pulse"></div>

                    <div className="relative z-10 w-full flex flex-col h-full justify-center max-w-[400px]">
                        {/* Conteúdo Centralizado como Bloco Único */}
                        <div className="flex flex-col gap-8 md:gap-10">
                            {/* Header: Logo */}
                            <div>
                                <img
                                    src="/COMPIA_BRAND_KIT/png/2x/compia-logo-mono-white.png"
                                    alt="Compia Logo"
                                    className="w-48 md:w-64 h-auto object-contain mb-2 opacity-90 text-left md:ml-0 mx-auto"
                                />
                            </div>

                            {/* Main Content */}
                            <div className="space-y-3 md:space-y-4">
                                <h2 className="text-2xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                                    Painel <br />
                                    <span className="text-primary-light">Corporativo</span>
                                </h2>
                                <p className="text-slate-400 text-lg leading-relaxed">
                                    Crie sua conta para gerenciar auditorias e inspeções.
                                </p>
                            </div>

                            {/* Plan Badge */}
                            {(selectedPlan.includes('pro') || selectedPlan.includes('business')) && (
                                <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 p-3 rounded-xl mx-auto md:mx-0">
                                    <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
                                    <span className="text-white font-medium text-sm">Plano Selecionado: <strong>Inteligente</strong></span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* LADO DIREITO: Formulário */}
                <div className="w-full md:w-[480px] p-6 md:p-12 flex flex-col justify-center bg-white shrink-0 h-full overflow-y-auto max-h-screen">

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-[#0F172A] mb-2 tracking-tight">Criar Conta</h2>
                        <p className="text-slate-500 text-sm">
                            Já tem cadastro?{' '}
                            <Link to="/login" className="font-bold text-primary hover:underline hover:text-primary-hover">
                                Fazer login
                            </Link>
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm text-red-600 font-medium">{error}</span>
                            </div>
                        )}

                        {/* Nome */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                                <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <input
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 font-medium transition-all"
                                placeholder="Nome completo"
                            />
                        </div>

                        {/* Email */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                                <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <input
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 font-medium transition-all"
                                placeholder="Email profissional"
                            />
                        </div>

                        {/* Empresa */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                                <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                                    <Briefcase className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <input
                                name="organizationName"
                                required
                                value={formData.organizationName}
                                onChange={handleChange}
                                className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 font-medium transition-all"
                                placeholder="Nome da empresa"
                            />
                        </div>

                        {/* Senha */}
                        <div className="space-y-2">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                                    <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#0369A1] transition-colors" />
                                    </div>
                                </div>
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full pl-14 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 font-medium transition-all"
                                    placeholder="Crie uma senha"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Barra de Força da Senha */}
                            {formData.password && (
                                <div className="flex items-center gap-2 px-1">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-slate-500">
                                        {getStrengthLabel(passwordStrength)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirmar Senha */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                                <div className="h-full px-3 flex items-center justify-center border-r border-slate-100">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#0369A1] transition-colors" />
                                </div>
                            </div>
                            <input
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="block w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 font-medium transition-all"
                                placeholder="Confirme a senha"
                            />
                        </div>

                        {/* Checkbox de Termos */}
                        <div className="flex items-start gap-3 px-1 py-1">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </div>
                            <label htmlFor="terms" className="text-sm text-slate-600 font-medium cursor-pointer">
                                Li e concordo com os <a href="#" className="font-bold text-primary hover:underline hover:text-primary-hover">Termos de Uso</a> e <a href="#" className="font-bold text-primary hover:underline hover:text-primary-hover">Política de Privacidade</a>.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 mt-6 text-lg"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Criar Conta
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
