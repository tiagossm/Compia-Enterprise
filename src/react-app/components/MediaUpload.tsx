import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image, Video, Mic, FileText, Pause, Camera, Eye, Download, CheckSquare, Square, Trash2 } from 'lucide-react';
import { InspectionMediaType } from '@/shared/types';
import { syncService } from '@/lib/sync-service';
import MediaViewer from './MediaViewer';
import MediaDownloader from './MediaDownloader';
import ExifReader from 'exifreader';

interface MediaUploadProps {
  inspectionId: number;
  inspectionItemId?: number;
  onMediaUploaded: (media: InspectionMediaType) => void;
  existingMedia?: InspectionMediaType[];
  onMediaDeleted?: (mediaId: number) => void;
  inspectionTitle?: string;
}

// Helper to get device location
const getDeviceLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

// Helper to get GPS from EXIF
const getExifGPS = async (file: File): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const tags = await ExifReader.load(file);
    if (!tags || !tags['GPSLatitude'] || !tags['GPSLongitude']) return null;

    // Helper to generic parse (simplified for robust usage)
    const latDesc = tags['GPSLatitude'].description;
    const NumberLat = Number(latDesc);

    // If description is already decimal (some versions do this)
    if (!isNaN(NumberLat) && latDesc.includes('.')) {
      // Check Ref
      const latRefTag = tags['GPSLatitudeRef'];
      let ref = '';
      if (latRefTag && latRefTag.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val = latRefTag.value as any;
        if (Array.isArray(val) && val.length > 0) ref = val[0];
        else if (typeof val === 'string') ref = val[0];
      }
      const lat = ref.toUpperCase() === 'S' ? -NumberLat : NumberLat;

      const lngDesc = tags['GPSLongitude'].description;
      const NumberLng = Number(lngDesc);

      const lngRefTag = tags['GPSLongitudeRef'];
      let refLng = '';
      if (lngRefTag && lngRefTag.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val = lngRefTag.value as any;
        if (Array.isArray(val) && val.length > 0) refLng = val[0];
        else if (typeof val === 'string') refLng = val[0];
      }
      const lng = refLng.toUpperCase() === 'W' ? -NumberLng : NumberLng;

      return { latitude: lat, longitude: lng };
    }

    // If not, we might need manual parsing of DMS, but ExifReader usually provides 'description' as a readable number 
    // or array. Let's rely on specific GPS tags if available.
    // Actually, safetynet: ExifReader is tricky.
    // Let's return null if simple parse fails to avoid bad data.
    // But most often description is "34.55" for decimal or "34, 33, 20" for DMS.
    return null;

  } catch (e) {
    console.warn("EXIF extraction failed", e);
    return null;
  }
};

