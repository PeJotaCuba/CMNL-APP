import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  Sparkles, 
  History, 
  RotateCcw, 
  ArrowRight, 
  Bookmark, 
  Quote, 
  Layers, 
  Compass,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  CheckCircle,
  HelpCircle,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RADIAL_TERMS_BASE, RadialTerm } from './radialTermsBase';

interface DiccionarioToolProps {
  onBack: () => void;
  currentUser: any;
  onSaveCMNL?: () => void;
}

interface DefinitionResult {
  word: string;
  category: string;
  meanings: string[];
  synonyms: string[];
  antonyms: string[];
  examples: string[];
  found?: boolean;
  suggestions?: string[];
}

interface ConjugationResult {
  verb: string;
  infinitive: string;
  gerund: string;
  participle: string;
  indicativePresent: string[];
  indicativePastPerfect: string[];
  indicativeImperfect: string[];
  indicativeFuture: string[];
  subjunctivePresent: string[];
  imperative: string[];
}

const PRONOUNS = ['Yo', 'Tú', 'Él/Ella/Ud.', 'Nosotros', 'Vosotros', 'Ellos/Ellas/Uds.'];
const IMPERATIVE_PRONOUNS = ['Tú', 'Él/Ella/Ud. (Imp.)', 'Nosotros', 'Vosotros', 'Ellos/Ellas/Uds. (Imp.)'];

