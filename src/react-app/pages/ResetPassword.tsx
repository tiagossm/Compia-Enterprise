import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/react-app/hooks/useToast";
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();

    useEffect(() => {
        if (!token) {
            showError("Link inválido", "O link de recuperação parece estar incompleto.");
        }
    }, [token, showError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showError("Erro", "As senhas não coincidem.");
            return;
        }

        if (newPassword.length < 6) {
            showError("Erro", "A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                showSuccess("Senha alterada!", "Sua senha foi atualizada com sucesso.");

                // Redirect after a few seconds
                setTimeout(() => navigate('/login'), 3000);

            } else {
                throw new Error(data.error || "Erro ao redefinir senha");
            }
        } catch (err: any) {
            showError("Erro", err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce">
                            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Senha Atualizada!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Sua senha foi redefinida com sucesso. Você será redirecionado para o login em instantes.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-3 px-4 text-sm font-medium text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                    >
                        Ir para Login agora
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">

                <div className="text-center">
                    <Link to="/" className="inline-block mb-6">
                        <img
                            src="/COMPIA_BRAND_KIT/png/2x/compia-logo-main.png"
                            alt="Compia Enterprise"
                            className="h-16 mx-auto dark:hidden"
                        />
                        <img
                            src="/COMPIA_BRAND_KIT/png/2x/compia-logo-mono-white.png"
                            alt="Compia Enterprise"
                            className="h-16 mx-auto hidden dark:block"
                        />
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Nova Senha
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Crie uma nova senha segura para sua conta.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="new-password" className="sr-only">Nova Senha</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="new-password"
                                    name="new-password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-10 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                                    placeholder="Nova senha (min. 6 caracteres)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="sr-only">Confirmar Senha</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    required
                                    className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                                    placeholder="Confirme a nova senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !token}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-3 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        >
                            {loading ? "Atualizando..." : "Redefinir Senha"}
                        </button>
                    </div>
                </form>

                <div className="text-center mt-6">
                    <Link
                        to="/login"
                        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Login
                    </Link>
                </div>

            </div>
        </div>
    );
}
