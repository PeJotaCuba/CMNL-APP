import React, { useState, useEffect } from 'react';
import { Users, Upload, Download, RefreshCw, Edit2, Camera, Trash2, Share2, Search, FileText, AlertTriangle, Plus, Smartphone, Monitor, Shield } from 'lucide-react';
import CMNLHeader from '../CMNLHeader';
import ContentManagementSection from './ContentManagementSection';
import { User, UserClassification, ProgramFicha } from '../../types';
import { openWhatsApp } from '../../utils/whatsappUtils';

interface TeamMember {
  id: string;
  name: string;
  specialty: string;
  level: string;
  photoUrl?: string;
  info?: string;
  email?: string;
  designatedUserId?: string;
  habitualPrograms?: string[];
  habitualProgramsByRole?: Record<string, string[]>;
  habitualProgramsDays?: Record<string, Record<string, string[]>>; // role -> programName -> days[]
}

interface EquipoSectionProps {
  currentUser: any;
  onBack: () => void;
  onMenuClick: () => void;
  catalogo: any[];
  fichas: ProgramFicha[];
  onDirtyChange: (dirty: boolean) => void;
  onTeamUpdate?: (newTeam: TeamMember[]) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  historyContent: string;
  setHistoryContent: React.Dispatch<React.SetStateAction<string>>;
  aboutContent: string;
  setAboutContent: React.Dispatch<React.SetStateAction<string>>;
  news: any[];
  setNews: React.Dispatch<React.SetStateAction<any[]>>;
  setImpersonatedUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const EQUIPO_URL = 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json';

const EquipoSection: React.FC<EquipoSectionProps> = ({ currentUser, onBack, onMenuClick, catalogo, fichas, onDirtyChange, onTeamUpdate, users, setUsers, historyContent, setHistoryContent, aboutContent, setAboutContent, news, setNews, setImpersonatedUser }) => {
  const [team, setTeam] = useState<TeamMember[]>([]);

  const getProgramDays = (progName: string): string[] => {
    const ficha = (fichas || []).find(f => f.name.toLowerCase() === progName.toLowerCase());
    if (!ficha) return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    const freq = ficha.frequency.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (freq.includes('diario') || freq.includes('lunes a domingo')) return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    if (freq.includes('lunes a sabado')) return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    if (freq.includes('lunes a viernes')) return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    
    const allDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const result: string[] = [];
    
    if (freq.includes('lunes')) result.push('Lunes');
    if (freq.includes('martes')) result.push('Martes');
    if (freq.includes('miercoles')) result.push('Miércoles');
    if (freq.includes('jueves')) result.push('Jueves');
    if (freq.includes('viernes')) result.push('Viernes');
    if (freq.includes('sabado')) result.push('Sábado');
    if (freq.includes('domingo')) result.push('Domingo');
    
    return result.length > 0 ? result : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  };
  const [loading, setLoading] = useState(false);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador' || (currentUser?.classification === 'Coordinador' && (currentUser?.coordinatorSections || []).includes('Gestión'));
  const isGlobalAdmin = currentUser?.classification === 'Administrador' || (currentUser?.role === 'admin' && currentUser?.classification !== 'Coordinador');
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [newDeviceToken, setNewDeviceToken] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('PC');
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [customAlert, setCustomAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [adminPwdPrompt, setAdminPwdPrompt] = useState<{ visible: boolean; targetUserId: string; pwdInput: string; error?: string } | null>(null);
  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({ message, type });
  };

  const ROLES = [
    'Director', 
    'Asesor', 
    'Realizador', 
    'Locutor', 
    'Guionista', 
    'Periodista', 
    'Coordinador', 
    'Director de emisora', 
    'Jefe de Programación', 
    'Especialista', 
    'Auxiliar general', 
    'Asistente de dirección', 
    'Recepcionista'
  ];

  const cleanJoined = (str: string) => {
    return (str || '')
      .split('/')
      .map(s => {
        const trimmed = s.trim();
        const lower = trimmed.toLowerCase();
        if (lower === 'directora' || lower === 'directora de emisora' || lower === 'directora de la emisora') {
          return 'Director de emisora';
        }
        if (lower === 'coordinador' || lower === 'coordinadora') {
          return 'Coordinador';
        }
        return trimmed;
      })
      .filter(s => s)
      .join(' / ');
  };

  const normalizeRole = (roleName: string) => {
    const lower = (roleName || '').toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
    
    // Director de emisora matches (avoid matching plain 'director', which is ordinary)
    if (lower === 'director de emisora' || lower === 'directora de emisora' || lower === 'director de la emisora' || lower === 'directora de la emisora' || lower === 'directora' || lower === 'directora de emisoras') {
      return 'director de emisora';
    }
    // Jefe de Programación matches
    if (lower === 'jefe de programacion' || lower === 'jefa de programacion' || lower === 'jefe de programación' || lower === 'jefa de programación') {
      return 'jefe de programación';
    }
    // Coordinador de programación matches
    if (lower === 'coordinador de programacion' || lower === 'coordinadora de programacion' || lower === 'coordinador de programación' || lower === 'coordinadora de programación' || lower === 'coordinador' || lower === 'coordinadora') {
      return 'coordinador';
    }
    return lower;
  };

  const STATIC_ADMIN_MEMBER: TeamMember = {
    id: 'admin_app_static',
    name: 'Administrador App',
    specialty: 'Soporte, Redacción y Criptografía',
    level: 'Administración Global',
    photoUrl: '',
    email: 'emisora@cmnl.cu',
    info: `DATOS DE LA CUENTA DE ADMINISTRADOR APP:
• Teléfono Directo: +53 54321098
• Correo Electrónico: emisora@cmnl.cu
• Usuario de Acceso: admin
• Contraseña de Acceso: adminpassword123

Cuenta técnica permanente del sistema. Ofrece control completo de programaciones y validación criptográfica de identidades.`,
    habitualPrograms: []
  };

  useEffect(() => {
    const saved = localStorage.getItem('rcm_equipo_cmnl');
    let loadedTeam: TeamMember[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedTeam = parsed;
        }
      } catch (e) {
        console.error("Error parsing team data", e);
      }
    }
    
    // Ensure the static admin member always exists
    if (!loadedTeam.some(m => m.id === 'admin_app_static')) {
      loadedTeam = [STATIC_ADMIN_MEMBER, ...loadedTeam];
      localStorage.setItem('rcm_equipo_cmnl', JSON.stringify(loadedTeam));
    } else {
      // Force update its info and fields to match requirements to avoid stale structures, but preserve administrative modifications
      loadedTeam = loadedTeam.map(m => m.id === 'admin_app_static' ? { ...STATIC_ADMIN_MEMBER, ...m, designatedUserId: m.designatedUserId } : m);
    }
    
    setTeam(loadedTeam);
  }, []);

  useEffect(() => {
    // Keep admin_app_static info updated with live user credentials and linked user details
    setTeam(prevTeam => prevTeam.map(m => {
      if (m.id === 'admin_app_static') {
        const linkedUserId = m.designatedUserId || 'pedro';
        const linkedUser = users.find(u => u.id === linkedUserId) || users.find(u => u.id === 'pedro');
        const adminRealUser = users.find(u => u.id === 'pedro') || linkedUser;
        
        return {
          ...m,
          name: linkedUser && linkedUserId !== 'pedro' ? linkedUser.name : 'Administrador App',
          mobile: linkedUser?.mobile || m.mobile,
          email: linkedUser?.email || m.email,
          deviceLimitEnabled: adminRealUser?.deviceLimitEnabled || false,
          authorizedDevices: linkedUser?.authorizedDevices || [],
          info: ''
        };
      }
      return m;
    }));
  }, [users]);

  const saveTeam = (newTeam: TeamMember[]) => {
    setTeam(newTeam);
    localStorage.setItem('rcm_equipo_cmnl', JSON.stringify(newTeam));
    onDirtyChange(true);
    if (onTeamUpdate) onTeamUpdate(newTeam);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      const currentTeam = [...team];
      const updatedUsers = [...users];
      let processedCount = 0;

      const cleanValue = (val: string) => {
        if (val.includes(':')) return val.split(':')[1].trim();
        return val.trim();
      };

      // Split by the separator lines (underscores or hyphens)
      const blocks = text.split(/[_-]{10,}/).map(b => b.trim()).filter(b => b);

      blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length >= 4) {
          // Expected structure:
          // Name
          // Specialty
          // Level (optional)
          // Móvil: ...
          // Usuario: ...
          // Contraseña: ...
          // Rol: ...
          
          let name = cleanValue(lines[0]);
          let specialty = cleanValue(lines[1]);
          let level = "";
          let mobile = "";
          let username = "";
          let password = "";
          let role = "";

          // Find labeled lines and level
          lines.forEach((line, idx) => {
            const lower = line.toLowerCase();
            if (lower.startsWith('móvil:')) mobile = cleanValue(line);
            else if (lower.startsWith('usuario:')) username = cleanValue(line);
            else if (lower.startsWith('contraseña:')) password = cleanValue(line);
            else if (lower.startsWith('rol:')) role = cleanValue(line);
            else if (idx === 2 && !line.includes(':')) level = line; 
          });

          if (name && username) {
            const id = username.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Overwrite logic - Team Member
            const teamIdx = currentTeam.findIndex(m => m.id === id || m.name.toLowerCase() === name.toLowerCase());
            const newMemberData = {
              id,
              name,
              specialty,
              level,
              photoUrl: teamIdx >= 0 ? currentTeam[teamIdx].photoUrl : `https://picsum.photos/seed/${id}/400/400`,
              info: teamIdx >= 0 ? currentTeam[teamIdx].info : ''
            };

            if (teamIdx >= 0) {
              currentTeam[teamIdx] = { ...currentTeam[teamIdx], ...newMemberData };
            } else {
              currentTeam.push(newMemberData);
            }

            // Overwrite logic - User
            const userIdx = updatedUsers.findIndex(u => u.id === id || u.username.toLowerCase() === username.toLowerCase());
            
            let finalRole: 'admin' | 'worker' | 'coordinator' = 'worker';
            if (role.toLowerCase().includes('administrador')) finalRole = 'admin';
            else if (role.toLowerCase().includes('coordinador')) finalRole = 'coordinator';

            const newUser: User = {
              id,
              username,
              name,
              mobile,
              password,
              role: finalRole,
              classification: (role || (userIdx >= 0 ? updatedUsers[userIdx].classification : 'Usuario')) as UserClassification,
              specialty: specialty
            };

            if (userIdx >= 0) {
              updatedUsers[userIdx] = { ...updatedUsers[userIdx], ...newUser };
            } else {
              updatedUsers.push(newUser);
            }
            processedCount++;
          }
        }
      });

      saveTeam(currentTeam);
      setUsers(updatedUsers);
      localStorage.setItem('rcm_users', JSON.stringify(updatedUsers));
      showAlert(`Se procesaron ${processedCount} registros de equipo y usuarios.`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const currentTeam = [...team];
      let processedCount = 0;

      // Split by the separator lines
      const blocks = text.split(/[_-]{10,}/).map(b => b.trim()).filter(b => b);

      blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length >= 2) {
          const name = lines[0].trim();
          let bio = "";
          
          // Find "Biografía:" line and take everything after it
          const bioLineIdx = lines.findIndex(l => l.toLowerCase().startsWith('biografía:'));
          if (bioLineIdx !== -1) {
            const parts = lines[bioLineIdx].split(':');
            if (parts.length > 1) {
              bio = parts.slice(1).join(':').trim();
            }
            
            // If there are more lines after the "Biografía:" line, append them
            if (lines.length > bioLineIdx + 1) {
              const remainingLines = lines.slice(bioLineIdx + 1).join('\n').trim();
              if (remainingLines) {
                bio += (bio ? "\n" : "") + remainingLines;
              }
            }
          }

          const teamIdx = currentTeam.findIndex(m => m.name.toLowerCase() === name.toLowerCase());
          if (teamIdx >= 0) {
            currentTeam[teamIdx].info = bio;
            processedCount++;
          }
        }
      });

      saveTeam(currentTeam);
      showAlert(`Se actualizaron ${processedCount} biografías.`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePhotoUpload = (memberId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updatedTeam = team.map(m => m.id === memberId ? { ...m, photoUrl: base64 } : m);
      saveTeam(updatedTeam);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [searchQuery, setSearchQuery] = useState("");

  const searchLower = searchQuery.toLowerCase().trim();
  const searchBase = searchLower.length >= 3 ? searchLower.replace(/e?s$/, '') : searchLower;

  const getPriority = (specialtyStr: string) => {
    const roles = specialtyStr.split(' / ').map(s => s.trim().toLowerCase());
    let minPriority = 99;

    for (const role of roles) {
      if (role.includes('directora de la emisora') || role.includes('director de la emisora')) minPriority = Math.min(minPriority, 1);
      else if (role.includes('jefa de programación') || role.includes('jefe de programación')) minPriority = Math.min(minPriority, 2);
      else if (role.includes('coordinador de programación') || role.includes('coordinadora de programación')) minPriority = Math.min(minPriority, 3);
      else if (role.includes('directora') || role.includes('director')) minPriority = Math.min(minPriority, 4);
      else if (role.includes('asesora') || role.includes('asesor')) minPriority = Math.min(minPriority, 5);
      else if (role.includes('guionista')) minPriority = Math.min(minPriority, 6);
      else if (role.includes('locutora') || role.includes('locutor')) minPriority = Math.min(minPriority, 7);
      else if (role.includes('realizadora de sonido') || role.includes('realizador de sonido')) minPriority = Math.min(minPriority, 8);
      else if (role.includes('periodista')) minPriority = Math.min(minPriority, 9);
      else if (role.includes('comunicadora') || role.includes('comunicador')) minPriority = Math.min(minPriority, 10);
      else if (role.includes('especialista')) minPriority = Math.min(minPriority, 11);
    }
    return minPriority;
  };

  const sortedTeam = [...team].sort((a, b) => {
    const pA = getPriority(a.specialty);
    const pB = getPriority(b.specialty);
    if (pA === pB) {
      return a.name.localeCompare(b.name);
    }
    return pA - pB;
  });

  const filteredTeam = sortedTeam.filter(member => {
    if (member.id === 'admin_app_static' && currentUser?.username !== 'admincmnl') {
      return false;
    }
    if (!searchLower) return true;
    const matchName = member.name.toLowerCase().includes(searchLower);
    const matchSpecialty = member.specialty.toLowerCase().includes(searchBase);
    return matchName || matchSpecialty;
  });

  let specialtyMatches: string[] = [];
  if (searchBase.length >= 3) {
    specialtyMatches = ROLES.filter(role => role.toLowerCase().includes(searchBase) || searchBase.includes(role.toLowerCase()));
  }
  const isFilteredBySpecialty = (specialtyMatches.length > 0 || filteredTeam.some(m => m.specialty.toLowerCase().includes(searchBase) && !m.name.toLowerCase().includes(searchLower))) && filteredTeam.length > 0;

  const handleDownloadFilteredList = () => {
    let content = `Reporte de Equipo: Especialidad de búsqueda "${searchQuery}"\n`;
    content += `Fecha: ${new Date().toLocaleDateString()}\n`;
    content += `=========================================\n\n`;

    filteredTeam.forEach(member => {
      const memberRoles = member.specialty.split('/').map(s => s.trim());
      
      const matchedRoles = memberRoles.filter(role => role.toLowerCase().includes(searchBase));
      const reportedRole = matchedRoles.length > 0 ? matchedRoles[0] : memberRoles[0];
      
      content += `Nombre: ${member.name}\n`;
      content += `Especialidad: ${reportedRole}\n`;
      
      let programsForMatchedRole: string[] = [];
      if (member.habitualProgramsByRole) {
        const exactKey = Object.keys(member.habitualProgramsByRole).find(k => k.toLowerCase() === reportedRole.toLowerCase());
        if (exactKey && member.habitualProgramsByRole[exactKey]) {
          programsForMatchedRole = member.habitualProgramsByRole[exactKey];
        }
      }
      
      let programsStr = 'Ninguno';
      if (programsForMatchedRole.length > 0) {
        programsStr = programsForMatchedRole.map(prog => {
          let daysStr = '';
          if (member.habitualProgramsDays) {
            const exactKey = Object.keys(member.habitualProgramsDays).find(k => k.toLowerCase() === reportedRole.toLowerCase());
            if (exactKey && member.habitualProgramsDays[exactKey] && member.habitualProgramsDays[exactKey][prog]) {
              const days = member.habitualProgramsDays[exactKey][prog];
              if (days && days.length > 0) {
                daysStr = ` (${days.join(', ')})`;
              }
            }
          }
          return `${prog}${daysStr}`;
        }).join(', ');
      }
      
      content += `Programas: ${programsStr}\n`;
      content += `-----------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = `Equipo_${searchQuery.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    setCustomConfirm({
      message: "¿ESTÁ SEGURO? Esta acción eliminará permanentemente a TODOS los miembros del equipo y usuarios de esta sección (con excepción de las cuentas administrativas activas o tu propia cuenta para evitar bloqueos de acceso).",
      onConfirm: () => {
        const keptTeam = [STATIC_ADMIN_MEMBER];
        if (currentUser && currentUser.id !== 'admin_app_static') {
            const currentStaff = team.find(m => m.id === currentUser.id);
            if (currentStaff) keptTeam.push(currentStaff);
        }
        saveTeam(keptTeam);

        const keptUsers = users.filter(u => u.role === 'admin' || u.id === 'admin_app_static' || u.id === currentUser?.id);
        setUsers(keptUsers);
        localStorage.setItem('rcm_users', JSON.stringify(keptUsers));
        
        showAlert("Todos los datos de usuarios y personal de esta sección se han limpiado correctamente.", 'success');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      <CMNLHeader 
        user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
        sectionTitle="Equipo CMNL"
        onMenuClick={onMenuClick}
        onBack={onBack}
      >
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <label className="p-2 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-2" title="Cargar TXT">
                <Upload size={20} />
                <span className="hidden sm:inline text-sm font-medium">Cargar TXT</span>
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
              <label className="p-2 bg-[#2C1B15] hover:bg-[#3D261D] text-white rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-2 border border-[#9E7649]/30" title="Cargar Biografías">
                <Users size={20} />
                <span className="hidden sm:inline text-sm font-medium">Cargar Biografías</span>
                <input type="file" accept=".txt" onChange={handleBioUpload} className="hidden" />
              </label>
              <button 
                onClick={handleClearAll}
                className="p-2 bg-red-950/40 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-2 border border-red-500/25 font-semibold"
                title="Limpiar Todo"
                id="btn-limpiar-todo-equipo"
              >
                <Trash2 size={20} />
                <span className="hidden sm:inline text-sm font-medium">Limpiar Todo</span>
              </button>
            </>
          )}
        </div>
      </CMNLHeader>

      {/* Removed Tabs as per requirements */}

      <div className="p-6 overflow-y-auto pb-20">
        <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-[#9E7649]" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o especialidad..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-[#E8DCCF]/40 focus:outline-none focus:border-[#9E7649] transition-colors"
            />
          </div>

          {isFilteredBySpecialty && (
            <button
              onClick={handleDownloadFilteredList}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-xl transition-colors border border-cyan-500/30 font-medium whitespace-nowrap"
            >
              <Download size={18} />
              Descargar Detalles ({filteredTeam.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {filteredTeam.map(member => {
              const isSelf = currentUser?.name && member.name && currentUser.name.toLowerCase() === member.name.toLowerCase();
              const canEditPhoto = isAdmin || isSelf;

              let displayLevel = member.level;
              if (displayLevel === 'No especificado') {
                displayLevel = '';
              } else if (displayLevel) {
                const parts = displayLevel.split(' / ');
                displayLevel = Array.from(new Set(parts)).join(' / ');
              }

              const canEditThisMember = (() => {
                if (currentUser?.username === 'admincmnl' && member.id === 'admin_app_static') {
                  return true;
                }
                if (member.id === currentUser?.id) {
                  return false;
                }
                if (member.id === 'admin_app_static') {
                  return false;
                }
                return isAdmin || currentUser?.id === 'pedro' || currentUser?.role === 'admin' || currentUser?.id === 'admin_app_static';
              })();

              return (
                <div 
                  key={member.id} 
                  className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden flex flex-col items-center p-6 pt-14 shadow-lg relative group cursor-pointer hover:border-[#9E7649]/50 transition-colors"
                  onClick={() => setViewingMember(member)}
                >
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {member.id !== 'admin_app_static' && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const user = users.find(u => u.id === member.id);
                            if (user) {
                              const message = `Hola ${member.name}, aquí tienes tus credenciales para CMNL App:\n\nUsuario: ${user.username}\nMóvil: ${user.mobile}\nContraseña: ${user.password}\nPIN: ${user.password.slice(-4)}\n\nAccede aquí: https://cmnl-app.vercel.app/`;
                              openWhatsApp(message, user.mobile);
                            } else {
                              showAlert('No se encontró información de usuario para este miembro.', 'error');
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg transition-all shadow-lg border border-[#25D366]/30"
                          title="Compartir vía WhatsApp"
                        >
                          <Share2 size={16} />
                        </button>
                      )}
                      {canEditThisMember && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              // Find corresponding user
                              const isStaticAdmin = member.id === 'admin_app_static';
                              const linkedUserId = isStaticAdmin ? (member.designatedUserId || 'pedro') : member.id;
                              const linkedUser = users.find(u => u.id === linkedUserId) || users.find(u => u.id === member.id);
                              const adminUser = users.find(u => u.id === 'pedro');
                              
                              setEditingMember({
                                ...member,
                                username: isStaticAdmin ? 'admincmnl' : (linkedUser?.username || ''),
                                mobile: linkedUser?.mobile || '',
                                email: linkedUser?.email || member.email || '',
                                password: isStaticAdmin ? 'RCBay010206' : (linkedUser?.password || ''),
                                role: isStaticAdmin ? 'Administrador' : (linkedUser?.classification === 'Directora' ? 'Director' : (linkedUser?.classification === 'Coordinador' ? 'Coordinador de programación' : linkedUser?.classification || '')),
                                coordinatorSections: isStaticAdmin ? [] : (linkedUser?.coordinatorSections || []),
                                tools: isStaticAdmin ? [] : (linkedUser?.tools || []),
                                habitualProgramsDays: isStaticAdmin ? {} : (linkedUser?.habitualProgramsDays || member.habitualProgramsDays || {}),
                                deviceLimitEnabled: isStaticAdmin ? (adminUser?.deviceLimitEnabled || false) : (linkedUser?.deviceLimitEnabled || false),
                                authorizedDevices: linkedUser?.authorizedDevices || []
                              });  
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-[#9E7649] text-white rounded-lg transition-all shadow-lg border border-[#9E7649]/30"
                            title="Editar Información"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      {member.id !== 'admin_app_static' && member.id !== currentUser?.id && (() => {
                        const canEdit = currentUser?.id === 'admin_app_static' || currentUser?.role === 'admin' || (member.id !== 'admin_app_static' && member.id !== currentUser?.id);
                        return canEdit && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setCustomConfirm({
                                message: `¿Estás seguro de eliminar a ${member.name}?`,
                                onConfirm: () => {
                                  const updatedTeam = team.filter(m => m.id !== member.id);
                                  saveTeam(updatedTeam);
                                  const updatedUsers = users.filter(u => u.id !== member.id);
                                  setUsers(updatedUsers);
                                  localStorage.setItem('rcm_users', JSON.stringify(updatedUsers));
                                }
                              });
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-lg border border-red-700/30"
                            title="Eliminar Miembro"
                          >
                            <Trash2 size={16} />
                          </button>
                        );
                      })()}
                    </div>
                  )}
                  <div className="relative w-24 h-24 rounded-full bg-[#1A100C] border-2 border-[#9E7649]/50 mb-4 overflow-hidden flex items-center justify-center">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={40} className="text-[#9E7649]/50" />
                    )}
                    
                    {canEditPhoto && (
                      <label 
                        className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Camera size={24} className="text-white mb-1" />
                        <span className="text-[10px] text-white font-bold">Cambiar</span>
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(member.id, e)} className="hidden" />
                      </label>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white text-center leading-tight mb-1">{member.name}</h3>
                  <p className="text-sm text-[#9E7649] text-center font-medium mb-1">{member.specialty}</p>
                  {displayLevel && (
                    <span className="text-xs bg-[#9E7649]/20 text-[#E8DCCF] px-3 py-1 rounded-full border border-[#9E7649]/30">
                      {displayLevel}
                    </span>
                  )}
                </div>
              );
            })}
            
            {team.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <Users size={64} className="mb-4 text-[#9E7649]" />
                <p className="text-lg">No hay miembros en el equipo</p>
                {isAdmin && <p className="text-sm mt-2">Carga un archivo TXT para comenzar</p>}
              </div>
            )}
          </div>
        
        {/* Content Management integrated below team list for admins */}
        {isAdmin && (
          <div className="mt-12 pt-12 border-t border-[#9E7649]/20">
            <ContentManagementSection 
                historyContent={historyContent}
                setHistoryContent={setHistoryContent}
                aboutContent={aboutContent}
                setAboutContent={setAboutContent}
                news={news}
                setNews={setNews}
                onDirtyChange={onDirtyChange}
            />
          </div>
        )}
      </div>

      {/* Viewing Modal */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingMember(null)}>
          <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingMember(null)} className="absolute top-4 right-4 text-[#E8DCCF]/50 hover:text-white">
              ✕
            </button>
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full bg-[#2C1B15] border-2 border-[#9E7649] mb-4 overflow-hidden flex items-center justify-center">
                {viewingMember.photoUrl ? (
                  <img src={viewingMember.photoUrl} alt={viewingMember.name} className="w-full h-full object-cover" />
                ) : (
                  <Users size={48} className="text-[#9E7649]/50" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-white text-center">{viewingMember.name}</h2>
              <p className="text-[#9E7649] font-medium text-center mt-1">{viewingMember.specialty}</p>
              {viewingMember.level && viewingMember.level !== 'No especificado' && (
                <span className="text-xs bg-[#9E7649]/20 text-[#E8DCCF] px-3 py-1 rounded-full border border-[#9E7649]/30 mt-2">
                  {Array.from(new Set(viewingMember.level.split(' / '))).join(' / ')}
                </span>
              )}
              {viewingMember.contracts && viewingMember.contracts.some(Boolean) && (
                <div className="mt-4 w-full text-center bg-black/25 rounded-xl p-2.5 border border-[#9E7649]/10">
                  <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-widest mb-1.5 font-mono">Nro. Contratos Especialidad</p>
                  <div className="text-xs text-stone-300 font-mono space-y-1">
                    {viewingMember.specialty.split(' / ').map((spec, sIdx) => {
                      const contract = viewingMember.contracts?.[sIdx];
                      return contract ? (
                        <div key={spec} className="flex justify-between px-2 text-[11px] border-b border-stone-800/20 py-0.5">
                          <span className="text-stone-400 font-sans">{spec}:</span>
                          <span className="text-[#E8DCCF] font-bold">{contract}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-[#2C1B15] rounded-xl p-4 border border-[#9E7649]/20">
              <h3 className="text-sm font-bold text-[#9E7649] mb-2 uppercase tracking-wider">Sobre {viewingMember.name.split(' ')[0]}</h3>
              <p className="text-[#E8DCCF] text-sm leading-relaxed whitespace-pre-wrap">
                {viewingMember.info || "No hay información adicional disponible."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editing Modal - Unified Team & User */}
      {editingMember && isAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setEditingMember(null)}>
          <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl p-6 max-w-lg w-full relative my-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Gestión de Personal: {editingMember.name}</h2>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Section: Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#9E7649] uppercase tracking-widest border-b border-[#9E7649]/20 pb-1">Información de Producción</h3>
                
                {editingMember.id === 'admin_app_static' && (
                  <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mb-4">
                    <label className="block text-xs font-bold text-amber-500 mb-1 uppercase tracking-wider">Vincular con Usuario Físico (Firma Digital)</label>
                    <p className="text-[10px] text-amber-200/70 mb-2">Seleccione con qué miembro del equipo compartirán los datos para la criptografía de la firma del administrador.</p>
                    <select
                      className="w-full bg-[#1A100C] border border-amber-500/30 rounded-lg p-2 text-white text-sm focus:outline-none"
                      value={editingMember.designatedUserId || ''}
                      onChange={e => {
                        setAdminPwdPrompt({ visible: true, targetUserId: e.target.value, pwdInput: '', error: '' });
                      }}
                    >
                      <option value="">-- No vinculado --</option>
                      {team.filter(m => m.id !== 'admin_app_static').map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.specialty})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-[#9E7649] mb-1 uppercase">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={editingMember.name}
                    readOnly={editingMember.id === 'admin_app_static'}
                    onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                    className={`w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#9E7649] ${editingMember.id === 'admin_app_static' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-xs text-[#9E7649] font-bold uppercase tracking-widest border-b border-[#9E7649]/20 pb-1">Especialidades y Niveles (Máx. 3)</label>
                  <div className="space-y-3">
                    {(editingMember.id === 'admin_app_static' ? [0] : [0, 1, 2]).map((idx) => {
                      const specs = editingMember.id === 'admin_app_static' ? ['ADMINISTRACIÓN GLOBAL'] : (editingMember.specialty || '').split('/').map(s => s.trim());
                      const lvls = editingMember.id === 'admin_app_static' ? ['MÁXIMO'] : (editingMember.level || '').split('/').map(l => l.trim());
                      const cnts = (editingMember.contracts || []);
                      
                      return (
                        <div key={idx} className="bg-black/25 p-3 rounded-xl border border-[#9E7649]/10 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-[#9E7649]/60 mb-1 uppercase">Especialidad {idx + 1}</label>
                              <input 
                                list="roles-list"
                                type="text"
                                value={specs[idx] || ''}
                                readOnly={editingMember.id === 'admin_app_static'}
                                onChange={e => {
                                  const newSpecs = [specs[0] || '', specs[1] || '', specs[2] || ''];
                                  newSpecs[idx] = e.target.value;
                                  setEditingMember({
                                    ...editingMember, 
                                    specialty: newSpecs.join(' / ').replace(/( \/ )+$/, '').trim()
                                  });
                                }}
                                className={`w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-[#9E7649] ${editingMember.id === 'admin_app_static' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="Seleccione o escriba..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#9E7649]/60 mb-1 uppercase">Nivel {idx + 1}</label>
                              <input 
                                list="levels-list"
                                type="text"
                                value={lvls[idx] || ''}
                                readOnly={editingMember.id === 'admin_app_static'}
                                onChange={e => {
                                  const newLvls = [lvls[0] || '', lvls[1] || '', lvls[2] || ''];
                                  newLvls[idx] = e.target.value;
                                  setEditingMember({
                                    ...editingMember, 
                                    level: newLvls.join(' / ').replace(/( \/ )+$/, '').trim()
                                  });
                                }}
                                className={`w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-[#9E7649] ${editingMember.id === 'admin_app_static' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="Nivel..."
                              />
                            </div>
                          </div>
                          {editingMember.id !== 'admin_app_static' && (
                            <div>
                              <label className="block text-[10px] text-[#9E7649]/60 mb-1 uppercase">Fecha de Contrato {idx + 1}</label>
                              <input 
                                type="date"
                                value={cnts[idx] || ''}
                                onChange={e => {
                                  const newCnts = [cnts[0] || '', cnts[1] || '', cnts[2] || ''];
                                  newCnts[idx] = e.target.value;
                                  setEditingMember({
                                    ...editingMember,
                                    contracts: newCnts
                                  });
                                }}
                                className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#9E7649]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <datalist id="roles-list">
                    {ROLES.map(role => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                  <datalist id="levels-list">
                    <option value="Primer Nivel" />
                    <option value="Segundo Nivel" />
                    <option value="Tercer Nivel" />
                    <option value="Habilitado" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-[#9E7649] mb-1 uppercase">Biografía / Información</label>
                  <textarea 
                    value={editingMember.info || ''}
                    onChange={e => setEditingMember({...editingMember, info: e.target.value})}
                    className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#9E7649] h-24 resize-none"
                  />
                </div>
              </div>

              {/* Section: User Access */}
              {isGlobalAdmin && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-bold text-[#9E7649] uppercase tracking-widest border-b border-[#9E7649]/20 pb-1">Acceso de Usuario</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {editingMember.id !== 'admin_app_static' && (
                      <div>
                        <label className="block text-xs text-[#9E7649] mb-1 uppercase">Usuario</label>
                        <input 
                          type="text" 
                          value={editingMember.username || ''}
                          onChange={e => setEditingMember({...editingMember, username: e.target.value})}
                          className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-[#9E7649] mb-1 uppercase">Móvil</label>
                      <input 
                        type="text" 
                        value={editingMember.mobile || ''}
                        disabled={editingMember.id === 'admin_app_static'}
                        onChange={e => setEditingMember({...editingMember, mobile: e.target.value})}
                        className={`w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm ${editingMember.id === 'admin_app_static' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#9E7649] mb-1 uppercase">Email</label>
                      <input 
                        type="email" 
                        value={editingMember.email || ''}
                        disabled={editingMember.id === 'admin_app_static'}
                        onChange={e => setEditingMember({...editingMember, email: e.target.value})}
                        className={`w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm ${editingMember.id === 'admin_app_static' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                  </div>
                  {editingMember.id !== 'admin_app_static' && (
                    <>
                      <div>
                        <label className="block text-xs text-[#9E7649] mb-1 uppercase">Contraseña</label>
                        <input 
                          type="text" 
                          value={editingMember.password || ''}
                          onChange={e => setEditingMember({...editingMember, password: e.target.value})}
                          className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#9E7649] mb-1 uppercase">Rol Principal (Calificador)</label>
                        <select 
                          value={editingMember.role || ''}
                          onChange={e => setEditingMember({...editingMember, role: e.target.value})}
                          className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm focus:outline-none"
                        >
                          <option value="">Seleccionar Rol</option>
                          {['Usuario', 'Trabajador', 'Director', 'Coordinador de programación', 'Administrador'].map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* CONTROL DE DISPOSITIVOS AUTORIZADOS */}
                  <div className={`border border-[#9E7649]/30 bg-[#251510] rounded-xl p-4 space-y-4 ${editingMember.id === 'admin_app_static' ? 'opacity-90' : ''}`}>
                    <div className="flex items-center justify-between border-b border-[#9E7649]/20 pb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="text-[#9E7649]" size={18} />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Control de Dispositivos</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingMember.deviceLimitEnabled || false} 
                          onChange={(e) => setEditingMember({ ...editingMember, deviceLimitEnabled: e.target.checked })}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-[#3c251e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#9E7649]"></div>
                        <span className="ml-2 text-[10px] text-[#E8DCCF]/80 uppercase font-bold">
                          {editingMember.deviceLimitEnabled ? "Activado" : "Desactivado"}
                        </span>
                      </label>
                    </div>

                    <p className="text-[11px] text-[#E8DCCF]/65 leading-relaxed">
                      Si está activado, el usuario solo podrá iniciar sesión desde los dispositivos agregados y validados a continuación.
                      {editingMember.id === 'admin_app_static' && " (Adquirido del usuario vinculado)"}
                    </p>

                    {editingMember.deviceLimitEnabled && (
                      <div className="space-y-4">
                        {/* List of registered devices */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider">Dispositivos Autorizados</p>
                          {(!editingMember.authorizedDevices || editingMember.authorizedDevices.length === 0) ? (
                            <div className="bg-[#1C0F0A] rounded-lg p-4 text-center border border-[#9E7649]/10">
                              <p className="text-xs text-[#E8DCCF]/40 italic">No hay dispositivos registrados. El usuario no podrá iniciar sesión.</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {editingMember.authorizedDevices.map((dev: any, i: number) => (
                                <div key={i} className="flex items-center justify-between bg-[#1C0F0A] border border-[#9E7649]/20 p-2.5 rounded-lg">
                                  <div className="flex items-center gap-2.5">
                                    {dev.type === 'Móvil' ? (
                                      <Smartphone className="text-[#9E7649]" size={16} />
                                    ) : (
                                      <Monitor className="text-[#9E7649]" size={16} />
                                    )}
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs text-white font-bold">{dev.name}</p>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-[#401F12] text-[#E8DCCF]/90 rounded uppercase font-semibold">
                                          {dev.type}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-[#E8DCCF]/50 font-mono">Código: {dev.token}</p>
                                    </div>
                                  </div>
                                  {editingMember.id !== 'admin_app_static' && (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const updatedDevs = (editingMember.authorizedDevices || []).filter((_: any, idx: number) => idx !== i);
                                        setEditingMember({ ...editingMember, authorizedDevices: updatedDevs });
                                      }}
                                      className="p-1 px-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/30 rounded border border-red-500/20 text-[10px] font-bold transition-all uppercase"
                                    >
                                      Remover
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Device Form */}
                        {editingMember.id !== 'admin_app_static' && (
                          <div className="bg-[#1C0F0A] rounded-lg p-3 border border-[#9E7649]/20 space-y-3">
                            <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider">Autorizar Nuevo Dispositivo</p>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] text-[#9E7649] uppercase font-bold mb-1">Código de Dispositivo</label>
                                <input 
                                  type="text"
                                  value={newDeviceToken}
                                  onChange={(e) => {
                                    let val = e.target.value.toUpperCase();
                                    if (val.startsWith('DVC') && val.length > 3 && val[3] !== '-') {
                                      val = val.slice(0, 3) + '-' + val.slice(3);
                                    }
                                    if (val.length <= 8) {
                                      setNewDeviceToken(val);
                                    }
                                  }}
                                  placeholder="Ej: DVC-A7K"
                                  className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded p-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-[#9E7649]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[#9E7649] uppercase font-bold mb-1">Nombre / Identificación</label>
                                <input 
                                  type="text"
                                  value={newDeviceName}
                                  onChange={(e) => setNewDeviceName(e.target.value)}
                                  placeholder="Ej: Laptop Oficina"
                                  className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded p-2 text-xs text-white focus:outline-none focus:border-[#9E7649]"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2.5 pt-1">
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] text-[#9E7649] uppercase font-bold">Tipo:</span>
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1 cursor-pointer text-[10px] text-[#E8DCCF]">
                                    <input 
                                      type="radio" 
                                      checked={newDeviceType === 'PC'} 
                                      onChange={() => setNewDeviceType('PC')}
                                      className="accent-[#9E7649]"
                                    />
                                    <span>PC / Laptop</span>
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer text-[10px] text-[#E8DCCF]">
                                    <input 
                                      type="radio" 
                                      checked={newDeviceType === 'Móvil'} 
                                      onChange={() => setNewDeviceType('Móvil')}
                                      className="accent-[#9E7649]"
                                    />
                                    <span>Móvil / Tablet</span>
                                  </label>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const trimmedToken = newDeviceToken.trim().toUpperCase();
                                  const trimmedName = newDeviceName.trim();
                                  
                                  if (!trimmedToken || !trimmedName) {
                                    showAlert('Por favor, ingresa el código y nombre del dispositivo.', 'error');
                                    return;
                                  }

                                  if (editingMember.authorizedDevices?.some((d: any) => d.token.toUpperCase() === trimmedToken)) {
                                    showAlert('Este código de dispositivo ya está registrado.', 'error');
                                    return;
                                  }

                                  const newDevice = {
                                    token: trimmedToken,
                                    name: trimmedName,
                                    type: newDeviceType,
                                    addedAt: new Date().toLocaleDateString('es-ES')
                                  };

                                  const updatedDevices = [...(editingMember.authorizedDevices || []), newDevice];
                                  setEditingMember({ ...editingMember, authorizedDevices: updatedDevices });
                                  
                                  // Reset inputs
                                  setNewDeviceToken('');
                                  setNewDeviceName('');
                                }}
                                className="px-3 py-1.5 bg-[#9E7649] hover:bg-[#85603A] text-white font-bold text-[10px] rounded uppercase tracking-wider flex items-center gap-1.5 transition-all"
                              >
                                <Plus size={12} />
                                Registrar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {['Coordinador', 'Coordinador de programación'].includes(editingMember.role) && (
                    <div>
                      <label className="block text-xs text-orange-400 mb-2 uppercase font-bold">Permisos de Coordinador (Secciones autorizadas)</label>
                      <div className="grid grid-cols-2 gap-2 bg-black/20 p-3 rounded-lg border border-orange-500/20">
                        {['Agenda', 'Música', 'Gestión', 'Guiones', 'Programación', 'Noticias'].map(sec => {
                           const currentSections = editingMember.coordinatorSections || [];
                           return (
                             <label key={sec} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-black/20 rounded">
                               <input 
                                 type="checkbox"
                                 checked={currentSections.includes(sec)}
                                 onChange={(e) => {
                                   if(e.target.checked) {
                                     setEditingMember({...editingMember, coordinatorSections: [...currentSections, sec]});
                                   } else {
                                     setEditingMember({...editingMember, coordinatorSections: currentSections.filter((s: string) => s !== sec)});
                                   }
                                 }}
                                 className="accent-orange-500 w-4 h-4"
                               />
                               <span className="text-white text-sm">{sec}</span>
                             </label>
                           );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section: Programs */}
              {editingMember.id !== 'admin_app_static' && (
              <div>
                <label className="block text-xs text-[#9E7649] mb-1 font-bold uppercase tracking-wider">Programas Habituales</label>
                <div className="space-y-4">
                  {(editingMember.specialty || '').split(' / ').map(role => {
                    const roleName = role.trim();
                    if (!roleName) return null;
                    const roleHabitual = editingMember.habitualProgramsByRole?.[roleName] || [];
                    
                    return (
                      <div key={roleName} className="bg-black/20 border border-[#9E7649]/20 rounded-xl p-3">
                        <h4 className="text-[10px] font-bold text-[#9E7649] mb-2 uppercase">{roleName}</h4>
                        <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                          {catalogo.length > 0 ? (
                            catalogo.map(prog => {
                              const isHabitual = roleHabitual.includes(prog.name);
                              const isGuionista = roleName.toLowerCase().includes('guionista');
                              const progDays = isGuionista && isHabitual ? getProgramDays(prog.name) : [];
                              const selectedDays = editingMember.habitualProgramsDays?.[roleName]?.[prog.name] || [];

                              return (
                                <div key={prog.name} className="flex flex-col border-b border-[#9E7649]/10 last:border-0 py-2">
                                  <label className="flex items-center gap-2 cursor-pointer transition-colors">
                                    <input 
                                      type="checkbox" 
                                      checked={isHabitual}
                                      onChange={e => {
                                        const currentByRole = editingMember.habitualProgramsByRole || {};
                                        const currentRoleProgs = currentByRole[roleName] || [];
                                        const updatedRoleProgs = e.target.checked 
                                          ? [...currentRoleProgs, prog.name]
                                          : currentRoleProgs.filter(p => p !== prog.name);
                                        
                                        // If deselected, also clear days
                                        const currentDaysByRole = editingMember.habitualProgramsDays || {};
                                        const currentRoleDaysMap = currentDaysByRole[roleName] || {};
                                        const updatedRoleDaysMap = { ...currentRoleDaysMap };
                                        if (!e.target.checked) {
                                          delete updatedRoleDaysMap[prog.name];
                                        } else if (isGuionista) {
                                          // Default: all program days if it's a guionista
                                          updatedRoleDaysMap[prog.name] = getProgramDays(prog.name);
                                        }

                                        setEditingMember({
                                          ...editingMember, 
                                          habitualProgramsByRole: {
                                            ...currentByRole,
                                            [roleName]: updatedRoleProgs
                                          },
                                          habitualProgramsDays: {
                                            ...currentDaysByRole,
                                            [roleName]: updatedRoleDaysMap
                                          }
                                        });
                                      }}
                                      className="accent-[#9E7649] w-4 h-4"
                                    />
                                    <span className="text-xs text-white/90">{prog.name}</span>
                                  </label>

                                  {isGuionista && isHabitual && progDays.length > 0 && (
                                    <div className="ml-6 mt-2 flex flex-wrap gap-2">
                                      {progDays.map(day => (
                                        <label key={day} className="flex items-center gap-1 cursor-pointer">
                                          <input 
                                            type="checkbox"
                                            checked={selectedDays.includes(day)}
                                            onChange={e => {
                                              const currentDaysByRole = editingMember.habitualProgramsDays || {};
                                              const currentRoleDaysMap = currentDaysByRole[roleName] || {};
                                              const currentProgDays = currentRoleDaysMap[prog.name] || [];
                                              
                                              const updatedProgDays = e.target.checked
                                                ? [...currentProgDays, day]
                                                : currentProgDays.filter(d => d !== day);
                                              
                                              setEditingMember({
                                                ...editingMember,
                                                habitualProgramsDays: {
                                                  ...currentDaysByRole,
                                                  [roleName]: {
                                                    ...currentRoleDaysMap,
                                                    [prog.name]: updatedProgDays
                                                  }
                                                }
                                              });
                                            }}
                                            className="accent-[#9E7649] w-3 h-3"
                                          />
                                          <span className="text-[9px] text-[#9E7649] tracking-tighter uppercase">{day.slice(0, 3)}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px] text-[#E8DCCF]/40 p-2 italic">No hay programas en el catálogo</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Section: Tools */}
              {editingMember.id !== 'admin_app_static' && (
              <div>
                <label className="block text-xs text-amber-500 mb-2 uppercase font-bold tracking-wider">Herramientas Autorizadas</label>
                <div className="grid grid-cols-2 gap-2 bg-black/20 p-3 rounded-lg border border-amber-500/20">
                  {[
                    { id: 'guiones-management', label: 'Gestión de Guiones' },
                    { id: 'script-format', label: 'Formato de Guion' },
                    { id: 'data-extraction', label: 'Extracción de Datos' },
                    { id: 'inst-docs', label: 'Documentos Institucionales' },
                    { id: 'inst-comm', label: 'Comunicación Institucional' },
                    { id: 'maintenance', label: 'Mantenimiento' },
                    { id: 'secretary', label: 'Secretaría' },
                    { id: 'reception', label: 'Recepción' },
                    { id: 'digital-signature', label: 'Firma Digital' }
                  ].map(tool => {
                     const currentTools = editingMember.tools || [];
                     return (
                       <label key={tool.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-black/20 rounded">
                         <input 
                           type="checkbox"
                           checked={currentTools.includes(tool.id)}
                           onChange={(e) => {
                             if(e.target.checked) {
                               setEditingMember({...editingMember, tools: [...currentTools, tool.id]});
                             } else {
                               setEditingMember({...editingMember, tools: currentTools.filter((t: string) => t !== tool.id)});
                             }
                           }}
                           className="accent-amber-500 w-4 h-4"
                         />
                         <span className="text-white text-xs">{tool.label}</span>
                       </label>
                     );
                  })}
                </div>
              </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setEditingMember(null)}
                className="flex-1 py-3 rounded-lg font-bold text-[#9E7649] bg-black/20 border border-[#9E7649]/30 hover:bg-[#9E7649]/10 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  try {
                    const cleanTeam = team.filter(Boolean);
                    const cleanUsers = users.filter(Boolean);

                    // Find original member and their existing normalized specialties to allow keeping them
                    const originalMember = cleanTeam.find(m => m.id === editingMember.id);
                    const originalSpecs = originalMember 
                      ? (originalMember.specialty || '').split('/').map(s => normalizeRole(s))
                      : [];

                    // Enforce unique member restriction for designated specialties
                    const specs = cleanJoined(editingMember.specialty || '').split('/').map(s => s.trim());
                    for (const spec of specs) {
                      const normSpec = normalizeRole(spec);
                      if (normSpec === 'director de emisora' || normSpec === 'jefe de programación' || normSpec === 'coordinador de programación') {
                        // If they didn't have this specialty originally, check for conflict
                        if (!originalSpecs.includes(normSpec)) {
                          // Check if another member already has this specialty
                          const conflictingMember = cleanTeam.find(m => 
                            m.id !== editingMember.id && 
                            m.specialty && (m.specialty || '').split('/').some(s => normalizeRole(s) === normSpec)
                          );
                          if (conflictingMember) {
                            showAlert(`¡Especialidad de Titular Único!\n\nLa especialidad de "${spec}" ya está asignada a "${conflictingMember.name}". Solo un miembro del equipo puede tener esta especialidad.`, 'error');
                            return; // Halt save operation
                          }
                        }
                      }
                    }

                    const isStaticAdmin = editingMember.id === 'admin_app_static';
                    const adminLinkedUser = isStaticAdmin ? cleanUsers.find(u => u.id === editingMember.designatedUserId) : null;

                    // 1. Update Team Member
                    const updatedTeam = cleanTeam.map(m => m.id === editingMember.id ? {
                      id: editingMember.id,
                      name: editingMember.name,
                      specialty: isStaticAdmin ? 'Soporte, Redacción y Criptografía' : cleanJoined(editingMember.specialty || ''),
                      level: isStaticAdmin ? 'Administración Global' : cleanJoined(editingMember.level || ''),
                      info: isStaticAdmin ? '' : (editingMember.info || ''),
                      email: isStaticAdmin ? (adminLinkedUser?.email || '') : (editingMember.email || ''),
                      mobile: isStaticAdmin ? (adminLinkedUser?.mobile || '') : (editingMember.mobile || ''),
                      photoUrl: editingMember.photoUrl || '',
                      habitualProgramsByRole: editingMember.habitualProgramsByRole || {},
                      habitualProgramsDays: editingMember.habitualProgramsDays || {},
                      contracts: editingMember.contracts || [],
                      designatedUserId: editingMember.designatedUserId
                    } : m);
                    saveTeam(updatedTeam);

                    // 2. Update User
                    const mappedUserId = editingMember.id === 'admin_app_static' ? 'admin' : editingMember.id;

                    let updatedUsers = cleanUsers.map(u => u.id === mappedUserId ? {
                      ...u,
                      name: editingMember.name,
                      username: mappedUserId === 'admin' ? 'admincmnl' : (editingMember.username || u.username),
                      mobile: mappedUserId === 'admin' && adminLinkedUser ? adminLinkedUser.mobile : (editingMember.mobile || u.mobile || ''),
                      email: mappedUserId === 'admin' && adminLinkedUser ? adminLinkedUser.email : (editingMember.email || u.email || ''),
                      password: mappedUserId === 'admin' ? 'RCBay010206' : (editingMember.password || u.password),
                      classification: editingMember.role === 'Coordinador de programación' ? 'Coordinador' : (editingMember.role || u.classification || 'Usuario'),
                      specialty: cleanJoined(editingMember.specialty || ''),
                      contracts: editingMember.contracts || [],
                      role: editingMember.role === 'Administrador' ? 'admin' : (['Coordinador', 'Coordinador de programación'].includes(editingMember.role) ? 'coordinator' : 'worker'),
                      coordinatorSections: ['Coordinador', 'Coordinador de programación'].includes(editingMember.role) ? editingMember.coordinatorSections : undefined,
                      tools: editingMember.tools || [],
                      habitualProgramsByRole: editingMember.habitualProgramsByRole || {},
                      habitualProgramsDays: editingMember.habitualProgramsDays || {},
                      deviceLimitEnabled: editingMember.deviceLimitEnabled,
                      authorizedDevices: mappedUserId === 'admin' && adminLinkedUser ? adminLinkedUser.authorizedDevices : (editingMember.authorizedDevices || [])
                    } : u);
                    
                    // If user doesn't exist, create it
                    if (!cleanUsers.some(u => u.id === mappedUserId)) {
                      updatedUsers.push({
                        id: mappedUserId,
                        name: editingMember.name,
                        username: mappedUserId === 'admin' ? 'admincmnl' : (editingMember.username || mappedUserId),
                        mobile: mappedUserId === 'admin' && adminLinkedUser ? adminLinkedUser.mobile : '',
                        email: mappedUserId === 'admin' && adminLinkedUser ? adminLinkedUser.email : '',
                        password: mappedUserId === 'admin' ? 'RCBay010206' : (editingMember.password || '1234'),
                        classification: editingMember.role === 'Coordinador de programación' ? 'Coordinador' : (editingMember.role || 'Usuario'),
                        specialty: cleanJoined(editingMember.specialty || ''),
                        contracts: editingMember.contracts || [],
                        role: editingMember.role === 'Administrador' ? 'admin' : (['Coordinador', 'Coordinador de programación'].includes(editingMember.role) ? 'coordinator' : 'worker'),
                        coordinatorSections: ['Coordinador', 'Coordinador de programación'].includes(editingMember.role) ? editingMember.coordinatorSections : undefined,
                        tools: editingMember.tools || [],
                        habitualProgramsByRole: editingMember.habitualProgramsByRole || {},
                        habitualProgramsDays: editingMember.habitualProgramsDays || {},
                        deviceLimitEnabled: editingMember.deviceLimitEnabled,
                        authorizedDevices: mappedUserId === 'admin' && adminLinkedUser ? adminLinkedUser.authorizedDevices : (editingMember.authorizedDevices || [])
                      });
                    }

                    // Grant Administrator rights to the linked physical user, keeping their own specialties, username, password, email, and mobile intact.
                    if (editingMember.id === 'admin_app_static' && editingMember.designatedUserId) {
                      updatedUsers = updatedUsers.map(u => 
                        u.id === editingMember.designatedUserId ? {
                          ...u,
                          role: 'admin',
                          classification: 'Administrador',
                        } : u
                      );
                    }
                    
                    setUsers(updatedUsers);
                    localStorage.setItem('rcm_users', JSON.stringify(updatedUsers));
                    
                    setEditingMember(null);
                  } catch (error: any) {
                    console.error("Error saving member:", error);
                    showAlert("Error fatal al guardar los cambios: " + (error?.message || error), 'error');
                  }
                }}
                className="flex-1 py-3 rounded-lg font-bold text-white bg-[#9E7649] hover:bg-[#8B653D] transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {customConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCustomConfirm(null)}>
          <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-red-500/30 text-center space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center text-red-500">
              <AlertTriangle className="text-4xl animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">¿Confirmar Acción?</h3>
            <p className="text-xs text-[#E8DCCF]/70 leading-relaxed font-sans px-2">
              {customConfirm.message}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCustomConfirm(null)}
                className="flex-1 py-3 bg-black/20 text-[#E8DCCF] border border-[#9E7649]/30 font-bold rounded-xl hover:bg-[#9E7649]/10 transition-all text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all text-xs uppercase"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCustomAlert(null)}>
          <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30 text-center space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className={`flex justify-center ${customAlert.type === 'error' ? 'text-red-500' : 'text-[#9E7649]'}`}>
              {customAlert.type === 'error' ? <AlertTriangle className="text-4xl" /> : <div className="text-4xl">ℹ️</div>}
            </div>
            <p className="text-sm font-bold text-white text-center leading-relaxed">
              {customAlert.message}
            </p>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-3 bg-[#9E7649] text-white font-bold rounded-xl hover:bg-[#8B653D] transition-all text-xs uppercase mt-4"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Admin Password Prompt for linking user */}
      {adminPwdPrompt?.visible && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 font-sans">
          <div className="bg-[#1A100C] border border-amber-500/30 rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex flex-col mb-4 items-center">
              <Shield className="text-amber-500 w-8 h-8 mb-2" />
              <h3 className="text-white font-bold text-center">Autorización Requerida</h3>
            </div>
            
            <input 
              type="password"
              placeholder="Clave cifrada"
              value={adminPwdPrompt.pwdInput}
              onChange={e => setAdminPwdPrompt(prev => prev ? {...prev, pwdInput: e.target.value, error: ''} : null)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-amber-500 outline-none mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const isValid = adminPwdPrompt.pwdInput === 'RCBay010206';

                  if (isValid) {
                    const newUserId = adminPwdPrompt.targetUserId;
                    const linkedMember = team.find(m => m.id === newUserId);
                    const linkedUser = users.find(u => u.id === newUserId);
                    
                    if (editingMember) {
                      setEditingMember({
                        ...editingMember, 
                        designatedUserId: newUserId,
                        name: newUserId && linkedMember ? linkedMember.name : STATIC_ADMIN_MEMBER.name,
                        mobile: linkedUser?.mobile || '',
                        email: linkedUser?.email || '',
                        authorizedDevices: linkedUser?.authorizedDevices || []
                      });
                    }
                    setAdminPwdPrompt(null);
                  } else {
                    setAdminPwdPrompt(prev => prev ? {...prev, error: 'Credenciales inválidas.'} : null);
                  }
                }
              }}
            />
            {adminPwdPrompt.error && <p className="text-red-500 text-xs text-center mb-4">{adminPwdPrompt.error}</p>}
            
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                  const isValid = adminPwdPrompt.pwdInput === 'RCBay010206';

                  if (isValid) {
                    const newUserId = adminPwdPrompt.targetUserId;
                    const linkedMember = team.find(m => m.id === newUserId);
                    const linkedUser = users.find(u => u.id === newUserId);
                    
                    if (editingMember) {
                      setEditingMember({
                        ...editingMember, 
                        designatedUserId: newUserId,
                        name: newUserId && linkedMember ? linkedMember.name : STATIC_ADMIN_MEMBER.name,
                        mobile: linkedUser?.mobile || '',
                        email: linkedUser?.email || '',
                        authorizedDevices: linkedUser?.authorizedDevices || []
                      });
                    }
                    setAdminPwdPrompt(null);
                  } else {
                    setAdminPwdPrompt(prev => prev ? {...prev, error: 'Credenciales inválidas.'} : null);
                  }
                }}
                className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500"
              >
                Confirmar
              </button>
              <button 
                onClick={() => setAdminPwdPrompt(null)}
                className="flex-1 py-2 rounded-lg font-bold text-[#9E7649] bg-black/20 border border-[#9E7649]/30 hover:bg-[#9E7649]/10"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipoSection;
