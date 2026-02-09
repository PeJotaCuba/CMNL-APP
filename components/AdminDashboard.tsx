import React, { useEffect, useState } from 'react';
import { AppView, NewsItem, User } from '../types';
import { Settings, ChevronRight, CalendarDays, Music, FileText, Podcast, LogOut, MessageSquare } from 'lucide-react';
import { getCurrentProgram, LOGO_URL } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  users: User[]; 
  currentUser: User | null;
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ onNavigate, news, users, currentUser, onLogout }) => {
  const [currentProgram, setCurrentProgram] = useState(getCurrentProgram());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProgram(getCurrentProgram());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleExternalApp = (url: string) => {
    window.location.href = url;
  };

  const latestNews = news.length > 0 ? news[0] : null;

  return (
    <div className="relative min-h-screen h-full bg-[#1A100C] font-display text-[#E8DCCF] flex flex-col pb-40 overflow-y-auto no-scrollbar">
      
      {/* Top Nav */}
      <nav className="bg-[#3E1E16] text-[#F5EFE6] px-4 py-2 flex items-center justify-center text-[10px] font-medium border-b border-[#9E7649]/20 tracking-wider uppercase sticky top-0 z-30">
        <div className="flex gap-6">
          <button onClick={() => onNavigate(AppView.SECTION_HISTORY)} className="hover:text-[#9E7649] cursor-pointer transition-colors">Historia</button>
          <button onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)} className="hover:text-[#9E7649] cursor-pointer transition-colors">Programación</button>
          <button onClick={() => onNavigate(AppView.SECTION_ABOUT)} className="hover:text-[#9E7649] cursor-pointer transition-colors">Quiénes Somos</button>
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
             <button onClick={() => onNavigate(AppView.APP_USER_MANAGEMENT)} className="w-9 h-9 rounded-full bg-[#2C1B15] flex items-center justify-center hover:bg-[#9E7649]/20 text-[#E8DCCF] transition-colors border border-[#9E7649]/30">
                <Settings size={18} />
             </button>
             <button onClick={onLogout} className="w-9 h-9 rounded-full bg-[#2C1B15] flex items-center justify-center hover:bg-red-900/40 text-[#E8DCCF] hover:text-red-400 transition-colors border border-[#9E7649]/30">
                <LogOut size={18} />
             </button>
         </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-5 flex flex-col gap-6">
         
         {/* Welcome (Simplified) */}
         <div className="flex justify-between items-center">
            <h2 className="text-sm text-stone-400 font-medium">Panel de Control</h2>
         </div>

         {/* CMNL Apps Grid */}
         <div>
            <h2 className="text-xs font-bold text-[#9E7649] uppercase tracking-widest mb-3">Aplicaciones CMNL</h2>
            <div className="grid grid-cols-4 gap-2">
              <AppButton 
                icon={<CalendarDays size={20} />} 
                label="Agenda" 
                onClick={() => handleExternalApp('https://rcmagenda.vercel.app/#/home')} 
              />
              <AppButton 
                icon={<Music size={20} />} 
                label="Música" 
                onClick={() => handleExternalApp('https://rcm-musica.vercel.app/')} 
              />
              <AppButton 
                icon={<FileText size={20} />} 
                label="Guiones" 
                onClick={() => handleExternalApp('https://guion-bd.vercel.app/')} 
              />
              <AppButton 
                icon={<Podcast size={20} />} 
                label="Progr." 
                onClick={() => handleExternalApp('https://rcm-programaci-n.vercel.app/')} 
              />
            </div>
         </div>

         {/* Live Program Widget with VECTOR */}
         <div>
            <div className="flex items-center justify-between mb-3 px-1">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                 </span>
                 En el Aire
               </h2>
               <button 
                  onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)}
                  className="text-[#9E7649] text-xs font-medium flex items-center gap-0.5 hover:text-[#B68D5D] transition-colors"
                >
                  Ver guía <ChevronRight size={14} />
               </button>
            </div>

            <div className="flex flex-col gap-3">
               <div className="relative bg-[#2C1B15] rounded-xl overflow-hidden border border-[#9E7649]/10 group shadow-lg">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                  <div className="p-4 pl-5 flex items-center gap-4">
                     
                     {/* Vector Visualization */}
                     <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center border border-white/5">
                        <div className="flex gap-1 h-8 items-end">
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_0.8s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_1.2s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_0.5s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_1.0s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_0.7s_ease-in-out_infinite]"></div>
                        </div>
                     </div>

                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-red-600/20 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-600/20 uppercase tracking-wider">En Vivo</span>
                        </div>
                        <h4 className="text-white font-bold text-lg leading-tight truncate">{currentProgram.name}</h4>
                        <p className="text-[#9E7649] text-xs font-medium mt-1">{currentProgram.time}</p>
                     </div>
                  </div>
                  {/* Background blur effect */}
                  <div className="absolute inset-0 z-[-1] opacity-20 bg-cover bg-center blur-xl" style={{ backgroundImage: `url(${currentProgram.image})` }}></div>
               </div>
            </div>
         </div>

         {/* News Preview */}
         <div>
            <div className="flex justify-between items-center mb-3 px-1">
                 <h2 className="text-lg font-bold text-white">Noticias Recientes</h2>
            </div>

            {latestNews ? (
                <div onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, latestNews)} className="cursor-pointer rounded-xl bg-[#2C1B15] overflow-hidden shadow-sm border border-[#9E7649]/10 hover:border-[#9E7649]/30 transition-all">
                <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${latestNews.image})` }}></div>
                <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold text-[#9E7649] uppercase tracking-wider bg-[#9E7649]/10 px-1.5 py-0.5 rounded border border-[#9E7649]/20">{latestNews.category}</span>
                        <span className="text-[10px] text-[#E8DCCF]/50">{latestNews.date}</span>
                    </div>
                    <h3 className="text-white font-bold text-base leading-tight mb-1">{latestNews.title}</h3>
                    <p className="text-[#E8DCCF]/70 text-xs line-clamp-2 leading-relaxed">{latestNews.content}</p>
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

const AppButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center bg-[#2C1B15] rounded-xl p-3 border border-white/5 hover:bg-[#3E1E16] transition-all">
        <div className="text-[#9E7649] mb-1">{icon}</div>
        <span className="text-[10px] text-[#F5EFE6] font-medium">{label}</span>
    </button>
);

export default AdminDashboard;