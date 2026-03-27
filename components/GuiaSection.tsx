import React from 'react';
import { 
  BookOpen, 
  CalendarDays, 
  Music, 
  FileText, 
  Podcast, 
  ArrowLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Menu
} from 'lucide-react';

interface GuiaSectionProps {
  onBack: () => void;
  onMenuClick?: () => void;
}

const GuiaSection: React.FC<GuiaSectionProps> = ({ onBack, onMenuClick }) => {
  const sections = [
    {
      id: 'agenda',
      title: 'Agenda',
      icon: <CalendarDays className="text-amber-500" size={32} />,
      description: 'Gestión de la programación diaria, efemérides y conmemoraciones.',
      features: [
        'Organización semanal de lunes a domingo.',
        'Asignación inteligente de semanas al mes (regla del jueves).',
        'Gestión de temas diarios y propaganda.',
        'Importación de datos desde archivos de texto (.txt).',
        'Exportación de la agenda semanal a formato Word (.docx).',
        'Consulta de efemérides y conmemoraciones por fecha.'
      ]
    },
    {
      id: 'musica',
      title: 'Música',
      icon: <Music className="text-blue-500" size={32} />,
      description: 'Selección musical, generación de reportes y créditos.',
      features: [
        'Búsqueda y selección de temas musicales del catálogo.',
        'Edición de créditos (Título, Autor, Intérprete, Ruta) antes de guardar.',
        'Exportación individual a PDF para programas específicos.',
        'Exportación masiva de todas las selecciones guardadas.',
        'Compartir selecciones detalladas vía WhatsApp.',
        'Prevención automática de reportes duplicados.'
      ]
    },
    {
      id: 'guiones',
      title: 'Guiones',
      icon: <FileText className="text-emerald-500" size={32} />,
      description: 'Repositorio y gestión de guiones radiales.',
      features: [
        'Organización por géneros, escritores y asesores.',
        'Búsqueda avanzada por temas y palabras clave.',
        'Visualización y edición de contenido de guiones.',
        'Control de fechas de adición y metadatos.',
        'Interfaz optimizada para lectura rápida.'
      ]
    },
    {
      id: 'gestion',
      title: 'Gestión',
      icon: <Podcast className="text-purple-500" size={32} />,
      description: 'Control administrativo, equipo y configuración.',
      features: [
        'Gestión del equipo de trabajo y roles (Equipo).',
        'Catálogo de programas y configuración de pagos.',
        'Sincronización de datos con la nube (GitHub).',
        'Generación de respaldos del sistema (JSON).',
        'Gestión de noticias y contenido público (Administradores).'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#2C1B15] text-[#E8DCCF] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#2C1B15]/95 backdrop-blur-md border-b border-[#9E7649]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#C69C6D]"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#C69C6D] flex items-center gap-2">
              <BookOpen size={24} />
              Guía de Usuario
            </h1>
            <p className="text-xs text-stone-400">Aprende a utilizar las herramientas de Radio Ciudad Monumento</p>
          </div>
        </div>
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#C69C6D]"
          >
            <Menu size={24} />
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Intro Card */}
        <div className="bg-[#3D2B24] border border-[#9E7649]/30 rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Info size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-serif font-bold text-[#C69C6D] mb-4">Bienvenido al Sistema de Gestión</h2>
            <p className="text-stone-300 leading-relaxed max-w-2xl">
              Esta guía te ayudará a comprender las funcionalidades clave de cada sección. 
              Nuestra plataforma está diseñada para optimizar el flujo de trabajo editorial, 
              musical y administrativo de la emisora.
            </p>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <div 
              key={section.id}
              className="bg-[#3D2B24]/50 border border-white/5 rounded-2xl p-6 hover:border-[#C69C6D]/30 transition-all hover:shadow-2xl group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                  {section.icon}
                </div>
                <ChevronRight className="text-stone-600 group-hover:text-[#C69C6D] transition-colors" />
              </div>
              
              <h3 className="text-xl font-bold text-[#E8DCCF] mb-2">{section.title}</h3>
              <p className="text-sm text-stone-400 mb-6">{section.description}</p>
              
              <div className="space-y-3">
                {section.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-stone-300">
                    <CheckCircle2 size={16} className="text-[#C69C6D] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center p-8 border-t border-white/5">
          <p className="text-stone-500 text-sm italic">
            "La radio es el teatro de la mente." - Radio Ciudad Monumento
          </p>
        </div>
      </main>
    </div>
  );
};

export default GuiaSection;
