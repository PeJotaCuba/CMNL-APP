import React from 'react';
import { ArrowLeft, Construction, Radio, Calendar, Music, FileText, Podcast } from 'lucide-react';

interface ViewProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  type?: 'agenda' | 'music' | 'scripts' | 'schedule';
}

export const PlaceholderView: React.FC<ViewProps> = ({ title, subtitle, onBack }) => {
  return (
    <div className="flex flex-col h-full w-full bg-[#FDFCF8] text-[#4A3B32]">
      <div className="bg-[#5D3A24] text-white p-4 pt-8 flex items-center gap-4 shadow-md z-10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="font-serif font-bold text-lg leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-[#E8DCCF] opacity-80">{subtitle}</p>}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-50">
         <Construction size={48} className="text-[#8B5E3C] mb-4" />
         <p className="text-center font-medium">Esta sección está en desarrollo.</p>
         <p className="text-center text-xs mt-2">Próximamente disponible en la v1.1</p>
      </div>
    </div>
  );
};

export const CMNLAppView: React.FC<ViewProps> = ({ title, type, onBack }) => {
  const getIcon = () => {
    switch(type) {
      case 'agenda': return <Calendar size={48} />;
      case 'music': return <Music size={48} />;
      case 'scripts': return <FileText size={48} />;
      case 'schedule': return <Podcast size={48} />;
      default: return <Radio size={48} />;
    }
  };

  const getBgColor = () => {
    switch(type) {
      case 'agenda': return 'bg-[#2a1b12]'; // Dark Brown
      case 'music': return 'bg-[#1a237e]'; // Deep Blue
      case 'scripts': return 'bg-[#1b5e20]'; // Deep Green
      case 'schedule': return 'bg-[#b71c1c]'; // Deep Red
      default: return 'bg-[#2a1b12]';
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${getBgColor()} text-white`}>
      <div className="bg-black/20 backdrop-blur-md p-4 pt-12 flex items-center gap-4 border-b border-white/10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-xl tracking-wider uppercase">{title}</h2>
      </div>

      <div className="flex-1 flex flex-col p-6">
        <div className="w-full h-40 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
           {getIcon()}
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="h-12 w-full bg-white/5 rounded-lg animate-pulse"></div>
          <div className="h-24 w-full bg-white/5 rounded-lg animate-pulse"></div>
          <div className="h-12 w-full bg-white/5 rounded-lg animate-pulse"></div>
        </div>

        <div className="mt-auto text-center opacity-60 text-xs uppercase tracking-widest">
           Módulo de Gestión Interna
        </div>
      </div>
    </div>
  );
};
