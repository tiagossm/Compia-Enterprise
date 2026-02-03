import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/react-app/components/Layout';
import {
    Brain,
    ArrowLeft,
    FileText,
    Image as ImageIcon,
    Download,
    Copy,
    Check,
    AlertCircle,
    FileSpreadsheet
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
// Import worker directly for Vite
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function UniversalImporter() {
    const navigate = useNavigate();

    // State
    const [activeTab, setActiveTab] = useState<'text' | 'pdf' | 'image' | 'excel'>('text');
    const [inputText, setInputText] = useState('');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    // pdfFile Removed as it was unused (we extract text immediately)
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedCSV, setGeneratedCSV] = useState('');
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // Handlers
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);

            let fullText = '[CONTEÚDO DA PLANILHA EXCEL]\n\n';

            workbook.SheetNames.forEach((sheetName: string) => {
                const sheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(sheet);
                fullText += `--- Planilha: ${sheetName} ---\n${csv}\n\n`;
            });

            setInputText(fullText);
            setActiveTab('text');
        } catch (err) {
            console.error(err);
            setError('Erro ao ler Excel. Verifique o arquivo.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n\n';
            }

            setInputText(fullText);
            setActiveTab('text'); // Switch to text view to show extracted content
        } catch (err) {
            console.error(err);
            setError('Erro ao ler PDF. Tente copiar e colar o texto.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedImages(Array.from(e.target.files));
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data:image/xxx;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleGenerate = async () => {
        if (!inputText && selectedImages.length === 0) {
            setError('Por favor, forneça algum texto ou imagem.');
            return;
        }

        setIsProcessing(true);
        setError('');
        setGeneratedCSV('');

        try {
            const payload: any = {
                context: 'Universal Importer Generation'
            };

            if (inputText) payload.text = inputText;

            if (selectedImages.length > 0) {
                const processedImages = await Promise.all(
                    selectedImages.map(async (file) => ({
                        mimeType: file.type,
                        data: await convertFileToBase64(file)
                    }))
                );
                payload.images = processedImages;
            }

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
            <div className="max-w-5xl mx-auto space-y-8 pb-10">
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
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            Importador Universal IA
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Transforme fotos, PDFs e textos em Checklists padronizados (CSV)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT: Input Area */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-slate-200">
                                <button
                                    onClick={() => setActiveTab('text')}
                                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'text' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <FileText className="w-4 h-4" /> Texto / Manual
                                </button>
                                <button
                                    onClick={() => setActiveTab('pdf')}
                                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'pdf' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <FileText className="w-4 h-4" /> PDF
                                </button>
                                <button
                                    onClick={() => setActiveTab('image')}
                                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'image' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <ImageIcon className="w-4 h-4" /> Imagens
                                </button>
                                <button
                                    onClick={() => setActiveTab('excel')}
                                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'excel' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <FileSpreadsheet className="w-4 h-4" /> Excel
                                </button>
                            </div>

                            <div className="p-6">
                                {activeTab === 'text' && (
                                    <textarea
                                        className="w-full h-96 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                                        placeholder="Cole aqui o texto do seu procedimento, norma ou checklist antigo..."
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                    ></textarea>
                                )}

                                {activeTab === 'pdf' && (
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl h-96 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors relative">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handlePdfUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <FileText className="w-12 h-12 text-slate-400 mb-4" />
                                        <p className="text-slate-600 font-medium">Arraste seu PDF aqui</p>
                                        <p className="text-slate-400 text-sm mt-2">O texto será extraído automaticamente</p>
                                    </div>
                                )}

                                {activeTab === 'excel' && (
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl h-96 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors relative">
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            onChange={handleExcelUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <FileSpreadsheet className="w-12 h-12 text-green-500 mb-4" />
                                        <p className="text-slate-600 font-medium">Arraste seu Excel aqui</p>
                                        <p className="text-slate-400 text-sm mt-2">Os dados serão convertidos para análise</p>
                                    </div>
                                )}

                                {activeTab === 'image' && (
                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <ImageIcon className="w-10 h-10 text-slate-400 mb-3" />
                                            <p className="text-slate-600 font-medium">Carregar Fotos do Checklist</p>
                                            <p className="text-slate-400 text-sm">Tire fotos do papel ou prancheta</p>
                                        </div>

                                        {selectedImages.length > 0 && (
                                            <div className="flex gap-2 overflow-x-auto p-2">
                                                {selectedImages.map((img, idx) => (
                                                    <div key={idx} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200">
                                                        <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {error && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerate}
                                    disabled={isProcessing || (!inputText && selectedImages.length === 0)}
                                    className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-5 h-5" />
                                            Gerar CSV com IA
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Output Area */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
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
                                            Baixar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 p-0 relative">
                                <div className="absolute inset-0 p-4">
                                    <textarea
                                        readOnly={!generatedCSV}
                                        value={generatedCSV}
                                        onChange={(e) => setGeneratedCSV(e.target.value)}
                                        className="w-full h-full p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="O resultado do CSV aparecerá aqui..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-yellow-50 rounded-b-xl">
                                <p className="text-xs text-yellow-800 flex items-start gap-2">
                                    <span className="font-bold">Nota:</span>
                                    Este CSV está formatado para o importador do sistema. Baixe o arquivo e use a opção "Importar via CSV" para criar seu checklist.
                                </p>
                                <button
                                    onClick={() => navigate('/import-csv')}
                                    className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                                >
                                    Ir para Importação de CSV →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
