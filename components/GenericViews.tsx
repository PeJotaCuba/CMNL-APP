import React, { useState } from 'react';
import { ArrowLeft, Construction, Radio, Calendar, Music, FileText, Podcast, Clock, User, MessageCircle, X } from 'lucide-react';
import { NewsItem } from '../types';

interface ViewProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  type?: 'agenda' | 'music' | 'scripts' | 'schedule';
  customContent?: string;
  newsItem?: NewsItem | null;
}

export const PlaceholderView: React.FC<ViewProps> = ({ title, subtitle, onBack, customContent, newsItem }) => {
  const [showFabMenu, setShowFabMenu] = useState(false);
  const isProgramming = title.includes('Programación');
  // Logic to show FAB on specific public views (History, About, Programming)
  const showListenerFab = title.includes('Historia') || title.includes('Quiénes Somos') || title.includes('Programación');

  // Specific Layout for News Detail
  if (newsItem) {
      return (
        <div className="flex flex-col h-full w-full bg-[#1A100C] text-[#E8DCCF]">
             <div className="relative h-64 bg-cover bg-center" style={{backgroundImage: `url(${newsItem.image})`}}>
                 <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#1A100C]"></div>
                 <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/40 text-white rounded-full backdrop-blur-md z-10">
                    <ArrowLeft size={24} />
                 </button>
                 <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="bg-[#9E7649] text-white text-[10px] font-bold uppercase px-2 py-1 rounded mb-2 inline-block">{newsItem.category}</span>
                    <h1 className="text-2xl font-bold text-white leading-tight shadow-sm">{newsItem.title}</h1>
                 </div>
             </div>
             <div className="flex-1 p-6 overflow-y-auto">
                 <div className="flex items-center gap-4 text-xs text-[#9E7649] mb-6 border-b border-[#9E7649]/20 pb-4">
                     <span className="flex items-center gap-1"><User size={14}/> {newsItem.author}</span>
                     <span className="flex items-center gap-1"><Clock size={14}/> {newsItem.date}</span>
                 </div>
                 <div className="prose prose-invert prose-p:text-[#E8DCCF]/80 prose-headings:text-white max-w-none">
                     {newsItem.content.split('\n').map((paragraph, i) => (
                         <p key={i} className="mb-4 leading-relaxed">{paragraph}</p>
                     ))}
                 </div>
             </div>
        </div>
      );
  }

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
      
      <div className="flex-1 overflow-y-auto p-4 pb-24"> {/* Added pb-24 for player clearance */}
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
        ) : customContent ? (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-[#5D3A24]/10 whitespace-pre-wrap">
                {customContent}
            </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
             <Construction size={48} className="text-[#8B5E3C] mb-4" />
             <p className="text-center font-medium">Contenido no cargado.</p>
             <p className="text-center text-xs mt-2">Contacte al administrador para actualizar.</p>
          </div>
        )}
      </div>

      {/* Floating WhatsApp Menu for Listener Views */}
      {showListenerFab && (
          <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-3">
             {showFabMenu && (
                 <div className="flex flex-col gap-3 animate-fade-in-up">
                     <a 
                        href="https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white text-[#3E1E16] px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 hover:bg-[#E8DCCF] transition-colors"
                     >
                        Unirse a Comunidad CMNL
                     </a>
                     <a 
                        href="https://wa.me/5354413935"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white text-[#3E1E16] px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 hover:bg-[#E8DCCF] transition-colors"
                     >
                        Escribir a administradores
                     </a>
                 </div>
             )}
             <button 
                onClick={() => setShowFabMenu(!showFabMenu)}
                className="w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all"
             >
                {showFabMenu ? <X size={28} /> : <MessageCircle size={30} fill="white" />}
             </button>
             
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.2s ease-out forwards;
                }
             `}</style>
          </div>
      )}
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