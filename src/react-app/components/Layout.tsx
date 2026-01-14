import { useState, ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CompiaLogo from '@/react-app/components/CompiaLogo';
import Header from '@/react-app/components/Header';
import { useAuth } from '@/react-app/context/AuthContext';
import { ExtendedMochaUser } from '@/shared/user-types';
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Users,
  Building2,
  LogOut,
  X,
  ChevronDown,
  PlusCircle,
  FileCheck,
  Activity,
  BarChart3,
  Cloud,
  Lock,
  Blocks,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import NotificationSystem from '@/react-app/components/NotificationSystem';
import UsageIndicator from '@/react-app/components/UsageIndicator';
import FloatingAiAssistant from '@/react-app/components/FloatingAiAssistant';
import { SyncStatusIndicator } from '@/react-app/components/SyncStatusIndicator';
import { OfflinePinModal } from '@/react-app/components/OfflinePinModal';

interface LayoutProps {
  children: ReactNode;
  actionButton?: ReactNode;
}

export default function Layout({ children, actionButton }: LayoutProps) {
  const { user, signOut } = useAuth();
  const extendedUser = user as ExtendedMochaUser;
  const profile = extendedUser?.profile;

  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [orgUsage, setOrgUsage] = useState<{ current: number; limit: number; resetDate: string } | null>(null);

  // State for collapsible groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Ferramentas': false,
    'Análise': false,
    'Administração': false
  });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrgUsage(profile.organization_id);
    }

    const handleUsageUpdate = () => {
      console.log('[AI-USAGE-LAYOUT] 👂 Event caught: ai_usage_updated. Org ID:', profile?.organization_id);
      if (profile?.organization_id) {
        fetchOrgUsage(profile.organization_id);
      } else {
        console.warn('[AI-USAGE-LAYOUT] No Organization ID found in profile when event received.');
      }
    };

    console.log('[AI-USAGE-LAYOUT] Listener mounted for org:', profile?.organization_id);
    window.addEventListener('ai_usage_updated', handleUsageUpdate);

    return () => {
      window.removeEventListener('ai_usage_updated', handleUsageUpdate);
    };
  }, [profile?.organization_id]);

  const fetchOrgUsage = async (orgId: number | string) => {
    try {
      console.log(`[AI-USAGE-LAYOUT] Fetching usage for org: ${orgId}`);
      const response = await fetch(`/api/organizations/${orgId}`);
      if (response.ok) {
        const data = await response.json();
        const orgData = data.organization || data;
        console.log('[AI-USAGE-LAYOUT] Fetched usage data:', { current: orgData.ai_usage_count, limit: orgData.ai_limit });
        setOrgUsage({
          current: orgData.ai_usage_count || 0,
          limit: orgData.ai_limit || 100,
          resetDate: orgData.ai_reset_date
        });
      } else {
        console.error('[AI-USAGE-LAYOUT] Failed to fetch usage. Status:', response.status);
      }
    } catch (e) {
      console.error('[AI-USAGE-LAYOUT] Exception fetching org usage', e);
    }
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };



  const adminNavigation = [
    { name: 'Usuários', href: '/users', icon: Users },
    { name: 'Organizações', href: '/organizations', icon: Building2 },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const NavItem = ({ item }: { item: any }) => {
    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
    return (
      <Link
        to={item.href}
        className={`
          flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group
          ${isActive
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-slate-500 hover:bg-gray-50 hover:text-primary'
          }
        `}
        onClick={() => setIsSidebarOpen(false)}
      >
        <item.icon
          size={22}
          strokeWidth={1.5}
          className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'}`}
        />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="h-screen w-full max-w-full bg-white flex overflow-hidden font-sans text-slate-800 antialiased">

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* --- SIDEBAR BRANCA --- */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 shadow-xl shadow-slate-200/50 xl:shadow-none flex flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          xl:relative xl:translate-x-0
        `}
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-slate-50 shrink-0">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <CompiaLogo size={42} textSize={30} />
          </Link>
          <button
            className="xl:hidden ml-auto text-slate-400 hover:text-primary"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">

          {/* Visão Geral */}
          <div className="space-y-1 mb-2">
            <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Visão Geral</p>
            <NavItem item={{ name: 'Dashboard', href: '/', icon: LayoutDashboard }} />
            <NavItem item={{ name: 'Relatórios', href: '/reports', icon: BarChart3 }} />
          </div>

          {/* Operação */}
          <div className="space-y-1 mb-2">
            <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Operação</p>
            <NavItem item={{ name: 'Nova Inspeção', href: '/inspections/new', icon: PlusCircle }} />
            <NavItem item={{ name: 'Inspeções', href: '/inspections', icon: ClipboardList }} />
            <NavItem item={{ name: 'Agenda', href: '/agenda', icon: Calendar }} />
            <NavItem item={{ name: 'Planos de Ação', href: '/action-plans', icon: Blocks }} />
            <NavItem item={{ name: 'Checklists', href: '/checklists', icon: FileCheck }} />
            <NavItem item={{ name: 'Atividades', href: '/activities', icon: Activity }} />
          </div>

          {/* Admin Section Collapsible */}
          {(profile?.role === 'system_admin' || profile?.role === 'sys_admin' || profile?.role === 'admin' || profile?.role === 'org_admin') && (
            <div className="pt-2 pb-2">
              <button
                onClick={() => toggleGroup('Administração')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-primary hover:bg-slate-50 rounded-lg transition-colors group"
              >
                <span>Administração</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 text-slate-400 group-hover:text-primary ${expandedGroups['Administração'] ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${expandedGroups['Administração'] ? 'max-h-screen opacity-100 mt-1' : 'max-h-0 opacity-0'
                  }`}
              >
                {/* System Admin Only */}
                {(profile?.role === 'system_admin' || profile?.role === 'sys_admin') && (
                  <>
                    <NavItem item={{ name: 'Painel SaaS', href: '/admin/saas-dashboard', icon: Activity }} />
                    <NavItem item={{ name: 'Permissões', href: '/settings/permissions', iconSrc: '/assets/icons/icon-lock.png', icon: Lock }} />
                    <NavItem item={{ name: 'Sinc. Dados', href: '/admin/data-sync', iconSrc: '/assets/icons/icon-cloud.png', icon: Cloud }} />
                    <NavItem item={{ name: 'Logs Auditoria', href: '/admin/audit', icon: Activity }} />
                  </>
                )}

                {/* Admins & System Admins */}
                {(profile?.role === 'system_admin' || profile?.role === 'sys_admin' || profile?.role === 'admin') &&
                  adminNavigation.map(item => <NavItem key={item.name} item={item} />)
                }

                {/* Org Admin */}
                {(profile?.role === 'org_admin') && (
                  <NavItem item={{ name: 'Minha Organização', href: '/organizations', iconSrc: '/assets/icons/icon-building.png', icon: Building2 }} />
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="pt-2 mt-auto">
            <div className="border-t border-slate-100 my-2"></div>
            <NavItem item={{ name: 'Integrações', href: '/integrations', icon: LinkIcon }} />
            <NavItem item={{ name: 'Configurações', href: '/settings', iconSrc: '/assets/icons/icon-settings.png', icon: Settings }} />
          </div>

        </nav>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* HEADER */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} actionButton={actionButton}>
          {/* Sync Status */}
          <SyncStatusIndicator />

          {/* Usage Indicator */}
          {orgUsage && (
            <UsageIndicator
              currentUsage={orgUsage.current}
              limit={orgUsage.limit}
              className="hidden sm:block mr-2"
            />
          )}

          {/* Notification System */}
          <NotificationSystem />

          {/* Dropdown with Google Avatar & Profile Info */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 p-2 pl-3 rounded-full transition-colors border border-transparent hover:border-gray-100 group"
            >
              {/* Google Avatar or Initials Fallback */}
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 border border-gray-200 overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                {extendedUser?.google_user_data?.picture ? (
                  <img
                    src={extendedUser.google_user_data.picture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>

              {/* Name & Role */}
              <div className="text-left hidden md:block">
                <span className="text-sm font-bold text-slate-800 block leading-tight">
                  {profile?.name ? profile.name.split(' ')[0] : (user?.email?.split('@')[0] || 'Minha Conta')}
                </span>
                <span className="text-xs font-medium text-slate-500 block leading-tight mt-0.5 capitalize">
                  {profile?.role?.replace(/_/g, ' ').replace('sys', 'System') || 'Visitante'}
                </span>
              </div>
              <ChevronDown size={14} className="text-gray-400 group-hover:text-primary transition-colors" />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-1 z-20 border border-gray-100 transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                    <p className="text-sm font-bold text-slate-800">{profile?.name || 'Usuário'}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <Link to="/profile" className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-2">
                    <Users size={16} /> Meu Perfil
                  </Link>
                  <Link to="/settings" className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-2">
                    <Settings size={16} /> Preferências
                  </Link>
                  <div className="my-1 border-t border-gray-100"></div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </Header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-32 bg-white relative max-w-full">
          <div className="max-w-7xl mx-auto space-y-6 w-full overflow-x-hidden">
            {children}
          </div>
        </main>

      </div>

      {/* Floating AI Assistant */}
      <FloatingAiAssistant />
      <OfflinePinModal />
    </div>
  );
}
