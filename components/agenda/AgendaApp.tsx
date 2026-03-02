import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Program, UserProfile, EfemeridesData, ConmemoracionesData, DayThemeData } from './types.ts';
import { INITIAL_USERS, INITIAL_PROGRAMS, INITIAL_EFEMERIDES, INITIAL_CONMEMORACIONES, INITIAL_DAY_THEMES } from './database.ts';
import Dashboard from './pages/Dashboard.tsx';
import Efemerides from './pages/Efemerides.tsx';
import Conmemoraciones from './pages/Conmemoraciones.tsx';
import Editorial from './pages/Editorial.tsx';
import AdminConfig from './pages/AdminConfig.tsx';
import Interests from './pages/Interests.tsx';
import ThemeDetails from './pages/ThemeDetails.tsx';
import BottomNav from './components/BottomNav.tsx';
import ChatAssistant from './pages/ChatAssistant.tsx';

interface Props {
  onBack: () => void;
  currentUser: any; // From main app
}

const AgendaApp: React.FC<Props> = ({ onBack, currentUser }) => {
  // Map main app user to Agenda user profile
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (!currentUser) return null;
    return {
      id: currentUser.id || currentUser.username,
      name: currentUser.name,
      username: currentUser.username,
      pin: currentUser.password || '',
      role: currentUser.role as any,
      phone: currentUser.phone || '',
      photo: currentUser.photo || ''
    };
  });

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

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('rcm_users');
      let currentUsers: UserProfile[] = saved ? JSON.parse(saved) : [];
      
      // Si no hay datos, cargar iniciales
      if (!currentUsers || currentUsers.length === 0) {
        return INITIAL_USERS;
      }

      // IMPORTANTE: Forzar actualización del Admin desde código (INITIAL_USERS)
      // Esto corrige problemas donde localStorage tiene una contraseña antigua.
      const codeAdmin = INITIAL_USERS.find(u => u.id === 'admin-root');
      if (codeAdmin) {
        const idx = currentUsers.findIndex(u => u.id === 'admin-root');
        if (idx !== -1) {
          currentUsers[idx] = codeAdmin;
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

  // Estado global para controlar si el filtro de intereses está activo
  const [filterEnabled, setFilterEnabled] = useState(true);

  const handleLogin = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem('rcm_session', JSON.stringify(u));
  };

  // --- SINCRONIZACIÓN MANUAL CON GITHUB OPTIMIZADA ---
  const handleSyncWithGitHub = async (): Promise<boolean> => {
    try {
      const BASE_URL = "https://raw.githubusercontent.com/PeJotaCuba/RCM-Agenda/main";
      
      // 1. Fetch Agenda Data (Programs, Efemerides, etc.)
      const agendaRes = await fetch(`${BASE_URL}/agenda.json?t=${Date.now()}`, { cache: "no-store" });
      let agendaSuccess = false;
      if (agendaRes.ok) {
        const data = await agendaRes.json();
        if (data.programs) setPrograms(data.programs);
        if (data.efemerides) setEfemerides(data.efemerides);
        if (data.conmemoraciones) setConmemoraciones(data.conmemoraciones);
        if (data.dayThemes) setDayThemes(data.dayThemes);
        
        localStorage.setItem('rcm_programs', JSON.stringify(data.programs || programs));
        localStorage.setItem('rcm_efemerides', JSON.stringify(data.efemerides || efemerides));
        localStorage.setItem('rcm_conmemoraciones', JSON.stringify(data.conmemoraciones || conmemoraciones));
        localStorage.setItem('rcm_day_themes', JSON.stringify(data.dayThemes || dayThemes));
        agendaSuccess = true;
      }

      // 2. Fetch User Data
      const usersRes = await fetch(`${BASE_URL}/agusuario.json?t=${Date.now()}`, { cache: "no-store" });
      let usersSuccess = false;
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.users && Array.isArray(data.users)) {
             let newUsers = data.users;
             
             // Asegurar que el admin local (con credenciales correctas) prevalezca si el remoto está desactualizado o no existe
             const codeAdmin = INITIAL_USERS.find(u => u.id === 'admin-root');
             if (codeAdmin) {
                 const idx = newUsers.findIndex((u: any) => u.id === 'admin-root');
                 if (idx !== -1) {
                     // Opción: Sobrescribir el admin remoto con el local para garantizar acceso
                     newUsers[idx] = codeAdmin;
                 } else {
                     newUsers.unshift(codeAdmin);
                 }
             }

             setUsers(newUsers);
             localStorage.setItem('rcm_users', JSON.stringify(newUsers));
             usersSuccess = true;
        }
      }

      if (agendaSuccess || usersSuccess) {
        setTimeout(() => {
            let msg = "✅ Sincronización completada.\n";
            if(agendaSuccess) msg += "- Base de Datos (Agenda) actualizada.\n";
            if(usersSuccess) msg += "- Base de Usuarios actualizada.\n";
            
            if(confirm(msg + "\n¿Desea recargar ahora para aplicar cambios?")) {
                window.location.reload();
            }
        }, 500);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Sync Error", error);
      return false;
    }
  };

  useEffect(() => {
    localStorage.setItem('rcm_programs', JSON.stringify(programs));
    localStorage.setItem('rcm_efemerides', JSON.stringify(efemerides));
    localStorage.setItem('rcm_conmemoraciones', JSON.stringify(conmemoraciones));
    localStorage.setItem('rcm_day_themes', JSON.stringify(dayThemes));
    localStorage.setItem('rcm_users', JSON.stringify(users));
  }, [programs, efemerides, conmemoraciones, dayThemes, users]);

  const handleExportAgenda = () => {
    const backupData = {
      programs,
      efemerides,
      conmemoraciones,
      dayThemes,
      backupDate: new Date().toISOString()
    };
    downloadJson(backupData, "agenda.json");
  };

  const handleExportUsers = () => {
    const backupData = {
      users,
      backupDate: new Date().toISOString()
    };
    downloadJson(backupData, "agusuario.json");
  };

  const downloadJson = (data: any, filename: string) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleAdminImpersonation = (targetUser: UserProfile, currentAdmin: UserProfile) => {
    setAdminSession(currentAdmin);
    localStorage.setItem('rcm_admin_session', JSON.stringify(currentAdmin));
    handleLogin(targetUser);
  };

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
    setUsers(prev => prev.map(old => old.id === updatedUser.id ? updatedUser : old));
    setUser(updatedUser);
    localStorage.setItem('rcm_session', JSON.stringify(updatedUser));
  };

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
    <Router>
      <div className="h-[100dvh] w-full flex flex-col bg-background-dark text-white max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans">
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Routes>
            <Route path="/home" element={
                <Dashboard 
                    user={user} 
                    onLogout={handleLogout} 
                    programs={programs} 
                    onSync={handleSyncWithGitHub}
                    filterEnabled={filterEnabled}
                    onToggleFilter={() => setFilterEnabled(!filterEnabled)}
                />
            } />
            <Route path="/efemerides" element={<Efemerides user={user} data={efemerides} onUpdate={setEfemerides} />} />
            <Route path="/conmemoraciones" element={<Conmemoraciones user={user} data={conmemoraciones} onUpdate={setConmemoraciones} />} />
            <Route path="/interests" element={<Interests user={user} programs={programs} onUpdateUser={handleUpdateCurrentUser} />} />
            <Route path="/details" element={<ThemeDetails />} />
            <Route path="/assistant" element={<ChatAssistant onSync={handleSyncWithGitHub} />} />
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
              onClearAll={() => {
                if (confirm("¿Borrar todo?")) {
                  setPrograms(prev => prev.map(p => ({ ...p, dailyData: {} })));
                  setDayThemes({});
                }
              }}
            />} />
            <Route path="/admin" element={<AdminConfig 
              user={user}
              programs={programs}
              onAddProgram={(p) => setPrograms(prev => [...prev, p])}
              onUpdateProgram={(p) => setPrograms(prev => prev.map(current => current.id === p.id ? p : current))}
              onDeleteProgram={(id) => setPrograms(prev => prev.filter(p => p.id !== id))}
              users={users}
              onAddUser={(u) => setUsers(prev => [...prev, u])}
              onDeleteUser={(id) => setUsers(prev => prev.filter(u => u.id !== id))}
              onUpdateUser={(u) => setUsers(prev => prev.map(old => old.id === u.id ? u : old))}
              onExportAgenda={handleExportAgenda}
              onExportUsers={handleExportUsers}
              onSync={handleSyncWithGitHub}
              onAdminLogin={handleAdminImpersonation}
            />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
        <BottomNav user={user} onSync={handleSyncWithGitHub} />
      </div>
    </Router>
  );
};

export default AgendaApp;
