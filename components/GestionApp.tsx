import React from 'react';
import { ArrowLeft, Radio, FileBarChart, Library, FileText, Users, CreditCard } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const GestionApp: React.FC<Props> = ({ onBack }) => {
  const menuItems = [
    { icon: <Radio size={32} />, label: 'Transmisión', color: 'bg-red-900/40 text-red-400 border-red-500/30' },
    { icon: <FileBarChart size={32} />, label: 'Reportes', color: 'bg-blue-900/40 text-blue-400 border-blue-500/30' },
    { icon: <Library size={32} />, label: 'Catálogo', color: 'bg-amber-900/40 text-amber-400 border-amber-500/30' },
    { icon: <FileText size={32} />, label: 'Fichas', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' },
    { icon: <Users size={32} />, label: 'Equipo', color: 'bg-purple-900/40 text-purple-400 border-purple-500/30' },
    { icon: <CreditCard size={32} />, label: 'Pagos', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-500/30' },
  ];

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      {/* Header */}
      <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-[#F5EFE6]" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">Gestión</h1>
          <p className="text-[10px] text-[#9E7649]">Sistema de Control Interno</p>
        </div>
      </div>

      {/* Grid Menu */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {menuItems.map((item, index) => (
            <button 
              key={index}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border ${item.color} hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg aspect-square`}
            >
              <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm">
                {item.icon}
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GestionApp;
