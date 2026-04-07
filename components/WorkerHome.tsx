import React, { useState, useEffect } from 'react';
import { AppView, NewsItem, User, ProgramItem } from '../types';
import { CalendarDays, Music, FileText, Podcast, LogOut, User as UserIcon, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, Menu, Play, Pause, Download, Upload } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';
import Sidebar from './Sidebar';
import { loadSelectionsFromDB, loadSavedSelectionsListFromDB, loadReportsFromDB, loadProductionsFromDB, saveSelectionsToDB, saveSavedSelectionsListToDB, saveReportToDB, saveProductionToDB, clearReportsDB, clearProductionsDB } from './musica/services/db';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  currentUser: User | null;
  onLogout: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isPlaying: boolean;
  togglePlay: () => void;
  isRefreshing: boolean;
  onRefreshLive: () => void;
  currentProgram: ProgramItem;
  onMenuClick?: () => void;
  onBackup?: () => void;
}

const newsColors = [
  'bg-[#3E1E16]', // Brand Dark Brown
  'bg-[#1a237e]', // Deep Blue
  'bg-[#004d40]', // Deep Teal
  'bg-[#b71c1c]', // Deep Red
  'bg-[#4a148c]', // Deep Purple
  'bg-[#263238]', // Dark Blue Grey
];

