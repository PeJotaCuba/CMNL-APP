import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Program, UserProfile, EfemeridesData, ConmemoracionesData, DayThemeData, PropagandaData } from './types.ts';
import { INITIAL_USERS, INITIAL_PROGRAMS, INITIAL_EFEMERIDES, INITIAL_CONMEMORACIONES, INITIAL_DAY_THEMES, INITIAL_PROPAGANDA } from './database.ts';
import Dashboard from './pages/Dashboard.tsx';
import Efemerides from './pages/Efemerides.tsx';
import Conmemoraciones from './pages/Conmemoraciones.tsx';
import Propaganda from './pages/Propaganda.tsx';
import Editorial from './pages/Editorial.tsx';
import Interests from './pages/Interests.tsx';
import ThemeDetails from './pages/ThemeDetails.tsx';
import ChatAssistant from './pages/ChatAssistant.tsx';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: any; // From main app
}

const InnerAgendaApp: React.FC<{
  user: UserProfile | null;
  onBack: () => void;
  onMenuClick?: () => void;
  handleLogout: () => void;
  programs: Program[];
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>;
  efemerides: EfemeridesData;
  setEfemerides: React.Dispatch<React.SetStateAction<EfemeridesData>>;
  conmemoraciones: ConmemoracionesData;
  setConmemoraciones: React.Dispatch<React.SetStateAction<ConmemoracionesData>>;
  dayThemes: DayThemeData;
  setDayThemes: React.Dispatch<React.SetStateAction<DayThemeData>>;
  propaganda: PropagandaData;
  setPropaganda: React.Dispatch<React.SetStateAction<PropagandaData>>;
  filterEnabled: boolean;
  setFilterEnabled: (v: boolean) => void;
  handleUpdateCurrentUser: (u: UserProfile) => void;
}> = ({ 
  user, onBack, onMenuClick, handleLogout, programs, setPrograms, 
  efemerides, setEfemerides, conmemoraciones, setConmemoraciones, 
  dayThemes, setDayThemes, propaganda, setPropaganda, 
  filterEnabled, setFilterEnabled, handleUpdateCurrentUser 
}) => {
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="h-[100dvh] w-full bg-background-dark flex flex-col items-center justify-center text-white p-6">
        <span className="material-symbols-outlined text-6xl text-admin-red mb-4">error</span>
        <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
        <p className="text-text-secondary text-center mb-6">Debes iniciar sesión en la aplicación principal para acceder a la Agenda.</p>
        <button onClick={onBack} className="bg-primary px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs">Volver</button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background-dark text-white relative shadow-2xl overflow-hidden font-sans">
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Routes>
          <Route path="/home" element={
              <Dashboard 
                  user={user} 
                  onLogout={onMenuClick || handleLogout} 
                  onMenuClick={onMenuClick}
                  programs={programs} 
                  filterEnabled={filterEnabled}
                  onToggleFilter={() => setFilterEnabled(!filterEnabled)}
                  onBack={onBack}
              />
          } />
          <Route path="/efemerides" element={<Efemerides user={user} data={efemerides} onUpdate={setEfemerides} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/conmemoraciones" element={<Conmemoraciones user={user} data={conmemoraciones} onUpdate={setConmemoraciones} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/propaganda" element={<Propaganda user={user} data={propaganda} onUpdate={setPropaganda} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/interests" element={<Interests user={user} programs={programs} onUpdateUser={handleUpdateCurrentUser} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/details" element={<ThemeDetails user={user} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/assistant" element={<ChatAssistant user={user} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/editorial" element={<Editorial 
            user={user} 
            programs={programs} 
            dayThemes={dayThemes}
            efemerides={efemerides}
            conmemoraciones={conmemoraciones}
            onUpdateProgram={(p) => setPrograms(prev => prev.map(x => x.id === p.id ? p : x))} 
            onUpdateMany={setPrograms}
            onUpdateDayThemes={setDayThemes}
            filterEnabled={filterEnabled}
            onMenuClick={onMenuClick}
            onBack={() => navigate('/home')}
            onClearAll={() => {
              if (confirm("¿Borrar todo?")) {
                setPrograms(prev => prev.map(p => ({ ...p, dailyData: {} })));
                setDayThemes({});
              }
            }}
          />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const AgendaApp: React.FC<Props> = ({ onBack, onMenuClick, currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('rcm_users');
      let currentUsers: UserProfile[] = saved ? JSON.parse(saved) : [];
      
      // Si no hay datos, cargar iniciales
      if (!currentUsers || currentUsers.length === 0) {
        return INITIAL_USERS;
      }

      // IMPORTANTE: Forzar actualización del PIN del Admin desde código (INITIAL_USERS)
      // Pero manteniendo sus otros datos como intereses y foto.
      const codeAdmin = INITIAL_USERS.find(u => u.id === 'admin');
      if (codeAdmin) {
        const idx = currentUsers.findIndex(u => u.id === 'admin');
        if (idx !== -1) {
          currentUsers[idx] = { ...currentUsers[idx], pin: codeAdmin.pin };
        } else {
          currentUsers.unshift(codeAdmin);
        }
      }

      // Migración de campos legacy (password -> pin)
      currentUsers = currentUsers.map(u => ({
         ...u,
         pin: u.pin || (u as any).password || ''
      }));

      return currentUsers;
    } catch (e) { return INITIAL_USERS; }
  });

  // Map main app user to Agenda user profile
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (currentUser) {
      const userId = currentUser.username;
      const savedUser = users.find(u => u.username === userId);
      return {
        id: userId,
        name: currentUser.name,
        username: currentUser.username,
        pin: currentUser.password || '',
        role: currentUser.role as any,
        phone: currentUser.phone || '',
        photo: currentUser.photo || '',
        interests: savedUser?.interests || { days: [], programIds: [] }
      };
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.username;
      const savedUser = users.find(u => u.username === userId);
      setUser({
        id: userId,
        name: currentUser.name,
        username: currentUser.username,
        pin: currentUser.password || '',
        role: currentUser.role as any,
        phone: currentUser.phone || '',
        photo: currentUser.photo || '',
        interests: savedUser?.interests || { days: [], programIds: [] }
      });
    } else {
      setUser(null);
    }
  }, [currentUser, users]);

  // Estado para guardar la sesión del administrador cuando suplanta a un usuario
  const [adminSession, setAdminSession] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('rcm_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [programs, setPrograms] = useState<Program[]>(() => {
    try {
      const saved = localStorage.getItem('rcm_programs');
      return saved ? JSON.parse(saved) : INITIAL_PROGRAMS;
    } catch (e) { return INITIAL_PROGRAMS; }
  });

  const [efemerides, setEfemerides] = useState<EfemeridesData>(() => {
    try {
      const saved = localStorage.getItem('rcm_efemerides');
      return saved ? JSON.parse(saved) : INITIAL_EFEMERIDES;
    } catch (e) { return INITIAL_EFEMERIDES; }
  });

  const [conmemoraciones, setConmemoraciones] = useState<ConmemoracionesData>(() => {
    try {
      const saved = localStorage.getItem('rcm_conmemoraciones');
      return saved ? JSON.parse(saved) : INITIAL_CONMEMORACIONES;
    } catch (e) { return INITIAL_CONMEMORACIONES; }
  });

  const [dayThemes, setDayThemes] = useState<DayThemeData>(() => {
    try {
      const saved = localStorage.getItem('rcm_day_themes');
      return saved ? JSON.parse(saved) : INITIAL_DAY_THEMES;
    } catch (e) { return INITIAL_DAY_THEMES; }
  });

  const [propaganda, setPropaganda] = useState<PropagandaData>(() => {
    try {
      const saved = localStorage.getItem('rcm_propaganda');
      return saved ? JSON.parse(saved) : INITIAL_PROPAGANDA;
    } catch (e) { return INITIAL_PROPAGANDA; }
  });

  // Estado global para controlar si el filtro de intereses está activo
  const [filterEnabled, setFilterEnabled] = useState(true);

  useEffect(() => {
    localStorage.setItem('rcm_programs', JSON.stringify(programs));
    localStorage.setItem('rcm_efemerides', JSON.stringify(efemerides));
    localStorage.setItem('rcm_conmemoraciones', JSON.stringify(conmemoraciones));
    localStorage.setItem('rcm_day_themes', JSON.stringify(dayThemes));
    localStorage.setItem('rcm_propaganda', JSON.stringify(propaganda));
    localStorage.setItem('rcm_users', JSON.stringify(users));
  }, [programs, efemerides, conmemoraciones, dayThemes, propaganda, users]);

  const handleLogout = () => {
    if (adminSession) {
      setUser(adminSession);
      localStorage.setItem('rcm_session', JSON.stringify(adminSession));
      setAdminSession(null);
      localStorage.removeItem('rcm_admin_session');
    } else {
      // Instead of logging out completely, return to main app
      onBack();
    }
  };

  const handleUpdateCurrentUser = (updatedUser: UserProfile) => {
    setUsers(prev => {
      const exists = prev.some(u => u.id === updatedUser.id);
      if (exists) {
        return prev.map(old => old.id === updatedUser.id ? updatedUser : old);
      } else {
        return [...prev, updatedUser];
      }
    });
    setUser(updatedUser);
    localStorage.setItem('rcm_session', JSON.stringify(updatedUser));
  };

  return (
    <Router>
      <InnerAgendaApp 
        user={user}
        onBack={onBack}
        onMenuClick={onMenuClick}
        handleLogout={handleLogout}
        programs={programs}
        setPrograms={setPrograms}
        efemerides={efemerides}
        setEfemerides={setEfemerides}
        conmemoraciones={conmemoraciones}
        setConmemoraciones={setConmemoraciones}
        dayThemes={dayThemes}
        setDayThemes={setDayThemes}
        propaganda={propaganda}
        setPropaganda={setPropaganda}
        filterEnabled={filterEnabled}
        setFilterEnabled={setFilterEnabled}
        handleUpdateCurrentUser={handleUpdateCurrentUser}
      />
    </Router>
  );
};

export default AgendaApp;
