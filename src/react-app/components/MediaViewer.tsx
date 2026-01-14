import { useState } from 'react';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { InspectionMediaType } from '@/shared/types';

interface MediaViewerProps {
  media: InspectionMediaType[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function MediaViewer({ media, currentIndex, isOpen, onClose }: MediaViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen || !media.length) return null;

  const currentMedia = media[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < media.length - 1;

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      resetZoom();
      const event = new CustomEvent('mediaNavigate', { detail: { direction: 'previous' } });
      window.dispatchEvent(event);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      resetZoom();
      const event = new CustomEvent('mediaNavigate', { detail: { direction: 'next' } });
      window.dispatchEvent(event);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const downloadMedia = (mediaItem: InspectionMediaType) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center" role="dialog" aria-labelledby="media-viewer-title" aria-describedby="media-viewer-description">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <h3 id="media-viewer-title" className="text-lg font-semibold">{currentMedia.file_name}</h3>
            <span id="media-viewer-description" className="text-sm opacity-75">
              {currentIndex + 1} de {media.length}
            </span>
            {currentMedia.file_size && (
              <span className="text-sm opacity-75">
                {formatFileSize(currentMedia.file_size)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {currentMedia.media_type === 'image' && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-sm min-w-[4rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={() => downloadMedia(currentMedia)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Baixar mídia"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {hasPrevious && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Media Content */}
      <div
        className="w-full h-full flex items-center justify-center cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {currentMedia.media_type === 'image' && (
          <img
            src={currentMedia.file_url}
            alt={currentMedia.file_name}
            className="max-w-none max-h-none object-contain select-none"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            draggable={false}
          />
        )}

        {currentMedia.media_type === 'video' && (
          <video
            src={currentMedia.file_url}
            controls
            className="max-w-full max-h-full"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
          />
        )}

        {currentMedia.media_type === 'audio' && (
          <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">
                {currentMedia.file_name}
              </h3>
              <p className="text-slate-400 text-sm">Arquivo de áudio</p>
            </div>
            <audio
              src={currentMedia.file_url}
              controls
              className="w-full"
              style={{ background: 'transparent' }}
            />
          </div>
        )}

        {currentMedia.media_type === 'document' && (
          <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">
              {currentMedia.file_name}
            </h3>
            <p className="text-slate-400 text-sm mb-4">Documento</p>
            <button
              onClick={() => downloadMedia(currentMedia)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Baixar Documento
            </button>
          </div>
        )}
      </div>

      {/* Keyboard navigation hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        Use as setas ← → para navegar
      </div>
    </div>
  );
}
