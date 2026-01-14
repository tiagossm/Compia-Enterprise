import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/react-app/utils/auth';
// import { useAuth } from '@/react-app/context/AuthContext';
// import { ExtendedMochaUser } from '@/shared/user-types';
import {
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'urgent';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  timestamp: Date;
  read: boolean;
}

export default function NotificationSystem() {
  // const { user } = useAuth();
  // const extendedUser = user as ExtendedMochaUser;  

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSmartNotifications();
  }, []);

  const generateSmartNotifications = async () => {
    try {
      // Fetch dashboard data to generate contextual notifications
      const statsResponse = await fetchWithAuth('/api/dashboard/stats');
      const actionResponse = await fetchWithAuth('/api/dashboard/action-plan-summary');

      let stats = null;
      let actionSummary = null;

      if (statsResponse.ok) {
        stats = await statsResponse.json();
      }

      if (actionResponse.ok) {
        actionSummary = await actionResponse.json();
      }

      const smartNotifications: Notification[] = [];

      // Fetch Real Notifications from DB
      try {
        const dbNotifResponse = await fetchWithAuth('/api/notifications?limit=20');
        if (dbNotifResponse.ok) {
          const data = await dbNotifResponse.json();
          if (data.notifications) {
            const realNotifs = data.notifications.map((n: any) => ({
              id: n.id,
              type: n.type || 'info',
              title: n.title,
              message: n.message,
              action: n.link ? { label: 'Ver', href: n.link } : undefined,
              timestamp: new Date(n.created_at),
              read: n.read || false
            }));
            smartNotifications.push(...realNotifs);
          }
        }
      } catch (err) {
        console.error('Failed to fetch DB notifications', err);
      }

      // Generate notifications based on data
      if (actionSummary?.overdue_actions > 0) {
        smartNotifications.push({
          id: 'overdue-actions',
          type: 'urgent',
          title: 'Ações em Atraso',
          message: `${actionSummary.overdue_actions} ações estão atrasadas e precisam de atenção imediata`,
          action: {
            label: 'Ver Ações',
            href: '/action-plans'
          },
          timestamp: new Date(),
          read: false
        });
      }

      if (actionSummary?.upcoming_deadline > 0) {
        smartNotifications.push({
          id: 'upcoming-deadlines',
          type: 'warning',
          title: 'Prazos Próximos',
          message: `${actionSummary.upcoming_deadline} ações vencem nos próximos 7 dias`,
          action: {
            label: 'Revisar Prazos',
            href: '/action-plans'
          },
          timestamp: new Date(),
          read: false
        });
      }

      if (stats?.pending > 0) {
        smartNotifications.push({
          id: 'pending-inspections',
          type: 'info',
          title: 'Inspeções Pendentes',
          message: `Você tem ${stats.pending} inspeções aguardando execução`,
          action: {
            label: 'Ver Inspeções',
            href: '/inspections'
          },
          timestamp: new Date(),
          read: false
        });
      }

      // Success notifications
      if (stats?.completed > 0) {
        const completionRate = ((stats.completed / stats.total) * 100).toFixed(0);
        if (parseInt(completionRate) >= 80) {
          smartNotifications.push({
            id: 'high-completion',
            type: 'success',
            title: 'Excelente Performance!',
            message: `${completionRate}% das suas inspeções foram concluídas`,
            timestamp: new Date(),
            read: false
          });
        }
      }

      setNotifications(smartNotifications);
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );

    // Call Backend if it's a real notification (UUID check roughly)
    if (id.length > 20) {
      try {
        await fetchWithAuth(`/api/notifications/${id}/read`, { method: 'POST' });
      } catch (e) {
        console.error('Failed to mark read', e);
      }
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'urgent':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Notificações</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-500 mt-1">
                  {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-slate-100 ${getNotificationColors(notification.type)} ${!notification.read ? 'border-l-4' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 text-sm">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.action && (
                            <a
                              href={notification.action.href}
                              onClick={() => {
                                markAsRead(notification.id);
                                setShowNotifications(false);
                              }}
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
                            >
                              {notification.action.label}
                              <TrendingUp className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="text-slate-400 hover:text-slate-600 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {notification.timestamp.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {notifications.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma notificação</p>
                <p className="text-slate-400 text-sm">
                  Você está em dia com suas atividades!
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
