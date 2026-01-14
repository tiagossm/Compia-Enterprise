import { useState } from 'react';
import Layout from '@/react-app/components/Layout';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Database,
  Mail,
  Save,
  RefreshCw
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: 'Compia',
    adminEmail: 'admin@exemplo.com',
    notificationsEnabled: true,
    emailAlerts: true,
    autoBackup: true,
    reminderDays: 7
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // Simular salvamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    alert('Configurações salvas com sucesso!');
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Compact Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-600 text-sm mt-1">
            Gerencie as configurações do sistema e preferências
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <nav className="space-y-2">
              <a href="#general" className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                <SettingsIcon className="w-4 h-4 mr-3" />
                Geral
              </a>
              <a href="#users" className="flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg">
                <User className="w-4 h-4 mr-3" />
                Usuários
              </a>
              <a href="#notifications" className="flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg">
                <Bell className="w-4 h-4 mr-3" />
                Notificações
              </a>
              <a href="#security" className="flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg">
                <Shield className="w-4 h-4 mr-3" />
                Segurança
              </a>
              <a href="#backup" className="flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg">
                <Database className="w-4 h-4 mr-3" />
                Backup
              </a>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Settings */}
            <div id="general" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
                Configurações Gerais
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email do Administrador
                  </label>
                  <input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lembrete de Inspeções (dias)
                  </label>
                  <select
                    value={settings.reminderDays}
                    onChange={(e) => handleChange('reminderDays', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 dia</option>
                    <option value={3}>3 dias</option>
                    <option value={7}>7 dias</option>
                    <option value={14}>14 dias</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div id="notifications" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
                Notificações
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 text-slate-400 mr-3" />
                    <div>
                      <p className="font-medium text-slate-900">Notificações do Sistema</p>
                      <p className="text-sm text-slate-500">Receber notificações sobre eventos importantes</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-slate-400 mr-3" />
                    <div>
                      <p className="font-medium text-slate-900">Alertas por Email</p>
                      <p className="text-sm text-slate-500">Enviar alertas importantes por email</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailAlerts}
                      onChange={(e) => handleChange('emailAlerts', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Backup Settings */}
            <div id="backup" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-heading text-xl font-semibold text-slate-900 mb-6">
                Backup e Segurança
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="w-5 h-5 text-slate-400 mr-3" />
                    <div>
                      <p className="font-medium text-slate-900">Backup Automático</p>
                      <p className="text-sm text-slate-500">Fazer backup automático dos dados diariamente</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => handleChange('autoBackup', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button className="flex items-center px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Fazer Backup Agora
                  </button>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <h3 className="font-heading text-lg font-semibold text-slate-900 mb-4">
                Informações do Sistema
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Versão:</span>
                  <span className="ml-2 text-slate-700">1.0.0</span>
                </div>
                <div>
                  <span className="text-slate-500">Última Atualização:</span>
                  <span className="ml-2 text-slate-700">28/07/2025</span>
                </div>
                <div>
                  <span className="text-slate-500">Banco de Dados:</span>
                  <span className="ml-2 text-slate-700">SQLite (Cloudflare D1)</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <span className="ml-2 text-green-600">Operacional</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
