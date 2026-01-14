import React from 'react';
import { cn } from '@/react-app/utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    loading?: boolean;
    icon?: React.ReactNode;
}

export function Button({
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    ...props
}: ButtonProps) {

    const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-blue-200 focus:ring-blue-600",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 focus:ring-slate-500",
        outline: "bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-400",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400",
        danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 focus:ring-red-500"
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10 p-2"
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!loading && icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
}
