import React, { useState, useEffect } from 'react';
import { AppView, NewsItem } from '../types';
import { ScrollText, Mic, Users, Home, Newspaper, Podcast, User as UserIcon, ChevronRight, ChevronLeft, LogIn, MessageCircle, X, RefreshCw, Menu, LogOut } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';
import Sidebar from './Sidebar';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  onSync?: () => void;
  isSyncing?: boolean;
}

const newsColors = [
  'bg-[#3E1E16]', // Brand Dark Brown
  'bg-[#1a237e]', // Deep Blue
  'bg-[#004d40]', // Deep Teal
  'bg-[#b71c1c]', // Deep Red
  'bg-[#4a148c]', // Deep Purple
  'bg-[#263238]', // Dark Blue Grey
];

const ListenerHome: React.FC<Props> = ({ onNavigate, news, onSync, isSyncing }) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="relative flex min-h-screen h-full w-full flex-col md:flex-row bg-[#1E1815] font-display text-stone-100 overflow-y-auto no-scrollbar">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={onNavigate}
        currentUser={null} // Listener is technically logged in but has limited role
        onSync={onSync}
        isSyncing={isSyncing || false}
        onLogin={() => onNavigate(AppView.LANDING)}
      />

      {/* Header Pattern Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none fixed"></div>

      {/* Mobile Top Nav */}
      <nav className="md:hidden relative z-20 w-full px-6 py-6 flex justify-between items-center bg-[#1E1815]/50 backdrop-blur-sm sticky top-0">
        <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-[#C69C6D] hover:text-white transition-colors"
        >
            <Menu size={24} />
        </button>
        
        {isSyncing && (
             <div className="flex items-center gap-2 text-[#C69C6D] text-xs font-bold">
                 <RefreshCw size={14} className="animate-spin" />
                 <span className="hidden sm:inline">Sincronizando...</span>
             </div>
        )}
      </nav>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#2C1B15]/80 backdrop-blur-md border-r border-white/5 p-6 z-20 relative h-screen sticky top-0">
         <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 overflow-hidden shrink-0">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
                <h1 className="text-white font-black text-lg leading-none tracking-tight">CMNL App</h1>
                <p className="text-[10px] text-[#9E7649]/80 italic mt-0.5 font-serif">Oyentes</p>
            </div>
         </div>

         <div className="flex flex-col gap-2 flex-1">
             <SidebarLink icon={<ScrollText size={18} />} label="Historia" onClick={() => onNavigate(AppView.SECTION_HISTORY)} />
             <SidebarLink icon={<Mic size={18} />} label="Programación" onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)} />
             <SidebarLink icon={<Users size={18} />} label="Quiénes Somos" onClick={() => onNavigate(AppView.SECTION_ABOUT)} />
             <SidebarLink icon={<Podcast size={18} />} label="Podcast" onClick={() => onNavigate(AppView.SECTION_PODCAST)} />
         </div>

         <div className="mt-auto pt-6 border-t border-white/5">
            {onSync && (
                <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-3 text-stone-400 hover:text-[#CD853F] transition-colors w-full p-2 rounded-lg hover:bg-white/5 mb-2">
                    <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                    <span className="text-sm font-medium">Actualizar</span>
                </button>
            )}
            <button onClick={() => onNavigate(AppView.LANDING)} className="flex items-center gap-3 text-stone-400 hover:text-[#CD853F] transition-colors w-full p-2 rounded-lg hover:bg-white/5">
                <LogIn size={18} />
                <span className="text-sm font-medium">Iniciar Sesión</span>
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-5 py-8 md:px-10 md:py-10 flex flex-col gap-4 relative z-10 max-w-7xl mx-auto w-full">
        
        {/* Mobile Branding */}
        <div className="md:hidden flex flex-col items-center justify-center mb-6">
            <div className="w-20 h-20 mb-4 rounded-2xl bg-white shadow-2xl overflow-hidden p-0">
               <img src={LOGO_URL} alt="CMNL App" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-center text-[#C69C6D] tracking-wide">
              CMNL App
            </h1>
            <p className="text-[10px] font-medium text-center text-stone-500 uppercase tracking-[0.2em] mt-2">
              Voz de la segunda villa cubana
            </p>
        </div>

        <div className="flex flex-col h-full">
             <div className="flex justify-between items-center mb-4 px-1">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-1 h-6 bg-[#C69C6D] rounded-full"></span>
                      Noticias Destacadas
                  </h2>
             </div>

             {/* News Carousel - Full Width on Desktop */}
             {activeNews ? (
                <div 
                    onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} 
                    className={`relative rounded-xl ${currentColor} border border-white/5 overflow-hidden shadow-lg flex-1 min-h-[400px] cursor-pointer group transition-colors duration-500`}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
                    
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

                    <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end items-start text-left">
                        <div className="flex items-center gap-1 mb-4">
                            {news.slice(0, 6).map((_, idx) => (
                                <div key={idx} className={`w-2 h-2 rounded-full ${idx === (currentNewsIndex % 6) ? 'bg-white' : 'bg-white/30'}`}></div>
                            ))}
                        </div>
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-md text-xs font-bold uppercase tracking-wider mb-3 text-white border border-white/10">
                            {activeNews.category || 'Actualidad'}
                        </span>
                        <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-4 line-clamp-3">{activeNews.title}</h3>
                        <p className="text-sm md:text-base text-stone-200 line-clamp-4 md:line-clamp-6 opacity-90 leading-relaxed max-w-3xl">{activeNews.content}</p>
                        <div className="mt-6 text-xs md:text-sm text-stone-400 font-medium flex items-center gap-2">
                             <span>{activeNews.date}</span>
                             <span className="w-1 h-1 bg-stone-500 rounded-full"></span>
                             <span>{activeNews.author}</span>
                        </div>
                    </div>
                </div>
             ) : (
                <div className="rounded-xl bg-[#2C2420] border border-white/5 h-64 flex items-center justify-center">
                    <p className="text-sm text-stone-500">No hay noticias recientes</p>
                </div>
             )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pb-4 border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-stone-500 text-xs">
            <div className="text-center md:text-left">
                <p className="font-bold text-[#C69C6D] uppercase tracking-widest mb-1">Radio Ciudad Monumento</p>
                <p>La voz de la segunda villa cubana</p>
            </div>
            <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
                <a href="#" className="hover:text-white transition-colors">Términos de Uso</a>
            </div>
            <p className="opacity-50">© 2024 CMNL App</p>
        </div>

      </main>
      
      {/* Floating WhatsApp Menu for Listeners */}
      <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-3">
         {showFabMenu && (
             <div className="flex flex-col gap-3 animate-fade-in-up">
                 <a 
                    href="https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white text-[#3E1E16] px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 hover:bg-[#E8DCCF] transition-colors"
                 >
                    Unirse a Comunidad CMNL
                 </a>
                 <a 
                    href="https://wa.me/5354413935"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white text-[#3E1E16] px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 hover:bg-[#E8DCCF] transition-colors"
                 >
                    Escribir a administradores
                 </a>
             </div>
         )}
         <button 
            onClick={() => setShowFabMenu(!showFabMenu)}
            className="w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all"
         >
            {showFabMenu ? <X size={28} /> : <MessageCircle size={30} fill="white" />}
         </button>
      </div>
      
      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#1E1815]/95 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 z-50">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => onNavigate(AppView.LISTENER_HOME)} className="flex flex-col items-center gap-1.5 text-[#C69C6D]">
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Inicio</span>
          </button>
          <button onClick={() => onNavigate(AppView.SECTION_PODCAST)} className="flex flex-col items-center gap-1.5 text-stone-500 hover:text-[#C69C6D] transition-colors">
            <Podcast size={22} />
            <span className="text-[9px] font-medium uppercase tracking-wide">Podcast</span>
          </button>
          <button onClick={() => onNavigate(AppView.SECTION_PROFILE)} className="flex flex-col items-center gap-1.5 text-stone-500 hover:text-[#C69C6D] transition-colors">
            <UserIcon size={22} />
            <span className="text-[9px] font-medium uppercase tracking-wide">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

const SidebarLink = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button onClick={onClick} className="flex items-center gap-3 text-stone-300 hover:text-[#CD853F] hover:bg-white/5 p-3 rounded-xl transition-all w-full text-left group">
        <span className="group-hover:scale-110 transition-transform">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export default ListenerHome;
