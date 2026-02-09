import React from 'react';
import { AppView } from '../types';
import { Settings, Users, UserPlus, Play, Bell, SkipBack, Pause, SkipForward, Plus, ChevronRight, Activity, CalendarDays, Music, FileText, Podcast } from 'lucide-react';

interface Props {
  onNavigate: (view: AppView) => void;
}

const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="relative min-h-screen h-full bg-[#1A100C] font-display text-[#E8DCCF] flex flex-col pb-32 overflow-y-auto no-scrollbar">
      
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
             <div className="relative">
                <div className="w-9 h-9 rounded-full border border-[#9E7649] overflow-hidden">
                    <img src="https://i.pravatar.cc/150?img=11" alt="Admin" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#1A100C] rounded-full"></div>
             </div>
             <button onClick={() => onNavigate(AppView.LANDING)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#9E7649]/20 text-[#E8DCCF] transition-colors">
                <Settings size={20} />
             </button>
         </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 w-full max-w-md mx-auto p-5 flex flex-col gap-6">
         
         {/* Welcome */}
         <div>
            <h2 className="text-sm text-stone-400 font-medium">Bienvenido al panel,</h2>
            <p className="text-xl font-bold text-white">admincmnl</p>
         </div>

         {/* CMNL Apps Grid (Added per requirement) */}
         <div>
            <h2 className="text-xs font-bold text-[#9E7649] uppercase tracking-widest mb-3">Aplicaciones CMNL</h2>
            <div className="grid grid-cols-4 gap-2">
              <AppButton 
                icon={<CalendarDays size={20} />} 
                label="Agenda" 
                onClick={() => onNavigate(AppView.APP_AGENDA)} 
              />
              <AppButton 
                icon={<Music size={20} />} 
                label="Música" 
                onClick={() => onNavigate(AppView.APP_MUSICA)} 
              />
              <AppButton 
                icon={<FileText size={20} />} 
                label="Guiones" 
                onClick={() => onNavigate(AppView.APP_GUIONES)} 
              />
              <AppButton 
                icon={<Podcast size={20} />} 
                label="Progr." 
                onClick={() => onNavigate(AppView.APP_PROGRAMACION)} 
              />
            </div>
         </div>

         {/* Stats Card */}
         <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3E1E16] to-[#2A150F] shadow-xl border border-[#9E7649]/20 p-5">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#9E7649]/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-start justify-between mb-4 relative z-10">
               <div>
                  <h3 className="text-white text-lg font-bold">Gestionar Usuarios</h3>
                  <p className="text-[#E8DCCF]/60 text-xs mt-0.5">Control de acceso y registros</p>
               </div>
               <span className="bg-[#9E7649]/20 text-[#9E7649] text-[10px] font-bold px-2 py-1 rounded border border-[#9E7649]/20">ADMIN</span>
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
               <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                      <div key={i} className="w-9 h-9 rounded-full ring-2 ring-[#3E1E16] overflow-hidden bg-stone-800">
                          <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                      </div>
                  ))}
                  <div className="w-9 h-9 rounded-full ring-2 ring-[#3E1E16] bg-[#6B442A] flex items-center justify-center text-xs font-bold text-white z-10">
                      +121
                  </div>
               </div>
               <div className="flex flex-col">
                  <span className="text-xl font-bold text-white leading-none">124</span>
                  <span className="text-[10px] text-[#E8DCCF]/60 uppercase tracking-wide">Activos</span>
               </div>
            </div>

            <div className="flex gap-3 relative z-10">
               <button className="flex-1 h-10 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-lg transition-colors">
                  <Users size={16} />
                  <span>Ver Todos</span>
               </button>
               <button className="w-10 h-10 bg-[#6B442A] hover:bg-[#5D3A24] text-[#E8DCCF] rounded-lg flex items-center justify-center border border-white/5 transition-colors">
                  <UserPlus size={18} />
               </button>
            </div>
         </div>

         {/* Today's Schedule */}
         <div>
            <div className="flex items-center justify-between mb-3 px-1">
               <h2 className="text-lg font-bold text-white">Programación de Hoy</h2>
               <button 
                  onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)}
                  className="text-[#9E7649] text-xs font-medium flex items-center gap-0.5 hover:text-[#B68D5D] transition-colors"
                >
                  Ver guía <ChevronRight size={14} />
               </button>
            </div>

            <div className="flex flex-col gap-3">
               {/* Live Item */}
               <div className="relative bg-[#2C1B15] rounded-xl overflow-hidden border border-[#9E7649]/10 group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#9E7649]"></div>
                  <div className="p-3 pl-4 flex items-center gap-4">
                     <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-black shadow-inner">
                        <img src="https://picsum.photos/id/453/200/200" alt="Show" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-red-600 rounded-full border-2 border-[#2C1B15] flex items-center justify-center shadow-sm">
                           <Activity size={12} className="text-white" />
                        </div>
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold truncate text-sm">La Historia de Bayamo</h4>
                        <p className="text-[#9E7649] text-xs font-medium mt-0.5">En Vivo • 10:00 AM - 12:00 PM</p>
                     </div>
                     <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#9E7649] transition-colors">
                        <Play size={16} fill="currentColor" />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* News */}
         <div onClick={() => onNavigate(AppView.SECTION_NEWS)} className="cursor-pointer">
            <h2 className="text-lg font-bold text-white mb-3 px-1">Noticias Recientes</h2>
            <div className="rounded-xl bg-[#2C1B15] overflow-hidden shadow-sm border border-[#9E7649]/10">
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
             <div className="w-10 h-10 rounded bg-stone-800 bg-cover bg-center shadow-md border border-[#9E7649]/30 shrink-0" style={{ backgroundImage: "url('https://picsum.photos/id/453/100/100')" }}></div>
             <div className="flex-1 min-w-0">
                <p className="text-[#F5EFE6] text-sm font-bold truncate">La Historia de Bayamo</p>
                <p className="text-[#9E7649] text-[10px] truncate">En el aire • 102.3 FM</p>
             </div>
             <div className="flex items-center gap-3">
                <button className="text-[#E8DCCF]/60 hover:text-[#9E7649] transition-colors"><SkipBack size={20} fill="currentColor" className="opacity-50" /></button>
                <button className="w-9 h-9 rounded-full bg-[#9E7649] text-[#3E1E16] flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                   <Pause size={18} fill="currentColor" />
                </button>
                <button className="text-[#E8DCCF]/60 hover:text-[#9E7649] transition-colors"><SkipForward size={20} fill="currentColor" className="opacity-50" /></button>
             </div>
         </div>
         {/* Progress Bar */}
         <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#6B442A]">
             <div className="h-full bg-[#9E7649] w-1/3 relative">
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#F5EFE6] rounded-full shadow-sm"></div>
             </div>
         </div>
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
