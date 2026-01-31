// useMediaHandling - Hook for handling media uploads and recording

import { useState, useRef, useCallback } from 'react';
import { fetchWithAuth } from '@/react-app/utils/auth';

interface MediaItem {
    id: number;
    file_url: string;
    media_type: string;
    file_name: string;
}

interface UseMediaHandlingProps {
    inspectionId: number;
    onMediaUploaded?: (media: MediaItem) => void;
}

export function useMediaHandling({ inspectionId, onMediaUploaded }: UseMediaHandlingProps) {
    const [uploading, setUploading] = useState(false);
    const [recording, setRecording] = useState<'audio' | 'video' | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to compress image to WebP
    const compressImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions to avoid huge images
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1920;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log(`[COMPRESSION] Original: ${(file.size / 1024).toFixed(2)}KB -> JPEG: ${(blob.size / 1024).toFixed(2)}KB`);
                        resolve(blob);
                    } else {
                        reject(new Error('Compression failed'));
                    }
                }, 'image/jpeg', 0.8); // Quality 0.8
            };

            img.onerror = (err) => reject(err);
            img.src = url;
        });
    };

    const uploadFile = useCallback(async (originalFile: File, fieldId: number, type: 'image' | 'audio' | 'video' | 'file', coordinates?: { latitude: number; longitude: number }) => {
        if (!inspectionId) return null;

        setUploading(true);
        try {
            let fileToUpload = originalFile;
            let finalFileName = originalFile.name;
            let finalMimeType = originalFile.type;

            // Compress if image
            if (type === 'image' && originalFile.type.startsWith('image/')) {
                try {
                    console.log('[COMPRESSION] Starting compression for', originalFile.name);
                    const compressedBlob = await compressImage(originalFile);

                    // Create new filename with .jpg extension
                    const nameWithoutExt = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
                    finalFileName = `${nameWithoutExt}.jpg`;
                    finalMimeType = 'image/jpeg';

                    // Create new File object
                    fileToUpload = new File([compressedBlob], finalFileName, { type: 'image/jpeg' });
                } catch (err) {
                    console.warn('[COMPRESSION] Failed, using original file:', err);
                }
            }

            // Create FormData
            const formData = new FormData();
            formData.append('inspection_item_id', fieldId.toString());
            formData.append('media_type', type);
            formData.append('file_name', finalFileName);
            // Append file directly
            formData.append('file', fileToUpload);
            formData.append('file_size', fileToUpload.size.toString());
            formData.append('mime_type', finalMimeType);
            formData.append('captured_at', new Date().toISOString());

            if (coordinates) {
                formData.append('latitude', coordinates.latitude.toString());
                formData.append('longitude', coordinates.longitude.toString());
            }

            // Upload via FormData
            const response = await fetchWithAuth(`/api/media/${inspectionId}/media/upload`, {
                method: 'POST',
                body: formData
                // Note: fetchWithAuth will now correctly NOT set Content-Type: application/json
            });

            if (response.ok) {
                const data = await response.json();
                const mediaItem: MediaItem = {
                    id: data.media?.id || data.id,
                    file_url: data.media?.file_url || data.file_url,
                    media_type: type,
                    file_name: finalFileName
                };

                if (onMediaUploaded) {
                    onMediaUploaded(mediaItem);
                }
                return mediaItem;
            } else {
                const error = await response.json().catch(() => ({}));
                console.error('Upload failed:', error);
                alert(error.error || 'Erro ao fazer upload');
                return null;
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Erro de conexão ao fazer upload');
            return null;
        } finally {
            setUploading(false);
        }
    }, [inspectionId, onMediaUploaded]);

    const startAudioRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(1000); // Collect data every second
            setRecording('audio');
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Não foi possível acessar o microfone. Verifique as permissões.');
        }
    }, []);

    const isStopping = useRef(false);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive' || isStopping.current) {
                resolve(null);
                return;
            }

            isStopping.current = true;

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

                // Stop all tracks
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

                // Clear timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                setRecording(null);
                setRecordingTime(0);
                isStopping.current = false;

                resolve(blob);
            };

            mediaRecorderRef.current.stop();
        });
    }, []);

    return {
        uploadFile,
        startAudioRecording,
        stopRecording,
        uploading,
        recording,
        recordingTime
    };
}

export default useMediaHandling;
