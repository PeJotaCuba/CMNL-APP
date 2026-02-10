import React, { useState, useEffect } from 'react';
import { AppView, NewsItem, User } from '../types';
import { CalendarDays, Music, FileText, Podcast, LogOut, User as UserIcon, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  currentUser: User | null;
  onLogout: () => void;
}

const newsColors = [
  'bg-[#3E1E16]', // Brand Dark Brown
  'bg-[#1a237e]', // Deep Blue
  'bg-[#004d40]', // Deep Teal
  'bg-[#b71c1c]', // Deep Red
  'bg-[#4a148c]', // Deep Purple
  'bg-[#263238]', // Dark Blue Grey
];

const WorkerHome: React.FC<Props> = ({ onNavigate, news, currentUser, onLogout }) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

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
  
  const handleExternalApp = (url: string) => {
    // Navigate directly to trigger potential PWA/App interception by the OS
    window.location.href = url;
  };

  return (
    <div className="relative flex min-h-screen h-full w-full flex-col overflow-x-hidden bg-[#2a1b12] font-display text-white overflow-y-auto no-scrollbar pb-32">
      {/* Background Image overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center mix-blend-overlay fixed" 
        style={{ backgroundImage: `url('https://picsum.photos/id/149/1080/1920')` }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#2a1b12]/90 via-[#2a1b12]/80 to-[#2a1b12] pointer-events-none fixed"></div>

      {/* Top Nav */}
      <nav className="relative z-20 w-full px-6 py-6 flex justify-center items-center border-b border-white/5 bg-[#2a1b12]/50 backdrop-blur-sm sticky top-0">
        <div className="flex space-x-8 text-sm font-medium text-[#FFF8DC]/80">
           <button onClick={() => onNavigate(AppView.SECTION_HISTORY)} className="hover:text-white cursor-pointer transition-colors">Historia</button>
           <button onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)} className="hover:text-white cursor-pointer transition-colors">Programación</button>
           <button onClick={() => onNavigate(AppView.SECTION_ABOUT)} className="hover:text-white cursor-pointer transition-colors">Quiénes Somos</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 py-8 items-center max-w-2xl mx-auto w-full">
        
        {/* Branding */}
        <div className="flex flex-col items-center justify-center mt-6 mb-12 space-y-4">
           <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="bg-white p-0 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden">
                 <img src={LOGO_URL} alt="CMNL App" className="w-full h-full object-cover" />
              </div>
           </div>
           <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-[#FFF8DC] mb-1">CMNL App</h1>
              <h2 className="text-[#CD853F] text-lg font-medium tracking-[0.2em] uppercase opacity-90">Gestión Interna</h2>
              <p className="text-stone-400 text-xs mt-3 font-serif italic tracking-wide opacity-70">"Voz de la segunda villa cubana"</p>
           </div>
        </div>

        {/* Grid Menu */}
        <div className="w-full grid grid-cols-2 gap-4 mb-10">
           <MenuButton 
            icon={<CalendarDays size={28} />} 
            label="Agenda" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://rcmagenda.vercel.app/#/home')}
           />
           <MenuButton 
            icon={<Music size={28} />} 
            label="Música" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://rcm-musica.vercel.app/')}
           />
           <MenuButton 
            icon={<FileText size={28} />} 
            label="Guiones" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://guion-bd.vercel.app/')}
           />
           <MenuButton 
            icon={<Podcast size={28} />} 
            label="Programación" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://rcm-programaci-n.vercel.app/')}
           />
        </div>

        {/* News Carousel (Worker View) - Matches Listener View */}
        {activeNews && (
            <div 
                onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} 
                className={`w-full mb-8 relative rounded-xl ${currentColor} border border-white/5 overflow-hidden shadow-lg h-52 cursor-pointer group transition-colors duration-500`}
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
                    <h4 className="text-xl font-bold leading-tight text-white mb-2 line-clamp-2">{activeNews.title}</h4>
                    <p className="text-sm text-stone-300 line-clamp-2 opacity-90">{activeNews.content}</p>
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
           
           <div className="text-center mt-8 pb-4">
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

const MenuButton = ({ icon, label, subLabel, onClick }: { icon: React.ReactNode, label: string, subLabel: string, onClick: () => void }) => (
  <button onClick={onClick} className="group flex flex-col items-center justify-center aspect-square bg-[#3e2723]/40 hover:bg-[#3e2723] border border-white/5 hover:border-[#CD853F]/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[#CD853F]/10">
     <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B4513] to-[#A0522D] flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-300 text-white">
        {icon}
     </div>
     <span className="text-[#FFF8DC] font-medium text-sm text-center leading-tight">
        <span className="block text-xs opacity-60 mb-0.5">{subLabel}</span>
        {label}
     </span>
  </button>
);

export default WorkerHome;