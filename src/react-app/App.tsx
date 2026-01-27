import './utils/fetch-setup'; // Configure fetch to always include credentials
import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "@/react-app/context/AuthContext";
import { OrganizationProvider } from "@/react-app/context/OrganizationContext";
import { ToastProvider } from "@/react-app/hooks/useToast";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { lazy, Suspense } from 'react';
import LoadingSpinner from "@/react-app/components/LoadingSpinner";
import AuthGuard from "@/react-app/components/AuthGuard";
import { ErrorBoundary } from '@/react-app/components/ErrorBoundary';

// Lazy Load Pages
const HomePage = lazy(() => import("@/react-app/pages/Home"));
const Inspections = lazy(() => import("@/react-app/pages/Inspections"));
const NewInspection = lazy(() => import("@/react-app/pages/NewInspection"));


const InspectionDetail = lazy(() => import("@/react-app/pages/InspectionDetail"));
const Reports = lazy(() => import("@/react-app/pages/Reports"));
const Settings = lazy(() => import("@/react-app/pages/Settings"));
const ChecklistTemplates = lazy(() => import("@/react-app/pages/ChecklistTemplates"));
const NewChecklistTemplate = lazy(() => import("@/react-app/pages/NewChecklistTemplate"));
const AIChecklistGenerator = lazy(() => import("@/react-app/pages/AIChecklistGenerator"));
const CSVImport = lazy(() => import("@/react-app/pages/CSVImport"));
const ChecklistDetail = lazy(() => import("@/react-app/pages/ChecklistDetail"));
const ChecklistTemplateEdit = lazy(() => import("@/react-app/pages/ChecklistTemplateEdit"));
const ActionPlan = lazy(() => import("@/react-app/pages/ActionPlan"));
const ActionPlans = lazy(() => import("@/react-app/pages/ActionPlans"));
const ActivitiesHub = lazy(() => import("@/react-app/pages/ActivitiesHub"));
const Login = lazy(() => import("@/react-app/pages/Login"));
const Register = lazy(() => import("@/react-app/pages/Register"));
const AuthCallback = lazy(() => import("@/react-app/pages/AuthCallback"));
const Users = lazy(() => import("@/react-app/pages/Users"));
const UserProfile = lazy(() => import("@/react-app/pages/UserProfile"));
const Organizations = lazy(() => import("@/react-app/pages/Organizations"));
const OrganizationProfile = lazy(() => import("@/react-app/pages/OrganizationProfile"));
const SharedInspection = lazy(() => import("@/react-app/pages/SharedInspection"));
const AcceptInvitation = lazy(() => import("@/react-app/pages/AcceptInvitation"));
const RolePermissions = lazy(() => import("@/react-app/pages/RolePermissions"));
const AdminDataSync = lazy(() => import("@/react-app/pages/AdminDataSync"));
const AuditLogs = lazy(() => import("@/react-app/pages/AuditLogs"));
const LandingPage = lazy(() => import("@/react-app/pages/LandingPage"));
const AgendaPage = lazy(() => import("@/react-app/pages/AgendaPage"));
const SystemAdmin = lazy(() => import("@/react-app/pages/SystemAdmin"));
const SystemAdminFinance = lazy(() => import("@/react-app/components/dashboard/SystemAdminFinance"));
const SystemAdminCRMPage = lazy(() => import("@/react-app/components/dashboard/SystemAdminCRMPage"));
const SystemPlans = lazy(() => import("@/react-app/pages/SystemPlans"));
const Billing = lazy(() => import("@/react-app/pages/Billing"));
const Checkout = lazy(() => import("@/react-app/pages/Checkout"));


export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <OrganizationProvider>
            <Router>
              <Suspense fallback={
                <div className="flex h-screen w-full items-center justify-center">
                  <LoadingSpinner size="lg" text="Carregando..." />
                </div>
              }>
                <Routes>
                  {/* Public routes */}
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/shared/:token" element={<SharedInspection />} />
                  <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

                  {/* Protected routes */}
                  <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
                  <Route path="/inspections" element={<AuthGuard><Inspections /></AuthGuard>} />
                  <Route path="/inspections/new" element={<AuthGuard><NewInspection /></AuthGuard>} />
                  <Route path="/inspections/:id/edit" element={<AuthGuard><NewInspection /></AuthGuard>} />
                  <Route path="/inspections/:id" element={<AuthGuard><InspectionDetail /></AuthGuard>} />
                  <Route path="/reports" element={<AuthGuard><Reports /></AuthGuard>} />
                  <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
                  <Route path="/settings/permissions" element={<AuthGuard requiredRole="system_admin"><RolePermissions /></AuthGuard>} />
                  <Route path="/admin/data-sync" element={<AuthGuard requiredRole="system_admin"><AdminDataSync /></AuthGuard>} />
                  <Route path="/admin/audit" element={<AuthGuard requiredRole="system_admin"><AuditLogs /></AuthGuard>} />


                  <Route path="/checklists" element={<AuthGuard><ChecklistTemplates /></AuthGuard>} />
                  <Route path="/checklists/new" element={<AuthGuard><NewChecklistTemplate /></AuthGuard>} />
                  <Route path="/checklists/ai-generate" element={<AuthGuard><AIChecklistGenerator /></AuthGuard>} />
                  <Route path="/checklists/import" element={<AuthGuard><CSVImport /></AuthGuard>} />
                  <Route path="/checklists/:id" element={<AuthGuard><ChecklistDetail /></AuthGuard>} />
                  <Route path="/checklists/:id/edit" element={<AuthGuard><ChecklistTemplateEdit /></AuthGuard>} />
                  <Route path="/inspections/:id/action-plan" element={<AuthGuard><ActionPlan /></AuthGuard>} />
                  <Route path="/action-plans" element={<AuthGuard><ActionPlans /></AuthGuard>} />
                  <Route path="/activities" element={<AuthGuard><ActivitiesHub /></AuthGuard>} />
                  <Route path="/agenda" element={<AuthGuard><AgendaPage /></AuthGuard>} />


                  {/* Admin routes */}
                  <Route path="/users" element={<AuthGuard requiredRoles={["system_admin", "admin"]}><Users /></AuthGuard>} />
                  <Route path="/organizations" element={<AuthGuard requiredRoles={["system_admin", "admin", "org_admin", "manager"]}><Organizations /></AuthGuard>} />
                  <Route path="/organizations/:id" element={<AuthGuard requiredRoles={["system_admin", "admin", "org_admin", "manager"]}><OrganizationProfile /></AuthGuard>} />
                  <Route path="/profile" element={<AuthGuard><UserProfile /></AuthGuard>} />
                  <Route path="/billing" element={<AuthGuard requiredRoles={["system_admin", "admin", "org_admin"]}><Billing /></AuthGuard>} />
                  <Route path="/admin/saas-dashboard" element={<AuthGuard requiredRole="system_admin"><SystemAdmin /></AuthGuard>} />
                  <Route path="/admin/finance" element={<AuthGuard requiredRole="system_admin"><SystemAdminFinance /></AuthGuard>} />
                  <Route path="/admin/crm" element={<AuthGuard requiredRole="system_admin"><SystemAdminCRMPage /></AuthGuard>} />
                  <Route path="/admin/plans" element={<AuthGuard requiredRole="system_admin"><SystemPlans /></AuthGuard>} />
                </Routes>
              </Suspense>
            </Router>
          </OrganizationProvider>
        </ToastProvider>
        <SpeedInsights />
        <Analytics />
      </AuthProvider>
    </ErrorBoundary>
  );
}

