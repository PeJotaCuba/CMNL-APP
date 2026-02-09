import React from 'react';
import { ArrowLeft, Construction, Radio, Calendar, Music, FileText, Podcast } from 'lucide-react';

interface ViewProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  type?: 'agenda' | 'music' | 'scripts' | 'schedule';
}

export const PlaceholderView: React.FC<ViewProps> = ({ title, subtitle, onBack }) => {
  const isProgramming = title.includes('Programación');

  return (
    <div className="flex flex-col h-full w-full bg-[#FDFCF8] text-[#4A3B32]">
      <div className="bg-[#5D3A24] text-white p-4 pt-8 flex items-center gap-4 shadow-md z-10 sticky top-0">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="font-serif font-bold text-lg leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-[#E8DCCF] opacity-80">{subtitle}</p>}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {isProgramming ? (
          <div className="max-w-2xl mx-auto">
             <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#5D3A24]/10">
               <div className="p-4 bg-[#F5F0EB] border-b border-[#5D3A24]/10">
                  <h3 className="font-bold text-[#5D3A24] uppercase tracking-wide text-sm">Parrilla Oficial</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-[#5D3A24] text-white">
                       <tr>
                          <th className="px-4 py-3 font-semibold">Programa</th>
                          <th className="px-4 py-3 font-semibold">Horario</th>
                          <th className="px-4 py-3 font-semibold">Día</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#5D3A24]/10">
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Buenos Días Bayamo</td><td className="px-4 py-3">7:00-8:58 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Lunes a Sábado</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">La Cumbancha</td><td className="px-4 py-3">9:00-9:58 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Lunes a Sábado</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Todos en Casa</td><td className="px-4 py-3">10:00-10:58 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Lunes a Viernes</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">RCM Noticias</td><td className="px-4 py-3">11:00-11:15 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Lunes a Sábado</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Arte Bayamo</td><td className="px-4 py-3">11:15-11:58 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Lunes a Viernes</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">Noticiero Provincial</td><td className="px-4 py-3">12:00-12:30 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70 text-red-600 font-bold">Diario</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Parada Joven</td><td className="px-4 py-3">12:30-12:58 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Lunes a Viernes</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">Noticiero Nacional</td><td className="px-4 py-3">1:00-1:30 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70 text-red-600 font-bold">Diario</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Hablando con Juana</td><td className="px-4 py-3">1:30-2:58 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Lunes a Viernes</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">Cadena Provincial</td><td className="px-4 py-3">3:00-7:00 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70 text-red-600 font-bold">Diario</td></tr>
                       <tr className="bg-[#e0f2f1] border-l-4 border-l-[#8B5E3C]"><td className="px-4 py-3 font-bold" colSpan={3}>Fin de Semana</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Sigue a tu ritmo</td><td className="px-4 py-3">11:15-12:58 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Sábado</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">Al son de la radio</td><td className="px-4 py-3">1:30-2:58 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Sábado</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Cómplices</td><td className="px-4 py-3">7:00-9:58 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Domingo</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">Coloreando melodías</td><td className="px-4 py-3">9:00-9:15 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Domingo</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Alba y Crisol</td><td className="px-4 py-3">9:15-9:30 AM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Domingo</td></tr>
                       <tr className="bg-[#F5F0EB]"><td className="px-4 py-3 font-medium">Estación 95.3</td><td className="px-4 py-3">10:00-12:58 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Domingo</td></tr>
                       <tr className="bg-[#FDFCF8]"><td className="px-4 py-3 font-medium">Palco de Domingo</td><td className="px-4 py-3">1:30-2:58 PM</td><td className="px-4 py-3 text-xs uppercase tracking-wide opacity-70">Domingo</td></tr>
                    </tbody>
                 </table>
               </div>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
             <Construction size={48} className="text-[#8B5E3C] mb-4" />
             <p className="text-center font-medium">Esta sección está en desarrollo.</p>
             <p className="text-center text-xs mt-2">Próximamente disponible en la v1.1</p>
          </div>
        )}
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
