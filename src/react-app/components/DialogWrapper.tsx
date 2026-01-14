import React from 'react';

interface DialogWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export default function DialogWrapper({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = "",
  maxWidth = "max-w-md"
}: DialogWrapperProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-xl shadow-xl ${maxWidth} w-full ${className}`}
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título oculto visualmente mas acessível para screen readers */}
        <h2 id="dialog-title" className="sr-only">
          {title}
        </h2>
        {description && (
          <p id="dialog-description" className="sr-only">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
