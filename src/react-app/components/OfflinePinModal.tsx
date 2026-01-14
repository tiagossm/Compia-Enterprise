import { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';

export function OfflinePinModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isSetupMode, setIsSetupMode] = useState(false);

    useEffect(() => {
        // Check if offline and PIN not verified for this session
        const isOffline = !navigator.onLine;
        const sessionVerified = sessionStorage.getItem('offline_pin_verified');
        const storedPin = localStorage.getItem('offline_pin');

        if (isOffline && !sessionVerified) {
            if (!storedPin) {
                // First time offline setup (in reality this should be done while online)
                // keeping it simple for POV: allow setup if missing
                setIsSetupMode(true);
            }
            setIsOpen(true);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isSetupMode) {
            if (pin.length < 4) {
                setError('PIN deve ter 4 dígitos');
                return;
            }
            localStorage.setItem('offline_pin', pin);
            sessionStorage.setItem('offline_pin_verified', 'true');
            setIsOpen(false);
            alert('PIN Offline configurado com sucesso!');
        } else {
            const storedPin = localStorage.getItem('offline_pin');
            if (pin === storedPin) {
                sessionStorage.setItem('offline_pin_verified', 'true');
                setIsOpen(false);
            } else {
                setError('PIN incorreto');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    {isSetupMode ? <Unlock size={32} /> : <Lock size={32} />}
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    {isSetupMode ? 'Criar PIN Offline' : 'Acesso Offline Protegido'}
                </h2>

                <p className="text-slate-500 mb-6">
                    {isSetupMode
                        ? 'Defina um PIN para acessar seus dados quando estiver sem internet.'
                        : 'Digite seu PIN de segurança para acessar o aplicativo offline.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="0000"
                            className="w-full text-center text-4xl font-bold tracking-[1em] py-4 border-b-2 border-slate-200 focus:border-blue-500 outline-none transition-colors"
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] mt-4 shadow-lg shadow-blue-600/20"
                    >
                        {isSetupMode ? 'Definir PIN' : 'Desbloquear'}
                    </button>
                </form>

                {!isSetupMode && (
                    <p className="mt-6 text-xs text-slate-400">
                        Esqueceu? Conecte-se à internet para fazer login com sua senha normal.
                    </p>
                )}
            </div>
        </div>
    );
}
