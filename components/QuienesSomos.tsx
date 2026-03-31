import React, { useState, useEffect } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import CMNLHeader from './CMNLHeader';

interface TeamMember {
  id: string;
  name: string;
  specialty: string;
  level: string;
  photoUrl?: string;
  info?: string;
}

interface QuienesSomosProps {
  onBack: () => void;
  onMenuClick: () => void;
}

const EQUIPO_URL = 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json';

const QuienesSomos: React.FC<QuienesSomosProps> = ({ onBack, onMenuClick }) => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Load existing data
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

    // Check if we need to prompt for update (every 24 hours)
    const lastUpdate = localStorage.getItem('rcm_equipo_last_update');
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (!lastUpdate || now - parseInt(lastUpdate) > TWENTY_FOUR_HOURS) {
      setShowUpdatePrompt(true);
    }
  }, []);

  const updateDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${EQUIPO_URL}?t=${new Date().getTime()}`);
      if (!response.ok) throw new Error("Error al descargar la base de datos");
      const data = await response.json();
      if (Array.isArray(data)) {
        setTeam(data);
        localStorage.setItem('rcm_equipo_cmnl', JSON.stringify(data));
        localStorage.setItem('rcm_equipo_last_update', Date.now().toString());
        setShowUpdatePrompt(false);
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
        user={null}
        sectionTitle="Quiénes Somos"
        onMenuClick={onMenuClick}
        onBack={onBack}
      >
        <button onClick={updateDatabase} disabled={loading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2" title="Actualizar Datos">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          <span className="text-sm font-medium">Actualizar</span>
        </button>
      </CMNLHeader>

      <div className="p-6 overflow-y-auto pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {sortedTeam.map(member => (
            <div key={member.id} className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden flex flex-col items-center p-6 shadow-lg">
              <div className="relative w-24 h-24 rounded-full bg-[#1A100C] border-2 border-[#9E7649]/50 mb-4 overflow-hidden flex items-center justify-center">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <Users size={40} className="text-[#9E7649]/50" />
                )}
              </div>
              
              <h3 className="text-lg font-bold text-white text-center leading-tight mb-1">{member.name}</h3>
              <p className="text-sm text-[#9E7649] text-center font-medium mb-1">{member.specialty}</p>
            </div>
          ))}
          
          {team.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
              <Users size={64} className="mb-4 text-[#9E7649]" />
              <p className="text-lg">No hay información del equipo disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Update Prompt Modal */}
      {showUpdatePrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl p-6 max-w-sm w-full relative text-center">
            <h2 className="text-xl font-bold text-white mb-2">Actualizar Equipo</h2>
            <p className="text-[#E8DCCF] mb-6 text-sm">
              Es recomendable actualizar la información del equipo para ver los últimos cambios.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowUpdatePrompt(false);
                  localStorage.setItem('rcm_equipo_last_update', Date.now().toString());
                }}
                className="flex-1 py-2 rounded-lg font-bold text-[#9E7649] bg-black/20 border border-[#9E7649]/30 hover:bg-[#9E7649]/10 transition-colors"
              >
                Más tarde
              </button>
              <button 
                onClick={updateDatabase}
                disabled={loading}
                className="flex-1 py-2 rounded-lg font-bold text-white bg-[#9E7649] hover:bg-[#8B653D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuienesSomos;
