import React from 'react';

interface CMNLHeaderProps {
  user: { name: string; role: string; photo?: string } | null;
  sectionTitle: string;
  onMenuClick?: () => void;
  children?: React.ReactNode;
}

const CMNLHeader: React.FC<CMNLHeaderProps> = ({ user, sectionTitle, onMenuClick, children }) => {
  return (
    <div className="flex-none flex flex-col w-full z-50 shadow-xl">
      {/* Top Bar */}
      <div className="bg-[#3E1E16] px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick} 
            className="text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
             <span className="material-symbols-outlined text-3xl">menu</span>
          </button>
          <div className="flex items-center gap-3">
             {/* Logo Removed */}
             <div>
                <h1 className="text-white font-bold text-lg leading-none tracking-tight">CMNL App</h1>
                <p className="text-[#9E7649] text-[10px] font-bold uppercase tracking-widest mt-0.5">PANEL INTERNO</p>
             </div>
          </div>
        </div>
        
        {/* User Info */}
        {user && (
            <div className="text-right hidden sm:block">
                <p className="text-white font-bold text-sm">{user.name}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-[#9E7649] text-xs font-medium uppercase tracking-wide">{user.role}</p>
                </div>
            </div>
        )}
      </div>

      {/* Secondary Bar (Section Title) */}
      <div className="bg-[#2C1B15] px-6 py-4 border-b border-[#9E7649]/20 flex items-center justify-between gap-4">
         <h2 className="text-xl text-white/90 font-medium tracking-wide">{sectionTitle}</h2>
         {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
};

export default CMNLHeader;
