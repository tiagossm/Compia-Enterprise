import { useAuth } from '@/react-app/context/AuthContext';
import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';

export default function Home() {
  const { user } = useAuth();

  // Check for demo user
  const [demoUser, setDemoUser] = useState<any>(null);

  useEffect(() => {
    const isDemoAuth = localStorage.getItem('demo-auth');
    const storedDemoUser = localStorage.getItem('demo-user');

    if (isDemoAuth === 'true' && storedDemoUser) {
      try {
        const parsedDemoUser = JSON.parse(storedDemoUser);
        setDemoUser(parsedDemoUser);
      } catch (error) {
        console.error('Error parsing demo user:', error);
        localStorage.removeItem('demo-auth');
        localStorage.removeItem('demo-user');
      }
    }
  }, []);

  // If user is not authenticated (neither regular nor demo), show landing page
  if (!user && !demoUser) {
    return <LandingPage />;
  }

  // If user is authenticated (regular or demo), show dashboard
  return <Dashboard />;
}
