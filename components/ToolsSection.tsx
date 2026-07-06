import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  FileText, 
  BookOpen, 
  Megaphone, 
  Settings,
  ChevronRight,
  Sparkles,
  Database,
  Briefcase,
  Bell,
  Shield,
  GripVertical
} from 'lucide-react';
import CMNLHeader from './CMNLHeader';
import DataExtractionTool from './DataExtractionTool';
import GenericTool from './GenericTool';
import GuionesGestionTool from './GuionesGestionTool';
import FirmaDigitalTool from './FirmaDigitalTool';
import GuionFormatTool from './GuionFormatTool';
import DiccionarioTool from './DiccionarioTool';

interface ToolsSectionProps {
  onBack: () => void;
  onMenuClick: () => void;
  currentUser: any;
  equipoData?: any[];
  users?: any[];
  onSaveCMNL?: () => void;
}

const ToolsSection: React.FC<ToolsSectionProps> = ({ onBack, onMenuClick, currentUser, equipoData = [], users = [], onSaveCMNL }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const initialToolsList = [
    {
      id: 'guiones-management',
      title: 'Gestión de Guiones',
      description: 'Módulo administrativo para coordinadores: Reportes temáticos, control de calidad y cierre financiero de pagos a guionistas y asesores.',
      icon: Briefcase,
      color: 'from-stone-500/20 to-stone-600/20',
      textColor: 'text-[#9E7649]',
      borderColor: 'border-[#9E7649]/30'
    },
    {
      id: 'script-format',
      title: 'Formato de Guion',
      description: 'Permite a asesores y guionistas formatear la estructura de su guion y modificar elementos del texto, estandarizándolo según carta de estilo de la emisora.',
      icon: FileText,
      color: 'from-blue-500/20 to-blue-600/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'data-extraction',
      title: 'Extracción de Datos',
      description: 'Automatiza la extracción de propiedades de archivos de texto y audio mediante PowerShell.',
      icon: Database,
      color: 'from-cyan-500/20 to-cyan-600/20',
      textColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30'
    },
    {
      id: 'inst-docs',
      title: 'Documentos Institucionales',
      description: 'Permite acceder a normas jurídicas, disposiciones, reglamentos y procedimientos internos lo que incluye la posibilidad de descargarlos.',
      icon: BookOpen,
      color: 'from-emerald-500/20 to-emerald-600/20',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30'
    },
    {
      id: 'inst-comm',
      title: 'Comunicación Institucional',
      description: 'Herramienta de trabajo para el especialista en comunicación, patrimonio, archivo y atención a la población, con la cual puede gestionar y automatizar todos estos procesos.',
      icon: Megaphone,
      color: 'from-purple-500/20 to-purple-600/20',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/30'
    },
    {
      id: 'maintenance',
      title: 'Mantenimiento',
      description: 'Permite al técnico en explotación de la radio de la emisora dar seguimiento a todos los equipos, sus ciclos de mantenimiento, necesidades de materiales para hacerlo etc.',
      icon: Settings,
      color: 'from-amber-500/20 to-amber-600/20',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30'
    },
    {
      id: 'secretary',
      title: 'Secretaría',
      description: 'Facilita la gestión de la secretaría de la directora de la emisora, actas de consejos de dirección, seguimiento a acuerdos, localización de documentos, guía telefónica de instituciones y funcionarios, planes de trabajo y otros.',
      icon: Briefcase,
      color: 'from-rose-500/20 to-rose-600/20',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/30'
    },
    {
      id: 'reception',
      title: 'Recepción',
      description: 'Permite a la recepcionista manejar y crear documentos como el Control de acceso, objetos perdidos, clasificados entre otros que se vayan sumando.',
      icon: Bell,
      color: 'from-indigo-500/20 to-indigo-600/20',
      textColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/30'
    },
    {
      id: 'digital-signature',
      title: 'Firma Digital',
      description: 'Módulo de identidad corporativa para la solicitud, emisión y validación de firmas criptográficas vinculadas al hardware del dispositivo.',
      icon: Shield,
      color: 'from-amber-600/20 to-amber-700/20',
      textColor: 'text-amber-500',
      borderColor: 'border-amber-500/30'
    },
    {
      id: 'diccionario',
      title: 'Diccionario Radial',
      description: 'Glosario de consulta técnica para radialistas con navegación secuencial de términos y administración del diccionario de especialidad.',
      icon: BookOpen,
      color: 'from-blue-600/20 to-blue-700/20',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-500/30'
    }
  ];

  // Load tools order state from LocalStorage
  const [orderedTools, setOrderedTools] = useState<any[]>(() => {
    const savedOrder = localStorage.getItem('rcm_tools_order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          // Sort items based on saved orderIds, appending any new/missing items at the end
          const sorted = [...initialToolsList].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          return sorted;
        }
      } catch (e) {
        console.error("Error parsing saved tools order:", e);
      }
    }
    return initialToolsList;
  });

  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchDraggedIndex, setTouchDraggedIndex] = useState<number | null>(null);

  const userTools = currentUser?.tools || [];
  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador';
  
  const equipoMember = equipoData?.find(m => m.id === currentUser?.id || m.id === currentUser?.username || m.name === currentUser?.fullName);
  const specialtyStr = (currentUser?.specialty || equipoMember?.specialty || '').toLowerCase();
  const classificationStr = (currentUser?.classification || '').toLowerCase();
  
  const isGuionista = specialtyStr.includes('guionista') || classificationStr.includes('guionista');
  const isAsesor = specialtyStr.includes('asesor') || classificationStr.includes('asesor');
  
  // Filter according to user privileges, preserving ordered state
  const tools = isAdmin ? orderedTools : orderedTools.filter(t => 
    userTools.includes(t.id) || 
    t.id === 'inst-docs' || 
    t.id === 'digital-signature' ||
    t.id === 'diccionario' ||
    (t.id === 'script-format' && (isGuionista || isAsesor))
  );

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isReordering) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isReordering || draggedIndex === null) return;
    e.preventDefault();
    if (draggedIndex === index) return;
    
    const updated = [...orderedTools];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setOrderedTools(updated);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    if (!isReordering) return;
    e.preventDefault();
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Touch handlers for mobile reordering
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isReordering) return;
    setTouchDraggedIndex(index);
    // Add temporary pointer-events none to the dragged item to allow elementFromPoint to see through it
    const target = e.currentTarget as HTMLElement;
    target.style.pointerEvents = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isReordering || touchDraggedIndex === null) return;
    
    // Prevent scrolling while reordering
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;
    
    const card = element.closest('[data-index]');
    if (!card) return;
    
    const targetIndex = parseInt(card.getAttribute('data-index') || '', 10);
    if (isNaN(targetIndex) || targetIndex === touchDraggedIndex) return;
    
    const updated = [...orderedTools];
    const draggedItem = updated[touchDraggedIndex];
    updated.splice(touchDraggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    
    setTouchDraggedIndex(targetIndex);
    setOrderedTools(updated);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchDraggedIndex(null);
    // Restore pointer events
    const target = e.currentTarget as HTMLElement;
    target.style.pointerEvents = 'auto';
  };

  // Reorder save / cancel actions
  const saveNewOrder = () => {
    const orderIds = orderedTools.map(t => t.id);
    localStorage.setItem('rcm_tools_order', JSON.stringify(orderIds));
    setIsReordering(false);
    if (onSaveCMNL) {
      onSaveCMNL();
    }
  };

  const cancelReordering = () => {
    const savedOrder = localStorage.getItem('rcm_tools_order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const sorted = [...initialToolsList].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          setOrderedTools(sorted);
        }
      } catch (e) {
        setOrderedTools(initialToolsList);
      }
    } else {
      setOrderedTools(initialToolsList);
    }
    setIsReordering(false);
  };

  // If a tool is active, render it
  const currentTool = initialToolsList.find(t => t.id === activeTool);

  if (activeTool === 'data-extraction') {
    return (
      <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
        <CMNLHeader 
          user={currentUser}
          sectionTitle="Extracción de Datos" 
          onBack={() => setActiveTool(null)}
          onMenuClick={onMenuClick}
        />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <DataExtractionTool onBack={() => setActiveTool(null)} isAdmin={isAdmin} />
        </main>
      </div>
    );
  }

  if (activeTool === 'guiones-management') {
    return (
      <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
        <CMNLHeader 
          user={currentUser}
          sectionTitle="Gestión de Guiones" 
          onBack={() => setActiveTool(null)}
          onMenuClick={onMenuClick}
        />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <GuionesGestionTool onBack={() => setActiveTool(null)} isAdmin={isAdmin} currentUser={currentUser} />
        </main>
      </div>
    );
  }

  if (activeTool === 'digital-signature') {
    return (
      <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
        <CMNLHeader 
          user={currentUser}
          sectionTitle="Firma Digital" 
          onBack={() => setActiveTool(null)}
          onMenuClick={onMenuClick}
        />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <FirmaDigitalTool 
            user={currentUser} 
            isAdmin={isAdmin} 
            equipoData={equipoData}
            users={users}
            onUpdateDatabase={(newCert) => {
               const saved = localStorage.getItem('cmnl_digital_signatures');
               const data = saved ? JSON.parse(saved) : { validated_users: [] };
               data.validated_users.push(newCert);
               localStorage.setItem('cmnl_digital_signatures', JSON.stringify(data));
               onSaveCMNL?.();
            }}
          />
        </main>
      </div>
    );
  }

  if (activeTool === 'script-format') {
    return (
      <div className="h-screen flex flex-col bg-[#1A0F0A] text-[#E8DCCF] font-sans">
        <GuionFormatTool 
          onBack={() => setActiveTool(null)} 
          currentUser={currentUser} 
          onMenuClick={onMenuClick} 
        />
      </div>
    );
  }

  if (activeTool === 'diccionario') {
    return (
      <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
        <CMNLHeader 
          user={currentUser}
          sectionTitle="Diccionario Radial" 
          onBack={() => setActiveTool(null)}
          onMenuClick={onMenuClick}
        />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <DiccionarioTool onBack={() => setActiveTool(null)} currentUser={currentUser} onSaveCMNL={onSaveCMNL} />
        </main>
      </div>
    );
  }

  if (activeTool && currentTool) {
    return (
      <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
        <CMNLHeader 
          user={currentUser}
          sectionTitle={currentTool.title} 
          onBack={() => setActiveTool(null)}
          onMenuClick={onMenuClick}
        />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <GenericTool 
            id={currentTool.id}
            title={currentTool.title}
            description={currentTool.description}
            onBack={() => setActiveTool(null)}
            isAdmin={isAdmin}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
      <CMNLHeader 
        title="Mis Herramientas" 
        subtitle="Recursos especializados" 
        onBack={onBack}
        onMenuClick={onMenuClick}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-[#2A1810] to-[#1A0F0A] border border-stone-700/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Wrench className="text-amber-500" />
                Módulo Especializado
              </h2>
              <p className="text-stone-400 max-w-2xl text-sm">
                Bienvenido a tu panel de herramientas. Aquí encontrarás recursos diseñados específicamente para tu especialización dentro de Radio Ciudad Monumento.
              </p>
            </div>
            
            {isAdmin && (
              <div className="shrink-0 flex items-center">
                {!isReordering ? (
                  <button
                    onClick={() => setIsReordering(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-amber-950/40 flex items-center gap-2"
                  >
                    <Settings size={14} className="animate-spin duration-1000" />
                    Reorganizar Lista
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      onClick={saveNewOrder}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-emerald-950/40"
                    >
                      Guardar Orden
                    </button>
                    <button
                      onClick={cancelReordering}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs font-bold uppercase rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {isAdmin && isReordering && (
            <div className="mt-3 text-xs text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg animate-pulse">
              💡 <strong>Modo de Ordenamiento:</strong> Mantenga presionado y arrastre cualquier tarjeta (con el dedo en móvil o el cursor en PC) para cambiar su posición.
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {tools.map((tool, index) => {
            const isBeingDragged = index === draggedIndex || index === touchDraggedIndex;
            return (
              <div
                key={tool.id}
                data-index={index}
                draggable={isReordering}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: isReordering ? 'none' : 'auto' }}
                className={`group flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br ${tool.color} border transition-all ${
                  isReordering 
                    ? isBeingDragged
                      ? 'border-amber-500 bg-stone-900/80 scale-[1.03] shadow-xl shadow-amber-950/20 opacity-90 cursor-grabbing'
                      : 'border-amber-500/30 hover:border-amber-500/60 border-dashed cursor-grab'
                    : `hover:shadow-lg hover:shadow-black/40 ${tool.borderColor}`
                }`}
                onClick={isReordering ? undefined : () => setActiveTool(tool.id)}
              >
                {isReordering && (
                  <div className="pt-3 text-amber-500/50 group-hover:text-amber-500 transition-all shrink-0">
                    <GripVertical size={20} className="animate-pulse" />
                  </div>
                )}
                
                <div className={`p-3 rounded-lg bg-black/40 ${tool.textColor} shrink-0`}>
                  <tool.icon size={28} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors uppercase tracking-tight truncate">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-stone-300 mt-1 line-clamp-2 leading-relaxed font-mono">
                    {tool.description}
                  </p>
                </div>
                
                {!isReordering && (
                  <div className="pt-2 text-stone-500 group-hover:text-amber-500 transition-colors shrink-0">
                    <ChevronRight size={20} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 p-8 rounded-2xl border-2 border-dashed border-stone-800 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center mb-4 border border-stone-700">
            <Sparkles className="text-stone-500" />
          </div>
          <h3 className="text-lg font-medium text-stone-400">Más herramientas próximamente</h3>
          <p className="text-stone-600 text-sm mt-2 max-w-sm">
            Estamos trabajando para incorporar nuevas funcionalidades adaptadas a cada perfil del equipo CMNL.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default ToolsSection;
