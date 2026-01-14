import React, { useState } from 'react';
import { X, User, Mail } from 'lucide-react';
import DialogWrapper from './DialogWrapper';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (user: { name: string; email: string }) => void;
  organizationId?: number;
}

export default function NewUserModal({ 
  isOpen, 
  onClose, 
  onUserCreated,
  organizationId 
}: NewUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'inspector'
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For simplicity, we'll create a user invitation
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          organization_id: organizationId
        }),
      });

      if (response.ok) {
        onUserCreated({ 
          name: formData.name, 
          email: formData.email 
        });
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          role: 'inspector'
        });
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert(`Erro ao criar usuário: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <DialogWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Usuário"
      description="Criar um novo usuário no sistema"
      className="mx-4 p-6"
    >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Novo Usuário
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Criar um novo usuário no sistema
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-user-name" className="block text-sm font-medium text-slate-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              id="new-user-name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o nome completo"
            />
          </div>

          <div>
            <label htmlFor="new-user-email" className="block text-sm font-medium text-slate-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="new-user-email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="usuario@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="new-user-role" className="block text-sm font-medium text-slate-700 mb-2">
              Função
            </label>
            <select
              id="new-user-role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="inspector">Inspetor</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
              <option value="client">Cliente</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Convite por Email</span>
            </div>
            <p className="text-xs text-blue-800">
              Um email de convite será enviado para o usuário com instruções para ativar a conta.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <User className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
    </DialogWrapper>
  );
}
