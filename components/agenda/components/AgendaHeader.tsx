import React from 'react';
import { UserProfile } from '../types';

interface AgendaHeaderProps {
  title: string;
  user: UserProfile;
  onMenuClick?: () => void;
}

const AgendaHeader: React.FC<AgendaHeaderProps> = ({ title, user, onMenuClick }) => {
  return (
    <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-white/5 shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-white text-xl">more_vert</span>
          </button>
          
          <div>
            <h1 className="text-[10px] font-bold text-text-secondary leading-none uppercase tracking-widest">CMNL App</h1>
            <h2 className="text-sm font-bold text-white leading-tight tracking-tight">{title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-white leading-none">{user.name.split(' ')[0]}</p>
                <p className="text-[9px] text-primary uppercase tracking-wider">{user.role}</p>
            </div>
            <div className="size-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-primary/20 flex items-center justify-center relative">
              {user.photo ? (
                <img src={user.photo} alt={user.name} className="absolute inset-0 size-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary text-sm">person</span>
              )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default AgendaHeader;
