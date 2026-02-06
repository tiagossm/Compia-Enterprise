import { useAuth } from '@/react-app/context/AuthContext';

import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import SecurityTransition from '@/react-app/components/SecurityTransition';

export default function Home() {
  const { user, isPending } = useAuth();

  // Prevent "landing flash" while auth state is still being resolved (common right after OAuth).
  if (isPending) {
    return <SecurityTransition />;
  }

  // If user is not authenticated, show landing page
  if (!user) {
    return <LandingPage />;
  }

  // If user is authenticated, show dashboard
  return <Dashboard />;
}
