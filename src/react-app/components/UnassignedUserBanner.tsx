import { AlertTriangle, Mail, Shield } from 'lucide-react';

interface UnassignedUserBannerProps {
  userEmail: string;
  userName?: string;
  onContactAdmin?: () => void;
}

export default function UnassignedUserBanner({ 
  userEmail, 
  userName,
  onContactAdmin 
}: UnassignedUserBannerProps) {
  const copyContactInfo = () => {
    const contactInfo = `
Assunto: Solicitação de Acesso - ${userName || userEmail}

Olá,

Criei minha conta no sistema COMPIA e preciso ser atribuído(a) a uma organização para ter acesso completo às funcionalidades.

Dados da conta:
- Nome: ${userName || 'Não informado'}
- Email: ${userEmail}
- Data de registro: ${new Date().toLocaleDateString('pt-BR')}

Por favor, configure meu perfil de acesso.

Obrigado(a),
${userName || 'Usuário'}
    `.trim();
    
    try {
      navigator.clipboard.writeText(contactInfo);
      alert('Informações copiadas! Cole no seu email ao administrador.');
    } catch (error) {
      prompt('Copie estas informações para enviar ao administrador:', contactInfo);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 mb-2">
            🎉 Conta Criada com Sucesso!
          </h3>
          <p className="text-amber-800 mb-4">
            Sua conta foi criada e você está logado, mas ainda precisa ser atribuído(a) a uma organização 
            por um administrador para ter acesso completo às funcionalidades do sistema.
          </p>
          
          <div className="bg-amber-100 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Próximos Passos:
            </h4>
            <ol className="list-decimal list-inside text-sm text-amber-800 space-y-1">
              <li>Entre em contato com um administrador do sistema</li>
              <li>Informe seu email de cadastro: <strong>{userEmail}</strong></li>
              <li>Aguarde a configuração do seu perfil e organização</li>
              <li>Após a configuração, você terá acesso completo</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyContactInfo}
              className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              Copiar Dados para Contato
            </button>
            
            {onContactAdmin && (
              <button
                onClick={onContactAdmin}
                className="flex items-center px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm"
              >
                Mais Informações
              </button>
            )}
          </div>

          <div className="mt-4 text-xs text-amber-600">
            <strong>Dica:</strong> Você pode navegar pelo sistema em modo de visualização, 
            mas algumas funcionalidades estarão limitadas até a configuração completa.
          </div>
        </div>
      </div>
    </div>
  );
}