const WorkerHome: React.FC<Props> = ({ 
    onNavigate, 
    news, 
    currentUser, 
    onLogout, 
    onSync, 
    isSyncing,
    isPlaying,
    togglePlay,
    isRefreshing,
    onRefreshLive,
    currentProgram,
    onMenuClick,
    onBackup
}) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
      if (!audioRef.current) {
          audioRef.current = new Audio('https://github.com/PeJotaCuba/Bases-de-datos-CMNL/raw/7a633b8a95e5f14f18242aa5913739dfce491c68/AudioNoticias.mp3');
          audioRef.current.onended = () => setIsAudioPlaying(false);
      }
      
      if (isAudioPlaying) {
          audioRef.current.pause();
          setIsAudioPlaying(false);
      } else {
          audioRef.current.play();
          setIsAudioPlaying(true);
      }
  };

  // Carousel logic
  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % news.length);
      }, 5000); 
      return () => clearInterval(interval);
    } else {
        setCurrentNewsIndex(0);
    }
  }, [news]);

  const activeNews = news.length > 0 ? news[currentNewsIndex] : null;
  const currentColor = newsColors[currentNewsIndex % newsColors.length];

  const nextNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(news.length > 0) setCurrentNewsIndex((prev) => (prev + 1) % news.length);
  };

  const prevNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(news.length > 0) setCurrentNewsIndex((prev) => (prev - 1 + news.length) % news.length);
  };

  const handleDownloadBackup = async () => {
    if (onBackup) {
      onBackup();
    }
  };

  const handleLoadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const username = currentUser.username;
    // Allow the standard filename format: Respaldo_[username]_[date]_[time].json
    // or just [username].json for backward compatibility
    const isValidName = file.name.startsWith(`Respaldo_${username}`) || file.name === `${username}.json`;

    if (!isValidName) {
        alert(`El archivo de respaldo debe pertenecer al usuario "${username}".`);
        e.target.value = '';
        return;
    }

    if (!confirm('¿Estás seguro de sincronizar con este archivo? Esto sobrescribirá tus datos locales.')) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            // Validación de estructura básica
            if (!json || typeof json !== 'object' || json.username !== currentUser.username) {
                throw new Error("El archivo no pertenece a este usuario o no tiene la estructura esperada.");
            }
            
            // Extract data depending on structure (legacy or new)
            const data = json.data || json;
            const music = data.music || data.musica;
            const payments = data.payments || data.gestion;
            const agenda = data.agenda;
            const guiones = data.guiones;

            // 1. Agenda: Intereses de usuario y otros
            if (agenda) {
                if (agenda.users) {
                    // Update interests for current user in the users list
                    try {
                        const currentUsers = JSON.parse(localStorage.getItem('rcm_users') || '[]');
                        const backupUsers = agenda.users;
                        const backupUser = backupUsers.find((u: any) => u.username === currentUser.username);
                        
                        if (backupUser && backupUser.interests) {
                            const userIndex = currentUsers.findIndex((u: any) => u.username === currentUser.username);
                            if (userIndex !== -1) {
                                currentUsers[userIndex].interests = backupUser.interests;
                                localStorage.setItem('rcm_users', JSON.stringify(currentUsers));
                            }
                        }
                    } catch (e) {
                        console.error("Error updating agenda interests:", e);
                    }
                } else if (agenda.interests) {
                    // Legacy structure
                    try {
                        const users = JSON.parse(localStorage.getItem('rcm_users') || '[]');
                        const userIndex = users.findIndex((u: any) => u.username === currentUser.username);
                        if (userIndex !== -1) {
                            users[userIndex].interests = agenda.interests;
                            localStorage.setItem('rcm_users', JSON.stringify(users));
                        }
                    } catch (e) {
                        console.error("Error updating agenda interests:", e);
                    }
                }
            }

            // 2. Música: Selecciones y producciones
            if (music) {
                if (music.selections) await saveSelectionsToDB(music.selections);
                if (music.savedSelectionsList) await saveSavedSelectionsListToDB(music.savedSelectionsList);
                else if (music.savedSelections) await saveSavedSelectionsListToDB(music.savedSelections); // Legacy

                if (music.reports) {
                    await clearReportsDB();
                    for (const report of music.reports) {
                        await saveReportToDB(report);
                    }
                }
                if (music.productions) {
                    await clearProductionsDB();
                    for (const prod of music.productions) {
                        await saveProductionToDB(prod);
                    }
                }
                if (music.currentSelection) {
                    localStorage.setItem(`user_${currentUser.username}_rcm_current_selection`, JSON.stringify(music.currentSelection));
                }
                if (music.savedSelections) {
                    localStorage.setItem(`user_${currentUser.username}_rcm_saved_selections`, JSON.stringify(music.savedSelections));
                }
            }

            // 3. Gestión: Pagos
            if (payments) {
                if (payments.worklogs) localStorage.setItem(`user_${currentUser.username}_rcm_data_worklogs`, JSON.stringify(payments.worklogs));
                if (payments.consolidated) localStorage.setItem(`user_${currentUser.username}_rcm_data_consolidated`, JSON.stringify(payments.consolidated));
                if (payments.consolidatedMonths) localStorage.setItem(`user_${currentUser.username}_rcm_consolidated_months`, JSON.stringify(payments.consolidatedMonths));
                if (payments.interruptions) localStorage.setItem(`user_${currentUser.username}_rcm_interruptions`, JSON.stringify(payments.interruptions));
                if (payments.habitualExclusions) localStorage.setItem(`user_${currentUser.username}_habitual_exclusions`, JSON.stringify(payments.habitualExclusions));
                if (payments.habitualMode !== undefined) localStorage.setItem(`user_${currentUser.username}_habitual_mode`, String(payments.habitualMode));
            }

            // 4. Guiones
            if (guiones) {
                Object.keys(guiones).forEach(key => {
                    localStorage.setItem(key, JSON.stringify(guiones[key]));
                });
            }

            alert('Sincronización completada con éxito. La aplicación se recargará.');
            window.location.reload();
        } catch (error) {
            console.error("Error parsing backup file:", error);
            alert("Error al leer el archivo de respaldo. Asegúrate de que sea un archivo JSON válido y pertenezca a tu usuario.");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  return (
    <div className="relative flex min-h-screen h-full w-full flex-col overflow-x-hidden bg-[#2a1b12] font-display text-white overflow-y-auto no-scrollbar pb-10">
      {/* Background Image overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center mix-blend-overlay fixed" 
        style={{ backgroundImage: `url('https://picsum.photos/id/149/1080/1920')` }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#2a1b12]/90 via-[#2a1b12]/80 to-[#2a1b12] pointer-events-none fixed"></div>

      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-30 w-full px-4 py-3 flex items-center justify-between bg-[#2a1b12]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
              onClick={onMenuClick}
              className="text-[#FFF8DC]/80 hover:text-white transition-colors p-1"
          >
              <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden p-0 shadow-lg">
               <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#FFF8DC] leading-none tracking-tight">CMNL App</h1>
              <p className="text-[8px] text-[#CD853F] uppercase tracking-tighter mt-0.5">Gestión Interna</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 py-4 items-center max-w-2xl mx-auto w-full gap-8">
        
        {/* Branding (Hidden as it's now in the header) */}
        <div className="h-2"></div>

        {/* Live Program Widget (Integrated Player) */}
        <div className="w-full">
            <div className="flex items-center justify-between mb-3 px-1">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                 </span>
                 En el Aire
               </h2>
            </div>

            <div className="relative bg-[#2C1B15] rounded-xl overflow-hidden border border-[#9E7649]/10 group shadow-lg">
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
               <div className="p-4 flex items-center gap-3">
                  
                  {/* Vector Visualization (Left) */}
                  <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                      <div className="flex gap-0.5 h-6 items-end">
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_0.8s_ease-in-out_infinite]' : 'h-2'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_1.2s_ease-in-out_infinite]' : 'h-4'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_0.5s_ease-in-out_infinite]' : 'h-1'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_1.0s_ease-in-out_infinite]' : 'h-3'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_0.7s_ease-in-out_infinite]' : 'h-2'}`}></div>
                      </div>
                  </div>

                  {/* Info (Center) */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-0.5">
                         <span className="bg-red-600/20 text-red-500 text-[8px] font-bold px-1.5 py-0.5 rounded border border-red-600/20 uppercase tracking-wider">En Vivo</span>
                     </div>
                     <h4 className="text-white font-bold text-sm sm:text-base leading-tight line-clamp-2">{currentProgram.name}</h4>
                     <p className="text-[#9E7649] text-xs font-medium truncate">{currentProgram.time}</p>
                  </div>

                  {/* Controls (Right) */}
                  <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-[#9E7649] text-[#3E1E16] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                        title={isPlaying ? "Pausar" : "Reproducir"}
                      >
                         {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                      </button>
                      <button 
                          onClick={onRefreshLive}
                          className={`w-10 h-10 rounded-full bg-[#2C1B15] border border-[#9E7649]/30 text-[#9E7649] flex items-center justify-center shadow-lg hover:bg-[#9E7649]/10 active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                          title="Actualizar señal"
                      >
                          <RefreshCw size={18} />
                      </button>
                  </div>
               </div>
               {/* Background blur effect */}
               <div className="absolute inset-0 z-[-1] opacity-20 bg-cover bg-center blur-xl" style={{ backgroundImage: `url(${currentProgram.image})` }}></div>
            </div>
        </div>

        {/* News Carousel */}
        {activeNews && (
            <div className="w-full flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-3 px-1">
                     <h2 className="text-lg font-bold text-white">Noticias Recientes</h2>
                     <button 
                        onClick={toggleAudio}
                        className="flex items-center gap-2 bg-[#C69C6D]/20 hover:bg-[#C69C6D]/40 text-[#C69C6D] px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                     >
                        {isAudioPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        {isAudioPlaying ? 'Pausar' : 'Escuchar'}
                     </button>
                </div>
                <div 
                    onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} 
                    className={`w-full relative rounded-xl ${currentColor} border border-white/5 overflow-hidden shadow-lg flex-1 min-h-[200px] cursor-pointer group transition-colors duration-500`}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>

                    {news.length > 1 && (
                        <>
                            <button onClick={prevNews} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white/70 hover:text-white z-20 transition-all border border-white/10">
                                <ChevronLeft size={24} />
                            </button>
                            <button onClick={nextNews} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white/70 hover:text-white z-20 transition-all border border-white/10">
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}

                    <div className="absolute inset-0 p-6 flex flex-col justify-center px-12 items-start text-left">
                        <div className="flex items-center gap-1 mb-3">
                            {news.slice(0, 6).map((_, idx) => (
                                <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === (currentNewsIndex % 6) ? 'bg-white' : 'bg-white/30'}`}></div>
                            ))}
                        </div>
                        <h4 className="text-xl font-bold leading-tight text-white mb-2 line-clamp-2">{activeNews.title}</h4>
                        <p className="text-sm text-stone-300 line-clamp-3 opacity-90">{activeNews.content}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Backup and Sync Controls for Non-Admins/Coordinators */}
        {currentUser?.classification !== 'Coordinador' && currentUser?.classification !== 'Administrador' && currentUser?.role !== 'admin' && (
            <div className="w-full bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-4 shadow-lg flex flex-col gap-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText size={16} className="text-[#9E7649]" />
                    Respaldo y Sincronización
                </h3>
                <div className="flex gap-3">
                    <button 
                        onClick={handleDownloadBackup}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#9E7649] hover:bg-[#8B653D] text-white py-2 px-4 rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                        <Download size={16} />
                        Respaldar
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-2 bg-[#1A100C] border border-[#9E7649]/30 hover:bg-[#9E7649]/10 text-[#9E7649] hover:text-white py-2 px-4 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer">
                        <Upload size={16} />
                        Sincronizar
                        <input type="file" accept=".txt,.json" onChange={handleLoadBackup} className="hidden" />
                    </label>
                </div>
            </div>
        )}

        {/* Footer User Info */}
        <div className="mt-auto w-full">
           <div className="bg-[#3e2723]/60 rounded-xl p-4 border border-white/5 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                 <div className="h-10 w-10 rounded-full bg-stone-700/50 flex items-center justify-center border border-white/10 relative">
                    <UserIcon size={18} className="text-stone-300" />
                 </div>
                 <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Usuario conectado</p>
                    <p className="text-sm text-[#FFF8DC] font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-[#CD853F]">{currentUser?.classification || 'Trabajador'}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={onLogout} className="text-stone-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                     <LogOut size={20} />
                  </button>
              </div>
           </div>
           
           <div className="text-center mt-4">
              <p className="text-[10px] text-stone-600 uppercase tracking-[0.2em]">CMNL App • App Interna</p>
           </div>
        </div>
      </div>
      
      {/* Worker Group FAB */}
      <a 
         href="https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v" 
         target="_blank" 
         rel="noopener noreferrer"
         className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all"
         title="Grupo de Trabajo WhatsApp"
      >
         <MessageSquare size={28} fill="white" />
      </a>
    </div>
  );
};

export default WorkerHome;
