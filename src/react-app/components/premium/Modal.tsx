import React, { useEffect } from 'react';
import { cn } from '@/react-app/utils/cn';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    className,
    size = 'md',
    showCloseButton = true
}: ModalProps) {

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-xl",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
        full: "max-w-full m-4 h-[calc(100vh-2rem)]"
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:items-center sm:justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={cn(
                    "relative w-full bg-white shadow-2xl transition-all duration-300 flex flex-col max-h-[90vh]", // Default max-height for safety
                    // Mobile: Drawer-like or bottom aligned if needed, but centering usually works best
                    "fixed bottom-0 sm:relative sm:bottom-auto sm:rounded-2xl rounded-t-2xl",
                    sizeClasses[size],
                    className
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 shrink-0">
                        {title && <div className="text-lg font-semibold text-slate-900">{title}</div>}

                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-4 md:p-6 overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function ModalFooter({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-4 md:p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0 flex items-center gap-3", className)}>
            {children}
        </div>
    );
}
