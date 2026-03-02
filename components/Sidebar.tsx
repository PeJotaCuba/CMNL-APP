import React from 'react';
import { AppView } from '../types';
import { Home, History, Info, Newspaper, Radio, User, LogOut, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  currentView: AppView;
  userRole?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, currentView, userRole }) => {
  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#1A100C] border-r border-[#9E7649]/20 z-[70] transform transition-transform duration-300 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-bold text-white">Menú</h2>
             <button onClick={onClose} className="text-[#9E7649] hover:text-white transition-colors">
                <X size={24} />
             </button>
          </div>

          <nav className="flex-1 space-y-2">
            <button 
                onClick={() => { onNavigate(AppView.LISTENER_HOME); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#E8DCCF] hover:bg-[#9E7649]/10 hover:text-[#9E7649] transition-all font-bold"
            >
                <Home size={20} />
                Inicio
            </button>

            <button 
                onClick={() => { onNavigate(AppView.SECTION_HISTORY); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#E8DCCF] hover:bg-[#9E7649]/10 hover:text-[#9E7649] transition-all font-bold"
            >
                <History size={20} />
                Historia
            </button>

            <button 
                onClick={() => { onNavigate(AppView.SECTION_ABOUT); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#E8DCCF] hover:bg-[#9E7649]/10 hover:text-[#9E7649] transition-all font-bold"
            >
                <Info size={20} />
                Quiénes Somos
            </button>

            <button 
                onClick={() => { onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#E8DCCF] hover:bg-[#9E7649]/10 hover:text-[#9E7649] transition-all font-bold"
            >
                <Radio size={20} />
                Programación
            </button>

            <button 
                onClick={() => { onNavigate(AppView.SECTION_NEWS); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#E8DCCF] hover:bg-[#9E7649]/10 hover:text-[#9E7649] transition-all font-bold"
            >
                <Newspaper size={20} />
                Noticias
            </button>
          </nav>

          <div className="border-t border-[#9E7649]/20 pt-6 mt-auto">
             <p className="text-[10px] text-[#9E7649] uppercase tracking-widest text-center opacity-50">
                Radio Ciudad Monumento<br/>v1.0.0
             </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
