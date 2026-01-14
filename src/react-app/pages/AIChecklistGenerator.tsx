import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import ChecklistPreview from '@/react-app/components/ChecklistPreview';
import TemplateSuggestions from '@/react-app/components/TemplateSuggestions';
import { useAuth } from '@/react-app/context/AuthContext';
import {
  Brain,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function AIChecklistGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [folders, setFolders] = useState<any[]>([]);
  useEffect(() => {
    fetchFolderTree();
  }, []);

  const fetchFolderTree = async () => {
    try {
      const response = await fetch('/api/checklist/tree');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.tree || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
    }
  };

  const [formData, setFormData] = useState({
    industry: '',
    location_type: '',
    template_name: '',
    category: '',
    num_questions: 10,
    specific_requirements: '',
    detail_level: 'intermediario',
    regulation: '',
    custom_industry: '',
    custom_location: ''
  });

  const industryOptions = [
    'Construção Civil',
    'Indústria Química',
    'Indústria Alimentícia',
    'Metalurgia',
    'Hospitalar',
    'Educacional',
    'Comercial',
    'Logística e Transporte',
    'Energia e Utilities',
    'Outro'
  ];

  const locationTypes = [
    'Escritório',
    'Fábrica',
    'Canteiro de Obras',
    'Laboratório',
    'Hospital',
    'Escola',
    'Armazém',
    'Área Externa',
    'Oficina',
    'Outro'
  ];

  const detailLevels = [
    { value: 'basico', label: 'Básico', description: 'Perguntas sim/não simples e diretas' },
    { value: 'intermediario', label: 'Intermediário', description: 'Perguntas + campos de observação' },
    { value: 'avancado', label: 'Avançado', description: 'Perguntas detalhadas + campos personalizados' }
  ];

  const regulations = [
    'Nenhuma norma específica',
    'NR-01 - Gerenciamento de Riscos Ocupacionais',
    'NR-04 - SESMT',
    'NR-05 - CIPA',
    'NR-06 - EPI',
    'NR-07 - PCMSO',
    'NR-09 - PPRA',
    'NR-10 - Segurança em Eletricidade',
    'NR-12 - Segurança em Máquinas',
    'NR-13 - Caldeiras e Vasos',
    'NR-15 - Insalubridade',
    'NR-16 - Periculosidade',
    'NR-17 - Ergonomia',
    'NR-18 - Construção Civil',
    'NR-20 - Inflamáveis',
    'NR-23 - Proteção Contra Incêndio',
    'NR-24 - Condições Sanitárias',
    'NR-26 - Sinalização de Segurança',
    'NR-32 - Saúde em Serviços de Saúde',
    'NR-33 - Espaços Confinados',
    'NR-35 - Trabalho em Altura',
    'NR-36 - Abate e Processamento',
    'ISO 45001 - Gestão de SST',
    'ISO 14001 - Gestão Ambiental',
    'ISO 9001 - Gestão da Qualidade',
    'OHSAS 18001 - SST'
  ];

  // Calculate estimated generation time
  const getEstimatedTime = (numQuestions: number): { seconds: number; label: string; speed: string } => {
    const baseTime = 15; // Base processing time
    const timePerQuestion = 5; // ~5 seconds per question
    const totalSeconds = baseTime + (numQuestions * timePerQuestion);

    let label = '';
    let speed = '';

    if (totalSeconds <= 30) {
      label = '~' + totalSeconds + 's';
      speed = 'Rápido';
    } else if (totalSeconds <= 60) {
      label = '~' + totalSeconds + 's';
      speed = 'Médio';
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      label = `~${minutes}min ${seconds}s`;
      speed = 'Detalhado';
    }

    return { seconds: totalSeconds, label, speed };
  };

  const handleGenerate = async () => {
    if (!formData.industry || !formData.location_type || !formData.template_name || !formData.category) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      console.log('Gerando checklist simples...', formData);

      const response = await fetch('/api/checklist/checklist-templates/generate-ai-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: formData.industry,
          location_type: formData.location_type,
          template_name: formData.template_name,
          category: formData.category,
          num_questions: formData.num_questions,
          specific_requirements: formData.specific_requirements,
          detail_level: formData.detail_level,
          regulation: formData.regulation,
          priority_focus: 'seguranca'
        })
      });

      if (!response.ok) {
        // Tenta ler o corpo do erro
        let errorData = {};
        try {
          errorData = await response.json();
          console.error('[AI-GENERATOR] Backend error details:', errorData);
        } catch (e) {
          console.error('[AI-GENERATOR] Failed to parse error body:', e);
        }

        // Use a mensagem do backend se existir
        const specificError = (errorData as any)?.error;
        if (specificError) {
          throw new Error(specificError);
        }

        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Falha ao gerar checklist');
      }

      setGeneratedTemplate(result);
      console.log('Checklist gerado com sucesso!');

      // Increment AI usage count via backend API
      // SMART FALLBACK: Only increment if backend didn't do it
      const backendIncremented = (result.meta as any)?.usage_incremented === true;

      if (!backendIncremented) {
        console.warn('[AI-USAGE] Backend did not increment usage. Triggering Frontend Fallback...');
        try {
          const orgId = (user as any)?.organization_id || (user as any)?.profile?.organization_id;
          if (orgId) {
            await fetch('/api/organizations/increment-ai-usage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ organization_id: orgId })
            });
            console.log('[AI-USAGE] ✅ Fallback increment successful');
          }
        } catch (fallbackError) {
          console.error('[AI-USAGE] Fallback failed:', fallbackError);
        }
      } else {
        console.log('[AI-USAGE] ✅ Backend confirmed usage increment');
      }

      window.dispatchEvent(new Event('ai_usage_updated'));

    } catch (error) {
      console.error('Erro detalhado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      if (errorMessage.includes('502') || errorMessage.includes('timeout')) {
        setError('⏱️ Servidor sobrecarregado. Tente com menos perguntas (5-8) ou aguarde alguns minutos.');
      } else {
        setError(`❌ ${errorMessage}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (template: any, fields: any[], folder_id?: string | null) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/checklist/checklist-templates/save-generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, fields, folder_id })
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
          console.error('[AI-GENERATOR] Save error details:', errorData);
        } catch (e) {
          console.error('[AI-GENERATOR] Failed to parse save error:', e);
        }

        const specificError = (errorData as any)?.details || (errorData as any)?.error;
        if (specificError) {
          throw new Error(specificError);
        }
        throw new Error('Erro ao salvar template');
      }

      const result = await response.json();
      navigate(`/checklists/${result.id}`);
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao salvar template. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedTemplate(null);
    handleGenerate();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/checklists')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-heading text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              Gerador Simples de Checklist IA
            </h1>
            <p className="text-slate-600 mt-1">
              Versão simplificada para gerar checklists rapidamente
            </p>
          </div>
        </div>

        {!generatedTemplate ? (
          <div className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Simple Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Setor/Indústria *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione o setor</option>
                    {industryOptions.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  {formData.industry === 'Outro' && (
                    <input
                      type="text"
                      value={formData.custom_industry}
                      onChange={(e) => setFormData({ ...formData, custom_industry: e.target.value })}
                      placeholder="Digite o setor/indústria"
                      className="w-full px-3 py-2 mt-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Local *
                  </label>
                  <select
                    value={formData.location_type}
                    onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione o tipo de local</option>
                    {locationTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {formData.location_type === 'Outro' && (
                    <input
                      type="text"
                      value={formData.custom_location}
                      onChange={(e) => setFormData({ ...formData, custom_location: e.target.value })}
                      placeholder="Digite o tipo de local"
                      className="w-full px-3 py-2 mt-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                      required
                    />
                  )}
                </div>

                <TemplateSuggestions
                  label="Nome do Template"
                  name="template_name"
                  value={formData.template_name}
                  onChange={(value) => setFormData({ ...formData, template_name: value })}
                  placeholder="Ex: Checklist de Segurança - Construção"
                  required={true}
                  type="name"
                />

                <TemplateSuggestions
                  label="Categoria"
                  name="category"
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  placeholder="Ex: Segurança, EPIs, Equipamentos"
                  required={true}
                  type="category"
                />

                {/* Nível de Detalhe */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Nível de Detalhe
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {detailLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, detail_level: level.value })}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${formData.detail_level === level.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.detail_level === level.value
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-300'
                            }`}>
                            {formData.detail_level === level.value && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="font-medium text-slate-900">{level.label}</span>
                        </div>
                        <p className="text-xs text-slate-600">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Baseado em Norma */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Baseado em Norma (Opcional)
                  </label>
                  <select
                    value={formData.regulation}
                    onChange={(e) => setFormData({ ...formData, regulation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {regulations.map(regulation => (
                      <option key={regulation} value={regulation}>{regulation}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Selecione uma norma para gerar perguntas de conformidade
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Número de Perguntas: {formData.num_questions}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="15"
                    value={formData.num_questions}
                    onChange={(e) => setFormData({ ...formData, num_questions: parseInt(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between items-center text-xs mt-2">
                    <span className="text-slate-500">5 (Rápido)</span>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium ${getEstimatedTime(formData.num_questions).seconds <= 30
                      ? 'bg-green-100 text-green-700'
                      : getEstimatedTime(formData.num_questions).seconds <= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-orange-100 text-orange-700'
                      }`}>
                      <span>⏱️</span>
                      <span>{getEstimatedTime(formData.num_questions).label}</span>
                      <span className="text-xs opacity-75">({getEstimatedTime(formData.num_questions).speed})</span>
                    </div>
                    <span className="text-slate-500">15 (Detalhado)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Requisitos Específicos (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formData.specific_requirements}
                  onChange={(e) => setFormData({ ...formData, specific_requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descreva requisitos específicos, equipamentos especiais, etc..."
                />
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={generating || !formData.industry || !formData.location_type}
                className="flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    Gerar Checklist
                  </>
                )}
              </button>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Dicas para melhor resultado:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use 5-10 perguntas para gerar mais rápido</li>
                <li>• Seja específico no setor e tipo de local</li>
                <li>• Se der erro 502, tente com menos perguntas</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Generated Template Preview */
          <ChecklistPreview
            template={generatedTemplate?.template || {}}
            fields={generatedTemplate?.fields || []}
            onSave={handleSave}
            onCancel={() => setGeneratedTemplate(null)}
            loading={generating}
            title="Preview do Checklist Gerado por IA"
            folders={folders}
          />
        )}

        {/* Regenerate Button */}
        {generatedTemplate && (
          <div className="flex justify-center">
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="flex items-center px-6 py-3 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Gerar Novo Checklist
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
