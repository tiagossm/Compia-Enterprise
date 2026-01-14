import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/react-app/utils/cn';

interface ActionMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
    className?: string;
    disabled?: boolean;
}

interface ActionMenuProps {
    items: ActionMenuItem[];
    triggerClassName?: string;
}

export default function ActionMenu({ items, triggerClassName }: ActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={cn("relative", isOpen && "z-[100]")} ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={cn(
                    "p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors",
                    triggerClassName
                )}
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onClick(e);
                                setIsOpen(false);
                            }}
                            disabled={item.disabled}
                            className={cn(
                                "w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors",
                                item.className,
                                item.disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
