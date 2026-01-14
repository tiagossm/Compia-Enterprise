import React from 'react';
import { cn } from '@/react-app/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'default' | 'glass' | 'flat' | 'outline';
    hoverEffect?: boolean;
}

export function Card({
    children,
    className,
    variant = 'default',
    hoverEffect = false,
    ...props
}: CardProps) {
    const baseStyles = "rounded-xl transition-all duration-300";

    const variants = {
        default: "bg-white shadow-sm border border-slate-200",
        glass: "bg-white/80 backdrop-blur-md border border-white/20 shadow-lg",
        flat: "bg-slate-50 border border-transparent",
        outline: "bg-transparent border border-slate-200"
    };

    const hoverStyles = hoverEffect
        ? "hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200"
        : "";

    return (
        <div
            className={cn(
                baseStyles,
                variants[variant],
                hoverStyles,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-4 md:p-6 border-b border-slate-100", className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn("text-lg font-semibold text-slate-900 tracking-tight", className)} {...props}>
            {children}
        </h3>
    );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-4 md:p-6", className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-4 md:p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl", className)} {...props}>
            {children}
        </div>
    );
}
