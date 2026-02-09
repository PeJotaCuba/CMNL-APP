import React, { useEffect, useState, useRef } from 'react';
import { AppView } from '../types';
import { Settings, Play, Pause, Plus, ChevronRight, Activity, CalendarDays, Music, FileText, Podcast, SkipBack, SkipForward } from 'lucide-react';
import { getCurrentProgram } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView) => void;
}

const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [currentProgram, setCurrentProgram] = useState(getCurrentProgram());
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Update program every minute
    const interval = setInterval(() => {
      setCurrentProgram(getCurrentProgram());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const handleExternalApp = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="relative min-h-screen h-full bg-[#1A100C] font-display text-[#E8DCCF] flex flex-col pb-32 overflow-y-auto no-scrollbar">
      
      {/* Hidden Audio Element for Live Stream */}
      <audio 
        ref={audioRef} 
        src="https://teveo.cu/live/audio/cBuF7RrzKPRNNV5q" 
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      ></audio>

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
            <h1 className="text-white font-black text-lg leading-none tracking-tight">RADIO CIUDAD <br/><span className="text-[#9E7649]">MONUMENTO</span></h1>
            <p className="text-[10px] text-[#9E7649]/80 italic mt-1 font-serif">Voz de la segunda villa cubana</p>
         </div>
         <div className="flex items-center gap-3">
             <div className="text-right">
                <p className="text-xs font-bold text-white">Pedro José Reyes</p>
                <p className="text-[10px] text-[#9E7649]">Administrador</p>
             </div>
             <button onClick={() => onNavigate(AppView.APP_USER_MANAGEMENT)} className="w-9 h-9 rounded-full bg-[#2C1B15] flex items-center justify-center hover:bg-[#9E7649]/20 text-[#E8DCCF] transition-colors border border-[#9E7649]/30">
                <Settings size={18} />
             </button>
         </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-5 flex flex-col gap-6">
         
         {/* Welcome (Simplified) */}
         <div>
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

         {/* Live Program Widget */}
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
                     <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-black shadow-inner">
                        <img src={currentProgram.image} alt={currentProgram.name} className="w-full h-full object-cover opacity-90" />
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

         {/* News */}
         <div onClick={() => onNavigate(AppView.SECTION_NEWS)} className="cursor-pointer">
            <h2 className="text-lg font-bold text-white mb-3 px-1">Noticias Recientes</h2>
            <div className="rounded-xl bg-[#2C1B15] overflow-hidden shadow-sm border border-[#9E7649]/10 hover:border-[#9E7649]/30 transition-all">
               <div className="h-32 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/id/234/600/300')" }}></div>
               <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[9px] font-bold text-[#9E7649] uppercase tracking-wider bg-[#9E7649]/10 px-1.5 py-0.5 rounded border border-[#9E7649]/20">Local</span>
                     <span className="text-[10px] text-[#E8DCCF]/50">Hace 2h</span>
                  </div>
                  <h3 className="text-white font-bold text-base leading-tight mb-1">Festival de la Trova comienza mañana</h3>
                  <p className="text-[#E8DCCF]/70 text-xs line-clamp-2 leading-relaxed">Todo está listo en la plaza del himno para recibir a los artistas invitados...</p>
               </div>
            </div>
         </div>
         
      </main>

      {/* FAB */}
      <div className="fixed bottom-24 right-5 z-40">
         <button className="w-14 h-14 rounded-full bg-[#9E7649] text-white shadow-xl shadow-[#6B442A]/40 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all">
            <Plus size={28} />
         </button>
      </div>

      {/* Mini Player */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#3E1E16]/95 backdrop-blur-xl border-t border-[#9E7649]/20 px-4 py-3 pb-safe-bottom">
         <div className="max-w-md mx-auto flex items-center gap-3">
             <div className="w-10 h-10 rounded bg-stone-800 bg-cover bg-center shadow-md border border-[#9E7649]/30 shrink-0" style={{ backgroundImage: `url(${currentProgram.image})` }}></div>
             <div className="flex-1 min-w-0">
                <p className="text-[#F5EFE6] text-sm font-bold truncate">{currentProgram.name}</p>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <p className="text-[#9E7649] text-[10px] truncate">102.3 FM • Señal en vivo</p>
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
