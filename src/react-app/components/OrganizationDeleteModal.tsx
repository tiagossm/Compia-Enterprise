import { useState } from 'react';
import { X, AlertTriangle, Trash2, Building2, Users, FileText } from 'lucide-react';
import { Organization } from '../../shared/types';

interface OrganizationDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onDelete: (organizationId: number) => void;
  organizationStats?: {
    userCount: number;
    inspectionCount: number;
    subsidiaryCount: number;
  };
}

export default function OrganizationDeleteModal({
  isOpen,
  onClose,
  organization,
  onDelete,
  organizationStats
}: OrganizationDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const hasData = organizationStats && (
    organizationStats.userCount > 0 || 
    organizationStats.inspectionCount > 0 || 
    organizationStats.subsidiaryCount > 0
  );

  const handleDelete = async () => {
    if (confirmText !== organization.name) return;

    setIsLoading(true);
    try {
      await onDelete(organization.id);
      onClose();
    } catch (error) {
      console.error('Erro ao excluir organização:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Excluir Organização
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Aviso de Perigo */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Esta ação não pode ser desfeita
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Você está prestes a excluir permanentemente a organização{' '}
                  <strong>"{organization.name}"</strong> e todos os dados associados.
                </p>
              </div>
            </div>
          </div>

          {/* Informações sobre dados que serão perdidos */}
          {hasData && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">
                Os seguintes dados serão perdidos permanentemente:
              </h4>
              <div className="space-y-2">
                {organizationStats?.userCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{organizationStats.userCount} usuário(s)</span>
                  </div>
                )}
                {organizationStats?.inspectionCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>{organizationStats.inspectionCount} inspeção(ões)</span>
                  </div>
                )}
                {organizationStats?.subsidiaryCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>{organizationStats.subsidiaryCount} subsidiária(s)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirmação por digitação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Para confirmar, digite o nome da organização: <strong>{organization.name}</strong>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Digite o nome da organização"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText !== organization.name || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Excluir Permanentemente
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
