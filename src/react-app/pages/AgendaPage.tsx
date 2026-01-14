import Layout from '@/react-app/components/Layout';
import CalendarView from '@/react-app/components/CalendarView';

export default function AgendaPage() {
    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Agenda</h1>
                    <p className="text-slate-600">
                        Gerencie inspeções, planos de ação e reuniões.
                    </p>
                </div>

                <CalendarView />
            </div>
        </Layout>
    );
}
