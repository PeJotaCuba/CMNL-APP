import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';

interface BottomNavProps {
  user?: { role: UserRole; name: string } | null;
  onSync: () => Promise<boolean>;
}

const BottomNav: React.FC<BottomNavProps> = ({ user, onSync }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);

  if (!user) return null;

  const getActive = (path: string) => location.pathname === path;

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const success = await onSync();
    setIsSyncing(false);
    if (success) {
      alert("✅ Base de datos actualizada correctamente.");
    } else {
      alert("❌ Error al conectar con la base de datos.");
    }
  };

  return (
    <nav className="flex-none bg-card-dark border-t border-white/5 pb-8 pt-3 z-50">
      <div className="flex items-center justify-center gap-10 px-4">
        <button 
          onClick={() => navigate('/home')}
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors active:scale-95 ${getActive('/home') ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${getActive('/home') ? 'filled-icon' : ''}`}>home</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Inicio</span>
        </button>

        {user.role === UserRole.ESCRITOR && (
          <button 
            onClick={() => navigate('/interests')}
            className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors active:scale-95 ${getActive('/interests') ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
          >
            <span className={`material-symbols-outlined text-2xl ${getActive('/interests') ? 'filled-icon' : ''}`}>stars</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Intereses</span>
          </button>
        )}

        {user.role === UserRole.ADMIN && (
          <button 
            onClick={() => navigate('/admin')}
            className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors active:scale-95 ${getActive('/admin') ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
          >
            <span className={`material-symbols-outlined text-2xl ${getActive('/admin') ? 'filled-icon' : ''}`}>settings</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Ajustes</span>
          </button>
        )}

        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors active:scale-95 ${isSyncing ? 'text-white' : 'text-text-secondary hover:text-white'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Actualizar</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
