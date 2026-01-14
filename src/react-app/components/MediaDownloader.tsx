import { useState } from 'react';
import { Download, Package, FileText, Image as ImageIcon, Video, Mic, Loader2 } from 'lucide-react';
import { InspectionMediaType } from '@/shared/types';
import JSZip from 'jszip';

interface MediaDownloaderProps {
  media: InspectionMediaType[];
  inspectionTitle: string;
}

export default function MediaDownloader({ media, inspectionTitle }: MediaDownloaderProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const downloadSingleMedia = (mediaItem: InspectionMediaType) => {
    try {
      const link = document.createElement('a');
      link.href = mediaItem.file_url;
      link.download = mediaItem.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar mídia:', error);
    }
  };

  const downloadAllMedia = async () => {
    if (media.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const mediaFolder = zip.folder(`${inspectionTitle} - Midias`);

      if (!mediaFolder) {
        throw new Error('Erro ao criar pasta no arquivo ZIP');
      }

      // Função para converter base64 para blob
      const base64ToBlob = (base64: string, mimeType: string): Blob => {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
      };

      // Adicionar cada mídia ao ZIP
      for (let i = 0; i < media.length; i++) {
        const mediaItem = media[i];
        
        try {
          if (mediaItem.file_url.startsWith('data:')) {
            // Arquivo base64
            const blob = base64ToBlob(mediaItem.file_url, mediaItem.mime_type || 'application/octet-stream');
            mediaFolder.file(mediaItem.file_name, blob);
          } else {
            // URL externa - fazer fetch
            const response = await fetch(mediaItem.file_url);
            const blob = await response.blob();
            mediaFolder.file(mediaItem.file_name, blob);
          }
        } catch (error) {
          console.error(`Erro ao processar mídia ${mediaItem.file_name}:`, error);
          // Continuar com outras mídias mesmo se uma falhar
        }

        setDownloadProgress(((i + 1) / media.length) * 100);
      }

      // Gerar e baixar o ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${inspectionTitle} - Midias.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpar URL object
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
      }, 1000);

    } catch (error) {
      console.error('Erro ao criar arquivo ZIP:', error);
      alert('Erro ao criar arquivo com todas as mídias. Tente novamente.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    return media.reduce((total, item) => total + (item.file_size || 0), 0);
  };

  const getMediaStats = () => {
    const stats = media.reduce((acc, item) => {
      acc[item.media_type] = (acc[item.media_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  };

  if (media.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma mídia disponível para download</p>
      </div>
    );
  }

  const stats = getMediaStats();
  const totalSize = getTotalSize();

  return (
    <div className="space-y-6">
      {/* Estatísticas das Mídias */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Resumo das Mídias
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{media.length}</div>
            <div className="text-sm text-slate-600">Total</div>
          </div>
          {stats.image && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.image}</div>
              <div className="text-sm text-slate-600">Imagens</div>
            </div>
          )}
          {stats.video && (
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.video}</div>
              <div className="text-sm text-slate-600">Vídeos</div>
            </div>
          )}
          {stats.audio && (
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.audio}</div>
              <div className="text-sm text-slate-600">Áudios</div>
            </div>
          )}
          {stats.document && (
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.document}</div>
              <div className="text-sm text-slate-600">Documentos</div>
            </div>
          )}
        </div>
        {totalSize > 0 && (
          <div className="text-center text-sm text-slate-600">
            Tamanho total: <span className="font-semibold">{formatFileSize(totalSize)}</span>
          </div>
        )}
      </div>

      {/* Botão de Download de Todas as Mídias */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={downloadAllMedia}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Preparando download... {Math.round(downloadProgress)}%
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Baixar Todas as Mídias (.zip)
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {isDownloading && (
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}

      {/* Lista de Mídias Individuais */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900">Mídias Individuais</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {media.map((mediaItem) => (
            <div
              key={mediaItem.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 text-slate-500">
                  {getMediaIcon(mediaItem.media_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate" title={mediaItem.file_name}>
                    {mediaItem.file_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="capitalize">{mediaItem.media_type}</span>
                    {mediaItem.file_size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(mediaItem.file_size)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => downloadSingleMedia(mediaItem)}
                className="flex-shrink-0 p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Baixar arquivo"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
