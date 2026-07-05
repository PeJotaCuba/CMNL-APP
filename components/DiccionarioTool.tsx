import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiccionarioToolProps {
  onBack: () => void;
  currentUser: any;
}

interface DefinitionResult {
  word: string;
  category: string;
  meanings: string[];
  synonyms: string[];
  antonyms: string[];
  examples: string[];
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

const DiccionarioTool: React.FC<DiccionarioToolProps> = ({ onBack, currentUser }) => {
  const [word, setWord] = useState('');
  const [mode, setMode] = useState<'definition' | 'conjugation'>('definition');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [definitionResult, setDefinitionResult] = useState<DefinitionResult | null>(null);
  const [conjugationResult, setConjugationResult] = useState<ConjugationResult | null>(null);
  const [history, setHistory] = useState<Array<{ word: string, mode: 'definition' | 'conjugation' }>>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('rcm_dictionary_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const addToHistory = (newWord: string, searchMode: 'definition' | 'conjugation') => {
    const sanitized = newWord.trim();
    if (!sanitized) return;

    setHistory(prev => {
      // Remove existing item if same word + mode
      const filtered = prev.filter(item => !(item.word.toLowerCase() === sanitized.toLowerCase() && item.mode === searchMode));
      // Add to front, limit to 8 items
      const updated = [{ word: sanitized, mode: searchMode }, ...filtered].slice(0, 8);
      localStorage.setItem('rcm_dictionary_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('rcm_dictionary_history');
  };

  const handleSearch = async (searchWord?: string, searchMode?: 'definition' | 'conjugation') => {
    const targetWord = (searchWord || word).trim();
    const targetMode = searchMode || mode;

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

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header Panel */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-[#2A1810] to-[#1A0F0A] border border-stone-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <BookOpen size={160} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="text-amber-500" />
              Diccionario Inteligente
            </h1>
            <p className="text-stone-400 mt-1 max-w-2xl font-mono text-sm leading-relaxed">
              Consulte definiciones, sinónimos, antónimos y obtenga conjugaciones completas en tiempo real apoyado por inteligencia artificial.
            </p>
          </div>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-stone-900 border border-stone-700 hover:border-amber-500/50 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl transition-all text-sm font-semibold flex items-center gap-2"
          >
            ← Volver a Herramientas
          </button>
        </div>
      </div>

      {/* Mode Switches & Input Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 p-6 rounded-xl bg-[#221510] border border-stone-800 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Compass className="text-amber-500" size={18} />
              ¿Qué desea buscar hoy?
            </h2>

            {/* Mode Tabs */}
            <div className="flex gap-2 p-1 bg-black/40 rounded-lg mb-6">
              <button
                onClick={() => { setMode('definition'); setError(null); }}
                className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  mode === 'definition' 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30' 
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <FileText size={16} />
                Búsqueda General
              </button>
              <button
                onClick={() => { setMode('conjugation'); setError(null); }}
                className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  mode === 'conjugation' 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30' 
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Layers size={16} />
                Conjugación Verbal
              </button>
            </div>

            {/* Input & Action */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder={mode === 'definition' ? 'Escriba una palabra... (ej: Elocuente)' : 'Escriba un verbo... (ej: Escribir)'}
                  className="w-full pl-11 pr-4 py-3 bg-black/50 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-[#E8DCCF] placeholder-stone-600 outline-none text-base transition-all font-mono"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !word.trim()}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-950/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Buscando...' : 'Buscar'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Search History Panel */}
        <div className="p-6 rounded-xl bg-[#221510] border border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="text-amber-500" size={18} />
                Historial Reciente
              </h2>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-xs text-stone-500 hover:text-amber-500 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  Limpiar
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bookmark className="text-stone-700 mb-2" size={32} />
                <p className="text-xs text-stone-500 font-mono">No hay búsquedas recientes.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setWord(item.word);
                      setMode(item.mode);
                      handleSearch(item.word, item.mode);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-amber-500/10 border border-stone-800 hover:border-amber-500/30 text-xs text-stone-400 hover:text-white transition-all font-mono flex items-center gap-1.5"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.mode === 'definition' ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
                    {item.word}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/40 text-[10px] text-stone-500 font-mono flex justify-between">
            <span>● Definición (Celeste)</span>
            <span>● Conjugación (Verde)</span>
          </div>
        </div>
      </div>

      {/* Main Results Board */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {/* Loading state */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-stone-300 font-bold font-mono text-sm">Consultando al filólogo digital...</p>
              <p className="text-stone-500 text-xs font-mono mt-1 max-w-sm">
                Procesando raíces morfológicas y analizando la estructura sintáctica de la palabra.
              </p>
            </motion.div>
          )}

          {/* Error state */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 flex items-start gap-4 mb-8"
            >
              <AlertTriangle size={24} className="shrink-0 text-red-500 mt-1" />
              <div>
                <h3 className="font-bold text-red-200">Error de consulta</h3>
                <p className="text-sm text-red-300/80 mt-1">{error}</p>
                <div className="mt-4 text-xs font-mono bg-black/40 p-2.5 rounded border border-red-900/20 text-stone-500">
                  Asegúrese de contar con una API Key de Gemini configurada.
                </div>
              </div>
            </motion.div>
          )}

          {/* Definition Result Component */}
          {definitionResult && mode === 'definition' && !loading && (
            <motion.div
              key="definition-result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Meaning & Definitions */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-8 rounded-xl bg-[#1C120C] border border-stone-800 shadow-xl shadow-black/20">
                  <div className="flex flex-wrap items-baseline gap-3 mb-6">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight capitalize">{definitionResult.word}</h2>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold font-mono text-amber-500 uppercase">
                      {definitionResult.category}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold tracking-wider text-stone-500 font-mono uppercase mb-4">Acepciones y Significados</h3>
                  <ol className="space-y-4">
                    {definitionResult.meanings && definitionResult.meanings.map((meaning, idx) => (
                      <li key={idx} className="flex gap-4 items-start text-stone-200">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-amber-950/40 text-amber-500 font-mono text-xs flex items-center justify-center border border-amber-500/20">
                          {idx + 1}
                        </span>
                        <p className="text-base leading-relaxed pt-0.5">{meaning}</p>
                      </li>
                    ))}
                    {(!definitionResult.meanings || definitionResult.meanings.length === 0) && (
                      <p className="text-sm text-stone-500 font-mono italic">No se devolvieron definiciones.</p>
                    )}
                  </ol>
                </div>

                {/* Examples */}
                <div className="p-6 rounded-xl bg-[#1C120C] border border-stone-800">
                  <h3 className="text-xs font-bold tracking-wider text-stone-500 font-mono uppercase mb-4 flex items-center gap-2">
                    <Quote size={14} className="text-amber-500" />
                    Ejemplos de uso
                  </h3>
                  <div className="space-y-3">
                    {definitionResult.examples && definitionResult.examples.map((example, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-black/20 border border-stone-800/40 italic text-stone-300 text-sm leading-relaxed font-serif">
                        "{example}"
                      </div>
                    ))}
                    {(!definitionResult.examples || definitionResult.examples.length === 0) && (
                      <p className="text-sm text-stone-500 font-mono italic">No se incluyeron ejemplos de uso.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Synonyms & Antonyms Side Panels */}
              <div className="space-y-6">
                {/* Synonyms */}
                <div className="p-6 rounded-xl bg-gradient-to-b from-[#221712] to-[#1C120C] border border-stone-800">
                  <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono uppercase mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    Sinónimos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {definitionResult.synonyms && definitionResult.synonyms.map((syn, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setWord(syn); handleSearch(syn, 'definition'); }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-505/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/50 text-xs text-cyan-300 font-semibold transition-all hover:-translate-y-0.5"
                      >
                        {syn}
                      </button>
                    ))}
                    {(!definitionResult.synonyms || definitionResult.synonyms.length === 0) && (
                      <p className="text-xs text-stone-500 font-mono italic">No se encontraron sinónimos.</p>
                    )}
                  </div>
                </div>

                {/* Antonyms */}
                <div className="p-6 rounded-xl bg-gradient-to-b from-[#221712] to-[#1C120C] border border-stone-800">
                  <h3 className="text-sm font-bold tracking-wider text-rose-400 font-mono uppercase mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Antónimos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {definitionResult.antonyms && definitionResult.antonyms.map((ant, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setWord(ant); handleSearch(ant, 'definition'); }}
                        className="px-3 py-1.5 rounded-lg bg-rose-505/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/50 text-xs text-rose-300 font-semibold transition-all hover:-translate-y-0.5"
                      >
                        {ant}
                      </button>
                    ))}
                    {(!definitionResult.antonyms || definitionResult.antonyms.length === 0) && (
                      <p className="text-xs text-stone-500 font-mono italic">No se encontraron antónimos.</p>
                    )}
                  </div>
                </div>

                {/* AI Validation Credit Badge */}
                <div className="p-4 rounded-xl bg-black/40 border border-stone-800 text-center flex flex-col items-center justify-center">
                  <Sparkles className="text-amber-500/40 mb-2 animate-pulse" size={24} />
                  <p className="text-[10px] text-stone-500 font-mono uppercase leading-snug">
                    Sincronizado vía Real Academia de la Inteligencia
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Conjugation Result Component */}
          {conjugationResult && mode === 'conjugation' && !loading && (
            <motion.div
              key="conjugation-result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Verb Main Banner */}
              <div className="p-6 rounded-xl bg-[#1C120C] border border-stone-800">
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-6">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight capitalize flex items-center gap-3">
                    {conjugationResult.verb}
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold font-mono text-emerald-500 uppercase">
                    Modelo de Conjugación Regular/Irregular
                  </span>
                </div>

                {/* Verbal Forms Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-black/30 border border-stone-800/60 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] flex items-center justify-center font-bold text-amber-500 text-xs font-mono border border-amber-500/10">INF</div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-mono uppercase">Infinitivo</p>
                      <p className="text-base font-bold text-stone-200 capitalize font-mono">{conjugationResult.infinitive || '-'}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-stone-800/60 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] flex items-center justify-center font-bold text-amber-500 text-xs font-mono border border-amber-500/10">GER</div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-mono uppercase">Gerundio</p>
                      <p className="text-base font-bold text-stone-200 capitalize font-mono">{conjugationResult.gerund || '-'}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-stone-800/60 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] flex items-center justify-center font-bold text-amber-500 text-xs font-mono border border-amber-500/10">PAR</div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-mono uppercase">Participio</p>
                      <p className="text-base font-bold text-stone-200 capitalize font-mono">{conjugationResult.participle || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conjugation Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Presente Indicativo */}
                {conjugationResult.indicativePresent && (
                  <div className="p-5 rounded-xl bg-[#1C120C] border border-stone-800">
                    <h3 className="text-sm font-bold tracking-wider text-amber-500 font-mono uppercase mb-4 border-b border-stone-800 pb-2">
                      Presente de Indicativo
                    </h3>
                    <div className="space-y-2.5">
                      {conjugationResult.indicativePresent.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-sm border-b border-stone-900/50">
                          <span className="text-stone-500 text-xs">{PRONOUNS[idx] || ''}</span>
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
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-sm border-b border-stone-900/50">
                          <span className="text-stone-500 text-xs">{PRONOUNS[idx] || ''}</span>
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
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-sm border-b border-stone-900/50">
                          <span className="text-stone-500 text-xs">{PRONOUNS[idx] || ''}</span>
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
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-sm border-b border-stone-900/50">
                          <span className="text-stone-500 text-xs">{PRONOUNS[idx] || ''}</span>
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
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-sm border-b border-stone-900/50">
                          <span className="text-stone-500 text-xs">{PRONOUNS[idx] || ''}</span>
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
                        <div key={idx} className="flex justify-between items-center py-1 font-mono text-sm border-b border-stone-900/50">
                          <span className="text-stone-500 text-xs">{IMPERATIVE_PRONOUNS[idx] || ''}</span>
                          <span className="text-stone-100 font-bold capitalize">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Initial Clean Placeholder Screen */}
          {!definitionResult && !conjugationResult && !loading && !error && (
            <motion.div
              key="clean-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-12 rounded-2xl border border-stone-800/60 bg-black/20 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-[#2A1810]/60 flex items-center justify-center mb-6 border border-stone-700/50">
                <Sparkles className="text-amber-500" size={36} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Su compañero lingüístico digital</h3>
              <p className="text-stone-400 max-w-md text-sm font-mono leading-relaxed">
                Escriba una palabra en el buscador para analizar su morfología, semántica o conjugaciones. Ideal para redactores, asesores y guionistas.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-md">
                <button 
                  onClick={() => { setWord('Elocuente'); setMode('definition'); handleSearch('Elocuente', 'definition'); }}
                  className="p-3 rounded-xl bg-[#221510] border border-stone-800 text-stone-400 hover:text-amber-500 hover:border-amber-500/30 text-xs font-mono transition-all text-left"
                >
                  <p className="text-stone-500 text-[10px] uppercase mb-1">Definición de ejemplo</p>
                  <strong>Elocuente</strong>
                </button>
                <button 
                  onClick={() => { setWord('Redactar'); setMode('conjugation'); handleSearch('Redactar', 'conjugation'); }}
                  className="p-3 rounded-xl bg-[#221510] border border-stone-800 text-stone-400 hover:text-amber-500 hover:border-amber-500/30 text-xs font-mono transition-all text-left"
                >
                  <p className="text-stone-500 text-[10px] uppercase mb-1">Conjugación de ejemplo</p>
                  <strong>Redactar</strong>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DiccionarioTool;
