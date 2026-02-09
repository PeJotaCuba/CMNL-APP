import React, { useState } from 'react';
import { AppView } from './types';
import PublicLanding from './components/PublicLanding';
import ListenerHome from './components/ListenerHome';
import WorkerHome from './components/WorkerHome';
import AdminDashboard from './components/AdminDashboard';
import { PlaceholderView, CMNLAppView } from './components/GenericViews';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [history, setHistory] = useState<AppView[]>([]);

  const handleNavigate = (view: AppView) => {
    setHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prevView = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setCurrentView(prevView);
    } else {
      setCurrentView(AppView.LANDING);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING:
        return <PublicLanding onNavigate={setCurrentView} />;
      case AppView.LISTENER_HOME:
        return <ListenerHome onNavigate={setCurrentView} />;
      case AppView.WORKER_HOME:
        return <WorkerHome onNavigate={handleNavigate} />;
      case AppView.ADMIN_DASHBOARD:
        return <AdminDashboard onNavigate={handleNavigate} />;
      
      // CMNL Apps
      case AppView.APP_AGENDA:
        return <CMNLAppView title="Agenda CMNL" type="agenda" onBack={handleBack} />;
      case AppView.APP_MUSICA:
        return <CMNLAppView title="Música CMNL" type="music" onBack={handleBack} />;
      case AppView.APP_GUIONES:
        return <CMNLAppView title="Guiones CMNL" type="scripts" onBack={handleBack} />;
      case AppView.APP_PROGRAMACION:
        return <CMNLAppView title="Programación Interna" type="schedule" onBack={handleBack} />;

      // Public Sections
      case AppView.SECTION_HISTORY:
        return <PlaceholderView title="Nuestra Historia" subtitle="El legado de la radio" onBack={handleBack} />;
      case AppView.SECTION_PROGRAMMING_PUBLIC:
        return <PlaceholderView title="Parrilla de Programación" subtitle="Guía para el oyente" onBack={handleBack} />;
      case AppView.SECTION_ABOUT:
        return <PlaceholderView title="Quiénes Somos" subtitle="Nuestro equipo y misión" onBack={handleBack} />;
      case AppView.SECTION_NEWS:
        return <PlaceholderView title="Noticias" subtitle="Acontecer local y nacional" onBack={handleBack} />;
      case AppView.SECTION_PODCAST:
        return <PlaceholderView title="Podcasts" subtitle="Escucha a tu ritmo" onBack={handleBack} />;
      case AppView.SECTION_PROFILE:
        return <PlaceholderView title="Mi Perfil" subtitle="Configuración de usuario" onBack={handleBack} />;
        
      default:
        return <PublicLanding onNavigate={setCurrentView} />;
    }
  };

  return (
    // Removed fixed width wrapper to allow responsive design on desktop
    <div className="w-full min-h-screen bg-[#1A100C] font-display">
      {renderView()}
    </div>
  );
};

export default App;