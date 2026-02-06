
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <ShieldCheck className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Política de Privacidade</h1>
                            <p className="text-slate-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
                        <p>
                            Sua privacidade é importante para nós. Esta Política de Privacidade explica como o <strong>Compia</strong> coleta, usa, armazena e protege suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">1. Coleta de Dados</h2>
                        <p>Coletamos os seguintes tipos de informações:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Dados de Cadastro:</strong> Nome, e-mail, telefone e informações da empresa.</li>
                            <li><strong>Dados de Uso:</strong> Logs de acesso, interações com a plataforma e dados técnicos do dispositivo.</li>
                            <li><strong>Conteúdo do Usuário:</strong> Dados inseridos em inspeções, relatórios e checklists.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">2. Uso das Informações</h2>
                        <p>Utilizamos seus dados para:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Fornecer, operar e manter nossos serviços.</li>
                            <li>Melhorar, personalizar e expandir nossa plataforma.</li>
                            <li>Entender e analisar como você utiliza nossos serviços.</li>
                            <li>Comunicar-se com você, seja diretamente ou através de um de nossos parceiros (suporte, atualizações, marketing).</li>
                        </ul>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">3. Compartilhamento de Dados</h2>
                        <p>
                            Não vendemos suas informações pessoais. Podemos compartilhar dados com prestadores de serviços terceirizados estritamente necessários para a operação da plataforma (ex: hospedagem, processamento de pagamentos), sob acordos de confidencialidade.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">4. Segurança dos Dados</h2>
                        <p>
                            Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">5. Seus Direitos (LGPD)</h2>
                        <p>Você tem o direito de:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Solicitar acesso aos seus dados pessoais.</li>
                            <li>Solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
                            <li>Solicitar a eliminação de dados desnecessários ou excessivos.</li>
                            <li>Revogar seu consentimento a qualquer momento.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">6. Contato do DPO</h2>
                        <p>
                            Para exercer seus direitos ou tirar dúvidas sobre nossa política de privacidade, entre em contato com nosso Encarregado de Proteção de Dados (DPO) através do e-mail privacidade@compia.com.br.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
