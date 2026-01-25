import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';

interface AudioRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void;
    isProcessing?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing = false }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                onRecordingComplete(blob);
                stopTimer();
                setRecordingTime(0);

                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            startTimer();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Não foi possível acessar o microfone. Verifique as permissões.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setRecordingTime((prev) => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => {
            stopTimer();
            // Ensure tracks are stopped if component unmounts while recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group transition-all hover:shadow-md">

            {/* Background Pulse Effect when Recording */}
            {isRecording && (
                <div className="absolute inset-0 bg-red-50/50 animate-pulse pointer-events-none" />
            )}

            <div className="flex items-center gap-6 relative z-10 w-full justify-between">

                {/* Status / Call to Action */}
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isRecording ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isRecording ? (
                            <Mic className="w-5 h-5 animate-pulse" />
                        ) : (
                            <Sparkles className="w-5 h-5" />
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-700 text-sm">
                            {isProcessing ? 'Processando...' : isRecording ? 'Gravando...' : 'Ata IA (Mãos Livres)'}
                        </span>
                        <span className="text-xs text-slate-500">
                            {isProcessing ? 'Gerando sugestões...' : isRecording ? formatTime(recordingTime) : 'Descreva o ambiente para preencher'}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div>
                    {isProcessing ? (
                        <div className="h-10 w-10 flex items-center justify-center">
                            <span className="sr-only">Carregando</span>
                        </div>
                    ) : isRecording ? (
                        <button
                            onClick={stopRecording}
                            className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-200"
                            title="Parar Gravação"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    ) : (
                        <button
                            onClick={startRecording}
                            className="px-4 py-2 rounded-lg bg-[#2050E0] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#1a40b3] transition-colors shadow-lg hover:shadow-blue-200"
                        >
                            <Mic className="w-4 h-4" />
                            <span>Gravar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar (Visual indicator of processing) */}
            {isProcessing && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                    <div className="h-full bg-indigo-500 animate-progress" style={{ width: '100%' }}></div>
                </div>
            )}
        </div>
    );
};
