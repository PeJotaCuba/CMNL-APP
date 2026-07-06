import React, { useState, useEffect } from 'react';
import { X, FileDown, DollarSign, Music, Layers, Plus, Trash2, Edit, Upload, FileText, Check, RotateCcw, ChevronLeft, ChevronRight, Folder, FileQuestion, Calendar, CheckCircle2 } from 'lucide-react';
import { Production } from './types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun } from 'docx';
import mammoth from 'mammoth';

interface ProductionTrack {
  title: string;
  author: string;
  authorCountry: string;
  performer: string;
  performerCountry: string;
  genre: string;
}

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonthStr: string; // e.g. "2026-06"
  onMonthChange?: (monthStr: string) => void;
  stockMensual: Production[];
  allProductions?: Production[];
  initialReportType?: 'mensual' | 'economia' | 'incidental';
}

const MONTH_NAMES_SPANISH = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DEFAULT_INCIDENTAL_WORKS = [
  { id: '1', title: 'La Bayamesa', author: 'Céspedes y Fornaris', nac: 'Cuba', frequency: 'Lunes, Miércoles, Viernes' },
  { id: '2', title: 'Cuba Canta', author: 'Cándido Fabré', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '3', title: 'Así es Bayamo', author: 'Manolo Oliva', nac: 'Cuba', frequency: 'Sábado, Domingo' },
  { id: '4', title: 'Bayamo mi pueblo querido', author: 'Pimpo la O', nac: 'Cuba', frequency: 'Lunes, Miércoles, Viernes' },
  { id: '5', title: 'Un día cualquiera', author: 'José Miguel .El Greco', nac: 'Cuba', frequency: 'Diario' },
  { id: '6', title: 'Canción de Cuna', author: 'José Miguel .El Greco', nac: 'Cuba', frequency: 'Diario' },
  { id: '7', title: 'Oportunidad', author: 'Anciro Cano', nac: 'Cuba', frequency: 'Lunes, Miércoles' },
  { id: '8', title: 'Mi son a Bayamo', author: 'Arturo Jorge', nac: 'Cuba', frequency: 'Sábado' },
  { id: '9', title: 'Cuando pasa el Tiempo', author: 'Luis Alberto Vicet', nac: 'Cuba', frequency: 'Diario' },
  { id: '10', title: 'Sin freno', author: 'Orlando Valle', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '11', title: 'La Cumbancha', author: 'Magdiel Pavón', nac: 'Cuba', frequency: 'Lunes, Miércoles, Viernes' },
  { id: '12', title: 'Hablando con Juana', author: 'Alain Pérez', nac: 'Cuba', frequency: 'Diario' },
  { id: '13', title: 'Juana la loca', author: 'David Álvarez y Juego de manos', nac: 'Cuba', frequency: 'Lunes, Viernes' },
  { id: '14', title: 'Y qué tu crees.', author: 'Van Van', nac: 'Cuba', frequency: 'Martes, Jueves' },
  { id: '15', title: 'Juana no me mandas', author: 'Son de Cuba', nac: 'Cuba', frequency: 'Sábado, Domingo' },
  { id: '16', title: 'Bailando con Juana', author: 'Pauchi con Juana Bacallao', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '17', title: 'Cuando no es Juana Es Juana', author: 'Andy Martìnez', nac: 'Cuba', frequency: 'Lunes, Miércoles, Viernes' },
  { id: '18', title: 'Juana', author: 'Idanis Ortiz', nac: 'Cuba', frequency: 'Sábado' },
  { id: '19', title: 'La nota', author: 'Arnaldo y su Talismàn', nac: 'Cuba', frequency: 'Diario' },
  { id: '20', title: 'Razones para un sueño', author: 'Arnaldo y su Talismàn', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '21', title: 'Un hombre que sueña', author: 'Arnaldo y su Talismàn', nac: 'Cuba', frequency: 'Diario' },
  { id: '22', title: 'Libertad', author: 'Arnaldo y su Talismàn', nac: 'Cuba', frequency: 'Lunes, Jueves' },
  { id: '23', title: 'Vivir para vencer', author: 'Arnaldo y su Talismàn', nac: 'Cuba', frequency: 'Diario' },
  { id: '24', title: 'Mi ciudad', author: 'Alexander Abreu', nac: 'Cuba', frequency: 'Lunes, Miércoles, Viernes' },
  { id: '25', title: 'Por encima de lo conocido', author: 'Adrian Berazain', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '26', title: 'Homenaje a José Martí', author: 'Polo Montañés', nac: 'Cuba', frequency: 'Diario' },
  { id: '27', title: 'De Primera', author: 'Alexander Abreu', nac: 'Cuba', frequency: 'Diario' },
  { id: '28', title: 'El buey cansao', author: 'Juan Formel', nac: 'Cuba', frequency: 'Martes, Jueves' },
  { id: '29', title: 'He venido', author: 'Los safiros', nac: 'Cuba', frequency: 'Sábado, Domingo' },
  { id: '30', title: 'Canto a la abuela', author: 'Pablo Milanès', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '31', title: 'Catedral', author: 'Arturo jorge', nac: 'Cuba', frequency: 'Diario' },
  { id: '32', title: 'Así es el son', author: 'David Álvarez', nac: 'Cuba', frequency: 'Lunes, Miércoles, Viernes' },
  { id: '33', title: 'Llora si te duele', author: 'Osvaldo Montero', nac: 'Cuba', frequency: 'Sábado, Domingo' },
  { id: '34', title: 'Mi salsa', author: 'Elito Revè', nac: 'Cuba', frequency: 'Diario' },
  { id: '35', title: 'La celosa', author: 'Alexander Abreu', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '36', title: 'Me voy pa mi casa', author: 'Erik iglesias', nac: 'Cuba', frequency: 'Martes, Jueves' },
  { id: '37', title: 'Que suenen los tambores', author: 'Osmani Espinosa', nac: 'Cuba', frequency: 'Diario' },
  { id: '38', title: 'Las canelas', author: 'Son canelas', nac: 'Cuba', frequency: 'Lunes, Miércoles, Viernes' },
  { id: '39', title: 'Guajiro', author: 'Jorge Yunior', nac: 'Cuba', frequency: 'Sábado, Domingo' },
  { id: '40', title: 'Bayamo con su saco', author: 'Pablo Milanès', nac: 'Cuba', frequency: 'Lunes a Viernes' },
  { id: '41', title: 'A cualquiera le dan', author: 'Jorge Yunior', nac: 'Cuba', frequency: 'Martes, Jueves' }
];

// Helper to count specific days of a week in a month
const countDaysInMonth = (year: number, month: number, daysToCount: number[]): number => {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    // mid-day 12:00:00 to prevent timezone-shift day discrepancies
    const date = new Date(year, month - 1, d, 12, 0, 0);
    const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    if (daysToCount.includes(dayOfWeek)) {
      count++;
    }
  }
  return count;
};

// Helper to parse day numbers (0-6) from frequency strings
const parseDaysFromFrequency = (freq: string): number[] => {
  const clean = freq.toLowerCase().trim();
  
  // Check specific popular continuous ranges FIRST:
  if (clean.includes('lunes a viernes') || clean.includes('l-v') || clean.includes('l a v')) {
    return [1, 2, 3, 4, 5]; // Mon to Fri
  }
  if (clean.includes('lunes a sabado') || clean.includes('lunes a sábado') || clean.includes('l-s') || clean.includes('l a s')) {
    return [1, 2, 3, 4, 5, 6]; // Mon to Sat
  }
  if (clean.includes('lunes a domingo') || clean.includes('l-d') || clean.includes('l a d') || clean.includes('diario') || clean.includes('diaria') || clean.includes('todos los dias') || clean.includes('todos los días')) {
    return [0, 1, 2, 3, 4, 5, 6]; // All days
  }
  if (clean.includes('fines de semana') || clean.includes('s-d') || clean.includes('fin de semana') || clean.includes('sabado, domingo') || clean.includes('sábado, domingo')) {
    return [0, 6]; // Sun, Sat
  }
  
  // Individual days match
  const days: number[] = [];
  if (clean.includes('domingo') || clean.includes('dom') || clean.includes('do ')) days.push(0);
  if (clean.includes('lunes') || clean.includes('lun') || clean.includes('l ')) days.push(1);
  if (clean.includes('martes') || clean.includes('mar') || clean.includes('ma ')) days.push(2);
  if (clean.includes('miercoles') || clean.includes('miércoles') || clean.includes('mie') || clean.includes('mié') || clean.includes('mi ')) days.push(3);
  if (clean.includes('jueves') || clean.includes('jue') || clean.includes('ju ')) days.push(4);
  if (clean.includes('viernes') || clean.includes('vie') || clean.includes('vi ')) days.push(5);
  if (clean.includes('sabado') || clean.includes('sábado') || clean.includes('sab') || clean.includes('sáb') || clean.includes('sa ')) days.push(6);
  
  return days;
};

