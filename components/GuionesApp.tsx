import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Script } from '../types';
import CMNLHeader from './CMNLHeader';
import { FileStack, ChevronLeft, Search, Radio, Music, BookOpen, Users, Leaf, Newspaper, Home, Activity, Palette, Upload, Database, FileText, X, Plus, Wand2, Trash2, Edit2, BarChart3, Calendar, Filter, ChevronRight, FileDown, List, AlertCircle, AlertTriangle, UserX, Tag, User as UserIcon, Shield, Sun, Sparkles, MessagesSquare, Heart, Headphones, Smile, History, MapPin, Disc } from 'lucide-react';
import { StatsView } from './StatsView';
import * as XLSX from 'xlsx-js-style';
import { juanaPorDentroData } from '../utils/juanaPorDentroData';

export const isDateStringMatchingMonth = (dateStr: string, monthIdx: number): boolean => {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const d = parseSpanishDate(dateStr);
    if (!isNaN(d.getTime())) {
        return d.getMonth() === monthIdx;
    }
    return false;
};

export const parseSpanishDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
    
    const str = dateStr.toLowerCase().trim();

    // 1. Check for YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1;
        const day = parseInt(ymdMatch[3], 10);
        return new Date(year, month, day);
    }

    // 2. Check for DD/MM/YYYY or DD/MM/YY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
        const p1 = parseInt(dmyMatch[1], 10);
        const p2 = parseInt(dmyMatch[2], 10);
        let p3 = parseInt(dmyMatch[3], 10);
        
        // Handle 2-digit year (assume 20xx)
        if (p3 < 100) p3 += 2000;
        
        // If p2 > 12, it must be MM/DD/YYYY
        if (p2 > 12) {
            return new Date(p3, p1 - 1, p2);
        }
        // Otherwise assume DD/MM/YYYY (Spanish standard)
        return new Date(p3, p2 - 1, p1);
    }

    // 3. Check for MM/YYYY or MM-YYYY
    const myMatch = str.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (myMatch) {
        const month = parseInt(myMatch[1], 10) - 1;
        const year = parseInt(myMatch[2], 10);
        return new Date(year, month, 1);
    }
    
    // 4. Check for Spanish month names
    const months: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
    };

    let day = 1;
    let month = -1;
    let year = new Date().getFullYear();
    let hasExplicitYear = false;

    const yearMatch = str.match(/\b(20\d{2})\b/);
    if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
        hasExplicitYear = true;
    } else {
        // Try to match a trailing 2-digit year like "de 20", "del 20", "/20", "-20", ", 20", " 20"
        const year2DigitMatch = str.match(/(?:de|del|\/|\-|\s)\s*([1-9]\d)\b\s*$/) || str.match(/\s+([1-9]\d)\b\s*$/);
        if (year2DigitMatch) {
            const yr = parseInt(year2DigitMatch[1], 10);
            if (yr >= 15 && yr <= 99) {
                year = 2000 + yr;
                hasExplicitYear = true;
            }
        }
    }

    const strWithoutYear = yearMatch ? str.replace(yearMatch[0], '') : str;
    const dayMatch = strWithoutYear.match(/\b(\d{1,2})\b/);
    if (dayMatch) day = parseInt(dayMatch[1], 10);

    for (const [mName, mIndex] of Object.entries(months)) {
        // Use word boundaries so 'mar' doesn't match 'martes'
        const regex = new RegExp(`\\b${mName}\\b`, 'i');
        if (regex.test(str)) {
            month = mIndex;
            break;
        }
    }

    if (month !== -1) {
        if (!hasExplicitYear) {
            const today = new Date();
            const currentYear = today.getFullYear();
            
            // Just use current year by default. If it falls in the future, subtract 1 year.
            let testDate = new Date(year, month, day);
            if (testDate > today) {
                year--;
            }
        }
        return new Date(year, month, day);
    }

    // 5. Fallback to standard parse
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    return new Date(NaN);
};

export const formatSpanishDate = (dateStr: string): string => {
    const d = parseSpanishDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const getSimilarity = (s1: string, s2: string): number => {
    const str1 = (s1 || '').trim().toLowerCase();
    const str2 = (s2 || '').trim().toLowerCase();
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,    // deletion
                    matrix[i][j - 1] + 1,    // insertion
                    matrix[i - 1][j - 1] + 1 // substitution
                );
            }
        }
    }
    
    const distance = matrix[len1][len2];
    return 1.0 - distance / maxLen;
};

export const sanitizeScriptProperty = (val: string): string => {
    if (!val || typeof val !== 'string') return '';
    let res = val.toUpperCase().trim();
    // Remove any punctuation at the end of the string
    res = res.replace(/[.,:;!?\-_]+$/, '').trim();
    // Remove symbols and punctuation throughout, keeping alphanumeric and spaces (with Spanish accents support)
    res = res.replace(/[^A-Z0-9ÁÉÍÓÚÑÜ\s]/gi, '');
    res = res.replace(/\s+/g, ' ').trim();
    return res;
};

export const getNormalizedDateString = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    let str = dateStr.toLowerCase().trim();
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
    str = str.replace(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/gi, '');
    str = str.replace(/\b(de|del)\b/gi, ' ');
    str = str.replace(/(\d+)([a-z]+)/gi, '$1 $2');
    str = str.replace(/([a-z]+)(\d+)/gi, '$1 $2');
    str = str.replace(/\s+/g, ' ').trim();

    const d = parseSpanishDate(str);
    if (!d || isNaN(d.getTime())) return dateStr.toUpperCase().trim();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const convertDateToSpanishFull = (dateStr: string): string => {
    if (!dateStr) return '';
    // If the input is in format YYYY-MM-DD
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
            const daysOfWeek = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
            const monthsOfYear = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            return `${daysOfWeek[d.getDay()]} ${day} DE ${monthsOfYear[month]} DE ${year}`;
        }
    }
    // If we can parse it from another format
    const parsed = parseSpanishDate(dateStr);
    if (!isNaN(parsed.getTime())) {
        const daysOfWeek = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
        const monthsOfYear = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        return `${daysOfWeek[parsed.getDay()]} ${parsed.getDate()} DE ${monthsOfYear[parsed.getMonth()]} DE ${parsed.getFullYear()}`;
    }
    return dateStr.toUpperCase().trim();
};

export const convertSpanishFullToDateInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = parseSpanishDate(dateStr);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const sanitizeScript = (s: Script): Script => {
    const cleanWriter = sanitizeScriptProperty(s.writer || 'DESCONOCIDO');
    const cleanAdvisor = sanitizeScriptProperty(s.advisor || 'NO ESPECIFICADO');
    const cleanTitle = sanitizeScriptProperty(s.title || 'SIN TITULO');
    const cleanDate = convertDateToSpanishFull(s.dateAdded || '');
    const cleanThemes = Array.isArray(s.themes) 
        ? s.themes.map(t => sanitizeScriptProperty(t)) 
        : [cleanTitle];

    return {
        ...s,
        writer: cleanWriter,
        advisor: cleanAdvisor,
        title: cleanTitle,
        dateAdded: cleanDate,
        themes: cleanThemes
    };
};

export const getProgramScriptsStandalone = (progFile: string): Script[] => {
    const key = `guionbd_data_${progFile}`;
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    try {
        const rawScripts: Script[] = JSON.parse(saved);
        const valid = rawScripts.filter(s => {
            const hasDate = isValidScriptDate(s.dateAdded);
            const hasTheme = isValidScriptTheme(s.themes || s.title);
            const hasWriter = isValidScriptWriter(s.writer);
            const hasAdvisor = isValidScriptAdvisor(s.advisor);
            return hasDate && hasTheme && hasWriter && hasAdvisor;
        });
        const sanitized = valid.map(s => sanitizeScript(s));
        const unique: Script[] = [];
        const seenDates = new Set<string>();
        for (const s of sanitized) {
            const normDate = getNormalizedDateString(s.dateAdded);
            if (!seenDates.has(normDate)) {
                seenDates.add(normDate);
                unique.push(s);
            }
        }
        return unique;
    } catch (e) {
        return [];
    }
};

export const isValidScriptDate = (dateStr: any): boolean => {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const str = dateStr.trim().toLowerCase();
    if (!str) return false;

    // Reject things that are definitely not dates
    if (
        str.includes('archivo') || 
        str.includes('escribe') || 
        str.includes('sin fecha') || 
        str.includes('escribir') || 
        str.includes('director') || 
        str.includes('coordinador') ||
        str.includes('locutor') ||
        str.includes('audio') ||
        str.includes('grabacion') ||
        str.includes('grabación') ||
        str.includes('seccion') ||
        str.includes('sección')
    ) {
        return false;
    }

    // Must have digits OR Spanish months
    const SpanishMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    const hasMonthWord = SpanishMonths.some(m => str.includes(m));
    const hasDigits = /\d+/.test(str);
    
    if (!hasDigits && !hasMonthWord) {
        return false;
    }

    if (str.length > 50) return false;
    
    return true;
};

export const isValidScriptTheme = (theme: any): boolean => {
    if (!theme) return false;
    let text = '';
    if (Array.isArray(theme)) {
        if (theme.length === 0) return false;
        text = theme.join('').trim().toLowerCase();
    } else if (typeof theme === 'string') {
        text = theme.trim().toLowerCase();
    } else {
        return false;
    }
    
    if (!text) return false;
    if (
        text === 'general' || 
        text.includes('no especificado') || 
        text.includes('sin tema') || 
        text.includes('desconocido') ||
        text === 'sin título' ||
        text === 'sin titulo'
    ) {
        return false;
    }
    
    return true;
};

export const isValidScriptWriter = (writer: any): boolean => {
    if (!writer || typeof writer !== 'string') return false;
    const str = writer.trim().toLowerCase();
    if (!str) return false;
    if (
        str === 'desconocido' || 
        str === 'no especificado' || 
        str === 'sin escritor' || 
        str === 'sin autor' ||
        str.includes('desconocid') ||
        str.includes('no especificad')
    ) {
        return false;
    }
    return true;
};

export const isValidScriptAdvisor = (advisor: any): boolean => {
    if (!advisor || typeof advisor !== 'string') return false;
    const str = advisor.trim().toLowerCase();
    if (!str) return false;
    if (
        str === 'desconocido' || 
        str === 'no especificado' || 
        str === 'sin asesor' || 
        str.includes('desconocid') ||
        str.includes('no especificad')
    ) {
        return false;
    }
    return true;
};

