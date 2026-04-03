import React, { useState, useEffect } from 'react';
import { Users, Upload, Download, RefreshCw, Edit2, Camera, Trash2, Share2 } from 'lucide-react';
import CMNLHeader from '../CMNLHeader';
import ContentManagementSection from './ContentManagementSection';
import { User, UserClassification } from '../../types';

interface TeamMember {
  id: string;
  name: string;
  specialty: string;
  level: string;
  photoUrl?: string;
  info?: string;
  habitualPrograms?: string[];
  habitualProgramsByRole?: Record<string, string[]>;
}

interface EquipoSectionProps {
  currentUser: any;
  onBack: () => void;
  onMenuClick: () => void;
  catalogo: any[];
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

const EquipoSection: React.FC<EquipoSectionProps> = ({ currentUser, onBack, onMenuClick, catalogo, onDirtyChange, onTeamUpdate, users, setUsers, historyContent, setHistoryContent, aboutContent, setAboutContent, news, setNews, setImpersonatedUser }) => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador' || currentUser?.classification === 'Coordinador';
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);

  const ROLES = [
    'director', 'asesor', 'realizador', 'locutor', 'guionista', 'periodista', 
    'coordinador', 'director de emisora', 'jefe de programación', 'especialista', 
    'auxiliar general', 'asistente de dirección', 'recepcionista'
  ];

  useEffect(() => {
    const saved = localStorage.getItem('rcm_equipo_cmnl');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTeam(parsed);
        }
      } catch (e) {
        console.error("Error parsing team data", e);
      }
    }
  }, []);

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
            const newUser: User = {
              id,
              username,
              name,
              mobile,
              password,
              role: (role.toLowerCase().includes('director') || role.toLowerCase().includes('coordinador')) ? 'admin' : 'worker',
              classification: (role || (userIdx >= 0 ? updatedUsers[userIdx].classification : 'Usuario')) as UserClassification
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
      alert(`Se procesaron ${processedCount} registros de equipo y usuarios.`);
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
      alert(`Se actualizaron ${processedCount} biografías.`);
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

  const getPriority = (specialtyStr: string) => {
    const roles = specialtyStr.split(' / ').map(s => s.trim().toLowerCase());
    let minPriority = 99;

    for (const role of roles) {
      if (role.includes('directora de la emisora') || role.includes('director de la emisora')) minPriority = Math.min(minPriority, 1);
      else if (role.includes('jefa de programación') || role.includes('jefe de programación')) minPriority = Math.min(minPriority, 2);
      else if (role.includes('coordinadora') || role.includes('coordinador')) minPriority = Math.min(minPriority, 3);
      else if (role.includes('directora') || role.includes('director')) minPriority = Math.min(minPriority, 4);
      else if (role.includes('asesora') || role.includes('asesor')) minPriority = Math.min(minPriority, 5);
      else if (role.includes('locutora') || role.includes('locutor')) minPriority = Math.min(minPriority, 6);
      else if (role.includes('realizadora de sonido') || role.includes('realizador de sonido')) minPriority = Math.min(minPriority, 7);
      else if (role.includes('periodista')) minPriority = Math.min(minPriority, 8);
      else if (role.includes('comunicadora') || role.includes('comunicador')) minPriority = Math.min(minPriority, 9);
      else if (role.includes('especialista')) minPriority = Math.min(minPriority, 10);
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
            </>
          )}
        </div>
      </CMNLHeader>

      {/* Removed Tabs as per requirements */}

      <div className="p-6 overflow-y-auto pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {sortedTeam.map(member => {
              const isSelf = currentUser?.name && member.name && currentUser.name.toLowerCase() === member.name.toLowerCase();
              const canEditPhoto = isAdmin || isSelf;

              let displayLevel = member.level;
              if (displayLevel === 'No especificado') {
                displayLevel = '';
              } else if (displayLevel) {
                const parts = displayLevel.split(' / ');
                displayLevel = Array.from(new Set(parts)).join(' / ');
              }

              return (
                <div 
                  key={member.id} 
                  className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden flex flex-col items-center p-6 pt-14 shadow-lg relative group cursor-pointer hover:border-[#9E7649]/50 transition-colors"
                  onClick={() => setViewingMember(member)}
                >
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const user = users.find(u => u.id === member.id);
                          if (user) {
                            const message = `Hola ${member.name}, aquí tienes tus credenciales para CMNL App:\n\nUsuario: ${user.username}\nMóvil: ${user.mobile}\nContraseña: ${user.password}\nPIN: 0326\n\nAccede aquí: https://cmnl-app.vercel.app/`;
                            window.open(`https://wa.me/${user.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                          } else {
                            alert('No se encontró información de usuario para este miembro.');
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg transition-all shadow-lg border border-[#25D366]/30"
                        title="Compartir vía WhatsApp"
                      >
                        <Share2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          // Find corresponding user
                          const user = users.find(u => u.id === member.id);
                          setEditingMember({
                            ...member,
                            username: user?.username || '',
                            mobile: user?.mobile || '',
                            password: user?.password || '',
                            role: user?.classification || ''
                          }); 
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-[#9E7649] text-white rounded-lg transition-all shadow-lg border border-[#9E7649]/30"
                        title="Editar Información"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm(`¿Estás seguro de eliminar a ${member.name}?`)) {
                            const updatedTeam = team.filter(m => m.id !== member.id);
                            saveTeam(updatedTeam);
                            const updatedUsers = users.filter(u => u.id !== member.id);
                            setUsers(updatedUsers);
                            localStorage.setItem('rcm_users', JSON.stringify(updatedUsers));
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-lg border border-red-700/30"
                        title="Eliminar Miembro"
                      >
                        <Trash2 size={16} />
                      </button>
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
                <div>
                  <label className="block text-xs text-[#9E7649] mb-1 uppercase">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={editingMember.name}
                    onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                    className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#9E7649]"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-xs text-[#9E7649] font-bold uppercase tracking-widest border-b border-[#9E7649]/20 pb-1">Especialidades y Niveles (Máx. 3)</label>
                  <div className="space-y-3">
                    {[0, 1, 2].map((idx) => {
                      const specs = (editingMember.specialty || '').split('/').map(s => s.trim());
                      const lvls = (editingMember.level || '').split('/').map(l => l.trim());
                      
                      return (
                        <div key={idx} className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-xl border border-[#9E7649]/10">
                          <div>
                            <label className="block text-[10px] text-[#9E7649]/60 mb-1 uppercase">Especialidad {idx + 1}</label>
                            <input 
                              list="roles-list"
                              type="text"
                              value={specs[idx] || ''}
                              onChange={e => {
                                const newSpecs = [specs[0] || '', specs[1] || '', specs[2] || ''];
                                newSpecs[idx] = e.target.value;
                                setEditingMember({
                                  ...editingMember, 
                                  specialty: newSpecs.join(' / ').replace(/( \/ )+$/, '').trim()
                                });
                              }}
                              className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-[#9E7649]"
                              placeholder="Seleccione o escriba..."
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#9E7649]/60 mb-1 uppercase">Nivel {idx + 1}</label>
                            <input 
                              list="levels-list"
                              type="text"
                              value={lvls[idx] || ''}
                              onChange={e => {
                                const newLvls = [lvls[0] || '', lvls[1] || '', lvls[2] || ''];
                                newLvls[idx] = e.target.value;
                                setEditingMember({
                                  ...editingMember, 
                                  level: newLvls.join(' / ').replace(/( \/ )+$/, '').trim()
                                });
                              }}
                              className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-[#9E7649]"
                              placeholder="Nivel..."
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <datalist id="roles-list">
                    {ROLES.map(role => (
                      <option key={role} value={role.charAt(0).toUpperCase() + role.slice(1)} />
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
              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-bold text-[#9E7649] uppercase tracking-widest border-b border-[#9E7649]/20 pb-1">Acceso de Usuario</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase">Usuario</label>
                    <input 
                      type="text" 
                      value={editingMember.username || ''}
                      onChange={e => setEditingMember({...editingMember, username: e.target.value})}
                      className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase">Móvil</label>
                    <input 
                      type="text" 
                      value={editingMember.mobile || ''}
                      onChange={e => setEditingMember({...editingMember, mobile: e.target.value})}
                      className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm"
                    />
                  </div>
                </div>
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
                    {['Usuario', 'Coordinador', 'Director'].map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section: Programs */}
              <div>
                <label className="block text-xs text-[#9E7649] mb-1 font-bold uppercase tracking-wider">Programas Habituales</label>
                <div className="space-y-4">
                  {editingMember.specialty.split(' / ').map(role => {
                    const roleName = role.trim();
                    if (!roleName) return null;
                    const roleHabitual = editingMember.habitualProgramsByRole?.[roleName] || [];
                    
                    return (
                      <div key={roleName} className="bg-black/20 border border-[#9E7649]/20 rounded-xl p-3">
                        <h4 className="text-[10px] font-bold text-[#9E7649] mb-2 uppercase">{roleName}</h4>
                        <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                          {catalogo.length > 0 ? (
                            catalogo.map(prog => (
                              <label key={prog.name} className="flex items-center gap-2 p-1.5 hover:bg-[#9E7649]/10 rounded cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={roleHabitual.includes(prog.name)}
                                  onChange={e => {
                                    const currentByRole = editingMember.habitualProgramsByRole || {};
                                    const currentRoleProgs = currentByRole[roleName] || [];
                                    const updatedRoleProgs = e.target.checked 
                                      ? [...currentRoleProgs, prog.name]
                                      : currentRoleProgs.filter(p => p !== prog.name);
                                    
                                    setEditingMember({
                                      ...editingMember, 
                                      habitualProgramsByRole: {
                                        ...currentByRole,
                                        [roleName]: updatedRoleProgs
                                      }
                                    });
                                  }}
                                  className="accent-[#9E7649] w-4 h-4"
                                />
                                <span className="text-xs text-white/90">{prog.name}</span>
                              </label>
                            ))
                          ) : (
                            <p className="text-[10px] text-[#E8DCCF]/40 p-2 italic">No hay programas en el catálogo</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                  // Helper to clean joined strings
                  const cleanJoined = (str: string) => str.split('/').map(s => s.trim()).filter(s => s).join(' / ');

                  // 1. Update Team Member
                  const updatedTeam = team.map(m => m.id === editingMember.id ? {
                    id: editingMember.id,
                    name: editingMember.name,
                    specialty: cleanJoined(editingMember.specialty),
                    level: cleanJoined(editingMember.level),
                    info: editingMember.info,
                    photoUrl: editingMember.photoUrl,
                    habitualProgramsByRole: editingMember.habitualProgramsByRole
                  } : m);
                  saveTeam(updatedTeam);

                  // 2. Update User
                  let updatedUsers = users.map(u => u.id === editingMember.id ? {
                    ...u,
                    name: editingMember.name,
                    username: editingMember.username,
                    mobile: editingMember.mobile,
                    password: editingMember.password,
                    classification: editingMember.role || u.classification || 'Usuario',
                    role: (editingMember.role === 'Director' || editingMember.role === 'Coordinador' || u.role === 'admin') ? 'admin' : 'worker'
                  } : u);
                  
                  // If user doesn't exist, create it
                  if (!users.find(u => u.id === editingMember.id)) {
                    updatedUsers.push({
                      id: editingMember.id,
                      name: editingMember.name,
                      username: editingMember.username || editingMember.id,
                      mobile: editingMember.mobile || '',
                      password: editingMember.password || '1234',
                      classification: editingMember.role || 'Usuario',
                      role: (editingMember.role === 'Director' || editingMember.role === 'Coordinador') ? 'admin' : 'worker'
                    });
                  }
                  
                  setUsers(updatedUsers);
                  localStorage.setItem('rcm_users', JSON.stringify(updatedUsers));
                  
                  setEditingMember(null);
                }}
                className="flex-1 py-3 rounded-lg font-bold text-white bg-[#9E7649] hover:bg-[#8B653D] transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipoSection;
