import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import ChecklistForm from '@/react-app/components/ChecklistForm';
import {
  ArrowLeft,
  Edit,
  Copy,
  Download,
  Trash2,
  Users,
  Lock,
  Calendar,
  User,
  Tag
} from 'lucide-react';
import { ChecklistTemplateWithFields } from '@/shared/checklist-types';

export default function ChecklistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<ChecklistTemplateWithFields | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/checklist/checklist-templates/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate({
          ...data.template,
          fields: data.fields || []
        });
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const response = await fetch(`/api/checklist/checklist-templates/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        navigate('/checklists');
      }
    } catch (error) {
      console.error('Erro ao excluir template:', error);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/checklist/checklist-templates/${id}/duplicate`, {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        navigate(`/checklists/${result.id}`);
      }
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
    }
  };

  const handleExport = () => {
    if (!template) return;

    const csvContent = 'campo,tipo,obrigatorio,opcoes\n' +
      template.fields.map(field => {
        const options = field.options ? JSON.parse(field.options).join('|') : '';
        return `"${field.field_name}","${field.field_type}","${field.is_required}","${options}"`;
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${template.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSubmit = (responses: any[]) => {
    console.log('Respostas do checklist:', responses);
    // Aqui você pode implementar o salvamento das respostas
    alert('Respostas salvas com sucesso! (Implementação de exemplo)');
  };

  /*
  const handleAutoSave = async (responses: any, comments: any, complianceStatuses?: any) => {
    // console.log('Auto-save preview:', { responses, comments, complianceStatuses });
    // This is just for preview - no actual saving in template preview mode
  };
  */

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!template) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checklist não encontrado</h2>
          <button
            onClick={() => navigate('/checklists')}
            className="text-blue-600 hover:underline"
          >
            Voltar para templates
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Compact Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/checklists')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              {template.name}
            </h1>
            <p className="text-slate-600 text-sm">Visualizar e testar template de checklist</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              CSV
            </button>
            <button
              onClick={handleDuplicate}
              className="flex items-center px-3 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              <Copy className="w-4 h-4 mr-1" />
              Duplicar
            </button>
            <button
              onClick={() => navigate(`/checklists/${id}/edit`)}
              className="flex items-center px-3 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </button>
          </div>
        </div>

        {/* Template Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Categoria</p>
                <p className="font-medium text-slate-900">{template.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Criado em</p>
                <p className="font-medium text-slate-900">
                  {new Date(template.created_at!).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {template.is_public ? (
                <Users className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="text-sm text-slate-500">Visibilidade</p>
                <p className="font-medium text-slate-900">
                  {template.is_public ? 'Público' : 'Privado'}
                </p>
              </div>
            </div>
          </div>

          {template.description && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-2">Descrição</p>
              <p className="text-slate-700">{template.description}</p>
            </div>
          )}

          {template.created_by && (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">
                  Criado por: {template.created_by}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Checklist Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-semibold text-slate-900 mb-2">
              Preview do Checklist
            </h2>
            <p className="text-slate-600 text-sm">
              Visualize e teste como este checklist funcionará em uma inspeção real.
            </p>
          </div>

          {template.fields.length === 0 ? (
            <div className="text-center py-8">
              <Edit className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhum campo definido</p>
              <p className="text-slate-400 text-sm mt-1">
                Adicione campos para ver o preview do checklist
              </p>
              <button
                onClick={() => navigate(`/checklists/${id}/edit`)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar Campos
              </button>
            </div>
          ) : (
            <ChecklistForm
              fields={template.fields}
              onSubmit={handleFormSubmit}
              readonly={false}
            // onAutoSave={handleAutoSave}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