// Helper to calculate emission count of a work in the month
const calculateMonthlyCount = (freq: string, year: number, month: number): number => {
  const cleanFreq = freq.toLowerCase().trim();
  
  // Direct Numeric frequency
  const directNum = parseInt(cleanFreq, 10);
  if (!isNaN(directNum) && directNum.toString() === cleanFreq) {
    return directNum;
  }
  
  const daysInMonth = new Date(year, month, 0).getDate();
  
  if (cleanFreq.includes('diario') || cleanFreq.includes('diaria') || cleanFreq.includes('todos los dias') || cleanFreq.includes('todos los días')) {
    return daysInMonth;
  }
  
  const daysToCount = parseDaysFromFrequency(cleanFreq);
  if (daysToCount.length === 0) {
    if (cleanFreq.includes('semanal') || cleanFreq.includes('1 vez')) {
      return 4;
    }
    if (cleanFreq.includes('bisemanal') || cleanFreq.includes('2 veces')) {
      return 8;
    }
    // default: Monday to Friday
    return countDaysInMonth(year, month, [1, 2, 3, 4, 5]);
  }
  
  return countDaysInMonth(year, month, daysToCount);
};

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  selectedMonthStr,
  onMonthChange,
  stockMensual,
  allProductions = [],
  initialReportType
}) => {
  const [activeReportType, setActiveReportType] = useState<'mensual' | 'economia' | 'incidental'>('mensual');
  const [activePeriod, setActivePeriod] = useState<'mensual' | 'trimestral' | 'semestral' | 'anual'>('mensual');

  // Archive States
  const [archiveMensual, setArchiveMensual] = useState<Record<string, any>>({});
  const [archiveEconomia, setArchiveEconomia] = useState<Record<string, any>>({});
  const [archiveIncidental, setArchiveIncidental] = useState<Record<string, any>>({});
  const [showArchiveManager, setShowArchiveManager] = useState<boolean>(false);
  const [archiveManagerType, setArchiveManagerType] = useState<'mensual' | 'economia' | 'incidental'>('mensual');
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);

  // Preview Uploaded Data
  const [previewUploadedData, setPreviewUploadedData] = useState<any>(null);
  const [previewMonthKey, setPreviewMonthKey] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'mensual' | 'economia' | 'incidental' | null>(null);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonthStr.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    onMonthChange?.(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonthStr.split('-').map(Number);
    const d = new Date(year, month, 1);
    onMonthChange?.(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Input fields for coordinators' signatures
  const [coordinadorMusical, setCoordinadorMusical] = useState('Pedro José Reyes Acuña');
  const [jefeProgramacion, setJefeProgramacion] = useState('Beatriz González Rondón');

  // Economy coefficients
  const [costoPorObra, setCostoPorObra] = useState(15); // $15 CUP per play
  const [montoFijoBase, setMontoFijoBase] = useState(2500); // base program cost

  // Incidental works catalogue state
  const [incidentalWorks, setIncidentalWorks] = useState<{
    id: string;
    title: string;
    author: string;
    nac: string;
    frequency: string;
  }[]>(DEFAULT_INCIDENTAL_WORKS);

  useEffect(() => {
    if (isOpen) {
      // 1. Incidental works
      const savedIncidentalWorks = localStorage.getItem('rcm_incidental_works_catalogue');
      if (savedIncidentalWorks) {
        try {
          const parsed = JSON.parse(savedIncidentalWorks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIncidentalWorks(parsed);
          }
        } catch (e) {
          console.error("Error parsing incidental works catalogue:", e);
        }
      }

      // 2. Cost and fixed base
      const savedCosto = localStorage.getItem('rcm_costo_por_obra');
      if (savedCosto) setCostoPorObra(Number(savedCosto));

      const savedBase = localStorage.getItem('rcm_monto_fijo_base');
      if (savedBase) setMontoFijoBase(Number(savedBase));

      // 3. Coordinator / Jefe de programación overrides
      const savedCoord = localStorage.getItem('rcm_coordinador_musical_override');
      if (savedCoord) {
        setCoordinadorMusical(savedCoord);
      } else {
        // Fallback to rcm_equipo_cmnl
        const savedEquipo = localStorage.getItem('rcm_equipo_cmnl');
        if (savedEquipo) {
          try {
            const equipo = JSON.parse(savedEquipo);
            if (Array.isArray(equipo)) {
              const coord = equipo.find((m: any) => {
                const spec = (m.specialty || '').toLowerCase();
                return spec.includes('especialista en gestion de contenido') || 
                       spec.includes('especialista en gestión de contenido') || 
                       spec.includes('especialista en gestion de contenidos') || 
                       spec.includes('especialista en gestión de contenidos');
              });
              if (coord) {
                setCoordinadorMusical(coord.name);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      const savedJefe = localStorage.getItem('rcm_jefe_programacion_override');
      if (savedJefe) {
        setJefeProgramacion(savedJefe);
      } else {
        // Fallback to rcm_equipo_cmnl
        const savedEquipo = localStorage.getItem('rcm_equipo_cmnl');
        if (savedEquipo) {
          try {
            const equipo = JSON.parse(savedEquipo);
            if (Array.isArray(equipo)) {
              const jefe = equipo.find((m: any) => {
                const spec = (m.specialty || '').toLowerCase();
                return spec.includes('jefe de programacion') || 
                       spec.includes('jefe de programación') || 
                       spec.includes('jefa de programacion') || 
                       spec.includes('jefa de programación');
              });
              if (jefe) {
                setJefeProgramacion(jefe.name);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      // Load archives
      const savedArchiveM = localStorage.getItem('rcm_archive_mensual');
      if (savedArchiveM) {
        try { setArchiveMensual(JSON.parse(savedArchiveM)); } catch (e) { console.error(e); }
      }
      const savedArchiveE = localStorage.getItem('rcm_archive_economia');
      if (savedArchiveE) {
        try { setArchiveEconomia(JSON.parse(savedArchiveE)); } catch (e) { console.error(e); }
      }
      const savedArchiveI = localStorage.getItem('rcm_archive_incidental');
      if (savedArchiveI) {
        try { setArchiveIncidental(JSON.parse(savedArchiveI)); } catch (e) { console.error(e); }
      }
    }
  }, [isOpen]);

  // Persists edits to localStorage
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('rcm_incidental_works_catalogue', JSON.stringify(incidentalWorks));
    }
  }, [incidentalWorks, isOpen]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('rcm_costo_por_obra', String(costoPorObra));
    }
  }, [costoPorObra, isOpen]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('rcm_monto_fijo_base', String(montoFijoBase));
    }
  }, [montoFijoBase, isOpen]);

  const handleCoordinadorChange = (val: string) => {
    setCoordinadorMusical(val);
    localStorage.setItem('rcm_coordinador_musical_override', val);
  };

  const handleJefeChange = (val: string) => {
    setJefeProgramacion(val);
    localStorage.setItem('rcm_jefe_programacion_override', val);
  };

  const saveToArchive = (type: 'mensual' | 'economia' | 'incidental', monthKey: string, data: any) => {
    if (type === 'mensual') {
      const updated = { ...archiveMensual, [monthKey]: data };
      setArchiveMensual(updated);
      localStorage.setItem('rcm_archive_mensual', JSON.stringify(updated));
    } else if (type === 'economia') {
      const updated = { ...archiveEconomia, [monthKey]: data };
      setArchiveEconomia(updated);
      localStorage.setItem('rcm_archive_economia', JSON.stringify(updated));
    } else if (type === 'incidental') {
      const updated = { ...archiveIncidental, [monthKey]: data };
      setArchiveIncidental(updated);
      localStorage.setItem('rcm_archive_incidental', JSON.stringify(updated));
    }
  };

  const deleteFromArchive = (type: 'mensual' | 'economia' | 'incidental', monthKey: string) => {
    if (type === 'mensual') {
      setArchiveMensual(prev => {
        const updated = { ...prev };
        delete updated[monthKey];
        localStorage.setItem('rcm_archive_mensual', JSON.stringify(updated));
        return updated;
      });
    } else if (type === 'economia') {
      setArchiveEconomia(prev => {
        const updated = { ...prev };
        delete updated[monthKey];
        localStorage.setItem('rcm_archive_economia', JSON.stringify(updated));
        return updated;
      });
    } else if (type === 'incidental') {
      setArchiveIncidental(prev => {
        const updated = { ...prev };
        delete updated[monthKey];
        localStorage.setItem('rcm_archive_incidental', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const getPeriodName = (mNum: number, yr: number, pType: string) => {
    if (pType === 'mensual') return `${MONTH_NAMES_SPANISH[mNum - 1].toUpperCase()} / ${yr}`;
    if (pType === 'trimestral') {
      if (mNum <= 3) return `1er TRIMESTRE (ENERO-MARZO) / ${yr}`;
      if (mNum <= 6) return `2do TRIMESTRE (ABRIL-JUNIO) / ${yr}`;
      if (mNum <= 9) return `3er TRIMESTRE (JULIO-SEPTIEMBRE) / ${yr}`;
      return `4to TRIMESTRE (OCTUBRE-DICIEMBRE) / ${yr}`;
    }
    if (pType === 'semestral') {
      return mNum <= 6 ? `1er SEMESTRE (ENERO-JUNIO) / ${yr}` : `2do SEMESTRE (JULIO-DICIEMBRE) / ${yr}`;
    }
    return `AÑO ${yr}`;
  };

  const parseMensualDocx = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    const dataSnap = {
      totalWorks: 0, cubaWorks: 0, foreignWorks: 0,
      totalAuthors: 0, cubaAuthors: 0, foreignAuthors: 0,
      totalPerformers: 0, cubaPerformers: 0, foreignPerformers: 0,
      regions: {
        'Latinoam. y del Caribe': { works: 0, authors: 0, performers: 0 },
        'Norteamericana': { works: 0, authors: 0, performers: 0 },
        'Europa': { works: 0, authors: 0, performers: 0 },
        'Asia': { works: 0, authors: 0, performers: 0 },
        'Africa': { works: 0, authors: 0, performers: 0 },
        'Otras zonas': { works: 0, authors: 0, performers: 0 }
      } as Record<string, any>,
      topSongs: [] as any[],
      topAuthors: [] as any[],
      topPerformers: [] as any[],
      topGenres: [] as any[]
    };

    const clean = (val: string) => {
      if (!val) return 0;
      const match = val.match(/\d+/);
      if (!match) return 0;
      return parseInt(match[0]) || 0;
    };

    let currentSection: 'stats' | 'songs' | 'authors' | 'performers' | 'genres' = 'stats';

    for (const table of Array.from(tables)) {
      const rows = Array.from(table.querySelectorAll('tr'));
      
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => (td.textContent || '').trim());
        const rowText = (row.textContent || '').toLowerCase();
        
        // Skip header rows for rankings more robustly
        if (cells.some(c => c.toLowerCase() === 'no') && cells.length > 2) return;

        // Section detection based on row text
        if (rowText.includes('obras musicales') && (rowText.includes('difundidas') || rowText.includes('difundidos'))) {
          currentSection = 'songs';
          return;
        }
        if ((rowText.includes('autores') || rowText.includes('autor')) && rowText.includes('difundidos') && !rowText.includes('obras')) {
          currentSection = 'authors';
          return;
        }
        if ((rowText.includes('intérpretes') || rowText.includes('interpretes')) && rowText.includes('difundidos')) {
          currentSection = 'performers';
          return;
        }
        if ((rowText.includes('géneros') || rowText.includes('generos')) && rowText.includes('difundidos')) {
          currentSection = 'genres';
          return;
        }
        if ((rowText.includes('zona') || rowText.includes('geográfica')) && (rowText.includes('obra') || rowText.includes('autor') || rowText.includes('interprete'))) {
          currentSection = 'stats';
          return;
        }

        if (cells.length < 2) return;

        if (currentSection === 'stats') {
          const numericValues = cells.filter(c => /\d+/.test(c)).map(c => clean(c));
          
          if (numericValues.length < 6) return;
          
          const vCount = numericValues[0];
          const aCount = numericValues[2];
          const pCount = numericValues[4];

          if (rowText.includes('cuban') || (rowText.includes('cuba') && !rowText.includes('norteamerica'))) {
             dataSnap.cubaWorks = Math.max(dataSnap.cubaWorks, vCount);
             dataSnap.cubaAuthors = Math.max(dataSnap.cubaAuthors, aCount);
             dataSnap.cubaPerformers = Math.max(dataSnap.cubaPerformers, pCount);
          } else if (rowText.includes('extranjer') || rowText.includes('foreign')) {
             dataSnap.foreignWorks = Math.max(dataSnap.foreignWorks, vCount);
             dataSnap.foreignAuthors = Math.max(dataSnap.foreignAuthors, aCount);
             dataSnap.foreignPerformers = Math.max(dataSnap.foreignPerformers, pCount);
          } else if (rowText.includes('total general')) {
             dataSnap.totalWorks = Math.max(dataSnap.totalWorks, vCount);
             dataSnap.totalAuthors = Math.max(dataSnap.totalAuthors, aCount);
             dataSnap.totalPerformers = Math.max(dataSnap.totalPerformers, pCount);
          } else {
             // Regional rows
             Object.keys(dataSnap.regions).forEach(reg => {
               const rKey = reg.toLowerCase().substring(0, 8);
               if (rowText.includes(rKey)) {
                  dataSnap.regions[reg].works = vCount;
                  dataSnap.regions[reg].authors = aCount;
                  dataSnap.regions[reg].performers = pCount;
               }
             });
          }
        } else if (currentSection === 'songs') {
           if (cells.length >= 6 && !isNaN(parseInt(cells[0]))) {
              // No, Titulo, Interprete, Nac, Autor, Nac, Exec
              dataSnap.topSongs.push({
                track: {
                  title: cells[1],
                  performer: cells[2],
                  performerCountry: cells[3],
                  author: cells[4],
                  authorCountry: cells[5]
                },
                count: clean(cells[cells.length - 1])
              });
           }
        } else if (currentSection === 'authors') {
           const numericIndices = cells.map((c, i) => /\d+/.test(c) ? i : -1).filter(i => i !== -1);
           if (numericIndices.length >= 2) {
             dataSnap.topAuthors.push({
               name: cells[1],
               nac: cells[2],
               execs: clean(cells[numericIndices[numericIndices.length - 2]]),
               frec: clean(cells[numericIndices[numericIndices.length - 1]])
             });
           }
        } else if (currentSection === 'performers') {
           const numericIndices = cells.map((c, i) => /\d+/.test(c) ? i : -1).filter(i => i !== -1);
           if (numericIndices.length >= 2) {
             dataSnap.topPerformers.push({
               name: cells[1],
               nac: cells[2],
               execs: clean(cells[numericIndices[numericIndices.length - 2]]),
               frec: clean(cells[numericIndices[numericIndices.length - 1]])
             });
           }
        } else if (currentSection === 'genres') {
           if (cells.length >= 2 && !isNaN(parseInt(cells[0]))) {
             dataSnap.topGenres.push({
               name: cells[1],
               execs: clean(cells[cells.length - 1])
             });
           }
        }
      });
    }
    
    if (!dataSnap.totalWorks) dataSnap.totalWorks = dataSnap.cubaWorks + dataSnap.foreignWorks;
    if (!dataSnap.totalAuthors) dataSnap.totalAuthors = dataSnap.cubaAuthors + dataSnap.foreignAuthors;
    if (!dataSnap.totalPerformers) dataSnap.totalPerformers = dataSnap.cubaPerformers + dataSnap.foreignPerformers;
    
    return dataSnap;
  };

  const parseEconomiaDocx = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    const dataSnap = {
      completasCubana: 0,
      completasExtranjera: 0,
      completasTotal: 0,
      instrumentalesCubana: 0,
      instrumentalesExtranjera: 0,
      instrumentalesTotal: 0,
      incidentalesCubana: 0,
      incidentalesExtranjera: 0,
      incidentalesTotal: 0
    };

    const clean = (val: string) => {
      if (!val || val === '-') return 0;
      const num = val.replace(/[^\d]/g, '');
      return parseInt(num) || 0;
    };

    // 1. Try tables
    for (const table of Array.from(tables)) {
      const rows = Array.from(table.querySelectorAll('tr'));
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => (td.textContent || '').trim());
        const title = (cells[0] || '').toLowerCase();
        
        if (cells.length >= 2) {
          if (title.includes('completa')) {
            dataSnap.completasCubana = clean(cells[1]);
            dataSnap.completasExtranjera = (cells.length > 2) ? clean(cells[2]) : 0;
            dataSnap.completasTotal = (cells.length > 3) ? clean(cells[3]) : (dataSnap.completasCubana + dataSnap.completasExtranjera);
          } else if (title.includes('instrumental')) {
            dataSnap.instrumentalesCubana = clean(cells[1]);
            dataSnap.instrumentalesExtranjera = (cells.length > 2) ? clean(cells[2]) : 0;
            dataSnap.instrumentalesTotal = (cells.length > 3) ? clean(cells[3]) : (dataSnap.instrumentalesCubana + dataSnap.instrumentalesExtranjera);
          } else if (title.includes('incidental')) {
            dataSnap.incidentalesCubana = clean(cells[1]);
            dataSnap.incidentalesExtranjera = (cells.length > 2) ? clean(cells[2]) : 0;
            dataSnap.incidentalesTotal = (cells.length > 3) ? clean(cells[3]) : (dataSnap.incidentalesCubana + dataSnap.incidentalesExtranjera);
          }
        }
      });
    }

    // 2. Try text regex if tables are empty
    if (!dataSnap.completasTotal) {
      const lines = doc.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        const lower = line.toLowerCase();
        const parts = line.split(/\s+/).filter(p => !isNaN(clean(p)) || p === '-').map(p => clean(p));
        
        if (lower.includes('completas')) {
          if (parts.length >= 2) {
            dataSnap.completasCubana = parts[0];
            dataSnap.completasExtranjera = parts[1];
            dataSnap.completasTotal = parts[2] || (parts[0] + parts[1]);
          }
        } else if (lower.includes('instrumentales')) {
          if (parts.length >= 2) {
            dataSnap.instrumentalesCubana = parts[0];
            dataSnap.instrumentalesExtranjera = parts[1];
            dataSnap.instrumentalesTotal = parts[2] || (parts[0] + parts[1]);
          }
        } else if (lower.includes('incidentales')) {
          if (parts.length >= 2) {
            dataSnap.incidentalesCubana = parts[0];
            dataSnap.incidentalesExtranjera = parts[1];
            dataSnap.incidentalesTotal = parts[2] || (parts[0] + parts[1]);
          }
        }
      });
    }

    return dataSnap;
  };

  const parseIncidentalDocx = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    const dataSnap = {
      cubaWorksCount: 0,
      cubaPct: '0',
      cubaAuthors: 0,
      cubaAuthorsPct: '0',
      foreignWorksCount: 0,
      foreignPct: '0',
      foreignAuthors: 0,
      foreignAuthorsPct: '0',
      totalWorks: 0,
      totalAuthors: 0,
      regions: {
        latam: { works: 0, pct: '0', authors: 0, authorsPct: '0' },
        norte: { works: 0, pct: '0', authors: 0, authorsPct: '0' },
        europa: { works: 0, pct: '0', authors: 0, authorsPct: '0' },
        otras: { works: 0, pct: '0', authors: 0, authorsPct: '0' }
      }
    };

    const clean = (val: string) => {
      if (!val) return 0;
      const num = val.replace(/[^\d]/g, '');
      return parseInt(num) || 0;
    };

    for (const table of Array.from(tables)) {
      const rows = Array.from(table.querySelectorAll('tr'));
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => (td.textContent || '').trim());
        const rowText = (row.textContent || '').toLowerCase();
        
        if (cells.length >= 4) {
          // Columns: No (0), Zonas (1), Cant. Obras (2), % (3), Cant. Autores (4), % (5)
          const wIdx = cells.length >= 6 ? 2 : 1;
          const wPctIdx = wIdx + 1;
          const aIdx = wPctIdx + 1;
          const aPctIdx = aIdx + 1;

          if (rowText.includes('cuban') || (rowText.includes('cuba') && !rowText.includes('norteamerica'))) {
            dataSnap.cubaWorksCount = clean(cells[wIdx]);
            dataSnap.cubaPct = cells[wPctIdx] || '0';
            dataSnap.cubaAuthors = (cells.length > aIdx) ? clean(cells[aIdx]) : 0;
            dataSnap.cubaAuthorsPct = (cells.length > aPctIdx) ? cells[aPctIdx] : '0';
          } else if (rowText.includes('extranjer') || rowText.includes('foreign')) {
            dataSnap.foreignWorksCount = clean(cells[wIdx]);
            dataSnap.foreignPct = cells[wPctIdx] || '0';
            dataSnap.foreignAuthors = (cells.length > aIdx) ? clean(cells[aIdx]) : 0;
            dataSnap.foreignAuthorsPct = (cells.length > aPctIdx) ? cells[aPctIdx] : '0';
          } else if (rowText.includes('total general')) {
            dataSnap.totalWorks = clean(cells[wIdx]);
            dataSnap.totalAuthors = (cells.length > aIdx) ? clean(cells[aIdx]) : 0;
          } else if (rowText.includes('latinoam') || rowText.includes('caribe')) {
            dataSnap.regions.latam.works = clean(cells[wIdx]);
            dataSnap.regions.latam.pct = cells[wPctIdx] || '0';
            dataSnap.regions.latam.authors = (cells.length > aIdx) ? clean(cells[aIdx]) : 0;
            dataSnap.regions.latam.authorsPct = (cells.length > aPctIdx) ? cells[aPctIdx] : '0';
          } else if (rowText.includes('norteameri')) {
            dataSnap.regions.norte.works = clean(cells[wIdx]);
            dataSnap.regions.norte.pct = cells[wPctIdx] || '0';
            dataSnap.regions.norte.authors = (cells.length > aIdx) ? clean(cells[aIdx]) : 0;
            dataSnap.regions.norte.authorsPct = (cells.length > aPctIdx) ? cells[aPctIdx] : '0';
          } else if (rowText.includes('europa')) {
            dataSnap.regions.europa.works = clean(cells[wIdx]);
            dataSnap.regions.europa.pct = cells[wPctIdx] || '0';
            dataSnap.regions.europa.authors = (cells.length > aIdx) ? clean(cells[aIdx]) : 0;
            dataSnap.regions.europa.authorsPct = (cells.length > aPctIdx) ? cells[aPctIdx] : '0';
          } else if (rowText.includes('otras') || rowText.includes('zona')) {
            if (rowText.includes('otras')) {
              dataSnap.regions.otras.works = clean(cells[wIdx]);
              dataSnap.regions.otras.pct = cells[wPctIdx] || '0';
              dataSnap.regions.otras.authors = (cells.length > aIdx) ? clean(cells[aIdx]) : 0;
              dataSnap.regions.otras.authorsPct = (cells.length > aPctIdx) ? cells[aPctIdx] : '0';
            }
          }
        }
      });
    }
    return dataSnap;
  };

  const detectMonthFromHtml = (html: string, filename: string) => {
    const text = html.toLowerCase();
    
    // 1. Try content patterns like "MES: MAYO" or "MES : MAYO"
    for (let i = 0; i < MONTH_NAMES_SPANISH.length; i++) {
        const mName = MONTH_NAMES_SPANISH[i].toLowerCase();
        const patterns = [
          `mes: ${mName}`, `mes : ${mName}`, `mes:${mName}`, 
          `mes: <strong>${mName}</strong>`, `mes:<strong>${mName}</strong>`,
          `para el mes de ${mName}`
        ];
        if (patterns.some(p => text.includes(p))) return i + 1;
    }
    
    // 2. Try filename patterns
    const cleanFile = filename.toLowerCase();
    for (let i = 0; i < MONTH_NAMES_SPANISH.length; i++) {
      if (cleanFile.includes(MONTH_NAMES_SPANISH[i].toLowerCase())) return i + 1;
    }

    // 3. Fallback: try just finding the month name in a likely-heading HTML spot
    for (let i = 0; i < MONTH_NAMES_SPANISH.length; i++) {
       const mName = MONTH_NAMES_SPANISH[i].toLowerCase();
       if (text.includes(`>${mName.toUpperCase()}<`) || text.includes(`> ${mName.toUpperCase()} <`)) {
           return i + 1;
       }
    }
    return null;
  };

  const detectYearFromHtml = (html: string, filename: string) => {
    const text = html.toLowerCase();
    const cleanFile = filename.toLowerCase();

    // 1. Try content regex
    const match = text.match(/año:\s*(\d{4})/i) || text.match(/año\s*:\s*(\d{4})/i) || text.match(/año:\s*<strong>(\d{4})<\/strong>/i);
    if (match) return parseInt(match[1]);

    // 2. Try filename regex
    const yearMatch = cleanFile.match(/\b(20\d{2})\b/);
    if (yearMatch) return parseInt(yearMatch[1]);

    return new Date().getFullYear();
  };

  const handleBulkUploadFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    let successCount = 0;
    let lastUploaded: { type: 'mensual' | 'economia' | 'incidental', mStr: string } | null = null;
    
    for (const file of fileArray) {
        await new Promise<void>((resolve) => {
            const isTxt = file.name.toLowerCase().endsWith('.txt');
            
            if (isTxt) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const text = e.target?.result as string;
                    if (!text) { resolve(); return; }
                    
                    const mStr = extractMonthYearFromText(text); // Need to implement this helper or adapt detection
                    if (!mStr) { console.warn('Could not detect date'); resolve(); return; }
                    
                    const parsed = parseMensualTxt(text);
                    if (parsed && Object.keys(parsed).length > 0) {
                        saveToArchive('mensual', mStr, parsed);
                        successCount++;
                        lastUploaded = { type: 'mensual', mStr };
                    }
                    resolve();
                };
                reader.readAsText(file);
            } else {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    if (!arrayBuffer) { resolve(); return; }
                    try {
                        const result = await mammoth.convertToHtml({ arrayBuffer });
                        const html = result.value;
                        
                        const detectedMonth = detectMonthFromHtml(html, file.name);
                        const detectedYear = detectYearFromHtml(html, file.name);
                        
                        if (!detectedMonth) {
                            console.warn(`Could not detect month for file: ${file.name}`);
                            resolve();
                            return;
                        }
                        
                        const mStr = `${detectedYear}-${String(detectedMonth).padStart(2, '0')}`;
                        
                        let type: 'mensual' | 'economia' | 'incidental' | null = null;
                        let parsed = {};
                        
                        const lowHtml = html.toLowerCase();
                        if (lowHtml.includes('indicadores de música incidental') || lowHtml.includes('informativo música incidental')) {
                            type = 'incidental';
                            parsed = parseIncidentalDocx(html);
                        } else if (lowHtml.includes('indicadores de economía') || lowHtml.includes('aspectos económicos')) {
                            type = 'economia';
                            parsed = parseEconomiaDocx(html);
                        } else {
                            if (lowHtml.includes('obras musicales más difundidas') || lowHtml.includes('distribución geográfica')) {
                                type = 'mensual';
                                parsed = parseMensualDocx(html);
                            } else if (file.name.toLowerCase().includes('mensual')) {
                                type = 'mensual';
                                parsed = parseMensualDocx(html);
                            } else if (file.name.toLowerCase().includes('economia')) {
                                type = 'economia';
                                parsed = parseEconomiaDocx(html);
                            } else if (file.name.toLowerCase().includes('incidental')) {
                                type = 'incidental';
                                parsed = parseIncidentalDocx(html);
                            }
                        }
                        
                        if (type && parsed && Object.keys(parsed).length > 0) {
                            saveToArchive(type, mStr, parsed);
                            successCount++;
                            lastUploaded = { type, mStr };
                        }
                    } catch (err) {
                        console.error(`Error processing ${file.name}:`, err);
                    }
                    resolve();
                };
                reader.readAsArrayBuffer(file);
            }
        });
    }
    
    if (successCount > 0) {
      if (lastUploaded && onMonthChange) {
        onMonthChange(lastUploaded.mStr);
        setActiveReportType(lastUploaded.type);
        setActivePeriod("mensual");
        setShowArchiveManager(false);
      }
      alert(`Se procesaron y guardaron ${successCount} informe(s) automáticamente.`);
    } else {
      alert("No se pudieron procesar los archivos. Verifique el formato.");
    }
  };

  const handleUploadFileForPreview = (mKey: string, file: File, type: 'mensual' | 'economia' | 'incidental') => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result;
      if (!result) return;
      try {
        let finalParsed = {};
        if (file.name.toLowerCase().endsWith('.txt')) {
             finalParsed = parseMensualTxt(result as string);
        } else {
            const resultHtml = await mammoth.convertToHtml({ arrayBuffer: result as ArrayBuffer });
            const html = resultHtml.value;
            if (type === "mensual") {
              finalParsed = parseMensualDocx(html);
            } else if (type === "economia") {
              finalParsed = parseEconomiaDocx(html);
            } else if (type === "incidental") {
              finalParsed = parseIncidentalDocx(html);
            }
        }
        
        setPreviewUploadedData(finalParsed);
        setPreviewMonthKey(mKey);
        setPreviewType(type);
      } catch (err) {
        console.error(err);
        alert("Error al procesar el archivo: " + (err?.message || err));
      }
    };
    if (file.name.toLowerCase().endsWith('.txt')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
  };

  // Period ranges getter
  const getMonthsForPeriod = (monthStr: string, period: 'mensual' | 'trimestral' | 'semestral' | 'anual') => {
    const [yearPart, monthPart] = monthStr.split('-');
    const year = parseInt(yearPart, 10);
    const month = parseInt(monthPart, 10);

    if (period === 'mensual') {
      return [monthStr];
    } else if (period === 'trimestral') {
      const quarter = Math.floor((month - 1) / 3);
      const startM = quarter * 3 + 1;
      return [
        `${year}-${String(startM).padStart(2, '0')}`,
        `${year}-${String(startM + 1).padStart(2, '0')}`,
        `${year}-${String(startM + 2).padStart(2, '0')}`
      ];
    } else if (period === 'semestral') {
      const semester = Math.floor((month - 1) / 6);
      const startM = semester * 6 + 1;
      return Array.from({ length: 6 }, (_, i) => `${year}-${String(startM + i).padStart(2, '0')}`);
    } else {
      return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    }
  };

  // Quick editing row state
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editNac, setEditNac] = useState('');
  const [editFrequency, setEditFrequency] = useState('');

  // Add new row input state
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newNac, setNewNac] = useState('Cuba');
  const [newFrequency, setNewFrequency] = useState('Lunes a Viernes');

  // Textarea input state for raw paste
  const [rawTextPaste, setRawTextPaste] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  // Catalog helper handlers
  const handleParseIncidentalsText = (text: string) => {
    const lines = text.split('\n');
    const parsedWorks: {
      title: string;
      author: string;
      nac: string;
      frequency: string;
    }[] = [];
    
    let currentWork: Partial<{
      title: string;
      author: string;
      nac: string;
      frequency: string;
    }> = {};
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const lower = trimmed.toLowerCase();
      
      // Look for indicators of new blocks
      if (lower.startsWith('obra #') || lower.startsWith('obra:') || lower.startsWith('obra ')) {
        if (currentWork.title || currentWork.author) {
          parsedWorks.push({
            title: currentWork.title || 'Música Incidental',
            author: currentWork.author || 'Anónimo',
            nac: currentWork.nac || 'Cuba',
            frequency: currentWork.frequency || 'Lunes a Viernes'
          });
        }
        currentWork = {};
        return;
      }
      
      // Match key-value pairs
      if (lower.startsWith('titulo:') || lower.startsWith('título:')) {
        currentWork.title = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('autor:') || lower.startsWith('autores:')) {
        currentWork.author = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('frecuencia:') || lower.startsWith('dias:') || lower.startsWith('días:')) {
        currentWork.frequency = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      } else if (lower.startsWith('nac:') || lower.startsWith('nacionalidad:') || lower.startsWith('zona:')) {
        currentWork.nac = trimmed.slice(trimmed.indexOf(':') + 1).trim();
      }
    });
    
    // Final work
    if (currentWork.title || currentWork.author) {
      parsedWorks.push({
        title: currentWork.title || 'Música Incidental',
        author: currentWork.author || 'Anónimo',
        nac: currentWork.nac || 'Cuba',
        frequency: currentWork.frequency || 'Lunes a Viernes'
      });
    }
    
    if (parsedWorks.length > 0) {
      setIncidentalWorks(parsedWorks.map((w, idx) => ({
        id: `parsed-${idx}-${Date.now()}`,
        ...w
      })));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleParseIncidentalsText(text);
      }
    };
    reader.readAsText(file);
  };

  const startEditingWork = (w: { id: string; title: string; author: string; nac: string; frequency: string; }) => {
    setEditingWorkId(w.id);
    setEditTitle(w.title);
    setEditAuthor(w.author);
    setEditNac(w.nac);
    setEditFrequency(w.frequency);
  };

  const saveEditingWork = () => {
    setIncidentalWorks(prev => prev.map(w => w.id === editingWorkId ? {
      ...w,
      title: editTitle,
      author: editAuthor,
      nac: editNac,
      frequency: editFrequency
    } : w));
    setEditingWorkId(null);
  };

  const deleteWork = (id: string) => {
    setIncidentalWorks(prev => prev.filter(w => w.id !== id));
  };

  const addWorkDirect = () => {
    if (!newTitle.trim()) return;
    const newW = {
      id: `manual-${Date.now()}`,
      title: newTitle.trim(),
      author: newAuthor.trim() || 'Anónimo',
      nac: newNac.trim() || 'Cuba',
      frequency: newFrequency.trim() || 'Lunes a Viernes'
    };
    setIncidentalWorks(prev => [...prev, newW]);
    setNewTitle('');
    setNewAuthor('');
  };

  useEffect(() => {
    if (isOpen && initialReportType) {
      setActiveReportType(initialReportType);
    }
  }, [isOpen, initialReportType]);

  // [moved if(!isOpen)]

  const [yearStr, monthStr] = selectedMonthStr.split('-');
  const selectedYear = parseInt(yearStr, 10) || 2026;
  const selectedMonthNum = parseInt(monthStr, 10) || 6;
  const selectedMonthName = MONTH_NAMES_SPANISH[selectedMonthNum - 1] || "Junio";

  // Flat list of all tracks in the monthly stock
  const allTracks: ProductionTrack[] = stockMensual.flatMap(p => p.tracks || []).filter(Boolean);

  // Helper to get tracks for any period (recalculating from raw data)
  const getTracksForAnyPeriod = (monthStr: string, period: 'mensual' | 'trimestral' | 'semestral' | 'anual') => {
    const months = getMonthsForPeriod(monthStr, period);
    const agg: ProductionTrack[] = [];
    months.forEach(mKey => {
      const prods = (allProductions || []).filter(p => p && !p.archived && p.date && p.date.startsWith(mKey));
      prods.forEach(p => {
        if (p.tracks) p.tracks.forEach(t => t && agg.push(t));
      });
    });
    return agg;
  };

  const periodTracks = getTracksForAnyPeriod(selectedMonthStr, activePeriod);

  // Helper selectors
  const isCuban = (country?: string) => {
    if (!country) return false;
    const clean = country.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return clean === 'cuba';
  };

  const getRegionForCountry = (countryStr?: string): string => {
    if (!countryStr) return 'Otras zonas';
    const clean = countryStr.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (clean === 'cuba') return '';
    
    const latam = ['mexico', 'colombia', 'argentina', 'venezuela', 'puerto rico', 'republica dominicana', 'panama', 'chile', 'peru', 'ecuador', 'bolivia', 'uruguay', 'paraguay', 'costa rica', 'guatemala', 'honduras', 'el salvador', 'nicaragua', 'brasil', 'brazil', 'jamaica', 'haiti', 'bahamas', 'trinidad', 'venezolano', 'mexicano', 'colombiano', 'argentino'];
    const norteamerica = ['estados unidos', 'usa', 'us', 'canada', 'norteamerica', 'norteamericano', 'eeuu', 'ee.uu'];
    const europa = ['españa', 'espana', 'francia', 'italia', 'reino unido', 'uk', 'alemania', 'portugal', 'holanda', 'belgica', 'suiza', 'austria', 'suecia', 'noruega', 'dinamarca', 'irlanda', 'grecia', 'rusia', 'ucrania', 'español', 'italiano', 'frances', 'aleman', 'ingles'];
    const asia = ['china', 'japon', 'corea', 'india', 'turquia', 'israel', 'asia', 'japones', 'chino', 'coreano'];
    const africa = ['angola', 'sudafrica', 'nigeria', 'egipto', 'africa', 'africano'];
    
    if (latam.some(c => clean.includes(c))) return 'Latinoam. y del Caribe';
    if (norteamerica.some(c => clean.includes(c))) return 'Norteamericana';
    if (europa.some(c => clean.includes(c))) return 'Europa';
    if (asia.some(c => clean.includes(c))) return 'Asia';
    if (africa.some(c => clean.includes(c))) return 'Africa';
    
    return 'Otras zonas';
  };

  // Helper to get normalized country of a track (takes performer country, fallbacks to author country, fallbacks to empty)
  const getWorkCountry = (t: ProductionTrack) => {
    return t.performerCountry || t.authorCountry || '';
  };

  const isCubaWork = (t: ProductionTrack) => {
    const pc = t.performerCountry;
    const ac = t.authorCountry;
    // If countries are omitted/empty, we default to Cuba (since this is RCM Cuba)
    if (!pc && !ac) return true;
    return isCuban(pc) || isCuban(ac);
  };

  // STATS CALCULATIONS FOR MONTHLY MUSIC REPORT
  const archivedMensualData = (activePeriod === 'mensual') ? archiveMensual[selectedMonthStr] : null;

  // Rule of Golden: For periods > month, we MUST recalculate unique counts from raw data
  // "Frecuencia" = total plays (tracks.length)
  // "Cantidad" = unique titles (Set size)
  
  const tracksToUse = (activePeriod === 'mensual' && archivedMensualData) ? [] : periodTracks;

  // 1. Works (Titles)
  const rawTotalWorksFrequency = archivedMensualData ? (archivedMensualData.totalWorksPlays || archivedMensualData.totalWorks || 0) : tracksToUse.length;
  const rawTotalWorksCount = archivedMensualData ? (archivedMensualData.totalWorks || 0) : new Set(tracksToUse.map(t => t.title?.toUpperCase()).filter(Boolean)).size;

  const cubanTracksToUse = tracksToUse.filter(isCubaWork);
  const foreignTracksToUse = tracksToUse.filter(t => !isCubaWork(t));

  const rawTotalWorksCuba = archivedMensualData ? (archivedMensualData.cubaWorks || 0) : new Set(cubanTracksToUse.map(t => t.title?.toUpperCase()).filter(Boolean)).size;
  const rawTotalWorksForeign = archivedMensualData ? (archivedMensualData.foreignWorks || 0) : new Set(foreignTracksToUse.map(t => t.title?.toUpperCase()).filter(Boolean)).size;

  // 2. Authors
  const uniqueAuthorsList = Array.from(new Set(tracksToUse.map(t => t.author).filter(Boolean)));
  const rawTotalAuthorsCount = archivedMensualData ? (archivedMensualData.totalAuthors || 0) : uniqueAuthorsList.length;

  const rawCubanAuthorsCount = archivedMensualData ? (archivedMensualData.cubaAuthors || 0) : uniqueAuthorsList.filter(name => {
    const matchingTracks = tracksToUse.filter(t => t.author === name);
    return matchingTracks.some(t => isCuban(t.authorCountry) || (!t.authorCountry && !t.performerCountry));
  }).length;
  const rawForeignAuthorsCount = archivedMensualData ? (archivedMensualData.foreignAuthors || 0) : (uniqueAuthorsList.length - rawCubanAuthorsCount);

  // 3. Performers
  const uniquePerformersList = Array.from(new Set(tracksToUse.map(t => t.performer).filter(Boolean)));
  const rawTotalPerformersCount = archivedMensualData ? (archivedMensualData.totalPerformers || 0) : uniquePerformersList.length;

  const rawCubanPerformersCount = archivedMensualData ? (archivedMensualData.cubaPerformers || 0) : uniquePerformersList.filter(name => {
    const matchingTracks = tracksToUse.filter(t => t.performer === name);
    return matchingTracks.some(t => isCuban(t.performerCountry) || (!t.performerCountry && !t.authorCountry));
  }).length;
  const rawForeignPerformersCount = archivedMensualData ? (archivedMensualData.foreignPerformers || 0) : (uniquePerformersList.length - rawCubanPerformersCount);

  // PERIOD CALCULATION METHODS & ARCHIVES CONSOLIDATOR
  const calculateLiveMensualForMonth = (mStr: string) => {
    // Priority: Archive
    if (archiveMensual[mStr]) return archiveMensual[mStr];

    const prods = (allProductions || []).filter(p => p && !p.archived && p.date && p.date.startsWith(mStr));
    const tracks = prods.flatMap(p => p.tracks || []).filter(Boolean);
    
    // Frequency = Total Plays
    const totalWorksPlays = tracks.length;
    // Quantity = Unique Titles
    const totalWorks = new Set(tracks.map(t => t.title?.toUpperCase()).filter(Boolean)).size;

    const cubaTracks = tracks.filter(isCubaWork);
    const cubaWorks = new Set(cubaTracks.map(t => t.title?.toUpperCase()).filter(Boolean)).size;
    const foreignWorks = totalWorks - cubaWorks;

    const uniqueAuths = Array.from(new Set(tracks.map(t => t.author).filter(Boolean)));
    const cubaAuthsCount = uniqueAuths.filter(name => {
      const matchingTracks = tracks.filter(t => t.author === name);
      return matchingTracks.some(t => isCuban(t.authorCountry) || (!t.authorCountry && !t.performerCountry));
    }).length;
    const foreignAuthsCount = uniqueAuths.length - cubaAuthsCount;

    const uniquePerfs = Array.from(new Set(tracks.map(t => t.performer).filter(Boolean)));
    const cubaPerfsCount = uniquePerfs.filter(name => {
      const matchingTracks = tracks.filter(t => t.performer === name);
      return matchingTracks.some(t => isCuban(t.performerCountry) || (!t.performerCountry && !t.authorCountry));
    }).length;
    const foreignPerfsCount = uniquePerfs.length - cubaPerfsCount;

    // Calculate regions
    const regionStatsLocal = {
      'Latinoam. y del Caribe': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Norteamericana': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Europa': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Asia': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Africa': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Otras zonas': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 }
    };

    tracks.filter(t => !isCubaWork(t)).forEach(t => {
      const region = getRegionForCountry(getWorkCountry(t)) as keyof typeof regionStatsLocal;
      if (regionStatsLocal[region]) {
        if (t.title) regionStatsLocal[region].works.add(t.title.toUpperCase());
        if (t.author) regionStatsLocal[region].authors.add(t.author);
        if (t.performer) regionStatsLocal[region].performers.add(t.performer);
        regionStatsLocal[region].plays++;
      }
    });

    const regionsFinal: Record<string, { works: number; authors: number; performers: number; plays: number }> = {};
    Object.keys(regionStatsLocal).forEach(reg => {
      const s = regionStatsLocal[reg as keyof typeof regionStatsLocal];
      regionsFinal[reg] = {
        works: s.works.size,
        authors: s.authors.size,
        performers: s.performers.size,
        plays: s.plays
      };
    });

    // Calculate top songs
    const songFrequencies: Record<string, { track: ProductionTrack; count: number }> = {};
    tracks.forEach(t => {
      const key = `${t.title?.toUpperCase()} - ${t.performer?.toUpperCase()}`;
      if (!songFrequencies[key]) {
        songFrequencies[key] = { track: t, count: 0 };
      }
      songFrequencies[key].count++;
    });
    const topSongsLocal = Object.values(songFrequencies)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate top authors
    const authorFrequencies: Record<string, { name: string; nac: string; songs: Set<string>; execs: number }> = {};
    tracks.forEach(t => {
      if (!t.author) return;
      const key = t.author.toUpperCase();
      const nac = isCuban(t.authorCountry) || (!t.authorCountry && !t.performerCountry) ? 'CUBA' : (t.authorCountry?.toUpperCase() || 'EXTRANJERO');
      if (!authorFrequencies[key]) {
        authorFrequencies[key] = { name: t.author, nac, songs: new Set(), execs: 0 };
      }
      authorFrequencies[key].songs.add(t.title?.toUpperCase() || '');
      authorFrequencies[key].execs++;
    });
    const topAuthorsLocal = Object.values(authorFrequencies)
      .sort((a, b) => b.execs - a.execs)
      .slice(0, 5);

    // Calculate top performers
    const performerFrequencies: Record<string, { name: string; nac: string; songs: Set<string>; execs: number }> = {};
    tracks.forEach(t => {
      if (!t.performer) return;
      const key = t.performer.toUpperCase();
      const nac = isCuban(t.performerCountry) || (!t.performerCountry && !t.authorCountry) ? 'CUBA' : (t.performerCountry?.toUpperCase() || 'EXTRANJERO');
      if (!performerFrequencies[key]) {
        performerFrequencies[key] = { name: t.performer, nac, songs: new Set(), execs: 0 };
      }
      performerFrequencies[key].songs.add(t.title?.toUpperCase() || '');
      performerFrequencies[key].execs++;
    });
    const topPerformersLocal = Object.values(performerFrequencies)
      .sort((a, b) => b.execs - a.execs)
      .slice(0, 5);

    // Calculate top genres
    const genreFrequencies: Record<string, { name: string; songs: Set<string>; execs: number }> = {};
    tracks.forEach(t => {
      const genreName = (t.genre || 'SIN GENERO').toUpperCase();
      if (!genreFrequencies[genreName]) {
        genreFrequencies[genreName] = { name: genreName, songs: new Set(), execs: 0 };
      }
      genreFrequencies[genreName].songs.add(t.title?.toUpperCase() || '');
      genreFrequencies[genreName].execs++;
    });
    const topGenresLocal = Object.values(genreFrequencies)
      .sort((a, b) => b.execs - a.execs)
      .slice(0, 5);

    return {
      totalWorks,
      totalWorksPlays,
      cubaWorks,
      foreignWorks,
      totalAuthors: uniqueAuths.length,
      cubaAuthors: cubaAuthsCount,
      foreignAuthors: foreignAuthsCount,
      totalPerformers: uniquePerfs.length,
      cubaPerformers: cubaPerfsCount,
      foreignPerformers: foreignPerfsCount,
      regions: regionsFinal,
      topSongs: topSongsLocal,
      topAuthors: topAuthorsLocal,
      topPerformers: topPerformersLocal,
      topGenres: topGenresLocal
    };
  };

  const getIncidentalStatsForMonth = (y: number, m: number) => {
    const mStr = `${y}-${String(m).padStart(2, '0')}`;
    if (archiveIncidental[mStr]) return archiveIncidental[mStr];

    let cubaWorksCount = 0;
    let cubaAuthors = new Set<string>();
    let foreignWorksCount = 0;
    let foreignAuthors = new Set<string>();

    const regions = {
      'Latinoam. y del Caribe': { works: 0, authors: new Set<string>() },
      'Norteamericana': { works: 0, authors: new Set<string>() },
      'Europa': { works: 0, authors: new Set<string>() },
      'Otras Zonas': { works: 0, authors: new Set<string>() },
    };

    incidentalWorks.forEach(w => {
      const count = calculateMonthlyCount(w.frequency, y, m);
      const countryStr = w.nac || 'Cuba';
      const isCubanWork = countryStr.trim().toLowerCase() === 'cuba';

      if (isCubanWork) {
        cubaWorksCount += count;
        if (w.author) cubaAuthors.add(w.author.trim().toUpperCase());
      } else {
        foreignWorksCount += count;
        if (w.author) foreignAuthors.add(w.author.trim().toUpperCase());

        const reg = getRegionForCountry(countryStr);
        let mappedRegion: 'Latinoam. y del Caribe' | 'Norteamericana' | 'Europa' | 'Otras Zonas' = 'Otras Zonas';
        if (reg === 'Latinoam. y del Caribe') mappedRegion = 'Latinoam. y del Caribe';
        else if (reg === 'Norteamericana') mappedRegion = 'Norteamericana';
        else if (reg === 'Europa') mappedRegion = 'Europa';

        regions[mappedRegion].works += count;
        if (w.author) regions[mappedRegion].authors.add(w.author.trim().toUpperCase());
      }
    });

    const totalWorks = cubaWorksCount + foreignWorksCount;
    const totalAuthorsList = new Set<string>();
    incidentalWorks.forEach(w => { if (w.author) totalAuthorsList.add(w.author.trim().toUpperCase()); });
    const totalAuthors = totalAuthorsList.size;

    const cubaPct = totalWorks ? Math.round((cubaWorksCount / totalWorks) * 100) : 0;
    const foreignPct = totalWorks ? Math.round((foreignWorksCount / totalWorks) * 100) : 0;
    const cubaAuthorsPct = totalAuthors ? Math.round((cubaAuthors.size / totalAuthors) * 100) : 0;
    const foreignAuthorsPct = totalAuthors ? Math.round((foreignAuthors.size / totalAuthors) * 100) : 0;

    return {
      cubaWorksCount,
      cubaAuthors: cubaAuthors.size,
      cubaPct,
      cubaAuthorsPct,
      foreignWorksCount,
      foreignAuthors: foreignAuthors.size,
      foreignPct,
      foreignAuthorsPct,
      totalWorks,
      totalAuthors,
      regions: {
        latam: {
          works: regions['Latinoam. y del Caribe'].works,
          authors: regions['Latinoam. y del Caribe'].authors.size,
          pct: totalWorks ? Math.round((regions['Latinoam. y del Caribe'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Latinoam. y del Caribe'].authors.size / totalAuthors) * 100) : 0
        },
        norte: {
          works: regions['Norteamericana'].works,
          authors: regions['Norteamericana'].authors.size,
          pct: totalWorks ? Math.round((regions['Norteamericana'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Norteamericana'].authors.size / totalAuthors) * 100) : 0
        },
        europa: {
          works: regions['Europa'].works,
          authors: regions['Europa'].authors.size,
          pct: totalWorks ? Math.round((regions['Europa'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Europa'].authors.size / totalAuthors) * 100) : 0
        },
        otras: {
          works: regions['Otras Zonas'].works,
          authors: regions['Otras Zonas'].authors.size,
          pct: totalWorks ? Math.round((regions['Otras Zonas'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Otras Zonas'].authors.size / totalAuthors) * 100) : 0
        }
      }
    };
  };

  const getAggregatedPeriodStats = () => {
    const months = getMonthsForPeriod(selectedMonthStr, activePeriod);

    // Initial state
    const mensalAgg = { 
      totalWorks: 0, totalWorksPlays: 0, 
      cubaWorks: 0, foreignWorks: 0, 
      totalAuthors: 0, cubaAuthors: 0, foreignAuthors: 0, 
      totalPerformers: 0, cubaPerformers: 0, foreignPerformers: 0 
    };
    
    // If period is not monthly, we aggregate ALL raw tracks to recalculate unique counts correctly
    if (activePeriod !== 'mensual') {
       const tracks = periodTracks;
       mensalAgg.totalWorksPlays = tracks.length;
       mensalAgg.totalWorks = new Set(tracks.map(t => t.title?.toUpperCase()).filter(Boolean)).size;
       
       const cTracks = tracks.filter(isCubaWork);
       mensalAgg.cubaWorks = new Set(cTracks.map(t => t.title?.toUpperCase()).filter(Boolean)).size;
       mensalAgg.foreignWorks = mensalAgg.totalWorks - mensalAgg.cubaWorks;
       
       const uAuths = Array.from(new Set(tracks.map(t => t.author).filter(Boolean)));
       mensalAgg.totalAuthors = uAuths.length;
       mensalAgg.cubaAuthors = uAuths.filter(name => {
         const mTracks = tracks.filter(t => t.author === name);
         return mTracks.some(t => isCuban(t.authorCountry) || (!t.authorCountry && !t.performerCountry));
       }).length;
       mensalAgg.foreignAuthors = mensalAgg.totalAuthors - mensalAgg.cubaAuthors;
       
       const uPerfs = Array.from(new Set(tracks.map(t => t.performer).filter(Boolean)));
       mensalAgg.totalPerformers = uPerfs.length;
       mensalAgg.cubaPerformers = uPerfs.filter(name => {
         const mTracks = tracks.filter(t => t.performer === name);
         return mTracks.some(t => isCuban(t.performerCountry) || (!t.performerCountry && !t.authorCountry));
       }).length;
       mensalAgg.foreignPerformers = mensalAgg.totalPerformers - mensalAgg.cubaPerformers;
    } else {
      // For monthly, we can use the monthly stats (archived or calculated)
      const mData = archivedMensualData || calculateLiveMensualForMonth(selectedMonthStr);
      if (mData) {
        mensalAgg.totalWorks = mData.totalWorks || 0;
        mensalAgg.totalWorksPlays = mData.totalWorksPlays || mData.totalWorks || 0;
        mensalAgg.cubaWorks = mData.cubaWorks || 0;
        mensalAgg.foreignWorks = mData.foreignWorks || 0;
        mensalAgg.totalAuthors = mData.totalAuthors || 0;
        mensalAgg.cubaAuthors = mData.cubaAuthors || 0;
        mensalAgg.foreignAuthors = mData.foreignAuthors || 0;
        mensalAgg.totalPerformers = mData.totalPerformers || 0;
        mensalAgg.cubaPerformers = mData.cubaPerformers || 0;
        mensalAgg.foreignPerformers = mData.foreignPerformers || 0;
      }
    }

    const economiaAgg = { completasCubana: 0, completasExtranjera: 0, completasTotal: 0, instrumentalesCubana: 0, instrumentalesExtranjera: 0, instrumentalesTotal: 0, incidentalesCubana: 0, incidentalesExtranjera: 0, incidentalesTotal: 0 };
    const incidentalAgg = { cubaWorksCount: 0, cubaAuthors: 0, cubaPct: 0, cubaAuthorsPct: 0, foreignWorksCount: 0, foreignAuthors: 0, foreignPct: 0, foreignAuthorsPct: 0, totalWorks: 0, totalAuthors: 0, regions: { latam: { works: 0, pct: 0, authors: 0, authorsPct: 0 }, norte: { works: 0, pct: 0, authors: 0, authorsPct: 0 }, europa: { works: 0, pct: 0, authors: 0, authorsPct: 0 }, otras: { works: 0, pct: 0, authors: 0, authorsPct: 0 } } };

    months.forEach(mKey => {
      // 2. Economia
      let eData = archiveEconomia[mKey];
      if (!eData) {
        const [yr, mn] = mKey.split('-').map(Number);
        const weekdays = countDaysInMonth(yr, mn, [1, 2, 3, 4, 5]);
        const mVal = archiveMensual[mKey] || calculateLiveMensualForMonth(mKey);
        const incStats = archiveIncidental[mKey] || getIncidentalStatsForMonth(yr, mn);
        eData = {
          completasCubana: mVal.cubaWorks,
          completasExtranjera: mVal.foreignWorks,
          completasTotal: mVal.totalWorks,
          instrumentalesCubana: weekdays,
          instrumentalesExtranjera: 0,
          instrumentalesTotal: weekdays,
          incidentalesCubana: incStats.totalWorks,
          incidentalesExtranjera: 0,
          incidentalesTotal: incStats.totalWorks
        };
      }
      if (eData) {
        economiaAgg.completasCubana += eData.completasCubana || 0;
        economiaAgg.completasExtranjera += eData.completasExtranjera || 0;
        economiaAgg.completasTotal += eData.completasTotal || 0;
        economiaAgg.instrumentalesCubana += eData.instrumentalesCubana || 0;
        economiaAgg.instrumentalesExtranjera += eData.instrumentalesExtranjera || 0;
        economiaAgg.instrumentalesTotal += eData.instrumentalesTotal || 0;
        economiaAgg.incidentalesCubana += eData.incidentalesCubana || 0;
        economiaAgg.incidentalesExtranjera += eData.incidentalesExtranjera || 0;
        economiaAgg.incidentalesTotal += eData.incidentalesTotal || 0;
      }

      // 3. Incidental
      let iData = archiveIncidental[mKey];
      if (!iData) {
        const [yr, mn] = mKey.split('-').map(Number);
        iData = getIncidentalStatsForMonth(yr, mn);
      }
      if (iData) {
        incidentalAgg.cubaWorksCount += iData.cubaWorksCount || 0;
        incidentalAgg.cubaAuthors += iData.cubaAuthors || 0;
        incidentalAgg.foreignWorksCount += iData.foreignWorksCount || 0;
        incidentalAgg.foreignAuthors += iData.foreignAuthors || 0;
        incidentalAgg.totalWorks += iData.totalWorks || 0;
        incidentalAgg.totalAuthors += iData.totalAuthors || 0;

        incidentalAgg.regions.latam.works += (iData.regions?.latam?.works || 0);
        incidentalAgg.regions.latam.authors += (iData.regions?.latam?.authors || 0);
        incidentalAgg.regions.norte.works += (iData.regions?.norte?.works || 0);
        incidentalAgg.regions.norte.authors += (iData.regions?.norte?.authors || 0);
        incidentalAgg.regions.europa.works += (iData.regions?.europa?.works || 0);
        incidentalAgg.regions.europa.authors += (iData.regions?.europa?.authors || 0);
        incidentalAgg.regions.otras.works += (iData.regions?.otras?.works || 0);
        incidentalAgg.regions.otras.authors += (iData.regions?.otras?.authors || 0);
      }
    });

    if (incidentalAgg.totalWorks) {
      incidentalAgg.cubaPct = Math.round((incidentalAgg.cubaWorksCount / incidentalAgg.totalWorks) * 100);
      incidentalAgg.foreignPct = Math.round((incidentalAgg.foreignWorksCount / incidentalAgg.totalWorks) * 100);
      incidentalAgg.regions.latam.pct = Math.round((incidentalAgg.regions.latam.works / incidentalAgg.totalWorks) * 100);
      incidentalAgg.regions.norte.pct = Math.round((incidentalAgg.regions.norte.works / incidentalAgg.totalWorks) * 100);
      incidentalAgg.regions.europa.pct = Math.round((incidentalAgg.regions.europa.works / incidentalAgg.totalWorks) * 100);
      incidentalAgg.regions.otras.pct = Math.round((incidentalAgg.regions.otras.works / incidentalAgg.totalWorks) * 100);
    }
    if (incidentalAgg.totalAuthors) {
      incidentalAgg.cubaAuthorsPct = Math.round((incidentalAgg.cubaAuthors / incidentalAgg.totalAuthors) * 100);
      incidentalAgg.foreignAuthorsPct = Math.round((incidentalAgg.foreignAuthors / incidentalAgg.totalAuthors) * 100);
      incidentalAgg.regions.latam.authorsPct = Math.round((incidentalAgg.regions.latam.authors / incidentalAgg.totalAuthors) * 100);
      incidentalAgg.regions.norte.authorsPct = Math.round((incidentalAgg.regions.norte.authors / incidentalAgg.totalAuthors) * 100);
      incidentalAgg.regions.europa.authorsPct = Math.round((incidentalAgg.regions.europa.authors / incidentalAgg.totalAuthors) * 100);
      incidentalAgg.regions.otras.authorsPct = Math.round((incidentalAgg.regions.otras.authors / incidentalAgg.totalAuthors) * 100);
    }

    const liveInc = getIncidentalStatsForMonth(selectedYear, selectedMonthNum);

    return {
      mensual: {
        totalWorks: mensalAgg.totalWorks || rawTotalWorksCount,
        totalWorksPlays: mensalAgg.totalWorksPlays || rawTotalWorksFrequency,
        cubaWorks: mensalAgg.cubaWorks || rawTotalWorksCuba,
        foreignWorks: mensalAgg.foreignWorks || rawTotalWorksForeign,
        totalAuthors: mensalAgg.totalAuthors || rawTotalAuthorsCount,
        cubaAuthors: mensalAgg.cubaAuthors || rawCubanAuthorsCount,
        foreignAuthors: mensalAgg.foreignAuthors || rawForeignAuthorsCount,
        totalPerformers: mensalAgg.totalPerformers || rawTotalPerformersCount,
        cubaPerformers: mensalAgg.cubaPerformers || rawCubanPerformersCount,
        foreignPerformers: mensalAgg.foreignPerformers || rawForeignPerformersCount,
      },
      economia: {
        completasCubana: economiaAgg.completasCubana || rawTotalWorksCuba,
        completasExtranjera: economiaAgg.completasExtranjera || rawTotalWorksForeign,
        completasTotal: economiaAgg.completasTotal || rawTotalWorksCount,
        instrumentalesCubana: economiaAgg.instrumentalesCubana || intCubanaCount(),
        instrumentalesExtranjera: economiaAgg.instrumentalesExtranjera || 0,
        instrumentalesTotal: economiaAgg.instrumentalesTotal || intCubanaCount(),
        incidentalesCubana: economiaAgg.incidentalesCubana || liveInc.totalWorks,
        incidentalesExtranjera: economiaAgg.incidentalesExtranjera || 0,
        incidentalesTotal: economiaAgg.incidentalesTotal || liveInc.totalWorks
      },
      incidental: {
        cubaWorksCount: incidentalAgg.cubaWorksCount || liveInc.cubaWorksCount,
        cubaPct: incidentalAgg.cubaPct || liveInc.cubaPct,
        cubaAuthors: incidentalAgg.cubaAuthors || liveInc.cubaAuthors,
        cubaAuthorsPct: incidentalAgg.cubaAuthorsPct || liveInc.cubaAuthorsPct,
        foreignWorksCount: incidentalAgg.foreignWorksCount || liveInc.foreignWorksCount,
        foreignPct: incidentalAgg.foreignPct || liveInc.foreignPct,
        foreignAuthors: incidentalAgg.foreignAuthors || liveInc.foreignAuthors,
        foreignAuthorsPct: incidentalAgg.foreignAuthorsPct || liveInc.foreignAuthorsPct,
        totalWorks: incidentalAgg.totalWorks || liveInc.totalWorks,
        totalAuthors: incidentalAgg.totalAuthors || liveInc.totalAuthors,
        regions: {
          latam: {
            works: incidentalAgg.regions.latam.works || liveInc.regions.latam.works,
            pct: incidentalAgg.regions.latam.pct || liveInc.regions.latam.pct,
            authors: incidentalAgg.regions.latam.authors || liveInc.regions.latam.authors,
            authorsPct: incidentalAgg.regions.latam.authorsPct || liveInc.regions.latam.authorsPct
          },
          norte: {
            works: incidentalAgg.regions.norte.works || liveInc.regions.norte.works,
            pct: incidentalAgg.regions.norte.pct || liveInc.regions.norte.pct,
            authors: incidentalAgg.regions.norte.authors || liveInc.regions.norte.authors,
            authorsPct: incidentalAgg.regions.norte.authorsPct || liveInc.regions.norte.authorsPct
          },
          europa: {
            works: incidentalAgg.regions.europa.works || liveInc.regions.europa.works,
            pct: incidentalAgg.regions.europa.pct || liveInc.regions.europa.pct,
            authors: incidentalAgg.regions.europa.authors || liveInc.regions.europa.authors,
            authorsPct: incidentalAgg.regions.europa.authorsPct || liveInc.regions.europa.authorsPct
          },
          otras: {
            works: incidentalAgg.regions.otras.works || liveInc.regions.otras.works,
            pct: incidentalAgg.regions.otras.pct || liveInc.regions.otras.pct,
            authors: incidentalAgg.regions.otras.authors || liveInc.regions.otras.authors,
            authorsPct: incidentalAgg.regions.otras.authorsPct || liveInc.regions.otras.authorsPct
          }
        }
      }
    };
  };

  const intCubanaCount = () => {
    if (activePeriod === 'mensual') {
      return countDaysInMonth(selectedYear, selectedMonthNum, [1, 2, 3, 4, 5]);
    }
    const ms = getMonthsForPeriod(selectedMonthStr, activePeriod);
    return ms.reduce((total, mKey) => {
      const [yr, mn] = mKey.split('-').map(Number);
      return total + countDaysInMonth(yr, mn, [1, 2, 3, 4, 5]);
    }, 0);
  };

  const getActiveRegionStats = () => {
    const months = getMonthsForPeriod(selectedMonthStr, activePeriod);
    const aggRegions = {
      'Latinoam. y del Caribe': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Norteamericana': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Europa': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Asia': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Africa': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 },
      'Otras zonas': { works: new Set<string>(), authors: new Set<string>(), performers: new Set<string>(), plays: 0 }
    };

    if (activePeriod !== 'mensual') {
       // Recalculate everything from periodTracks for accuracy
       periodTracks.filter(t => !isCubaWork(t)).forEach(t => {
         const region = getRegionForCountry(getWorkCountry(t)) as keyof typeof aggRegions;
         if (aggRegions[region]) {
           if (t.title) aggRegions[region].works.add(t.title.toUpperCase());
           if (t.author) aggRegions[region].authors.add(t.author.toUpperCase());
           if (t.performer) aggRegions[region].performers.add(t.performer.toUpperCase());
           aggRegions[region].plays++;
         }
       });
    } else {
       // Monthly: use archive or current month tracks
       const mData = archivedMensualData || calculateLiveMensualForMonth(selectedMonthStr);
       if (mData && mData.regions) {
         Object.keys(aggRegions).forEach(reg => {
           if (mData.regions[reg]) {
             const r = mData.regions[reg];
             // If mData.regions has numbers (archived), we can't truly deduplicate if we don't have titles
             // But for a single month, it's already "Quantity" from the source.
             const worksCount = typeof r.works === 'number' ? r.works : (r.works?.size || 0);
             const autCount = typeof r.authors === 'number' ? r.authors : (r.authors?.size || 0);
             const perfCount = typeof r.performers === 'number' ? r.performers : (r.performers?.size || 0);
             const playsCount = typeof r.plays === 'number' ? r.plays : (r.plays || worksCount);
             
             // Mocking sets for consistency
             for (let i = 0; i < worksCount; i++) aggRegions[reg as keyof typeof aggRegions].works.add(`w-${i}`);
             for (let i = 0; i < autCount; i++) aggRegions[reg as keyof typeof aggRegions].authors.add(`a-${i}`);
             for (let i = 0; i < perfCount; i++) aggRegions[reg as keyof typeof aggRegions].performers.add(`p-${i}`);
             aggRegions[reg as keyof typeof aggRegions].plays = playsCount;
           }
         });
       }
    }

    return aggRegions;
  };

  const activePeriodStats = getAggregatedPeriodStats();

  useEffect(() => {
    if (isOpen && activePeriod === 'mensual') {
      const monthKey = selectedMonthStr;

    }
  }, [selectedMonthStr, stockMensual, incidentalWorks, isOpen]);

  if (!isOpen) return null;

  // Resolve counts based on activePeriod stats
  const totalWorksQuantity = activePeriod === 'mensual' ? rawTotalWorksCount : activePeriodStats.mensual.totalWorks;
  const totalWorksFrequency = activePeriod === 'mensual' ? rawTotalWorksFrequency : activePeriodStats.mensual.totalWorksPlays;
  const totalWorksCuba = activePeriod === 'mensual' ? rawTotalWorksCuba : activePeriodStats.mensual.cubaWorks;
  const totalWorksForeign = activePeriod === 'mensual' ? rawTotalWorksForeign : activePeriodStats.mensual.foreignWorks;
  const totalAuthorsCount = activePeriod === 'mensual' ? rawTotalAuthorsCount : activePeriodStats.mensual.totalAuthors;
  const totalPerformersCount = activePeriod === 'mensual' ? rawTotalPerformersCount : activePeriodStats.mensual.totalPerformers;
  const cubanAuthorsCount = activePeriod === 'mensual' ? rawCubanAuthorsCount : activePeriodStats.mensual.cubaAuthors;
  const foreignAuthorsCount = activePeriod === 'mensual' ? rawForeignAuthorsCount : activePeriodStats.mensual.foreignAuthors;
  const cubanPerformersCount = activePeriod === 'mensual' ? rawCubanPerformersCount : activePeriodStats.mensual.cubaPerformers;
  const foreignPerformersCount = activePeriod === 'mensual' ? rawForeignPerformersCount : activePeriodStats.mensual.foreignPerformers;

  // Regional breakdown (for Foreigners)
  const regionStats = {
    'Latinoam. y del Caribe': { works: 0, authors: new Set<string>(), performers: new Set<string>() },
    'Norteamericana': { works: 0, authors: new Set<string>(), performers: new Set<string>() },
    'Europa': { works: 0, authors: new Set<string>(), performers: new Set<string>() },
    'Asia': { works: 0, authors: new Set<string>(), performers: new Set<string>() },
    'Africa': { works: 0, authors: new Set<string>(), performers: new Set<string>() },
    'Otras zonas': { works: 0, authors: new Set<string>(), performers: new Set<string>() }
  };

  if (activePeriod === 'mensual') {
    if (archivedMensualData && archivedMensualData.regions) {
       Object.keys(regionStats).forEach(reg => {
         if (archivedMensualData.regions[reg]) {
           const r = archivedMensualData.regions[reg];
           regionStats[reg as keyof typeof regionStats] = {
             works: r.works || 0,
             authors: { size: r.authors || 0 } as any,
             performers: { size: r.performers || 0 } as any
           };
         }
       });
    } else {
       periodTracks.filter(t => !isCubaWork(t)).forEach(t => {
         const region = getRegionForCountry(getWorkCountry(t)) as keyof typeof regionStats;
         if (regionStats[region]) {
           regionStats[region].works++;
           if (t.author) regionStats[region].authors.add(t.author);
           if (t.performer) regionStats[region].performers.add(t.performer);
         }
       });
    }
  } else {
    // Trimestral, Semestral, Anual sum of region data
    const activeRegionSum = getActiveRegionStats();
    Object.keys(regionStats).forEach(reg => {
      const r = activeRegionSum[reg as keyof typeof activeRegionSum] || { works: { size: 0 }, authors: { size: 0 }, performers: { size: 0 }, plays: 0 };
      regionStats[reg as keyof typeof regionStats] = {
        works: (r.works as any).size || r.works || 0,
        authors: { size: (r.authors as any).size || r.authors || 0 } as any,
        performers: { size: (r.performers as any).size || r.performers || 0 } as any
      };
    });
  }

  // Unified top lists calculation
  const getPeriodTrackListsAndGenres = () => {
    if (activePeriod === 'mensual') {
      const archived = archiveMensual[selectedMonthStr];
      if (archived) {
        return {
          topSongs: archived.topSongs || [],
          topAuthors: archived.topAuthors || [],
          topPerformers: archived.topPerformers || [],
          topGenres: archived.topGenres || [],
          totalCount: archived.totalWorks || 0
        };
      }
      
      // Calculate live for the selected month
      const songFrequencies: Record<string, { track: ProductionTrack; count: number }> = {};
      allTracks.forEach(t => {
        const key = `${t.title?.toUpperCase()} - ${t.performer?.toUpperCase()}`;
        if (!songFrequencies[key]) {
          songFrequencies[key] = { track: t, count: 0 };
        }
        songFrequencies[key].count++;
      });
      const liveSongs = Object.values(songFrequencies)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const authorFrequencies: Record<string, { name: string; nac: string; songs: Set<string>; execs: number }> = {};
      allTracks.forEach(t => {
        if (!t.author) return;
        const key = t.author.toUpperCase();
        const nac = isCuban(t.authorCountry) || (!t.authorCountry && !t.performerCountry) ? 'CUBA' : (t.authorCountry?.toUpperCase() || 'EXTRANJERO');
        if (!authorFrequencies[key]) {
          authorFrequencies[key] = { name: t.author, nac, songs: new Set(), execs: 0 };
        }
        authorFrequencies[key].songs.add(t.title?.toUpperCase() || '');
        authorFrequencies[key].execs++;
      });
      const liveAuthors = Object.values(authorFrequencies)
        .sort((a, b) => b.execs - a.execs)
        .slice(0, 5);

      const performerFrequencies: Record<string, { name: string; nac: string; songs: Set<string>; execs: number }> = {};
      allTracks.forEach(t => {
        if (!t.performer) return;
        const key = t.performer.toUpperCase();
        const nac = isCuban(t.performerCountry) || (!t.performerCountry && !t.authorCountry) ? 'CUBA' : (t.performerCountry?.toUpperCase() || 'EXTRANJERO');
        if (!performerFrequencies[key]) {
          performerFrequencies[key] = { name: t.performer, nac, songs: new Set(), execs: 0 };
        }
        performerFrequencies[key].songs.add(t.title?.toUpperCase() || '');
        performerFrequencies[key].execs++;
      });
      const livePerformers = Object.values(performerFrequencies)
        .sort((a, b) => b.execs - a.execs)
        .slice(0, 5);

      const genreFrequencies: Record<string, { name: string; songs: Set<string>; execs: number }> = {};
      allTracks.forEach(t => {
        const genreName = (t.genre || 'SIN GENERO').toUpperCase();
        if (!genreFrequencies[genreName]) {
          genreFrequencies[genreName] = { name: genreName, songs: new Set(), execs: 0 };
        }
        genreFrequencies[genreName].songs.add(t.title?.toUpperCase() || '');
        genreFrequencies[genreName].execs++;
      });
      const liveGenres = Object.values(genreFrequencies)
        .sort((a, b) => b.execs - a.execs)
        .slice(0, 5);

      return {
        topSongs: liveSongs,
        topAuthors: liveAuthors,
        topPerformers: livePerformers,
        topGenres: liveGenres,
        totalCount: allTracks.length
      };
    } else {
      // Trimestral, Semestral, Anual (query the database of productions of each month)
      const months = getMonthsForPeriod(selectedMonthStr, activePeriod);
      const aggTracks: ProductionTrack[] = [];
      const monthlyGenresList: any[] = [];

      months.forEach(mKey => {
        const prods = (allProductions || []).filter(p => p && !p.archived && p.date && p.date.startsWith(mKey));
        prods.forEach(p => {
          if (p.tracks) {
            p.tracks.forEach(t => {
              if (t) aggTracks.push(t);
            });
          }
        });

        const report = archiveMensual[mKey];
        if (report && report.topGenres) {
          monthlyGenresList.push(...report.topGenres);
        } else {
          const liveM = calculateLiveMensualForMonth(mKey);
          if (liveM && liveM.topGenres) {
            monthlyGenresList.push(...liveM.topGenres);
          }
        }
      });

      const tracksToAnalyze = aggTracks;

      const songFrequencies: Record<string, { track: ProductionTrack; count: number }> = {};
      tracksToAnalyze.forEach(t => {
        const key = `${t.title?.toUpperCase()} - ${t.performer?.toUpperCase()}`;
        if (!songFrequencies[key]) {
          songFrequencies[key] = { track: t, count: 0 };
        }
        songFrequencies[key].count++;
      });
      const songsAgg = Object.values(songFrequencies)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const authorFrequencies: Record<string, { name: string; nac: string; songs: Set<string>; execs: number }> = {};
      tracksToAnalyze.forEach(t => {
        if (!t.author) return;
        const key = t.author.toUpperCase();
        const nac = isCuban(t.authorCountry) || (!t.authorCountry && !t.performerCountry) ? 'CUBA' : (t.authorCountry?.toUpperCase() || 'EXTRANJERO');
        if (!authorFrequencies[key]) {
          authorFrequencies[key] = { name: t.author, nac, songs: new Set(), execs: 0 };
        }
        authorFrequencies[key].songs.add(t.title?.toUpperCase() || '');
        authorFrequencies[key].execs++;
      });
      const authorsAgg = Object.values(authorFrequencies)
        .sort((a, b) => b.execs - a.execs)
        .slice(0, 5);

      const performerFrequencies: Record<string, { name: string; nac: string; songs: Set<string>; execs: number }> = {};
      tracksToAnalyze.forEach(t => {
        if (!t.performer) return;
        const key = t.performer.toUpperCase();
        const nac = isCuban(t.performerCountry) || (!t.performerCountry && !t.authorCountry) ? 'CUBA' : (t.performerCountry?.toUpperCase() || 'EXTRANJERO');
        if (!performerFrequencies[key]) {
          performerFrequencies[key] = { name: t.performer, nac, songs: new Set(), execs: 0 };
        }
        performerFrequencies[key].songs.add(t.title?.toUpperCase() || '');
        performerFrequencies[key].execs++;
      });
      const performersAgg = Object.values(performerFrequencies)
        .sort((a, b) => b.execs - a.execs)
        .slice(0, 5);

      // Recalculating genres by summing their frequencies from Archive Report topGenres
      const genreSummary: Record<string, { name: string; execs: number }> = {};
      let genresTotalExecs = 0;
      monthlyGenresList.forEach(g => {
        const nameUpper = g.name.toUpperCase();
        if (!genreSummary[nameUpper]) {
          genreSummary[nameUpper] = { name: g.name, execs: 0 };
        }
        const countValue = typeof g.execs === 'number' ? g.execs : (parseInt(g.execs, 10) || 0);
        genreSummary[nameUpper].execs += countValue;
        genresTotalExecs += countValue;
      });

      const genresAgg = Object.values(genreSummary)
        .map(g => {
          const frecNum = genresTotalExecs ? Math.round((g.execs / genresTotalExecs) * 100) : 0;
          return {
            name: g.name,
            execs: g.execs,
            frec: frecNum.toString()
          };
        })
        .sort((a, b) => b.execs - a.execs)
        .slice(0, 5);

      return {
        topSongs: songsAgg,
        topAuthors: authorsAgg,
        topPerformers: performersAgg,
        topGenres: genresAgg,
        totalCount: tracksToAnalyze.length
      };
    }
  };

  const {
    topSongs: resolvedTopSongs,
    topAuthors: resolvedTopAuthors,
    topPerformers: resolvedTopPerformers,
    topGenres: resolvedTopGenres,
    totalCount: resolvedTotalAnalyzeCount
  } = getPeriodTrackListsAndGenres();

  const topSongs = resolvedTopSongs;
  const topAuthors = resolvedTopAuthors;
  const topPerformers = resolvedTopPerformers;
  const topGenres = resolvedTopGenres;

  // Formatting percentages safely (only numbers, without % symbol)
  const pct = (num: number, denom: number) => {
    if (!denom) return '0';
    return `${Math.round((num / denom) * 100)}`;
  };

  // ECONOMY REPORT DATA
  const economyData = stockMensual.map(p => {
    const songsCount = p.tracks?.length || 0;
    const workPayments = songsCount * costoPorObra;
    const programTotal = montoFijoBase + workPayments;
    return {
      program: p.program || 'Desconocido',
      date: p.date,
      songs: songsCount,
      rightsCost: workPayments,
      totalPayment: programTotal
    };
  });

  const totalEconomySongs = economyData.reduce((acc, curr) => acc + curr.songs, 0);
  const totalRightsPayments = economyData.reduce((acc, curr) => acc + curr.rightsCost, 0);
  const totalBasePayments = economyData.length * montoFijoBase;
  const grandTotalEconomyValue = totalRightsPayments + totalBasePayments;

  // INCIDENTAL MUSIC REPORT DATA
  // Compute calculated statistics for Incidental Report
  const getIncidentalRegionStats = () => {
    let cubaWorksCount = 0;
    let cubaAuthors = new Set<string>();
    
    let foreignWorksCount = 0;
    let foreignAuthors = new Set<string>();
    
    const regions = {
      'Latinoam. y del Caribe': { works: 0, authors: new Set<string>() },
      'Norteamericana': { works: 0, authors: new Set<string>() },
      'Europa': { works: 0, authors: new Set<string>() },
      'Otras Zonas': { works: 0, authors: new Set<string>() },
    };

    incidentalWorks.forEach(w => {
      const count = calculateMonthlyCount(w.frequency, selectedYear, selectedMonthNum);
      const countryStr = w.nac || 'Cuba';
      const isCubanWork = countryStr.trim().toLowerCase() === 'cuba';
      
      if (isCubanWork) {
        cubaWorksCount += count;
        if (w.author) cubaAuthors.add(w.author.trim().toUpperCase());
      } else {
        foreignWorksCount += count;
        if (w.author) foreignAuthors.add(w.author.trim().toUpperCase());
        
        const region = getRegionForCountry(countryStr);
        let mappedRegion: 'Latinoam. y del Caribe' | 'Norteamericana' | 'Europa' | 'Otras Zonas' = 'Otras Zonas';
        if (region === 'Latinoam. y del Caribe') mappedRegion = 'Latinoam. y del Caribe';
        else if (region === 'Norteamericana') mappedRegion = 'Norteamericana';
        else if (region === 'Europa') mappedRegion = 'Europa';
        
        regions[mappedRegion].works += count;
        if (w.author) regions[mappedRegion].authors.add(w.author.trim().toUpperCase());
      }
    });

    const totalWorks = cubaWorksCount + foreignWorksCount;
    const totalAuthorsList = new Set<string>();
    incidentalWorks.forEach(w => { if (w.author) totalAuthorsList.add(w.author.trim().toUpperCase()); });
    const totalAuthors = totalAuthorsList.size;

    const cubaPct = totalWorks ? Math.round((cubaWorksCount / totalWorks) * 100) : 0;
    const foreignPct = totalWorks ? Math.round((foreignWorksCount / totalWorks) * 100) : 0;
    
    const cubaAuthorsPct = totalAuthors ? Math.round((cubaAuthors.size / totalAuthors) * 100) : 0;
    const foreignAuthorsPct = totalAuthors ? Math.round((foreignAuthors.size / totalAuthors) * 100) : 0;

    return {
      cubaWorksCount,
      cubaAuthors: cubaAuthors.size,
      cubaPct,
      cubaAuthorsPct,
      
      foreignWorksCount,
      foreignAuthors: foreignAuthors.size,
      foreignPct,
      foreignAuthorsPct,
      
      totalWorks,
      totalAuthors,
      
      regions: {
        latam: {
          works: regions['Latinoam. y del Caribe'].works,
          authors: regions['Latinoam. y del Caribe'].authors.size,
          pct: totalWorks ? Math.round((regions['Latinoam. y del Caribe'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Latinoam. y del Caribe'].authors.size / totalAuthors) * 100) : 0
        },
        norte: {
          works: regions['Norteamericana'].works,
          authors: regions['Norteamericana'].authors.size,
          pct: totalWorks ? Math.round((regions['Norteamericana'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Norteamericana'].authors.size / totalAuthors) * 100) : 0
        },
        europa: {
          works: regions['Europa'].works,
          authors: regions['Europa'].authors.size,
          pct: totalWorks ? Math.round((regions['Europa'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Europa'].authors.size / totalAuthors) * 100) : 0
        },
        otras: {
          works: regions['Otras Zonas'].works,
          authors: regions['Otras Zonas'].authors.size,
          pct: totalWorks ? Math.round((regions['Otras Zonas'].works / totalWorks) * 100) : 0,
          authorsPct: totalAuthors ? Math.round((regions['Otras Zonas'].authors.size / totalAuthors) * 100) : 0
        }
      }
    };
  };

  const currentIncidentalStats = getIncidentalRegionStats();

  // Calculates backdrop tracks, sound transitions, effects, and curtains
  const incidentalData = stockMensual.map(p => {
    // Categorize tracks as incidental or main based on their genre
    const incidentals = (p.tracks || []).filter(t => {
      const genre = (t.genre || '').toLowerCase();
      return genre.includes('incidental') || genre.includes('efecto') || genre.includes('cortina') || genre.includes('ambiente') || genre.includes('transicion');
    });
    return {
      program: p.program || 'Desconocido',
      date: p.date,
      totalTracks: p.tracks?.length || 0,
      incidentalCount: incidentals.length,
      mainTracksCount: (p.tracks?.length || 0) - incidentals.length
    };
  });

  const totalIncidentalTracks = incidentalData.reduce((acc, curr) => acc + curr.incidentalCount, 0);
  const totalMainMusicTracks = incidentalData.reduce((acc, curr) => acc + curr.mainTracksCount, 0);
  const totalTracksSimulated = totalIncidentalTracks + totalMainMusicTracks;

  // DOCX WRAPPER HELPERS (To satisfy type safety with docx v9 properties)
  const docxCell = (text: string, bold: boolean = false, align: any = AlignmentType.LEFT) => {
    return new TableCell({
      children: [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({ font: "Arial",
              text: text,
              bold: bold,
              size: 24
            })
          ]
        })
      ]
    });
  };

  const docxCellHeader = (text: string) => {
    return new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ font: "Arial",
              text: text,
              bold: true,
              size: 24
            })
          ]
        })
      ]
    });
  };

  const getActiveTopLists = () => {
    return { topSongs, topAuthors, topPerformers, topGenres, totalAnalyzeCount: resolvedTotalAnalyzeCount };
  };

  const parseMensualTxt = (text: string) => {
    const dataSnap = {
        totalWorks: 0, cubaWorks: 0, foreignWorks: 0,
        totalAuthors: 0, cubaAuthors: 0, foreignAuthors: 0,
        totalPerformers: 0, cubaPerformers: 0, foreignPerformers: 0,
        regions: {
            'Latinoam. y del Caribe': { works: 0, authors: 0, performers: 0 },
            'Norteamericana': { works: 0, authors: 0, performers: 0 },
            'Europa': { works: 0, authors: 0, performers: 0 },
            'Asia': { works: 0, authors: 0, performers: 0 },
            'África': { works: 0, authors: 0, performers: 0 },
            'Otras zonas': { works: 0, authors: 0, performers: 0 }
        } as Record<string, any>,
        topSongs: [] as any[], topAuthors: [] as any[],
        topPerformers: [] as any[], topGenres: [] as any[]
    };

    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
            currentSection = trimmed;
            continue;
        }

        const regionMap: Record<string, string> = {
            'Latinoamérica y Caribe': 'Latinoam. y del Caribe',
            'Norteamericana': 'Norteamericana',
            'Europa': 'Europa',
            'Asia': 'Asia',
            'África': 'África',
            'Otras zonas': 'Otras zonas'
        };

        if (currentSection === '=== Estadísticas por zonas geográficas ===') {
            const worksMatch = trimmed.match(/Obras:\s*(\d+)/);
            const authorsMatch = trimmed.match(/Autores:\s*(\d+)/);
            const perfMatch = trimmed.match(/Intérpretes:\s*(\d+)/);
            
            if (worksMatch && authorsMatch && perfMatch) {
                const w = parseInt(worksMatch[1]);
                const a = parseInt(authorsMatch[1]);
                const p = parseInt(perfMatch[1]);
                
                if (trimmed.includes('Total general')) {
                    dataSnap.totalWorks = w; dataSnap.totalAuthors = a; dataSnap.totalPerformers = p;
                } else if (trimmed.includes('Zona: Cuba')) {
                    dataSnap.cubaWorks = w; dataSnap.cubaAuthors = a; dataSnap.cubaPerformers = p;
                } else if (trimmed.includes('Zona: Extranjera')) {
                    dataSnap.foreignWorks = w; dataSnap.foreignAuthors = a; dataSnap.foreignPerformers = p;
                } else {
                    for (const regText in regionMap) {
                        if (trimmed.includes(regText)) {
                            dataSnap.regions[regionMap[regText]] = { works: w, authors: a, performers: p };
                        }
                    }
                }
            }
        } else if (currentSection === '=== Obras musicales más difundidas ===') {
            const parts = trimmed.split(';');
            if (parts.length >= 5) {
                dataSnap.topSongs.push({
                    track: {
                        title: parts[1].replace('Título:', '').trim() || 'Desconocido',
                        performer: parts[2].replace('Intérprete:', '').split('(')[0].trim() || 'Desconocido',
                        performerCountry: parts[2].includes('(Cuba)') ? 'CUBA' : 'EXTRANJERO',
                        author: parts[3].replace('Autor:', '').split('(')[0].trim() || 'Desconocido',
                        authorCountry: parts[3].includes('(Cuba)') ? 'CUBA' : 'EXTRANJERO'
                    },
                    count: parseInt(parts[4].replace('Frecuencia:', '').trim()) || 0
                });
            }
        } else if (currentSection === '=== Autores más difundidos ===') {
            const parts = trimmed.split(';');
            if (parts.length >= 4) {
                 dataSnap.topAuthors.push({
                    name: parts[1].replace('Autor:', '').split('(')[0].trim(),
                    nac: parts[1].includes('(Cuba)') ? 'CUBA' : 'EXTRANJERO',
                    execs: parseInt(parts[2].replace('Cantidad de obras:', '').trim()),
                    frec: parseInt(parts[3].replace('Frecuencia:', '').trim())
                 });
            }
        } else if (currentSection === '=== Intérpretes más difundidos ===') {
            const parts = trimmed.split(';');
            if (parts.length >= 4) {
                 dataSnap.topPerformers.push({
                    name: parts[1].replace('Intérprete:', '').split('(')[0].trim(),
                    nac: parts[1].includes('(Cuba)') ? 'CUBA' : 'EXTRANJERO',
                    execs: parseInt(parts[2].replace('Cantidad de obras:', '').trim()),
                    frec: parseInt(parts[3].replace('Frecuencia:', '').trim())
                 });
            }
        } else if (currentSection === '=== Géneros musicales más difundidos ===') {
            const parts = trimmed.split(';');
            if (parts.length >= 4) {
                 dataSnap.topGenres.push({
                    name: parts[1].replace('Género:', '').trim(),
                    execs: parseInt(parts[2].match(/\d+/)?.[0] || '0'),
                    frec: parseInt(parts[3].match(/\d+/)?.[0] || '0')
                 });
            }
        }
    }
    return dataSnap;
  };

  const extractMonthYearFromText = (text: string) => {
    const lines = text.split('\n');
    let year = '';
    let month = '';
    
    const headerLine = lines.find(l => l.includes('AÑO:') && l.includes('MES:'));
    if (headerLine) {
        const yearMatch = headerLine.match(/AÑO:\s*(\d+)/);
        const monthMatch = headerLine.match(/MES:\s*([A-ZÁÉÍÓÚ]+)/i);
        
        if (yearMatch) year = yearMatch[1];
        if (monthMatch) {
            const mName = monthMatch[1].toUpperCase();
            const months: Record<string, string> = {
                'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04',
                'MAYO': '05', 'JUNIO': '06', 'JULIO': '07', 'AGOSTO': '08',
                'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
            };
            month = months[mName] || '01';
        }
    }
    
    if (year && month) return `${year}-${month}`;
    return null;
  };

  const handleArchivar = () => {
    const monthKey = selectedMonthStr;
    if (activeReportType === 'mensual') {
      const currentLiveM = {
        totalWorks: totalWorksQuantity,
        totalWorksPlays: totalWorksFrequency,
        cubaWorks: totalWorksCuba,
        foreignWorks: totalWorksForeign,
        totalAuthors: totalAuthorsCount,
        cubaAuthors: cubanAuthorsCount,
        foreignAuthors: foreignAuthorsCount,
        totalPerformers: totalPerformersCount,
        cubaPerformers: cubanPerformersCount,
        foreignPerformers: foreignPerformersCount,
        regions: {} as any,
        topSongs,
        topAuthors,
        topPerformers,
        topGenres
      };
      
      // Save region counts
      Object.keys(regionStats).forEach(reg => {
        const s = regionStats[reg as keyof typeof regionStats];
        currentLiveM.regions[reg] = {
          works: s.works,
          authors: s.authors.size,
          performers: s.performers.size,
          plays: (s as any).plays || 0
        };
      });

      saveToArchive('mensual', monthKey, currentLiveM);
      alert('Informe Mensual guardado en Archivo.');
    } else if (activeReportType === 'economia') {
      const currentLiveE = {
        completasCubana: totalWorksCuba,
        completasExtranjera: totalWorksForeign,
        completasTotal: totalWorksQuantity,
        instrumentalesCubana: countDaysInMonth(selectedYear, selectedMonthNum, [1, 2, 3, 4, 5]),
        instrumentalesExtranjera: 0,
        instrumentalesTotal: countDaysInMonth(selectedYear, selectedMonthNum, [1, 2, 3, 4, 5]),
        incidentalesCubana: getIncidentalStatsForMonth(selectedYear, selectedMonthNum).totalWorks,
        incidentalesExtranjera: 0,
        incidentalesTotal: getIncidentalStatsForMonth(selectedYear, selectedMonthNum).totalWorks
      };
      saveToArchive('economia', monthKey, currentLiveE);
      alert('Informe Economía guardado en Archivo.');
    } else if (activeReportType === 'incidental') {
      const currentLiveI = getIncidentalStatsForMonth(selectedYear, selectedMonthNum);
      saveToArchive('incidental', monthKey, currentLiveI);
      alert('Informe Incidental guardado en Archivo.');
    }
  };

  const handleGenerateDOCX_Music = async () => {
    const stats = activePeriodStats.mensual;
    const regionStatsAgg = getActiveRegionStats();
    try {
      const { topSongs, topAuthors, topPerformers, topGenres } = getActiveTopLists();

      const periodStr = getPeriodName(selectedMonthNum, selectedYear, activePeriod);

      // Regional breakdown rows helper
      const makeRegionRow = (regionName: string) => {
        const regObj = regionStatsAgg[regionName as keyof typeof regionStatsAgg] || { works: 0, authors: new Set(), performers: new Set(), plays: 0 };
        const wCount = typeof regObj.works === 'number' ? regObj.works : (regObj.works as any)?.size || 0;
        const aCount = typeof regObj.authors === 'number' ? regObj.authors : (regObj.authors as any)?.size || 0;
        const pCount = typeof regObj.performers === 'number' ? regObj.performers : (regObj.performers as any)?.size || 0;
        
        return new TableRow({
          children: [
            docxCell(""),
            docxCell(regionName, false),
            docxCell(wCount.toString(), false, AlignmentType.CENTER),
            docxCell(pct(wCount, stats.totalWorks), false, AlignmentType.CENTER),
            docxCell(aCount.toString(), false, AlignmentType.CENTER),
            docxCell(pct(aCount, stats.totalAuthors), false, AlignmentType.CENTER),
            docxCell(pCount.toString(), false, AlignmentType.CENTER),
            docxCell(pct(pCount, stats.totalPerformers), false, AlignmentType.CENTER),
          ]
        });
      };

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ font: "Arial", text: "DIRECCIÓN NACIONAL DE MÚSICA", bold: true, size: 28 }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ font: "Arial", text: "ESTADÍSTICAS MUSICALES", bold: true, size: 24 }),
              ],
            }),
            new Paragraph({ text: "" }),

            // Emisora & Provincia table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ font: "Arial", text: `Emisora: RADIO CIUDAD MONUMENTO`, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ font: "Arial", text: `Provincia: GRANMA`, bold: true })] })] }),
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ font: "Arial", text: `Año: ${selectedYear}` })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ font: "Arial", text: periodStr })] })] }),
                  ]
                })
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Obras, autores e intérpretes por zonas geográficas", bold: true, size: 24 })
              ]
            }),
            new Paragraph({ text: "" }),

            // Standard stats table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                // Header
                new TableRow({
                  children: [
                    docxCellHeader("No"),
                    docxCellHeader("Zonas"),
                    docxCellHeader("Cantidad de obras"),
                    docxCellHeader("%"),
                    docxCellHeader("Cantidad autores"),
                    docxCellHeader("%"),
                    docxCellHeader("Cantidad intérpretes"),
                    docxCellHeader("%"),
                  ]
                }),
                // Cuba row
                new TableRow({
                  children: [
                    docxCell("1", false, AlignmentType.CENTER),
                    docxCell("Cuba", true),
                    docxCell((stats.cubaWorks || 0).toString(), false, AlignmentType.CENTER),
                    docxCell(pct(stats.cubaWorks || 0, stats.totalWorks), false, AlignmentType.CENTER),
                    docxCell((stats.cubaAuthors || 0).toString(), false, AlignmentType.CENTER),
                    docxCell(pct(stats.cubaAuthors || 0, stats.totalAuthors), false, AlignmentType.CENTER),
                    docxCell((stats.cubaPerformers || 0).toString(), false, AlignmentType.CENTER),
                    docxCell(pct(stats.cubaPerformers || 0, stats.totalPerformers), false, AlignmentType.CENTER),
                  ]
                }),
                // Extranjera row
                new TableRow({
                  children: [
                    docxCell("2", false, AlignmentType.CENTER),
                    docxCell("Extranjera", true),
                    docxCell((stats.foreignWorks || 0).toString(), false, AlignmentType.CENTER),
                    docxCell(pct(stats.foreignWorks || 0, stats.totalWorks), false, AlignmentType.CENTER),
                    docxCell((stats.foreignAuthors || 0).toString(), false, AlignmentType.CENTER),
                    docxCell(pct(stats.foreignAuthors || 0, stats.totalAuthors), false, AlignmentType.CENTER),
                    docxCell((stats.foreignPerformers || 0).toString(), false, AlignmentType.CENTER),
                    docxCell(pct(stats.foreignPerformers || 0, stats.totalPerformers), false, AlignmentType.CENTER),
                  ]
                }),
                // Total row
                new TableRow({
                  children: [
                    docxCell(""),
                    docxCell("Total general", true),
                    docxCell((stats.totalWorks || 0).toString(), true, AlignmentType.CENTER),
                    docxCell("100", true, AlignmentType.CENTER),
                    docxCell((stats.totalAuthors || 0).toString(), true, AlignmentType.CENTER),
                    docxCell("100", true, AlignmentType.CENTER),
                    docxCell((stats.totalPerformers || 0).toString(), true, AlignmentType.CENTER),
                    docxCell("100", true, AlignmentType.CENTER),
                  ]
                }),
                // Foreign subcategories
                makeRegionRow('Latinoam. y del Caribe'),
                makeRegionRow('Norteamericana'),
                makeRegionRow('Europa'),
                makeRegionRow('Asia'),
                makeRegionRow('Africa'),
                makeRegionRow('Otras zonas'),
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Obras musicales más difundidas", bold: true, size: 24 })
              ]
            }),
            new Paragraph({ text: "" }),

            // Top Songs table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    docxCellHeader("No"),
                    docxCellHeader("Título"),
                    docxCellHeader("Intérprete"),
                    docxCellHeader("Nac"),
                    docxCellHeader("Autor"),
                    docxCellHeader("Nac"),
                    docxCellHeader("Frec."),
                  ]
                }),
                ...topSongs.map((item, idx) => {
                  const track = item.track || {};
                  const nacPerf = isCuban(track.performerCountry) || (!track.performerCountry && !track.authorCountry) ? "CUBA" : (track.performerCountry?.toUpperCase() || '-');
                  const nacAuth = isCuban(track.authorCountry) || (!track.authorCountry && !track.performerCountry) ? "CUBA" : (track.authorCountry?.toUpperCase() || '-');
                  return new TableRow({
                    children: [
                      docxCell((idx + 1).toString(), false, AlignmentType.CENTER),
                      docxCell(track.title?.toUpperCase() || ''),
                      docxCell(track.performer?.toUpperCase() || ''),
                      docxCell(nacPerf, false, AlignmentType.CENTER),
                      docxCell(track.author?.toUpperCase() || ''),
                      docxCell(nacAuth, false, AlignmentType.CENTER),
                      docxCell((item.count || 0).toString(), true, AlignmentType.CENTER),
                    ]
                  });
                })
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Autores más difundidos", bold: true, size: 24 })
              ]
            }),
            new Paragraph({ text: "" }),

            // Top Authors Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    docxCellHeader("No"),
                    docxCellHeader("Autores"),
                    docxCellHeader("Nac"),
                    docxCellHeader("Cant."),
                    docxCellHeader("Frec."),
                  ]
                }),
                ...topAuthors.map((item, idx) => {
                  return new TableRow({
                    children: [
                      docxCell((idx + 1).toString(), false, AlignmentType.CENTER),
                      docxCell((item.name || '').toUpperCase(), true),
                      docxCell(item.nac || '-', false, AlignmentType.CENTER),
                      docxCell((item.songs?.size || 0).toString(), false, AlignmentType.CENTER),
                      docxCell((item.execs || 0).toString(), true, AlignmentType.CENTER),
                    ]
                  });
                })
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Intérpretes más difundidos", bold: true, size: 24 })
              ]
            }),
            new Paragraph({ text: "" }),

            // Top Performers Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    docxCellHeader("No"),
                    docxCellHeader("Intérpretes"),
                    docxCellHeader("Nac"),
                    docxCellHeader("Cant."),
                    docxCellHeader("Frec."),
                  ]
                }),
                ...topPerformers.map((item, idx) => {
                  return new TableRow({
                    children: [
                      docxCell((idx + 1).toString(), false, AlignmentType.CENTER),
                      docxCell((item.name || '').toUpperCase(), true),
                      docxCell(item.nac || '-', false, AlignmentType.CENTER),
                      docxCell((item.songs?.size || 0).toString(), false, AlignmentType.CENTER),
                      docxCell((item.execs || 0).toString(), true, AlignmentType.CENTER),
                    ]
                  });
                })
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Géneros más difundidos", bold: true, size: 24 })
              ]
            }),
            new Paragraph({ text: "" }),

            // Top Genres Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    docxCellHeader("No"),
                    docxCellHeader("Géneros"),
                    docxCellHeader("Nac"),
                    docxCellHeader("Cant."),
                    docxCellHeader("Frec."),
                  ]
                }),
                ...topGenres.map((item, idx) => {
                  return new TableRow({
                    children: [
                      docxCell((idx + 1).toString(), false, AlignmentType.CENTER),
                      docxCell(item.name || '', true),
                      docxCell("0", false, AlignmentType.CENTER),
                      docxCell((item.execs || 0).toString(), false, AlignmentType.CENTER),
                      docxCell((item.frec || 0).toString(), true, AlignmentType.CENTER),
                    ]
                  });
                })
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Signatures row
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ font: "Arial", text: "____________________________________             ___________________________________\n", bold: true }),
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ font: "Arial", text: `Coordinador musical: ${coordinadorMusical}               J' Programación: ${jefeProgramacion}`, bold: true, size: 24 })
              ]
            })
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `INFORME_MUSICA_MENSUAL_RCM_${activePeriod.toUpperCase()}_${selectedMonthStr}.docx`);
    } catch (err: any) {
      console.error("Error generating DOCX Music Report:", err);
      alert(`No se pudo generar el documento DOCX: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleGenerateDOCX_Economy = async () => {
    try {
      const stats = activePeriodStats.economia;
      const periodStr = getPeriodName(selectedMonthNum, selectedYear, activePeriod);

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ font: "Arial", text: "RADIO CIUDAD MONUMENTO", bold: true, size: 28 })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ font: "Arial", text: "INFORME DE MÚSICA", bold: true, size: 24, underline: {} })
              ]
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ font: "Arial", text: periodStr, bold: true, size: 24 })
              ]
            }),
            new Paragraph({ text: "" }),

            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    docxCell(""),
                    docxCell("CUBANA", true, AlignmentType.CENTER),
                    docxCell("EXTRANJERA", true, AlignmentType.CENTER),
                    docxCell("TOTAL", true, AlignmentType.CENTER)
                  ]
                }),
                new TableRow({
                  children: [
                    docxCell("OBRAS COMPLETAS", true),
                    docxCell((stats.completasCubana || 0).toString(), false, AlignmentType.CENTER),
                    docxCell((stats.completasExtranjera || 0).toString(), false, AlignmentType.CENTER),
                    docxCell((stats.completasTotal || 0).toString(), false, AlignmentType.CENTER)
                  ]
                }),
                new TableRow({
                  children: [
                    docxCell("OBRAS INSTRUMENTALES", true),
                    docxCell((stats.instrumentalesCubana || 0).toString(), false, AlignmentType.CENTER),
                    docxCell("-", false, AlignmentType.CENTER),
                    docxCell((stats.instrumentalesTotal || 0).toString(), false, AlignmentType.CENTER)
                  ]
                }),
                new TableRow({
                  children: [
                    docxCell("OBRAS INCIDENTALES", true),
                    docxCell((stats.incidentalesCubana || 0).toString(), false, AlignmentType.CENTER),
                    docxCell("-", false, AlignmentType.CENTER),
                    docxCell((stats.incidentalesTotal || 0).toString(), false, AlignmentType.CENTER)
                  ]
                })
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Elaborado por:", bold: true, size: 24 })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: `${coordinadorMusical} ____________________________`, bold: false, size: 24 })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Especialista en Música.", bold: false, size: 24 })
              ]
            }),

            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Aprobado por:", bold: true, size: 24 })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: `${jefeProgramacion} ____________________________`, bold: false, size: 24 })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ font: "Arial", text: "Jefe de Programación", bold: false, size: 24 })
              ]
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const filename = `INFORME_ECONOMIA_RCM_${activePeriod.toUpperCase()}_${selectedMonthStr}.docx`;
      saveAs(blob, filename);
    } catch (err: any) {
      console.error("Error generating DOCX Economy Report:", err);
      alert(`No se pudo generar el documento DOCX: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleGenerateDOCX_Incidental = async () => {
    try {
      const stats = activePeriodStats.incidental;
    const periodStr = getPeriodName(selectedMonthNum, selectedYear, activePeriod);

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ font: "Arial", text: "DEPARTAMENTO DE MÚSICA", bold: true, size: 28 })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ font: "Arial", text: "ESTADÍSTICAS DE LA MÚSICA INCIDENTAL", bold: true, size: 24 })]
          }),
          new Paragraph({ text: "" }),

          // Header Emisora Data
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  docxCell("Nombre de la Emisora: RADIO CIUDAD MONUMENTO.", true),
                  docxCell("Emisora Internacional:___ Nacional:___ Provincial:___ Municipal: _X_", true)
                ]
              }),
              new TableRow({
                children: [
                  docxCell(`Fecha: ${periodStr}`, true),
                  docxCell(`Frecuencia: Mensual ${activePeriod === 'mensual' ? '_X_' : '___'} Trimestral: ${activePeriod === 'trimestral' ? '_X_' : '___'} Semestral: ${activePeriod === 'semestral' ? '_X_' : '___'} Anual: ${activePeriod === 'anual' ? '_X_' : '___'}`, true)
                ]
              })
            ]
          }),

          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ font: "Arial", text: "OBRAS, AUTORES E INTÉRPRETES POR ZONAS GEOGRÁFICAS", bold: true, size: 24 })
            ]
          }),
          new Paragraph({ text: "" }),

          // Incidental table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  docxCellHeader("No"),
                  docxCellHeader("Zonas"),
                  docxCellHeader("Cant. Obras"),
                  docxCellHeader("%"),
                  docxCellHeader("Cant. Autores"),
                  docxCellHeader("%"),
                ]
              }),
              // Cuba row
              new TableRow({
                children: [
                  docxCell("1", false, AlignmentType.CENTER),
                  docxCell("CUBA", true),
                  docxCell((stats.cubaWorksCount || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.cubaPct || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.cubaAuthors || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.cubaAuthorsPct || 0).toString(), false, AlignmentType.CENTER),
                ]
              }),
              // Foreigner row
              new TableRow({
                children: [
                  docxCell("2", false, AlignmentType.CENTER),
                  docxCell("Extranjera", true),
                  docxCell((stats.foreignWorksCount || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.foreignPct || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.foreignAuthors || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.foreignAuthorsPct || 0).toString(), false, AlignmentType.CENTER),
                ]
              }),
              // Latin America row
              new TableRow({
                children: [
                  docxCell("1", false, AlignmentType.CENTER),
                  docxCell("   Latinoamérica y el Caribe", false),
                  docxCell((stats.regions?.latam?.works || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.latam?.pct || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.latam?.authors || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.latam?.authorsPct || 0).toString(), false, AlignmentType.CENTER),
                ]
              }),
              // North America row
              new TableRow({
                children: [
                  docxCell("2", false, AlignmentType.CENTER),
                  docxCell("   Norteamérica", false),
                  docxCell((stats.regions?.norte?.works || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.norte?.pct || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.norte?.authors || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.norte?.authorsPct || 0).toString(), false, AlignmentType.CENTER),
                ]
              }),
              // Europe row
              new TableRow({
                children: [
                  docxCell("3", false, AlignmentType.CENTER),
                  docxCell("   Europa", false),
                  docxCell((stats.regions?.europa?.works || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.europa?.pct || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.europa?.authors || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.europa?.authorsPct || 0).toString(), false, AlignmentType.CENTER),
                ]
              }),
              // Otras row
              new TableRow({
                children: [
                  docxCell("6", false, AlignmentType.CENTER),
                  docxCell("   Otras Zonas", false),
                  docxCell((stats.regions?.otras?.works || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.otras?.pct || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.otras?.authors || 0).toString(), false, AlignmentType.CENTER),
                  docxCell((stats.regions?.otras?.authorsPct || 0).toString(), false, AlignmentType.CENTER),
                ]
              })
            ]
          }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ font: "Arial", text: "____________________________________             ___________________________________\n", bold: true }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ font: "Arial", text: `Confeccionado por: ${coordinadorMusical}               Aprobado por: ${jefeProgramacion}`, bold: true, size: 24 })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `INFORME_MUSICA_INCIDENTAL_${activePeriod.toUpperCase()}_${selectedMonthStr}.docx`);
    } catch (err: any) {
      console.error("Error generating DOCX Incidental Report:", err);
      alert(`No se pudo generar el documento DOCX: ${err.message || 'Error desconocido'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-4 font-sans backdrop-blur-md">
      <div className="bg-[#1A100C] border border-[#9E7649]/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-[#E8DCCF]">
        
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 gap-3 border-b border-[#9E7649]/30 bg-[#2C1B15]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#9E7649] text-2xl">analytics</span>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Centro de Informes y Estadísticas</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-[#E8DCCF]/60">Mes de análisis:</span>
                
                {/* Synchronized Month picker */}
                <div className="flex items-center gap-2 bg-black/40 border border-[#9E7649]/30 rounded-lg px-2.5 py-1 text-xs">
                  <button 
                    type="button" 
                    onClick={handlePrevMonth} 
                    className="text-[#9E7649] hover:text-white transition-colors flex items-center justify-center p-0.5"
                    title="Mes Anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  <select
                    value={selectedMonthNum}
                    onChange={(e) => {
                      const newMonth = String(e.target.value).padStart(2, '0');
                      onMonthChange?.(`${selectedYear}-${newMonth}`);
                    }}
                    className="bg-transparent border-none text-[#9E7649] font-bold text-xs focus:outline-none focus:ring-0 cursor-pointer text-center outline-none p-0 hover:text-white transition-colors"
                  >
                    {MONTH_NAMES_SPANISH.map((name, idx) => (
                      <option key={idx} value={idx + 1} className="bg-[#1A100C] text-white">{name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      const newYear = e.target.value;
                      onMonthChange?.(`${newYear}-${String(selectedMonthNum).padStart(2, '0')}`);
                    }}
                    className="bg-transparent border-none text-[#9E7649] font-bold text-xs focus:outline-none focus:ring-0 cursor-pointer text-center outline-none p-0 hover:text-white transition-colors ml-1"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                      <option key={yr} value={yr} className="bg-[#1A100C] text-white">{yr}</option>
                    ))}
                  </select>

                  <button 
                    type="button" 
                    onClick={handleNextMonth} 
                    className="text-[#9E7649] hover:text-white transition-colors flex items-center justify-center p-0.5"
                    title="Mes Siguiente"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#E8DCCF]/60 hover:text-white transition-colors p-1" id="close-reports-modal-btn">
            <X size={22} />
          </button>
        </div>

        {/* Mode selector tab */}
        <div className="flex border-b border-[#9E7649]/20 bg-[#1A100C] p-2 gap-2">
          <button 
            type="button"
            onClick={() => setActiveReportType('mensual')}
            className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeReportType === 'mensual' ? 'bg-[#9E7649] text-white shadow-lg' : 'text-[#E8DCCF]/60 hover:bg-white/5'}`}
          >
            <Music size={15} /> Informe Música Mensual
          </button>
          <button 
            type="button"
            onClick={() => setActiveReportType('economia')}
            className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeReportType === 'economia' ? 'bg-[#9E7649] text-white shadow-lg' : 'text-[#E8DCCF]/60 hover:bg-white/5'}`}
          >
            <DollarSign size={15} /> Informe de Economía
          </button>
          <button 
            type="button"
            onClick={() => setActiveReportType('incidental')}
            className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeReportType === 'incidental' ? 'bg-[#9E7649] text-white shadow-lg' : 'text-[#E8DCCF]/60 hover:bg-white/5'}`}
          >
            <Layers size={15} /> Informe Música Incidental
          </button>
        </div>

        {/* Period Selector and Archive Manager Header */}
        <div className="flex flex-col sm:flex-row bg-[#2C1B15] p-3 gap-4 items-start sm:items-center justify-between border-b border-[#9E7649]/20 shadow-inner">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-[#E8DCCF]/60 uppercase font-bold tracking-wider whitespace-nowrap">Período Analizado:</span>
            <select 
              value={activePeriod} 
              onChange={e => setActivePeriod(e.target.value as any)}
              className="bg-[#1A100C] border border-[#9E7649]/30 rounded-lg text-white text-xs p-1.5 outline-none focus:border-[#9E7649] transition-colors"
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>

            {activePeriod === 'trimestral' && (
              <select 
                value={Math.floor((selectedMonthNum - 1) / 3) * 3 + 1}
                onChange={e => {
                  const firstMonth = String(e.target.value).padStart(2, '0');
                  onMonthChange?.(`${selectedYear}-${firstMonth}`);
                }}
                className="bg-[#1A100C] border border-[#9E7649]/30 rounded-lg text-white text-xs p-1.5 outline-none focus:border-[#9E7649] transition-colors"
              >
                <option value="1">1er Trimestre (Enero-Marzo)</option>
                <option value="4">2do Trimestre (Abril-Junio)</option>
                <option value="7">3er Trimestre (Julio-Septiembre)</option>
                <option value="10">4to Trimestre (Octubre-Diciembre)</option>
              </select>
            )}
          </div>
          
          <button 
            type="button"
            onClick={() => {
              setArchiveManagerType(activeReportType);
              setShowArchiveManager(true);
            }}
            className="w-full sm:w-auto bg-[#9E7649]/10 hover:bg-[#9E7649]/30 border border-[#9E7649]/40 text-white text-xs px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Folder size={16} /> Abrir Archivo
          </button>
        </div>

        {/* Modal body (analysis and tables preview) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 max-h-[60vh]">
          {previewUploadedData && (
            <div className="bg-[#1A100C] p-5 rounded-2xl border border-[#9E7649]/40 animate-fade-in shadow-2xl ring-4 ring-[#9E7649]/10 max-w-4xl mx-auto mb-8">
              <div className="flex justify-between items-center mb-4 border-b border-[#9E7649]/20 pb-2">
                 <h5 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                   <div className="bg-green-500/20 p-1 rounded-full"><Check size={16} className="text-green-500" /></div>
                   Previsualizando Informe: <span className="text-[#9E7649]">{previewMonthKey}</span>
                 </h5>
                 <button onClick={() => setPreviewUploadedData(null)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors">Cancelar</button>
              </div>

              <div className="bg-[#FBF8F5] text-black p-6 rounded shadow-2xl max-h-[400px] overflow-auto mb-6 border border-black/20 text-[11px] font-sans">
                 {previewType === 'mensual' && (
                   <div className="space-y-4">
                     <h3 className="text-center font-bold uppercase border-b border-black pb-2 text-[13px]">Previsualización Música Mensual</h3>
                     <table className="w-full border-collapse border border-black/30 text-center">
                       <thead><tr className="bg-black/5 font-bold"><th>Zona</th><th>Obras</th><th>Autores</th><th>Intérpretes</th></tr></thead>
                       <tbody>
                         <tr className="border-b border-black/10"><td>Cuba</td><td>{previewUploadedData.cubaWorks || 0}</td><td>{previewUploadedData.cubaAuthors || 0}</td><td>{previewUploadedData.cubaPerformers || 0}</td></tr>
                         <tr className="border-b border-black/10"><td>Extranjera</td><td>{previewUploadedData.foreignWorks || 0}</td><td>{previewUploadedData.foreignAuthors || 0}</td><td>{previewUploadedData.foreignPerformers || 0}</td></tr>
                         <tr className="font-bold bg-black/5"><td>Total</td><td>{(previewUploadedData.cubaWorks||0)+(previewUploadedData.foreignWorks||0)}</td><td>{(previewUploadedData.cubaAuthors||0)+(previewUploadedData.foreignAuthors||0)}</td><td>{(previewUploadedData.cubaPerformers||0)+(previewUploadedData.foreignPerformers||0)}</td></tr>
                       </tbody>
                     </table>
                   </div>
                 )}
                 {previewType === 'economia' && (
                    <div className="space-y-4">
                      <h3 className="text-center font-bold uppercase border-b border-black pb-2 text-[13px]">Previsualización Economía</h3>
                      <table className="w-full border-collapse border border-black/30 text-center">
                        <thead><tr className="bg-black/5 font-bold"><th>Categoría</th><th>Cubana</th><th>Extranjera</th><th>Total</th></tr></thead>
                        <tbody>
                          <tr className="border-b border-black/10"><td className="text-left font-bold pl-1">Obras Completas</td><td>{previewUploadedData.completasCubana || 0}</td><td>{previewUploadedData.completasExtranjera || 0}</td><td>{previewUploadedData.completasTotal || 0}</td></tr>
                          <tr className="border-b border-black/10"><td className="text-left font-bold pl-1">Incidental</td><td>{previewUploadedData.incidentalesCubana || 0}</td><td>{previewUploadedData.incidentalesExtranjera || 0}</td><td>{previewUploadedData.incidentalesTotal || 0}</td></tr>
                          <tr className="border-b border-black/10"><td className="text-left font-bold pl-1">Instrumental</td><td>{previewUploadedData.instrumentalesCubana || 0}</td><td>{previewUploadedData.instrumentalesExtranjera || 0}</td><td>{previewUploadedData.instrumentalesTotal || 0}</td></tr>
                        </tbody>
                      </table>
                    </div>
                 )}
                 {previewType === 'incidental' && (
                    <div className="space-y-4">
                      <h3 className="text-center font-bold uppercase border-b border-black pb-2 text-[13px]">Previsualización Incidental</h3>
                      <table className="w-full border-collapse border border-black/30 text-center">
                        <thead><tr className="bg-gray-100 font-bold"><th>Zona</th><th>Obras</th><th>Autores</th></tr></thead>
                        <tbody>
                          <tr className="border-b border-black/10"><td>Cuba</td><td>{previewUploadedData.cubaWorksCount || 0}</td><td>{previewUploadedData.cubaAuthors || 0}</td></tr>
                          <tr className="border-b border-black/10"><td>Extranjera</td><td>{previewUploadedData.foreignWorksCount || 0}</td><td>{previewUploadedData.foreignAuthors || 0}</td></tr>
                          <tr className="font-bold bg-black/5 border-t border-black"><td>Total</td><td>{previewUploadedData.totalWorks || 0}</td><td>{previewUploadedData.totalAuthors || 0}</td></tr>
                        </tbody>
                      </table>
                    </div>
                 )}
              </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button 
                       onClick={() => {
                         saveToArchive(previewType!, previewMonthKey!, previewUploadedData);
                         
                         // Switch current view to the month we just saved so the user sees the data
                         if (onMonthChange && previewMonthKey) {
                            onMonthChange(previewMonthKey);
                         }
                         if (previewType) {
                            setActiveReportType(previewType);
                         }
                         
                         setPreviewUploadedData(null);
                         alert("Mes guardado en el archivo correctamente.");
                         setShowArchiveManager(false);
                       }}
                       className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl text-xs md:text-sm order-2 md:order-1"
                     >
                       <Check size={20} /> Guardar Mes en Archivo
                     </button>
                 <button 
                   onClick={() => setPreviewUploadedData(null)}
                   className="bg-[#2C1B15] hover:bg-white/5 text-[#E8DCCF] border border-[#9E7649]/30 rounded-xl transition-colors font-bold text-[10px] md:text-[11px] py-3 md:py-4 uppercase order-1 md:order-2"
                 >
                   Cancelar Previsualización
                 </button>
              </div>
            </div>
          )}
          
          {/* Metadata coordinator inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#2C1B15]/40 p-4 rounded-xl border border-[#9E7649]/20">
            <div>
              <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase mb-1">Nombre Coordinador Musical</label>
              <input 
                type="text" 
                value={coordinadorMusical} 
                onChange={e => handleCoordinadorChange(e.target.value)} 
                className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white text-xs outline-none focus:border-[#9E7649]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase mb-1">Nombre Jefe de Programación</label>
              <input 
                type="text" 
                value={jefeProgramacion} 
                onChange={e => handleJefeChange(e.target.value)} 
                className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white text-xs outline-none focus:border-[#9E7649]"
              />
            </div>
          </div>

          {/* REPORT VIEW: MONTHLY MUSIC */}
          {activeReportType === 'mensual' && (
            <div className="space-y-6">
              
              {/* Paper-like styled container designed exactly like Microsoft Word document */}
              <div className="bg-[#FBF8F5] text-black p-8 rounded-xl border border-black/10 shadow-lg font-sans mx-auto max-w-4xl space-y-6 overflow-x-auto text-[12px]">
                
                {/* Title and Headers */}
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-[14px] tracking-wide">DIRECCIÓN NACIONAL DE MÚSICA</h3>
                  <h3 className="font-bold text-[14px] tracking-wider">ESTADÍSTICAS MUSICALES</h3>
                </div>

                {/* Emisora stats top box */}
                <table className="w-full border-collapse border border-black/30">
                  <tbody>
                    <tr className="border-b border-black/30 font-bold">
                      <td className="p-2 border-r border-black/30">Emisora: RADIO CIUDAD MONUMENTO</td>
                      <td className="p-2">Provincia: GRANMA</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="p-2 border-r border-black/30">Año: {selectedYear}</td>
                      <td className="p-2">{activePeriod === 'mensual' ? 'MES:' : 'PERÍODO:'} {getPeriodName(selectedMonthNum, selectedYear, activePeriod)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Main Geographic Table */}
                <div className="space-y-2">
                  <h4 className="font-bold italic">Obras, autores e intérpretes por zonas geográficas</h4>
                  <table className="w-full border-collapse border border-black/30 text-center">
                    <thead>
                      <tr className="border-b border-black/30 bg-black/5 font-bold">
                        <th className="p-1.5 border-r border-black/30 w-8">No</th>
                        <th className="p-1.5 border-r border-black/30 text-left">Zonas</th>
                        <th className="p-1.5 border-r border-black/30">Cantidad de obras</th>
                        <th className="p-1.5 border-r border-black/30 w-12">%</th>
                        <th className="p-1.5 border-r border-black/30">Cantidad autores</th>
                        <th className="p-1.5 border-r border-black/30 w-12">%</th>
                        <th className="p-1.5 border-r border-black/30">Cantidad intérpretes</th>
                        <th className="p-1.5 px-2 border-black/30 w-12">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/30">
                        <td className="p-1.5 border-r border-black/30 font-bold">1</td>
                        <td className="p-1.5 border-r border-black/30 text-left font-bold">Cuba</td>
                        <td className="p-1.5 border-r border-black/30">{totalWorksCuba}</td>
                        <td className="p-1.5 border-r border-black/30">{pct(totalWorksCuba, totalWorksQuantity)}</td>
                        <td className="p-1.5 border-r border-black/30">{cubanAuthorsCount}</td>
                        <td className="p-1.5 border-r border-black/30">{pct(cubanAuthorsCount, totalAuthorsCount)}</td>
                        <td className="p-1.5 border-r border-black/30">{cubanPerformersCount}</td>
                        <td className="p-1.5">{pct(cubanPerformersCount, totalPerformersCount)}</td>
                      </tr>
                      <tr className="border-b border-black/30">
                        <td className="p-1.5 border-r border-black/30 font-bold">2</td>
                        <td className="p-1.5 border-r border-black/30 text-left font-bold">Extranjera</td>
                        <td className="p-1.5 border-r border-black/30">{totalWorksForeign}</td>
                        <td className="p-1.5 border-r border-black/30">{pct(totalWorksForeign, totalWorksQuantity)}</td>
                        <td className="p-1.5 border-r border-black/30">{foreignAuthorsCount}</td>
                        <td className="p-1.5 border-r border-black/30">{pct(foreignAuthorsCount, totalAuthorsCount)}</td>
                        <td className="p-1.5 border-r border-black/30">{foreignPerformersCount}</td>
                        <td className="p-1.5">{pct(foreignPerformersCount, totalPerformersCount)}</td>
                      </tr>
                      <tr className="border-b border-black/30 font-bold bg-black/5">
                        <td className="p-1.5 border-r border-black/30"></td>
                        <td className="p-1.5 border-r border-black/30 text-left">Total general</td>
                        <td className="p-1.5 border-r border-black/30">{totalWorksQuantity}</td>
                        <td className="p-1.5 border-r border-black/30">100</td>
                        <td className="p-1.5 border-r border-black/30">{totalAuthorsCount}</td>
                        <td className="p-1.5 border-r border-black/30">100</td>
                        <td className="p-1.5 border-r border-black/30">{totalPerformersCount}</td>
                        <td className="p-1.5">100</td>
                      </tr>
                      {/* Foreign subcategories */}
                      {Object.keys(regionStats).map((regName) => {
                        const s = (regionStats as any)[regName];
                        const worksCount = typeof s.works === 'number' ? s.works : (s.works?.size || 0);
                        const authorCount = (typeof s.authors === 'number') ? s.authors : (s.authors?.size || 0);
                        const performerCount = (typeof s.performers === 'number') ? s.performers : (s.performers?.size || 0);
                        return (
                          <tr key={regName} className="border-b border-black/20 text-black/70">
                            <td className="p-1 border-r border-black/20"></td>
                            <td className="p-1 border-r border-black/20 text-left italic pl-4">{regName}</td>
                            <td className="p-1 border-r border-black/20">{worksCount}</td>
                            <td className="p-1 border-r border-black/20">{pct(worksCount, totalWorksForeign)}</td>
                            <td className="p-1 border-r border-black/20">{authorCount}</td>
                            <td className="p-1 border-r border-black/20">{pct(authorCount, foreignAuthorsCount)}</td>
                            <td className="p-1 border-r border-black/20">{performerCount}</td>
                            <td className="p-1">{pct(performerCount, foreignPerformersCount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Rankings Sections */}
                <div className="grid grid-cols-1 gap-6">
                  
                  {/* Top Songs */}
                  <div className="space-y-2 flex flex-col items-stretch">
                    <h4 className="font-bold italic text-left">Obras musicales más difundidas</h4>
                    <table className="w-full border-collapse border border-black/30 text-left">
                      <thead>
                        <tr className="border-b border-black/30 bg-black/5 font-bold text-center">
                          <th className="p-1 border-r border-black/30 w-6">No</th>
                          <th className="p-1 border-r border-black/30 text-left pl-2">Título</th>
                          <th className="p-1 border-r border-black/30 text-left pl-2">Intérprete</th>
                          <th className="p-1 border-r border-black/30 w-16">Nac</th>
                          <th className="p-1 border-r border-black/30 text-left pl-2">Autor</th>
                          <th className="p-1 border-r border-black/30 w-16">Nac</th>
                          <th className="p-1 text-center w-10">Frec.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSongs.length === 0 ? (
                          <tr><td colSpan={7} className="p-2 text-center text-gray-400">Sin datos de temas en este mes</td></tr>
                        ) : topSongs.map((item, idx) => {
                          const track = item.track || {};
                          const nacPerf = isCuban(track.performerCountry) || (!track.performerCountry && !track.authorCountry) ? "CUBA" : (track.performerCountry?.toUpperCase() || '-');
                          const nacAuth = isCuban(track.authorCountry) || (!track.authorCountry && !track.performerCountry) ? "CUBA" : (track.authorCountry?.toUpperCase() || '-');
                          return (
                            <tr key={idx} className="border-b border-[gray]/20">
                              <td className="p-1 border-r border-[gray]/20 text-center">{idx + 1}</td>
                              <td className="p-1 border-r border-[gray]/20 pl-2 font-semibold">{track.title?.toUpperCase() || ''}</td>
                              <td className="p-1 border-r border-[gray]/20 pl-2">{track.performer?.toUpperCase() || ''}</td>
                              <td className="p-1 border-r border-[gray]/20 text-center text-[10px]">{nacPerf}</td>
                              <td className="p-1 border-r border-[gray]/20 pl-2">{track.author?.toUpperCase() || ''}</td>
                              <td className="p-1 border-r border-[gray]/20 text-center text-[10px]">{nacAuth}</td>
                              <td className="p-1 font-bold text-center">{item.count}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Authors */}
                  <div className="space-y-2 flex flex-col items-stretch">
                    <h4 className="font-bold italic text-left">Autores más difundidos</h4>
                    <table className="w-full border-collapse border border-black/30 text-left text-center">
                      <thead>
                        <tr className="border-b border-black/30 bg-black/5 font-bold">
                          <th className="p-1 border-r border-black/30 text-center w-6">No</th>
                          <th className="p-1 border-r border-black/30 text-left pl-2">Autores</th>
                          <th className="p-1 border-r border-black/30 text-center">Nac</th>
                          <th className="p-1 border-r border-black/30 text-center w-16">Cant.</th>
                          <th className="p-1 text-center w-16">Frec.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topAuthors.length === 0 ? (
                          <tr><td colSpan={5} className="p-2 text-center text-gray-400">Sin datos de autores en este mes</td></tr>
                        ) : topAuthors.map((item, idx) => (
                          <tr key={idx} className="border-b border-[gray]/20 text-left">
                            <td className="p-1 border-r border-[gray]/20 text-center">{idx + 1}</td>
                            <td className="p-1 border-r border-[gray]/20 pl-2 font-semibold">{item.name.toUpperCase()}</td>
                            <td className="p-1 border-r border-[gray]/20 text-center">{item.nac}</td>
                            <td className="p-1 border-r border-[gray]/20 text-center">{item.songs?.size || 0}</td>
                            <td className="p-1 font-bold text-center">{item.execs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Performers */}
                  <div className="space-y-2 flex flex-col items-stretch">
                    <h4 className="font-bold italic text-left">Intérpretes más difundidos</h4>
                    <table className="w-full border-collapse border border-black/30 text-left text-center">
                      <thead>
                        <tr className="border-b border-black/30 bg-black/5 font-bold">
                          <th className="p-1 border-r border-black/30 text-center w-6">No</th>
                          <th className="p-1 border-r border-black/30 text-left pl-2">Intérpretes</th>
                          <th className="p-1 border-r border-black/30 text-center">Nac</th>
                          <th className="p-1 border-r border-black/30 text-center w-16">Cant.</th>
                          <th className="p-1 text-center w-16">Frec.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPerformers.length === 0 ? (
                          <tr><td colSpan={5} className="p-2 text-center text-gray-400">Sin datos de intérpretes en este mes</td></tr>
                        ) : topPerformers.map((item, idx) => (
                          <tr key={idx} className="border-b border-[gray]/20 text-left">
                            <td className="p-1 border-r border-[gray]/20 text-center">{idx + 1}</td>
                            <td className="p-1 border-r border-[gray]/20 pl-2 font-semibold">{item.name.toUpperCase()}</td>
                            <td className="p-1 border-r border-[gray]/20 text-center">{item.nac}</td>
                            <td className="p-1 border-r border-[gray]/20 text-center">{item.songs?.size || 0}</td>
                            <td className="p-1 font-bold text-center">{item.execs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Genres */}
                  <div className="space-y-2 flex flex-col items-stretch">
                    <h4 className="font-bold italic text-left">Géneros musicales más difundidos</h4>
                    <table className="w-full border-collapse border border-black/30 text-left text-center">
                      <thead>
                        <tr className="border-b border-black/30 bg-black/5 font-bold">
                          <th className="p-1 border-r border-black/30 text-center w-6">No</th>
                          <th className="p-1 border-r border-black/30 text-left pl-2">Géneros</th>
                          <th className="p-1 border-r border-black/30 text-center w-16">Nac</th>
                          <th className="p-1 border-r border-black/30 text-center w-16">Cant.</th>
                          <th className="p-1 text-center w-16">Frec.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topGenres.length === 0 ? (
                          <tr><td colSpan={5} className="p-2 text-center text-gray-400">Sin géneros detectados</td></tr>
                        ) : topGenres.map((item, idx) => (
                          <tr key={idx} className="border-b border-[gray]/20 text-left">
                            <td className="p-1 border-r border-[gray]/20 text-center">{idx + 1}</td>
                            <td className="p-1 border-r border-[gray]/20 pl-2 font-semibold">{item.name}</td>
                            <td className="p-1 border-r border-[gray]/20 text-center">0</td>
                            <td className="p-1 border-r border-[gray]/20 text-center">{item.execs}</td>
                            <td className="p-1 font-bold text-center">{item.frec}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Dynamic Signatures bottom preview */}
                <div className="pt-10 flex justify-between items-center px-4 font-bold">
                  <div className="text-center flex flex-col items-center">
                    <p className="border-t border-black w-48 mb-1"></p>
                    <p>Coordinador musical: <span className="underline">{coordinadorMusical}</span></p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <p className="border-t border-black w-48 mb-1"></p>
                    <p>J' Programación: <span className="underline">{jefeProgramacion}</span></p>
                  </div>
                </div>

              </div>

              {/* Action button bar */}
              <div className="flex justify-end gap-3 pr-4">
                <button
                  type="button"
                  onClick={handleArchivar}
                  className="bg-[#2C1B15] border border-[#9E7649]/40 hover:bg-[#3E1A0F] text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 text-[12px] shadow-lg"
                >
                  <Folder size={18} /> Mandar a Archivo
                </button>
                <button 
                  type="button"
                  onClick={handleGenerateDOCX_Music}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 text-[12px] shadow-lg"
                  id="download-monthly-docx-btn"
                >
                  <FileDown size={18} /> Descargar DOCX de Música Mensual
                </button>
              </div>

            </div>
          )}

          {/* REPORT VIEW: ECONOMY */}
          {activeReportType === 'economia' && (
            <div className="space-y-4">
              
              {/* Variable control fields */}
              <div className="grid grid-cols-2 gap-4 bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20">
                <div>
                  <label className="block text-xs font-bold text-[#E8DCCF]/60 uppercase mb-1">Costo Derechos por Obra ($ CUP)</label>
                  <input 
                    type="number" 
                    value={costoPorObra} 
                    onChange={e => setCostoPorObra(Math.max(0, parseInt(e.target.value) || 0))} 
                    className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white text-xs outline-none focus:border-[#9E7649]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#E8DCCF]/60 uppercase mb-1">Monto Fijo Base por Programa ($ CUP)</label>
                  <input 
                    type="number" 
                    value={montoFijoBase} 
                    onChange={e => setMontoFijoBase(Math.max(0, parseInt(e.target.value) || 0))} 
                    className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white text-xs outline-none focus:border-[#9E7649]"
                  />
                </div>
              </div>

              <div className="bg-[#FBF8F5] text-black p-8 rounded-xl border border-black/10 shadow-lg font-sans mx-auto max-w-4xl space-y-6 overflow-x-auto text-[12px]">
                <div className="text-center space-y-1 mb-8">
                  <h3 className="font-bold text-[14px] tracking-wide">RADIO CIUDAD MONUMENTO</h3>
                  <h3 className="font-bold text-[14px] underline tracking-wider mt-4">INFORME DE MÚSICA</h3>
                  <div className="text-right font-bold text-[12px] mt-4">
                    {activePeriod === 'mensual' ? 'MES:' : 'PERÍODO:'} {getPeriodName(selectedMonthNum, selectedYear, activePeriod)}
                  </div>
                </div>

                <table className="w-full border-collapse border border-black/80 text-center text-[12px]">
                  <thead>
                    <tr className="bg-black/10 font-bold border-b border-black/80">
                      <th className="p-3 border-r border-black/80 w-1/4"></th>
                      <th className="p-3 border-r border-black/80 w-1/4">CUBANA</th>
                      <th className="p-3 border-r border-black/80 w-1/4">EXTRANJERA</th>
                      <th className="p-3 w-1/4">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/80">
                      <td className="p-3 border-r border-black/80 font-bold text-left bg-black/5">OBRAS COMPLETAS</td>
                      <td className="p-3 border-r border-black/80 font-semibold">{activePeriodStats.economia.completasCubana}</td>
                      <td className="p-3 border-r border-black/80 font-semibold">{activePeriodStats.economia.completasExtranjera}</td>
                      <td className="p-3 font-bold bg-black/5">{activePeriodStats.economia.completasTotal}</td>
                    </tr>
                    <tr className="border-b border-black/80">
                      <td className="p-3 border-r border-black/80 font-bold text-left bg-black/5">MUSICA INCIDENTAL</td>
                      <td className="p-3 border-r border-black/80 font-semibold">{activePeriodStats.economia.incidentalesCubana}</td>
                      <td className="p-3 border-r border-black/80 font-semibold">{activePeriodStats.economia.incidentalesExtranjera}</td>
                      <td className="p-3 font-bold bg-black/5">{activePeriodStats.economia.incidentalesTotal}</td>
                    </tr>
                    <tr className="border-b border-black/80">
                      <td className="p-3 border-r border-black/80 font-bold text-left bg-black/5">MUSICA INSTRUMENTAL</td>
                      <td className="p-3 border-r border-black/80 font-semibold">{activePeriodStats.economia.instrumentalesCubana}</td>
                      <td className="p-3 border-r border-black/80 font-semibold">{activePeriodStats.economia.instrumentalesExtranjera}</td>
                      <td className="p-3 font-bold bg-black/5">{activePeriodStats.economia.instrumentalesTotal}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="grid grid-cols-2 mt-20 pt-10 text-center uppercase text-[11px] font-bold">
                  <div>
                    <div className="border-b border-black/80 w-48 mx-auto mb-2 relative">
                      <div className="absolute -top-6 w-full text-center italic text-black/60 capitalize font-normal">Firma</div>
                    </div>
                    {coordinadorMusical || 'Pedro José Reyes'}
                    <div className="text-[9px] mt-1 font-normal opacity-70">Coordinador Musical</div>
                  </div>
                  <div>
                    <div className="border-b border-black/80 w-48 mx-auto mb-2 relative">
                      <div className="absolute -top-6 w-full text-center italic text-black/60 capitalize font-normal">Firma</div>
                    </div>
                    {jefeProgramacion || 'Beatriz González'}
                    <div className="text-[9px] mt-1 font-normal opacity-70">Jefe de Programación</div>
                  </div>
                </div>
              </div>

              {/* Action button bar */}
              <div className="flex justify-end gap-3 pr-4 font-bold">
                <button
                  type="button"
                  onClick={handleArchivar}
                  className="bg-[#2C1B15] border border-[#9E7649]/40 hover:bg-[#3E1A0F] text-white py-3 px-6 rounded-xl transition-colors flex items-center gap-2 text-[12px] shadow-lg"
                >
                  <Folder size={18} /> Mandar a Archivo
                </button>
                <button 
                  type="button"
                  onClick={handleGenerateDOCX_Economy}
                  className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl transition-colors flex items-center gap-2 text-[12px] shadow-lg"
                  id="download-economy-docx-btn"
                >
                  <FileDown size={18} /> Descargar Informe de Economía (.txt)
                </button>
              </div>

            </div>
          )}

          {/* REPORT VIEW: INCIDENTAL MUSIC */}
          {activeReportType === 'incidental' && (
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                
                {/* COLUMN 1: INTERACTIVE CATALOGUE EDITOR */}
                <div className="lg:col-span-5 bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-[#9E7649]/20 pb-2">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <Layers size={14} className="text-[#9E7649]" /> Catálogo de Música Incidental
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => setIncidentalWorks(DEFAULT_INCIDENTAL_WORKS)}
                      className="text-[#9E7649] hover:text-[#E8DCCF] flex items-center gap-1.5 text-[10px] uppercase font-bold transition-all hover:scale-105"
                      title="Restablecer el listado de 41 obras representativo"
                    >
                      <RotateCcw size={11} /> Reestablecer catalogo
                    </button>
                  </div>

                  <p className="text-[11px] text-[#E8DCCF]/70 leading-relaxed -mt-1.5">
                    El informe se calcula según las reproducciones de las obras en el catálogo de acuerdo a su frecuencia asignada. Sube un archivo <code className="bg-black/40 px-1 rounded text-amber-500 font-mono">.txt</code>, pega un texto o edita la lista abajo.
                  </p>

                  {/* Upload and Paste Toggles */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex flex-col items-center justify-center border border-[#9E7649]/30 rounded-lg p-2 hover:bg-[#9E7649]/10 cursor-pointer text-[#E8DCCF] transition-all gap-1 text-center py-2.5">
                      <Upload size={14} className="text-[#9E7649]" />
                      <span className="text-[10px] font-bold">Cargar Catálogo TXT</span>
                      <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <button 
                      type="button"
                      onClick={() => setShowPasteArea(!showPasteArea)}
                      className={`flex flex-col items-center justify-center border border-[#9E7649]/30 rounded-lg p-2 hover:bg-[#9E7649]/10 text-center gap-1 py-2.5 transition-all ${showPasteArea ? 'bg-[#9E7649]/20 border-[#9E7649]' : ''}`}
                    >
                      <FileText size={14} className="text-[#9E7649]" />
                      <span className="text-[10px] font-bold">{showPasteArea ? 'Ocultar Area Pegado' : 'Pegar de Portapapeles'}</span>
                    </button>
                  </div>

                  {/* Paste raw area */}
                  {showPasteArea && (
                    <div className="space-y-2 animate-fade-in bg-black/30 p-3 rounded-lg border border-[#9E7649]/10">
                      <p className="text-[10px] text-[#E8DCCF]/50">Pega los bloques en formato txt libre (detectará Título, Autor, Frecuencia y Nac automáticamente):</p>
                      <textarea
                        value={rawTextPaste}
                        onChange={e => setRawTextPaste(e.target.value)}
                        placeholder="Obra #1&#10;Título: La Bayamesa&#10;Autor: Céspedes y Fornaris&#10;Frecuencia: Lunes, Miércoles, Viernes&#10;Nac: Cuba"
                        className="w-full h-24 bg-[#100A08] border border-[#9E7649]/20 rounded p-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#9E7649]/50"
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => { handleParseIncidentalsText(rawTextPaste); setShowPasteArea(false); setRawTextPaste(''); }}
                          className="bg-[#9E7649] text-white px-2.5 py-1 rounded text-[10px] font-bold hover:bg-[#b08554] transition-colors"
                        >
                          Procesar Texto
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add Individual Row Form */}
                  <div className="bg-[#1A100C]/70 p-3 rounded-xl border border-[#9E7649]/10 space-y-2">
                    <p className="text-[10px] font-bold text-[#9E7649] uppercase">Agregar Obra Manualmente</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input 
                        type="text" 
                        placeholder="Título de la obra" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)} 
                        className="bg-[#100A08] border border-[#9E7649]/20 rounded px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Autor" 
                        value={newAuthor} 
                        onChange={e => setNewAuthor(e.target.value)} 
                        className="bg-[#100A08] border border-[#9E7649]/20 rounded px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input 
                        type="text" 
                        placeholder="Nac o País (un Cuba)" 
                        value={newNac} 
                        onChange={e => setNewNac(e.target.value)} 
                        className="bg-[#100A08] border border-[#9E7649]/20 rounded px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none"
                      />
                      <select 
                        value={newFrequency}
                        onChange={e => setNewFrequency(e.target.value)}
                        className="bg-[#100A08] border border-[#9E7649]/20 rounded px-2 py-1.5 text-white focus:outline-none"
                      >
                        <option value="Diario">Diario</option>
                        <option value="Lunes a Viernes">Lunes a Viernes</option>
                        <option value="Lunes, Miércoles, Viernes">Lunes, Miércoles, Viernes</option>
                        <option value="Sábado, Domingo">Sábado, Domingo</option>
                        <option value="Sábado">Sábado</option>
                        <option value="Domingo">Domingo</option>
                      </select>
                    </div>
                    <button 
                      type="button" 
                      onClick={addWorkDirect}
                      className="w-full bg-[#9E7649] hover:bg-[#85603a] text-white py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wide flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> Agregar al Catálogo
                    </button>
                  </div>

                  {/* Scrollable Catalog Dashboard list */}
                  <div className="flex-1 flex flex-col min-h-[180px] max-h-[300px] border border-[#9E7649]/10 rounded-xl overflow-hidden bg-[#100A08]">
                    <div className="bg-[#1A100C] p-2 border-b border-[#9E7649]/10 text-[10px] font-bold flex justify-between uppercase">
                      <span>Catálogo de Obras ({incidentalWorks.length})</span>
                      <span className="text-[#9E7649]">Edición Interactiva</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-left text-[11px] text-[#E8DCCF]/80">
                        <thead className="bg-[#1A100C]/50 text-[9px] uppercase text-[#E8DCCF]/40 border-b border-[#9E7649]/5 sticky top-0 z-10 backdrop-blur-sm">
                          <tr>
                            <th className="p-2">Obra</th>
                            <th className="p-2">Autor</th>
                            <th className="p-2 text-center w-14">Nac</th>
                            <th className="p-2 w-24">Frecuencia</th>
                            <th className="p-2 text-center w-14">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incidentalWorks.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center italic text-[#E8DCCF]/30">Catalogo Vacío. Haz click en "Reestablecer catálogo" para rellenarlo.</td>
                            </tr>
                          ) : (
                            incidentalWorks.map(w => {
                              const isEditing = editingWorkId === w.id;
                              return (
                                <tr key={w.id} className="border-b border-[#9E7649]/5 hover:bg-[#2C1B15]/40 transition-colors">
                                  {isEditing ? (
                                    <>
                                      <td className="p-1">
                                        <input 
                                          value={editTitle} 
                                          onChange={e => setEditTitle(e.target.value)} 
                                          className="w-full bg-black border border-[#9E7649]/30 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none" 
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input 
                                          value={editAuthor} 
                                          onChange={e => setEditAuthor(e.target.value)} 
                                          className="w-full bg-black border border-[#9E7649]/30 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none" 
                                        />
                                      </td>
                                      <td className="p-1 text-center">
                                        <input 
                                          value={editNac} 
                                          onChange={e => setEditNac(e.target.value)} 
                                          className="w-full bg-black border border-[#9E7649]/30 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none text-center" 
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input 
                                          value={editFrequency} 
                                          onChange={e => setEditFrequency(e.target.value)} 
                                          className="w-full bg-black border border-[#9E7649]/30 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none" 
                                        />
                                      </td>
                                      <td className="p-1 flex items-center justify-center gap-1">
                                        <button onClick={saveEditingWork} className="text-green-400 hover:text-white p-0.5" title="Guardar"><Check size={14} /></button>
                                        <button onClick={() => setEditingWorkId(null)} className="text-gray-400 hover:text-white p-0.5" title="Cancelar"><X size={14} /></button>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="p-2 font-semibold text-white truncate max-w-[90px]" title={w.title}>{w.title}</td>
                                      <td className="p-2 text-[#E8DCCF]/70 truncate max-w-[80px]" title={w.author}>{w.author}</td>
                                      <td className="p-2 text-center">{w.nac}</td>
                                      <td className="p-2 text-amber-500 font-mono text-[10px]">{w.frequency}</td>
                                      <td className="p-2 text-center flex items-center justify-center gap-1.5">
                                        <button onClick={() => startEditingWork(w)} className="text-[#9E7649] hover:text-white" title="Editar"><Edit size={12} /></button>
                                        <button onClick={() => deleteWork(w.id)} className="text-red-400 hover:text-red-300" title="Eliminar"><Trash2 size={12} /></button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* COLUMN 2: HIGH-FIDELITY PRINT PREVIEW SHEET */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="bg-black/20 p-2.5 rounded-xl border border-[#9E7649]/10 text-[10px] font-bold text-center text-[#E8DCCF]/60 flex items-center justify-between px-4 uppercase tracking-wider">
                    <span>Vista Impresa (Pre-visualización de DOCX)</span>
                    <span className="text-amber-500 font-bold bg-[#9E7649]/20 px-2 py-0.5 rounded">Alineación Física</span>
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    {/* Paper Container matching exact layout form photo */}
                    <div className="bg-[#FBF8F5] text-black p-8 rounded-xl border border-black/10 shadow-lg font-sans mx-auto max-w-4xl space-y-6 text-[12px] select-none">
                      
                      <div className="text-center space-y-1">
                        <h3 className="font-bold text-[14px] tracking-wide text-gray-900 border-b border-black pb-0.5 inline-block">DEPARTAMENTO DE MÚSICA</h3>
                        <h3 className="font-bold text-[14px] tracking-wider uppercase text-gray-800">Estadísticas de la música incidental</h3>
                      </div>

                      {/* Header Emisora Data */}
                      <table className="w-full border-collapse border border-black/30 font-bold">
                        <tbody>
                          <tr className="border-b border-black/30 bg-black/[0.02]">
                            <td className="p-2 border-r border-black/30 w-[55%] text-[10px]">Nombre de la Emisora: RADIO CIUDAD MONUMENTO.</td>
                            <td className="p-2 text-[10px]">Emisora Internacional:___ Nacional:___ Provincial:___ Municipal: _X_</td>
                          </tr>
                          <tr className="bg-black/[0.02]">
                            <td className="p-2 border-r border-black/30 text-[10px]">Fecha: {getPeriodName(selectedMonthNum, selectedYear, activePeriod)}</td>
                            <td className="p-2 text-[10px]">Frecuencia: Mensual {activePeriod === 'mensual' ? '_X_' : '___'} Trimestral: {activePeriod === 'trimestral' ? '_X_' : '___'} Semestral: {activePeriod === 'semestral' ? '_X_' : '___'} Anual: {activePeriod === 'anual' ? '_X_' : '___'}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="space-y-2">
                        <h4 className="font-bold uppercase text-center border-y border-black py-2.5 tracking-wider text-xs bg-black/[0.03] text-gray-950">
                          OBRAS, AUTORES E INTÉRPRETES POR ZONAS GEOGRÁFICAS
                        </h4>
                        
                        <table className="w-full border-collapse border border-black/30 text-center font-sans text-[10px]">
                          <thead>
                            <tr className="border-b border-black/30 bg-black/5 font-bold text-gray-900 text-[10.5px]">
                              <th className="p-2 border-r border-black/30 w-10">No</th>
                              <th className="p-2 border-r border-black/30 text-left pl-3">Zonas</th>
                              <th className="p-2 border-r border-black/30 w-28">Cant. Obras</th>
                              <th className="p-2 border-r border-black/30 w-16">%</th>
                              <th className="p-2 border-r border-black/30 w-28">Cant. Autores</th>
                              <th className="p-2 border-black/30 w-16">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Cuba row */}
                            <tr className="border-b border-black/30 hover:bg-black/[0.01]">
                              <td className="p-2 border-r border-black/30 font-bold">1</td>
                              <td className="p-2 border-r border-black/30 text-left font-bold pl-3">CUBA</td>
                              <td className="p-2 border-r border-black/30 font-semibold">{currentIncidentalStats.cubaWorksCount}</td>
                              <td className="p-2 border-r border-black/30 font-mono font-medium">{currentIncidentalStats.cubaPct}</td>
                              <td className="p-2 border-r border-black/30 font-semibold">{currentIncidentalStats.cubaAuthors}</td>
                              <td className="p-1.5 font-mono font-medium">{currentIncidentalStats.cubaAuthorsPct}</td>
                            </tr>
                            
                            {/* Foreign row */}
                            <tr className="border-b border-black/30 hover:bg-black/[0.01]">
                              <td className="p-2 border-r border-black/30 font-bold">2</td>
                              <td className="p-2 border-r border-black/30 text-left font-bold pl-3">Extranjera</td>
                              <td className="p-2 border-r border-black/30 font-semibold">{currentIncidentalStats.foreignWorksCount}</td>
                              <td className="p-2 border-r border-black/30 font-mono font-medium">{currentIncidentalStats.foreignPct}</td>
                              <td className="p-2 border-r border-black/30 font-semibold">{currentIncidentalStats.foreignAuthors}</td>
                              <td className="p-1.5 font-mono font-medium">{currentIncidentalStats.foreignAuthorsPct}</td>
                            </tr>

                            {/* Total general row */}
                            <tr className="border-b border-black/30 font-bold bg-black/5 text-gray-950 text-[10.5px]">
                              <td className="p-2 border-r border-black/30"></td>
                              <td className="p-2 border-r border-black/30 text-left pl-3">TOTAL GENERAL</td>
                              <td className="p-2 border-r border-black/30 text-center">{currentIncidentalStats.totalWorks}</td>
                              <td className="p-2 border-r border-black/30 font-mono text-center">100</td>
                              <td className="p-2 border-r border-black/30 text-center">{currentIncidentalStats.totalAuthors}</td>
                              <td className="p-1.5 font-mono text-center">100</td>
                            </tr>

                            {/* Regions subcategories (Indented & Italic) */}
                            <tr className="border-b border-black/20 text-gray-700 italic">
                              <td className="p-1.5 border-r border-black/20 text-center">1</td>
                              <td className="p-1.5 border-r border-black/20 text-left pl-6">Latinoamérica y el Caribe</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.latam.works}</td>
                              <td className="p-1.5 border-r border-black/20 font-mono">{currentIncidentalStats.regions.latam.pct}</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.latam.authors}</td>
                              <td className="p-1 font-mono">{currentIncidentalStats.regions.latam.authorsPct}</td>
                            </tr>
                            <tr className="border-b border-black/20 text-gray-700 italic">
                              <td className="p-1.5 border-r border-black/20 text-center">2</td>
                              <td className="p-1.5 border-r border-black/20 text-left pl-6">Norteamérica</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.norte.works}</td>
                              <td className="p-1.5 border-r border-black/20 font-mono">{currentIncidentalStats.regions.norte.pct}</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.norte.authors}</td>
                              <td className="p-1 font-mono">{currentIncidentalStats.regions.norte.authorsPct}</td>
                            </tr>
                            <tr className="border-b border-black/20 text-gray-700 italic">
                              <td className="p-1.5 border-r border-black/20 text-center">3</td>
                              <td className="p-1.5 border-r border-black/20 text-left pl-6">Europa</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.europa.works}</td>
                              <td className="p-1.5 border-r border-black/20 font-mono">{currentIncidentalStats.regions.europa.pct}</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.europa.authors}</td>
                              <td className="p-1 font-mono">{currentIncidentalStats.regions.europa.authorsPct}</td>
                            </tr>
                            <tr className="border-b border-black/20 text-gray-700 italic">
                              <td className="p-1.5 border-r border-black/20 text-center">6</td>
                              <td className="p-1.5 border-r border-black/20 text-left pl-6">Otras Zonas</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.otras.works}</td>
                              <td className="p-1.5 border-r border-black/20 font-mono">{currentIncidentalStats.regions.otras.pct}</td>
                              <td className="p-1.5 border-r border-black/20">{currentIncidentalStats.regions.otras.authors}</td>
                              <td className="p-1 font-mono">{currentIncidentalStats.regions.otras.authorsPct}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Signatures Row */}
                      <div className="pt-10 flex justify-between items-center px-4 font-bold text-[10px] text-gray-900 font-sans">
                        <div className="text-center flex flex-col items-center">
                          <p className="border-t border-black w-40 mb-1"></p>
                          <p>Confeccionado por: <span className="underline">{coordinadorMusical}</span></p>
                        </div>
                        <div className="text-center flex flex-col items-center">
                          <p className="border-t border-black w-40 mb-1"></p>
                          <p>Aprobado por: <span className="underline">{jefeProgramacion}</span></p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>

              {/* Action button bar */}
              <div className="flex flex-col sm:flex-row justify-end px-4 text-[12px] font-bold gap-3 pt-4 sm:pt-2">
                <button
                  type="button"
                  onClick={handleArchivar}
                  className="w-full sm:w-auto bg-[#2C1B15] border border-[#9E7649]/40 hover:bg-[#3E1A0F] text-white py-3 px-6 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <Folder size={18} /> Mandar a Archivo
                </button>
                <button 
                  type="button"
                  onClick={handleGenerateDOCX_Incidental}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-lg"
                  id="download-incidental-docx-btn"
                >
                  <FileDown size={18} /> Descargar (.txt)
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-[#9E7649]/30 bg-[#2C1B15] flex justify-end gap-3 text-xs font-bold">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-[#9E7649]/30 text-[#E8DCCF] hover:bg-white/5 transition-colors"
          >
            Cerrar
          </button>
        </div>

        {/* ARCHIVE MANAGER OVERLAY */}
        {showArchiveManager && (
          <div className="absolute inset-0 bg-[#1A100C]/95 z-50 flex flex-col pt-4 animate-fade-in backdrop-blur-md">
            <div className="flex justify-between items-center p-5 border-b border-[#9E7649]/30 bg-[#2C1B15]">
              <h3 className="text-white font-bold uppercase tracking-wider flex items-center gap-3">
                <Folder className="text-[#9E7649]" size={24} />
                <span className="text-[#E8DCCF]">
                  Gestión de Archivo Local - Informe {archiveManagerType.toUpperCase()}
                </span>
              </h3>
              <button 
                onClick={() => setShowArchiveManager(false)}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto space-y-6">
               <div className="bg-[#2C1B15] p-6 rounded-xl border border-[#9E7649]/30 shadow-lg">
                 <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                   <Upload size={16} className="text-[#9E7649]" /> Carga Masiva Automática (.txt)
                 </h4>
                 <p className="text-xs text-[#E8DCCF]/60 mb-5">
                   Sube uno o varios archivos .txt. El sistema detectará automáticamente el mes, el año y el tipo de informe.
                 </p>
                 
                 <div className="flex flex-wrap gap-4 items-center p-4 bg-[#1A100C] rounded-lg border border-[#9E7649]/10">
                   <label className="w-full bg-[#9E7649]/20 hover:bg-[#9E7649]/40 border border-[#9E7649]/50 transition-colors cursor-pointer rounded-lg p-5 flex flex-col items-center justify-center gap-3 text-white font-bold text-sm">
                     <div className="bg-[#9E7649]/40 p-4 rounded-full">
                       <Upload size={32} />
                     </div>
                     <span>Arrastra o selecciona múltiples informes .txt</span>
                     <span className="text-[10px] opacity-60 font-normal">Soporta Mensual, Economía e Incidental</span>
                     <input 
                       type="file" 
                       accept=".txt"
                       multiple
                       className="hidden"
                       onChange={e => {
                         if (e.target.files && e.target.files.length > 0) {
                           handleBulkUploadFiles(e.target.files);
                         }
                       }}
                     />
                   </label>
                 </div>
               </div>

               <div className="bg-[#2C1B15] p-6 rounded-xl border border-[#9E7649]/30 shadow-lg">
                 <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Historial de Meses Archivados</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {/* We compute the archived files for the current type */}
                   {Object.keys(
                     archiveManagerType === 'mensual' ? archiveMensual : 
                     archiveManagerType === 'economia' ? archiveEconomia : archiveIncidental
                   ).length === 0 ? (
                     <div className="col-span-full py-8 text-center flex flex-col items-center justify-center gap-2 text-[#E8DCCF]/30 italic">
                        <FileQuestion size={32} />
                        <span className="text-sm">No existen sumatorias guardadas en el archivo interno para esta categoría.</span>
                     </div>
                   ) : (
                     Object.keys(
                       archiveManagerType === 'mensual' ? archiveMensual : 
                       archiveManagerType === 'economia' ? archiveEconomia : archiveIncidental
                     ).sort().reverse().map(mStr => (
                       <div key={mStr} className="bg-[#1A100C] p-4 text-center rounded-lg border border-green-500/30 flex flex-col items-center gap-2 hover:bg-[#9E7649]/10 transition-colors relative group">
                         <div className="bg-green-500/20 p-2 rounded-full"><CheckCircle2 size={24} className="text-green-400" /></div>
                         <span className="text-white font-bold tracking-wide mt-2">{mStr}</span>
                         <span className="text-[10px] text-green-400 mb-2">Datos Listos</span>
                         
                         <div className="flex flex-col gap-2 w-full mt-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if(onMonthChange) onMonthChange(mStr);
                                setActivePeriod("mensual");
                                setActiveReportType(archiveManagerType);
                                setShowArchiveManager(false);
                              }}
                              className="bg-[#2C1B15] border border-[#9E7649]/30 hover:bg-[#3E1A0F] text-white text-[10px] px-3 py-1.5 rounded-lg flex justify-center items-center gap-1 font-bold w-full transition-all active:scale-95"
                            >
                              <FileDown size={12} /> Ver / Descargar
                            </button>
                            
                            {deletingMonth === mStr ? (
                              <div className="flex gap-1 w-full animate-pulse-slow">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteFromArchive(archiveManagerType, mStr);
                                    setDeletingMonth(null);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white text-[9px] py-1.5 rounded flex-1 font-bold"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingMonth(null);
                                  }}
                                  className="bg-gray-600 hover:bg-gray-700 text-white text-[9px] py-1.5 rounded flex-1 font-bold"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                   e.stopPropagation();
                                   setDeletingMonth(mStr);
                                }}
                                className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/30 text-red-300 text-[10px] px-3 py-1.5 rounded-lg flex justify-center items-center gap-1 font-bold w-full transition-all active:scale-95"
                              >
                                <Trash2 size={12} /> Eliminar
                              </button>
                            )}
                         </div>
                       </div>
                     ))
                   )}
                  </div>
                </div>
             </div>
           </div>
         )}

      </div>
    </div>
  );
};