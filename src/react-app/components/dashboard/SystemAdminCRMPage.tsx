import SystemAdminCRM from './SystemAdminCRM';

// Wrapper page for the CRM component to fit the new route structure
export default function SystemAdminCRMPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">CRM & Leads</h1>
                    <p className="text-slate-500">Funil de vendas e qualificação de novas organizações.</p>
                </div>
            </div>

            {/* Reuse existing complex CRM Component */}
            <SystemAdminCRM />
        </div>
    );
}
