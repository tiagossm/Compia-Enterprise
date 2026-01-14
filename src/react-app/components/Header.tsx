import { Menu, Sun, Moon, Sunset } from 'lucide-react';
import CompiaLogo from './CompiaLogo';
import { useLocation } from 'react-router-dom';
import { OrganizationSelector } from './OrganizationSelector';

interface HeaderProps {
    onMenuClick: () => void;
    pageTitle?: string;
    children?: React.ReactNode;
    actionButton?: React.ReactNode;
}

export default function Header({ onMenuClick, pageTitle, children, actionButton }: HeaderProps) {
    const location = useLocation();

    // Helper to determine breadcrumb/title based on location if not provided
    const getPageTitle = () => {
        if (pageTitle) return pageTitle;

        const path = location.pathname;
        if (path.includes('/inspections/')) return 'Detalhes da Inspeção';
        if (path === '/inspections') return 'Minhas Inspeções';
        if (path === '/inspections/new') return 'Nova Inspeção';
        if (path === '/') return 'Dashboard';
        if (path === '/action-plans') return 'Planos de Ação';
        if (path === '/activities' || path === '/atividades') return 'Central de Atividades';
        if (path === '/checklists') return 'Checklists';
        if (path === '/checklists/ai-generate') return 'IA Generator';
        if (path === '/reports') return 'Relatórios';
        if (path === '/settings') return 'Configurações';
        if (path === '/users') return 'Usuários';
        if (path === '/organizations') return 'Organizações';
        if (path === '/permissions') return 'Permissões';
        return 'Portal Compia';
    };

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return { text: 'Bom dia', Icon: Sun, emoji: '☀️' };
        } else if (hour >= 12 && hour < 18) {
            return { text: 'Boa tarde', Icon: Sunset, emoji: '🌤️' };
        } else {
            return { text: 'Boa noite', Icon: Moon, emoji: '🌙' };
        }
    };

    const greeting = getGreeting();
    const isHome = location.pathname === '/';

    return (
        <header className="bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between sticky top-0 z-30">
            {/* MOBILE/TABLET: Menu + Logo */}
            <div className="flex items-center gap-3 xl:hidden">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    <Menu size={24} />
                </button>
                <div className="h-8 flex items-center">
                    <CompiaLogo size={40} textSize={20} />
                </div>
            </div>

            {/* DESKTOP (xl+): Title or Greeting */}
            <div className="hidden xl:flex items-center gap-4">
                {isHome ? (
                    <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                        <span>{greeting.emoji}</span>
                        {greeting.text}!
                        <span className="text-slate-400 font-normal text-base">·</span>
                        <span className="text-slate-500 font-normal text-base">
                            {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                        </span>
                    </h1>
                ) : (
                    <h1 className="text-2xl font-bold text-slate-800">
                        {getPageTitle()}
                    </h1>
                )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
                <OrganizationSelector />

                {/* Primary Page Action (Dynamic) */}
                {actionButton && (
                    <div className="mr-1">
                        {actionButton}
                    </div>
                )}

                {/* Global Actions (Notification, User Profile) */}
                {children}
            </div>
        </header>
    );
}
