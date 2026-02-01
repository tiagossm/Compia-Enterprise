// Hook for managing ATA (continuous audio) recording
// Supports pause/resume, auto-save, and offline storage

import { useState, useRef, useCallback, useEffect } from 'react';
import { ataService, ATA, ATASegment } from '@/services/ataService';
import { useToast } from '@/hooks/use-toast';

// Auto-save interval (30 seconds)
const AUTO_SAVE_INTERVAL = 30000;
// Warning after 30 minutes
const DURATION_WARNING_THRESHOLD = 30 * 60;
// Max duration 2 hours
const MAX_DURATION = 2 * 60 * 60;

interface ATARecordingState {
    ata: ATA | null;
    isRecording: boolean;
    isPaused: boolean;
    currentSegment: number;
    totalDuration: number;
    currentSegmentDuration: number;
    lastSaved: Date | null;
    hasUnsavedData: boolean;
    segments: ATASegment[];
    error: string | null;
}

interface UseATARecordingProps {
    inspectionId: number;
    organizationId: number;
}

export function useATARecording({ inspectionId, organizationId }: UseATARecordingProps) {
    const { toast } = useToast();

    // State
    const [state, setState] = useState<ATARecordingState>({
        ata: null,
        isRecording: false,
        isPaused: false,
        currentSegment: 1,
        totalDuration: 0,
        currentSegmentDuration: 0,
        lastSaved: null,
        hasUnsavedData: false,
        segments: [],
        error: null
    });

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const segmentStartTimeRef = useRef<Date | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const warningShownRef = useRef(false);

    // Load existing ATA on mount
    useEffect(() => {
        loadExistingATA();
    }, [inspectionId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Duration warning
    useEffect(() => {
        const totalSeconds = state.totalDuration + state.currentSegmentDuration;
        if (totalSeconds >= DURATION_WARNING_THRESHOLD && !warningShownRef.current) {
            warningShownRef.current = true;
            toast({
                title: 'Aviso de duração',
                description: 'A gravação já passou de 30 minutos. Considere finalizar em breve.',
                variant: 'default'
            });
        }
        if (totalSeconds >= MAX_DURATION && state.isRecording) {
            finalizeRecording();
            toast({
                title: 'Limite atingido',
                description: 'A gravação atingiu o limite de 2 horas e foi finalizada automaticamente.',
                variant: 'destructive'
            });
        }
    }, [state.totalDuration, state.currentSegmentDuration, state.isRecording]);

    /**
     * Load existing ATA for this inspection
     */
    const loadExistingATA = useCallback(async () => {
        try {
            const existingATA = await ataService.getByInspection(inspectionId);
            if (existingATA) {
                const segments = await ataService.getSegments(existingATA.id);
                setState(prev => ({
                    ...prev,
                    ata: existingATA,
                    totalDuration: existingATA.total_duration_seconds,
                    currentSegment: segments.length + 1,
                    segments
                }));
            }
        } catch (error) {
            console.error('Failed to load existing ATA:', error);
        }
    }, [inspectionId]);

    /**
     * Start recording
     */
    const startRecording = useCallback(async () => {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            streamRef.current = stream;

            // Create or get ATA
            let ata = state.ata;
            if (!ata) {
                ata = await ataService.create(inspectionId, organizationId);
            }

            // Setup MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            segmentStartTimeRef.current = new Date();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    setState(prev => ({ ...prev, hasUnsavedData: true }));
                }
            };

            mediaRecorder.onstop = async () => {
                await saveCurrentSegment();
            };

            // Start recording with timeslice for chunked data
            mediaRecorder.start(1000); // Collect data every 1 second

            // Start duration timer
            timerRef.current = setInterval(() => {
                setState(prev => ({
                    ...prev,
                    currentSegmentDuration: prev.currentSegmentDuration + 1
                }));
            }, 1000);

            // Start auto-save timer
            autoSaveTimerRef.current = setInterval(async () => {
                if (chunksRef.current.length > 0 && state.hasUnsavedData) {
                    await saveToIndexedDB();
                    setState(prev => ({ ...prev, lastSaved: new Date() }));
                }
            }, AUTO_SAVE_INTERVAL);

            setState(prev => ({
                ...prev,
                ata,
                isRecording: true,
                isPaused: false,
                error: null
            }));

            toast({
                title: 'Gravação iniciada',
                description: 'A ATA está sendo gravada. Fale naturalmente.',
            });

        } catch (error: any) {
            console.error('Failed to start recording:', error);
            setState(prev => ({ ...prev, error: error.message }));
            toast({
                title: 'Erro ao iniciar gravação',
                description: error.message || 'Verifique as permissões do microfone.',
                variant: 'destructive'
            });
        }
    }, [state.ata, inspectionId, organizationId, toast]);

    /**
     * Pause recording (saves current segment)
     */
    const pauseRecording = useCallback(async () => {
        if (!mediaRecorderRef.current || state.isPaused) return;

        try {
            // Stop current recording (triggers onstop which saves segment)
            mediaRecorderRef.current.stop();

            // Stop timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setState(prev => ({
                ...prev,
                isPaused: true,
                totalDuration: prev.totalDuration + prev.currentSegmentDuration,
                currentSegmentDuration: 0,
                currentSegment: prev.currentSegment + 1
            }));

            toast({
                title: 'Gravação pausada',
                description: 'Segmento salvo. Clique em Continuar para retomar.',
            });

        } catch (error: any) {
            console.error('Failed to pause recording:', error);
            toast({
                title: 'Erro ao pausar',
                description: error.message,
                variant: 'destructive'
            });
        }
    }, [state.isPaused, toast]);

    /**
     * Resume recording (starts new segment)
     */
    const resumeRecording = useCallback(async () => {
        if (!state.isPaused || !streamRef.current) return;

        try {
            // Check if stream is still active
            if (!streamRef.current.active) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true }
                });
                streamRef.current = stream;
            }

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            segmentStartTimeRef.current = new Date();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    setState(prev => ({ ...prev, hasUnsavedData: true }));
                }
            };

            mediaRecorder.onstop = async () => {
                await saveCurrentSegment();
            };

            mediaRecorder.start(1000);

            // Restart timer
            timerRef.current = setInterval(() => {
                setState(prev => ({
                    ...prev,
                    currentSegmentDuration: prev.currentSegmentDuration + 1
                }));
            }, 1000);

            setState(prev => ({
                ...prev,
                isPaused: false,
                error: null
            }));

            toast({
                title: 'Gravação retomada',
                description: `Continuando no segmento ${state.currentSegment}.`,
            });

        } catch (error: any) {
            console.error('Failed to resume recording:', error);
            toast({
                title: 'Erro ao retomar',
                description: error.message,
                variant: 'destructive'
            });
        }
    }, [state.isPaused, state.currentSegment, toast]);

    /**
     * Finalize recording and prepare for processing
     */
    const finalizeRecording = useCallback(async (): Promise<ATA | null> => {
        if (!state.ata) return null;

        try {
            // Stop recording if active
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            // Stop timers
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (autoSaveTimerRef.current) {
                clearInterval(autoSaveTimerRef.current);
                autoSaveTimerRef.current = null;
            }

            // Stop stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            // Wait a bit for final segment to be saved
            await new Promise(resolve => setTimeout(resolve, 500));

            // Update state
            setState(prev => ({
                ...prev,
                isRecording: false,
                isPaused: false,
                hasUnsavedData: false,
                totalDuration: prev.totalDuration + prev.currentSegmentDuration,
                currentSegmentDuration: 0
            }));

            // Reload ATA with updated data
            const updatedATA = await ataService.get(state.ata.id);

            toast({
                title: 'Gravação finalizada',
                description: 'Pronto para processar a ATA.',
            });

            return updatedATA;

        } catch (error: any) {
            console.error('Failed to finalize recording:', error);
            toast({
                title: 'Erro ao finalizar',
                description: error.message,
                variant: 'destructive'
            });
            return null;
        }
    }, [state.ata, toast]);

    /**
     * Discard recording and delete ATA
     */
    const discardRecording = useCallback(async () => {
        try {
            // Stop everything
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            // Delete ATA if exists
            if (state.ata) {
                await ataService.delete(state.ata.id);
            }

            // Reset state
            setState({
                ata: null,
                isRecording: false,
                isPaused: false,
                currentSegment: 1,
                totalDuration: 0,
                currentSegmentDuration: 0,
                lastSaved: null,
                hasUnsavedData: false,
                segments: [],
                error: null
            });

            warningShownRef.current = false;

            toast({
                title: 'Gravação descartada',
                description: 'Todos os áudios foram removidos.',
            });

        } catch (error: any) {
            console.error('Failed to discard recording:', error);
            toast({
                title: 'Erro ao descartar',
                description: error.message,
                variant: 'destructive'
            });
        }
    }, [state.ata, toast]);

    /**
     * Save current segment to database
     */
    const saveCurrentSegment = useCallback(async () => {
        if (chunksRef.current.length === 0 || !state.ata || !segmentStartTimeRef.current) return;

        try {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const endTime = new Date();
            const durationSeconds = Math.floor(
                (endTime.getTime() - segmentStartTimeRef.current.getTime()) / 1000
            );

            const segment = await ataService.uploadSegment(
                state.ata.id,
                audioBlob,
                state.currentSegment,
                durationSeconds,
                segmentStartTimeRef.current,
                endTime
            );

            setState(prev => ({
                ...prev,
                segments: [...prev.segments, segment],
                hasUnsavedData: false,
                lastSaved: new Date()
            }));

            chunksRef.current = [];

        } catch (error) {
            console.error('Failed to save segment:', error);
            // Don't throw - try to save to IndexedDB as fallback
            await saveToIndexedDB();
        }
    }, [state.ata, state.currentSegment]);

    /**
     * Save to IndexedDB as offline fallback
     */
    const saveToIndexedDB = useCallback(async () => {
        if (chunksRef.current.length === 0) return;

        try {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

            // Use localStorage as simple fallback (for small chunks)
            // In production, should use IndexedDB via sync-service
            const key = `ata_backup_${inspectionId}_${state.currentSegment}`;
            const reader = new FileReader();

            reader.onloadend = () => {
                try {
                    localStorage.setItem(key, reader.result as string);
                    console.log('Saved to localStorage backup:', key);
                } catch (e) {
                    console.error('Failed to save to localStorage:', e);
                }
            };

            reader.readAsDataURL(audioBlob);

            setState(prev => ({ ...prev, lastSaved: new Date() }));

        } catch (error) {
            console.error('Failed to save to IndexedDB:', error);
        }
    }, [inspectionId, state.currentSegment]);

    /**
     * Format duration as MM:SS or HH:MM:SS
     */
    const formatDuration = useCallback((seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        // State
        ata: state.ata,
        isRecording: state.isRecording,
        isPaused: state.isPaused,
        currentSegment: state.currentSegment,
        totalDuration: state.totalDuration + state.currentSegmentDuration,
        lastSaved: state.lastSaved,
        hasUnsavedData: state.hasUnsavedData,
        segments: state.segments,
        error: state.error,

        // Actions
        startRecording,
        pauseRecording,
        resumeRecording,
        finalizeRecording,
        discardRecording,
        loadExistingATA,

        // Utilities
        formatDuration
    };
}

export default useATARecording;
