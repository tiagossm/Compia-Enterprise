import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import ActionItemForm from '@/react-app/components/ActionItemForm';
import { 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target
} from 'lucide-react';

interface ActionItem {
  id?: number;
  inspection_id: number;
  inspection_item_id?: number;
  title: string;
  what_description?: string;
  where_location?: string;
  why_reason?: string;
  how_method?: string;
  who_responsible?: string;
  when_deadline?: string;
  how_much_cost?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'baixa' | 'media' | 'alta';
  is_ai_generated: boolean;
}

interface Inspection {
  id: number;
  title: string;
  action_plan_type: '5w2h' | 'simple';
  location: string;
  company_name: string;
}

export default function ActionPlan() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [showNewAction, setShowNewAction] = useState(false);
  const [newAction, setNewAction] = useState<Partial<ActionItem>>({
    title: '',
    what_description: '',
    where_location: '',
    why_reason: '',
    how_method: '',
    who_responsible: '',
    when_deadline: '',
    how_much_cost: '',
    status: 'pending',
    priority: 'media',
    is_ai_generated: false
  });

  useEffect(() => {
    if (id) {
      fetchActionPlan();
    }
  }, [id]);

  // Handle highlighting action from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const highlightActionId = urlParams.get('highlightAction');
    
    if (highlightActionId) {
      setTimeout(() => {
        const actionElement = document.getElementById(`action-${highlightActionId}`);
        if (actionElement) {
          actionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          actionElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
          setTimeout(() => {
            actionElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
          }, 3000);
        }
      }, 500);
    }
  }, [actionItems]);

  const fetchActionPlan = async () => {
    try {
      const response = await fetch(`/api/inspections/${id}/action-plan`);
      if (response.ok) {
        const data = await response.json();
        setInspection(data.inspection);
        setActionItems(data.action_items || []);
      }
    } catch (error) {
      console.error('Erro ao carregar plano de ação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAction = async (action: Partial<ActionItem>) => {
    try {
      const method = action.id ? 'PUT' : 'POST';
      const url = action.id 
        ? `/api/action-items/${action.id}`
        : `/api/inspections/${id}/action-items`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...action,
          inspection_id: parseInt(id!)
        })
      });

      if (response.ok) {
        await fetchActionPlan();
        setEditingAction(null);
        setShowNewAction(false);
        setNewAction({
          title: '',
          what_description: '',
          where_location: '',
          why_reason: '',
          how_method: '',
          who_responsible: '',
          when_deadline: '',
          how_much_cost: '',
          status: 'pending',
          priority: 'media',
          is_ai_generated: false
        });
        alert('Ação salva com sucesso!');
      } else {
        const errorData = await response.json();
        console.error('Erro no servidor:', errorData);
        alert('Erro ao salvar ação. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar ação:', error);
      alert('Erro ao salvar ação. Verifique sua conexão e tente novamente.');
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    if (confirm('Tem certeza que deseja excluir esta ação?')) {
      try {
        const response = await fetch(`/api/action-items/${actionId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await fetchActionPlan();
          alert('Ação excluída com sucesso!');
        } else {
          const errorData = await response.json();
          console.error('Erro no servidor:', errorData);
          alert('Erro ao excluir ação. Tente novamente.');
        }
      } catch (error) {
        console.error('Erro ao excluir ação:', error);
        alert('Erro ao excluir ação. Verifique sua conexão e tente novamente.');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <Target className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluída';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!inspection) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Inspeção não encontrada</h2>
          <Link to="/inspections" className="text-blue-600 hover:underline">
            Voltar para inspeções
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={`/inspections/${id}`}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Plano de Ação
            </h1>
            <p className="text-slate-600 mt-1">{inspection.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              inspection.action_plan_type === '5w2h' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {inspection.action_plan_type === '5w2h' ? '5W2H' : 'Simples'}
            </span>
            <button
              onClick={() => setShowNewAction(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Ação
            </button>
          </div>
        </div>

        {/* Inspection Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Local</p>
                <p className="font-medium text-slate-900">{inspection.location}</p>
              </div>
            </div>
            {inspection.company_name && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 text-slate-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Empresa</p>
                  <p className="font-medium text-slate-900">{inspection.company_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Action Form */}
        {showNewAction && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-heading text-lg font-semibold text-slate-900 mb-4">
              Nova Ação
            </h3>
            <ActionItemForm
              action={newAction}
              inspection={inspection}
              onSave={handleSaveAction}
              onCancel={() => setShowNewAction(false)}
            />
          </div>
        )}

        {/* Actions List */}
        <div className="space-y-4">
          {actionItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma ação definida</p>
              <p className="text-slate-400 text-sm mt-1">
                Crie ações para organizar o plano de trabalho
              </p>
            </div>
          ) : (
            actionItems.map((action) => (
              <div key={action.id} id={`action-${action.id}`} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all duration-300">
                {editingAction?.id === action.id ? (
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-slate-900 mb-4">
                      Editar Ação
                    </h3>
                    <ActionItemForm
                      action={editingAction || {}}
                      inspection={inspection}
                      onSave={handleSaveAction}
                      onCancel={() => setEditingAction(null)}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-heading text-lg font-semibold text-slate-900">
                            {action.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(action.priority)}`}>
                            {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                          </span>
                          {action.is_ai_generated && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              IA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                          {getStatusIcon(action.status)}
                          <span className="text-sm font-medium text-slate-700">
                            {getStatusLabel(action.status)}
                          </span>
                          {action.when_deadline && (
                            <>
                              <span className="text-slate-300">•</span>
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600">
                                {new Date(action.when_deadline).toLocaleDateString('pt-BR')}
                              </span>
                            </>
                          )}
                          {action.who_responsible && (
                            <>
                              <span className="text-slate-300">•</span>
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600">{action.who_responsible}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingAction(action)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAction(action.id!)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {action.what_description && (
                        <div>
                          <span className="text-sm font-medium text-red-600">O que:</span>
                          <p className="text-sm text-slate-700 mt-1">{action.what_description}</p>
                        </div>
                      )}
                      {action.where_location && (
                        <div>
                          <span className="text-sm font-medium text-green-600">Onde:</span>
                          <p className="text-sm text-slate-700 mt-1">{action.where_location}</p>
                        </div>
                      )}
                      {action.why_reason && (
                        <div>
                          <span className="text-sm font-medium text-blue-600">Por que:</span>
                          <p className="text-sm text-slate-700 mt-1">{action.why_reason}</p>
                        </div>
                      )}
                      {action.how_method && (
                        <div>
                          <span className="text-sm font-medium text-indigo-600">Como:</span>
                          <p className="text-sm text-slate-700 mt-1">{action.how_method}</p>
                        </div>
                      )}
                      {action.how_much_cost && inspection.action_plan_type === '5w2h' && (
                        <div className="md:col-span-2">
                          <span className="text-sm font-medium text-orange-600">Quanto:</span>
                          <p className="text-sm text-slate-700 mt-1">{action.how_much_cost}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
