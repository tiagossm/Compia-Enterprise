import { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already consented
        const consent = localStorage.getItem('compia_cookie_consent');
        if (!consent) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('compia_cookie_consent', 'true');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('compia_cookie_consent', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full z-[60] p-4 md:p-6 animate-slide-up">
            <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-6 md:flex items-center justify-between gap-6 ring-1 ring-slate-900/5">

                <div className="flex items-start gap-4 mb-6 md:mb-0">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600 hidden sm:block">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Sua privacidade é nossa prioridade</h4>
                        <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
                            Utilizamos cookies para melhorar sua experiência, analisar o tráfego e personalizar o conteúdo.
                            Ao continuar navegando, você concorda com nossa <a href="#" className="text-blue-600 font-bold hover:underline">Política de Privacidade</a>.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={handleDecline}
                        className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                        Apenas Necessários
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all whitespace-nowrap"
                    >
                        Aceitar Todos
                    </button>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 md:hidden"
                >
                    <X size={20} />
                </button>

            </div>
        </div>
    );
}
