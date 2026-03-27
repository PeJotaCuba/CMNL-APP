import React, { useState, useEffect } from 'react';
import { Users, X } from 'lucide-react';
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

const QuienesSomos: React.FC<QuienesSomosProps> = ({ onBack, onMenuClick }) => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

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
  }, []);

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
      />

      <div className="p-6 overflow-y-auto pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {sortedTeam.map(member => (
            <div 
              key={member.id} 
              className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden flex flex-col items-center p-6 shadow-lg cursor-pointer hover:border-[#9E7649]/50 transition-colors"
              onClick={() => setSelectedMember(member)}
            >
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

      {/* Member Info Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-[#E8DCCF]/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-[#9E7649]/30 overflow-hidden mb-4 bg-black/50 flex items-center justify-center">
                {selectedMember.photoUrl ? (
                  <img src={selectedMember.photoUrl} alt={selectedMember.name} className="w-full h-full object-cover" />
                ) : (
                  <Users size={48} className="text-[#9E7649]/50" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-white text-center leading-tight mb-1">{selectedMember.name}</h2>
              <p className="text-[#9E7649] font-medium text-center">{selectedMember.specialty}</p>
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 border border-white/5 max-h-60 overflow-y-auto">
              <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-2">Biografía</h3>
              <p className="text-sm text-[#E8DCCF]/90 whitespace-pre-wrap leading-relaxed">
                {selectedMember.info || 'No hay información biográfica disponible para este miembro.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuienesSomos;
