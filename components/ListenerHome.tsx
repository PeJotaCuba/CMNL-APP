import React from 'react';
import { AppView } from '../types';
import { ScrollText, Mic, Users, Play, Home, Newspaper, Podcast, User, ChevronRight } from 'lucide-react';

interface Props {
  onNavigate: (view: AppView) => void;
}

const ListenerHome: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#1E1815] font-display text-stone-100 pb-24">
      {/* Header Pattern Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

      {/* Header */}
      <header className="flex flex-col items-center justify-center pt-8 pb-6 px-6 relative z-10">
        <div className="w-20 h-20 mb-4 rounded-full bg-[#2C2420] border border-[#C69C6D]/20 flex items-center justify-center shadow-2xl">
           <span className="text-[#C69C6D]"><Mic size={32} /></span>
        </div>
        <h1 className="text-xl font-serif font-bold text-center text-[#C69C6D] tracking-wide">
          Radio Ciudad Monumento
        </h1>
        <p className="text-[10px] font-medium text-center text-stone-500 uppercase tracking-[0.2em] mt-2">
          Voz de la segunda villa cubana
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 flex flex-col gap-4 relative z-10">
        
        {/* Card: Historia */}
        <button className="group relative w-full h-32 overflow-hidden rounded-2xl shadow-lg hover:shadow-[#C69C6D]/10 transition-all">
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
        <button className="group relative w-full h-32 overflow-hidden rounded-2xl shadow-lg hover:shadow-[#C69C6D]/10 transition-all">
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
        <button className="group relative w-full h-32 overflow-hidden rounded-2xl shadow-lg hover:shadow-[#C69C6D]/10 transition-all">
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

        {/* Live Now Widget */}
        <div className="mt-2 rounded-xl bg-[#2C2420] border border-white/5 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#C69C6D]">En Vivo Ahora</h3>
             <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
             </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg bg-stone-800 overflow-hidden shrink-0 relative">
               <img src="https://picsum.photos/id/453/200/200" alt="Show cover" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
               <h4 className="text-base font-bold text-white truncate">Acontecer</h4>
               <p className="text-xs text-stone-400 truncate mt-0.5">10:00 AM - 12:00 PM</p>
            </div>
            <button className="h-10 w-10 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center hover:bg-[#A06C45] transition-colors shadow-lg shadow-black/20">
               <Play size={20} fill="currentColor" />
            </button>
          </div>
        </div>

      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-[#1E1815]/95 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 z-50">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => onNavigate(AppView.LANDING)} className="flex flex-col items-center gap-1.5 text-[#C69C6D]">
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Inicio</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-stone-500 hover:text-[#C69C6D] transition-colors">
            <Newspaper size={22} />
            <span className="text-[9px] font-medium uppercase tracking-wide">Noticias</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-stone-500 hover:text-[#C69C6D] transition-colors">
            <Podcast size={22} />
            <span className="text-[9px] font-medium uppercase tracking-wide">Podcast</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-stone-500 hover:text-[#C69C6D] transition-colors">
            <User size={22} />
            <span className="text-[9px] font-medium uppercase tracking-wide">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ListenerHome;
