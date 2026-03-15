import React, { useState, useEffect } from 'react';
import { Users, Upload, Download, RefreshCw, Edit2, Camera } from 'lucide-react';
import CMNLHeader from '../CMNLHeader';

interface TeamMember {
  id: string;
  name: string;
  specialty: string;
  level: string;
  photoUrl?: string;
}

interface EquipoSectionProps {
  currentUser: any;
  onBack: () => void;
  onMenuClick: () => void;
}

const EQUIPO_URL = 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json';

const EquipoSection: React.FC<EquipoSectionProps> = ({ currentUser, onBack, onMenuClick }) => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
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
          
          for (let i = 1; i < lines.length; i += 2) {
            if (lines[i]) specialties.push(lines[i]);
            if (lines[i+1]) levels.push(lines[i+1]);
          }
          
          const specialty = specialties.join(' / ');
          const uniqueLevels = Array.from(new Set(levels));
          const level = uniqueLevels.length > 0 ? uniqueLevels.join(' / ') : '';
          const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          newMembers.push({ id, name, specialty, level });
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

  const downloadDatabase = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(team, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "equipocmnl.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const updateDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch(EQUIPO_URL);
      if (!response.ok) throw new Error("Error al descargar la base de datos");
      const data = await response.json();
      if (Array.isArray(data)) {
        saveTeam(data);
        alert("Base de datos actualizada correctamente.");
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
            <label className="p-2 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-lg transition-colors shadow-sm cursor-pointer" title="Cargar TXT">
              <Upload size={20} />
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
          <button onClick={downloadDatabase} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm" title="Descargar BD">
            <Download size={20} />
          </button>
          <button onClick={updateDatabase} disabled={loading} className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50" title="Actualizar BD">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
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
              <div key={member.id} className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden flex flex-col items-center p-6 shadow-lg relative group">
                <div className="relative w-24 h-24 rounded-full bg-[#1A100C] border-2 border-[#9E7649]/50 mb-4 overflow-hidden flex items-center justify-center">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users size={40} className="text-[#9E7649]/50" />
                  )}
                  
                  {canEditPhoto && (
                    <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
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
    </div>
  );
};

export default EquipoSection;
