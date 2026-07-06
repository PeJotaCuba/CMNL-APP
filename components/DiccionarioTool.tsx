import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  Quote, 
  Compass,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  CheckCircle,
  Copy,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RADIAL_TERMS_BASE, RadialTerm } from './radialTermsBase';

interface DiccionarioToolProps {
  onBack: () => void;
  currentUser: any;
  onSaveCMNL?: () => void;
}

const DiccionarioTool: React.FC<DiccionarioToolProps> = ({ onBack, currentUser, onSaveCMNL }) => {
  // Radial Dictionary States
  const [radialTerms, setRadialTerms] = useState<RadialTerm[]>([]);
  const [selectedRadialTerm, setSelectedRadialTerm] = useState<RadialTerm | null>(null);
  const [searchRadialQuery, setSearchRadialQuery] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyTerm = (term: string, definition: string) => {
    navigator.clipboard.writeText(`${term}: ${definition}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectTerm = (term: RadialTerm) => {
    setSelectedRadialTerm(term);
    setShowOverlay(true);
  };

  // Disable scroll when overlay is open
  useEffect(() => {
    if (showOverlay) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showOverlay]);

  // Admin Panel States
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: '', definition: '', category: 'General', synonyms: '', antonyms: '' });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Drag and Drop Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador';

  // Load Radial Terms on mount
  useEffect(() => {
    // 1. Radial dictionary terms
    const savedRadial = localStorage.getItem('rcm_diccionario_radial');
    if (savedRadial) {
      try {
        const parsed = JSON.parse(savedRadial);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRadialTerms(parsed);
          setSelectedRadialTerm(parsed[0]);
        } else {
          setRadialTerms(RADIAL_TERMS_BASE);
          setSelectedRadialTerm(RADIAL_TERMS_BASE[0]);
          localStorage.setItem('rcm_diccionario_radial', JSON.stringify(RADIAL_TERMS_BASE));
        }
      } catch (e) {
        setRadialTerms(RADIAL_TERMS_BASE);
        setSelectedRadialTerm(RADIAL_TERMS_BASE[0]);
      }
    } else {
      setRadialTerms(RADIAL_TERMS_BASE);
      setSelectedRadialTerm(RADIAL_TERMS_BASE[0]);
      localStorage.setItem('rcm_diccionario_radial', JSON.stringify(RADIAL_TERMS_BASE));
    }
  }, []);

  // Helper to trigger save to actualcmnl.json
  const persistRadialTerms = (updatedTerms: RadialTerm[]) => {
    const sorted = [...updatedTerms].sort((a, b) => a.term.localeCompare(b.term));
    setRadialTerms(sorted);
    localStorage.setItem('rcm_diccionario_radial', JSON.stringify(sorted));
    
    // Select first term or keep current if still in list
    if (selectedRadialTerm) {
      const stillExists = sorted.find(t => t.term.toLowerCase() === selectedRadialTerm.term.toLowerCase());
      if (stillExists) {
        setSelectedRadialTerm(stillExists);
      } else {
        setSelectedRadialTerm(sorted[0] || null);
      }
    } else {
      setSelectedRadialTerm(sorted[0] || null);
    }

    // Trigger saving to actualcmnl.json
    if (onSaveCMNL) {
      onSaveCMNL();
    }
  };

  // 1. SEQUENTIAL NAVIGATION "Uno por uno"
  const handlePrevTerm = () => {
    if (filteredRadialTerms.length === 0 || !selectedRadialTerm) return;
    const currentIndex = filteredRadialTerms.findIndex(t => t.term.toLowerCase() === selectedRadialTerm.term.toLowerCase());
    if (currentIndex > 0) {
      setSelectedRadialTerm(filteredRadialTerms[currentIndex - 1]);
    } else {
      // Loop to end
      setSelectedRadialTerm(filteredRadialTerms[filteredRadialTerms.length - 1]);
    }
  };

  const handleNextTerm = () => {
    if (filteredRadialTerms.length === 0 || !selectedRadialTerm) return;
    const currentIndex = filteredRadialTerms.findIndex(t => t.term.toLowerCase() === selectedRadialTerm.term.toLowerCase());
    if (currentIndex !== -1 && currentIndex < filteredRadialTerms.length - 1) {
      setSelectedRadialTerm(filteredRadialTerms[currentIndex + 1]);
    } else {
      // Loop to beginning
      setSelectedRadialTerm(filteredRadialTerms[0]);
    }
  };

  // 3. ADMIN: ADD NEW TERM MANUALLY
  const handleAddManualTerm = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const termClean = newTerm.term.trim();
    const defClean = newTerm.definition.trim();

    if (!termClean || !defClean) {
      setErrorMessage('El término y su definición son campos obligatorios.');
      return;
    }

    // Check if duplicate
    const exists = radialTerms.some(t => t.term.toLowerCase() === termClean.toLowerCase());
    if (exists) {
      setErrorMessage(`El término "${termClean}" ya existe en el diccionario radial.`);
      return;
    }

    const createdTerm: RadialTerm = {
      term: termClean,
      definition: defClean,
      category: newTerm.category || 'General',
      synonyms: newTerm.synonyms ? newTerm.synonyms.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      antonyms: newTerm.antonyms ? newTerm.antonyms.split(',').map(a => a.trim()).filter(Boolean) : undefined,
    };

    const updated = [...radialTerms, createdTerm];
    persistRadialTerms(updated);
    
    // Reset form & show alert
    setNewTerm({ term: '', definition: '', category: 'General', synonyms: '', antonyms: '' });
    setSelectedRadialTerm(createdTerm);
    setSuccessMessage(`¡Término "${termClean}" agregado y guardado en actualcmnl.json!`);
    setShowAdminForm(false);
  };

  // 4. ADMIN: DELETE TERM
  const handleDeleteTerm = (termToDelete: RadialTerm) => {
    if (!window.confirm(`¿Está seguro que desea eliminar el término "${termToDelete.term}" del glosario?`)) {
      return;
    }
    const updated = radialTerms.filter(t => t.term.toLowerCase() !== termToDelete.term.toLowerCase());
    persistRadialTerms(updated);
    setSuccessMessage(`El término "${termToDelete.term}" ha sido eliminado con éxito.`);
  };

  // 5. ADMIN: RESET TO BASE GLOSSARY
  const handleResetGlossary = () => {
    if (!window.confirm('¿Desea restaurar el Diccionario Radial a su estado base original con los 191 términos? Esto sobrescribirá cualquier cambio manual.')) {
      return;
    }
    persistRadialTerms(RADIAL_TERMS_BASE);
    setSuccessMessage('¡El Diccionario Radial ha sido restaurado con éxito a su estado original de 191 términos!');
  };

  // 6. ADMIN: FILE TXT UPLOAD AND PARSING
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processTxtFile(file);
  };

  const processTxtFile = (file: File) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!file.name.endsWith('.txt')) {
      setErrorMessage('Por favor, cargue únicamente archivos con extensión .txt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setErrorMessage('El archivo está vacío o no se pudo leer.');
        return;
      }

      try {
        const lines = text.split('\n');
        const parsedTerms: RadialTerm[] = [];
        let duplicateCount = 0;

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          // Split by colon (:) or hyphen (-)
          let sepIndex = line.indexOf(':');
          if (sepIndex === -1) {
            sepIndex = line.indexOf(' - ');
          }

          let term = '';
          let definition = '';

          if (sepIndex !== -1) {
            term = line.substring(0, sepIndex).trim();
            definition = line.substring(sepIndex + 1).trim();
          } else {
            // Attempt splitting by first dot
            const dotIndex = line.indexOf('.');
            if (dotIndex !== -1 && dotIndex < 35 && isNaN(Number(line.substring(0, dotIndex).trim()))) {
              term = line.substring(0, dotIndex).trim();
              definition = line.substring(dotIndex + 1).trim();
            } else {
              term = line;
              definition = 'Definición cargada por lote.';
            }
          }

          // Clean up bullet points, numbers, brackets from term name
          term = term.replace(/^[\d\.\-\s\)\(\•\*]+/g, '').trim();

          if (term.length > 1) {
            // Check duplicate in the uploaded list itself or existing list
            const isDuplicate = radialTerms.some(t => t.term.toLowerCase() === term.toLowerCase()) || 
                                parsedTerms.some(t => t.term.toLowerCase() === term.toLowerCase());
            
            if (isDuplicate) {
              duplicateCount++;
              continue;
            }

            parsedTerms.push({
              term,
              definition: definition || 'Definición cargada por lote.',
              category: 'Carga por Lote'
            });
          }
        }

        if (parsedTerms.length === 0) {
          if (duplicateCount > 0) {
            setErrorMessage(`No se agregaron términos nuevos. Todos los encontrados (${duplicateCount}) ya existen.`);
          } else {
            setErrorMessage('No se pudieron identificar términos válidos. Asegúrese que el formato sea "Término: Definición" o "Término - Definición".');
          }
          return;
        }

        const updated = [...radialTerms, ...parsedTerms];
        persistRadialTerms(updated);
        
        setSuccessMessage(`¡Lote importado con éxito! Se agregaron ${parsedTerms.length} términos nuevos. (${duplicateCount} omitidos por estar repetidos).`);
        setShowUploadArea(false);
      } catch (err: any) {
        setErrorMessage(`Error al procesar el archivo: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Ocurrió un error al leer el archivo .txt');
    };

    reader.readAsText(file);
  };

  // FILTERED RADIAL TERMS FOR GLOSARIO RADIAL
  const filteredRadialTerms = radialTerms.filter(t => 
    t.term.toLowerCase().includes(searchRadialQuery.toLowerCase()) ||
    t.definition.toLowerCase().includes(searchRadialQuery.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(searchRadialQuery.toLowerCase()))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-1">
      {/* Header Banner - Designed with high density, elegance and zero slop */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-[#2D1B13] to-[#170E0A] border border-stone-800/80 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <BookOpen size={160} className="text-amber-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="text-amber-500 animate-pulse" />
              Diccionario Radial
            </h1>
            <p className="text-stone-300 mt-1 max-w-3xl font-mono text-xs leading-relaxed">
              Materia de consulta científica, técnica y terminológica para profesionales de la radiodifusión en Radio Ciudad Monumento. Permite consultas avanzadas y gestión del glosario de especialidad.
            </p>
          </div>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-stone-900 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl transition-all text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-black/40"
          >
            ← Volver a Herramientas
          </button>
        </div>
      </div>

      {/* Notification Alerts */}
      <AnimatePresence mode="wait">
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-sm font-mono"
          >
            <CheckCircle className="text-emerald-500 shrink-0" size={20} />
            <div className="flex-1">{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className="hover:text-white uppercase text-[10px]">Cerrar</button>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-sm font-mono"
          >
            <AlertTriangle className="text-rose-500 shrink-0" size={20} />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="hover:text-white uppercase text-[10px]">Cerrar</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW 1: DICCIONARIO / GLOSARIO RADIAL (CORE OBJECTIVE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: Search, Alphabetical List, Admin Actions */}
          <div className="lg:col-span-5 bg-[#1C120C] border border-stone-800 rounded-2xl p-5 shadow-xl space-y-6">
            
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-wider font-mono uppercase flex items-center gap-2">
                <Compass size={16} className="text-amber-500" />
                Términos del Medio ({filteredRadialTerms.length})
              </h2>
              
              {/* Reset database button (Admin only) */}
              {isAdmin && (
                <button
                  onClick={handleResetGlossary}
                  title="Restaurar base de datos de 191 términos original"
                  className="p-1 px-2.5 rounded bg-stone-900 hover:bg-stone-800 text-[10px] text-amber-500 hover:text-amber-400 font-mono border border-stone-800 uppercase tracking-widest"
                >
                  Reiniciar Base
                </button>
              )}
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
              <input
                type="text"
                placeholder="Escriba el término o concepto..."
                value={searchRadialQuery}
                onChange={(e) => setSearchRadialQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-stone-800 rounded-lg text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/50 transition-all font-mono"
              />
              {searchRadialQuery && (
                <button 
                  onClick={() => setSearchRadialQuery('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-white font-mono"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* List of terms - Clickable & Alphabetical */}
            <div className="max-h-[360px] overflow-y-auto pr-1 border border-stone-800/60 rounded-xl bg-black/20 divide-y divide-stone-900 custom-scrollbar">
              {filteredRadialTerms.length > 0 ? (
                filteredRadialTerms.map((t, idx) => {
                  const isSelected = selectedRadialTerm && selectedRadialTerm.term.toLowerCase() === t.term.toLowerCase();
                  return (
                    <button
                      key={idx}
                      onClick={() => selectTerm(t)}
                      className={`w-full px-4 py-3 text-left transition-all flex items-center justify-between gap-3 text-xs ${
                        isSelected 
                          ? 'bg-amber-600/10 text-amber-400 font-bold border-l-2 border-amber-500' 
                          : 'text-stone-300 hover:bg-stone-900/30'
                      }`}
                    >
                      <span className="truncate pr-2 font-mono capitalize">{t.term}</span>
                      {t.category && (
                        <span className="text-[9px] uppercase tracking-wider text-stone-500 px-1.5 py-0.5 rounded bg-stone-900/60 font-mono shrink-0">
                          {t.category}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-stone-500 font-mono text-xs">
                  Ningún término coincide con su búsqueda.
                </div>
              )}
            </div>

            {/* ADMIN ONLY CONTROLS (Manual and txt load) */}
            {isAdmin && (
              <div className="border-t border-stone-800/80 pt-5 space-y-4">
                <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">
                  Controles de Administrador
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setShowAdminForm(!showAdminForm); setShowUploadArea(false); }}
                    className={`py-2 px-3 border rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                      showAdminForm 
                        ? 'bg-amber-600 border-amber-500 text-white' 
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-white'
                    }`}
                  >
                    <Plus size={14} />
                    Ingreso Manual
                  </button>
                  
                  <button
                    onClick={() => { setShowUploadArea(!showUploadArea); setShowAdminForm(false); }}
                    className={`py-2 px-3 border rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                      showUploadArea 
                        ? 'bg-amber-600 border-amber-500 text-white' 
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-white'
                    }`}
                  >
                    <Upload size={14} />
                    Carga TXT
                  </button>
                </div>

                {/* Sub-Panel: Manual Entry Form */}
                <AnimatePresence>
                  {showAdminForm && (
                    <motion.form 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleAddManualTerm}
                      className="p-4 bg-black/40 rounded-xl border border-stone-800 space-y-3 overflow-hidden"
                    >
                      <h4 className="text-xs font-bold text-stone-300 font-mono uppercase">Nuevo Término Radial</h4>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] text-stone-500 font-mono uppercase">Término / Palabra *</label>
                        <input
                          type="text"
                          required
                          value={newTerm.term}
                          onChange={(e) => setNewTerm({...newTerm, term: e.target.value})}
                          placeholder="Ej. Acople"
                          className="w-full px-3 py-1.5 bg-stone-900/80 border border-stone-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-stone-500 font-mono uppercase">Definición / Explicación *</label>
                        <textarea
                          required
                          rows={3}
                          value={newTerm.definition}
                          onChange={(e) => setNewTerm({...newTerm, definition: e.target.value})}
                          placeholder="Explicación detallada para consulta profesional..."
                          className="w-full px-3 py-1.5 bg-stone-900/80 border border-stone-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-stone-500 font-mono uppercase">Categoría</label>
                        <select
                          value={newTerm.category}
                          onChange={(e) => setNewTerm({...newTerm, category: e.target.value})}
                          className="w-full px-3 py-1.5 bg-stone-900/80 border border-stone-800 rounded text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                        >
                          <option value="General">General</option>
                          <option value="Acústica">Acústica</option>
                          <option value="Técnica / Explotación">Técnica / Explotación</option>
                          <option value="Música / Radiofónico">Música / Radiofónico</option>
                          <option value="Guión / Libreto">Guión / Libreto</option>
                          <option value="Artístico / Interpretación">Artístico / Interpretación</option>
                          <option value="Diseño Sonoro / Producción">Diseño Sonoro / Producción</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-stone-500 font-mono uppercase">Sinónimos (Separados por coma)</label>
                          <input
                            type="text"
                            value={newTerm.synonyms}
                            onChange={(e) => setNewTerm({...newTerm, synonyms: e.target.value})}
                            placeholder="ej. Eco, reflejo"
                            className="w-full px-3 py-1.5 bg-stone-900/80 border border-stone-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-stone-500 font-mono uppercase">Antónimos (Separados por coma)</label>
                          <input
                            type="text"
                            value={newTerm.antonyms}
                            onChange={(e) => setNewTerm({...newTerm, antonyms: e.target.value})}
                            placeholder="ej. Seco, directo"
                            className="w-full px-3 py-1.5 bg-stone-900/80 border border-stone-800 rounded text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 mt-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold uppercase rounded transition-all"
                      >
                        Guardar Término
                      </button>
                    </motion.form>
                  )}

                  {/* Sub-Panel: TXT Load Dropzone */}
                  {showUploadArea && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-black/40 rounded-xl border border-stone-800 space-y-3 overflow-hidden text-center"
                    >
                      <h4 className="text-xs font-bold text-stone-300 font-mono uppercase text-left">Cargar archivo TXT</h4>
                      <p className="text-[10px] text-stone-500 font-mono text-left leading-relaxed">
                        Cargue un archivo .txt con términos delimitados por dos puntos (:) o guion (-). El sistema filtrará duplicados automáticamente.
                      </p>

                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-stone-700 rounded-lg p-6 bg-stone-900/30 hover:bg-stone-900/50 hover:border-amber-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                      >
                        <Upload size={24} className="text-amber-500 animate-bounce" />
                        <span className="text-xs font-mono text-stone-300">Seleccionar o soltar archivo .txt</span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* RIGHT VIEW PANEL: Definition and Sequential Pager */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {selectedRadialTerm ? (
                <motion.div
                  key={selectedRadialTerm.term}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-[#1C120C] border border-stone-800 rounded-2xl p-8 shadow-xl relative min-h-[420px] flex flex-col justify-between"
                >
                  {/* Category Badge & Delete button */}
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold font-mono text-amber-500 uppercase tracking-widest">
                        {selectedRadialTerm.category || 'Módulo de Especialidad'}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTerm(selectedRadialTerm)}
                          title="Eliminar este término"
                          className="p-1.5 text-stone-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Term Display Heading & Copy Button */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h2 className="text-3xl font-extrabold text-white tracking-tight capitalize font-sans">
                        {selectedRadialTerm.term}
                      </h2>
                      <button
                        onClick={() => handleCopyTerm(selectedRadialTerm.term, selectedRadialTerm.definition)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 hover:border-amber-500/30 text-stone-400 hover:text-white transition-all text-xs font-mono"
                        title="Copiar término y definición"
                      >
                        {copied ? (
                          <>
                            <Check size={14} className="text-emerald-500" />
                            <span className="text-emerald-400">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Definition Paragraph */}
                    <div className="p-5 rounded-xl bg-black/30 border border-stone-800/80 mb-6 relative">
                      <Quote className="absolute -top-3 left-4 text-amber-500/20" size={32} />
                      <p className="text-stone-200 text-sm font-mono leading-relaxed pl-4 pt-1">
                        {selectedRadialTerm.definition}
                      </p>
                    </div>

                    {/* Synonyms & Antonyms (ONLY SHOW IF PRESENT, satisfying: "si no, quita esos campos") */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRadialTerm.synonyms && selectedRadialTerm.synonyms.length > 0 && (
                        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30">
                          <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest font-bold mb-2">Sinónimos</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedRadialTerm.synonyms.map((syn, idx) => (
                              <span key={idx} className="px-2 py-1 rounded bg-cyan-900/20 border border-cyan-800/40 text-[11px] font-semibold text-cyan-300 font-mono">
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedRadialTerm.antonyms && selectedRadialTerm.antonyms.length > 0 && (
                        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/30">
                          <p className="text-[10px] text-rose-400 font-mono uppercase tracking-widest font-bold mb-2">Antónimos</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedRadialTerm.antonyms.map((ant, idx) => (
                              <span key={idx} className="px-2 py-1 rounded bg-rose-900/20 border border-rose-800/40 text-[11px] font-semibold text-rose-300 font-mono">
                                {ant}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM SEQUENTIAL PAGER (Consultando uno por uno - Text removed to prevent crowding) */}
                  <div className="flex items-center justify-between border-t border-stone-800/80 pt-6 mt-8">
                    <button
                      onClick={handlePrevTerm}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/20 text-stone-400 hover:text-white transition-all text-xs font-mono uppercase flex items-center gap-2"
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>

                    <button
                      onClick={handleNextTerm}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/20 text-stone-400 hover:text-white transition-all text-xs font-mono uppercase flex items-center gap-2"
                    >
                      Siguiente
                      <ChevronRight size={16} />
                    </button>
                  </div>

                </motion.div>
              ) : (
                <div className="bg-[#1C120C] border border-stone-800 rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center text-center min-h-[420px]">
                  <Compass className="text-stone-600 mb-4 animate-spin" size={48} />
                  <p className="text-sm font-mono text-stone-400">Seleccione un término para comenzar su consulta.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* OVERLAY PANEL (SIEMPRE VISIBLE CUANDO SHOWOVERLAY ES TRUE, NO SCROLLEABLE EN EL FONDO) */}
        <AnimatePresence>
          {showOverlay && selectedRadialTerm && (
            <div 
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setShowOverlay(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#231510] border border-amber-500/30 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative flex flex-col gap-5 text-stone-200 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button top right */}
                <button 
                  onClick={() => setShowOverlay(false)}
                  className="absolute top-4 right-4 text-stone-500 hover:text-white transition-all p-1.5 hover:bg-white/5 rounded-full"
                  title="Cerrar vista superpuesta"
                >
                  <X size={20} />
                </button>

                {/* Category Badge */}
                <div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold font-mono text-amber-400 uppercase tracking-widest">
                    {selectedRadialTerm.category || 'Módulo de Especialidad'}
                  </span>
                </div>

                {/* Title & Copy Button Row */}
                <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3">
                  <h3 className="text-2xl font-extrabold text-white tracking-tight capitalize font-sans">
                    {selectedRadialTerm.term}
                  </h3>
                  
                  <button
                    onClick={() => handleCopyTerm(selectedRadialTerm.term, selectedRadialTerm.definition)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 hover:border-amber-500/30 text-stone-400 hover:text-white transition-all text-xs font-mono shrink-0"
                    title="Copiar término y definición"
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="text-emerald-500" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Definition */}
                <div className="p-5 rounded-xl bg-black/40 border border-stone-800/80 relative">
                  <Quote className="absolute -top-3 left-3 text-amber-500/10" size={28} />
                  <p className="text-stone-200 text-sm font-mono leading-relaxed pl-3">
                    {selectedRadialTerm.definition}
                  </p>
                </div>

                {/* Synonyms and Antonyms if present */}
                {(selectedRadialTerm.synonyms?.length || selectedRadialTerm.antonyms?.length) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {selectedRadialTerm.synonyms && selectedRadialTerm.synonyms.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-cyan-950/15 border border-cyan-800/20">
                        <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest font-bold mb-1.5">Sinónimos</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedRadialTerm.synonyms.map((syn, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-cyan-900/20 border border-cyan-800/30 text-[10px] text-cyan-300 font-mono">
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRadialTerm.antonyms && selectedRadialTerm.antonyms.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-rose-950/15 border border-rose-800/20">
                        <p className="text-[9px] text-rose-400 font-mono uppercase tracking-widest font-bold mb-1.5">Antónimos</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedRadialTerm.antonyms.map((ant, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-rose-900/20 border border-rose-800/30 text-[10px] text-rose-300 font-mono">
                              {ant}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Footer Button to close */}
                <button
                  onClick={() => setShowOverlay(false)}
                  className="mt-2 py-2.5 w-full bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Volver a la lista
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default DiccionarioTool;
