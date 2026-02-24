import React, { useEffect, useState } from 'react';
import { AppView, NewsItem, User, ProgramItem } from '../types';
import { Settings, ChevronRight, ChevronLeft, CalendarDays, Music, FileText, Podcast, LogOut, MessageSquare, Menu, ScrollText, Mic, Users, RefreshCw, Play, Pause } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';
import Sidebar from './Sidebar';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  users: User[]; 
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
  'bg-[#3E1E16]', 
  'bg-[#1a237e]', 
  'bg-[#004d40]', 
  'bg-[#b71c1c]', 
  'bg-[#4a148c]', 
  'bg-[#263238]',
];

const AdminDashboard: React.FC<Props> = ({ 
    onNavigate, 
    news, 
    users, 
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

  // News Carousel Interval
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
    <div className="relative min-h-screen h-full bg-[#1A100C] font-display text-[#E8DCCF] flex flex-col pb-10 overflow-y-auto no-scrollbar">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={onNavigate}
        currentUser={currentUser}
        onLogout={onLogout}
        onSync={onSync}
        isSyncing={isSyncing}
      />
      
      {/* Top Nav (Visible on all screens) */}
      <nav className="bg-[#3E1E16] text-[#F5EFE6] px-4 py-2 flex items-center justify-between text-[10px] font-medium border-b border-[#9E7649]/20 tracking-wider uppercase sticky top-0 z-30">
        <button onClick={() => setIsSidebarOpen(true)} className="hover:text-[#9E7649] transition-colors">
            <Menu size={20} />
        </button>
        <div className="flex gap-6">
        </div>
      </nav>

      {/* Header */}
      <header className="sticky top-[33px] z-20 bg-[#1A100C]/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-[#9E7649]/10 shadow-sm">
         <div className="flex flex-col">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white p-0.5 overflow-hidden">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h1 className="text-white font-black text-lg leading-none tracking-tight">CMNL App</h1>
                    <p className="text-[10px] text-[#9E7649]/80 italic mt-0.5 font-serif">Voz de la segunda villa cubana</p>
                </div>
            </div>
         </div>
         <div className="flex items-center gap-3">
             <div className="text-right">
                <p className="text-xs font-bold text-white">{currentUser?.name || 'Admin'}</p>
                <p className="text-[10px] text-[#9E7649] flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    {currentUser?.classification || 'Administrador'}
                </p>
             </div>
         </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-5 flex flex-col gap-6">
         
         {/* Welcome (Simplified) */}
         <div className="flex justify-between items-center">
            <h2 className="text-sm text-stone-400 font-medium">Panel de Control</h2>
         </div>

         {/* Live Program Widget with Integrated Player */}
         <div>
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
         <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3 px-1">
                 <h2 className="text-lg font-bold text-white">Noticias Recientes</h2>
            </div>

            {activeNews ? (
                <div 
                    onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} 
                    className={`relative cursor-pointer rounded-xl ${currentColor} overflow-hidden shadow-sm border border-[#9E7649]/10 hover:border-[#9E7649]/30 transition-all min-h-[200px] flex-1 group`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>

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
                      <h3 className="text-xl font-bold text-white leading-tight mb-2 line-clamp-2">{activeNews.title}</h3>
                      <p className="text-sm text-[#E8DCCF]/90 line-clamp-2 leading-relaxed">{activeNews.content}</p>
                  </div>
                </div>
            ) : (
                <div className="p-6 bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 text-center text-xs text-[#E8DCCF]/50">
                    No hay noticias cargadas. Ir a Ajustes para gestionar.
                </div>
            )}
         </div>
         
      </main>

      {/* FAB - Worker Group */}
      <a 
         href="https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v" 
         target="_blank" 
         rel="noopener noreferrer"
         className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all"
         title="Grupo de Trabajo WhatsApp"
      >
         <MessageSquare size={28} fill="white" />
      </a>
      
      <style>{`
        @keyframes soundbar {
            0%, 100% { height: 10%; }
            50% { height: 100%; }
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
