
import React from 'react';
import { CheckCircle2, AlertCircle, Star } from 'lucide-react';

export const formatResponseValue = (value: any, fieldType: string, useJsx: boolean = true) => {
    // Basic null checks
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return useJsx ? <span className="text-slate-400 italic">Não respondido</span> : 'Não respondido';
    }

    switch (fieldType) {
        case 'boolean':
            const isTrue = value === true || value === 'true' || value === 1 || value === '1';
            const isFalse = value === false || value === 'false' || value === 0 || value === '0';

            if (!isTrue && !isFalse) {
                return useJsx ? <span className="text-slate-400 italic">Não respondido</span> : 'Não respondido';
            }

            if (!useJsx) {
                return isTrue ? 'Conforme ✓' : 'Não Conforme ✗';
            }

            return (
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${isTrue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isTrue ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Conforme
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-4 h-4" />
                            Não Conforme
                        </>
                    )}
                </span>
            );

        case 'rating':
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < 1 || numValue > 5) {
                return useJsx ? <span className="text-slate-400 italic">Não respondido</span> : 'Não respondido';
            }

            if (!useJsx) return `${numValue}/5 estrelas`;

            return (
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`w-5 h-5 ${star <= numValue ? 'text-yellow-400 fill-current' : 'text-slate-300'}`}
                        />
                    ))}
                    <span className="ml-2 text-sm font-medium text-slate-700">({numValue}/5)</span>
                </div>
            );

        case 'multiselect':
            let items = value;
            if (typeof value === 'string') {
                try {
                    items = JSON.parse(value);
                } catch {
                    items = value.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                }
            }
            if (!Array.isArray(items) || items.length === 0) {
                return useJsx ? <span className="text-slate-400 italic">Não respondido</span> : 'Não respondido';
            }

            if (!useJsx) return items.join(', ');

            return (
                <div className="flex flex-wrap gap-1">
                    {items.map((item: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                            {String(item)}
                        </span>
                    ))}
                </div>
            );

        case 'select':
        case 'radio':
            if (!useJsx) return String(value);
            return (
                <span className="px-3 py-1 bg-slate-100 text-slate-800 text-sm rounded font-medium">
                    {String(value)}
                </span>
            );

        case 'number':
            if (!useJsx) return String(value);
            return (
                <span className="px-3 py-1 bg-blue-50 text-blue-800 text-sm rounded font-medium">
                    {String(value)}
                </span>
            );

        case 'text':
        case 'textarea':
            if (!useJsx) return String(value);
            return (
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{String(value)}</p>
                </div>
            );

        default:
            if (!useJsx) return String(value);
            return (
                <span className="text-slate-700 text-sm">{String(value)}</span>
            );
    }
};
