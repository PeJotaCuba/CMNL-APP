import React from 'react';
import { AppView, User } from '../types';
import { 
  X, 
  ScrollText, 
  Mic, 
  Users, 
  RefreshCw, 
  Settings, 
  LogOut, 
  LogIn, 
  CalendarDays, 
  Music, 
  FileText, 
  Podcast, 
  Newspaper 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  currentUser: User | null;
  onSync?: () => void;
  isSyncing?: boolean;
  onLogout?: () => void;
  onLogin?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onNavigate, 
  currentUser, 
  onSync, 
  isSyncing, 
  onLogout,
  onLogin
}) => {
  
  const handleNavigation = (view: AppView) => {
    onNavigate(view);
    onClose();
  };

  const handleExternalApp = (url: string) => {
    let finalUrl = url;
    if (currentUser) {
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = `${url}${separator}username=${encodeURIComponent(currentUser.username)}&password=${encodeURIComponent(currentUser.password || '')}`;
    }
    window.location.href = finalUrl;
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#2C1B15] border-r border-[#9E7649]/20 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <h2 className="text-[#C69C6D] font-serif font-bold text-xl">Menú</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 overflow-y-auto h-[calc(100%-80px)]">
          
          {/* Section 1: Main Info */}
          <div className="px-4 flex flex-col gap-2">
            <SidebarItem 
              icon={<ScrollText size={20} />} 
              label="Historia" 
              onClick={() => handleNavigation(AppView.SECTION_HISTORY)} 
            />
            <SidebarItem 
              icon={<Mic size={20} />} 
              label="Programación" 
              onClick={() => handleNavigation(AppView.SECTION_PROGRAMMING_PUBLIC)} 
            />
            <SidebarItem 
              icon={<Users size={20} />} 
              label="Quiénes Somos" 
              onClick={() => handleNavigation(AppView.SECTION_ABOUT)} 
            />
            <SidebarItem 
              icon={<Podcast size={20} />} 
              label="Podcast" 
              onClick={() => handleNavigation(AppView.SECTION_PODCAST)} 
            />
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-white/5 mx-4"></div>

          {/* Section 2: Apps */}
          <div className="px-4 flex flex-col gap-2">
            {currentUser ? (
              // Worker/Admin Apps
              <>
                <SidebarItem 
                  icon={<CalendarDays size={20} />} 
                  label="Agenda" 
                  onClick={() => handleNavigation(AppView.APP_AGENDA)} 
                />
                <SidebarItem 
                  icon={<Music size={20} />} 
                  label="Música" 
                  onClick={() => handleExternalApp('https://rcm-musica.vercel.app/')} 
                />
                <SidebarItem 
                  icon={<FileText size={20} />} 
                  label="Guiones" 
                  onClick={() => handleNavigation(AppView.APP_GUIONES)} 
                />
                <SidebarItem 
                  icon={<Podcast size={20} />} 
                  label="Gestión" 
                  onClick={() => handleNavigation(AppView.APP_PROGRAMACION)} 
                />
              </>
            ) : (
              // Listener Apps
              <>
                 {/* No specific apps for listeners in sidebar currently, as Noticias is removed */}
              </>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-white/5 mx-4"></div>

          {/* Section 3: System */}
          <div className="px-4 flex flex-col gap-2">
            {onSync && (
              <SidebarItem 
                icon={<RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />} 
                label="Actualizar" 
                onClick={() => { onSync(); onClose(); }} 
                disabled={isSyncing}
              />
            )}
            
            {currentUser?.role === 'admin' && (
              <SidebarItem 
                icon={<Settings size={20} />} 
                label="Configuración" 
                onClick={() => handleNavigation(AppView.APP_USER_MANAGEMENT)} 
              />
            )}

            {currentUser ? (
              <SidebarItem 
                icon={<LogOut size={20} />} 
                label="Cerrar Sesión" 
                onClick={() => { if(onLogout) onLogout(); onClose(); }} 
                className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
              />
            ) : (
              <SidebarItem 
                icon={<LogIn size={20} />} 
                label="Iniciar Sesión" 
                onClick={() => { if(onLogin) onLogin(); onClose(); }} 
              />
            )}
          </div>

        </div>
      </div>
    </>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, onClick, className, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm font-medium ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 active:scale-[0.98]'
    } ${className || 'text-stone-300 hover:text-[#C69C6D]'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default Sidebar;
