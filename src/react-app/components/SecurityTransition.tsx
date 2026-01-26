import { useState, useEffect } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export default function SecurityTransition() {
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);

    const statuses = [
        "Identificando usuário...",
        "Validando chaves de criptografia...",
        "Verificando permissões de compliance...",
        "Estabelecendo conexão segura..."
    ];

    const tips = [
        "Dica: Você pode exportar relatórios de inspeção diretamente para PDF.",
        "Segurança: Seus dados são criptografados de ponta a ponta.",
        "Compliance: Mantenha seus logs de auditoria sempre revisados.",
        "Compia: Integridade e precisão em cada auditoria."
    ];

    const [currentTip, setCurrentTip] = useState(tips[0]);

    useEffect(() => {
        // Random tip on mount
        setCurrentTip(tips[Math.floor(Math.random() * tips.length)]);

        // Simulate progress bar and status changes
        const totalDuration = 2500; // 2.5 seconds total transition (slightly faster than 3s for UX)
        const updateInterval = 20;
        const steps = totalDuration / updateInterval;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const newProgress = Math.min((currentStep / steps) * 100, 100);
            setProgress(newProgress);

            // Cycle statuses based on progress chunks
            if (newProgress < 25) setStatusIndex(0);
            else if (newProgress < 50) setStatusIndex(1);
            else if (newProgress < 75) setStatusIndex(2);
            else setStatusIndex(3);

            if (currentStep >= steps) {
                clearInterval(interval);
            }
        }, updateInterval);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
            {/* Background Pattern (Subtle Grid) */}
            <div className="absolute inset-0 z-0 opacity-[0.03]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230F172A' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-md p-8">

                {/* Logo Ampliada */}
                <img
                    src="/compia_logo.png"
                    alt="Compia"
                    className="h-16 md:h-20 w-auto mb-12 transition-all duration-700"
                />

                {/* Central Animation */}
                <div className="relative mb-12">
                    {/* Pulsing Rings */}
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse delay-75"></div>

                    <div className="relative bg-white p-4 rounded-full shadow-xl shadow-slate-200 border border-slate-100">
                        <ShieldCheck className="w-12 h-12 text-primary animate-pulse" strokeWidth={1.5} />
                    </div>

                    {/* Scanning Beam Effect (CSS Trick) */}
                    <div className="absolute top-0 left-0 w-full h-full rounded-full overflow-hidden pointer-events-none">
                        <div className="w-full h-1/2 bg-gradient-to-b from-transparent to-white/50 animate-[scan_2s_linear_infinite] opacity-50"></div>
                    </div>
                </div>

                {/* Main Status Text */}
                <div className="h-8 mb-6 flex items-center justify-center">
                    <span className="text-slate-800 font-semibold text-lg tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-300 key={statusIndex}">
                        {statuses[statusIndex]}
                    </span>
                </div>

                {/* Determinate Progress Bar */}
                <div className="w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-12 relative">
                    <div
                        className="h-full bg-primary transition-all duration-100 ease-out relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Shimmer effect on bar */}
                        <div className="absolute inset-0 bg-white/30 w-full h-full -skew-x-12 animate-[shimmer_1s_infinite]"></div>
                    </div>
                </div>

                {/* Footer: Educational Tip */}
                <div className="absolute bottom-10 text-center max-w-sm px-6">
                    <div className="bg-white/60 backdrop-blur-sm border border-slate-100 rounded-lg p-3 shadow-sm">
                        <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                            {currentTip}
                        </p>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-300 uppercase tracking-widest font-bold">
                        <Lock className="w-3 h-3" />
                        Ambiente Seguro
                    </div>
                </div>

            </div>
        </div>
    );
}

// Add these custom animations to your tailwind.config.js or global css if needed,
// strictly for now we assume animate-pulse/ping exist, but 'scan' and 'shimmer' might need inline styles or class supplements.
