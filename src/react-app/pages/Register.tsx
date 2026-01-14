import { useState } from 'react';
import { fetchWithAuth } from '@/react-app/utils/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, CheckCircle2, Briefcase } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();

    // Simplified state - no accountType
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        organizationName: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
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
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Defaulting to org_admin request since they are providing a company name
            // The SysAdmin will review and finalize the assignment.
            const role = 'org_admin';

            const response = await fetchWithAuth('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    organization_name: formData.organizationName,
                    role: role
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                // Redirecionar após 5 segundos (dando mais tempo para ler a msg)
                setTimeout(() => {
                    navigate('/login');
                }, 5000);
            } else {
                setError(data.error || 'Erro ao criar conta. Tente novamente.');
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
                            Solicitação Enviada!
                        </h2>
                        <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
                            <p className="text-slate-600 text-sm leading-relaxed text-center">
                                Um administrador do sistema revisará seus dados.<br />
                                Você receberá uma notificação por e-mail assim que sua conta for aprovada.
                            </p>
                        </div>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full px-6 py-4 bg-[#2050E0] text-white rounded-xl hover:bg-[#1a40b0] transition-colors font-bold shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20"
                        >
                            Voltar para o Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F7FA] font-sans p-4">
            {/* CARD DE REGISTER HORIZONTAL */}
            <div className="w-full md:w-auto md:max-w-[95vw] bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row shadow-slate-200/50">

                {/* LADO ESQUERDO: Branding / Logo (Igual ao Login) */}
                <div className="w-full md:w-[540px] bg-white flex flex-col items-center justify-center p-0 border-b md:border-b-0 md:border-r border-slate-100 relative overflow-hidden shrink-0">
                    {/* Background Circle Decoration matched from brand */}
                    <div className="absolute w-64 h-64 bg-[#2050E0]/5 rounded-full blur-3xl -top-10 -left-10"></div>
                    <div className="absolute w-64 h-64 bg-[#605E88]/5 rounded-full blur-3xl -bottom-10 -right-10"></div>

                    <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                        <img
                            src="/compia_logo.png"
                            alt="Compia Logo"
                            className="w-[85%] h-auto object-contain transition-transform hover:scale-105 duration-500"
                        />
                    </div>
                </div>

                {/* LADO DIREITO: Formulário */}
                <div className="w-full md:w-[420px] p-8 md:p-10 flex flex-col justify-center bg-white shrink-0 h-full overflow-y-auto max-h-screen">

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-[#303C60] mb-1 tracking-tight">Crie sua conta</h2>
                        <p className="text-slate-400 text-sm">
                            Já tem cadastro?{' '}
                            <Link to="/login" className="font-bold text-[#2050E0] hover:underline">
                                Fazer login
                            </Link>
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                                <span className="text-xs text-red-600 font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="relative group">
                                <User className="absolute top-3.5 left-4 h-5 w-5 text-slate-400 group-focus-within:text-[#2050E0] transition-colors" />
                                <input
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="block w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2050E0]/20 focus:border-[#2050E0] placeholder:text-slate-400 font-medium transition-all"
                                    placeholder="Nome completo"
                                />
                            </div>

                            <div className="relative group">
                                <Mail className="absolute top-3.5 left-4 h-5 w-5 text-slate-400 group-focus-within:text-[#2050E0] transition-colors" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2050E0]/20 focus:border-[#2050E0] placeholder:text-slate-400 font-medium transition-all"
                                    placeholder="Email profissional"
                                />
                            </div>

                            <div className="relative group animate-in fade-in slide-in-from-top-2">
                                <Briefcase className="absolute top-3.5 left-4 h-5 w-5 text-slate-400 group-focus-within:text-[#2050E0] transition-colors" />
                                <input
                                    name="organizationName"
                                    required
                                    value={formData.organizationName}
                                    onChange={handleChange}
                                    className="block w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2050E0]/20 focus:border-[#2050E0] placeholder:text-slate-400 font-medium transition-all"
                                    placeholder="Nome da empresa"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute top-3.5 left-4 h-5 w-5 text-slate-400 group-focus-within:text-[#2050E0] transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2050E0]/20 focus:border-[#2050E0] placeholder:text-slate-400 font-medium transition-all"
                                    placeholder="Senha (min 6 chars)"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute top-3.5 left-4 h-5 w-5 text-slate-400 group-focus-within:text-[#2050E0] transition-colors" />
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="block w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2050E0]/20 focus:border-[#2050E0] placeholder:text-slate-400 font-medium transition-all"
                                    placeholder="Confirmar senha"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#2050E0] hover:bg-[#1a40b0] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? 'Enviando...' : 'Solicitar Cadastro'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-[10px] text-slate-400 px-4">
                        Ao cadastrar, você concorda com nossos Termos e Política.
                    </div>
                </div>
            </div>
        </div>
    );
}
