

import { ScrollText } from 'lucide-react';

export default function TermsOfUse() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <ScrollText className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Termos de Uso</h1>
                            <p className="text-slate-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
                        <p>
                            Bem-vindo ao <strong>Compia</strong>. Ao acessar e utilizar nossa plataforma, você concorda em cumprir e vincular-se aos seguintes termos e condições de uso.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">1. Aceitação dos Termos</h2>
                        <p>
                            Ao se cadastrar e acessar o serviço, você confirma que leu, entendeu e aceita estes Termos de Uso em sua totalidade. Se você não concorda com qualquer parte destes termos, não deve utilizar nossos serviços.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">2. O Serviço</h2>
                        <p>
                            O Compia é uma plataforma SaaS (Software as a Service) para gestão de inspeções, checklists e relatórios técnicos. Nós nos reservamos o direito de modificar, suspender ou descontinuar qualquer aspecto do serviço a qualquer momento.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">3. Responsabilidades do Usuário</h2>
                        <p>Você é responsável por:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Manter a confidencialidade de suas credenciais de acesso.</li>
                            <li>Todo o conteúdo e dados inseridos em sua conta.</li>
                            <li>Utilizar a plataforma em conformidade com as leis vigentes.</li>
                            <li>Não utilizar o serviço para atividades ilícitas ou não autorizadas.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">4. Propriedade Intelectual</h2>
                        <p>
                            Todo o conteúdo, design, código e propriedade intelectual da plataforma Compia pertencem exclusivamente aos seus proprietários. O uso da plataforma não lhe confere nenhum direito de propriedade sobre a mesma.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">5. Limitação de Responsabilidade</h2>
                        <p>
                            Em nenhuma circunstância o Compia será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, sem limitação, perda de lucros, dados, uso, boa vontade ou outras perdas intangíveis.
                        </p>

                        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">6. Contato</h2>
                        <p>
                            Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco através do e-mail suporte@compia.com.br.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
