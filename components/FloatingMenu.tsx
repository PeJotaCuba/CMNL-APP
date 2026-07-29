import React, { useState, useEffect, useRef } from 'react';
import { AppView, User } from '../types';
import { 
  MessageSquare, 
  Wrench, 
  X, 
  ChevronRight, 
  ExternalLink,
  Briefcase,
  FileText,
  Database,
  BookOpen,
  Megaphone,
  Settings,
  Bell,
  Shield,
  Calculator
} from 'lucide-react';

interface FloatingMenuProps {
  onNavigate: (view: AppView, data?: any) => void;
  currentUser: User | null;
}

const toolIcons: Record<string, React.ComponentType<any>> = {
  'guiones-management': Briefcase,
  'script-format': FileText,
  'data-extraction': Database,
  'inst-docs': BookOpen,
  'inst-comm': Megaphone,
  'maintenance': Settings,
  'secretary': Briefcase,
  'reception': Bell,
  'digital-signature': Shield,
  'diccionario': BookOpen,
  'salary-simulator': Calculator,
};

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ onNavigate, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v');
  const [floatingTools, setFloatingTools] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load configuration from local storage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('rcm_whatsapp_group_url');
    if (savedUrl) {
      setWhatsappGroupUrl(savedUrl);
    }
    
    const savedTools = localStorage.getItem('rcm_floating_tools');
    if (savedTools) {
      try {
        setFloatingTools(JSON.parse(savedTools));
      } catch (e) {
        console.error("Error parsing rcm_floating_tools from localStorage:", e);
      }
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!currentUser) return null;

  // Retrieve equipo data from localStorage to calculate user's tool access
  const savedEquipo = localStorage.getItem('rcm_equipo_cmnl');
  let equipoData: any[] = [];
  if (savedEquipo) {
    try {
      equipoData = JSON.parse(savedEquipo);
    } catch (e) {
      console.error(e);
    }
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.classification === 'Administrador';
  const userTools = currentUser.tools || [];
  const equipoMember = equipoData.find(m => m.id === currentUser.id || m.id === currentUser.username || m.name === currentUser.name);
  const specialtyStr = (currentUser.specialty || equipoMember?.specialty || '').toLowerCase();
  const classificationStr = (currentUser.classification || '').toLowerCase();
  
  const isGuionista = specialtyStr.includes('guionista') || classificationStr.includes('guionista');
  const isAsesor = specialtyStr.includes('asesor') || classificationStr.includes('asesor');
  
  const isDirector = specialtyStr.includes('director') || classificationStr.includes('director');
  const isLocutor = specialtyStr.includes('locutor') || classificationStr.includes('locutor');
  const isRealizadorSonido = specialtyStr.includes('realizador') || specialtyStr.includes('sonido') || specialtyStr.includes('efectos') || specialtyStr.includes('operador') || specialtyStr.includes('grabador') || classificationStr.includes('realizador') || classificationStr.includes('sonido') || classificationStr.includes('efectos') || classificationStr.includes('operador') || classificationStr.includes('grabador');
  const isSalarySimulatorAllowed = isDirector || isAsesor || isLocutor || isRealizadorSonido;

  const isToolAllowed = (toolId: string) => {
    if (isAdmin) return true;
    if (userTools.includes(toolId)) return true;
    if (toolId === 'digital-signature') return true;
    if (toolId === 'diccionario') return true;
    if (toolId === 'script-format' && (isGuionista || isAsesor)) return true;
    if (toolId === 'salary-simulator' && isSalarySimulatorAllowed) return true;
    return false;
  };

  const initialToolsList = [
    { id: 'guiones-management', title: 'Gestión de Guiones' },
    { id: 'script-format', title: 'Formato de Guion' },
    { id: 'data-extraction', title: 'Extracción de Datos' },
    { id: 'inst-docs', title: 'Documentos Institucionales' },
    { id: 'inst-comm', title: 'Comunicación Institucional' },
    { id: 'maintenance', title: 'Mantenimiento' },
    { id: 'secretary', title: 'Secretaría' },
    { id: 'reception', title: 'Recepción' },
    { id: 'digital-signature', title: 'Firma Digital' },
    { id: 'diccionario', title: 'Diccionario Radial' },
    { id: 'salary-simulator', title: 'Simulador de Salario' },
  ];

  // Filter floating tools based on allowed tools for the current user
  const allowedFloatingTools = initialToolsList.filter(tool => 
    floatingTools.includes(tool.id) && isToolAllowed(tool.id)
  );

  const handleToolClick = (toolId: string) => {
    localStorage.setItem('rcm_active_tool', toolId);
    onNavigate(AppView.APP_TOOLS);
    setIsOpen(false);
  };

  return (
    <div className="fixed right-5 z-50 flex flex-col items-end" style={{ bottom: 'calc(6rem + var(--sab))' }} ref={menuRef}>
      {/* Expanded Menu Card */}
      {isOpen && (
        <div className="mb-3 w-72 bg-[#231510] border border-[#9E7649]/30 rounded-2xl shadow-2xl p-4 flex flex-col gap-3.5 animate-fade-in-up text-[#E8DCCF] font-mono">
          <div className="flex items-center justify-between border-b border-[#9E7649]/20 pb-2">
            <h4 className="text-xs font-bold uppercase text-[#9E7649] tracking-wider flex items-center gap-1.5">
              <Wrench size={13} />
              Acceso Rápido
            </h4>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar">
            {/* Native Option: WhatsApp */}
            <a
              href={whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3 py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-all flex items-center justify-between text-[#25D366] text-xs font-bold uppercase tracking-wide group"
            >
              <span className="flex items-center gap-2">
                <MessageSquare size={16} fill="#25D366" />
                Grupo WhatsApp
              </span>
              <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* Separator if there are floating tools */}
            {allowedFloatingTools.length > 0 && (
              <div className="my-1 border-t border-[#9E7649]/10" />
            )}

            {/* Configured Floating Tools */}
            {allowedFloatingTools.map(tool => {
              const IconComponent = toolIcons[tool.id] || Wrench;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#2C1B15] border border-[#9E7649]/15 hover:border-[#9E7649]/40 hover:bg-[#38231B] transition-all flex items-center justify-between text-left text-xs text-white"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="p-1.5 rounded-lg bg-black/40 text-[#9E7649]">
                      <IconComponent size={14} />
                    </span>
                    <span className="font-bold truncate">{tool.title}</span>
                  </span>
                  <ChevronRight size={14} className="text-[#9E7649]/60 shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Go to all tools */}
          <button
            onClick={() => {
              onNavigate(AppView.APP_TOOLS);
              setIsOpen(false);
            }}
            className="w-full py-2 bg-[#9E7649] hover:bg-[#b28757] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-black/30 flex items-center justify-center gap-1.5"
          >
            <Wrench size={12} />
            Mis Herramientas
          </button>
        </div>
      )}

      {/* Main Trigger FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all text-white ${
          isOpen ? 'bg-[#9E7649]' : 'bg-[#25D366]'
        }`}
        title="Acceso Rápido y Contacto"
      >
        {isOpen ? (
          <X size={26} />
        ) : (
          <div className="relative">
            <MessageSquare size={26} fill="white" />
            <div className="absolute -top-1.5 -right-1.5 bg-amber-500 border border-[#25D366] text-black text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              +
            </div>
          </div>
        )}
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
  );
};