export const PROGRAMS = [
  { name: "BUENOS DÍAS BAYAMO", file: "bdias.json", color: "bg-amber-500", icon: <Activity size={32} /> },
  { name: "TODOS EN CASA", file: "casa.json", color: "bg-indigo-500", icon: <Home size={32} /> },
  { name: "RCM NOTICIAS", file: "noticias.json", color: "bg-red-600", icon: <Newspaper size={32} /> },
  { name: "ARTE BAYAMO", file: "arte.json", color: "bg-teal-500", icon: <Palette size={32} /> },
  { name: "PARADA JOVEN", file: "joven.json", color: "bg-cyan-500", icon: <Radio size={32} /> },
  { name: "HABLANDO CON JUANA", file: "juana.json", color: "bg-rose-500", icon: <Users size={32} /> },
  { name: "SIGUE A TU RITMO", file: "ritmo.json", color: "bg-orange-500", icon: <Music size={32} /> },
  { name: "AL SON DE LA RADIO", file: "son.json", color: "bg-violet-500", icon: <Music size={32} /> },
  { name: "CÓMPLICES", file: "complices.json", color: "bg-pink-500", icon: <Users size={32} /> },
  { name: "ESTACIÓN 95.3", file: "estacion.json", color: "bg-blue-600", icon: <Radio size={32} /> },
  { name: "PALCO DE DOMINGO", file: "domingo.json", color: "bg-fuchsia-500", icon: <BookOpen size={32} /> },
  { name: "COLOREANDO MELODÍAS", file: "melodias.json", color: "bg-lime-500", icon: <Palette size={32} /> },
  { name: "ALBA Y CRISOL", file: "alba.json", color: "bg-emerald-500", icon: <Leaf size={32} /> },
  { name: "DESDE EL BARRIO", file: "barrio.json", color: "bg-slate-600", icon: <Home size={32} /> },
  { name: "MÚSICA DESDE MI CIUDAD", file: "musica.json", color: "bg-indigo-600", icon: <Music size={32} /> },
];

interface GuionesAppProps {
    currentUser: User | null;
    onBack: () => void;
    onMenuClick?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
}

