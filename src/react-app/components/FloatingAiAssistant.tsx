import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { fetchWithAuth } from '../utils/auth';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'text' | 'code' | 'suggestion';
}

const QUICK_ACTIONS = [
    { label: 'Resumir Inspeção', prompt: 'Faça um resumo executivo desta inspeção destacando os principais pontos de atenção.' },
    { label: 'Sugerir Ações', prompt: 'Com base nos itens não conformes, sugira um plano de ação corretiva.' },
    { label: 'Analisar Riscos', prompt: 'Quais são os principais riscos identificados nesta inspeção?' },
    { label: 'Melhorar Redação', prompt: 'Reescreva as observações dos itens para serem mais técnicas e claras.' }
];

export default function FloatingAiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Olá! Sou a IA especialista da Compia. Como posso ajudar você hoje na sua inspeção?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showActions, setShowActions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const sendMessage = async (content: string) => {
        if (!content.trim()) return;

        const userMsg: Message = { role: 'user', content, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);
        setShowActions(false);

        try {
            // Context da página atual (pode ser melhorado pegando dados reais)
            const pageContext = {
                url: window.location.pathname,
                title: document.title
            };

            const response = await fetchWithAuth('/api/ai-assistant/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: content,
                    context: pageContext,
                    history: messages.slice(-5) // Envia último histórico recente
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiMsg: Message = {
                    role: 'assistant',
                    content: data.reply || 'Desculpe, não consegui processar sua solicitação.',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);

                if (data.suggestions && data.suggestions.length > 0) {
                    // Opcional: atualizar sugestões
                }
            } else {
                throw new Error('Falha na comunicação com IA');
            }

        } catch (error) {
            console.error('Erro IA:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Desculpe, estou enfrentando problemas de conexão. Tente novamente em instantes.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(id);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    // Formata mensagem para exibir código se tiver markdown basic
    const formatMessage = (content: string, msgIndex: number) => {
        // Detecção simples de blocos de código
        if (content.includes('```')) {
            const parts = content.split(/```/);
            return parts.map((part, i) => {
                if (i % 2 === 1) {
                    // É código
                    const lang = part.split('\n')[0].trim();
                    const code = part.replace(lang, '').trim();
                    return (
                        <div key={i} className="my-2 bg-slate-900 rounded-md overflow-hidden text-xs">
                            <div className="flex justify-between items-center px-3 py-1.5 bg-slate-800 text-slate-400 border-b border-slate-700">
                                <span className="uppercase text-[10px] font-mono">{lang || 'CODE'}</span>
                                <button
                                    onClick={() => copyToClipboard(code, `code-${msgIndex}-${i}`)}
                                    className="hover:text-white flex items-center gap-1"
                                >
                                    {copySuccess === `code-${msgIndex}-${i}` ? <Check size={12} /> : <Copy size={12} />}
                                    <span className="text-[10px]">{copySuccess === `code-${msgIndex}-${i}` ? 'Copiado!' : 'Copiar'}</span>
                                </button>
                            </div>
                            <pre className="p-3 overflow-x-auto text-slate-300 font-mono">
                                <code>{code}</code>
                            </pre>
                        </div>
                    );
                }
                return <span key={i} className="whitespace-pre-wrap">{part}</span>;
            });
        }
        return <span className="whitespace-pre-wrap">{content}</span>;
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full shadow-2xl flex items-center justify-center text-white z-[110] transition-all hover:scale-110 active:scale-95 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
            >
                <img src="/compia_logo.png" alt="COMPIA AI" className="w-8 h-8 object-contain brightness-0 invert" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </span>
            </button>

            {/* Chat Modal */}
            <div className={`fixed bottom-24 right-6 w-[95vw] sm:w-[400px] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col z-[120] transition-all duration-300 origin-bottom-right border border-slate-200 overflow-hidden ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                            <Sparkles size={20} className="text-sky-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-base">Compia Assistant</h3>
                            <p className="text-white/60 text-xs flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                Online e pronto para ajudar
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    <div className="text-center py-4">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Início da Conversa</p>
                    </div>

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mr-2 mt-1 shadow-sm">
                                    <Bot size={16} />
                                </div>
                            )}
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                                    }`}
                            >
                                {formatMessage(msg.content, idx)}
                                <div className={`text-[10px] mt-1.5 text-right ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mr-2 mt-1 shadow-sm">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-slate-200 flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Actions & Input Area */}
                <div className="bg-white p-3 border-t border-slate-100 shrink-0">
                    {/* Quick Actions Carousel */}
                    {showActions && !isLoading && (
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar mask-gradient-r">
                            {QUICK_ACTIONS.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(action.prompt)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <Sparkles size={12} className="text-amber-500" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative flex items-end gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite sua mensagem para a IA..."
                            className="flex-1 bg-transparent border-none text-sm px-3 py-2.5 focus:ring-0 placeholder:text-slate-400 max-h-32 font-medium"
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        <button
                            onClick={() => sendMessage(inputValue)}
                            disabled={!inputValue.trim() || isLoading}
                            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm mb-[1px] mr-[1px]"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                    <div className="text-center mt-2 text-[10px] text-slate-400">
                        IA pode cometer erros. Verifique informações importantes.
                    </div>
                </div>
            </div>
        </>
    );
}

// Icon helper workaround se Lucide não importar Bot corretamente em algumas versões
function Bot({ size = 24, className = "" }: { size?: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <path d="M12 22a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2a2 2 0 0 0 2 2z" />
            <path d="M20 12a8 8 0 0 0-16 0" />
            <rect x="2" y="12" width="20" height="6" rx="2" />
            <path d="M6 12v6" />
            <path d="M18 12v6" />
        </svg>
    )
}