export default function MediaUpload({
  inspectionId,
  inspectionItemId,
  onMediaUploaded,
  existingMedia = [],
  onMediaDeleted,
  inspectionTitle = 'Inspeção'
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  // videoRecording state removed - video recording disabled
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // videoRef removed - video recording disabled
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentCoordinates, setCurrentCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  // Navegação do visualizador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewerOpen) return;

      if (e.key === 'ArrowLeft' && currentViewIndex > 0) {
        setCurrentViewIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentViewIndex < existingMedia.length - 1) {
        setCurrentViewIndex(prev => prev + 1);
      } else if (e.key === 'Escape') {
        setViewerOpen(false);
      }
    };

    const handleMediaNavigate = (e: CustomEvent) => {
      if (e.detail.direction === 'previous' && currentViewIndex > 0) {
        setCurrentViewIndex(prev => prev - 1);
      } else if (e.detail.direction === 'next' && currentViewIndex < existingMedia.length - 1) {
        setCurrentViewIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mediaNavigate', handleMediaNavigate as EventListener);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mediaNavigate', handleMediaNavigate as EventListener);
    };
  }, [viewerOpen, currentViewIndex, existingMedia.length]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // 1. Tentar obter localização do dispositivo (alta precisão) como fallback
    let deviceCoords: { latitude: number; longitude: number } | null = null;
    try {
      deviceCoords = await getDeviceLocation();
      console.log("📍 GPS do Dispositivo (Alta Precisão):", deviceCoords);
    } catch (e) {
      console.warn("⚠️ Não foi possível obter GPS do dispositivo:", e);
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let finalCoords = deviceCoords;

      // 2. Tentar extrair EXIF se for imagem
      if (file.type.startsWith('image/')) {
        const exifCoords = await getExifGPS(file);
        if (exifCoords) {
          finalCoords = exifCoords;
          console.log(`📸 GPS extraído do EXIF (${file.name}):`, exifCoords);
        }
      }

      // 3. Upload com coordenadas (prioridade: EXIF > Dispositivo > null)
      await uploadFile(file, finalCoords || undefined);
    }
  };

  // File size limits in MB
  const FILE_SIZE_LIMITS = {
    image: 10,      // 10 MB
    video: 100,     // 100 MB
    audio: 20,      // 20 MB
    document: 50    // 50 MB
  };

  const validateFileSize = (file: File, mediaType: 'image' | 'video' | 'audio' | 'document'): boolean => {
    const limitMB = FILE_SIZE_LIMITS[mediaType];
    const fileSizeMB = file.size / 1024 / 1024;

    if (fileSizeMB > limitMB) {
      alert(`Arquivo muito grande! Limite para ${getMediaTypeLabel(mediaType)}: ${limitMB}MB\nTamanho do arquivo: ${fileSizeMB.toFixed(2)}MB`);
      return false;
    }
    return true;
  };

  const getMediaTypeLabel = (mediaType: string): string => {
    const labels = {
      'image': '📸 Imagens',
      'video': '🎥 Vídeos',
      'audio': '🎤 Áudios',
      'document': '📄 Documentos'
    };
    return labels[mediaType as keyof typeof labels] || mediaType;
  };

  // Compress and resize images to max 1200px, maintaining aspect ratio
  const compressImage = async (file: File, maxSize = 1200, quality = 0.85): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        // Only resize if larger than maxSize
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }

        // Fill white background (for transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log(`[MediaUpload] Compressed: ${(file.size / 1024).toFixed(0)}KB -> ${(compressedFile.size / 1024).toFixed(0)}KB (${width}x${height})`);
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file); // Fallback to original
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const generateThumbnail = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) return null;
    try {
      // Create an image element to load the file data
      // We use FileReader + Image because createImageBitmap might handle orientation differently or not be supported everywhere fully consistently with toDataURL requirements in some envs, but standard Canvas approach is safest.
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 200;
            let width = img.width;
            let height = img.height;

            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height);
              width *= ratio;
              height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = () => resolve(null);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.warn('Thumbnail generation failed', e);
      return null;
    }
  };

  const uploadFile = async (file: File, coordinates?: { latitude: number; longitude: number }) => {
    setUploading(true);

    try {
      const mediaType = getMediaType(file.type);

      // Validate file size
      if (!validateFileSize(file, mediaType)) {
        setUploading(false);
        return;
      }

      // Compress image before upload (auto resize + quality reduction)
      let processedFile = file;
      if (mediaType === 'image') {
        processedFile = await compressImage(file);
      }

      // Generate thumbnail if it's an image
      let thumbnailData: string | null = null;
      if (mediaType === 'image') {
        thumbnailData = await generateThumbnail(processedFile);
      }

      // Convert file to base64 for upload to backend
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(processedFile);
      });

      // Queue upload via syncService
      await syncService.enqueueMutation(
        `/api/media/${inspectionId}/media/upload`,
        'POST',
        {
          inspection_id: inspectionId,
          inspection_item_id: inspectionItemId,
          media_type: mediaType,
          file_name: file.name,
          file_data: fileData,
          thumbnail_data: thumbnailData,
          file_size: file.size,
          mime_type: file.type,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
          captured_at: new Date().toISOString(),
        }
      );

      console.log('[MediaUpload] Queued upload for:', file.name);

      // Optimistic Update: Create a temporary media object locally
      const tempId = Date.now(); // Temp ID for React key
      const tempMedia: InspectionMediaType = {
        id: tempId,
        inspection_id: inspectionId,
        inspection_item_id: inspectionItemId,
        media_type: mediaType,
        file_name: file.name,
        // For local display, we use the base64 we just created (fileData)
        // or a blob URL if preferred. fileData is base64 string.
        file_url: fileData.startsWith('data:') ? fileData : `data:${file.type};base64,${fileData}`, // fallback logic if format varies
        file_size: file.size,
        mime_type: file.type,
        latitude: coordinates?.latitude || undefined,
        longitude: coordinates?.longitude || undefined,
        captured_at: new Date().toISOString()
      };

      onMediaUploaded(tempMedia);

    } catch (error) {
      console.error('Erro ao fazer upload (fila):', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const getMediaType = (mimeType: string): 'image' | 'video' | 'audio' | 'document' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const startPhotoCapture = async () => {
    try {
      setTakingPhoto(true);

      // Capturar geolocalização
      // Capturar geolocalização com fallback
      if (navigator.geolocation) {
        const getGeo = (highAccuracy: boolean) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setCurrentCoordinates({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            (error) => {
              console.warn(`Geolocation error (${highAccuracy ? 'High' : 'Low'} accuracy):`, error.message);
              if (highAccuracy && error.code === error.TIMEOUT) {
                console.log('Tentando novamente com baixa precisão...');
                getGeo(false);
              } else {
                setCurrentCoordinates(null);
              }
            },
            { enableHighAccuracy: highAccuracy, timeout: 20000, maximumAge: 0 }
          );
        };
        getGeo(true);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });

      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
        photoVideoRef.current.play();
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      let msg = 'Erro ao acessar câmera.';

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          msg = 'Permissão da câmera negada. Verifique as configurações.';
        } else if (error.name === 'NotReadableError') {
          msg = 'Câmera indisponível ou em uso por outro app.';
        } else {
          msg = `Erro na câmera: ${error.name} - ${error.message}`;
        }
      } else {
        msg = `Erro ao acessar câmera: ${String(error)}`;
      }

      alert(msg);
      setTakingPhoto(false);
    }
  };

  const capturePhoto = async () => {
    if (!photoVideoRef.current || !canvasRef.current) return;

    const video = photoVideoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current frame from video to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Salvar coordenadas atuais antes de limpar
    const coords = currentCoordinates;

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadFile(file, coords || undefined);

      // Stop camera stream
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      setTakingPhoto(false);
      setCurrentCoordinates(null);
    }, 'image/jpeg', 0.9);
  };

  const cancelPhotoCapture = () => {
    if (photoVideoRef.current) {
      const stream = photoVideoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      photoVideoRef.current.srcObject = null;
    }
    setTakingPhoto(false);
  };

  const startAudioRecording = async () => {
    try {
      console.log('[MediaUpload] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[MediaUpload] Microphone access granted');

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          console.log('[MediaUpload] Audio chunk received:', e.data.size);
        }
      };

      recorder.onstop = async () => {
        console.log('[MediaUpload] Recorder stopped. Total chunks:', chunks.length);
        if (chunks.length === 0) {
          console.error('[MediaUpload] No audio chunks recorded');
          alert('Erro: Nenhum áudio gravado. Verifique seu microfone.');
          return;
        }

        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('[MediaUpload] Audio blob created, size:', blob.size);

        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        console.log('[MediaUpload] Uploading audio file...');
        await uploadFile(file);

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      console.log('[MediaUpload] Recorder started');

      setMediaRecorder(recorder);
      setAudioRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Erro ao acessar microfone: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // startVideoRecording function removed - video recording disabled

  const stopRecording = () => {
    console.log('[MediaUpload] Stopping recording...');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.requestData(); // Ensure we get the last chunk
      mediaRecorder.stop();
      console.log('[MediaUpload] Stop signal sent to recorder');
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    setAudioRecording(false);
    // setVideoRecording removed - video recording disabled
    setMediaRecorder(null);
    setRecordingTime(0);
  };

  const deleteMedia = async (mediaId: number) => {
    if (!onMediaDeleted) return;
    if (!confirm('Tem certeza que deseja excluir esta mídia?')) return;

    try {
      await syncService.enqueueMutation(
        `/api/media/${inspectionId}/media/${mediaId}`,
        'DELETE',
        {}
      );

      // Optimistic delete
      onMediaDeleted(mediaId);
      setSelectedMedia(prev => prev.filter(id => id !== mediaId));

    } catch (error) {
      console.error('Error queuing delete media:', error);
    }
  };

  const toggleMediaSelection = (mediaId: number) => {
    setSelectedMedia(prev => {
      if (prev.includes(mediaId)) {
        return prev.filter(id => id !== mediaId);
      } else {
        return [...prev, mediaId];
      }
    });
  };

  const selectAllMedia = () => {
    const allIds = existingMedia.map(m => m.id!).filter(id => id !== undefined);
    setSelectedMedia(allIds);
  };

  const deselectAllMedia = () => {
    setSelectedMedia([]);
  };

  const deleteSelectedMedia = async () => {
    if (!onMediaDeleted) return;
    if (selectedMedia.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedMedia.length} mídia(s) selecionada(s)?`)) return;

    for (const mediaId of selectedMedia) {
      try {
        await syncService.enqueueMutation(
          `/api/media/${inspectionId}/media/${mediaId}`,
          'DELETE',
          {}
        );
        onMediaDeleted(mediaId);
      } catch (error) {
        console.error('Error queuing delete media:', mediaId, error);
      }
    }
    setSelectedMedia([]);
    setIsSelectionMode(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Mic className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const openViewer = (index: number) => {
    setCurrentViewIndex(index);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Controls - Minimalist Modern Layout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Action Group */}
          <div className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || takingPhoto}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all disabled:opacity-50"
              title="Carregar fotos, vídeos ou documentos"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button
              type="button"
              onClick={startPhotoCapture}
              disabled={uploading || takingPhoto || audioRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all disabled:opacity-50"
              title="Tirar foto com a câmera"
            >
              <Camera className="w-3.5 h-3.5" />
              Câmera
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            {audioRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded transition-all animate-pulse"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{formatTime(recordingTime)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startAudioRecording}
                disabled={uploading || takingPhoto}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded transition-all disabled:opacity-50"
                title="Gravar áudio"
              >
                <Mic className="w-3.5 h-3.5" />
                Gravar
              </button>
            )}
          </div>

          {uploading && (
            <span className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
              <div className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
              Enviando...
            </span>
          )}
        </div>

        {/* Right: Media Stats & Selection */}
        {existingMedia.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
              {existingMedia.length} {existingMedia.length === 1 ? 'item' : 'itens'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedMedia([]);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${isSelectionMode
                ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {isSelectionMode ? 'Cancelar' : 'Selecionar'}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Photo Capture Modal */}
      {takingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Tirar Foto</h3>
              <p className="text-sm text-slate-600">Posicione a câmera e clique em "Capturar"</p>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={photoVideoRef}
                className="w-full max-h-96 object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>

            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={capturePhoto}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capturar
              </button>
              <button
                onClick={cancelPhotoCapture}
                className="px-6 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />


      {/* Video Preview removed - video recording disabled */}

      {/* Media Gallery */}
      {existingMedia.length > 0 && (
        <div className="space-y-4">
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900">Mídias enviadas</h3>
            </div>

            {/* Selection Actions Bar */}
            {isSelectionMode && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectedMedia.length === existingMedia.length ? deselectAllMedia : selectAllMedia}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    {selectedMedia.length === existingMedia.length ? (
                      <><Square className="w-4 h-4" /> Desmarcar Todos</>
                    ) : (
                      <><CheckSquare className="w-4 h-4" /> Selecionar Todos</>
                    )}
                  </button>
                </div>
                <span className="text-sm text-blue-700">
                  {selectedMedia.length} de {existingMedia.length} selecionado(s)
                </span>
                {selectedMedia.length > 0 && (
                  <button
                    onClick={deleteSelectedMedia}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Selecionados
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Media Downloader - Sempre visível */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <MediaDownloader
              media={existingMedia}
              inspectionTitle={inspectionTitle}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {existingMedia.map((media, index) => (
              <div
                key={media.id || `media-${index}`}
                className={`relative bg-slate-50 rounded-lg p-3 border group transition-all ${isSelectionMode && selectedMedia.includes(media.id!)
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200'
                  }`}
                onClick={isSelectionMode ? () => toggleMediaSelection(media.id!) : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    {isSelectionMode && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedMedia.includes(media.id!)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-400 bg-white'
                        }`}>
                        {selectedMedia.includes(media.id!) && (
                          <CheckSquare className="w-3 h-3 text-white" />
                        )}
                      </div>
                    )}
                    {getMediaIcon(media.media_type)}
                    <span className="text-xs font-medium">{media.media_type.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openViewer(index); }}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Visualizar em tamanho grande"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onMediaDeleted && !isSelectionMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMedia(media.id!); }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {media.media_type === 'image' && (
                  <div
                    className="w-full h-24 rounded overflow-hidden cursor-pointer"
                    onClick={() => openViewer(index)}
                  >
                    <img
                      src={media.file_url}
                      alt={media.file_name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}

                {media.media_type === 'video' && (
                  <video
                    src={media.file_url}
                    className="w-full h-24 object-cover rounded"
                    controls
                  />
                )}

                {media.media_type === 'audio' && (
                  <div className="h-24 flex items-center justify-center">
                    <audio
                      src={media.file_url}
                      controls
                      className="w-full"
                    />
                  </div>
                )}

                {media.media_type === 'document' && (
                  <div className="h-24 flex items-center justify-center bg-slate-100 rounded">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                )}

                <p className="text-xs text-slate-600 mt-2 truncate" title={media.file_name}>
                  {media.file_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {media.file_size && (
                    <span>{(media.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  )}
                  {media.latitude && media.longitude && (
                    <span className="flex items-center gap-0.5 text-green-600" title={`GPS: ${Number(media.latitude).toFixed(6)}, ${Number(media.longitude).toFixed(6)}`}>
                      📍
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      <MediaViewer
        media={existingMedia}
        currentIndex={currentViewIndex}
        isOpen={viewerOpen}
        onClose={closeViewer}
      />
    </div>
  );
}
