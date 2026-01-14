import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'warning',
    isLoading = false
}: ConfirmDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Focus on confirm button when dialog opens
            confirmButtonRef.current?.focus();

            // Handle ESC key to close
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };

            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
                    iconBg: 'bg-red-100',
                    confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
                    iconBg: 'bg-yellow-100',
                    confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                };
            case 'info':
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
                    iconBg: 'bg-blue-100',
                    confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start gap-4 p-6 pb-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
                            {title}
                        </h3>
                        <p id="confirm-dialog-description" className="mt-2 text-sm text-slate-600">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label="Fechar diálogo"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${styles.confirmBtn}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processando...
                            </span>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
