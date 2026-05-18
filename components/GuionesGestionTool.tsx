import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, 
  BarChart3, 
  DollarSign, 
  Calendar, 
  Search, 
  Download, 
  Settings, 
  Trash2, 
  Edit2, 
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Script, ProgramFicha, User as UserProfile } from '../types';
import { Program } from './agenda/types';
import { parseSpanishDate, formatSpanishDate, PROGRAMS } from './GuionesApp';
import { getWeeksInMonth } from './agenda/utils/dateUtils';

interface GuionesGestionToolProps {
  onBack: () => void;
  isAdmin: boolean;
  currentUser: UserProfile;
}

interface PaymentRate {
  programName: string;
  rate: number;
}

const GuionesGestionTool: React.FC<GuionesGestionToolProps> = ({ onBack, isAdmin, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C'>('A');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showConfig, setShowConfig] = useState(false);
  const [allScripts, setAllScripts] = useState<Record<string, Script[]>>({});
  const [agendaThemes, setAgendaThemes] = useState<any>({});
  const [agendaPrograms, setAgendaPrograms] = useState<any[]>([]);
  const [fichas, setFichas] = useState<ProgramFicha[]>([]);
  const [paymentRates, setPaymentRates] = useState<PaymentRate[]>([]);
  const [selectedProgramBatch, setSelectedProgramBatch] = useState('');
  const [batchPrice, setBatchPrice] = useState(0);
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({}); // Manual individual overrides
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [filterWriter, setFilterWriter] = useState('');
  const [filterCompareProgram, setFilterCompareProgram] = useState('');
  const [filterCompareBalance, setFilterCompareBalance] = useState<'all' | 'Positivo' | 'Negativo'>('all');
  const [validatedScripts, setValidatedScripts] = useState<Record<string, boolean>>({});
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [editingManualValue, setEditingManualValue] = useState('');

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const COLORS = ['#9E7649', '#E8DCCF', '#6B4F31', '#1A100C', '#4A3728'];

  useEffect(() => {
    // Load Scripts
    const scripts: Record<string, Script[]> = {};
    PROGRAMS.forEach(p => {
      const data = localStorage.getItem(`guionbd_data_${p.file}`);
      if (data) scripts[p.name] = JSON.parse(data);
    });
    setAllScripts(scripts);

    // Load Agenda Themes
    const themes = localStorage.getItem('rcm_day_themes');
    if (themes) setAgendaThemes(JSON.parse(themes));

    const programs = localStorage.getItem('rcm_programs');
    if (programs) setAgendaPrograms(JSON.parse(programs));

    // Load Fichas
    const fichasData = localStorage.getItem('rcm_data_fichas');
    if (fichasData) setFichas(JSON.parse(fichasData));
    else {
      const legacyFichas = localStorage.getItem('rcm_fichas_programas');
      if (legacyFichas) setFichas(JSON.parse(legacyFichas));
    }

    // Load Rates
    const savedRates = localStorage.getItem('cmnl_payment_rates');
    if (savedRates) setPaymentRates(JSON.parse(savedRates));

    const savedManualPrices = localStorage.getItem('cmnl_manual_prices');
    if (savedManualPrices) setManualPrices(JSON.parse(savedManualPrices));

    const savedValidation = localStorage.getItem('cmnl_validated_scripts');
    if (savedValidation) setValidatedScripts(JSON.parse(savedValidation));
  }, []);

  const saveManualPrices = (prices: Record<string, number>) => {
    setManualPrices(prices);
    localStorage.setItem('cmnl_manual_prices', JSON.stringify(prices));
  };

  const toggleValidation = (id: string, validated: boolean) => {
    const newVal = { ...validatedScripts, [id]: validated };
    setValidatedScripts(newVal);
    localStorage.setItem('cmnl_validated_scripts', JSON.stringify(newVal));
  };


  const normalizeProgramName = (name: string) => {
    if (!name) return "";
    return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9]/g, ""); // strip space mostly to exactly match formats
  };

  const normalizeWriterName = (name: string) => {
    if (!name) return "";
    return name.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\.$/, '')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getExpectedEmissions = (ficha: ProgramFicha, year: number, month: number) => {
    let count = 0;
    const d = new Date(year, month, 1);
    const freq = (ficha.frequency || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    while (d.getMonth() === month) {
      const day = d.getDay(); // 0 = Domingo, 1 = Lunes...
      let match = false;
      
      if (freq.includes("lunes a viernes") || freq.includes("diario")) {
          if (day >= 1 && day <= 5) match = true;
      }
      if (freq.includes("lunes a sabado")) {
          if (day >= 1 && day <= 6) match = true;
      }
      if (freq.includes("lunes a domingo") || freq.includes("todos los dias")) {
          match = true;
      }
      
      // Parse specific days
      if (freq.includes("lunes") && !match && day === 1) match = true;
      if (freq.includes("martes") && !match && day === 2) match = true;
      if (freq.includes("miercoles") && !match && day === 3) match = true;
      if (freq.includes("jueves") && !match && day === 4) match = true;
      if (freq.includes("viernes") && !match && day === 5) match = true;
      if (freq.includes("sabado") && !match && day === 6) match = true;
      if (freq.includes("domingo") && !match && day === 0) match = true;

      // Handle weird combo logic: if "lunes a viernes" was matched it overrides specific days check unless it says something specific, but for simplicity this works.
      if (freq === "diario") match = true;

      if (match) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };

  const getFichaRates = (progName: string) => {
    const normSearch = normalizeProgramName(progName);
    const ficha = fichas.find(f => normalizeProgramName(f.name) === normSearch);
    if (!ficha || !ficha.literarySupport) return { min: 0, max: 2000, valid: false };
    
    // Check if it's Guion Técnico
    if (ficha.literarySupport.toLowerCase().includes('guión técnico') || ficha.literarySupport.toLowerCase().includes('guion técnico')) {
        return { min: 0, max: 0, valid: false };
    }

    const guionPart = ficha.literarySupport.split('\n').find(l => l.includes('Guión'));
    if (!guionPart) return { min: 0, max: 2000, valid: true };
    
    const matches = guionPart.match(/\$?(\d+([.,]\d+)?)/g);
    if (matches && matches.length >= 2) {
      const min = parseFloat(matches[0].replace('$', '').replace(',', '.'));
      const max = parseFloat(matches[1].replace('$', '').replace(',', '.'));
      return { min, max, valid: true };
    }
    return { min: 0, max: 2000, valid: true };
  };

  const saveRates = (rates: PaymentRate[]) => {
    setPaymentRates(rates);
    localStorage.setItem('cmnl_payment_rates', JSON.stringify(rates));
  };

  const exportXlsx = (writerOnly = false) => {
    const list: any[] = [];

    // Calculate the data synchronously to bypass ui filters if requested
    Object.keys(filteredScripts).forEach(progName => {
      const scripts = filteredScripts[progName];
      const normProg = normalizeProgramName(progName);
      const rateInfo = paymentRates.find(r => normalizeProgramName(r.programName) === normProg);
      const fichaRate = getFichaRates(progName);
      const defaultRate = rateInfo ? rateInfo.rate : Math.round((fichaRate.max || 0) * 0.8);

      scripts.forEach(s => {
        if (writerOnly && filterWriter && s.writer !== filterWriter) return;
        
        let currentRate = defaultRate;
        if (manualPrices[s.id] !== undefined) {
             currentRate = manualPrices[s.id];
        }
        if (currentRate > fichaRate.max) {
             currentRate = fichaRate.max;
        }

        list.push({
          'Guionista': s.writer,
          'Asesor': s.advisor,
          'Programa': progName,
          'Fecha': s.dateAdded,
          'Importe Final': currentRate
        });
      });
    });

    const data = list;
    
    // Add Total Row
    const total = data.reduce((acc, curr) => acc + curr['Importe Final'], 0);
    data.push({
      'Guionista': 'TOTAL',
      'Asesor': '',
      'Programa': '',
      'Fecha': '',
      'Importe Final': total
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pago");
    const filename = writerOnly ? `Pago_${filterWriter.replace(/\s+/g,'_')}_${months[selectedMonth]}.xlsx` : `Cierre_Pago_${months[selectedMonth]}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  const getDateFromAgendaKey = (key: string, year: number) => {
    const parts = key.split('-');
    if (parts.length < 3) return key;
    
    const [monthName, weekIdxPart, dayName] = parts;
    const month = months.indexOf(monthName);
    if (month === -1) return key;

    const weekIdx = parseInt(weekIdxPart.replace('semana-', ''));
    if (isNaN(weekIdx)) return key;

    const firstDayOfMonth = new Date(year, month, 1);
    const weeksInMonth = getWeeksInMonth(firstDayOfMonth);
    const week = weeksInMonth.find(w => w.id === `semana-${weekIdx}`);
    if (!week) return key;

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dayNameIdx = dayNames.indexOf(dayName);
    if (dayNameIdx === -1) return key;

    const dayInfo = week.days[dayNameIdx];
    if (dayInfo) {
        return `${dayName} ${dayInfo.date.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
    }
    return key;
  };

  const classifyTheme = (theme: string) => {
    const t = theme.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
        
    if (t.includes('fidel') || t.includes('castro')) return "Legado de Fidel Castro";
    if (t.includes('soberania') || t.includes('alimentaria') || t.includes('agricultura')) return "Soberanía alimentaria";
    if (t.includes('tarea vida') || t.includes('medio ambiente') || t.includes('clima') || t.includes('ecologia')) return "Tarea Vida (medio ambiente)";
    if (t.includes('droga') || t.includes('lucha contra las drogas')) return "Lucha contra las drogas";
    if (t.includes('adelanto') || t.includes('mujeres') || t.includes('feminismo') || t.includes('pam ')) return "Programa de Adelanto de las mujeres";
    return "Otras temáticas";
  };

  const generateMonthlyReport = async () => {
    const monthName = months[selectedMonth];
    const groupings: Record<string, { date: string, program: string, specificTheme: string }[]> = {
      "Legado de Fidel Castro": [],
      "Soberanía alimentaria": [],
      "Tarea Vida (medio ambiente)": [],
      "Lucha contra las drogas": [],
      "Programa de Adelanto de las mujeres": [],
      "Otras temáticas": []
    };
    
    // Process Agenda Programs Themes
    agendaPrograms.forEach(prog => {
      if (prog.dailyData) {
        Object.keys(prog.dailyData).forEach(key => {
            const theme = prog.dailyData[key].theme;
            if (theme) {
              const parts = key.split('-');
              if (parts.length >= 3) {
                  const mName = parts[0];
                  const weekIdxPart = parts[1];
                  const dayName = parts[2];
                  
                  if (months.indexOf(mName) === selectedMonth) {
                      const category = classifyTheme(theme);
                      const formattedDate = getDateFromAgendaKey(key, selectedYear);
                      groupings[category].push({ 
                        date: formattedDate, 
                        program: prog.name,
                        specificTheme: theme
                      });
                  }
              }
            }
        });
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "RADIO CIUDAD MONUMENTO", bold: true, size: 28 }),
              new TextRun({ text: `\nREPORTE TEMÁTICO MENSUAL - ${monthName.toUpperCase()} ${selectedYear}`, bold: true, size: 24, break: 1 }),
            ],
          }),
          ...Object.keys(groupings).filter(cat => groupings[cat].length > 0).flatMap(category => [
            new Paragraph({
              spacing: { before: 400 },
              children: [
                new TextRun({ text: category.toUpperCase(), bold: true, color: "9E7649", underline: {} }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fecha", bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Programa", bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Temática Específica", bold: true })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                  ],
                }),
                ...groupings[category].map(item => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(item.date)] }),
                    new TableCell({ children: [new Paragraph(item.program)] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.specificTheme, italics: true })] })] }),
                  ],
                })),
              ],
            }),
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Reporte_Tematico_${monthName}_${selectedYear}.docx`);
  };

  const isFuzzyMatch = (s1: string, s2: string) => {
    if (!s1 || !s2) return false;
    const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'y', 'con', 'por', 'a', 'al', 'lo', 'que', 'su', 'mi', 'tu', 'para']);
    
    const getWords = (s: string) => s.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

    const words1 = getWords(s1);
    const words2 = getWords(s2);
    
    if (words1.length === 0 || words2.length === 0) return s1.toLowerCase().trim() === s2.toLowerCase().trim();

    let matches = 0;
    const set2 = new Set(words2);
    words1.forEach(w => {
        if (set2.has(w)) matches++;
    });

    return matches >= 3;
  };



    const getAgendaThemeForProgram = (progName: string, dateStr: string) => {
        const d = parseSpanishDate(dateStr);
        const day = d.getDate();
        const month = d.getMonth();
        const year = d.getFullYear();
        
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = dayNames[d.getDay()];

        // Check current, previous and next month as dates can overlap across monthly agendas
        const targetMonths = [
            { m: month, y: year },
            { m: (month - 1 + 12) % 12, y: month === 0 ? year - 1 : year },
            { m: (month + 1) % 12, y: month === 11 ? year + 1 : year }
        ];
        
        const normProgName = normalizeProgramName(progName);
        
        const prog = agendaPrograms.find(p => {
            const pNorm = normalizeProgramName(p.name);
            if (pNorm === normProgName) return true;
            if (normProgName.length > 5 && pNorm.includes(normProgName)) return true;
            if (pNorm.length > 5 && normProgName.includes(pNorm)) return true;
            return false;
        });

        if (!prog || !prog.dailyData) return "No programado";

        for (const target of targetMonths) {
            const mName = months[target.m];
            const weeks = getWeeksInMonth(new Date(target.y, target.m, 1));
            // Find which week has this specific day in its view
            const week = weeks.find(w => w.days.some(dayInfo => 
                dayInfo && dayInfo.date === day && dayInfo.month === month
            ));
            
            if (week) {
                const key = `${mName}-${week.id}-${dayName}`;
                if (prog.dailyData[key] && prog.dailyData[key].theme) {
                    return prog.dailyData[key].theme;
                }
            }
        }
        
        return "No programado";
    };

  // Filter scripts for selected month/year
  const filteredScripts = useMemo(() => {
    const result: Record<string, Script[]> = {};
    Object.keys(allScripts).forEach(progName => {
      result[progName] = allScripts[progName]
        .filter(s => {
          const d = parseSpanishDate(s.dateAdded);
          return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        })
        .map(s => ({
          ...s,
          writer: normalizeWriterName(s.writer)
        }));
    });
    return result;
  }, [allScripts, selectedMonth, selectedYear]);

  // Função B: Comparativa (Control de Calidad) - XLSX & UI
  const qualityReportData = useMemo(() => {
    let list: any[] = [];
    Object.keys(filteredScripts).forEach(progName => {
        const scripts = filteredScripts[progName];
        scripts.forEach(s => {
            const agendaTheme = getAgendaThemeForProgram(progName, s.dateAdded);
            const realTheme = (s.themes && s.themes.length > 0) ? s.themes.join(', ') : "Sin tema";
            const balance = isFuzzyMatch(realTheme, agendaTheme) ? 'Positivo' : 'Negativo';
            
            list.push({
                id: s.id,
                program: progName,
                date: s.dateAdded,
                writer: s.writer,
                advisor: s.advisor,
                realTheme,
                agendaTheme,
                balance
            });
        });
    });

    if (filterCompareProgram) {
      list = list.filter(item => item.program.toLowerCase().includes(filterCompareProgram.toLowerCase()));
    }
    if (filterCompareBalance !== 'all') {
      list = list.filter(item => item.balance === filterCompareBalance);
    }

    return list;
  }, [filteredScripts, agendaThemes, agendaPrograms, filterCompareProgram, filterCompareBalance]);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScroll = topScrollRef.current;
    if (!tableContainer || !topScroll) return;

    const syncTop = () => { topScroll.scrollLeft = tableContainer.scrollLeft; };
    const syncBottom = () => { tableContainer.scrollLeft = topScroll.scrollLeft; };

    tableContainer.addEventListener('scroll', syncTop);
    topScroll.addEventListener('scroll', syncBottom);
    return () => {
      tableContainer.removeEventListener('scroll', syncTop);
      topScroll.removeEventListener('scroll', syncBottom);
    };
  }, [activeTab, qualityReportData]);

  const qualityStats = useMemo(() => {
    const writers: Record<string, number> = {};
    const advisors: Record<string, number> = {};
    const programs: Record<string, number> = {};
    
    qualityReportData.forEach(item => {
        if (item.balance === 'Negativo') {
            writers[item.writer] = (writers[item.writer] || 0) + 1;
            advisors[item.advisor] = (advisors[item.advisor] || 0) + 1;
            programs[item.program] = (programs[item.program] || 0) + 1;
        }
    });

    const writerData = Object.keys(writers).map((name, i) => ({ name, value: writers[name], color: COLORS[i % COLORS.length] })).sort((a, b) => b.value - a.value);
    const advisorData = Object.keys(advisors).map((name, i) => ({ name, value: advisors[name], color: COLORS[(i + 2) % COLORS.length] })).sort((a, b) => b.value - a.value);
    const programData = Object.keys(programs).map((name, i) => ({ name, value: programs[name], color: COLORS[(i + 4) % COLORS.length] })).sort((a, b) => b.value - a.value);

    return { 
      writerData, 
      advisorData, 
      programData,
      top3Writer: writerData.slice(0, 3),
      top3Advisor: advisorData.slice(0, 3),
      top3Program: programData.slice(0, 3)
    };
  }, [qualityReportData]);

  const exportTableToXlsx = (title: string, headers: string[], rows: any[][], fileName: string) => {
    const data: any[] = [];
    data.push(['RADIO CIUDAD MONUMENTO']);
    data.push([title.toUpperCase()]);
    data.push([]);
    data.push(headers);
    rows.forEach(row => data.push(row));

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Aesthetic adjustments (column widths)
    const wscols = headers.map(() => ({ wch: 25 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, fileName);
  };

  const generateQualityReport = async (onlyMainTable = false) => {
    const monthName = months[selectedMonth];
    const data: any[] = [];
    data.push(['RADIO CIUDAD MONUMENTO']);
    data.push([`${onlyMainTable ? 'DETALLE COMPARATIVO' : 'REPORTE DE CONTROL DE CALIDAD Y CUMPLIMIENTO'} - ${monthName} ${selectedYear}`]);
    data.push([]);
    
    const tableHeader = ['Fecha', 'Guionista', 'Asesor', 'Tema Real', 'Tema Agenda', 'Balance'];
    
    const grouped = qualityReportData.reduce((acc, curr) => {
        if (!acc[curr.program]) acc[curr.program] = [];
        acc[curr.program].push(curr);
        return acc;
    }, {} as Record<string, any[]>);

    Object.keys(grouped).forEach(progName => {
        data.push([progName.toUpperCase()]);
        data.push(tableHeader);
        grouped[progName].forEach(s => {
            data.push([s.date, s.writer, s.advisor, s.realTheme, s.agendaTheme, s.balance]);
        });
        data.push([]);
    });

    if (!onlyMainTable) {
        data.push(['RESUMEN DE INCUMPLIMIENTOS']);
        data.push(['Guionistas con incumplimientos']);
        data.push(['Nombre', 'Cantidad']);
        qualityStats.writerData.forEach(d => data.push([d.name, d.value]));
        data.push([]);
        data.push(['Asesores con incumplimientos']);
        data.push(['Nombre', 'Cantidad']);
        qualityStats.advisorData.forEach(d => data.push([d.name, d.value]));
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [ {wch: 12}, {wch: 25}, {wch: 25}, {wch: 40}, {wch: 40}, {wch: 10} ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calidad");
    const fileName = onlyMainTable ? `Detalle_Comparativo_${monthName}_${selectedYear}.xlsx` : `Control_Calidad_${monthName}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Função C: Cierre para el Pago
  const paymentData = useMemo(() => {
    const list: any[] = [];
    Object.keys(filteredScripts).forEach(progName => {
      const scripts = filteredScripts[progName];
      const normProg = normalizeProgramName(progName);
      const rateInfo = paymentRates.find(r => normalizeProgramName(r.programName) === normProg);
      const fichaRate = getFichaRates(progName);
      
      const defaultRate = rateInfo ? rateInfo.rate : Math.round((fichaRate.max || 0) * 0.8);

      scripts.forEach(s => {
        if (filterWriter && s.writer !== filterWriter) return;
        if (selectedProgramBatch && normalizeProgramName(progName) !== normalizeProgramName(selectedProgramBatch)) return;
        
        let currentRate = defaultRate;
        if (manualPrices[s.id] !== undefined) {
             currentRate = manualPrices[s.id];
        }

        // Failsafe constraint based on max
        if (currentRate > fichaRate.max) {
             currentRate = fichaRate.max;
        }

        list.push({
          id: s.id,
          scriptwriter: s.writer,
          advisor: s.advisor,
          program: progName,
          date: s.dateAdded,
          subtotal: currentRate,
        });
      });
    });
    return list;
  }, [filteredScripts, paymentRates, filterWriter, manualPrices, fichas]);

  const handleBatchEdit = () => {
    if (!selectedProgramBatch || !filterWriter) return;
    
    const newManualPrices = { ...manualPrices };
    
    // Find all scripts matching the filter for this program
    const normBatch = normalizeProgramName(selectedProgramBatch);
    const actualKey = Object.keys(filteredScripts).find(k => normalizeProgramName(k) === normBatch) || selectedProgramBatch;

    const matchingScripts = filteredScripts[actualKey]?.filter(s => 
        s.writer === filterWriter
    ) || [];

    if (matchingScripts.length === 0) {
        alert(`No se encontraron guiones de ${filterWriter} en ${selectedProgramBatch} para el mes seleccionado.`);
        return;
    }

    matchingScripts.forEach(s => {
        newManualPrices[s.id] = batchPrice;
    });
    
    saveManualPrices(newManualPrices);
    alert(`Se ha aplicado la tarifa de $${batchPrice} a ${matchingScripts.length} guiones de ${selectedProgramBatch}.`);
  };


  const totalPayment = useMemo(() => {
      return paymentData.reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [paymentData]);

  const allScriptwriters = useMemo(() => {
      const uniqueWriters = new Set<string>();
      Object.values(filteredScripts).forEach((scripts: any) => scripts.forEach((s: any) => uniqueWriters.add(s.writer)));
      return Array.from(uniqueWriters).sort();
  }, [filteredScripts]);

  const balanceData = useMemo(() => {
    const list: any[] = [];
    fichas.filter(f => getFichaRates(f.name).valid).forEach(ficha => {
        const normName = normalizeProgramName(ficha.name);
        let expected = getExpectedEmissions(ficha, selectedYear, selectedMonth);
        let actual = 0;
        let validated = 0;

        Object.keys(filteredScripts).forEach(k => {
           if (normalizeProgramName(k) === normName) {
               actual += filteredScripts[k].length;
               filteredScripts[k].forEach(s => {
                   if (validatedScripts[s.id]) validated++;
               })
           }
        });

        if (expected > 0 || actual > 0) {
            list.push({
               program: ficha.name,
               expected,
               actual,
               missing: expected - actual,
               validated,
               unvalidated: actual - validated
            });
        }
    });
    return list;
  }, [fichas, filteredScripts, validatedScripts, selectedMonth, selectedYear]);


  const programsWithGuion = fichas.filter(f => {
      const rates = getFichaRates(f.name);
      return rates.valid;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2C1B15] p-6 rounded-2xl border border-stone-800">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="text-[#9E7649]" />
            Gestión de Guiones y Cierre Financiero
          </h2>
          <p className="text-stone-400 text-sm mt-1">Módulo para el control administrativo de la producción literaria.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="bg-[#1A100C] border border-stone-800 rounded-lg px-3 py-2 text-sm text-[#E8DCCF]"
          >
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="bg-[#1A100C] border border-stone-800 rounded-lg px-3 py-2 text-sm text-[#E8DCCF]"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            onClick={() => setShowConfig(true)}
            className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors text-[#9E7649]"
            title="Configuración de Tarifas"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tab Selection */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('A')}
            className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'A' ? 'bg-[#9E7649] text-[#1A100C]' : 'bg-[#2C1B15] text-stone-400 hover:bg-stone-800 border border-stone-800'}`}
          >
            <div className={`p-2 rounded-lg ${activeTab === 'A' ? 'bg-black/20' : 'bg-stone-900'}`}>
              <FileText size={20} />
            </div>
            <div className="text-left">
              <span className="block font-bold">Informe DOCX Mensual</span>
              <span className="text-[10px] opacity-70">Extracción temática de la Agenda</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('B')}
            className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'B' ? 'bg-[#9E7649] text-[#1A100C]' : 'bg-[#2C1B15] text-stone-400 hover:bg-stone-800 border border-stone-800'}`}
          >
            <div className={`p-2 rounded-lg ${activeTab === 'B' ? 'bg-black/20' : 'bg-stone-900'}`}>
              <BarChart3 size={20} />
            </div>
            <div className="text-left">
              <span className="block font-bold">Control de Calidad</span>
              <span className="text-[10px] opacity-70">Comparativa Agenda vs Realidad</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('C')}
            className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'C' ? 'bg-[#9E7649] text-[#1A100C]' : 'bg-[#2C1B15] text-stone-400 hover:bg-stone-800 border border-stone-800'}`}
          >
            <div className={`p-2 rounded-lg ${activeTab === 'C' ? 'bg-black/20' : 'bg-stone-900'}`}>
              <DollarSign size={20} />
            </div>
            <div className="text-left">
              <span className="block font-bold">Cierre para el Pago</span>
              <span className="text-[10px] opacity-70">Módulo Financiero Local</span>
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          <div className="bg-[#2C1B15] rounded-3xl border border-stone-800 overflow-hidden shadow-2xl">
            {activeTab === 'A' && (
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-[#9E7649]/10 rounded-full flex items-center justify-center mx-auto">
                  <FileText size={40} className="text-[#9E7649]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Informe DOCX Mensual</h3>
                  <p className="text-stone-400 mt-2 max-w-md mx-auto italic">
                    Genera un documento consolidado con todos los temas generales programados en la agenda editorial para el mes de {months[selectedMonth]}.
                  </p>
                </div>
                <button 
                  onClick={generateMonthlyReport}
                  className="bg-[#9E7649] text-[#1A100C] px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto active:scale-95 transition-all shadow-xl shadow-amber-900/20"
                >
                  <Download size={20} />
                  Descargar DOCX
                </button>
              </div>
            )}

            {activeTab === 'B' && (
              <div className="flex flex-col h-full max-h-[700px]">
                <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-[#2C1B15] sticky top-0 z-10">
                   <div>
                      <h3 className="font-bold">Control de Calidad</h3>
                      <p className="text-[10px] text-stone-500 uppercase font-mono tracking-widest">{months[selectedMonth]} {selectedYear}</p>
                   </div>
                   <button 
                    onClick={() => generateQualityReport(false)}
                    className="flex items-center gap-2 bg-[#9E7649] text-[#1A100C] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#8A6740] transition-all active:scale-95"
                   >
                     <Download size={16} /> Descargar Reporte Completo (.xlsx)
                   </button>
                </div>

                <div className="flex-1 overflow-auto no-scrollbar p-6 space-y-8 pb-20">
                  {/* Stats & Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/20 p-4 rounded-2xl border border-stone-800 space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <h4 className="text-[10px] text-[#9E7649] font-bold uppercase tracking-widest">Incumplimientos por Programa (TOP 3)</h4>
                        <button 
                          onClick={() => exportTableToXlsx("Incumplimientos por Programa", ["Programa", "Cantidad"], qualityStats.programData.map(d => [d.name, d.value]), "Incumplimientos_Programas.xlsx")}
                          className="p-1.5 hover:bg-white/5 rounded text-stone-500 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={qualityStats.top3Program}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={8} tick={{ fill: '#666' }} />
                            <YAxis stroke="#666" fontSize={8} tick={{ fill: '#666' }} />
                            <ReTooltip cursor={{ fill: 'rgba(158, 118, 73, 0.1)' }} contentStyle={{ backgroundColor: '#1A100C', borderColor: '#2C1B15', fontSize: '10px' }} />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Bar name="Incumplimientos" dataKey="value" fill="#9E7649" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="bg-black/20 p-4 rounded-2xl border border-stone-800 space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <h4 className="text-[10px] text-[#9E7649] font-bold uppercase tracking-widest">Guionistas con Incumplimientos (TOP 3)</h4>
                        <button 
                          onClick={() => exportTableToXlsx("Incumplimientos por Guionista", ["Nombre", "Cantidad"], qualityStats.writerData.map(d => [d.name, d.value]), "Incumplimientos_Guionistas.xlsx")}
                          className="p-1.5 hover:bg-white/5 rounded text-stone-500 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={qualityStats.top3Writer}
                              cx="50%" cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {qualityStats.top3Writer.map((entry: any, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ReTooltip contentStyle={{ backgroundColor: '#1A100C', borderColor: '#2C1B15', fontSize: '10px' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Asesores Stats Table/Chart */}
                  <div className="bg-black/20 p-6 rounded-2xl border border-stone-800 space-y-4">
                     <div className="flex justify-between items-center px-2">
                        <h4 className="text-[10px] text-[#9E7649] font-bold uppercase tracking-widest">Asesores con Incumplimientos (TOP 3)</h4>
                        <button 
                          onClick={() => exportTableToXlsx("Incumplimientos por Asesor", ["Nombre", "Cantidad"], qualityStats.advisorData.map(d => [d.name, d.value]), "Incumplimientos_Asesores.xlsx")}
                          className="p-1.5 hover:bg-white/5 rounded text-stone-500 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart layout="vertical" data={qualityStats.top3Advisor}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" horizontal={false} />
                                <XAxis type="number" stroke="#666" fontSize={8} hide />
                                <YAxis dataKey="name" type="category" stroke="#666" fontSize={8} width={80} />
                                <ReTooltip contentStyle={{ backgroundColor: '#1A100C', borderColor: '#2C1B15', fontSize: '10px' }} />
                                <Bar dataKey="value" fill="#6B4F31" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {qualityStats.advisorData.length === 0 ? (
                                <p className="text-center text-stone-600 text-xs italic py-4">Sin incumplimientos registrados.</p>
                            ) : qualityStats.advisorData.slice(0, 3).map((d: any, idx) => (
                                <div key={idx} className="bg-[#1A100C] p-3 rounded-lg border border-stone-800 flex justify-between items-center">
                                    <span className="text-[11px] text-white font-medium">{d.name}</span>
                                    <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{d.value}</span>
                                </div>
                            ))}
                        </div>
                     </div>
                  </div>

                  {/* Table Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={14} />
                      <select 
                        value={filterCompareProgram}
                        onChange={e => setFilterCompareProgram(e.target.value)}
                        className="w-full bg-[#1A100C] border border-stone-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white appearance-none"
                      >
                        <option value="">Todos los Programas</option>
                        {Object.keys(filteredScripts).sort().map(prog => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                    <select 
                      value={filterCompareBalance}
                      onChange={e => setFilterCompareBalance(e.target.value as any)}
                      className="bg-[#1A100C] border border-stone-800 rounded-lg px-3 py-2 text-xs text-[#E8DCCF]"
                    >
                      <option value="all">Todos los Balances</option>
                      <option value="Positivo">Positivo</option>
                      <option value="Negativo">Negativo</option>
                    </select>
                  </div>

                  {/* Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <h4 className="text-[10px] text-[#9E7649] font-bold uppercase tracking-widest">Detalle Comparativo</h4>
                       <button onClick={() => generateQualityReport(true)} className="flex items-center gap-2 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 px-4 py-2 rounded-lg text-[10px] font-bold active:scale-95 hover:bg-cyan-600/30 transition-all">
                          <Download size={14} /> Descargar Tabla Detalle (.xlsx)
                       </button>
                    </div>
                        {/* Top synchronized scrollbar */}
                        <div ref={topScrollRef} className="overflow-x-auto h-3 mb-1 no-scrollbar-hidden">
                          <div className="min-w-[900px] h-px"></div>
                        </div>

                        <div ref={tableContainerRef} className="rounded-xl border border-stone-800 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                              <thead className="bg-[#1A100C] border-b border-stone-800">
                                <tr>
                                  <th className="p-3 text-[9px] font-bold text-stone-500 uppercase w-32">Fecha</th>
                              <th className="p-3 text-[9px] font-bold text-stone-500 uppercase">Programa</th>
                              <th className="p-3 text-[9px] font-bold text-stone-500 uppercase">Guionista</th>
                              <th className="p-3 text-[9px] font-bold text-stone-500 uppercase">Asesor</th>
                              <th className="p-3 text-[9px] font-bold text-stone-500 uppercase">Real</th>
                              <th className="p-3 text-[9px] font-bold text-stone-500 uppercase">Agenda</th>
                              <th className="p-3 text-[9px] font-bold text-stone-500 uppercase text-center">Balance</th>
                              <th className="p-3 text-[9px] font-bold text-stone-500 uppercase text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qualityReportData.map((item, idx) => (
                              <tr key={idx} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                                <td className="p-3 text-[10px] font-mono text-stone-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{item.date}</td>
                                <td className="p-3 text-[11px] font-medium text-white">{item.program}</td>
                                <td className="p-3 text-[11px] text-stone-400">{item.writer}</td>
                                <td className="p-3 text-[11px] text-stone-400">{item.advisor}</td>
                                <td className="p-3 text-[10px] text-stone-300 max-w-[120px] truncate">{item.realTheme}</td>
                                <td className="p-3 text-[10px] text-stone-500 max-w-[120px] truncate italic">{item.agendaTheme}</td>
                                <td className="p-3 text-center">
                                  <div className="flex justify-center">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1 ${item.balance === 'Positivo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {item.balance === 'Positivo' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                      {item.balance}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex justify-center gap-1">
                                    <button className="p-1 hover:bg-stone-700 rounded text-stone-500"><Edit2 size={12} /></button>
                                    <button className="p-1 hover:bg-red-500/10 rounded text-red-400"><Trash2 size={12} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'C' && (
              <div className="flex flex-col h-full max-h-[700px]">
                <div className="p-6 border-b border-stone-800 space-y-4 bg-[#2C1B15] sticky top-0 z-10">
                   <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">Cierre para Pago</h3>
                        <p className="text-[10px] text-stone-500 uppercase font-mono tracking-widest">{months[selectedMonth]} {selectedYear}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowBalanceDialog(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95">
                          <BarChart3 size={16} /> Balance
                        </button>
                        <button onClick={() => exportXlsx(false)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold active:scale-95">
                          <Download size={16} /> Exportar Mes
                        </button>
                      </div>
                   </div>

                   <div className="flex flex-wrap gap-4 items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] text-[#9E7649] uppercase mb-1 font-bold">Filtrar por Guionista</label>
                        <select 
                            value={filterWriter}
                            onChange={e => setFilterWriter(e.target.value)}
                            className="w-full bg-black/20 border border-stone-800 rounded-lg px-4 py-2 text-xs text-white"
                        >
                            <option value="">Todos los guionistas</option>
                            {allScriptwriters.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                      
                      {filterWriter && (
                        <div className="flex gap-2">
                          <button onClick={() => exportXlsx(true)} className="bg-[#9E7649] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                            <Download size={14} /> Individual (.xlsx)
                          </button>
                        </div>
                      )}
                   </div>

                   {filterWriter && (
                     <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/20 space-y-3 animate-in slide-in-from-top-2">
                       <h4 className="text-[10px] text-[#9E7649] font-bold uppercase tracking-widest">Edición en Lote para {filterWriter}</h4>
                       <div className="flex flex-wrap gap-3 items-end">
                          <div className="flex-1 min-w-[150px]">
                             <label className="block text-[8px] text-stone-500 uppercase mb-1">Programa</label>
                             <select 
                               value={selectedProgramBatch} 
                               onChange={e => {
                                 setSelectedProgramBatch(e.target.value);
                                 const rates = getFichaRates(e.target.value);
                                 const normBatch = normalizeProgramName(e.target.value);
                                 const rateObj = paymentRates.find(r => normalizeProgramName(r.programName) === normBatch);
                                 const defaultRate = rateObj ? rateObj.rate : Math.round((rates.max || 0) * 0.8);
                                 setBatchPrice(defaultRate);
                               }}
                               className="w-full bg-black/40 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white"
                             >
                               <option value="">Seleccionar...</option>
                               {programsWithGuion.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                             </select>
                          </div>
                          
                          {selectedProgramBatch && (
                            <>
                              <div className="flex-1 min-w-[200px] space-y-1">
                                <div className="flex justify-between text-[8px] uppercase">
                                  <span className="text-stone-500">Ajuste de Tarifa</span>
                                  <span className="text-[#9E7649] font-bold">${batchPrice}</span>
                                </div>
                                <input 
                                  type="range"
                                  min={getFichaRates(selectedProgramBatch).min}
                                  max={getFichaRates(selectedProgramBatch).max}
                                  value={batchPrice}
                                  onChange={e => setBatchPrice(parseInt(e.target.value))}
                                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#9E7649]"
                                />
                                <div className="flex justify-between text-[7px] text-stone-600">
                                  <span>Min: ${getFichaRates(selectedProgramBatch).min}</span>
                                  <span>Max: ${getFichaRates(selectedProgramBatch).max}</span>
                                </div>
                              </div>
                              <button 
                                onClick={handleBatchEdit}
                                className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600/30"
                              >
                                Aplicar a todos
                              </button>
                            </>
                          )}
                       </div>
                     </div>
                   )}
                </div>
                
                <div className="flex-1 overflow-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#2C1B15] shadow-sm z-10">
                      <tr className="border-b border-stone-800">
                        <th className="p-4 text-[10px] font-bold text-stone-500 uppercase">Guionista</th>
                        <th className="p-4 text-[10px] font-bold text-stone-500 uppercase">Programa</th>
                        <th className="p-4 text-[10px] font-bold text-stone-500 uppercase">Fecha</th>
                        <th className="p-4 text-[10px] font-bold text-stone-500 uppercase">Importe</th>
                        <th className="p-4 text-[10px] font-bold text-stone-500 uppercase text-center">Validar</th>
                        <th className="p-4 text-[10px] font-bold text-stone-500 uppercase text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-stone-600 italic">No hay datos para este período o filtro.</td>
                        </tr>
                      ) : (
                          <>
                              {paymentData.map((item, idx) => (
                                  <tr key={idx} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                                  <td className="p-4 text-xs font-medium">{item.scriptwriter}</td>
                                  <td className="p-4 text-xs">{item.program}</td>
                                  <td className="p-4 text-[10px] font-mono">{item.date}</td>
                                  <td className="p-4 text-xs font-bold text-emerald-500">${item.subtotal.toFixed(2)}</td>
                                  <td className="p-4 text-center">
                                      <input 
                                        type="checkbox" 
                                        checked={!!validatedScripts[item.id]} 
                                        onChange={e => toggleValidation(item.id, e.target.checked)}
                                        className="w-4 h-4 cursor-pointer accent-[#9E7649]"
                                      />
                                  </td>
                                  <td className="p-4 flex justify-center gap-2">
                                      <button 
                                          onClick={() => {
                                              setEditingTargetId(item.id);
                                              setShowEditDialog(true);
                                          }}
                                          className="p-1.5 hover:bg-stone-700 rounded transition-colors text-stone-400"
                                      >
                                          <Edit2 size={14} />
                                      </button>
                                      <button className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-red-400"><Trash2 size={14} /></button>
                                  </td>
                                  </tr>
                              ))}
                              <tr className="bg-stone-800/50 font-bold">
                                  <td className="p-4 text-xs uppercase" colSpan={3}>Total</td>
                                  <td className="p-4 text-xs text-emerald-500">${totalPayment.toFixed(2)}</td>
                                  <td className="p-4" colSpan={2}></td>
                              </tr>
                          </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditDialog && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#2C1B15] w-full max-w-sm rounded-3xl border border-stone-800 p-6 space-y-4">
                  <h3 className="font-bold text-lg text-white">Seleccionar Porcentaje o Introducir Valor</h3>
                  <p className="text-xs text-stone-400">Ajusta el valor del guión respecto a su tarifa máxima o entra un valor manual:</p>
                  
                  <div className="flex gap-2">
                      <input 
                          type="number" 
                          value={editingManualValue}
                          onChange={e => setEditingManualValue(e.target.value)}
                          placeholder="Valor exacto..."
                          className="flex-1 bg-black/40 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white"
                      />
                      <button 
                          onClick={() => {
                              const val = parseFloat(editingManualValue);
                              if (!isNaN(val) && val >= 0) {
                                  const newPrices = { ...manualPrices, [editingTargetId!]: val };
                                  saveManualPrices(newPrices);
                                  setShowEditDialog(false);
                                  setEditingManualValue('');
                              }
                          }}
                          className="bg-[#9E7649] text-white px-4 py-2 rounded-lg text-xs font-bold"
                      >
                          Aplicar
                      </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                      {[100, 90, 80, 70, 60, 50].map(pct => (
                          <button 
                          key={pct}
                          className="bg-[#1A100C] hover:bg-[#9E7649]/20 p-3 rounded-lg border border-stone-700 font-bold text-xs"
                          onClick={() => {
                              const item = paymentData.find(i => i.id === editingTargetId!);
                              const fichaRate = getFichaRates(item!.program);
                              const maxPossible = fichaRate.max || 0;
                              
                              const newPrices = { ...manualPrices, [editingTargetId!]: Math.round(maxPossible * (pct / 100)) };
                              saveManualPrices(newPrices);
                              setShowEditDialog(false);
                          }}
                          >{pct}%</button>
                      ))}
                  </div>
                  <button onClick={() => setShowEditDialog(false)} className="w-full text-stone-500 text-xs uppercase font-bold pt-2">Cancelar</button>
              </div>
          </div>
      )}

      {/* Balance Dialog */}
      {showBalanceDialog && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#2C1B15] w-full max-w-2xl rounded-3xl border border-stone-800 p-6 flex flex-col max-h-[85vh]">
                  <div className="flex justify-between items-center mb-4">
                      <div>
                          <h3 className="font-bold text-lg text-white">Balance de Guiones</h3>
                          <p className="text-xs text-stone-400">Emisiones esperadas vs Guiones en Base de Datos vs Validados ({months[selectedMonth]} {selectedYear})</p>
                      </div>
                      <button onClick={() => setShowBalanceDialog(false)} className="text-stone-400 hover:text-white transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-auto no-scrollbar space-y-4 pr-2">
                      <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 bg-[#2C1B15] z-10">
                              <tr className="border-b border-stone-800 text-stone-500 uppercase">
                                  <th className="py-2">Programa</th>
                                  <th className="py-2 text-center">Esperados</th>
                                  <th className="py-2 text-center">Realizados</th>
                                  <th className="py-2 text-center text-red-400">Faltantes</th>
                                  <th className="py-2 text-center text-emerald-400">Validados</th>
                                  <th className="py-2 text-center text-yellow-500">Sin Validar</th>
                              </tr>
                          </thead>
                          <tbody>
                              {balanceData.map((b, i) => (
                                  <tr key={i} className="border-b border-stone-800/50 hover:bg-white/5">
                                      <td className="py-3 font-medium text-white">{b.program}</td>
                                      <td className="py-3 text-center">{b.expected}</td>
                                      <td className="py-3 text-center text-stone-300">{b.actual}</td>
                                      <td className="py-3 text-center font-bold text-red-400">{b.missing > 0 ? b.missing : '-'}</td>
                                      <td className="py-3 text-center text-emerald-400 font-bold">{b.validated > 0 ? b.validated : '-'}</td>
                                      <td className="py-3 text-center text-yellow-500 font-bold">{b.unvalidated > 0 ? b.unvalidated : '-'}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                      <button 
                          onClick={() => {
                              // Missing logic and unvalidated detail for Whatsapp
                              const missingDetails: string[] = [];
                              const infoText = balanceData
                                .filter(b => b.missing > 0 || b.unvalidated > 0)
                                .map(b => {
                                   let str = `*${b.program}*:\n`;
                                   if (b.missing > 0) str += `- Faltan ${b.missing} guiones en la BD.\n`;
                                   
                                   const normP = normalizeProgramName(b.program);
                                   let unvalidatedList: string[] = [];
                                   Object.keys(filteredScripts).forEach(k => {
                                      if (normalizeProgramName(k) === normP) {
                                          filteredScripts[k].forEach(s => {
                                              if (!validatedScripts[s.id]) {
                                                  unvalidatedList.push(`  • ${s.dateAdded} (${s.writer})`);
                                              }
                                          });
                                      }
                                   });
                                   if (unvalidatedList.length > 0) {
                                       str += `- Guiones sin validar:\n${unvalidatedList.join('\n')}`;
                                   }
                                   return str;
                                }).join('\n\n');

                               const msg = `*REPORTE DE INCIDENCIAS - ${months[selectedMonth].toUpperCase()}*\n\n${infoText || 'Todo está en orden.'}\n\nFavor de verificar impresos.`;
                               
                               navigator.clipboard.writeText(msg).then(() => {
                                   alert('El reporte ha sido copiado al portapapeles. A continuación se abrirá el grupo de WhatsApp. Pegue el mensaje allí.');
                                   window.open('https://chat.whatsapp.com/IY4VnjbdYP9I9ozxV7BASS', '_blank');
                               });
                          }}
                          className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#128C7E] transition-all"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                          </svg>
                          Compartir Reporte en WhatsApp
                      </button>
                      <button onClick={() => setShowBalanceDialog(false)} className="w-full text-stone-500 font-bold uppercase text-xs hover:text-white transition-colors">
                          Cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#2C1B15] w-full max-w-2xl rounded-3xl border border-stone-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-[#2C1B15]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#9E7649]/20 flex items-center justify-center text-[#9E7649]">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">Configuración Financiera</h3>
                  <p className="text-[10px] text-[#9E7649] font-bold uppercase tracking-widest opacity-80 mt-1">Tarifas por Programa</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfig(false)}
                className="size-10 rounded-full bg-stone-900 flex items-center justify-center hover:bg-stone-800 transition-colors border border-stone-700"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
              {/* Individual Rates */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                  <Plus size={14} className="text-[#9E7649]" />
                  Definir Tarifas Unitarias
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {programsWithGuion.map(f => {
                    const rates = getFichaRates(f.name);
                    const defaultRate = Math.round((rates.max || 0) * 0.8);
                    const normName = normalizeProgramName(f.name);
                    const rateObj = paymentRates.find(r => normalizeProgramName(r.programName) === normName);
                    const currentRate = rateObj ? rateObj.rate : defaultRate;
                    
                    return (
                      <div key={f.name} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-white truncate max-w-[150px]">{f.name}</span>
                          <div className="text-right">
                              <span className="block text-xs font-bold text-[#9E7649]">${currentRate}</span>
                          </div>
                        </div>
                        <input 
                          type="range"
                          min={rates.min}
                          max={rates.max}
                          step="1"
                          value={currentRate < rates.min ? rates.min : (currentRate > rates.max ? rates.max : currentRate)}
                          onChange={e => {
                            const newRates = [...paymentRates];
                            const normF = normalizeProgramName(f.name);
                            const idx = newRates.findIndex(r => normalizeProgramName(r.programName) === normF);
                            if (idx >= 0) newRates[idx].rate = parseInt(e.target.value);
                            else newRates.push({ programName: f.name, rate: parseInt(e.target.value) });
                            saveRates(newRates);
                          }}
                          className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#9E7649]"
                        />
                        <div className="flex justify-between text-[8px] text-stone-600 uppercase">
                           <span>Min: ${rates.min}</span>
                           <span>Max: ${rates.max}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-stone-800 bg-[#2C1B15] flex gap-3">
              <button 
                onClick={() => setShowConfig(false)}
                className="w-full bg-[#9E7649] text-[#1A100C] py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-900/20"
              >
                Cerrar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuionesGestionTool;