const parseRawEntry = (raw: string): Script | null => {
  if (!raw.trim()) return null;
  raw = raw.replace(/\x0B/g, '\n');
  
  const extract = (key: string) => {
    const regex = new RegExp(`${key}\\s*(.*?)(?=\\n(?:Programa|Fecha|Escritor|Asesor|Tema|Temas|Título|Titular|Autor):|$)`, 'is');
    const match = raw.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const title = extract('Título:') || extract('Titular:') || extract('Tema:') || extract('Temas:') || 'Sin título';
  const writer = extract('Escritor:') || extract('Autor:') || 'Desconocido';
  const advisor = extract('Asesor:') || 'No especificado';
  const dateAdded = extract('Fecha:');
  const themesStr = extract('Temas:') || extract('Tema:') || extract('Temáticas:') || extract('Temática:');
  const themes = themesStr ? themesStr.split(/[,;]/).map(t => t.trim()).filter(t => t) : ['General'];
  const genre = extract('Programa:') || extract('Género:') || 'Desconocido';

  return {
    id: Date.now().toString() + Math.random().toString(),
    title,
    writer,
    advisor,
    dateAdded,
    themes,
    genre,
    content: raw
  };
};

const GuionesApp: React.FC<GuionesAppProps> = ({ currentUser, onBack, onMenuClick, onDirtyChange }) => {
    const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showStats, setShowStats] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const globalUploadRef = useRef<HTMLInputElement>(null);

    const isFullAdmin = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.classification === 'Administrador' || (currentUser.role === 'admin' && currentUser.classification !== 'Coordinador');
    }, [currentUser]);

    const canModify = useMemo(() => {
        if (!currentUser) return false;
        return isFullAdmin || (currentUser.classification === 'Coordinador' && (currentUser.coordinatorSections || []).includes('Guiones'));
    }, [currentUser, isFullAdmin]);

    // Nuevos estados para ProgramDetail
    const [showBalance, setShowBalance] = useState(false);
    const [balanceStep, setBalanceStep] = useState<'config' | 'results'>('config');
    const [balanceYear, setBalanceYear] = useState('Todos');

    // Hash Navigation Logic
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash === '#stats') {
                setShowStats(true);
                setSelectedProgram(null);
            } else if (hash.startsWith('#program-')) {
                const programId = decodeURIComponent(hash.replace('#program-', ''));
                setSelectedProgram(programId);
                setShowStats(false);
            } else {
                setShowStats(false);
                setSelectedProgram(null);
            }
        };

        if (!window.location.hash) {
             window.history.replaceState(null, '', '#menu');
        } else {
            handleHashChange();
        }

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Sync state to hash
    useEffect(() => {
        let targetHash = '#menu';
        if (showStats) targetHash = '#stats';
        else if (selectedProgram) targetHash = `#program-${encodeURIComponent(selectedProgram)}`;

        if (window.location.hash !== targetHash) {
            window.location.hash = targetHash;
        }
    }, [showStats, selectedProgram]);
    const [balanceMonth, setBalanceMonth] = useState('Todos');
    const [balanceSearch, setBalanceSearch] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);
    const [importReport, setImportReport] = useState<{ total: number; loaded: number; rejected: { title: string; genre: string; reason: string }[] } | null>(null);
    const [pulirMode, setPulirMode] = useState<'replace' | 'homologate'>('replace');
    const [homologarField, setHomologarField] = useState<'writer' | 'advisor' | 'both'>('both');
    const [homologarOriginal, setHomologarOriginal] = useState('');
    const [homologarSuggestions, setHomologarSuggestions] = useState<{ field: string; s1: string; s2: string; sim: number }[]>([]);

    const [showNewScript, setShowNewScript] = useState(false);
    const [editingScript, setEditingScript] = useState<Script | null>(null);
    const [scriptForm, setScriptForm] = useState<Partial<Script>>({});

    const [showPulir, setShowPulir] = useState(false);
    const [pulirSearch, setPulirSearch] = useState('');
    const [pulirReplace, setPulirReplace] = useState('');

    const [scriptSearchQuery, setScriptSearchQuery] = useState('');
    const [floatingPulir, setFloatingPulir] = useState<{ visible: boolean, x: number, y: number, text: string }>({ visible: false, x: 0, y: 0, text: '' });

    useEffect(() => {
        const handleSelection = () => {
            if (!selectedProgram || showPulir || showNewScript || !currentUser || !canModify) {
                setFloatingPulir(prev => prev.visible ? { ...prev, visible: false } : prev);
                return;
            }

            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setFloatingPulir({
                    visible: true,
                    x: rect.left + (rect.width / 2),
                    y: rect.top - 40,
                    text: selection.toString().trim()
                });
            } else {
                setFloatingPulir(prev => prev.visible ? { ...prev, visible: false } : prev);
            }
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('keyup', handleSelection);
        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('keyup', handleSelection);
        };
    }, [selectedProgram, currentUser, showPulir, showNewScript]);

    const normalize = (str: string) => 
        str.normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "")
           .replace(/[^\w\s]/gi, ' ')
           .replace(/\s+/g, ' ')
           .trim()
           .toUpperCase();

    const getProgramScripts = (prog: typeof PROGRAMS[0]): Script[] => {
        const _ = refreshTrigger;
        return getProgramScriptsStandalone(prog.file);
    };

    const availablePrograms = useMemo(() => {
        if (!currentUser) return [];
        return PROGRAMS;
    }, [currentUser]);

    const uniquePersonnel = useMemo(() => {
        if (!selectedProgram) return [];
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return [];
        const scripts = getProgramScripts(program);
        return Array.from(new Set([
            ...scripts.map(s => s.writer),
            ...scripts.map(s => s.advisor)
        ].filter(Boolean))).sort();
    }, [selectedProgram, refreshTrigger]);

    const filteredPrograms = useMemo(() => {
        let allowed = availablePrograms;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return allowed;

        return allowed.filter(p => {
            if (p.name.toLowerCase().includes(q)) return true;
            const scripts = getProgramScripts(p);
            return scripts.some(s => {
                const themes = Array.isArray(s.themes) ? s.themes : [];
                return s.title.toLowerCase().includes(q) || 
                s.dateAdded.includes(q) ||
                s.writer?.toLowerCase().includes(q) ||
                s.advisor?.toLowerCase().includes(q) ||
                themes.some(t => t.toLowerCase().includes(q));
            });
        });
    }, [searchQuery, availablePrograms]);

    const distributeScripts = (newScripts: Script[], useIdAsKey = false) => {
        const groupedByProgram: Record<string, Script[]> = {};
        if (onDirtyChange) onDirtyChange(true);

        newScripts.forEach(script => {
            const scriptProgNorm = normalize(script.genre);
            const matchedProg = PROGRAMS.find(p => {
                const pNorm = normalize(p.name);
                if (pNorm === scriptProgNorm) return true;
                if (scriptProgNorm.length > 3 && pNorm.includes(scriptProgNorm)) return true;
                if (pNorm.length > 3 && scriptProgNorm.includes(pNorm)) return true;
                return false;
            });

            if (matchedProg) {
                const progFile = matchedProg.file;
                if (!groupedByProgram[progFile]) groupedByProgram[progFile] = [];
                script.genre = matchedProg.name;
                groupedByProgram[progFile].push(script);
            }
        });

        Object.entries(groupedByProgram).forEach(([file, incomingScripts]) => {
            const key = `guionbd_data_${file}`;
            let existing: Script[] = [];
            try {
                const saved = localStorage.getItem(key);
                existing = saved ? JSON.parse(saved) : [];
            } catch(e) {}
            
            const mergedMap = new Map<string, Script>();
            const generateKey = (s: Script) => {
                if (useIdAsKey) return s.id;
                const dateKey = getNormalizedDateString(s.dateAdded);
                return `${dateKey}`;
            };

            existing.forEach(s => {
                const cleanS = sanitizeScript(s);
                mergedMap.set(generateKey(cleanS), cleanS);
            });
            incomingScripts.forEach(s => {
                const cleanS = sanitizeScript(s);
                mergedMap.set(generateKey(cleanS), cleanS);
            });

            localStorage.setItem(key, JSON.stringify(Array.from(mergedMap.values())));
        });
    };

    const handleGlobalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length === 0) return;

        setIsProcessing(true);
        try {
            const parsedScripts: Script[] = [];
            const rejectedScripts: { title: string; genre: string; reason: string }[] = [];
            let totalFound = 0;

            for (const file of files) {
                const text = await file.text();
                const rawEntries = text.split(/_{4,}/);

                rawEntries.forEach(raw => {
                    const trimmed = raw.trim();
                    if (!trimmed) return;
                    totalFound++;

                    // Custom extract to check raw text
                    const extractField = (key: string) => {
                        const regex = new RegExp(`${key}\\s*(.*?)(?=\\n(?:Programa|Fecha|Escritor|Asesor|Tema|Temas|Título|Titular|Autor):|$)`, 'is');
                        const match = trimmed.match(regex);
                        return match ? match[1].trim() : '';
                    };

                    const valFecha = extractField('Fecha:');
                    const valTema = extractField('Temas:') || extractField('Tema:') || extractField('Temáticas:') || extractField('Temática:');
                    const valEscritor = extractField('Escritor:') || extractField('Autor:');
                    const valAsesor = extractField('Asesor:');
                    const title = extractField('Título:') || extractField('Titular:') || valTema || 'Sin título';
                    const matchedGenre = extractField('Programa:') || extractField('Género:') || 'Desconocido';

                    const missing: string[] = [];
                    if (!valFecha || !isValidScriptDate(valFecha)) missing.push('Fecha');
                    if (!valTema || !isValidScriptTheme(valTema)) missing.push('Tema / Temáticas');
                    if (!valEscritor || !isValidScriptWriter(valEscritor)) missing.push('Escritor / Autor');
                    if (!valAsesor || !isValidScriptAdvisor(valAsesor)) missing.push('Asesor');

                    if (missing.length > 0) {
                        rejectedScripts.push({
                            title: title || 'Sin título',
                            genre: matchedGenre,
                            reason: `Falta o Inválido: ${missing.join(', ')}`
                        });
                    } else {
                        const script = parseRawEntry(trimmed);
                        if (script && isValidScriptDate(script.dateAdded) && isValidScriptTheme(script.themes) && isValidScriptWriter(script.writer) && isValidScriptAdvisor(script.advisor)) {
                            parsedScripts.push(script);
                        } else {
                            rejectedScripts.push({
                                title: title || 'Sin título',
                                genre: matchedGenre,
                                reason: 'Falta o Inválido: Datos estructurales incompletos'
                            });
                        }
                    }
                });
            }

            if (parsedScripts.length > 0) {
                distributeScripts(parsedScripts, false);
            }
            
            // Set the import report to show it at the end
            setImportReport({
                total: totalFound,
                loaded: parsedScripts.length,
                rejected: rejectedScripts
            });
            
        } catch (error) {
            alert("Error al procesar los archivos.");
        } finally {
            setIsProcessing(false);
            if (globalUploadRef.current) globalUploadRef.current.value = '';
        }
    };

    const handleClearAllData = () => {
        setConfirmDialog({
            isOpen: true,
            message: `¿Estás seguro de que deseas eliminar TODOS los guiones de la base de datos local? Esta acción no se puede deshacer.`,
            onConfirm: () => {
                PROGRAMS.forEach(p => {
                    localStorage.removeItem(`guionbd_data_${p.file}`);
                });
                setRefreshTrigger(prev => prev + 1);
                setConfirmDialog(null);
            }
        });
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] flex items-center justify-center">
                <p>Debes iniciar sesión para acceder a los guiones.</p>
                <button onClick={onBack} className="ml-4 text-[#9E7649] underline">Volver</button>
            </div>
        );
    }

    const renderStats = () => {
        return (
            <div className="relative min-h-screen">
                <button 
                    onClick={() => setShowStats(false)}
                    className="absolute top-0 left-0 flex items-center gap-2 text-[#9E7649] hover:text-white font-bold mb-4 z-10 transition-colors"
                >
                    <X size={20} /> Cerrar Informes
                </button>
                <div className="pt-10">
                    <StatsView programs={availablePrograms} onClose={() => setShowStats(false)} currentUser={currentUser} />
                </div>
            </div>
        );
    };

    const handleOpenPulir = (initialMode: 'replace' | 'homologate' = 'replace') => {
        if (!selectedProgram) return;
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return;
        
        const scripts = getProgramScripts(program);
        const writers = Array.from(new Set(scripts.map(s => s.writer).filter(Boolean)));
        const advisors = Array.from(new Set(scripts.map(s => s.advisor).filter(Boolean)));
        
        const found: { field: string; s1: string; s2: string; sim: number }[] = [];
        
        // Scan writers
        for (let i = 0; i < writers.length; i++) {
            for (let j = i + 1; j < writers.length; j++) {
                const sim = getSimilarity(writers[i], writers[j]);
                if (sim >= 0.8 && sim < 1.0) {
                    found.push({ field: 'Escritor', s1: writers[i], s2: writers[j], sim });
                }
            }
        }
        
        // Scan advisors
        for (let i = 0; i < advisors.length; i++) {
            for (let j = i + 1; j < advisors.length; j++) {
                const sim = getSimilarity(advisors[i], advisors[j]);
                if (sim >= 0.8 && sim < 1.0) {
                    found.push({ field: 'Asesor', s1: advisors[i], s2: advisors[j], sim });
                }
            }
        }
        
        setHomologarSuggestions(found);
        setHomologarOriginal('');
        setHomologarField('both');
        setPulirMode(initialMode);
        setShowPulir(true);
    };

    const getHomologarCandidates = (original: string, field: 'writer' | 'advisor' | 'both') => {
        if (!original.trim() || !selectedProgram) return [];
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return [];
        
        const scripts = getProgramScripts(program);
        const candidates = new Set<string>();
        
        scripts.forEach(s => {
            if ((field === 'writer' || field === 'both') && s.writer) {
                const sim = getSimilarity(s.writer, original);
                if (sim >= 0.8 && sim < 1.0) {
                    candidates.add(s.writer);
                }
            }
            if ((field === 'advisor' || field === 'both') && s.advisor) {
                const sim = getSimilarity(s.advisor, original);
                if (sim >= 0.8 && sim < 1.0) {
                    candidates.add(s.advisor);
                }
            }
        });
        
        return Array.from(candidates);
    };

    const handleApplyHomologation = () => {
        if (!selectedProgram || !homologarOriginal.trim()) return;
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return;
        
        if (onDirtyChange) onDirtyChange(true);
        const scripts = getProgramScripts(program);
        
        let count = 0;
        const updated = scripts.map(s => {
            const newS = { ...s };
            let changed = false;
            
            if (homologarField === 'writer' || homologarField === 'both') {
                if (s.writer && getSimilarity(s.writer, homologarOriginal) >= 0.8) {
                    if (s.writer !== homologarOriginal) {
                        newS.writer = homologarOriginal;
                        changed = true;
                    }
                }
            }
            
            if (homologarField === 'advisor' || homologarField === 'both') {
                if (s.advisor && getSimilarity(s.advisor, homologarOriginal) >= 0.8) {
                    if (s.advisor !== homologarOriginal) {
                        newS.advisor = homologarOriginal;
                        changed = true;
                    }
                }
            }
            
            if (changed) count++;
            return newS;
        });
        
        if (count > 0) {
            localStorage.setItem(`guionbd_data_${program.file}`, JSON.stringify(updated));
            setRefreshTrigger(prev => prev + 1);
            alert(`Homologación exitosa. Se actualizaron ${count} guiones con el nombre definitivo "${homologarOriginal}".`);
            setShowPulir(false);
        } else {
            alert('No se encontraron coincidencias para homologar.');
        }
    };

    const handleDirectHomologation = (field: 'Escritor' | 'Asesor', targetName: string, obsoleteName: string) => {
        if (!selectedProgram) return;
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return;

        if (onDirtyChange) onDirtyChange(true);
        const scripts = getProgramScripts(program);

        let count = 0;
        const updated = scripts.map(s => {
            const newS = { ...s };
            let changed = false;

            const isWriterField = field === 'Escritor';
            const isAdvisorField = field === 'Asesor';

            if (isWriterField) {
                if (s.writer && (s.writer === obsoleteName || getSimilarity(s.writer, targetName) >= 0.8)) {
                    if (s.writer !== targetName) {
                        newS.writer = targetName;
                        changed = true;
                    }
                }
            }

            if (isAdvisorField) {
                if (s.advisor && (s.advisor === obsoleteName || getSimilarity(s.advisor, targetName) >= 0.8)) {
                    if (s.advisor !== targetName) {
                        newS.advisor = targetName;
                        changed = true;
                    }
                }
            }

            if (changed) count++;
            return newS;
        });

        if (count > 0) {
            localStorage.setItem(`guionbd_data_${program.file}`, JSON.stringify(updated));
            setRefreshTrigger(prev => prev + 1);
            
            // Re-scan remaining suggestions after applying this homologation
            const remainingScripts = updated.filter(s => {
                const hasDate = isValidScriptDate(s.dateAdded);
                const hasTheme = isValidScriptTheme(s.themes || s.title);
                const hasWriter = isValidScriptWriter(s.writer);
                const hasAdvisor = isValidScriptAdvisor(s.advisor);
                return hasDate && hasTheme && hasWriter && hasAdvisor;
            });
            const writers = Array.from(new Set(remainingScripts.map(s => s.writer).filter(Boolean)));
            const advisors = Array.from(new Set(remainingScripts.map(s => s.advisor).filter(Boolean)));
            
            const found: { field: string; s1: string; s2: string; sim: number }[] = [];
            for (let i = 0; i < writers.length; i++) {
                for (let j = i + 1; j < writers.length; j++) {
                    const sim = getSimilarity(writers[i], writers[j]);
                    if (sim >= 0.8 && sim < 1.0) {
                        found.push({ field: 'Escritor', s1: writers[i], s2: writers[j], sim });
                    }
                }
            }
            for (let i = 0; i < advisors.length; i++) {
                for (let j = i + 1; j < advisors.length; j++) {
                    const sim = getSimilarity(advisors[i], advisors[j]);
                    if (sim >= 0.8 && sim < 1.0) {
                        found.push({ field: 'Asesor', s1: advisors[i], s2: advisors[j], sim });
                    }
                }
            }
            setHomologarSuggestions(found);
            setHomologarOriginal('');
            
            alert(`Homologación exitosa. Se actualizaron ${count} guiones con el nombre definitivo "${targetName}".`);
        } else {
            alert('No se encontraron guiones que requieran homologación.');
        }
    };

    const handleDeleteScript = (id: string) => {
        if (!selectedProgram) return;
        setConfirmDialog({
            isOpen: true,
            message: '¿Eliminar este guion?',
            onConfirm: () => {
                if (onDirtyChange) onDirtyChange(true);
                const program = PROGRAMS.find(p => p.name === selectedProgram);
                if (program) {
                    const scripts = getProgramScripts(program);
                    const updated = scripts.filter(s => s.id !== id);
                    localStorage.setItem(`guionbd_data_${program.file}`, JSON.stringify(updated));
                    setRefreshTrigger(prev => prev + 1);
                }
                setConfirmDialog(null);
            }
        });
    };

    const handleSaveScript = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProgram) return;
        if (onDirtyChange) onDirtyChange(true);
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return;

        const scripts = getProgramScripts(program);
        
        const inputTitle = sanitizeScriptProperty(scriptForm.title || 'SIN TITULO');
        const inputWriter = sanitizeScriptProperty(scriptForm.writer || 'DESCONOCIDO');
        const inputAdvisor = sanitizeScriptProperty(scriptForm.advisor || 'NO ESPECIFICADO');
        const inputDate = convertDateToSpanishFull(scriptForm.dateAdded || '');
        const inputThemes = Array.isArray(scriptForm.themes) 
            ? scriptForm.themes.map(t => sanitizeScriptProperty(t)) 
            : [inputTitle];

        if (editingScript) {
            const updated = scripts.map(s => s.id === editingScript.id ? { 
                ...s, 
                title: inputTitle,
                writer: inputWriter,
                advisor: inputAdvisor,
                dateAdded: inputDate,
                themes: inputThemes
            } as Script : s);
            localStorage.setItem(`guionbd_data_${program.file}`, JSON.stringify(updated));
        } else {
            const newScript: Script = {
                id: Date.now().toString(),
                title: inputTitle,
                writer: inputWriter,
                advisor: inputAdvisor,
                dateAdded: inputDate,
                themes: inputThemes,
                genre: selectedProgram,
            };

            const duplicateIndex = scripts.findIndex(s => 
                getNormalizedDateString(s.dateAdded) === getNormalizedDateString(newScript.dateAdded)
            );

            if (duplicateIndex >= 0) {
                const updated = [...scripts];
                updated[duplicateIndex] = {
                    ...updated[duplicateIndex],
                    ...newScript,
                    id: updated[duplicateIndex].id
                };
                localStorage.setItem(`guionbd_data_${program.file}`, JSON.stringify(updated));
            } else {
                localStorage.setItem(`guionbd_data_${program.file}`, JSON.stringify([...scripts, newScript]));
            }
        }
        
        setShowNewScript(false);
        setEditingScript(null);
        setScriptForm({});
    };

    const handlePulirSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProgram || !pulirSearch) return;
        if (onDirtyChange) onDirtyChange(true);
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return;

        const scripts = getProgramScripts(program);
        let count = 0;
        const updated = scripts.map(s => {
            let modified = false;
            const replaceInStr = (str: string) => {
                if (!str) return str;
                const regex = new RegExp(pulirSearch, 'gi');
                if (regex.test(str)) {
                    modified = true;
                    return str.replace(regex, pulirReplace);
                }
                return str;
            };

            const newS = { ...s };
            newS.title = replaceInStr(s.title);
            newS.writer = replaceInStr(s.writer);
            newS.advisor = replaceInStr(s.advisor);
            newS.dateAdded = replaceInStr(s.dateAdded);
            newS.genre = replaceInStr(s.genre);
            newS.content = replaceInStr(s.content);
            newS.themes = Array.isArray(s.themes) ? s.themes.map(t => replaceInStr(t)) : [];
            
            if (modified) count++;
            return newS;
        });

        if (count > 0) {
            localStorage.setItem(`guionbd_data_${program.file}`, JSON.stringify(updated));
            alert(`Se modificaron ${count} guiones.`);
            setShowPulir(false);
            setPulirSearch('');
            setPulirReplace('');
        } else {
            alert('No se encontraron coincidencias.');
        }
    };

    const renderYearAgoCarousel = (scripts: Script[]) => {
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        
        const startRange = new Date(oneYearAgo);
        startRange.setDate(oneYearAgo.getDate() - 3);
        startRange.setHours(0,0,0,0);
        
        const endRange = new Date(oneYearAgo);
        endRange.setDate(oneYearAgo.getDate() + 3);
        endRange.setHours(23,59,59,999);

        const historicalScripts = scripts.filter(s => {
            const d = parseSpanishDate(s.dateAdded);
            return d >= startRange && d <= endRange;
        }).sort((a,b) => parseSpanishDate(a.dateAdded).getTime() - parseSpanishDate(b.dateAdded).getTime());

        return (
            <div className="mb-8 bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20">
                <h3 className="text-[#9E7649] font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar size={16} /> Hace un año (± 3 días)
                </h3>
                {historicalScripts.length > 0 ? (
                    <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
                        {historicalScripts.map(s => (
                            <div key={s.id} className="min-w-[250px] max-w-[300px] bg-gradient-to-br from-[#9E7649] to-[#8B653D] p-5 rounded-xl shadow-lg shrink-0 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-white font-bold text-sm mb-3 line-clamp-3 uppercase">
                                        {Array.isArray(s.themes) && s.themes.length > 0 && s.themes[0] !== 'General' ? s.themes.join(', ') : s.title}
                                    </h4>
                                </div>
                                <p className="text-white/80 text-xs mt-2 flex items-center gap-1.5 font-mono">
                                    <Calendar size={12} /> {formatSpanishDate(s.dateAdded)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-[#1A100C] rounded-xl border border-[#9E7649]/10">
                        <p className="text-[#E8DCCF]/50 text-sm font-medium">No hay guiones registrados en esta fecha histórica.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderBalanceModalContent = (scripts: Script[]) => {
        const availableYears = Array.from(new Set(scripts.map(s => {
            const d = parseSpanishDate(s.dateAdded);
            return isNaN(d.getTime()) ? null : d.getFullYear().toString();
        }).filter(Boolean))).sort().reverse() as string[];

        // Si no hay años en los guiones, usar el año actual como fallback
        if (availableYears.length === 0) {
            availableYears.push(new Date().getFullYear().toString());
        }

        if (balanceStep === 'config') {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#2C1B15] rounded-3xl w-full max-w-md shadow-2xl border border-[#9E7649]/30 flex flex-col overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#9E7649]/20 flex justify-between items-center bg-[#1A100C]/80 backdrop-blur-md">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Calendar size={20} className="text-[#9E7649]"/> Balance: {selectedProgram}</h2>
                            <button onClick={() => { setShowBalance(false); setBalanceStep('config'); }} className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#E8DCCF]/70"><X size={20}/></button>
                        </div>
                        <div className="p-8 flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#9E7649]/10 rounded-full flex items-center justify-center mb-6 border border-[#9E7649]/20">
                                <Filter size={32} className="text-[#9E7649]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-8">Configurar Balance</h3>
                            
                            <div className="w-full space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider mb-2 block">Año</label>
                                    <select value={balanceYear} onChange={e => setBalanceYear(e.target.value)} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3.5 text-white outline-none focus:border-[#9E7649] transition-colors">
                                        <option value="Todos">Todos los años</option>
                                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider mb-2 block">Mes</label>
                                    <select value={balanceMonth} onChange={e => setBalanceMonth(e.target.value)} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3.5 text-white outline-none focus:border-[#9E7649] transition-colors">
                                        <option value="Todos">Todos los meses</option>
                                        {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m.toString()}>{new Date(0, m-1).toLocaleString('es-ES', {month: 'long'})}</option>)}
                                    </select>
                                </div>
                                <button 
                                    onClick={() => setBalanceStep('results')}
                                    className="w-full mt-6 py-4 rounded-xl font-bold bg-[#9E7649] hover:bg-[#8B653D] text-white shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    Ver Resultados <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Results Step
        let filtered = scripts;
        if (balanceYear !== 'Todos') {
            filtered = filtered.filter(s => {
                const d = parseSpanishDate(s.dateAdded);
                return !isNaN(d.getTime()) && d.getFullYear().toString() === balanceYear;
            });
        }
        if (balanceMonth !== 'Todos') {
            const targetMonthIdx = parseInt(balanceMonth, 10) - 1;
            filtered = filtered.filter(s => {
                return isDateStringMatchingMonth(s.dateAdded, targetMonthIdx);
            });
        }

        if (balanceSearch) {
            const queryWords = balanceSearch.toLowerCase().trim().split(/\s+/);
            if (queryWords.length > 0 && queryWords[0] !== '') {
                filtered = filtered.filter(s => {
                    const formattedDate = formatSpanishDate(s.dateAdded).toLowerCase();
                    const searchableText = [
                        s.title,
                        s.writer || '',
                        s.advisor || '',
                        s.dateAdded || '',
                        formattedDate,
                        ...(s.themes || [])
                    ].join(' ').toLowerCase();

                    return queryWords.every(word => searchableText.includes(word));
                });
            }
        }

        const todos = filtered;
        const sinTema = filtered.filter(s => !Array.isArray(s.themes) || s.themes.length === 0 || s.themes.includes('General') || (Array.isArray(s.themes) && s.themes.join('').trim() === '') || (Array.isArray(s.themes) && s.themes.join('').toLowerCase().includes('no especificado')));
        const sinEscritor = filtered.filter(s => !s.writer || s.writer.toLowerCase().includes('desconocido') || s.writer.toLowerCase().includes('no especificado') || s.writer.trim() === '');
        const sinAsesor = filtered.filter(s => !s.advisor || s.advisor.toLowerCase().includes('no especificado') || s.advisor.trim() === '');

        const handleExportExcel = () => {
            // Preparar datos
            const data = todos.map(s => {
                const tema = s.themes && s.themes.length > 0 && s.themes[0] !== 'General' ? s.themes.join(', ') : s.title;
                return {
                    'TEMA / TÍTULO': tema.toUpperCase(),
                    'FECHA EMISIÓN': formatSpanishDate(s.dateAdded),
                    'ESCRITOR': s.writer || 'No especificado',
                    'ASESOR': s.advisor || 'No especificado'
                };
            });

            // Crear hoja de cálculo
            const ws = XLSX.utils.json_to_sheet(data);

            // Estilos
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
                fill: { fgColor: { rgb: "9E7649" } }, // Color dorado de la app
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "5A432A" } },
                    bottom: { style: "thin", color: { rgb: "5A432A" } },
                    left: { style: "thin", color: { rgb: "5A432A" } },
                    right: { style: "thin", color: { rgb: "5A432A" } }
                }
            };

            const rowStyle = {
                font: { color: { rgb: "333333" }, sz: 11 },
                fill: { fgColor: { rgb: "FDFBF7" } }, // Fondo claro
                alignment: { vertical: "center", wrapText: true },
                border: {
                    bottom: { style: "thin", color: { rgb: "E8DCCF" } },
                    left: { style: "thin", color: { rgb: "E8DCCF" } },
                    right: { style: "thin", color: { rgb: "E8DCCF" } }
                }
            };

            const altRowStyle = {
                ...rowStyle,
                fill: { fgColor: { rgb: "F5EFE6" } } // Fondo alterno ligeramente más oscuro
            };

            // Aplicar estilos a las celdas
            const range = XLSX.utils.decode_range(ws['!ref'] || "A1:D1");
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = { c: C, r: R };
                    const cellRef = XLSX.utils.encode_cell(cellAddress);
                    if (!ws[cellRef]) continue;

                    if (R === 0) {
                        // Encabezados
                        ws[cellRef].s = headerStyle;
                    } else {
                        // Filas de datos
                        ws[cellRef].s = R % 2 === 0 ? altRowStyle : rowStyle;
                    }
                }
            }

            // Ajustar ancho de columnas
            ws['!cols'] = [
                { wch: 50 }, // Tema
                { wch: 25 }, // Fecha
                { wch: 30 }, // Escritor
                { wch: 30 }  // Asesor
            ];

            // Ajustar altura de la fila de encabezado
            ws['!rows'] = [{ hpt: 30 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Balance Guiones");
            
            const monthName = balanceMonth === 'Todos' ? 'Todos' : new Date(0, parseInt(balanceMonth)-1).toLocaleString('es-ES', {month: 'long'});
            XLSX.writeFile(wb, `Balance_${selectedProgram}_${balanceYear}_${monthName}.xlsx`);
        };

        const renderColumn = (title: string, count: number, items: Script[], icon: React.ReactNode, borderClass: string, textClass: string) => (
            <div className={`w-80 flex flex-col bg-[#1A100C] rounded-2xl border ${borderClass} overflow-hidden shrink-0`}>
                <div className={`p-4 border-b ${borderClass} flex justify-between items-center bg-[#2C1B15]`}>
                    <h3 className={`${textClass} font-bold text-xs uppercase tracking-wider flex items-center gap-2`}>{icon} {title}</h3>
                    <span className="text-white font-black text-xl">{count}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {items.map(s => {
                        const displayTheme = Array.isArray(s.themes) && s.themes.length > 0 && s.themes[0] !== 'General' ? s.themes.join(', ') : s.title;
                        return (
                            <div key={s.id} className="p-4 bg-[#2C1B15] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <p className="text-[#E8DCCF]/60 text-[10px] font-mono mb-2">{formatSpanishDate(s.dateAdded)}</p>
                                <p className="text-white text-sm font-bold leading-snug uppercase">{displayTheme}</p>
                                {title === 'Sin Escritor' && <p className="text-amber-500 text-[10px] mt-2 font-medium">Escritor: {s.writer}</p>}
                                {title === 'Sin Asesor' && <p className="text-red-500 text-[10px] mt-2 font-medium">Asesor: {s.advisor}</p>}
                            </div>
                        );
                    })}
                    {items.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-[#E8DCCF]/40 text-xs font-medium">No hay registros</p>
                        </div>
                    )}
                </div>
            </div>
        );

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#2C1B15] rounded-3xl w-full max-w-[1400px] h-[90vh] shadow-2xl border border-[#9E7649]/30 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-[#9E7649]/20 flex justify-between items-start bg-[#1A100C]/80 backdrop-blur-md">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Calendar size={24} className="text-[#9E7649]"/> Balance: {selectedProgram}</h2>
                            <p className="text-[#E8DCCF]/60 text-sm mt-1.5 font-medium">Filtro: {balanceYear} / {balanceMonth === 'Todos' ? 'Todos' : new Date(0, parseInt(balanceMonth)-1).toLocaleString('es-ES', {month: 'long'})}</p>
                        </div>
                        <button onClick={() => { setShowBalance(false); setBalanceStep('config'); }} className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#E8DCCF]/70"><X size={24}/></button>
                    </div>

                    {/* Toolbar */}
                    <div className="px-8 py-4 border-b border-[#9E7649]/10 flex flex-wrap items-center justify-between gap-4 bg-[#2C1B15]">
                        <button onClick={() => setBalanceStep('config')} className="flex items-center gap-2 text-[#9E7649] hover:text-white text-sm font-bold transition-colors">
                            <Filter size={16} /> Cambiar Filtros
                        </button>
                        
                        <div className="flex items-center gap-4 flex-1 justify-end">
                            <div className="relative max-w-sm w-full">
                                <Search size={16} className="absolute left-4 top-3 text-[#9E7649]" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    value={balanceSearch}
                                    onChange={e => setBalanceSearch(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl text-sm text-white outline-none focus:border-[#9E7649] transition-colors"
                                />
                            </div>
                            <button onClick={handleExportExcel} className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
                                <FileDown size={18} /> Exportar
                            </button>
                        </div>
                    </div>

                    {/* Columns */}
                    <div className="flex-1 overflow-x-auto p-8 bg-[#1A100C]/30">
                        <div className="flex gap-6 min-w-max h-full pb-4">
                            {renderColumn('Total Guiones', todos.length, todos, <List size={16}/>, 'border-[#9E7649]/20', 'text-[#9E7649]')}
                            {renderColumn('Sin Escritor', sinEscritor.length, sinEscritor, <UserX size={16}/>, 'border-amber-500/20', 'text-amber-500')}
                            {renderColumn('Sin Asesor', sinAsesor.length, sinAsesor, <AlertCircle size={16}/>, 'border-red-500/20', 'text-red-500')}
                            {renderColumn('Sin Tema', sinTema.length, sinTema, <Tag size={16}/>, 'border-rose-500/20', 'text-rose-500')}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const [showProgramInside, setShowProgramInside] = useState(false);
    const [programSections, setProgramSections] = useState<any[]>([]);
    const [sectionSearch, setSectionSearch] = useState('');
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const handleLoadSections = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProgram) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const sections: any[] = [];

            if (text.includes('### ')) {
                const blocks = text.split(/###\s+/).filter(b => b.trim());
                blocks.forEach(block => {
                    const lines = block.split('\n').filter(l => l.trim());
                    if (lines.length === 0) return;
                    
                    const headerMatch = lines[0].match(/^(.*?)\s*\((.*?)\)$/);
                    let date = lines[0];
                    let theme = '';
                    if (headerMatch) {
                        date = headerMatch[1].trim();
                        theme = headerMatch[2].trim();
                    }

                    let currentSectionName = '';
                    let currentSectionContent = '';

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        const sectionMatch = line.match(/^([^:]+):\s*(.*)/);
                        // If line starts with a section name and is not indented
                        if (sectionMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
                            if (currentSectionName) {
                                sections.push({
                                    date,
                                    theme,
                                    name: currentSectionName.trim(),
                                    content: currentSectionContent.trim()
                                });
                            }
                            currentSectionName = sectionMatch[1];
                            currentSectionContent = sectionMatch[2];
                        } else {
                            currentSectionContent += '\n' + line;
                        }
                    }
                    if (currentSectionName) {
                        sections.push({
                            date,
                            theme,
                            name: currentSectionName.trim(),
                            content: currentSectionContent.trim()
                        });
                    }
                });
            } else {
                const blocks = text.split(/_{3,}/);
                blocks.forEach(block => {
                    const nameMatch = block.match(/SECCION:\s*(.+)/);
                    const contentMatch = block.match(/CONTENIDO:\s*([\s\S]+)/);
                    
                    if (nameMatch && contentMatch) {
                        sections.push({
                            name: nameMatch[1].trim(),
                            content: contentMatch[1].trim()
                        });
                    }
                });
            }

            if (sections.length > 0) {
                const key = `program_sections_${selectedProgram}`;
                localStorage.setItem(key, JSON.stringify(sections));
                setProgramSections(sections);
                alert(`Se cargaron ${sections.length} secciones.`);
            } else {
                alert('No se encontraron secciones válidas.');
            }
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        if (selectedProgram && showProgramInside) {
            const key = `program_sections_${selectedProgram}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                setProgramSections(JSON.parse(saved));
            } else {
                if (selectedProgram === 'Hablando con Juana') {
                    const flattened: any[] = [];
                    juanaPorDentroData.forEach(day => {
                        day.sections.forEach(sec => {
                            flattened.push({
                                date: day.date,
                                theme: day.theme,
                                name: sec.name,
                                content: sec.content
                            });
                        });
                    });
                    setProgramSections(flattened);
                } else {
                    setProgramSections([]);
                }
            }
        }
    }, [selectedProgram, showProgramInside]);

    const renderProgramInside = () => {
        const filteredSections = programSections.filter(s => 
            s.name.toLowerCase().includes(sectionSearch.toLowerCase()) || 
            s.content.toLowerCase().includes(sectionSearch.toLowerCase()) ||
            (s.date && s.date.toLowerCase().includes(sectionSearch.toLowerCase())) ||
            (s.theme && s.theme.toLowerCase().includes(sectionSearch.toLowerCase()))
        );

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#2C1B15] rounded-3xl w-full max-w-4xl h-[90vh] shadow-2xl border border-[#9E7649]/30 flex flex-col overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#9E7649]/20 flex justify-between items-center bg-[#1A100C]/80 backdrop-blur-md">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <BookOpen size={20} className="text-[#9E7649]"/> {selectedProgram}: Por dentro
                        </h2>
                        <button onClick={() => setShowProgramInside(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#E8DCCF]/70"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search size={20} className="absolute left-4 top-3.5 text-[#9E7649]" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por fecha, palabra clave o sección..." 
                                    value={sectionSearch}
                                    onChange={e => setSectionSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl text-white outline-none focus:border-[#9E7649]"
                                />
                            </div>
                            <label className="flex items-center gap-2 px-4 py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-lg">
                                <Upload size={18} />
                                <span className="hidden sm:inline">Cargar TXT</span>
                                <input type="file" accept=".txt" onChange={handleLoadSections} className="hidden" />
                            </label>
                        </div>

                        <div className="space-y-4">
                            {filteredSections.map((section, idx) => (
                                <div key={idx} className="bg-[#1A100C] rounded-xl border border-[#9E7649]/10 overflow-hidden">
                                    <button 
                                        onClick={() => setExpandedSection(expandedSection === idx.toString() ? null : idx.toString())}
                                        className="w-full p-4 flex justify-between items-center hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div>
                                            <h3 className="text-lg font-bold text-[#9E7649]">{section.name}</h3>
                                            {section.date && <p className="text-xs text-[#E8DCCF]/60 mt-1">{section.date} • {section.theme}</p>}
                                        </div>
                                        {expandedSection === idx.toString() ? <ChevronLeft size={20} className="-rotate-90 text-[#E8DCCF]/50" /> : <ChevronRight size={20} className="text-[#E8DCCF]/50" />}
                                    </button>
                                    
                                    {expandedSection === idx.toString() && (
                                        <div className="p-6 border-t border-[#9E7649]/10 bg-black/20">
                                            <div className="prose prose-invert max-w-none text-[#E8DCCF]/80 whitespace-pre-wrap font-mono text-sm">
                                                {section.content}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredSections.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-[#E8DCCF]/50 italic">No hay secciones disponibles. Carga un archivo TXT.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderProgramDetail = () => {
        const program = PROGRAMS.find(p => p.name === selectedProgram);
        if (!program) return null;
        const scripts = getProgramScripts(program);

        const filteredScripts = scripts.filter(s => {
            const queryWords = scriptSearchQuery.toLowerCase().trim().split(/\s+/);
            if (queryWords.length === 0 || queryWords[0] === '') return true;
            
            const formattedDate = formatSpanishDate(s.dateAdded).toLowerCase();
            const searchableText = [
                s.title,
                s.writer || '',
                s.advisor || '',
                s.dateAdded || '',
                formattedDate,
                ...(s.themes || [])
            ].join(' ').toLowerCase();

            return queryWords.every(word => searchableText.includes(word));
        }).sort((a, b) => parseSpanishDate(b.dateAdded).getTime() - parseSpanishDate(a.dateAdded).getTime());

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${program.color} text-white shadow-lg`}>
                            {program.icon}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{program.name}</h2>
                            <p className="text-[#9E7649] text-sm font-medium mt-1">{scripts.length} guiones registrados</p>
                        </div>
                    </div>
                    
                    {/* Botones de Acción del Programa */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-center sm:justify-start">
                        <button 
                            onClick={() => setShowProgramInside(true)} 
                            className={`flex items-center gap-2 ${canModify ? 'justify-center p-3' : 'px-3 py-2.5'} bg-[#1A100C] border border-[#9E7649]/30 rounded-xl text-[#9E7649] hover:text-white transition-colors text-sm font-bold`} 
                            title="Por dentro"
                        >
                            <BookOpen size={20} /> 
                            {!canModify && <span>Por dentro</span>}
                        </button>
                        {canModify && (
                            <>
                                <button onClick={() => { setScriptForm({}); setEditingScript(null); setShowNewScript(true); }} className="flex items-center justify-center p-3 bg-[#9E7649] text-white rounded-xl hover:bg-[#8B653D] transition-colors shadow-lg" title="Nuevo">
                                    <Plus size={24} />
                                </button>
                                <button 
                                    onClick={() => handleOpenPulir('replace')} 
                                    className="flex items-center gap-2 px-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl text-[#9E7649] hover:text-white transition-all text-sm font-bold" 
                                    title="Pulir (Reemplazo de palabras / Homologar personal)"
                                >
                                    <Wand2 size={18} />
                                    <span>Pulir</span>
                                </button>
                                <button onClick={() => {
                                    setConfirmDialog({
                                        isOpen: true,
                                        message: `¿Estás seguro de que deseas eliminar TODOS los guiones de ${program.name}? Esta acción no se puede deshacer.`,
                                        onConfirm: () => {
                                            localStorage.removeItem(`guionbd_data_${program.file}`);
                                            setRefreshTrigger(prev => prev + 1);
                                            setConfirmDialog(null);
                                        }
                                    });
                                }} className="flex items-center justify-center p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-500 hover:bg-red-900/40 hover:text-red-400 transition-colors" title="Limpiar Guiones">
                                    <Trash2 size={24} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Buscador de Guiones */}
                <div className="relative group w-full mb-6">
                    <Search size={20} className="absolute left-4 top-3.5 text-[#9E7649]" />
                    <input
                        type="text"
                        placeholder="Buscar por fecha, tema, escritor o asesor..."
                        value={scriptSearchQuery}
                        onChange={(e) => setScriptSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-[#2C1B15] border border-[#9E7649]/20 rounded-2xl shadow-sm focus:border-[#9E7649] outline-none transition-all text-white placeholder:text-[#E8DCCF]/30"
                    />
                    {scriptSearchQuery.trim() !== '' && (
                        <div className="absolute right-4 top-3.5 text-xs font-bold text-[#9E7649] bg-[#9E7649]/10 px-2 py-1 rounded-md">
                            {filteredScripts.length} resultados
                        </div>
                    )}
                </div>

                {renderYearAgoCarousel(scripts)}

                {filteredScripts.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {filteredScripts.map(s => (
                            <div key={s.id} className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#9E7649]/50 transition-colors group">
                                <div className="flex-1">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div>
                                            {!['RCM NOTICIAS', 'ESTACIÓN 95.3'].includes(program.name) && (
                                                <>
                                                    <span className="text-[#9E7649] font-bold text-[10px] uppercase tracking-wider block mb-1">Tema</span>
                                                    <h3 
                                                        className="text-lg font-bold text-white leading-tight group-hover:text-[#9E7649] transition-colors uppercase cursor-pointer"
                                                        onClick={() => {
                                                            setSectionSearch(s.dateAdded);
                                                            setShowProgramInside(true);
                                                        }}
                                                        title="Ver secciones por dentro"
                                                    >
                                                        {Array.isArray(s.themes) && s.themes.length > 0 && s.themes[0] !== 'General' ? s.themes.join(', ') : s.title}
                                                    </h3>
                                                </>
                                            )}
                                        </div>
                                        <span 
                                            className="text-xs text-[#E8DCCF]/60 bg-black/30 px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 border border-white/5 text-center cursor-pointer hover:text-[#9E7649]"
                                            onClick={() => {
                                                setSectionSearch(s.dateAdded);
                                                setShowProgramInside(true);
                                            }}
                                            title="Ver secciones por dentro"
                                        >
                                            <Calendar size={12} className="shrink-0" /> {s.dateAdded}
                                        </span>
                                    </div>
                                    {program.name !== 'RCM NOTICIAS' && (
                                        <div className="flex flex-wrap gap-8 text-sm bg-[#1A100C] p-3.5 rounded-xl border border-[#9E7649]/10">
                                            <p className="text-[#E8DCCF]"><span className="text-[#9E7649] font-medium uppercase tracking-wider text-[10px] block mb-0.5">Escritor</span>{s.writer}</p>
                                            <p className="text-[#E8DCCF]"><span className="text-[#9E7649] font-medium uppercase tracking-wider text-[10px] block mb-0.5">Asesor</span>{s.advisor}</p>
                                        </div>
                                    )}
                                </div>
                                {canModify && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => { setScriptForm({...s, themes: Array.isArray(s.themes) ? s.themes.join(', ') : (s.themes || '')} as any); setEditingScript(s); setShowNewScript(true); }} className="p-2.5 bg-[#1A100C] text-[#9E7649] hover:text-white rounded-xl border border-[#9E7649]/20 transition-colors" title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteScript(s.id)} className="p-2.5 bg-[#1A100C] text-red-500 hover:text-red-400 rounded-xl border border-red-500/20 transition-colors" title="Eliminar">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20">
                        <FileText size={48} className="mx-auto mb-4 text-[#9E7649]/30" />
                        <p className="text-[#E8DCCF]/70 font-medium">No hay guiones registrados para este programa.</p>
                    </div>
                )}

                {/* Modales de ProgramDetail */}
                {showBalance && renderBalanceModalContent(scripts)}
                {showProgramInside && renderProgramInside()}
                
                {showNewScript && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#2C1B15] rounded-2xl w-full max-w-md shadow-2xl border border-[#9E7649]/30 flex flex-col">
                            <div className="px-6 py-4 border-b border-[#9E7649]/20 flex justify-between items-center bg-[#1A100C]/50 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-white">{editingScript ? 'Editar Guion' : 'Nuevo Guion'}</h2>
                                <button onClick={() => setShowNewScript(false)} className="text-[#E8DCCF]/70 hover:text-white"><X size={20}/></button>
                            </div>
                            <form onSubmit={handleSaveScript} className="p-6 flex flex-col gap-4">
                                <div>
                                    <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Título</label>
                                    <input required value={scriptForm.title || ''} onChange={e => setScriptForm({...scriptForm, title: e.target.value})} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white outline-none focus:border-[#9E7649]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Fecha</label>
                                        <input type="date" required value={scriptForm.dateAdded || ''} onChange={e => setScriptForm({...scriptForm, dateAdded: e.target.value})} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white outline-none focus:border-[#9E7649]" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Escritor</label>
                                        <input required value={scriptForm.writer || ''} onChange={e => setScriptForm({...scriptForm, writer: e.target.value})} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white outline-none focus:border-[#9E7649]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Asesor</label>
                                    <input required value={scriptForm.advisor || ''} onChange={e => setScriptForm({...scriptForm, advisor: e.target.value})} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white outline-none focus:border-[#9E7649]" />
                                </div>
                                <div>
                                    <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Temas (separados por coma)</label>
                                    <input required value={typeof scriptForm.themes === 'string' ? scriptForm.themes : (scriptForm.themes?.join(', ') || '')} onChange={e => setScriptForm({...scriptForm, themes: e.target.value.split(',').map(t => t.trim()) as any})} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white outline-none focus:border-[#9E7649]" />
                                </div>
                                <button type="submit" className="mt-2 w-full py-3 rounded-xl font-bold bg-[#9E7649] hover:bg-[#8B653D] text-white shadow-lg transition-all">
                                    Guardar
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {showPulir && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#2C1B15] rounded-3xl w-full max-w-xl shadow-2xl border border-[#9E7649]/30 flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-[#9E7649]/20 flex justify-between items-center bg-[#1A100C]/50 rounded-t-3xl">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Wand2 size={24} className="text-[#9E7649]"/> 
                                    <span>Pulir Guiones</span>
                                </h2>
                                <button onClick={() => setShowPulir(false)} className="text-[#E8DCCF]/70 hover:text-white p-1.5 hover:bg-white/5 rounded-full transition-colors"><X size={20}/></button>
                            </div>
                            
                            {/* Tabs */}
                            <div className="flex border-b border-[#9E7649]/10 bg-[#1A100C]/20">
                                <button 
                                    type="button" 
                                    onClick={() => setPulirMode('replace')}
                                    className={`flex-1 py-3 font-semibold text-sm text-center border-b-2 transition-all ${pulirMode === 'replace' ? 'border-[#9E7649] text-white bg-white/5' : 'border-transparent text-[#E8DCCF]/50 hover:text-white'}`}
                                >
                                    Reemplazo de palabras
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setPulirMode('homologate')}
                                    className={`flex-1 py-3 font-semibold text-sm text-center border-b-2 transition-all ${pulirMode === 'homologate' ? 'border-[#9E7649] text-white bg-white/5' : 'border-transparent text-[#E8DCCF]/50 hover:text-white'}`}
                                >
                                    Homologar personal
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {pulirMode === 'replace' ? (
                                    <form onSubmit={handlePulirSubmit} className="flex flex-col gap-5">
                                        <p className="text-xs text-[#E8DCCF]/70 leading-relaxed">
                                            Busca y reemplaza texto en todos los guiones de <strong>{selectedProgram}</strong> (títulos, escritores, asesores, temas).
                                        </p>
                                        <div>
                                            <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-2 block font-mono">Buscar Palabra o Frase</label>
                                            <input required value={pulirSearch} onChange={e => setPulirSearch(e.target.value)} placeholder="Texto a buscar..." className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3.5 text-white outline-none focus:border-[#9E7649] font-medium" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-2 block font-mono">Reemplazar con</label>
                                            <input value={pulirReplace} onChange={e => setPulirReplace(e.target.value)} placeholder="Dejar vacío para eliminar" className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3.5 text-white outline-none focus:border-[#9E7649] font-medium" />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-4 border-t border-[#9E7649]/15 mt-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowPulir(false)}
                                                className="px-5 py-2.5 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl text-white font-bold hover:bg-[#3E1E16] text-sm transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button type="submit" className="px-6 py-2.5 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl font-bold text-sm transition-all shadow-md">
                                                Reemplazar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex flex-col space-y-5">
                                        <p className="text-xs text-[#E8DCCF]/70 leading-relaxed">
                                            Herramienta de homologación para <strong>{selectedProgram}</strong>. Escanea y normaliza variaciones de nombres ortográficos con similitud &gt;= 80%.
                                        </p>

                                        {/* Sugerencias Coincidentes */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-[#9E7649] uppercase tracking-wide font-mono">
                                                Sugerencias Detectadas (Coincidencia &gt;= 80%):
                                            </label>
                                            {homologarSuggestions.length > 0 ? (
                                                <div className="space-y-2 max-h-48 overflow-y-auto border border-[#9E7649]/15 rounded-xl bg-[#1A100C]/40 p-2.5">
                                                    {homologarSuggestions.map((sug, id) => (
                                                        <div key={id} className="text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#1A100C]/85 border border-[#9E7649]/10 p-2.5 rounded-lg hover:border-[#9E7649]/40 transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[10px] uppercase font-black text-[#9E7649] bg-[#9E7649]/10 px-1.5 py-0.5 rounded inline-block">
                                                                        {sug.field}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono font-bold text-[#E8DCCF]/50">
                                                                        {Math.round(sug.sim * 100)}% similitud
                                                                    </span>
                                                                </div>
                                                                <div className="text-stone-300 mt-1 truncate font-medium">
                                                                    <strong>{sug.s1}</strong> ↔ <span className="text-stone-400">{sug.s2}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <select
                                                                    id={`select-sug-${id}`}
                                                                    className="bg-[#2C1B15] border border-[#9E7649]/30 text-stone-200 text-xs rounded-lg px-2 py-1.5 font-medium focus:border-[#9E7649] outline-none max-w-[150px]"
                                                                >
                                                                    <option value={sug.s1}>Usar: {sug.s1}</option>
                                                                    <option value={sug.s2}>Usar: {sug.s2}</option>
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const selectElem = document.getElementById(`select-sug-${id}`) as HTMLSelectElement;
                                                                        const target = selectElem ? selectElem.value : sug.s1;
                                                                        const obsolete = target === sug.s1 ? sug.s2 : sug.s1;
                                                                        handleDirectHomologation(sug.field as 'Escritor' | 'Asesor', target, obsolete);
                                                                    }}
                                                                    className="px-3 py-1.5 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                                >
                                                                    Aplicar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs italic text-stone-400 p-3 bg-[#1A100C]/35 border border-[#9E7649]/5 rounded-xl text-center">
                                                    No se encontraron discrepancias automáticas evidentes en este programa (todas tienen nombres unificados al 80%). Puedes forzar una abajo.
                                                </div>
                                            )}
                                        </div>

                                        {/* Selección de original */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-[#9E7649] uppercase tracking-wide font-mono">
                                                Nombre Original / Definitivo:
                                            </label>
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={homologarOriginal}
                                                    onChange={(e) => setHomologarOriginal(e.target.value)}
                                                    placeholder="Escribe el nombre correcto..."
                                                    className="w-full p-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl text-white text-sm outline-none focus:border-[#9E7649] transition-colors placeholder:text-stone-600 font-medium"
                                                />
                                                {uniquePersonnel.length > 0 && (
                                                    <select
                                                        value={homologarOriginal}
                                                        onChange={(e) => setHomologarOriginal(e.target.value)}
                                                        className="w-full p-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl text-stone-300 text-xs outline-none focus:border-[#9E7649] transition-colors"
                                                    >
                                                        <option value="">O selecciona un nombre existente...</option>
                                                        {uniquePersonnel.map(person => (
                                                            <option key={person} value={person}>{person}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>

                                        {/* Campo de homologación */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-[#9E7649] uppercase tracking-wide font-mono">
                                                Buscar y Reemplazar en Campo:
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['both', 'writer', 'advisor'] as const).map((fieldOption) => (
                                                    <button
                                                        key={fieldOption}
                                                        type="button"
                                                        onClick={() => setHomologarField(fieldOption)}
                                                        className={`py-2 px-3 rounded-lg text-xs font-black border transition-all ${
                                                            homologarField === fieldOption
                                                                ? 'bg-[#9E7649] text-white border-[#9E7649]'
                                                                : 'bg-[#1A100C]/60 hover:bg-[#1A100C] text-[#E8DCCF]/60 border-[#9E7649]/20'
                                                        }`}
                                                    >
                                                        {fieldOption === 'both' ? 'Ambos' : fieldOption === 'writer' ? 'Escritor' : 'Asesor'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Preview Dinámico */}
                                        {homologarOriginal.trim() && (
                                            <div className="p-3 bg-red-950/10 border border-red-950/40 rounded-xl space-y-1.5">
                                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide font-mono">
                                                    Nombres Similares que se convertirán a "{homologarOriginal}":
                                                </p>
                                                {getHomologarCandidates(homologarOriginal, homologarField).length > 0 ? (
                                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                                        {getHomologarCandidates(homologarOriginal, homologarField).map((cand, idx) => (
                                                            <div key={idx} className="text-xs text-stone-300 flex justify-between items-center bg-black/10 px-2 py-1 rounded">
                                                                <span>• {cand}</span>
                                                                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                                                    ({Math.round(getSimilarity(cand, homologarOriginal) * 100)}% coincidencia)
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-[#E8DCCF]/55 italic">
                                                        No se hallaron otras variantes con similitud &gt;= 80% para este nombre.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-4 border-t border-[#9E7649]/15">
                                            <button
                                                type="button"
                                                onClick={() => setShowPulir(false)}
                                                className="px-5 py-2.5 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl text-white font-bold hover:bg-[#3E1E16] text-sm transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleApplyHomologation}
                                                disabled={!homologarOriginal.trim()}
                                                className="px-6 py-2.5 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-40 disabled:hover:bg-[#9E7649]"
                                            >
                                                Aplicar Homologación
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-sans transition-colors duration-300 flex flex-col">
            {/* Navbar Superior (Mantiene el diseño de CMNL App) */}
            <CMNLHeader 
                user={currentUser ? { name: currentUser.name, role: currentUser.classification || currentUser.role } : null}
                sectionTitle={selectedProgram || (showStats ? "Estadísticas" : "Guiones")}
                onMenuClick={onMenuClick}
                onBack={() => {
                    if (selectedProgram || showStats) {
                        setSelectedProgram(null);
                        setShowStats(false);
                        setScriptSearchQuery('');
                    } else {
                        onBack();
                    }
                }}
            >
                {(selectedProgram || showStats) && (
                    <button 
                        onClick={() => { setSelectedProgram(null); setShowStats(false); setScriptSearchQuery(''); }}
                        className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-[#9E7649] hover:text-white transition-colors ml-4 border-l border-white/10 pl-4"
                    >
                        <ChevronLeft size={18} />
                        Volver
                    </button>
                )}
            </CMNLHeader>

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
                {showStats ? (
                    renderStats()
                ) : selectedProgram ? (
                    renderProgramDetail()
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="text-center max-w-4xl mx-auto space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight text-white">Programas de Radio</h2>
                                <p className="text-[#E8DCCF]/60 text-sm">Búsqueda avanzada por programa, fecha, tema o personal.</p>
                            </div>
                            
                            <div className="flex flex-col gap-6 items-center justify-center w-full">
                                {/* Buscador */}
                                <div className="relative group w-full max-w-xl">
                                    <Search size={20} className="absolute left-4 top-3.5 text-[#9E7649]" />
                                    <input
                                        type="text"
                                        placeholder="Ej: Juan Pérez, 2026, Medioambiente..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#2C1B15] border border-[#9E7649]/20 rounded-2xl shadow-sm focus:border-[#9E7649] outline-none transition-all text-white placeholder:text-[#E8DCCF]/30"
                                    />
                                    {searchQuery.trim() !== '' && (
                                        <div className="absolute right-4 top-3.5 text-xs font-bold text-[#9E7649] bg-[#9E7649]/10 px-2 py-1 rounded-md">
                                            {filteredPrograms.reduce((acc, p) => acc + getProgramScripts(p).filter(s => {
                                                const q = searchQuery.toLowerCase().trim();
                                                const themes = Array.isArray(s.themes) ? s.themes : [];
                                                return s.title.toLowerCase().includes(q) || 
                                                    s.dateAdded.includes(q) ||
                                                    s.writer?.toLowerCase().includes(q) ||
                                                    s.advisor?.toLowerCase().includes(q) ||
                                                    themes.some(t => t.toLowerCase().includes(q));
                                            }).length, 0)} resultados
                                        </div>
                                    )}
                                </div>

                                {/* Botones de Acción */}
                                <div className="flex flex-wrap gap-3 justify-center">
                                    {canModify && (
                                        <label className="flex items-center gap-2 px-4 md:px-5 py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl font-bold cursor-pointer transition-all shadow-lg">
                                            <Upload size={18} />
                                            <span className="hidden md:inline text-sm">Cargar TXT</span>
                                            <input 
                                                type="file" 
                                                accept=".txt" 
                                                multiple 
                                                onChange={handleGlobalUpload} 
                                                className="hidden" 
                                                ref={globalUploadRef}
                                            />
                                        </label>
                                    )}
                                    {isFullAdmin && (
                                        <>
                                            <button
                                                onClick={handleClearAllData}
                                                className="flex items-center gap-2 px-4 md:px-5 py-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-500 hover:bg-red-900/40 hover:text-red-400 transition-all shadow-sm"
                                            >
                                                <Trash2 size={18} />
                                                <span className="hidden md:inline text-sm font-bold">Limpiar Todo</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {searchQuery.trim() !== '' ? (
                            <div className="space-y-8">
                                {filteredPrograms.map(program => {
                                    const matchingScripts = getProgramScripts(program).filter(s => {
                                        const q = searchQuery.toLowerCase().trim();
                                        const themes = Array.isArray(s.themes) ? s.themes : [];
                                        return s.title.toLowerCase().includes(q) || 
                                            s.dateAdded.includes(q) ||
                                            s.writer?.toLowerCase().includes(q) ||
                                            s.advisor?.toLowerCase().includes(q) ||
                                            themes.some(t => t.toLowerCase().includes(q));
                                    }).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

                                    if (matchingScripts.length === 0) return null;

                                    return (
                                        <div key={program.name} className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20">
                                            <h4 className="text-lg font-bold text-[#9E7649] mb-4 flex items-center gap-2">
                                                {program.icon} {program.name} ({matchingScripts.length})
                                            </h4>
                                            <div className="flex flex-col gap-4">
                                                {matchingScripts.map(s => (
                                                    <div key={s.id} className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start gap-4 mb-2">
                                                                <div>
                                                                    {!['RCM NOTICIAS', 'ESTACIÓN 95.3'].includes(program.name) && (
                                                                        <h4 className="text-white font-bold text-base uppercase leading-tight">
                                                                            {Array.isArray(s.themes) && s.themes.length > 0 && s.themes[0] !== 'General' ? s.themes.join(', ') : s.title}
                                                                        </h4>
                                                                    )}
                                                                    <p className="text-[#E8DCCF]/60 text-xs mt-1 font-medium italic">
                                                                        {s.title}
                                                                    </p>
                                                                </div>
                                                                <span className="shrink-0 text-[#9E7649] text-xs font-mono font-bold bg-[#9E7649]/10 px-2.5 py-1 rounded-lg border border-[#9E7649]/20">
                                                                    {formatSpanishDate(s.dateAdded)}
                                                                </span>
                                                            </div>
                                                            {program.name !== 'RCM NOTICIAS' && (
                                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium">
                                                                    <span className="flex items-center gap-1.5 text-[#E8DCCF]/70">
                                                                        <UserIcon size={14} className="text-[#9E7649]" />
                                                                        <span className="text-[#E8DCCF]/40">Escritor:</span> {s.writer || 'No especificado'}
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 text-[#E8DCCF]/70">
                                                                        <Shield size={14} className="text-[#9E7649]" />
                                                                        <span className="text-[#E8DCCF]/40">Asesor:</span> {s.advisor || 'No especificado'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : filteredPrograms.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {filteredPrograms.map((program) => {
                                    const scriptCount = getProgramScripts(program).length;
                                    return (
                                        <button
                                            key={program.name}
                                            onClick={() => { setSelectedProgram(program.name); setScriptSearchQuery(''); }}
                                            className="group relative flex flex-col items-center justify-center p-6 bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 hover:border-[#9E7649] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                        >
                                            <div className={`p-4 rounded-2xl ${program.color} text-white shadow-lg group-hover:scale-110 transition-transform mb-3`}>
                                                {program.icon}
                                            </div>
                                            <span className="text-xs font-bold text-white text-center uppercase tracking-tight line-clamp-2">
                                                {program.name}
                                            </span>
                                            <span className="mt-2 text-[10px] font-black text-[#9E7649] bg-[#9E7649]/10 px-2 py-1 rounded-md">
                                                {scriptCount} REGISTROS
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-[#2C1B15]/50 rounded-3xl border-2 border-dashed border-[#9E7649]/20">
                                <Search size={48} className="mx-auto mb-4 text-[#9E7649]/30" />
                                <p className="text-[#E8DCCF]/60 font-medium">
                                    No se encontraron programas o guiones con los términos buscados.
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {floatingPulir.visible && (
                    <div 
                        className="fixed z-50 bg-[#1A100C] border border-[#9E7649] rounded-xl shadow-2xl p-2 flex items-center gap-2 animate-in fade-in zoom-in duration-200"
                        style={{ 
                            left: `${floatingPulir.x}px`, 
                            top: `${floatingPulir.y}px`,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        <button 
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setPulirSearch(floatingPulir.text);
                                setShowPulir(true);
                                setFloatingPulir({ ...floatingPulir, visible: false });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#9E7649] text-white rounded-lg hover:bg-[#8B653D] transition-colors text-xs font-bold"
                        >
                            <Wand2 size={14} /> Pulir Selección
                        </button>
                    </div>
                )}
                {confirmDialog && (
                    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-[#2C1B15] w-full max-w-sm rounded-3xl border border-red-900/50 p-6 flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="font-bold text-xl text-white">Confirmar Acción</h3>
                            <p className="text-stone-300 text-sm leading-relaxed">{confirmDialog.message}</p>
                            <div className="flex justify-center gap-3 w-full mt-4">
                                <button 
                                    onClick={() => setConfirmDialog(null)}
                                    className="flex-1 px-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl text-white font-bold hover:bg-[#3E1E16] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmDialog.onConfirm}
                                    className="flex-1 px-4 py-3 bg-red-600 rounded-xl text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {importReport && (
                    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-[#2C1B15] w-full max-w-2xl rounded-3xl border border-[#9E7649]/30 p-6 flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(158,118,73,0.15)] animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between border-b border-[#9E7649]/20 pb-4 mb-4">
                                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                                    <Database size={24} className="text-[#9E7649]" />
                                    Resultado de Carga Global
                                </h3>
                                <button 
                                    onClick={() => setImportReport(null)}
                                    className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="bg-[#1A100C]/60 p-4 rounded-xl border border-[#9E7649]/10 text-center">
                                        <p className="text-xs text-[#E8DCCF]/50 font-bold uppercase tracking-tight">Total Encontrados</p>
                                        <p className="text-2xl font-black text-white mt-1">{importReport.total}</p>
                                    </div>
                                    <div className="bg-[#1A100C]/60 p-4 rounded-xl border border-[#9E7649]/10 text-center">
                                        <p className="text-xs text-[#E8DCCF]/50 font-bold uppercase tracking-tight text-emerald-500">Cargados con Éxito</p>
                                        <p className="text-2xl font-black text-emerald-400 mt-1">{importReport.loaded}</p>
                                    </div>
                                    <div className="bg-[#1A100C]/60 p-4 rounded-xl border border-[#9E7649]/10 text-center col-span-2 sm:col-span-1">
                                        <p className="text-xs text-[#E8DCCF]/50 font-bold uppercase tracking-tight text-red-500">Rechazados</p>
                                        <p className="text-2xl font-black text-red-400 mt-1">{importReport.rejected.length}</p>
                                    </div>
                                </div>
                                
                                {importReport.rejected.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5 mt-2">
                                            <AlertTriangle size={16} />
                                            Detalle de Guiones Rechazados (Excluidos de la carga):
                                        </h4>
                                        <p className="text-xs text-[#E8DCCF]/65 leading-relaxed">
                                            Para mantener la integridad de la base de datos, se excluyen de la carga todos los guiones que no cuenten con fecha, tema/temas, o escritor/autor definidos en el archivo TXT.
                                        </p>
                                        <div className="space-y-2 max-h-60 overflow-y-auto border border-red-900/30 rounded-xl bg-red-900/5 p-3">
                                            {importReport.rejected.map((rej, i) => (
                                                <div key={i} className="text-xs border-b border-red-900/20 last:border-0 pb-2 last:pb-0 pt-2 first:pt-0 flex justify-between items-start gap-4">
                                                    <div>
                                                        <p className="font-bold text-stone-200">{rej.title}</p>
                                                        {rej.genre && <p className="text-[10px] text-stone-400 mt-0.5">Programa: {rej.genre}</p>}
                                                    </div>
                                                    <span className="shrink-0 font-bold text-red-400 bg-red-900/20 border border-red-500/20 px-2 py-0.5 rounded text-[10px]">
                                                        {rej.reason}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {importReport.rejected.length === 0 && (
                                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                        <div className="p-2 bg-emerald-900/40 text-emerald-400 rounded-xl shrink-0">
                                            <Wand2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">¡Excelente Integridad de Datos!</h4>
                                            <p className="text-xs text-stone-300 mt-0.5 font-medium">Todos los registros del archivo TXT contaban con fecha, tema y escritor válidos, y fueron ingresados exitosamente.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="border-t border-[#9E7649]/20 pt-4 mt-4 flex justify-end">
                                <button
                                    onClick={() => setImportReport(null)}
                                    className="px-6 py-2.5 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl font-bold transition-colors shadow-md text-sm"
                                >
                                    Cerrar Reporte
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </main>
        </div>
    );
};

export default GuionesApp;
