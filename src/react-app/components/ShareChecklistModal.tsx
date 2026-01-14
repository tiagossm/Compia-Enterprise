import { useState } from 'react';
import { X, Search, Globe, Lock, Share2, Check, Copy, Building2 } from 'lucide-react';

interface ShareChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    checklistTitle: string;
    templateId: number;
    templateName?: string;
    currentVisibility?: 'private' | 'public' | 'shared';
    currentSharedWith?: number[];
    onSave?: (data: { visibility: 'private' | 'public' | 'shared', sharedWith: number[] }) => void;
}

export default function ShareChecklistModal({
    isOpen,
    onClose,
    checklistTitle,
    currentVisibility,
    currentSharedWith,
    onSave
}: ShareChecklistModalProps) {
    const [visibility, setVisibility] = useState<'private' | 'public' | 'shared'>(currentVisibility || 'private');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>(currentSharedWith ? currentSharedWith.map(String) : []);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleSave = () => {
        if (onSave) {
            onSave({
                visibility,
                sharedWith: selectedOrgs.map(id => parseInt(id))
            });
        }
        onClose();
    };

    // Mock das organizações para o exemplo
    const availableOrgs = [
        { id: '1', name: 'Matriz - São Paulo', type: 'Sede' },
        { id: '2', name: 'Filial - Rio de Janeiro', type: 'Unidade' },
        { id: '3', name: 'Centro de Distribuição - MG', type: 'Operacional' },
        { id: '4', name: 'Escritório Administrativo', type: 'Administrativo' },
        { id: '5', name: 'Unidade Fabril - Sul', type: 'Fábrica' },
    ];

    const filteredOrgs = availableOrgs.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`https://compia.tech/checklists/share/${Math.random().toString(36).substring(7)}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const toggleOrgSelection = (orgId: string) => {
        if (selectedOrgs.includes(orgId)) {
            setSelectedOrgs(selectedOrgs.filter(id => id !== orgId));
        } else {
            setSelectedOrgs([...selectedOrgs, orgId]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">Compartilhar Checklist</h2>
                        <p className="text-sm text-slate-500 mt-0.5 truncate max-w-xs">{checklistTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Visibility Options */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 block">Nível de Acesso</label>
                        <div className="grid grid-cols-1 gap-3">
                            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'private' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${visibility === 'private' ? 'border-blue-500' : 'border-slate-400'}`}>
                                    {visibility === 'private' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                </div>
                                <input type="radio" name="visibility" className="hidden" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                                <div>
                                    <div className="flex items-center gap-2 font-medium text-slate-900">
                                        <Lock size={16} className="text-slate-500" />
                                        Privado
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">Apenas usuários da sua organização com permissão podem acessar.</p>
                                </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'shared' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${visibility === 'shared' ? 'border-blue-500' : 'border-slate-400'}`}>
                                    {visibility === 'shared' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                </div>
                                <input type="radio" name="visibility" className="hidden" checked={visibility === 'shared'} onChange={() => setVisibility('shared')} />
                                <div>
                                    <div className="flex items-center gap-2 font-medium text-slate-900">
                                        <Building2 size={16} className="text-slate-500" />
                                        Organizações Específicas
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">Compartilhado com unidades ou filiais selecionadas abaixo.</p>
                                </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'public' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${visibility === 'public' ? 'border-blue-500' : 'border-slate-400'}`}>
                                    {visibility === 'public' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                </div>
                                <input type="radio" name="visibility" className="hidden" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
                                <div>
                                    <div className="flex items-center gap-2 font-medium text-slate-900">
                                        <Globe size={16} className="text-slate-500" />
                                        Público (Link)
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">Qualquer pessoa com o link pode visualizar este modelo.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Shared Organizations Selection */}
                    {visibility === 'shared' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-sm font-medium text-slate-700 block mb-2">Selecionar Organizações</label>
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar organização..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                {filteredOrgs.map(org => (
                                    <label key={org.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedOrgs.includes(org.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                                            {selectedOrgs.includes(org.id) && <Check size={12} />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedOrgs.includes(org.id)}
                                            onChange={() => toggleOrgSelection(org.id)}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800">{org.name}</p>
                                            <p className="text-xs text-slate-500">{org.type}</p>
                                        </div>
                                    </label>
                                ))}
                                {filteredOrgs.length === 0 && (
                                    <div className="p-4 text-center text-sm text-slate-500">
                                        Nenhuma organização encontrada.
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-right">
                                {selectedOrgs.length} selecionada(s)
                            </p>
                        </div>
                    )}

                    {/* Public Link Copy */}
                    {visibility === 'public' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-sm font-medium text-slate-700 block mb-2">Link de Compartilhamento</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 font-mono truncate">
                                    https://compia.tech/checklists/share/xyz789...
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                                    {copySuccess ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave} // Em produção salvaria
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Share2 size={16} />
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}
