import React, { useState, useEffect } from 'react';
import { AppView, NewsItem, User, ProgramItem } from '../types';
import { CalendarDays, Music, FileText, Podcast, LogOut, User as UserIcon, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, Menu, Play, Pause } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';
import Sidebar from './Sidebar';

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
    currentProgram
}) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  
  return (
    <div className="relative flex min-h-screen h-full w-full flex-col overflow-x-hidden bg-[#2a1b12] font-display text-white overflow-y-auto no-scrollbar pb-10">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={onNavigate}
        currentUser={currentUser}
        onSync={onSync}
        isSyncing={isSyncing}
        onLogout={onLogout}
      />

      {/* Background Image overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center mix-blend-overlay fixed" 
        style={{ backgroundImage: `url('https://picsum.photos/id/149/1080/1920')` }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#2a1b12]/90 via-[#2a1b12]/80 to-[#2a1b12] pointer-events-none fixed"></div>

      {/* Top Nav */}
      <nav className="relative z-20 w-full px-6 py-6 flex justify-between items-center bg-[#2a1b12]/50 backdrop-blur-sm sticky top-0">
        <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-[#FFF8DC]/80 hover:text-white transition-colors"
        >
            <Menu size={24} />
        </button>
        
        {isSyncing && (
             <div className="flex items-center gap-2 text-[#CD853F] text-xs font-bold">
                 <RefreshCw size={14} className="animate-spin" />
                 <span className="hidden sm:inline">Sincronizando...</span>
             </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 py-4 items-center max-w-2xl mx-auto w-full gap-8">
        
        {/* Branding */}
        <div className="flex flex-col items-center justify-center mt-2 mb-4 space-y-4">
           <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="bg-white p-0 rounded-[1.5rem] border border-white/10 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden">
                 <img src={LOGO_URL} alt="CMNL App" className="w-full h-full object-cover" />
              </div>
           </div>
           <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-[#FFF8DC] mb-1">CMNL App</h1>
              <h2 className="text-[#CD853F] text-sm font-medium tracking-[0.2em] uppercase opacity-90">Gestión Interna</h2>
           </div>
        </div>

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
               <div className="p-5 flex items-center gap-5">
                  
                  {/* Vector Visualization (Left) */}
                  <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                      <div className="flex gap-1 h-8 items-end">
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_0.8s_ease-in-out_infinite]' : 'h-2'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_1.2s_ease-in-out_infinite]' : 'h-4'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_0.5s_ease-in-out_infinite]' : 'h-1'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_1.0s_ease-in-out_infinite]' : 'h-3'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-[soundbar_0.7s_ease-in-out_infinite]' : 'h-2'}`}></div>
                      </div>
                  </div>

                  {/* Info (Center) */}
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                         <span className="bg-red-600/20 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-600/20 uppercase tracking-wider">En Vivo • 95.3 FM</span>
                     </div>
                     <h4 className="text-white font-bold text-xl leading-tight truncate mb-1">{currentProgram.name}</h4>
                     <p className="text-[#9E7649] text-sm font-medium">{currentProgram.time}</p>
                  </div>

                  {/* Controls (Right) */}
                  <div className="flex items-center gap-4">
                      <button 
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-[#9E7649] text-[#3E1E16] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                        title={isPlaying ? "Pausar" : "Reproducir"}
                      >
                         {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                      </button>
                      <button 
                          onClick={onRefreshLive}
                          className={`w-12 h-12 rounded-full bg-[#9E7649] text-[#3E1E16] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                          title="Actualizar señal"
                      >
                          <RefreshCw size={24} />
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
