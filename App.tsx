import React, { useState, useEffect, useRef } from 'react';
import { AppView, User, NewsItem } from './types';
import PublicLanding from './components/PublicLanding';
import ListenerHome from './components/ListenerHome';
import WorkerHome from './components/WorkerHome';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import { PlaceholderView, CMNLAppView } from './components/GenericViews';
import { INITIAL_USERS, INITIAL_NEWS, getCurrentProgram } from './utils/scheduleData';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [history, setHistory] = useState<AppView[]>([]);
  
  // Global Data State
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [news, setNews] = useState<NewsItem[]>(INITIAL_NEWS);
  const [historyContent, setHistoryContent] = useState<string>('');
  const [aboutContent, setAboutContent] = useState<string>('');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentProgram, setCurrentProgram] = useState(getCurrentProgram());

  useEffect(() => {
    // Check for persistent session
    const sessionRole = localStorage.getItem('rcm_user_session');
    if (sessionRole === 'admin') {
      setCurrentView(AppView.ADMIN_DASHBOARD);
    } else if (sessionRole === 'worker') {
      setCurrentView(AppView.WORKER_HOME);
    }
  }, []);

  // Update Program Info for Player
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProgram(getCurrentProgram());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Back Button Logic (History API)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If there is history in our app state, go back
      if (history.length > 0) {
        // Prevent default browser back which might exit app or page
        // We handle the view change manually
        const prevView = history[history.length - 1];
        setHistory((prev) => prev.slice(0, -1));
        setCurrentView(prevView);
      } else {
        // If no history, let it be (or go to landing)
        // If we are deep in the app but history array is empty (e.g. reload), maybe go to landing?
        // But for now, standard browser behavior if stack is empty is fine, 
        // OR we can force it to stay if we want "App like" behavior.
        // Let's ensure we don't leave easily if logged in.
        const sessionRole = localStorage.getItem('rcm_user_session');
        if (sessionRole && currentView !== AppView.LANDING) {
           // Push state again to prevent exit
           window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [history, currentView]);

  const handleNavigate = (view: AppView, data?: any) => {
    // Push a dummy state to history API so back button triggers popstate
    window.history.pushState(null, '', '');
    setHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
    if (view === AppView.SECTION_NEWS_DETAIL && data) {
      setSelectedNews(data);
    }
  };

  const handleBack = () => {
    // Pop history API manually to sync with our manual back button
    // window.history.back(); // This triggers popstate, which handles the logic
    // But to avoid double trigger if we clicked a button, let's just do logic:
    if (history.length > 0) {
      const prevView = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setCurrentView(prevView);
    } else {
      setCurrentView(AppView.LANDING);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Determine if Player should be visible
  const isAppView = currentView.startsWith('APP_') && currentView !== AppView.APP_USER_MANAGEMENT;
  const isLanding = currentView === AppView.LANDING;
  const showPlayer = !isAppView && !isLanding;

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING:
        return <PublicLanding onNavigate={handleNavigate} />;
      case AppView.LISTENER_HOME:
        return <ListenerHome onNavigate={handleNavigate} news={news} />;
      case AppView.WORKER_HOME:
        return <WorkerHome onNavigate={handleNavigate} news={news} />;
      case AppView.ADMIN_DASHBOARD:
        return (
          <AdminDashboard 
            onNavigate={handleNavigate} 
            news={news} 
            setNews={setNews} 
          />
        );
      case AppView.APP_USER_MANAGEMENT:
        return (
          <UserManagement 
            onBack={handleBack} 
            users={users} 
            setUsers={setUsers} 
            setHistoryContent={setHistoryContent}
            setAboutContent={setAboutContent}
          />
        );
      
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
        return <PlaceholderView title="Nuestra Historia" subtitle="El legado de la radio" onBack={handleBack} customContent={historyContent} />;
      case AppView.SECTION_PROGRAMMING_PUBLIC:
        return <PlaceholderView title="Parrilla de Programación" subtitle="Guía para el oyente" onBack={handleBack} />;
      case AppView.SECTION_ABOUT:
        return <PlaceholderView title="Quiénes Somos" subtitle="Nuestro equipo y misión" onBack={handleBack} customContent={aboutContent} />;
      case AppView.SECTION_NEWS:
        return <ListenerHome onNavigate={handleNavigate} news={news} />; // Reuse home for full list or create specific
      case AppView.SECTION_NEWS_DETAIL:
        return <PlaceholderView title="Noticias" subtitle={selectedNews?.category || "Actualidad"} onBack={handleBack} newsItem={selectedNews} />;
      case AppView.SECTION_PODCAST:
        return <PlaceholderView title="Podcasts" subtitle="Escucha a tu ritmo" onBack={handleBack} />;
      case AppView.SECTION_PROFILE:
        return <PlaceholderView title="Mi Perfil" subtitle="Configuración de usuario" onBack={handleBack} />;
        
      default:
        return <PublicLanding onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#1A100C] font-display">
      {/* Global Audio Element */}
      <audio 
        ref={audioRef} 
        src="https://icecast.teveo.cu/KR43FF7C" 
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      ></audio>

      {renderView()}

      {/* Persistent Player Overlay */}
      {showPlayer && (
         <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#3E1E16]/95 backdrop-blur-xl border-t border-[#9E7649]/20 px-4 py-3 pb-safe-bottom">
         <div className="max-w-md mx-auto flex items-center gap-3">
             <div className="w-10 h-10 rounded bg-stone-800 bg-cover bg-center shadow-md border border-[#9E7649]/30 shrink-0" style={{ backgroundImage: `url(${currentProgram.image})` }}></div>
             <div className="flex-1 min-w-0">
                <p className="text-[#F5EFE6] text-sm font-bold truncate">{currentProgram.name}</p>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <p className="text-[#9E7649] text-[10px] truncate">95.3 FM • Señal en vivo</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <button className="text-[#E8DCCF]/60 hover:text-[#9E7649] transition-colors"><SkipBack size={20} fill="currentColor" className="opacity-50" /></button>
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-[#9E7649] text-[#3E1E16] flex items-center justify-center shadow-lg hover:scale-105 transition-all border border-white/10"
                >
                   {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                <button className="text-[#E8DCCF]/60 hover:text-[#9E7649] transition-colors"><SkipForward size={20} fill="currentColor" className="opacity-50" /></button>
             </div>
         </div>
         {/* Progress Bar (Indeterminate for Live) */}
         <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#6B442A] overflow-hidden">
            {isPlaying && (
                <div className="absolute top-0 bottom-0 bg-[#9E7649] animate-progress-indeterminate"></div>
            )}
         </div>
         <style>{`
            @keyframes progress-indeterminate {
                0% { left: -30%; width: 30%; }
                50% { left: 40%; width: 40%; }
                100% { left: 100%; width: 30%; }
            }
            .animate-progress-indeterminate {
                animation: progress-indeterminate 2s infinite linear;
            }
         `}</style>
      </div>
      )}
    </div>
  );
};

export default App;
