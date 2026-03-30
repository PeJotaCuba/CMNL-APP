import React, { useState, useEffect, useRef } from 'react';
import { AppView, User, NewsItem } from './types';
import PublicLanding from './components/PublicLanding';
import ListenerHome from './components/ListenerHome';
import WorkerHome from './components/WorkerHome';
import AdminDashboard from './components/AdminDashboard';
import ContentManagementSection from './components/gestion/ContentManagementSection';
import EquipoSection from './components/gestion/EquipoSection';
import GestionApp from './components/GestionApp';
import GuionesApp from './components/GuionesApp';
import AgendaApp from './components/agenda/AgendaApp';
import MusicaApp from './components/MusicaApp';
import GuiaSection from './components/GuiaSection';
import HistoryEvolutionView from './src/components/HistoryEvolutionView';
import Sidebar from './components/Sidebar';
import QuienesSomos from './components/QuienesSomos';
import NewsUploadModal from './components/NewsUploadModal';
import { PlaceholderView, CMNLAppView } from './components/GenericViews';
import { INITIAL_USERS, INITIAL_NEWS, INITIAL_HISTORY, INITIAL_ABOUT, getCurrentProgram, getCategoryVector } from './utils/scheduleData';
import BackupDialog from './components/BackupDialog';
import { GlobalFAB } from './src/components/GlobalFAB';
import { loadReportsFromDB, loadProductionsFromDB, loadSelectionsFromDB, loadSavedSelectionsListFromDB } from './components/musica/services/db';
import { Play, Pause, SkipBack, SkipForward, RefreshCw } from 'lucide-react';
import { fetchNewsFromFacebook } from './src/services/newsService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LISTENER_HOME);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [history, setHistory] = useState<AppView[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [isLogoutTrigger, setIsLogoutTrigger] = useState(false);
  const pendingNavigation = useRef<(() => void) | null>(null);

  const checkDirty = (callback: () => void, isLogout = false) => {
      // Check if user should see the backup prompt
      const isExcluded = currentUser?.username === 'admin' || currentUser?.classification === 'Administrador';
      const isActiveRole = ['Director', 'Coordinador', 'Trabajador', 'Usuario'].includes(currentUser?.classification || '');

      if (isDirty && !isExcluded && isActiveRole) {
          pendingNavigation.current = callback;
          setIsLogoutTrigger(isLogout);
          setShowBackupDialog(true);
      } else {
          callback();
      }
  };

  const handleBackup = async () => {
      if (currentUser) {
          // Collect all data
          const username = currentUser.username;
          
          // 1. Payments Data (LocalStorage)
          const paymentsData = {
              worklogs: JSON.parse(localStorage.getItem('rcm_data_worklogs') || '[]').filter((l: any) => l.userId === username),
              consolidated: JSON.parse(localStorage.getItem('rcm_data_consolidated') || '[]').filter((l: any) => l.userId === username),
              interruptions: JSON.parse(localStorage.getItem('rcm_interruptions') || '[]').filter((l: any) => l.userId === username),
              consolidatedMonths: JSON.parse(localStorage.getItem('rcm_consolidated_months') || '[]').filter((l: any) => l.userId === username),
              habitualExclusions: JSON.parse(localStorage.getItem('rcm_habitual_exclusions') || '[]').filter((l: any) => l.username === username),
          };

          // 2. Music Data (IndexedDB + LocalStorage)
          const [reports, productions, selections, savedSelectionsList] = await Promise.all([
              loadReportsFromDB(username),
              loadProductionsFromDB(), // These might need filtering by user if they have a field
              loadSelectionsFromDB(),
              loadSavedSelectionsListFromDB()
          ]);

          const musicData = {
              currentSelection: JSON.parse(localStorage.getItem(`user_${username}_rcm_current_selection`) || '[]'),
              savedSelections: JSON.parse(localStorage.getItem(`user_${username}_rcm_saved_selections`) || '[]'),
              reports: reports,
              productions: productions.filter((p: any) => p.createdBy === username || !p.createdBy),
              selections: selections,
              savedSelectionsList: savedSelectionsList
          };

          // 3. Guiones Data (LocalStorage)
          const guionesData: Record<string, any> = {};
          for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('guionbd_data_')) {
                  guionesData[key] = JSON.parse(localStorage.getItem(key) || '[]');
              }
          }

          // 4. Agenda Data (LocalStorage)
          const agendaData = {
              programs: JSON.parse(localStorage.getItem('rcm_programs') || '[]'),
              efemerides: JSON.parse(localStorage.getItem('rcm_efemerides') || '{}'),
              conmemoraciones: JSON.parse(localStorage.getItem('rcm_conmemoraciones') || '{}'),
              dayThemes: JSON.parse(localStorage.getItem('rcm_day_themes') || '{}'),
              propaganda: JSON.parse(localStorage.getItem('rcm_propaganda') || '{}'),
              users: JSON.parse(localStorage.getItem('rcm_users') || '[]'),
          };

          const backupData = {
              username: username,
              name: currentUser.name,
              classification: currentUser.classification,
              timestamp: new Date().toISOString(),
              version: "1.0",
              data: {
                  payments: paymentsData,
                  music: musicData,
                  guiones: guionesData,
                  agenda: agendaData
              }
          };

          const dataStr = JSON.stringify(backupData, null, 2);
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Respaldo_${username}_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Update last backup timestamp
          localStorage.setItem(`last_backup_${username}`, new Date().getTime().toString());
      }

      setIsDirty(false);
      setShowBackupDialog(false);
      if (pendingNavigation.current) {
          pendingNavigation.current();
          pendingNavigation.current = null;
      }
  };
  
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
  const [impersonatedUser, setImpersonatedUser] = useState<any | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentProgram, setCurrentProgram] = useState(getCurrentProgram());

  // 24-Hour Backup Reminder Effect
  useEffect(() => {
    if (currentUser) {
      const isExcluded = currentUser.username === 'admin' || currentUser.classification === 'Administrador';
      const isActiveRole = ['director', 'asesor', 'realizador', 'locutor', 'guionista', 'periodista', 'coordinador', 'director de emisora', 'jefe de programación', 'especialista', 'auxiliar general', 'asistente de dirección', 'recepcionista'].includes(currentUser.classification || '');
      
      if (!isExcluded && isActiveRole) {
        const lastBackup = localStorage.getItem(`last_backup_${currentUser.username}`);
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (!lastBackup || (now - parseInt(lastBackup)) > twentyFourHours) {
          // If 24h passed, mark as dirty to trigger prompt on next navigation or logout
          setIsDirty(true);
        }
      }
    }
  }, [currentUser]);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('rcm_data_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('rcm_data_news', JSON.stringify(news)); }, [news]);
  useEffect(() => { localStorage.setItem('rcm_data_history', historyContent); }, [historyContent]);
  useEffect(() => { localStorage.setItem('rcm_data_about', aboutContent); }, [aboutContent]);

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
      // If there is a hash, we assume it's internal navigation for one of the sub-apps
      // (AgendaApp, GestionApp, GuionesApp, MusicaApp, or EquipoSection)
      // We ignore this event to prevent App.tsx from unmounting the app
      if (window.location.hash.length > 1) {
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
    if (view === AppView.ADMIN_SECTION_NEWS) {
      setIsNewsModalOpen(true);
      // If we are already in Admin Dashboard or Worker Home, don't change the main view
      if (currentView === AppView.ADMIN_DASHBOARD || currentView === AppView.WORKER_HOME) {
        return;
      }
    }
    checkDirty(() => {
        window.history.pushState(null, '', window.location.pathname);
        setHistory((prev) => [...prev, currentView]);
        setCurrentView(view);
        if (view === AppView.SECTION_NEWS_DETAIL && data) {
          setSelectedNews(data);
        }
    });
  };

  const handleBack = () => {
    checkDirty(() => {
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
    });
  };

  const handleLogout = () => {
    checkDirty(() => {
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
        setCurrentView(AppView.LANDING); // Redirect to login
    }, true);
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

  const handleSystemBackup = () => {
      const backupData: any = {
          timestamp: new Date().toISOString(),
          // Global state data
          users: users,
          historyContent: historyContent,
          aboutContent: aboutContent,
          news: news,
          // Specific keys from localStorage
          fichas: JSON.parse(localStorage.getItem('rcm_data_fichas') || '[]'),
          catalogo: JSON.parse(localStorage.getItem('rcm_data_catalogo') || '[]'),
          transmissionConfig: JSON.parse(localStorage.getItem('rcm_transmission_config') || '{}'),
          equipo: JSON.parse(localStorage.getItem('rcm_equipo_cmnl') || '[]'),
          agendaPrograms: JSON.parse(localStorage.getItem('rcm_programs') || '[]'),
          agendaEfemerides: JSON.parse(localStorage.getItem('rcm_efemerides') || '{}'),
          agendaConmemoraciones: JSON.parse(localStorage.getItem('rcm_conmemoraciones') || '{}'),
          agendaDayThemes: JSON.parse(localStorage.getItem('rcm_day_themes') || '{}'),
          agendaUsers: JSON.parse(localStorage.getItem('rcm_users') || '[]'),
          agendaPropaganda: JSON.parse(localStorage.getItem('rcm_propaganda') || '{}'),
          programming: JSON.parse(localStorage.getItem('rcm_programming') || '[]'),
          history: localStorage.getItem('rcm_data_history') || '',
          about: localStorage.getItem('rcm_data_about') || '',
          news_data: JSON.parse(localStorage.getItem('rcm_data_news') || '[]'),
      };

      // Collect all relevant keys from localStorage
      const dynamicData: Record<string, any> = {};
      const musicKeys = [
          'rcm_users_db', 
          'rcm_programs_list', 
          'rcm_custom_roots',
          'rcm_current_selection',
          'rcm_saved_selections',
          'rcm_data_tracks'
      ];

      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;

          // Skip music-specific keys
          if (musicKeys.some(mk => key.includes(mk))) continue;

          // Include relevant patterns
          const isGuion = key.startsWith('guionbd_data_');
          const isSection = key.startsWith('rcm_sections_');
          const isPayment = key.startsWith('rcm_payment_');
          const isUserData = key.startsWith('user_') && (
              key.includes('rcm_data_worklogs') || 
              key.includes('rcm_data_consolidated') || 
              key.includes('rcm_interruptions') || 
              key.includes('rcm_consolidated_months') ||
              key.includes('habitual_mode') ||
              key.includes('habitual_exclusions')
          );

          if (isGuion || isSection || isPayment || isUserData) {
              try {
                  dynamicData[key] = JSON.parse(localStorage.getItem(key) || 'null');
              } catch (e) {
                  dynamicData[key] = localStorage.getItem(key);
              }
          }
      }
      
      backupData.dynamicData = dynamicData;

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `actualcmnl.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Respaldo del sistema generado con éxito (actualcmnl.json)');
  };

  // Logic to sync from GitHub (Used by Users and Admins)
  const handleCloudSync = async () => {
      if(isSyncing) return;
      
      const confirmSync = window.confirm('¿Desea actualizar los datos (Noticias, Parrilla, Usuarios) desde la nube y sincronizar Facebook?');
      if(!confirmSync) return;

      setIsSyncing(true);
      const GITHUB_RAW_URL = `https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/actualcmnl.json?t=${new Date().getTime()}`;

      try {
          // Sincronizar noticias de Facebook
          const fbNews = await fetchNewsFromFacebook();
          if (fbNews.length > 0) {
              setNews(prevNews => {
                  const merged = [...fbNews, ...prevNews.filter(n => n.category !== 'Facebook')];
                  localStorage.setItem('rcm_data_news', JSON.stringify(merged));
                  return merged;
              });
          }

          const response = await fetch(GITHUB_RAW_URL, { cache: "no-store" });
          if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
          
          const json = await response.json();
          const pendingUpdates: Record<string, string> = {};
          
          const setLocal = (key: string, value: any) => {
              pendingUpdates[key] = JSON.stringify(value);
          };

          // Helper to merge data while protecting user-generated content
          const mergeData = (localKey: string, jsonData: any[], idKey: string | ((item: any) => string)) => {
              if (!jsonData || !Array.isArray(jsonData)) return;
              
              const saved = localStorage.getItem(localKey);
              const localData = saved ? JSON.parse(saved) : [];

              // Protected Keys: NO BORRAR, MODIFICAR O RESETEAR
              const protectedKeys = ['rcm_data_worklogs', 'rcm_data_consolidated', 'rcm_interruptions', 'rcm_consolidated_months', 'rcm_users'];
              
              if (protectedKeys.includes(localKey)) {
                  if (localKey === 'rcm_users') {
                      // Preserve interests for agenda users
                      const merged = jsonData.map(newUser => {
                          const localItem = localData.find((u: any) => u.id === newUser.id);
                          return localItem && localItem.interests ? { ...newUser, interests: localItem.interests } : newUser;
                      });
                      setLocal(localKey, merged);
                  } else {
                      // For other protected data (worklogs, reports), keep local and add new ones from JSON if they don't exist
                      const getId = (item: any) => (typeof idKey === 'function' ? idKey(item) : item[idKey]);
                      const merged = [...localData];
                      jsonData.forEach(newItem => {
                          if (!merged.some(oldItem => getId(oldItem) === getId(newItem))) {
                              merged.push(newItem);
                          }
                      });
                      setLocal(localKey, merged);
                  }
                  return;
              }

              // Administrative data: Overwrite local with remote
              setLocal(localKey, jsonData);
          };

          const mergeRecordData = (localKey: string, jsonData: Record<string, any[]>) => {
              if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
              setLocal(localKey, jsonData);
          };

          const mergeSimpleRecord = (localKey: string, jsonData: Record<string, string>) => {
              if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
              setLocal(localKey, jsonData);
          };

          // Apply updates to state (will be persisted via useEffects, but we also setLocal for consistency)
          if (json.users && Array.isArray(json.users)) {
            setUsers(json.users);
            setLocal('rcm_data_users', json.users);
          }
          if (typeof json.historyContent === 'string') {
            setHistoryContent(json.historyContent);
            setLocal('rcm_data_history', json.historyContent);
          }
          if (typeof json.aboutContent === 'string') {
            setAboutContent(json.aboutContent);
            setLocal('rcm_data_about', json.aboutContent);
          }
          if (json.news && Array.isArray(json.news)) {
            const processedNews = json.news.map((n: NewsItem) => ({
                ...n,
                image: (!n.image || n.image === '') 
                    ? getCategoryVector(n.category || 'Boletín', n.title) 
                    : n.image
            }));
            setNews(processedNews);
            setLocal('rcm_data_news', processedNews);
          }
          
          if (json.fichas) mergeData('rcm_data_fichas', json.fichas, 'name');
          if (json.catalogo) mergeData('rcm_data_catalogo', json.catalogo, 'name');
          if (json.worklogs) mergeData('rcm_data_worklogs', json.worklogs, 'id');
          if (json.consolidated) mergeData('rcm_data_consolidated', json.consolidated, 'id');
          if (json.interruptions) mergeData('rcm_interruptions', json.interruptions, 'id');
          if (json.consolidatedMonths) mergeData('rcm_consolidated_months', json.consolidatedMonths, (item: any) => `${item.month}-${item.year}`);
          
          if (json.transmissionConfig) setLocal('rcm_transmission_config', json.transmissionConfig);
          if (json.paymentConfigs) {
              Object.entries(json.paymentConfigs).forEach(([key, value]) => setLocal(key, value));
          }
          if (json.scripts) {
              Object.entries(json.scripts).forEach(([key, value]) => mergeData(key, value as any[], 'id'));
          }
          if (json.programSections) {
              Object.entries(json.programSections).forEach(([key, value]) => mergeData(key, value as any[], 'name'));
          }
          if (json.agendaPrograms) setLocal('rcm_programs', json.agendaPrograms);
          if (json.agendaEfemerides) mergeRecordData('rcm_efemerides', json.agendaEfemerides);
          if (json.agendaConmemoraciones) mergeRecordData('rcm_conmemoraciones', json.agendaConmemoraciones);
          if (json.agendaDayThemes) mergeSimpleRecord('rcm_day_themes', json.agendaDayThemes);
          if (json.agendaUsers) mergeData('rcm_users', json.agendaUsers, 'id');
          if (json.agendaPropaganda) mergeRecordData('rcm_propaganda', json.agendaPropaganda);
          if (json.programsList && Array.isArray(json.programsList)) setLocal('rcm_programs_list', json.programsList);
          if (json.customRoots && Array.isArray(json.customRoots)) setLocal('rcm_custom_roots', json.customRoots);
          if (json.userData) {
              Object.entries(json.userData).forEach(([key, value]) => setLocal(key, value));
          }

          if (json.equipo && Array.isArray(json.equipo)) {
              setLocal('rcm_equipo_cmnl', json.equipo);
          } else {
              try {
                  const equipoResponse = await fetch(`https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json?t=${new Date().getTime()}`, { cache: "no-store" });
                  if (equipoResponse.ok) {
                      const equipoData = await equipoResponse.json();
                      if (Array.isArray(equipoData)) {
                          setLocal('rcm_equipo_cmnl', equipoData);
                          setLocal('rcm_equipo_last_update', Date.now().toString());
                      }
                  }
              } catch (equipoError) {
                  console.error("Error fetching equipo data during sync:", equipoError);
              }
          }

          // Atomic application of all updates
          Object.entries(pendingUpdates).forEach(([key, value]) => {
              localStorage.setItem(key, value);
          });

          alert('¡Sincronización completada! Los datos están actualizados.');
          window.location.reload();
      } catch (error) {
          console.error("Sync Error:", error);
          alert('Error de conexión. No se pudieron obtener los datos más recientes.');
      } finally {
          setIsSyncing(false);
      }
  };

  // Determine if Player should be visible
  const isAppView = currentView.startsWith('APP_');
  const isLoginScreen = currentView === AppView.LANDING; 
  // Hide player on WorkerHome and AdminDashboard as it's integrated there
  const isIntegratedPlayerView = currentView === AppView.WORKER_HOME || currentView === AppView.ADMIN_DASHBOARD;
  const showPlayer = !isAppView && !isLoginScreen && !isIntegratedPlayerView;

  const handleNewsUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        const blocks = text.split(/---/).filter(b => b.trim());
        const newNews: NewsItem[] = blocks.map((block, index) => {
          let cleanBlock = block.trim();
          
          // Omit tags
          cleanBlock = cleanBlock.replace(/Titular:\s*/gi, '');
          cleanBlock = cleanBlock.replace(/Autor:\s*/gi, '');
          cleanBlock = cleanBlock.replace(/Texto:\s*/gi, '');

          const lines = cleanBlock.split('\n').filter(l => l.trim());
          const title = lines[0] || 'Sin Título';
          
          let author = 'Equipo CMNL';
          let contentLines = lines.slice(1);
          
          if (contentLines.length > 0) {
             // If the second line was originally "Autor: [Name]", it's now just "[Name]"
             // If it starts with "Por ", we can remove it, otherwise we just take the whole line
             const possibleAuthor = contentLines[0].trim();
             if (possibleAuthor.toLowerCase().startsWith('por ')) {
                 author = possibleAuthor.substring(4).trim();
             } else {
                 author = possibleAuthor;
             }
             contentLines = contentLines.slice(1);
          }
          
          const content = contentLines.join('\n') || '';
          
          return {
            id: `news-${Date.now()}-${index}`,
            title,
            content,
            category: 'General',
            date: new Date().toLocaleDateString(),
            excerpt: content.slice(0, 100) + '...',
            author
          };
        });
        setNews(newNews);
        localStorage.setItem('rcm_data_news', JSON.stringify(newNews));
        alert(`${newNews.length} noticias cargadas y actualizadas correctamente.`);
    };
    reader.readAsText(file);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING: // Acts as LOGIN view now
        return <PublicLanding onNavigate={setCurrentView} users={users} onLoginSuccess={(user) => {
            setCurrentUser(user);
            localStorage.setItem('rcm_user_username', user.username);
            if(user.username === 'admin' || user.classification === 'Administrador') {
                handleNavigate(AppView.ADMIN_DASHBOARD);
            } else {
                handleNavigate(AppView.WORKER_HOME);
            }
        }} />;
      case AppView.LISTENER_HOME:
        return <ListenerHome onNavigate={handleNavigate} news={news} setNews={setNews} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.WORKER_HOME:
        return (
            <WorkerHome 
                onNavigate={handleNavigate} 
                news={news} 
                setNews={setNews}
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
            onSystemBackup={handleSystemBackup}
            isSyncing={isSyncing}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            isRefreshing={isRefreshing}
            onRefreshLive={handleRefreshLive}
            currentProgram={currentProgram}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        );
      case AppView.APP_EQUIPO:
        return (
          <EquipoSection 
            onBack={handleBack} 
            onMenuClick={() => setIsSidebarOpen(true)}
            currentUser={currentUser}
            catalogo={JSON.parse(localStorage.getItem('rcm_data_catalogo') || '[]')}
            onDirtyChange={setIsDirty}
            users={users}
            setUsers={setUsers}
            historyContent={historyContent}
            setHistoryContent={setHistoryContent}
            aboutContent={aboutContent}
            setAboutContent={setAboutContent}
            news={news}
            setNews={setNews}
            setImpersonatedUser={setImpersonatedUser}
          />
        );
      
      // CMNL Apps
      case AppView.APP_AGENDA:
        return <AgendaApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} onDirtyChange={setIsDirty} />;
      case AppView.APP_MUSICA:
        return <MusicaApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} onDirtyChange={setIsDirty} />;
      case AppView.APP_GUIA:
        return <GuiaSection onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.APP_GUIONES:
        return <GuionesApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} onDirtyChange={setIsDirty} />;
      case AppView.APP_PROGRAMACION:
        return (
          <GestionApp 
            onBack={handleBack} 
            onMenuClick={() => setIsSidebarOpen(true)} 
            currentUser={currentUser} 
            onDirtyChange={setIsDirty}
            users={users}
            setUsers={setUsers}
            historyContent={historyContent}
            setHistoryContent={setHistoryContent}
            aboutContent={aboutContent}
            setAboutContent={setAboutContent}
            news={news}
            setNews={setNews}
            setImpersonatedUser={setImpersonatedUser}
          />
        );

      // Public Sections
      case AppView.SECTION_HISTORY:
        return <PlaceholderView title="Nuestra Historia" subtitle="El legado de la radio" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} customContent={historyContent} />;
      case AppView.ADMIN_SECTION_HISTORY:
        return <PlaceholderView title="Nuestra Historia" subtitle="El legado de la radio" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} customContent={historyContent} isAdmin={true} onUpload={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => setHistoryContent(e.target?.result as string);
            reader.readAsText(file);
        }} />;
      case AppView.SECTION_HISTORY_EVOLUTION:
        return <HistoryEvolutionView currentUser={currentUser} onBack={handleBack} />;
      case AppView.SECTION_PROGRAMMING_PUBLIC:
        return <PlaceholderView title="Parrilla de Programación" subtitle="Guía para el oyente" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.ADMIN_SECTION_PROGRAMMING:
        return <PlaceholderView title="Parrilla de Programación" subtitle="Guía para el oyente" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} isAdmin={true} onUpload={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(l => l.trim());
                const newPrograms = lines.map((line, index) => {
                  const [time, name, description] = line.split('|').map(s => s.trim());
                  return {
                    id: `prog-${Date.now()}-${index}`,
                    time: time || '00:00',
                    name: name || 'Programa sin nombre',
                    description: description || '',
                    days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                  };
                });
                localStorage.setItem('rcm_programming', JSON.stringify(newPrograms));
                alert(`${newPrograms.length} programas cargados correctamente.`);
            };
            reader.readAsText(file);
        }} />;
      case AppView.SECTION_ABOUT:
        return <QuienesSomos onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.SECTION_NEWS:
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />; 
      case AppView.ADMIN_SECTION_NEWS:
        if (currentUser?.role === 'admin') {
          return (
            <AdminDashboard 
              onNavigate={handleNavigate} 
              news={news} 
              users={users} 
              currentUser={currentUser} 
              onLogout={handleLogout} 
              onSync={handleCloudSync} 
              onSystemBackup={handleSystemBackup}
              isSyncing={isSyncing}
              isPlaying={isPlaying}
              togglePlay={togglePlay}
              isRefreshing={isRefreshing}
              onRefreshLive={handleRefreshLive}
              currentProgram={currentProgram}
              onMenuClick={() => setIsSidebarOpen(true)}
            />
          );
        }
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />;
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

        {impersonatedUser && (
          <button 
              onClick={() => setImpersonatedUser(null)}
              className="fixed bottom-24 right-5 z-50 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg text-sm border-2 border-white/10 hover:bg-red-700 transition-colors"
          >
              Regresar a Admin
          </button>
        )}

        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onNavigate={handleNavigate}
          currentUser={impersonatedUser || currentUser}
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

        <BackupDialog 
          isOpen={showBackupDialog} 
          onClose={() => {
              setShowBackupDialog(false);
              if (pendingNavigation.current) {
                  pendingNavigation.current();
                  pendingNavigation.current = null;
              }
          }}
          onBackup={handleBackup}
          isLogoutTrigger={isLogoutTrigger}
        />

        <NewsUploadModal 
          isOpen={isNewsModalOpen} 
          onClose={() => setIsNewsModalOpen(false)} 
          onUpload={handleNewsUpload} 
        />

        {showPlayer && (
           <>
             <div className={`fixed bottom-0 left-0 right-0 z-[100] bg-[#3E1E16]/95 backdrop-blur-xl border-t border-[#9E7649]/20 transition-all duration-300 flex`}>
                 
                 {/* Left Info Box (Only on Desktop Listener Home) */}
                 {(currentView === AppView.LISTENER_HOME || currentView === AppView.SECTION_NEWS || currentView === AppView.ADMIN_SECTION_NEWS) && (
                    <div className="hidden md:flex flex-col justify-center w-64 bg-[#2C1B15] border-r border-white/5 px-6 shrink-0 py-3">
                        <p className="font-bold text-[#C69C6D] uppercase tracking-widest text-[10px] mb-1">Radio Ciudad Monumento</p>
                        <p className="text-[10px] text-stone-500">Voz de la segunda villa cubana</p>
                        <p className="text-[10px] text-stone-500 opacity-50 mt-1">CMNL App 2026</p>
                    </div>
                 )}

                 {/* Live Player Content */}
                 <div className="flex-1 px-4 py-3 pb-safe-bottom relative">
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
                 </div>
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
           </>
        )}
        
        {currentUser && (currentUser.classification === 'Administrador' || currentUser.classification === 'Coordinador') && (currentView === AppView.LISTENER_HOME || currentView === AppView.WORKER_HOME || currentView === AppView.ADMIN_DASHBOARD) && (
          <GlobalFAB currentUser={currentUser} onNavigate={handleNavigate} />
        )}
      </div>
  );
};

export default App;