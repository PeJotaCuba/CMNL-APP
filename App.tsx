import React, { useState } from 'react';
import { AppView } from './types';
import PublicLanding from './components/PublicLanding';
import ListenerHome from './components/ListenerHome';
import WorkerHome from './components/WorkerHome';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING:
        return <PublicLanding onNavigate={setCurrentView} />;
      case AppView.LISTENER_HOME:
        return <ListenerHome onNavigate={setCurrentView} />;
      case AppView.WORKER_HOME:
        return <WorkerHome onNavigate={setCurrentView} />;
      case AppView.ADMIN_DASHBOARD:
        return <AdminDashboard onNavigate={setCurrentView} />;
      default:
        return <PublicLanding onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="w-full h-full min-h-screen">
      {renderView()}
    </div>
  );
};

export default App;
