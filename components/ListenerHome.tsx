import React, { useState, useEffect } from 'react';
import { AppView, NewsItem } from '../types';
import { ScrollText, Mic, Users, Home, Newspaper, Podcast, User as UserIcon, ChevronRight, ChevronLeft, LogIn, MessageCircle, X } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
}

const ListenerHome: React.FC<Props> = ({ onNavigate, news }) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [showFabMenu, setShowFabMenu] = useState(false);

  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % Math.min(news.length, 5));
      }, 5000); 
      return () => clearInterval(interval);
    } else {
        setCurrentNewsIndex(0);
    }
  }, [news]);

  const displayedNews = news.slice(0, 5);
  const activeNews = displayedNews[currentNewsIndex];

  const nextNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(displayedNews.length > 0) setCurrentNewsIndex((prev) => (prev + 1) % displayedNews.length);
  };

  const prevNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(displayedNews.length > 0) setCurrentNewsIndex((prev) => (prev - 1 + displayedNews.length) % displayedNews.length);
  };

  return (
    <div className="relative flex min-h-screen h-full w-full flex-col bg-[#1E1815] font-display text-stone-100 pb-24 overflow-y-auto no-scrollbar">
      {/* Header Pattern Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

      {/* Auth Button Top Right */}
      <button 
        onClick={() => onNavigate(AppView.LANDING)}
        className="absolute top-4 right-4 z-20 p-2 text-stone-500 hover:text-[#C69C6D] transition-colors bg-black/20 rounded-full backdrop-blur-sm"
      >
        <LogIn size={20} />
      </button>

      {/* Header */}
      <header className="flex flex-col items-center justify-center pt-8 pb-6 px-6 relative z-10">
        <div className="w-20 h-20 mb-4 rounded-2xl bg-white shadow-2xl overflow-hidden p-0">
           <img src={LOGO_URL} alt="CMNL App" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-center text-[#C69C6D] tracking-wide">
          CMNL App
        </h1>
        <p className="text-[10px] font-medium text-center text-stone-500 uppercase tracking-[0.2em] mt-2">
          Voz de la segunda villa cubana
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 flex flex-col gap-4 relative z-10">
        
        {/* Card: Historia */}
        <button onClick={() => onNavigate(AppView.SECTION_HISTORY)} className="group relative w-full h-32 overflow-hidden rounded-2xl shadow-lg hover:shadow-[#C69C6D]/10 transition-all">
          <div className="absolute inset-0 bg-[#3E1E16]/90 z-10"></div>
          <div className="absolute inset-0 bg-[url('https://picsum.photos/id/204/800/400')] bg-cover bg-center opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"></div>
          <div className="relative z-20 h-full flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                <ScrollText className="text-white" size={24} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-serif font-bold text-white">Historia</span>
                <span className="text-xs text-white/70 font-medium tracking-wide">Nuestro legado</span>
              </div>
            </div>
            <ChevronRight className="text-white/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card: Programación */}
        <button onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)} className="group relative w-full h-32 overflow-hidden rounded-2xl shadow-lg hover:shadow-[#C69C6D]/10 transition-all">
          <div className="absolute inset-0 bg-[#C69C6D] z-10 opacity-95"></div>
          <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1/800/400')] bg-cover bg-center opacity-20 mix-blend-multiply group-hover:scale-105 transition-transform duration-700"></div>
          <div className="relative z-20 h-full flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Mic className="text-white" size={24} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-serif font-bold text-white">Programación</span>
                <span className="text-xs text-white/80 font-medium tracking-wide">Parrilla y Horarios</span>
              </div>
            </div>
             <ChevronRight className="text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card: Quienes Somos */}
        <button onClick={() => onNavigate(AppView.SECTION_ABOUT)} className="group relative w-full h-32 overflow-hidden rounded-2xl shadow-lg hover:shadow-[#C69C6D]/10 transition-all">
          <div className="absolute inset-0 bg-[#2C2420] z-10 opacity-90"></div>
          <div className="absolute inset-0 bg-[url('https://picsum.photos/id/338/800/400')] bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-700"></div>
          <div className="relative z-20 h-full flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Users className="text-white" size={24} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-serif font-bold text-white">Quiénes Somos</span>
                <span className="text-xs text-white/60 font-medium tracking-wide">El equipo</span>
              </div>
            </div>
             <ChevronRight className="text-white/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* News Carousel */}
        {activeNews ? (
            <div onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} className="mt-2 relative rounded-xl bg-[#2C2420] border border-white/5 overflow-hidden shadow-lg h-40 cursor-pointer group">
                <div className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-1000 group-hover:scale-105" style={{backgroundImage: `url(${activeNews.image})`}}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                
                {displayedNews.length > 1 && (
                    <>
                        <button onClick={prevNews} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 p-1 rounded-full text-white/70 hover:text-white z-20 transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={nextNews} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 p-1 rounded-full text-white/70 hover:text-white z-20 transition-colors">
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#C69C6D] bg-black/50 px-2 py-0.5 rounded">{activeNews.category}</span>
                        <div className="flex gap-1">
                            {displayedNews.map((_, idx) => (
                                <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentNewsIndex ? 'bg-[#C69C6D]' : 'bg-white/30'}`}></div>
                            ))}
                        </div>
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{activeNews.title}</h3>
                    <p className="text-[10px] text-stone-300 mt-0.5 line-clamp-1">{activeNews.content}</p>
                </div>
            </div>
        ) : (
            <div className="mt-2 rounded-xl bg-[#2C2420] border border-white/5 h-40 flex items-center justify-center">
                <p className="text-xs text-stone-500">No hay noticias recientes</p>
            </div>
        )}

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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-[#1E1815]/95 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 z-50">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => onNavigate(AppView.LISTENER_HOME)} className="flex flex-col items-center gap-1.5 text-[#C69C6D]">
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Inicio</span>
          </button>
          <button onClick={() => onNavigate(AppView.SECTION_NEWS)} className="flex flex-col items-center gap-1.5 text-stone-500 hover:text-[#C69C6D] transition-colors">
            <Newspaper size={22} />
            <span className="text-[9px] font-medium uppercase tracking-wide">Noticias</span>
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

export default ListenerHome;