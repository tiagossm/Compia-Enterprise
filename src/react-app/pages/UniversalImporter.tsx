import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import {
    Brain,
    ArrowLeft,
    Upload,
    FileText,
    Download,
    Copy,
    Check,
    AlertCircle,
    FileSpreadsheet,
    Sparkles,
    Trash2,
    File
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
// Import worker directly for Vite
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type ImportedFile = {
    name: string;
    type: 'pdf' | 'excel' | 'image' | 'unknown';
    content: string | File; // Text content or File object
    preview?: string;
};

export default function UniversalImporter() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [promptContext, setPromptContext] = useState('');
    const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedCSV, setGeneratedCSV] = useState('');
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // Handlers
    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsProcessing(true);
        setError('');

        const newFiles: ImportedFile[] = [];

        for (const file of Array.from(files)) {
            try {
                // Determine Type
                let type: 'pdf' | 'excel' | 'image' | 'unknown' = 'unknown';
                if (file.type === 'application/pdf') type = 'pdf';
                else if (file.type.includes('image/')) type = 'image';
                else if (['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'].includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) type = 'excel';

                let content: string | File = file;
                let preview: string | undefined = undefined;

                if (type === 'pdf') {
                    // Extract Text Immediately
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = `--- ARQUIVO PDF: ${file.name} ---\n`;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                    }
                    content = fullText;
                }
                else if (type === 'excel') {
                    // Extract CSV Immediately
                    const arrayBuffer = await file.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer);
                    let fullText = `--- PLANILHA EXCEL: ${file.name} ---\n`;
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const csv = XLSX.utils.sheet_to_csv(sheet);
                        fullText += `[ABA: ${sheetName}]\n${csv}\n`;
                    });
                    content = fullText;
                }
                else if (type === 'image') {
                    // Keep file for later base64 conversion
                    content = file;
                    preview = URL.createObjectURL(file);
                }

                newFiles.push({
                    name: file.name,
                    type,
                    content,
                    preview
                });

            } catch (err) {
                console.error(`Erro ao processar ${file.name}:`, err);
                setError(`Erro ao ler arquivo: ${file.name}`);
            }
        }

        setImportedFiles(prev => [...prev, ...newFiles]);
        setIsProcessing(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setImportedFiles(prev => prev.filter((_, i) => i !== index));
    };

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

    const handleGenerate = async () => {
        if (!promptContext && importedFiles.length === 0) {
            setError('Por favor, digite um contexto ou adicione arquivos para criar o checklist.');
            return;
        }

        setIsProcessing(true);
        setError('');
        setGeneratedCSV('');

        try {
            // Aggregate Text Content
            let fullContextText = promptContext ? `CONTEXTO DO USUÁRIO:\n${promptContext}\n\n` : '';

            // Append Text from PDFs and Excels
            const textFiles = importedFiles.filter(f => typeof f.content === 'string');
            if (textFiles.length > 0) {
                fullContextText += `--- CONTEÚDO DOS ARQUIVOS ---\n`;
                textFiles.forEach(f => {
                    fullContextText += `\n${f.content}\n`;
                });
            }

            // Prepare Images
            const imageFiles = importedFiles.filter(f => f.type === 'image');
            const processedImages = [];

            if (imageFiles.length > 0) {
                for (const fileObj of imageFiles) {
                    const file = fileObj.content as File;
                    processedImages.push({
                        mimeType: file.type,
                        data: await convertFileToBase64(file)
                    });
                }
            }

            const payload = {
                text: fullContextText,
                images: processedImages.length > 0 ? processedImages : undefined,
                context: 'Universal Smart Import'
            };

            const response = await fetch('/api/checklist/checklist-templates/generate-ai-csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro na geração');
            }

            const data = await response.json();
            if (data.success && data.csv) {
                setGeneratedCSV(data.csv);
            } else {
                throw new Error('Formato de resposta inválido');
            }

        } catch (err: any) {
            setError(err.message || 'Erro desconhecido');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadCSV = () => {
        const blob = new Blob([generatedCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'checklist_importacao.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCSV);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-8 pb-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/checklists')}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-heading text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            Criador Universal de Checklists
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Descreva o que você precisa ou solte arquivos (PDF, Excel, Fotos) para a IA criar o checklist.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT: Unified Smart Input */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">

                            {/* Prompt Area */}
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    O que você deseja criar?
                                </label>
                                <textarea
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none h-24"
                                    placeholder="Ex: Crie um checklist de manutenção preventiva para empilhadeiras elétricas, com foco em bateria e pneus..."
                                    value={promptContext}
                                    onChange={(e) => setPromptContext(e.target.value)}
                                ></textarea>
                            </div>

                            {/* File List Area */}
                            <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
                                <div className="space-y-3">
                                    {importedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                            {/* Icon Preview */}
                                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden">
                                                {file.type === 'image' && file.preview ? (
                                                    <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                                                ) : file.type === 'pdf' ? (
                                                    <FileText className="w-5 h-5 text-red-500" />
                                                ) : file.type === 'excel' ? (
                                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <File className="w-5 h-5 text-slate-500" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate" title={file.name}>{file.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {file.type === 'image' ? 'Imagem processada com Visão IA' :
                                                        file.type === 'pdf' ? 'Texto extraído do PDF' :
                                                            file.type === 'excel' ? 'Dados convertidos de Planilha' : 'Arquivo'}
                                                </p>
                                            </div>

                                            {/* Action */}
                                            <button
                                                onClick={() => removeFile(idx)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    {importedFiles.length === 0 && !promptContext && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
                                            <Upload className="w-12 h-12 mb-2" />
                                            <p className="text-sm">Adicione arquivos ou descreva acima</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dropzone Footer */}
                            <div className="p-4 bg-white border-t border-slate-200">
                                <div
                                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl p-6 transition-all cursor-pointer relative group text-center"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv"
                                        onChange={handleSmartUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isProcessing}
                                    />
                                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Adicionar Arquivos de Contexto</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Suporta: PDF (Manuais), Excel (Planilhas antigas), Imagens (Fotos de prancheta)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm animate-pulse">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerate}
                                    disabled={isProcessing || (!promptContext && importedFiles.length === 0)}
                                    className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Analisando e Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-5 h-5" />
                                            Gerar Checklist Inteligente
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Output Area */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col min-h-[600px]">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                    Resultado CSV
                                </h3>
                                {generatedCSV && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                                            title="Copiar"
                                        >
                                            {copySuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={downloadCSV}
                                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Baixar e Importar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 p-0 relative bg-slate-900">
                                <div className="absolute inset-0 p-4">
                                    <textarea
                                        readOnly={!generatedCSV}
                                        value={generatedCSV}
                                        onChange={(e) => setGeneratedCSV(e.target.value)}
                                        className="w-full h-full p-4 bg-slate-800 text-slate-200 font-mono text-xs rounded-lg resize-none focus:ring-1 focus:ring-slate-500 focus:border-transparent outline-none border border-slate-700"
                                        placeholder="O resultado do CSV aparecerá aqui..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-yellow-50 rounded-b-xl">
                                <p className="text-xs text-yellow-800 flex items-start gap-2">
                                    <span className="font-bold">Nota:</span>
                                    Revise o CSV acima se necessário. Depois clique em "Baixar" e use o botão abaixo.
                                </p>
                                <button
                                    onClick={() => navigate('/checklists/import')}
                                    className="mt-2 w-full py-2 bg-white border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Ir para Importação de CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