const DiccionarioTool: React.FC<DiccionarioToolProps> = ({ onBack, currentUser, onSaveCMNL }) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'radial' | 'general' | 'conjugation'>('radial');
  
  // Radial Dictionary States
  const [radialTerms, setRadialTerms] = useState<RadialTerm[]>([]);
  const [selectedRadialTerm, setSelectedRadialTerm] = useState<RadialTerm | null>(null);
  const [searchRadialQuery, setSearchRadialQuery] = useState('');
  
  // RAE Search States
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [definitionResult, setDefinitionResult] = useState<DefinitionResult | null>(null);
  const [conjugationResult, setConjugationResult] = useState<ConjugationResult | null>(null);
  const [generalHistory, setGeneralHistory] = useState<Array<{ word: string, mode: 'definition' | 'conjugation' }>>([]);
  
  // Admin Panel States
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: '', definition: '', category: 'General', synonyms: '', antonyms: '' });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Drag and Drop Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador';

  // Load Radial Terms and general history on mount
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

    // 2. RAE General search history
    const savedHistory = localStorage.getItem('rcm_dictionary_history');
    if (savedHistory) {
      try {
        setGeneralHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
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

  // 2. GENERAL SEARCH FUNCTIONS (Local + Gemini Fallback)
  const addToHistory = (newWord: string, searchMode: 'definition' | 'conjugation') => {
    const sanitized = newWord.trim();
    if (!sanitized) return;

    setGeneralHistory(prev => {
      const filtered = prev.filter(item => !(item.word.toLowerCase() === sanitized.toLowerCase() && item.mode === searchMode));
      const updated = [{ word: sanitized, mode: searchMode }, ...filtered].slice(0, 8);
      localStorage.setItem('rcm_dictionary_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setGeneralHistory([]);
    localStorage.removeItem('rcm_dictionary_history');
  };

  const handleGeneralSearch = async (searchWord?: string, searchMode?: 'definition' | 'conjugation') => {
    const targetWord = (searchWord || word).trim();
    const targetMode = searchMode || (activeTab === 'conjugation' ? 'conjugation' : 'definition');

    if (!targetWord) return;

    setLoading(true);
    setError(null);
    if (targetMode === 'definition') {
      setDefinitionResult(null);
    } else {
      setConjugationResult(null);
    }

    try {
      const response = await fetch('/api/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: targetWord, mode: targetMode }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Ocurrió un error al consultar el diccionario.');
      }

      const data = await response.json();

      if (targetMode === 'definition') {
        setDefinitionResult(data);
        addToHistory(data.word || targetWord, 'definition');
      } else {
        setConjugationResult(data);
        addToHistory(data.verb || targetWord, 'conjugation');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
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
              Materia de consulta científica, técnica y terminológica para profesionales de la radiodifusión en Radio Ciudad Monumento. Permite la navegación secuencial, consultas avanzadas y gestión del glosario de especialidad.
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

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-black/40 rounded-xl border border-stone-900 mb-8 max-w-2xl">
        <button
          onClick={() => { setActiveTab('radial'); setError(null); }}
          className={`flex-1 min-w-[140px] py-3 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'radial' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-500/30' 
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
          }`}
        >
          <Compass size={14} />
          Glosario Radial
        </button>
        <button
          onClick={() => { setActiveTab('general'); setError(null); }}
          className={`flex-1 min-w-[140px] py-3 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'general' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-500/30' 
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
          }`}
        >
          <FileText size={14} />
          Búsqueda General (RAE)
        </button>
        <button
          onClick={() => { setActiveTab('conjugation'); setError(null); }}
          className={`flex-1 min-w-[140px] py-3 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'conjugation' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-500/30' 
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
          }`}
        >
          <Layers size={14} />
          Conjugación Verbal
        </button>
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
      {activeTab === 'radial' && (
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
                      onClick={() => setSelectedRadialTerm(t)}
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

                    {/* Term Display Heading */}
                    <h2 className="text-3xl font-extrabold text-white tracking-tight capitalize mb-4 font-sans">
                      {selectedRadialTerm.term}
                    </h2>

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

                  {/* BOTTOM SEQUENTIAL PAGER (Consultando uno por uno) */}
                  <div className="flex items-center justify-between border-t border-stone-800/80 pt-6 mt-8">
                    <button
                      onClick={handlePrevTerm}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/20 text-stone-400 hover:text-white transition-all text-xs font-mono uppercase flex items-center gap-2"
                    >
                      <ChevronLeft size={16} />
                      Término Anterior
                    </button>
                    
                    <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest">
                      Navegación Secuencial
                    </span>

                    <button
                      onClick={handleNextTerm}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/20 text-stone-400 hover:text-white transition-all text-xs font-mono uppercase flex items-center gap-2"
                    >
                      Siguiente Término
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
      )}

      {/* VIEW 2: GENERAL RAE OFFLINE SEARCH (PRESERVED PREVIOUS BEHAVIORS) */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-xl bg-[#221510] border border-stone-800 flex flex-col justify-between min-h-[220px]">
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Search className="text-amber-500" size={18} />
                Búsqueda en Base RAE y API
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); handleGeneralSearch(); }} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                  <input
                    type="text"
                    required
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="Escriba palabra para definir..."
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-stone-800 hover:border-stone-700 focus:border-amber-500/50 rounded-xl text-sm text-stone-200 placeholder-stone-600 focus:outline-none transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-900/20 shrink-0 font-mono uppercase tracking-wider"
                >
                  {loading ? 'Consultando...' : 'Definir'}
                </button>
              </form>
            </div>
          </div>

          {/* History Panel */}
          <div className="p-6 rounded-xl bg-[#1C120C] border border-stone-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold tracking-wider text-stone-400 font-mono uppercase flex items-center gap-2">
                  <History size={16} />
                  Historial de búsquedas
                </h3>
                {generalHistory.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] font-bold text-stone-500 hover:text-amber-500 font-mono uppercase tracking-wider flex items-center gap-1"
                  >
                    <RotateCcw size={10} />
                    Limpiar
                  </button>
                )}
              </div>

              {generalHistory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {generalHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setWord(item.word); handleGeneralSearch(item.word, item.mode); }}
                      className="px-3 py-1.5 rounded-lg bg-[#221510] hover:bg-[#2A1A14] border border-stone-800 hover:border-stone-700 text-xs text-stone-300 font-mono transition-all flex items-center gap-1.5"
                    >
                      {item.word}
                      <ArrowRight size={10} className="text-stone-500" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-600 font-mono italic">No hay consultas recientes.</p>
              )}
            </div>
          </div>

          {/* Search Result Display */}
          <div className="lg:col-span-3 mt-6">
            {definitionResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="md:col-span-2 p-8 rounded-2xl bg-[#1C120C] border border-stone-800 relative shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-6">
                    <h2 className="text-4xl font-extrabold text-white tracking-tight capitalize">
                      {definitionResult.word}
                    </h2>
                    {definitionResult.category && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold font-mono text-amber-500 uppercase">
                        {definitionResult.category}
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {definitionResult.meanings && definitionResult.meanings.length > 0 ? (
                      definitionResult.meanings.map((meaning, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          <span className="w-6 h-6 rounded-full bg-[#2A1810] text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 font-mono border border-amber-500/10">
                            {index + 1}
                          </span>
                          <p className="text-stone-300 text-sm leading-relaxed font-mono">
                            {meaning}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-stone-500 text-sm font-mono">No se encontraron significados.</p>
                    )}
                  </div>

                  {/* Examples */}
                  {definitionResult.examples && definitionResult.examples.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-stone-800/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 font-mono mb-4 flex items-center gap-1.5">
                        <Bookmark size={14} className="text-amber-500/40" />
                        Ejemplos prácticos
                      </h4>
                      <div className="space-y-3">
                        {definitionResult.examples.map((ex, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-black/20 border border-stone-900/60 font-mono text-xs text-stone-400 italic">
                            "{ex}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Synonyms & Antonyms Side Panel */}
                <div className="space-y-6">
                  {definitionResult.synonyms && definitionResult.synonyms.length > 0 && (
                    <div className="p-6 rounded-xl bg-gradient-to-b from-[#221712] to-[#1C120C] border border-stone-800">
                      <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono uppercase mb-4 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        Sinónimos
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {definitionResult.synonyms.map((syn, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setWord(syn); handleGeneralSearch(syn, 'definition'); }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/50 text-xs text-cyan-300 font-semibold font-mono"
                          >
                            {syn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {definitionResult.antonyms && definitionResult.antonyms.length > 0 && (
                    <div className="p-6 rounded-xl bg-gradient-to-b from-[#221712] to-[#1C120C] border border-stone-800">
                      <h3 className="text-sm font-bold tracking-wider text-rose-400 font-mono uppercase mb-4 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Antónimos
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {definitionResult.antonyms.map((ant, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setWord(ant); handleGeneralSearch(ant, 'definition'); }}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/50 text-xs text-rose-300 font-semibold font-mono"
                          >
                            {ant}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-black/40 border border-stone-800 text-center flex flex-col items-center justify-center">
                    <BookOpen className="text-amber-500/40 mb-2 animate-pulse" size={24} />
                    <p className="text-[10px] text-stone-500 font-mono uppercase leading-snug">
                      Base lexicográfica RAE oficial con respaldo API
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: VERB CONJUGATOR (PRESERVED PREVIOUS BEHAVIORS) */}
      {activeTab === 'conjugation' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#221510] border border-stone-800 flex flex-col justify-between min-h-[160px]">
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="text-amber-500" size={18} />
                Conjugador Verbal Integrado
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); handleGeneralSearch(undefined, 'conjugation'); }} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                  <input
                    type="text"
                    required
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="Escriba un verbo en infinitivo (ej. Escribir, Redactar)..."
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-stone-800 hover:border-stone-700 focus:border-amber-500/50 rounded-xl text-sm text-stone-200 placeholder-stone-600 focus:outline-none transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-900/20 shrink-0 font-mono uppercase tracking-wider"
                >
                  {loading ? 'Analizando...' : 'Conjugar'}
                </button>
              </form>
            </div>
          </div>

          {/* Conjugation Grids */}
          {conjugationResult && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl bg-[#1C120C] border border-stone-800">
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-6">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight capitalize">
                    {conjugationResult.verb}
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold font-mono text-emerald-500 uppercase">
                    Modelos Verbales RAE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-black/30 border border-stone-800/60 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] flex items-center justify-center font-bold text-amber-500 text-xs font-mono border border-amber-500/10">INF</div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-mono uppercase">Infinitivo</p>
                      <p className="text-sm font-bold text-stone-200 capitalize font-mono">{conjugationResult.infinitive || '-'}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-stone-800/60 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] flex items-center justify-center font-bold text-amber-500 text-xs font-mono border border-amber-500/10">GER</div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-mono uppercase">Gerundio</p>
                      <p className="text-sm font-bold text-stone-200 capitalize font-mono">{conjugationResult.gerund || '-'}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-stone-800/60 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] flex items-center justify-center font-bold text-amber-500 text-xs font-mono border border-amber-500/10">PAR</div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-mono uppercase">Participio</p>
                      <p className="text-sm font-bold text-stone-200 capitalize font-mono">{conjugationResult.participle || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Presente Indicativo */}
                {conjugationResult.indicativePresent && (
                  <div className="p-5 rounded-xl bg-[#1C120C] border border-stone-800">
                    <h3 className="text-sm font-bold tracking-wider text-amber-500 font-mono uppercase mb-4 border-b border-stone-800 pb-2">
                      Presente de Indicativo
                    </h3>
                    <div className="space-y-2.5">
                      {conjugationResult.indicativePresent.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-xs border-b border-stone-900/50">
                          <span className="text-stone-500">{PRONOUNS[idx] || ''}</span>
                          <span className="text-stone-100 font-bold capitalize">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pretérito Perfecto Simple */}
                {conjugationResult.indicativePastPerfect && (
                  <div className="p-5 rounded-xl bg-[#1C120C] border border-stone-800">
                    <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono uppercase mb-4 border-b border-stone-800 pb-2">
                      Pretérito Perfecto Simple
                    </h3>
                    <div className="space-y-2.5">
                      {conjugationResult.indicativePastPerfect.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-xs border-b border-stone-900/50">
                          <span className="text-stone-500">{PRONOUNS[idx] || ''}</span>
                          <span className="text-stone-100 font-bold capitalize">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pretérito Imperfecto */}
                {conjugationResult.indicativeImperfect && (
                  <div className="p-5 rounded-xl bg-[#1C120C] border border-stone-800">
                    <h3 className="text-sm font-bold tracking-wider text-emerald-400 font-mono uppercase mb-4 border-b border-stone-800 pb-2">
                      Pretérito Imperfecto
                    </h3>
                    <div className="space-y-2.5">
                      {conjugationResult.indicativeImperfect.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-xs border-b border-stone-900/50">
                          <span className="text-stone-500">{PRONOUNS[idx] || ''}</span>
                          <span className="text-stone-100 font-bold capitalize">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Futuro de Indicativo */}
                {conjugationResult.indicativeFuture && (
                  <div className="p-5 rounded-xl bg-[#1C120C] border border-stone-800">
                    <h3 className="text-sm font-bold tracking-wider text-purple-400 font-mono uppercase mb-4 border-b border-stone-800 pb-2">
                      Futuro Simple
                    </h3>
                    <div className="space-y-2.5">
                      {conjugationResult.indicativeFuture.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-xs border-b border-stone-900/50">
                          <span className="text-stone-500">{PRONOUNS[idx] || ''}</span>
                          <span className="text-stone-100 font-bold capitalize">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Presente de Subjuntivo */}
                {conjugationResult.subjunctivePresent && (
                  <div className="p-5 rounded-xl bg-[#1C120C] border border-stone-800">
                    <h3 className="text-sm font-bold tracking-wider text-[#9E7649] font-mono uppercase mb-4 border-b border-stone-800 pb-2">
                      Presente de Subjuntivo
                    </h3>
                    <div className="space-y-2.5">
                      {conjugationResult.subjunctivePresent.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-xs border-b border-stone-900/50">
                          <span className="text-stone-500">{PRONOUNS[idx] || ''}</span>
                          <span className="text-stone-100 font-bold capitalize">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Imperativo */}
                {conjugationResult.imperative && (
                  <div className="p-5 rounded-xl bg-[#1C120C] border border-stone-800">
                    <h3 className="text-sm font-bold tracking-wider text-rose-400 font-mono uppercase mb-4 border-b border-stone-800 pb-2">
                      Imperativo Afirmativo
                    </h3>
                    <div className="space-y-2.5">
                      {conjugationResult.imperative.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-xs border-b border-stone-900/50">
                          <span className="text-stone-500">{IMPERATIVE_PRONOUNS[idx] || ''}</span>
                          <span className="text-stone-100 font-bold capitalize">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Initial state screen when no queries are made */}
      {activeTab !== 'radial' && !definitionResult && !conjugationResult && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 p-12 rounded-2xl border border-stone-800 bg-black/20 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[#2A1810]/60 flex items-center justify-center mb-6 border border-stone-800">
            <Sparkles className="text-amber-500 animate-pulse" size={30} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">Asistente Lingüístico Integrado</h3>
          <p className="text-stone-400 max-w-md text-xs font-mono leading-relaxed">
            Consulte términos de la RAE con sinónimos, antónimos, ejemplos prácticos y la conjugación en todos los tiempos verbales.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-md">
            <button 
              onClick={() => { setWord('Elocuente'); handleGeneralSearch('Elocuente', 'definition'); }}
              className="p-3 rounded-xl bg-[#221510] border border-stone-800 text-stone-400 hover:text-amber-500 hover:border-amber-500/30 text-xs font-mono transition-all text-left"
            >
              <p className="text-stone-500 text-[9px] uppercase mb-1">Ejemplo de Búsqueda</p>
              <strong>Elocuente</strong>
            </button>
            <button 
              onClick={() => { setWord('Escribir'); handleGeneralSearch('Escribir', 'conjugation'); }}
              className="p-3 rounded-xl bg-[#221510] border border-stone-800 text-stone-400 hover:text-amber-500 hover:border-amber-500/30 text-xs font-mono transition-all text-left"
            >
              <p className="text-stone-500 text-[9px] uppercase mb-1">Ejemplo de Conjugación</p>
              <strong>Escribir</strong>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DiccionarioTool;
