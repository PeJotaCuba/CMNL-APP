import React, { useState, useEffect, useRef } from 'react';
import { AppView, User, NewsItem } from './types';
import PublicLanding from './components/PublicLanding';
import ListenerHome from './components/ListenerHome';
import WorkerHome from './components/WorkerHome';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import GestionApp from './components/GestionApp';
import GuionesApp from './components/GuionesApp';
import AgendaApp from './components/agenda/AgendaApp';
import MusicaApp from './components/MusicaApp';
import HistoryEvolutionView from './src/components/HistoryEvolutionView';
import Sidebar from './components/Sidebar';
import QuienesSomos from './components/QuienesSomos';
import { PlaceholderView, CMNLAppView } from './components/GenericViews';
import { INITIAL_USERS, INITIAL_NEWS, INITIAL_HISTORY, INITIAL_ABOUT, getCurrentProgram, getCategoryVector } from './utils/scheduleData';
import { Play, Pause, SkipBack, SkipForward, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LISTENER_HOME);
  const [history, setHistory] = useState<AppView[]>([]);
  
  // Global Data State - Initialized from LocalStorage or JSON via utils
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('rcm_data_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  
  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('rcm_data_news');
    return saved ? JSON.parse(saved) : INITIAL_NEWS;
  });

  const [historyContent, setHistoryContent] = useState<string>(() => {
    const saved = localStorage.getItem('rcm_data_history');
    return saved || INITIAL_HISTORY;
  });

  const [aboutContent, setAboutContent] = useState<string>(() => {
    const saved = localStorage.getItem('rcm_data_about');
    return saved || INITIAL_ABOUT;
  });

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentProgram, setCurrentProgram] = useState(getCurrentProgram());

  // Persistence Effects
  useEffect(() => { localStorage.setItem('rcm_data_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('rcm_data_news', JSON.stringify(news)); }, [news]);
  useEffect(() => { localStorage.setItem('rcm_data_history', historyContent); }, [historyContent]);
  useEffect(() => { localStorage.setItem('rcm_data_about', aboutContent); }, [aboutContent]);

  // Force update users from INITIAL_USERS to ensure code changes (like new passwords/roles) are applied
  useEffect(() => {
      setUsers(prevUsers => {
          const updatedUsers = [...prevUsers];
          let hasChanges = false;

          INITIAL_USERS.forEach(initUser => {
              const index = updatedUsers.findIndex(u => u.username === initUser.username);
              if (index !== -1) {
                  // Check if critical fields changed
                  if (updatedUsers[index].password !== initUser.password || 
                      updatedUsers[index].role !== initUser.role ||
                      updatedUsers[index].classification !== initUser.classification) {
                      updatedUsers[index] = { ...updatedUsers[index], ...initUser };
                      hasChanges = true;
                  }
              } else {
                  updatedUsers.push(initUser);
                  hasChanges = true;
              }
          });

          return hasChanges ? updatedUsers : prevUsers;
      });
  }, []);

  useEffect(() => {
    // Check for persistent session
    const sessionRole = localStorage.getItem('rcm_user_session');
    const sessionUsername = localStorage.getItem('rcm_user_username');

    if (sessionRole && sessionUsername) {
      const user = users.find(u => u.username === sessionUsername);
      if (user) {
        setCurrentUser(user);
        if (sessionRole === 'admin') {
          setCurrentView(AppView.ADMIN_DASHBOARD);
        } else if (sessionRole === 'worker') {
          setCurrentView(AppView.WORKER_HOME);
        }
      } else {
        // User data missing, fallback
        setCurrentView(AppView.LISTENER_HOME);
      }
    } else {
       setCurrentView(AppView.LISTENER_HOME);
    }
  }, []);

  // Update Program Info for Player
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProgram(getCurrentProgram());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Back Button Logic
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If in AgendaApp, GestionApp, or GuionesApp and navigating internally (hash exists), ignore this event
      // to prevent App.tsx from unmounting the app
      if ((currentView === AppView.APP_AGENDA || currentView === AppView.APP_PROGRAMACION || currentView === AppView.APP_GUIONES) && 
          window.location.hash.length > 1) {
        return;
      }

      if (history.length > 0) {
        const prevView = history[history.length - 1];
        setHistory((prev) => prev.slice(0, -1));
        setCurrentView(prevView);
      } else {
        const sessionRole = localStorage.getItem('rcm_user_session');
        if (sessionRole && currentView !== AppView.LISTENER_HOME) {
           window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [history, currentView]);

  const handleNavigate = (view: AppView, data?: any) => {
    window.history.pushState(null, '', window.location.pathname);
    setHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
    if (view === AppView.SECTION_NEWS_DETAIL && data) {
      setSelectedNews(data);
    }
  };

  const handleBack = () => {
    window.history.replaceState(null, '', window.location.pathname);
    if (history.length > 0) {
      const prevView = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setCurrentView(prevView);
    } else {
      const sessionRole = localStorage.getItem('rcm_user_session');
      if (sessionRole === 'admin') {
        setCurrentView(AppView.ADMIN_DASHBOARD);
      } else if (sessionRole === 'worker') {
        setCurrentView(AppView.WORKER_HOME);
      } else {
        setCurrentView(AppView.LISTENER_HOME);
      }
    }
  };

  const handleLogout = () => {
    // 1. Clear session
    localStorage.removeItem('rcm_user_session');
    localStorage.removeItem('rcm_user_username');
    setCurrentUser(null);
    
    // 2. Stop Player
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);

    // 3. Redirect
    setHistory([]);
    setCurrentView(AppView.LISTENER_HOME);
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

  const handleRefreshLive = () => {
      if (audioRef.current) {
          setIsRefreshing(true);
          const currentSrc = audioRef.current.src;
          audioRef.current.src = '';
          audioRef.current.load();
          
          setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.src = currentSrc;
                audioRef.current.load();
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                    setIsRefreshing(false);
                }).catch(() => setIsRefreshing(false));
              }
          }, 500);
      }
  };

  // Logic to sync from GitHub (Used by Users and Admins)
  const handleCloudSync = async () => {
      if(isSyncing) return;
      
      const confirmSync = window.confirm('¿Desea actualizar los datos (Noticias, Parrilla, Usuarios) desde la nube?');
      if(!confirmSync) return;

      setIsSyncing(true);
      const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/actualcmnl.json';

      try {
          const response = await fetch(GITHUB_RAW_URL, { cache: "no-store" });
          if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
          
          const json = await response.json();
          let changes = 0;

          if (json.users && Array.isArray(json.users)) {
            setUsers(prev => {
                const map = new Map(prev.map(u => [u.username, u]));
                json.users.forEach(u => map.set(u.username, u));
                return Array.from(map.values());
            });
            changes++;
          }
          if (typeof json.historyContent === 'string') {
            setHistoryContent(json.historyContent);
            changes++;
          }
          if (typeof json.aboutContent === 'string') {
            setAboutContent(json.aboutContent);
            changes++;
          }
          if (json.news && Array.isArray(json.news)) {
            const processedNews = json.news.map((n: NewsItem) => ({
                ...n,
                image: (!n.image || n.image === '') 
                    ? getCategoryVector(n.category || 'Boletín', n.title) 
                    : n.image
            }));
            setNews(processedNews);
            changes++;
          }
          
          const mergeData = (localKey: string, jsonData: any[], idKey: string | ((item: any) => string)) => {
              if (!jsonData || !Array.isArray(jsonData)) return;
              const localDataStr = localStorage.getItem(localKey);
              const localData = localDataStr ? JSON.parse(localDataStr) : [];
              if (!Array.isArray(localData)) {
                  localStorage.setItem(localKey, JSON.stringify(jsonData));
                  return;
              }
              const getId = (item: any) => typeof idKey === 'function' ? idKey(item) : String(item[idKey]);
              const mergedMap = new Map();
              localData.forEach(item => { if (item) mergedMap.set(getId(item), item); });
              jsonData.forEach(item => { if (item) mergedMap.set(getId(item), item); });
              localStorage.setItem(localKey, JSON.stringify(Array.from(mergedMap.values())));
          };

          const mergeRecordData = (localKey: string, jsonData: Record<string, any[]>, idKey: string) => {
              if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
              const localDataStr = localStorage.getItem(localKey);
              const localData = localDataStr ? JSON.parse(localDataStr) : {};
              const mergedObj: Record<string, any[]> = { ...localData };
              
              Object.entries(jsonData).forEach(([dateKey, items]) => {
                  if (!Array.isArray(items)) return;
                  if (!mergedObj[dateKey]) {
                      mergedObj[dateKey] = items;
                  } else {
                      const mergedMap = new Map();
                      const getKey = (item: any) => typeof item === 'string' ? item : (item[idKey] || JSON.stringify(item));
                      mergedObj[dateKey].forEach(item => { if (item) mergedMap.set(getKey(item), item); });
                      items.forEach(item => { if (item) mergedMap.set(getKey(item), item); });
                      mergedObj[dateKey] = Array.from(mergedMap.values());
                  }
              });
              localStorage.setItem(localKey, JSON.stringify(mergedObj));
          };

          const mergeSimpleRecord = (localKey: string, jsonData: Record<string, string>) => {
              if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
              const localDataStr = localStorage.getItem(localKey);
              const localData = localDataStr ? JSON.parse(localDataStr) : {};
              localStorage.setItem(localKey, JSON.stringify({ ...localData, ...jsonData }));
          };

          if (json.fichas) {
              mergeData('rcm_data_fichas', json.fichas, 'name');
              changes++;
          }
          if (json.catalogo) {
              mergeData('rcm_data_catalogo', json.catalogo, 'name');
              changes++;
          }
          if (json.worklogs) {
              mergeData('rcm_data_worklogs', json.worklogs, 'id');
              changes++;
          }
          if (json.consolidated) {
              mergeData('rcm_data_consolidated', json.consolidated, 'id');
              changes++;
          }
          if (json.interruptions) {
              mergeData('rcm_interruptions', json.interruptions, 'id');
              changes++;
          }
          if (json.consolidatedMonths) {
              mergeData('rcm_consolidated_months', json.consolidatedMonths, (item: any) => `${item.month}-${item.year}`);
              changes++;
          }
          if (json.transmissionConfig) {
              localStorage.setItem('rcm_transmission_config', JSON.stringify(json.transmissionConfig));
              changes++;
          }
          if (json.paymentConfigs) {
              Object.entries(json.paymentConfigs).forEach(([key, value]) => {
                  const localValStr = localStorage.getItem(key);
                  const localVal = localValStr ? JSON.parse(localValStr) : {};
                  localStorage.setItem(key, JSON.stringify({ ...localVal, ...(value as any) }));
              });
              changes++;
          }
          if (json.scripts) {
              Object.entries(json.scripts).forEach(([key, value]) => {
                  mergeData(key, value as any[], 'id');
              });
              changes++;
          }
          if (json.programSections) {
              Object.entries(json.programSections).forEach(([key, value]) => {
                  mergeData(key, value as any[], 'name');
              });
              changes++;
          }
          if (json.agendaPrograms) {
              localStorage.setItem('rcm_programs', JSON.stringify(json.agendaPrograms));
              changes++;
          }
          if (json.agendaEfemerides) {
              mergeRecordData('rcm_efemerides', json.agendaEfemerides, 'id');
              changes++;
          }
          if (json.agendaConmemoraciones) {
              mergeRecordData('rcm_conmemoraciones', json.agendaConmemoraciones, 'id');
              changes++;
          }
          if (json.agendaDayThemes) {
              mergeSimpleRecord('rcm_day_themes', json.agendaDayThemes);
              changes++;
          }
          if (json.agendaUsers) {
              mergeData('rcm_users', json.agendaUsers, 'id');
              changes++;
          }
          if (json.agendaPropaganda) {
              mergeRecordData('rcm_propaganda', json.agendaPropaganda, 'id');
              changes++;
          }

          // Fetch equipocmnl.json
          try {
              const equipoResponse = await fetch('https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json', { cache: "no-store" });
              if (equipoResponse.ok) {
                  const equipoData = await equipoResponse.json();
                  if (Array.isArray(equipoData)) {
                      localStorage.setItem('rcm_equipo_cmnl', JSON.stringify(equipoData));
                      localStorage.setItem('rcm_equipo_last_update', Date.now().toString());
                      changes++;
                  }
              }
          } catch (equipoError) {
              console.error("Error fetching equipo data during sync:", equipoError);
          }

          alert('¡Sincronización completada! Los datos están actualizados.');
          window.location.reload();
      } catch (error) {
          console.error("Sync Error:", error);
          alert('Error de conexión. No se pudieron obtener los datos más recientes.');
      } finally {
          setIsSyncing(false);
      }
  };

  const handleUpdateFromCoor = async () => {
    try {
        const response = await fetch('https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/coorbd.json');
        const data = await response.json();
        Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });
        alert('Actualización completada');
    } catch (error) {
        console.error(error);
        alert('Error al actualizar');
    }
  };

  // Determine if Player should be visible
  const isAppView = currentView.startsWith('APP_') && currentView !== AppView.APP_USER_MANAGEMENT;
  const isLoginScreen = currentView === AppView.LANDING; 
  // Hide player on WorkerHome and AdminDashboard as it's integrated there
  const isIntegratedPlayerView = currentView === AppView.WORKER_HOME || currentView === AppView.ADMIN_DASHBOARD;
  const showPlayer = !isAppView && !isLoginScreen && !isIntegratedPlayerView;

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING: // Acts as LOGIN view now
        return <PublicLanding onNavigate={setCurrentView} users={users} onLoginSuccess={(user) => {
            setCurrentUser(user);
            localStorage.setItem('rcm_user_username', user.username);
            if(user.role === 'admin') {
                handleNavigate(AppView.ADMIN_DASHBOARD);
            } else {
                handleNavigate(AppView.WORKER_HOME);
            }
        }} />;
      case AppView.LISTENER_HOME:
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.WORKER_HOME:
        return (
            <WorkerHome 
                onNavigate={handleNavigate} 
                news={news} 
                currentUser={currentUser} 
                onLogout={handleLogout}
                onSync={handleCloudSync}
                isSyncing={isSyncing}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                isRefreshing={isRefreshing}
                onRefreshLive={handleRefreshLive}
                currentProgram={currentProgram}
                onMenuClick={() => setIsSidebarOpen(true)}
            />
        );
      case AppView.ADMIN_DASHBOARD:
        return (
          <AdminDashboard 
            onNavigate={handleNavigate} 
            news={news} 
            users={users}
            currentUser={currentUser}
            onLogout={handleLogout}
            onSync={handleCloudSync}
            isSyncing={isSyncing}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            isRefreshing={isRefreshing}
            onRefreshLive={handleRefreshLive}
            currentProgram={currentProgram}
            onMenuClick={() => setIsSidebarOpen(true)}
            onUpdateFromCoor={handleUpdateFromCoor}
          />
        );
      case AppView.APP_USER_MANAGEMENT:
        return (
          <UserManagement 
            onBack={handleBack} 
            onMenuClick={() => setIsSidebarOpen(true)}
            users={users} 
            setUsers={setUsers} 
            historyContent={historyContent}
            setHistoryContent={setHistoryContent}
            aboutContent={aboutContent}
            setAboutContent={setAboutContent}
            news={news}
            setNews={setNews}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
            currentUser={currentUser}
          />
        );
      
      // CMNL Apps
      case AppView.APP_AGENDA:
        return <AgendaApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} />;
      case AppView.APP_MUSICA:
        return <MusicaApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} />;
      case AppView.APP_GUIONES:
        return <GuionesApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} />;
      case AppView.APP_PROGRAMACION:
        return <GestionApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} />;

      // Public Sections
      case AppView.SECTION_HISTORY:
        return <PlaceholderView title="Nuestra Historia" subtitle="El legado de la radio" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} customContent={historyContent} />;
      case AppView.SECTION_HISTORY_EVOLUTION:
        return <HistoryEvolutionView currentUser={currentUser} onBack={handleBack} />;
      case AppView.SECTION_PROGRAMMING_PUBLIC:
        return <PlaceholderView title="Parrilla de Programación" subtitle="Guía para el oyente" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.SECTION_ABOUT:
        return <QuienesSomos onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.SECTION_NEWS:
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />; 
      case AppView.SECTION_NEWS_DETAIL:
        return <PlaceholderView title="Noticias" subtitle={selectedNews?.category || "Actualidad"} onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} newsItem={selectedNews} />;
      case AppView.SECTION_PODCAST:
        return <PlaceholderView title="Podcasts" subtitle="Escucha a tu ritmo" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.SECTION_PROFILE:
        return <PlaceholderView title="Mi Perfil" subtitle="Configuración de usuario" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
        
      default:
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />;
    }
  };

  return (
      <div className="w-full min-h-screen bg-[#2C1B15] font-display">
        <audio 
          ref={audioRef} 
          src="https://icecast.teveo.cu/KR43FF7C" 
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        ></audio>

        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onSync={handleCloudSync}
          isSyncing={isSyncing}
          onLogout={handleLogout}
          onLogin={() => setCurrentView(AppView.LANDING)}
        />

        {renderView()}

        {isSyncing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="relative">
              <div className="size-24 rounded-full border-4 border-[#9E7649]/20 border-t-[#9E7649] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={32} className="text-[#9E7649] animate-pulse" />
              </div>
            </div>
            <p className="mt-6 text-[#E8DCCF] font-bold tracking-widest uppercase text-sm animate-pulse">Sincronizando datos...</p>
            <p className="mt-2 text-[#9E7649] text-xs">Por favor, espere un momento</p>
          </div>
        )}

        {showPlayer && (
           <div className={`fixed ${(currentView === AppView.LISTENER_HOME || currentView === AppView.SECTION_NEWS) ? 'bottom-16 md:bottom-0 md:left-64' : 'bottom-0 left-0'} right-0 z-[100] bg-[#3E1E16]/95 backdrop-blur-xl border-t border-[#9E7649]/20 px-4 py-3 pb-safe-bottom transition-all duration-300`}>
           <div className="max-w-md mx-auto flex items-center gap-3">
               {/* Refresh Button replacing previous Image */}
               <button 
                  onClick={handleRefreshLive}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-[#9E7649]/20 flex items-center justify-center shrink-0 text-[#9E7649] hover:bg-[#9E7649]/10 active:scale-95 transition-all"
                  title="Actualizar transmisión"
               >
                   <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
               </button>

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