import { useState } from 'react';
import {
  Check,
  X,
  Trash2,
  UserPlus,
  Download,
  Archive,
  RotateCcw,
  Settings,
  ChevronDown
} from 'lucide-react';
import { Organization } from '../../shared/types';

interface OrganizationBulkActionsProps {
  selectedOrganizations: Organization[];
  onClearSelection: () => void;
  onBulkDelete: (organizationIds: number[]) => void;
  onBulkActivate: (organizationIds: number[]) => void;
  onBulkDeactivate: (organizationIds: number[]) => void;
  onBulkExport: (organizationIds: number[]) => void;
  onBulkInviteUsers: (organizationIds: number[]) => void;
}

export default function OrganizationBulkActions({
  selectedOrganizations,
  onClearSelection,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  onBulkExport,
  onBulkInviteUsers
}: OrganizationBulkActionsProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  if (selectedOrganizations.length === 0) return null;

  const activeCount = selectedOrganizations.filter(org => org.is_active).length;
  const inactiveCount = selectedOrganizations.length - activeCount;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 min-w-96">
        {/* Contador de selecionados */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Check className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {selectedOrganizations.length} organização(ões) selecionada(s)
          </span>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2">
          {/* Ativar/Desativar */}
          {inactiveCount > 0 && (
            <button
              onClick={() => onBulkActivate(selectedOrganizations.filter(org => !org.is_active).map(org => org.id))}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Ativar organizações"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {activeCount > 0 && (
            <button
              onClick={() => onBulkDeactivate(selectedOrganizations.filter(org => org.is_active).map(org => org.id))}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Desativar organizações"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}

          {/* Atribuir usuários */}
          <button
            onClick={() => onBulkInviteUsers(selectedOrganizations.map(org => org.id))}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Atribuir usuários às organizações selecionadas"
          >
            <UserPlus className="h-4 w-4" />
          </button>

          {/* Exportar */}
          <button
            onClick={() => onBulkExport(selectedOrganizations.map(org => org.id))}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Exportar dados"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Menu de mais ações */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
              title="Mais ações"
            >
              <Settings className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </button>

            {showActionsMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48">
                <button
                  onClick={() => {
                    onBulkDelete(selectedOrganizations.map(org => org.id));
                    setShowActionsMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir selecionadas
                </button>
              </div>
            )}
          </div>

          {/* Limpar seleção */}
          <button
            onClick={onClearSelection}
            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
            title="Limpar seleção"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
