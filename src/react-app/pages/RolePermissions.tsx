import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import {
  Settings,
  Shield,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface Permission {
  id: number;
  role: string;
  permission_type: string;
  is_allowed: boolean;
  organization_id?: number;
}

interface PermissionGroup {
  category: string;
  permissions: {
    type: string;
    label: string;
    description: string;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: 'Checklists',
    permissions: [
      { type: 'checklist_create', label: 'Criar Checklists', description: 'Permite criar novos templates de checklist' },
      { type: 'checklist_edit_own', label: 'Editar Próprios', description: 'Permite editar checklists criados pelo próprio usuário' },
      { type: 'checklist_edit_org', label: 'Editar da Organização', description: 'Permite editar checklists da organização' },
      { type: 'checklist_edit_all', label: 'Editar Todos', description: 'Permite editar qualquer checklist no sistema' },
      { type: 'checklist_delete_own', label: 'Excluir Próprios', description: 'Permite excluir checklists criados pelo próprio usuário' },
      { type: 'checklist_delete_org', label: 'Excluir da Organização', description: 'Permite excluir checklists da organização' },
      { type: 'checklist_delete_all', label: 'Excluir Todos', description: 'Permite excluir qualquer checklist no sistema' },
      { type: 'checklist_view_org', label: 'Ver da Organização', description: 'Permite visualizar checklists da organização' },
      { type: 'checklist_view_all', label: 'Ver Todos', description: 'Permite visualizar todos os checklists do sistema' }
    ]
  },
  {
    category: 'Inspeções',
    permissions: [
      { type: 'inspection_create', label: 'Criar Inspeções', description: 'Permite criar novas inspeções' },
      { type: 'inspection_edit_own', label: 'Editar Próprias', description: 'Permite editar inspeções criadas pelo próprio usuário' },
      { type: 'inspection_edit_org', label: 'Editar da Organização', description: 'Permite editar inspeções da organização' },
      { type: 'inspection_edit_all', label: 'Editar Todas', description: 'Permite editar qualquer inspeção no sistema' },
      { type: 'inspection_delete_own', label: 'Excluir Próprias', description: 'Permite excluir inspeções criadas pelo próprio usuário' },
      { type: 'inspection_delete_org', label: 'Excluir da Organização', description: 'Permite excluir inspeções da organização' },
      { type: 'inspection_delete_all', label: 'Excluir Todas', description: 'Permite excluir qualquer inspeção no sistema' },
      { type: 'inspection_view_org', label: 'Ver da Organização', description: 'Permite visualizar inspeções da organização' },
      { type: 'inspection_view_all', label: 'Ver Todas', description: 'Permite visualizar todas as inspeções do sistema' }
    ]
  },
  {
    category: 'Inteligência Artificial',
    permissions: [
      { type: 'ai_analysis', label: 'Análise de Conformidade', description: 'Permite solicitar análise de IA para itens de inspeção' },
      { type: 'ai_checklist_create', label: 'Criar Checklist com IA', description: 'Permite gerar checklists automaticamente usando IA' },
      { type: 'ai_action_plan', label: 'Plano de Ação com IA', description: 'Permite gerar planos de ação automaticamente usando IA' },
      { type: 'ai_transcription', label: 'Transcrição de Áudio', description: 'Permite transcrever áudios usando IA' }
    ]
  },
  {
    category: 'Planos de Ação',
    permissions: [
      { type: 'action_plan_create', label: 'Criar Planos', description: 'Permite criar novos planos de ação' },
      { type: 'action_plan_edit_own', label: 'Editar Próprios', description: 'Permite editar planos criados pelo próprio usuário' },
      { type: 'action_plan_edit_org', label: 'Editar da Organização', description: 'Permite editar planos da organização' },
      { type: 'action_plan_edit_all', label: 'Editar Todos', description: 'Permite editar qualquer plano no sistema' }
    ]
  },
  {
    category: 'Relatórios',
    permissions: [
      { type: 'report_view', label: 'Visualizar Relatórios', description: 'Permite visualizar relatórios e dashboards' },
      { type: 'report_export', label: 'Exportar Relatórios', description: 'Permite exportar relatórios em PDF/Excel' }
    ]
  },
  {
    category: 'Usuários',
    permissions: [
      { type: 'users_view', label: 'Visualizar Usuários', description: 'Permite visualizar lista de usuários' },
      { type: 'users_manage', label: 'Gerenciar Usuários', description: 'Permite criar, editar e desativar usuários' },
      { type: 'users_approve', label: 'Aprovar Cadastros', description: 'Permite aprovar ou rejeitar novos cadastros' }
    ]
  },
  {
    category: 'Organizações',
    permissions: [
      { type: 'org_view', label: 'Visualizar Organizações', description: 'Permite visualizar dados da organização' },
      { type: 'org_manage', label: 'Gerenciar Organizações', description: 'Permite criar e editar organizações' }
    ]
  },
  {
    category: 'Sistema',
    permissions: [
      { type: 'settings_view', label: 'Visualizar Configurações', description: 'Permite visualizar configurações do sistema' },
      { type: 'settings_manage', label: 'Gerenciar Configurações', description: 'Permite alterar configurações do sistema' },
      { type: 'permissions_manage', label: 'Gerenciar Permissões', description: 'Permite configurar permissões de papéis' }
    ]
  }
];

const ROLES = [
  { value: 'system_admin', label: 'Administrador do Sistema', color: 'bg-red-100 text-red-800' },
  { value: 'org_admin', label: 'Administrador da Organização', color: 'bg-blue-100 text-blue-800' },
  { value: 'manager', label: 'Gerente', color: 'bg-green-100 text-green-800' },
  { value: 'inspector', label: 'Inspetor/Técnico', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'client', label: 'Cliente', color: 'bg-gray-100 text-gray-800' }
];

export default function RolePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/role-permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionValue = (role: string, permissionType: string): boolean => {
    const permission = permissions.find(p => p.role === role && p.permission_type === permissionType);

    // Check if there are unsaved changes
    const changeKey = `${role}-${permissionType}`;
    if (changeKey in changes) {
      return changes[changeKey];
    }

    return permission?.is_allowed || false;
  };

  const togglePermission = (role: string, permissionType: string) => {
    const changeKey = `${role}-${permissionType}`;
    const currentValue = getPermissionValue(role, permissionType);

    setChanges(prev => ({
      ...prev,
      [changeKey]: !currentValue
    }));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(changes).map(([key, value]) => {
        const [role, permissionType] = key.split('-');
        return { role, permission_type: permissionType, is_allowed: value };
      });

      const response = await fetch('/api/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (response.ok) {
        setChanges({});
        await fetchPermissions();
        alert('Permissões salvas com sucesso!');
      } else {
        throw new Error('Erro ao salvar permissões');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar permissões. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setChanges({});
  };

  const hasChanges = Object.keys(changes).length > 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              Configuração de Permissões
            </h1>
            <p className="text-slate-600 text-sm">
              Configure as permissões específicas para cada perfil de usuário
            </p>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={resetChanges}
                className="flex items-center px-3 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Cancelar
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Salvar
              </button>
            </div>
          )}
        </div>

        {/* Alert for changes */}
        {hasChanges && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
              <span className="text-amber-800 font-medium">
                Você tem {Object.keys(changes).length} alteração(ões) não salva(s)
              </span>
            </div>
          </div>
        )}

        {/* Permission Groups */}
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.category} className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-heading text-xl font-semibold text-slate-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                {group.category}
              </h2>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">
                        Permissão
                      </th>
                      {ROLES.map((role) => (
                        <th key={role.value} className="text-center py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${role.color}`}>
                            {role.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.permissions.map((permission) => (
                      <tr key={permission.type} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {permission.label}
                            </div>
                            <div className="text-sm text-slate-500">
                              {permission.description}
                            </div>
                          </div>
                        </td>
                        {ROLES.map((role) => {
                          const isAllowed = getPermissionValue(role.value, permission.type);
                          const changeKey = `${role.value}-${permission.type}`;
                          const hasChange = changeKey in changes;

                          return (
                            <td key={role.value} className="py-4 px-4 text-center">
                              <button
                                onClick={() => togglePermission(role.value, permission.type)}
                                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${hasChange
                                  ? 'ring-2 ring-blue-500 ring-offset-2'
                                  : ''
                                  } ${isAllowed
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                  }`}
                                title={isAllowed ? 'Permitido' : 'Negado'}
                              >
                                {isAllowed ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Settings className="w-6 h-6 text-blue-600 mr-3 mt-1" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                Como funcionam as permissões
              </h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• <strong>Sistema de herança:</strong> Permissões mais específicas sobrescrevem as gerais</li>
                <li>• <strong>Próprios:</strong> Permite ações apenas em itens criados pelo usuário</li>
                <li>• <strong>Organização:</strong> Permite ações em itens da mesma organização</li>
                <li>• <strong>Todos:</strong> Permite ações em qualquer item do sistema</li>
                <li>• <strong>Alterações:</strong> São aplicadas imediatamente após salvar</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
