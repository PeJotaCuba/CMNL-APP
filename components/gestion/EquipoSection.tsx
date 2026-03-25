import React, { useState, useEffect } from 'react';
import { Users, Upload, Download, RefreshCw, Edit2, Camera } from 'lucide-react';
import CMNLHeader from '../CMNLHeader';

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
}

const EQUIPO_URL = 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json';

const EquipoSection: React.FC<EquipoSectionProps> = ({ currentUser, onBack, onMenuClick, catalogo, onDirtyChange, onTeamUpdate }) => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador' || currentUser?.classification === 'Coordinador';

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
      const blocks = text.split(/[-_]{10,}/); // Split by 10 or more underscores or hyphens
      const newMembers: TeamMember[] = [];

      blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length >= 2) {
          const name = lines[0];
          
          // Combine specialties and levels if there are multiple
          const specialties = [];
          const levels = [];
          const infoLines: string[] = [];
          
          for (let i = 1; i < lines.length; i += 2) {
            if (lines[i] && !lines[i].toLowerCase().includes('nivel') && lines[i].toLowerCase() !== 'habilitado' && lines[i].length > 50) {
              // If it's a long text, it's probably info
              infoLines.push(lines[i]);
              if (lines[i+1]) infoLines.push(lines[i+1]);
            } else {
              if (lines[i]) specialties.push(lines[i]);
              if (lines[i+1] && (lines[i+1].toLowerCase().includes('nivel') || lines[i+1].toLowerCase() === 'habilitado')) {
                levels.push(lines[i+1]);
              } else if (lines[i+1]) {
                // Not a level, might be info or another specialty
                infoLines.push(lines[i+1]);
                i--; // Adjust step since we didn't consume a level
              }
            }
          }
          
          const specialty = specialties.join(' / ');
          const uniqueLevels = Array.from(new Set(levels));
          const level = uniqueLevels.length > 0 ? uniqueLevels.join(' / ') : '';
          const info = infoLines.join('\n');
          const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          newMembers.push({ id, name, specialty, level, info });
        }
      });

      // Merge with existing
      const currentTeam = [...team];
      newMembers.forEach(newMember => {
        const existingIndex = currentTeam.findIndex(m => m.id === newMember.id || (m.name && newMember.name && m.name.toLowerCase() === newMember.name.toLowerCase()));
        if (existingIndex >= 0) {
          currentTeam[existingIndex] = { ...currentTeam[existingIndex], ...newMember, photoUrl: currentTeam[existingIndex].photoUrl };
        } else {
          currentTeam.push(newMember);
        }
      });

      saveTeam(currentTeam);
      alert(`Se procesaron ${newMembers.length} registros.`);
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

  const updateDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch(EQUIPO_URL);
      if (!response.ok) throw new Error("Error al descargar la base de datos");
      const data = await response.json();
      if (Array.isArray(data)) {
        // Merge with existing to preserve local edits (photos, habitual programs)
        const currentTeam = [...team];
        const updatedTeam = data.map(newMember => {
          const existing = currentTeam.find(m => m.id === newMember.id || (m.name && newMember.name && m.name.toLowerCase() === newMember.name.toLowerCase()));
          if (existing) {
            return {
              ...newMember,
              photoUrl: existing.photoUrl || newMember.photoUrl,
              habitualPrograms: existing.habitualPrograms || newMember.habitualPrograms,
              info: existing.info || newMember.info
            };
          }
          return newMember;
        });

        saveTeam(updatedTeam);
        alert("Base de datos actualizada correctamente (se han preservado las ediciones locales).");
      } else {
        alert("El formato del archivo descargado no es válido.");
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al actualizar la base de datos.");
    } finally {
      setLoading(false);
    }
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

  const handleDownloadEquipo = () => {
    const dataStr = JSON.stringify(team, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipo.json';
    a.click();
    URL.revokeObjectURL(url);
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
              <button onClick={handleDownloadEquipo} className="p-2 bg-[#2C1B15] hover:bg-[#3E1E16] text-[#9E7649] border border-[#9E7649]/30 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-2" title="Descargar equipo.json">
                <Download size={20} />
                <span className="hidden sm:inline text-sm font-medium">Descargar JSON</span>
              </button>
            </>
          )}
          <button onClick={updateDatabase} disabled={loading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2" title="Actualizar BD">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            <span className="text-sm font-medium">Actualizar</span>
          </button>
        </div>
      </CMNLHeader>

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
                className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden flex flex-col items-center p-6 shadow-lg relative group cursor-pointer hover:border-[#9E7649]/50 transition-colors"
                onClick={() => setViewingMember(member)}
              >
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingMember(member); }}
                    className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-[#9E7649] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Editar Información"
                  >
                    <Edit2 size={16} />
                  </button>
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

      {/* Editing Modal */}
      {editingMember && isAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setEditingMember(null)}>
          <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl p-6 max-w-md w-full relative my-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Editar Miembro</h2>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-sm text-[#9E7649] mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={editingMember.name}
                  onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                  className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#9E7649]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9E7649] mb-1">Especialidad</label>
                <input 
                  type="text" 
                  value={editingMember.specialty}
                  onChange={e => setEditingMember({...editingMember, specialty: e.target.value})}
                  className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#9E7649]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9E7649] mb-1">Nivel</label>
                <input 
                  type="text" 
                  value={editingMember.level}
                  onChange={e => setEditingMember({...editingMember, level: e.target.value})}
                  className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#9E7649]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9E7649] mb-1">Información Adicional</label>
                <textarea 
                  value={editingMember.info || ''}
                  onChange={e => setEditingMember({...editingMember, info: e.target.value})}
                  className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#9E7649] h-24 resize-none"
                  placeholder="Añade información sobre este miembro..."
                />
              </div>
              <div>
                <label className="block text-sm text-[#9E7649] mb-1 font-bold uppercase tracking-wider">Programas Habituales por Especialidad</label>
                <div className="space-y-4">
                  {editingMember.specialty.split(' / ').map(role => {
                    const roleName = role.trim();
                    const roleHabitual = editingMember.habitualProgramsByRole?.[roleName] || [];
                    
                    return (
                      <div key={roleName} className="bg-black/20 border border-[#9E7649]/20 rounded-xl p-3">
                        <h4 className="text-xs font-bold text-[#9E7649] mb-2 uppercase">{roleName}</h4>
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
                                <span className="text-sm text-white/90">{prog.name}</span>
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
                  const newTeam = team.map(m => m.id === editingMember.id ? editingMember : m);
                  saveTeam(newTeam);
                  setEditingMember(null);
                }}
                className="flex-1 py-3 rounded-lg font-bold text-white bg-[#9E7649] hover:bg-[#8B653D] transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipoSection;
