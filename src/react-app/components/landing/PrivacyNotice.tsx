import { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export default function PrivacyNotice() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check local storage - changed key to avoid old conflicts
        const consent = localStorage.getItem('compia_privacy_ack_v1');
        if (!consent) {
            // Immediate visibility for debugging
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('compia_privacy_ack_v1', 'true');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('compia_privacy_ack_v1', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        // Boosted Z-Index to avoid being covered by other modals/widgets
        <div className="fixed bottom-0 left-0 w-full z-[9999] p-4 md:p-6 animate-slide-up">
            <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-6 md:flex items-center justify-between gap-6 ring-1 ring-slate-900/5">

                <div className="flex items-start gap-4 mb-6 md:mb-0">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600 hidden sm:block">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Transparência Total</h4>
                        <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
                            Este site utiliza tecnologias de armazenamento para garantir a funcionalidade e segurança.
                            Ao continuar, você concorda com nossos <a href="#" className="text-blue-600 font-bold hover:underline">Termos de Privacidade</a>.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={handleDecline}
                        className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                        Configurar
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all whitespace-nowrap"
                    >
                        Concordar e Fechar
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
