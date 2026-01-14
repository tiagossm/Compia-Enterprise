import { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, MapPin } from 'lucide-react';

interface GeoCoordinates {
    latitude: number;
    longitude: number;
}

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (blob: Blob, coords?: GeoCoordinates) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const watchId = useRef<number | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionError, setPermissionError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [coordinates, setCoordinates] = useState<GeoCoordinates | null>(null);
    const [geoStatus, setGeoStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');

    // Gerenciar camera e GPS
    useEffect(() => {
        if (isOpen) {
            startCamera();
            startWatchingLocation();
        } else {
            stopCamera();
            stopWatchingLocation();
            setCoordinates(null);
            setGeoStatus('loading');
        }
        return () => {
            stopCamera();
            stopWatchingLocation();
        };
    }, [isOpen, facingMode]);

    const stopWatchingLocation = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    };

    const startWatchingLocation = (highAccuracy = true) => {
        if (!navigator.geolocation) {
            setGeoStatus('error');
            return;
        }

        setGeoStatus('loading');

        stopWatchingLocation();

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                setCoordinates({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setGeoStatus('success');
            },
            (error) => {
                console.warn(`Geolocation error (${highAccuracy ? 'High' : 'Low'} accuracy):`, error.message);
                if (highAccuracy && error.code === error.TIMEOUT) {
                    console.log('Tentando novamente com baixa precisão...');
                    startWatchingLocation(false);
                    return;
                }

                if (error.code === error.PERMISSION_DENIED) {
                    setGeoStatus('denied');
                } else if (!coordinates) {
                    setGeoStatus('error');
                }
            },
            {
                enableHighAccuracy: highAccuracy,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const startCamera = async () => {
        setLoading(true);
        setPermissionError(false);
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 }, // Reduced from 1920 for mobile stability
                    height: { ideal: 720 }
                },
                audio: false
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error("Camera access error:", error);
            setPermissionError(true);

            // Tratamento específico de erros
            if (error instanceof DOMException) {
                if (error.name === 'NotAllowedError') {
                    alert('Permissão da câmera negada. Por favor, permita o acesso nas configurações do navegador.');
                } else if (error.name === 'NotReadableError') {
                    alert('A câmera está sendo usada por outro aplicativo ou não pode ser acessada. Feche outros apps e tente novamente.');
                } else if (error.name === 'OverconstrainedError') {
                    alert('Nenhuma câmera atende aos requisitos solicitados (resolução/foco). Tentando configuração básica...');
                    // Poderíamos tentar reiniciar com constraints menores aqui, mas por enquanto só avisa
                } else {
                    alert(`Erro na câmera: ${error.name} - ${error.message}`);
                }
            } else {
                alert(`Erro ao acessar câmera: ${String(error)}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Add Watermark (Date & GPS)
                if (coordinates) {
                    const fontSize = Math.max(16, canvas.width * 0.025); // Responsive font size (~2.5% of width)
                    context.font = `bold ${fontSize}px sans-serif`;
                    context.fillStyle = 'white';
                    context.strokeStyle = 'rgba(0,0,0,0.8)';
                    context.lineWidth = fontSize * 0.15;
                    context.shadowColor = "black";
                    context.shadowBlur = 4;

                    const dateStr = new Date().toLocaleString('pt-BR');
                    const gpsStr = `LAT: ${coordinates.latitude.toFixed(6)}  LNG: ${coordinates.longitude.toFixed(6)}`;

                    // Setup padding
                    const padding = fontSize;

                    // Draw Date (Bottom Left)
                    context.strokeText(dateStr, padding, canvas.height - padding);
                    context.fillText(dateStr, padding, canvas.height - padding);

                    // Draw GPS (Bottom Right - Multi-line or Single line?)
                    // Let's put GPS above Date or on the Right? 
                    // To ensure visibility, let's stack them on Bottom Left if space permits, or split.
                    // Split is better. GPS on Bottom Right.
                    const gpsMetrics = context.measureText(gpsStr);
                    const gpsX = canvas.width - gpsMetrics.width - padding;

                    context.strokeText(gpsStr, gpsX, canvas.height - padding);
                    context.fillText(gpsStr, gpsX, canvas.height - padding);
                }

                canvas.toBlob((blob) => {
                    if (blob) {
                        // Passar coordenadas junto com o blob
                        onCapture(blob, coordinates || undefined);
                        onClose();
                    }
                }, 'image/jpeg', 0.85);
            }
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const getGeoStatusDisplay = () => {
        switch (geoStatus) {
            case 'loading':
                return (
                    <div className="flex items-center gap-1.5 text-yellow-400">
                        <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">GPS...</span>
                    </div>
                );
            case 'success':
                return (
                    <div className="flex items-center gap-1.5 text-green-400">
                        <MapPin size={14} />
                        <span className="text-xs">GPS ✓</span>
                    </div>
                );
            case 'denied':
                return (
                    <div className="flex items-center gap-1.5 text-orange-400">
                        <MapPin size={14} />
                        <span className="text-xs">GPS negado</span>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex items-center gap-1.5 text-red-400">
                        <MapPin size={14} />
                        <span className="text-xs">GPS indisponível</span>
                    </div>
                );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="relative w-full h-full max-w-lg mx-auto flex flex-col items-center justify-center p-4">

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-black/50 text-white z-50">
                    <X size={24} />
                </button>

                {/* GPS Status Indicator */}
                <div className="absolute top-6 left-6 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm z-50">
                    {getGeoStatusDisplay()}
                </div>

                {/* Viewfinder */}
                <div className="relative w-full aspect-[3/4] max-h-[70vh] bg-black rounded-lg overflow-hidden ring-1 ring-white/20 shadow-2xl">
                    {!permissionError ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-4 text-center">
                            <Camera size={48} className="mb-4 opacity-50" />
                            <p>Sem acesso à câmera. Verifique as permissões do navegador.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="w-8 h-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between w-full mt-8 px-8">
                    <button
                        onClick={switchCamera}
                        className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                        <RefreshCw size={24} />
                    </button>

                    <button
                        onClick={handleCapture}
                        disabled={loading || permissionError}
                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <div className="w-12 h-12 rounded-full bg-white" />
                    </button>

                    {/* Placeholder for layout balance */}
                    <div className="p-3 opacity-0 pointer-events-none">
                        <RefreshCw size={24} />
                    </div>
                </div>

                {/* Coordinates display (debug) */}
                {coordinates && (
                    <div className="mt-4 text-xs text-white/60 text-center">
                        📍 {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                    </div>
                )}
            </div>
        </div>
    );
}
