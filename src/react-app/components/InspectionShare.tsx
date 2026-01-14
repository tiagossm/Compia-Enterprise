import { useState, useEffect } from 'react';
import {
  Share2,
  QrCode,
  Copy,
  Eye,
  Edit,
  Calendar,
  Users,
  Link as LinkIcon,
  X,
  Trash2,
  Download,
  CheckCircle2
} from 'lucide-react';

interface InspectionShareProps {
  inspectionId: number;
  inspectionTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareLink {
  id: number;
  share_token: string;
  permission: string;
  access_count: number;
  expires_at?: string;
  created_at: string;
  is_active: boolean;
}

export default function InspectionShare({ inspectionId, inspectionTitle, isOpen, onClose }: InspectionShareProps) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [formData, setFormData] = useState({
    permission: 'view',
    expires_in_days: 30
  });

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, inspectionId]);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/share/${inspectionId}/shares`);
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
      }
    } catch (error) {
      console.error('Error fetching shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const createShare = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/share/${inspectionId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qr_code);
        setShareUrl(data.share_url);
        setShowQRModal(true);
        await fetchShares();
      } else {
        throw new Error('Erro ao criar compartilhamento');
      }
    } catch (error) {
      console.error('Error creating share:', error);
      alert('Erro ao criar compartilhamento. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const deleteShare = async (shareId: number) => {
    try {
      const response = await fetch(`/api/inspection-shares/${shareId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchShares();
        alert('Compartilhamento removido com sucesso!');
      } else {
        throw new Error('Erro ao remover compartilhamento');
      }
    } catch (error) {
      console.error('Error deleting share:', error);
      alert('Erro ao remover compartilhamento. Tente novamente.');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copiado para a área de transferência!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copiado para a área de transferência!');
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.download = `qr-code-${inspectionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.href = qrCode;
    link.click();
  };

  const getPermissionLabel = (permission: string) => {
    return permission === 'edit' ? 'Editar' : 'Visualizar';
  };

  const getPermissionColor = (permission: string) => {
    return permission === 'edit' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9998 }}>
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Share2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-slate-900">
                    Compartilhar Inspeção
                  </h2>
                  <p className="text-slate-600 text-sm">{inspectionTitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create New Share */}
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Criar Novo Compartilhamento
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Permissão
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="permission"
                            value="view"
                            checked={formData.permission === 'view'}
                            onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
                            className="mr-3"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-slate-900">Visualizar</span>
                            </div>
                            <p className="text-xs text-slate-600">Apenas visualização</p>
                          </div>
                        </label>
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="permission"
                            value="edit"
                            checked={formData.permission === 'edit'}
                            onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
                            className="mr-3"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Edit className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-slate-900">Editar</span>
                            </div>
                            <p className="text-xs text-slate-600">Pode editar respostas</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Validade
                      </label>
                      <select
                        value={formData.expires_in_days}
                        onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={1}>1 dia</option>
                        <option value={7}>7 dias</option>
                        <option value={30}>30 dias</option>
                        <option value={90}>90 dias</option>
                        <option value={365}>1 ano</option>
                      </select>
                    </div>

                    <button
                      onClick={createShare}
                      disabled={creating}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      {creating ? 'Criando...' : 'Gerar Link e QR Code'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Shares */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">
                  Links Compartilhados ({shares.length})
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : shares.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <LinkIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhum link compartilhado ainda</p>
                    <p className="text-slate-400 text-sm">
                      Crie um novo compartilhamento para começar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {shares.map((share) => (
                      <div key={share.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getPermissionColor(share.permission)}`}>
                              {share.permission === 'edit' ? (
                                <Edit className="w-3 h-3 mr-1" />
                              ) : (
                                <Eye className="w-3 h-3 mr-1" />
                              )}
                              {getPermissionLabel(share.permission)}
                            </span>
                            {isExpired(share.expires_at) && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                Expirado
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteShare(share.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remover compartilhamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{share.access_count} acessos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Criado em {new Date(share.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {share.expires_at && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Expira em {new Date(share.expires_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/shared/${share.share_token}`)}
                            className="flex items-center px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Link
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold text-slate-900">
                QR Code Gerado
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 break-all">
                  {shareUrl}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(shareUrl)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </button>
                <button
                  onClick={downloadQRCode}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar QR
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Link criado com sucesso!</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
