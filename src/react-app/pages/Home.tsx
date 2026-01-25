import { useAuth } from '@/react-app/context/AuthContext';

import Dashboard from './Dashboard';
import LandingPage from './LandingPage';

export default function Home() {
  const { user } = useAuth();

  // If user is not authenticated, show landing page
  if (!user) {
    return <LandingPage />;
  }

  // If user is authenticated, show dashboard
  return <Dashboard />;
}
