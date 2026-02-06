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
  AlertCircle,
  Copy,
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Import worker directly for Vite
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
    custom_location: '',
    generation_mode: 'standard' // 'standard' | 'import'
  });

  // New State for Smart Import
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [importedFiles, setImportedFiles] = useState<{ name: string, type: string }[]>([]); // Track files for UI feedback

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

  // Helper: Convert File to Base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGenerating(true);
    setError('');

    const newFilesList = [...importedFiles];
    const newImages: File[] = [];
    let aggregatedText = formData.specific_requirements || '';

    try {
      for (const file of Array.from(files)) {
        // Determine Type
        let type: 'pdf' | 'excel' | 'image' | 'unknown' = 'unknown';
        if (file.type === 'application/pdf') type = 'pdf';
        else if (file.type.includes('image/')) type = 'image';
        else if (['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'].includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) type = 'excel';

        if (type === 'pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let pdfText = `\n--- PDF: ${file.name} ---\n`;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            pdfText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
          }
          aggregatedText += pdfText;
          newFilesList.push({ name: file.name, type: 'PDF' });
        }
        else if (type === 'excel') {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer);
          let excelText = `\n--- EXCEL: ${file.name} ---\n`;
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            excelText += `[ABA: ${sheetName}]\n${csv}\n`;
          });
          aggregatedText += excelText;
          newFilesList.push({ name: file.name, type: 'Excel' });
        }
        else if (type === 'image') {
          newImages.push(file);
          newFilesList.push({ name: file.name, type: 'Imagem' });
        }
      }

      // Update State
      setFormData(prev => ({
        ...prev,
        specific_requirements: aggregatedText,
        template_name: prev.template_name || (files[0] ? files[0].name.split('.')[0] : '')
      }));

      setSelectedImages(prev => [...prev, ...newImages]);
      setImportedFiles(newFilesList);

    } catch (err) {
      console.error('Erro no upload inteligente:', err);
      setError('Erro ao processar arquivos. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  // Helper: Parse CSV to Fields
  const parseCSVToFields = (csv: string): any[] => {
    const lines = csv.split('\n').filter(l => l.trim());
    const fields: any[] = [];

    // Skip header if present (heuristic)
    const startIndex = lines[0].toLowerCase().includes('nome do item') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      // Simple CSV regex to handle quoted values
      const matches = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (!matches) continue;

      const parts = matches.map(m => m.replace(/^"|"$/g, '').trim());
      if (parts.length < 2) continue;

      const label = parts[0];
      const type = parts[1] || 'text'; // Default to text
      const required = parts[2] === 'true';
      const optionsStr = parts[3] || '';

      let fieldType = 'text';
      let options: string[] = [];

      // Map CSV types to System types
      if (type === 'select' && optionsStr) {
        fieldType = 'select';
        options = optionsStr.split('|').map(o => o.trim());
      } else if (type === 'boolean') {
        fieldType = 'select';
        options = ['Conforme', 'Não Conforme', 'N/A'];
      } else if (type === 'date') {
        fieldType = 'date';
      } else if (type === 'rating') {
        fieldType = 'rating'; // System might need specific handling, simplified here
        options = ['1', '2', '3', '4', '5']; // Fallback for select if rating not native
        fieldType = 'select';
      } else {
        fieldType = 'text';
      }

      fields.push({
        id: crypto.randomUUID(),
        label,
        type: fieldType,
        required,
        options
      });
    }
    return fields;
  };

  const handleGenerate = async () => {
    // Validation based on mode
    if (formData.generation_mode === 'import') {
      if (!formData.specific_requirements || !formData.template_name || !formData.category) {
        setError('Por favor, cole o procedimento e preencha o nome do template.');
        return;
      }
    } else {
      if (!formData.industry || !formData.location_type || !formData.template_name || !formData.category) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
    }

    setGenerating(true);
    setError('');

    try {
      console.log('Gerando checklist...', formData);

      // Prepare payload based on mode
      // Prepare payload based on mode
      let payload: any = {};
      let endpoint = '/api/checklist/checklist-templates/generate-ai-simple';

      if (formData.generation_mode === 'import') {
        endpoint = '/api/checklist/checklist-templates/generate-ai-csv'; // Use CSV route

        // Process Images
        const processedImages = [];
        if (selectedImages.length > 0) {
          for (const file of selectedImages) {
            processedImages.push({
              mimeType: file.type,
              data: await convertFileToBase64(file)
            });
          }
        }

        payload = {
          text: `[SOLICITAÇÃO DE IMPORTAÇÃO]\nNOME: ${formData.template_name}\nCATEGORIA: ${formData.category}\n\nCONTEÚDO:\n${formData.specific_requirements}`,
          images: processedImages.length > 0 ? processedImages : undefined,
          context: 'Legacy Import Retrofit'
        };
      } else {
        // Standard Mode
        payload = {
          industry: formData.industry,
          location_type: formData.location_type,
          template_name: formData.template_name,
          category: formData.category,
          num_questions: formData.num_questions,
          specific_requirements: formData.specific_requirements,
          detail_level: formData.detail_level,
          regulation: formData.regulation,
          priority_focus: 'seguranca'
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

      if (formData.generation_mode === 'import') {
        // Parse CSV Result
        if (result.success && result.csv) {
          const fields = parseCSVToFields(result.csv);

          const templateStructure = {
            id: 'temp_' + crypto.randomUUID(),
            name: formData.template_name,
            category: formData.category,
            description: 'Gerado via Importação Inteligente',
            items_count: fields.length
          };

          setGeneratedTemplate({
            success: true,
            template: templateStructure,
            fields: fields
          });
        } else {
          throw new Error('Falha ao gerar CSV válido.');
        }
      } else {
        // Standard JSON Handling
        if (!result.success) {
          throw new Error(result.error || 'Falha ao gerar checklist');
        }
        setGeneratedTemplate(result);
      }

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
              {/* Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setFormData({ ...formData, generation_mode: 'standard' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${formData.generation_mode !== 'import'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Sparkles size={16} />
                  Modo Padrão
                </button>
                <button
                  onClick={() => setFormData({ ...formData, generation_mode: 'import' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${formData.generation_mode === 'import'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Copy size={16} />
                  Importação Inteligente (Copiar/Colar)
                </button>
              </div>

              {formData.generation_mode === 'import' ? (
                /* SMART IMPORT MODE */
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <Copy size={16} />
                      Como funciona?
                    </h3>
                    <p className="text-sm text-blue-800">
                      Cole aqui o texto de seus procedimentos, normas internas, manuais em PDF ou planilhas antigas.
                      A IA vai ler, entender a estrutura e converter automaticamente em um checklist digital pronto para uso.
                    </p>
                  </div>

                  {/* Smart Dropzone */}
                  <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors group relative cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp"
                      onChange={handleSmartUpload}
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={generating}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                        {generating ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div> : <Upload size={24} />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {generating ? 'Processando arquivos...' : 'Arraste PDF, Excel ou Fotos aqui'}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          Suporta Documentos e Planilhas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files Feedback */}
                  {importedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {importedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-xs text-indigo-700">
                          {f.type === 'PDF' && <FileText className="w-3 h-3" />}
                          {f.type === 'Excel' && <FileSpreadsheet className="w-3 h-3" />}
                          {f.type === 'Imagem' && <ImageIcon className="w-3 h-3" />}
                          <span className="truncate max-w-[150px]">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold tracking-wider justify-center">
                    <span className="h-px w-12 bg-slate-200"></span>
                    OU COLE O TEXTO ABAIXO
                    <span className="h-px w-12 bg-slate-200"></span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cole seu procedimento aqui *
                    </label>
                    <textarea
                      rows={12}
                      value={formData.specific_requirements}
                      onChange={(e) => setFormData({ ...formData, specific_requirements: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm leading-relaxed"
                      placeholder={`Exemplo:
1. Verificar estado dos pneus (calibragem 32psi).
2. Checar nível de óleo do motor.
3. Inspecionar luzes de freio e faróis...

(Pode colar textos longos, normas ou procedimentos completos)`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TemplateSuggestions
                      label="Nome do Template"
                      name="template_name"
                      value={formData.template_name}
                      onChange={(value) => setFormData({ ...formData, template_name: value })}
                      placeholder="Ex: Checklist Importado - Veículos"
                      required={true}
                      type="name"
                    />
                    <TemplateSuggestions
                      label="Categoria"
                      name="category"
                      value={formData.category}
                      onChange={(value) => setFormData({ ...formData, category: value })}
                      placeholder="Ex: Segurança, Manutenção"
                      required={true}
                      type="category"
                    />
                  </div>
                </div>
              ) : (
                /* STANDARD MODE (Existing Form) */
                <>
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
                </>
              )}
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
