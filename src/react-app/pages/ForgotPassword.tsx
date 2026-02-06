import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useToast } from "@/react-app/hooks/useToast";
import { Mail, ArrowLeft, Send, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { success: showSuccess, error: showError } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setSent(true);
                showSuccess("Email enviado", "Verifique sua caixa de entrada para redefinir a senha.");
            } else {
                throw new Error(data.error || "Erro ao solicitar recuperação");
            }
        } catch (err: any) {
            showError("Erro", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">

                {/* Header */}
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

                    {sent ? (
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    ) : null}

                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {sent ? "Verifique seu email" : "Recuperar Senha"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {sent
                            ? `Enviamos um link de recuperação para ${email}. O link expira em 1 hora.`
                            : "Digite seu email para receber o link de redefinição."}
                    </p>
                </div>

                {/* Form or Back Button */}
                {!sent ? (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="sr-only">Email</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                                    placeholder="Seu email cadastrado"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-3 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Enviando...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        Enviar Link
                                        <Send className="ml-2 h-4 w-4" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="mt-8">
                        <button
                            onClick={() => setSent(false)}
                            className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                            Tentar outro email
                        </button>
                    </div>
                )}

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

            {/* Footer minimalista */}
            <div className="absolute bottom-6 w-full text-center">
                <p className="text-xs text-gray-400 dark:text-gray-600">
                    &copy; {new Date().getFullYear()} Compia Enterprise.
                </p>
            </div>
        </div>
    );
}
