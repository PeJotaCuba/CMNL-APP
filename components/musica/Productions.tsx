import React, { useEffect, useState, useRef } from 'react';
import { Track, Production, DEFAULT_PROGRAMS_LIST } from './types';
import { GENRES_LIST, COUNTRIES_LIST } from './constants';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { saveProductionToDB, loadProductionsFromDB, deleteProductionFromDB, bulkUpdateProductions } from './services/db';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from "docx";
import { ChevronDown, FileText, Database, Upload, Archive, Trash2, Activity, X, Download } from 'lucide-react';

interface ProductionsProps {
  onUpdateTracks: (updateFunc: (prev: Track[]) => Track[]) => void;
  allTracks?: Track[];
}

interface TempTrack {
    id: string;
    title: string;
    author: string;
    authorCountry: string;
    performer: string;
    performerCountry: string;
    genre: string;
}

type TabType = 'intro' | 'stock' | 'archive';

const Productions: React.FC<ProductionsProps> = ({ }) => {
  const [activeTab, setActiveTab] = useState<TabType>('intro');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [program, setProgram] = useState(DEFAULT_PROGRAMS_LIST[0]);
  
  const [currentTrack, setCurrentTrack] = useState<TempTrack>({
      id: '',
      title: '',
      author: '',
      authorCountry: '',
      performer: '',
      performerCountry: '',
      genre: ''
  });

  const [sessionTracks, setSessionTracks] = useState<TempTrack[]>([]);
  const [editingTrackIndex, setEditingTrackIndex] = useState<number | null>(null);
  
  const [dbProductions, setDbProductions] = useState<Production[]>([]);

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedBalanceProgram, setSelectedBalanceProgram] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BALANCE_PROGRAMS = [
      "Buenos Días Bayamo",
      "La Cumbancha (Lunes a Viernes)",
      "La Cumbancha Sábado",
      "Todos en Casa",
      "Arte Bayamo",
      "Parada Joven",
      "Hablando con Juana",
      "Al Son de la Radio",
      "Sigue a tu Ritmo",
      "Cómplices",
      "Estación 95.3",
      "Palco de Domingo"
  ];

  const fetchProductions = async () => {
      const prods = await loadProductionsFromDB();
      setDbProductions(prods);
  };

  useEffect(() => {
      fetchProductions();
  }, [activeTab]);

  const handleAddTrack = () => {
      if (!currentTrack?.title || !currentTrack?.author || !currentTrack?.performer) {
          alert("Título, Autor e Intérprete son obligatorios.");
          return;
      }
      
      if (editingTrackIndex !== null) {
          setSessionTracks(prev => {
              const newTracks = [...prev];
              newTracks[editingTrackIndex] = { ...currentTrack };
              return newTracks;
          });
          setEditingTrackIndex(null);
      } else {
          setSessionTracks(prev => [...prev, { ...currentTrack, id: `temp-${Date.now()}` }]);
      }
      
      setCurrentTrack({
          id: '',
          title: '',
          author: '',
          authorCountry: '',
          performer: '',
          performerCountry: '',
          genre: ''
      });
  };

  const handleEditTrack = (index: number) => {
      setCurrentTrack(sessionTracks[index] || {
          id: '',
          title: '',
          author: '',
          authorCountry: '',
          performer: '',
          performerCountry: '',
          genre: ''
      });
      setEditingTrackIndex(index);
      // Scroll to top
      const container = document.getElementById('productions-container');
      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProduction = async () => {
      if (sessionTracks.length === 0) return alert("No hay temas en esta producción.");

      const newProduction: Production = {
          id: `prod-${Date.now()}`,
          date,
          program,
          tracks: sessionTracks
      };

      try {
          await saveProductionToDB(newProduction);
          alert("Producción guardada correctamente en la base de datos.");
          setSessionTracks([]); 
          fetchProductions();
      } catch (e) {
          alert("Error guardando producción.");
      }
  };

  const handleDeleteProduction = async (id: string) => {
      if (window.confirm("¿Estás seguro de que deseas eliminar esta producción?")) {
          await deleteProductionFromDB(id);
          fetchProductions();
      }
  };

  const handleImportTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files) as File[];
      
      let allParsedTracks: TempTrack[] = [];
      let lastParsedDate = date;
      let lastParsedProgram = program;

      for (const file of files) {
          const text = await file.text();
          const lines = text.split('\n');
          
          let current: Partial<TempTrack> = {};

          const saveCurrent = () => {
              if (current.title && (current.author || current.performer)) {
                   allParsedTracks.push({
                       id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                       title: current.title,
                       author: current.author || '',
                       authorCountry: current.authorCountry || '',
                       performer: current.performer || '',
                       performerCountry: current.performerCountry || '',
                       genre: current.genre || ''
                   } as TempTrack);
              }
              current = {};
          };

          lines.forEach(line => {
              const l = line.trim();
              if (!l) return;
              const lower = l.toLowerCase();

              if (lower.startsWith('fecha:')) {
                  let d = l.substring(6).trim();
                  if (d.includes('/')) {
                      const parts = d.split('/');
                      if (parts.length === 3) d = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                  lastParsedDate = d;
              } else if (lower.startsWith('programa:')) {
                  lastParsedProgram = l.substring(9).trim();
              } else if (/^\[\d+\]\s+/.test(l) || /\d+\.\s*titulo:/.test(lower) || lower.startsWith('titulo:')) {
                  saveCurrent();
                  let val = l;
                  if (/^\[\d+\]\s+/.test(l)) {
                      val = l.replace(/^\[\d+\]\s+/, '').trim();
                  } else {
                      val = l.replace(/^\d+\.\s*/, '').replace(/^titulo:\s*/i, '').trim();
                  }
                  current.title = val;
              } else if (lower.startsWith('autor:')) {
                  const val = l.substring(6).trim();
                  const match = val.match(/^(.*?)\s*\((.*?)\)$/);
                  if (match) {
                      current.author = match[1].trim();
                      current.authorCountry = match[2].trim() !== '-' ? match[2].trim() : '';
                  } else {
                      current.author = val;
                  }
                  if (current.author === '[No encontrado]') current.author = '';
              } else if (lower.startsWith('intérprete:') || lower.startsWith('interprete:')) {
                   const val = l.substring(l.indexOf(':') + 1).trim();
                   const match = val.match(/^(.*?)\s*\((.*?)\)$/);
                   if (match) {
                       current.performer = match[1].trim();
                       current.performerCountry = match[2].trim() !== '-' ? match[2].trim() : '';
                   } else {
                       current.performer = val;
                   }
                   if (current.performer === '[No encontrado]') current.performer = '';
              } else if (lower.startsWith('país:') || lower.startsWith('pais:')) {
                   const val = l.substring(5).trim();
                   if (current.performer && !current.performerCountry) {
                       current.performerCountry = val !== '-' ? val : '';
                   } else if (current.author && !current.authorCountry) {
                       current.authorCountry = val !== '-' ? val : '';
                   }
              } else if (lower.startsWith('género:') || lower.startsWith('genero:')) {
                   const val = l.substring(l.indexOf(':') + 1).trim();
                   current.genre = val !== '---' ? val : '';
              }
          });
          saveCurrent();
      }

      if (allParsedTracks.length === 0) {
          alert("No se encontraron temas válidos en los archivos TXT.");
          e.target.value = '';
          return;
      }

      setDate(lastParsedDate);
      if (DEFAULT_PROGRAMS_LIST.includes(lastParsedProgram)) {
          setProgram(lastParsedProgram);
      }
      
      setSessionTracks(prev => [...prev, ...allParsedTracks]);
      alert(`Se han cargado ${allParsedTracks.length} temas a la sesión. Revisa y edita antes de guardar.`);
      
      e.target.value = ''; 
  };

  const handleExportHistoryCSV = async () => {
      const history = await loadProductionsFromDB();
      if (history.length === 0) return alert("No hay historial de producciones.");

      const rows: any[] = [];
      history.forEach(prod => {
          if (!prod) return;
          (prod.tracks || []).forEach(t => {
              if (!t) return;
              rows.push({
                  Fecha: prod.date || '',
                  Programa: prod.program || '',
                  Título: t.title || '',
                  Autor: t.author || '',
                  "País Autor": t.authorCountry || '',
                  Intérprete: t.performer || '',
                  "País Intérprete": t.performerCountry || '',
                  Género: t.genre || ''
              });
          });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial_Producciones");
      XLSX.writeFile(wb, `RCM_Historial_Producciones_${date}.csv`);
  };

  const handleGenerateDOCX = async () => {
    if (sessionTracks.length === 0) return alert("Agregue temas para generar el informe DOCX.");

    const tableRows = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "Título", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Aut/Int", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Países", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Género", style: "Strong" })] }),
            ],
        }),
        ...sessionTracks.filter(Boolean).map(t => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(t?.title || '')] }),
                new TableCell({ children: [new Paragraph(`${t?.author || ''} / ${t?.performer || ''}`)] }),
                new TableCell({ children: [new Paragraph(`${t?.authorCountry || ''} / ${t?.performerCountry || ''}`)] }),
                new TableCell({ children: [new Paragraph(t?.genre || '')] }),
            ],
        }))
    ];

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "REPORTE DE PRODUCCIÓN MUSICAL - RCM", heading: "Heading1", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: `Fecha: ${date}` }),
                new Paragraph({ text: `Programa: ${program}` }),
                new Paragraph({ text: "" }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows,
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Produccion_${program}_${date}.docx`);
  };

  const handleMoveToArchive = async () => {
      if (stockMensual.length === 0) return alert("No hay producciones en el stock mensual para archivar.");
      if (!window.confirm("¿Estás seguro de que deseas mover todas las producciones del mes al archivo?")) return;

      const updatedProductions = stockMensual.map(p => ({ ...p, archived: true }));
      try {
          await bulkUpdateProductions(updatedProductions);
          await fetchProductions();
          alert("Todas las producciones del mes han sido movidas al archivo.");
      } catch (error) {
          alert("Error al archivar producciones.");
      }
  };

  const handleGenerateDetailedStatsDOCX = async () => {
    if (stockMensual.length === 0) return alert("No hay producciones en el mes actual para generar estadísticas.");

    const allTracks = stockMensual.flatMap(p => p.tracks || []).filter(Boolean);
    
    // Stats calculations
    const cubanWorks = allTracks.filter(t => (t.authorCountry || '').toLowerCase() === 'cuba' || (t.performerCountry || '').toLowerCase() === 'cuba').length;
    const foreignWorks = allTracks.length - cubanWorks;

    const authors = allTracks.map(t => ({ name: t.author, country: t.authorCountry || '' }));
    const performers = allTracks.map(t => ({ name: t.performer, country: t.performerCountry || '' }));
    
    const uniqueAuthors = Array.from(new Set(authors.map(a => a.name)));
    const uniquePerformers = Array.from(new Set(performers.map(p => p.name)));

    const cubanAuthors = uniqueAuthors.filter(name => authors.find(a => a.name === name)?.country.toLowerCase() === 'cuba').length;
    const foreignAuthors = uniqueAuthors.length - cubanAuthors;

    const cubanPerformers = uniquePerformers.filter(name => performers.find(p => p.name === name)?.country.toLowerCase() === 'cuba').length;
    const foreignPerformers = uniquePerformers.length - cubanPerformers;

    // Geographic breakdown for foreigners
    const regions: Record<string, string[]> = {
        'América Latina': ['mexico', 'colombia', 'argentina', 'venezuela', 'puerto rico', 'republica dominicana', 'panama', 'chile', 'peru', 'ecuador', 'bolivia', 'uruguay', 'paraguay', 'costa rica', 'guatemala', 'honduras', 'el salvador', 'nicaragua'],
        'Norteamérica': ['estados unidos', 'usa', 'canada'],
        'Europa': ['españa', 'espana', 'francia', 'italia', 'reino unido', 'alemania', 'portugal', 'holanda', 'belgica', 'suiza', 'austria', 'suecia', 'noruega', 'dinamarca'],
        'Asia': ['china', 'japon', 'corea', 'india']
    };

    const getRegion = (country: string) => {
        const c = country.toLowerCase();
        for (const [region, countries] of Object.entries(regions)) {
            if (countries.includes(c)) return region;
        }
        return 'Otros';
    };

    const foreignTalentRegions: Record<string, number> = { 'América Latina': 0, 'Norteamérica': 0, 'Europa': 0, 'Asia': 0, 'Otros': 0 };
    [...authors, ...performers].forEach(t => {
        if (t.country && t.country.toLowerCase() !== 'cuba') {
            const region = getRegion(t.country);
            foreignTalentRegions[region]++;
        }
    });

    // Rankings
    const getTop5 = (items: string[]) => {
        const counts: Record<string, number> = {};
        items.forEach(i => { if(i) counts[i] = (counts[i] || 0) + 1; });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };

    const topSongs = getTop5(allTracks.map(t => t.title));
    const topAuthors = getTop5(allTracks.map(t => t.author));
    const topPerformers = getTop5(allTracks.map(t => t.performer));
    const topGenres = getTop5(allTracks.map(t => t.genre));

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "ESTADÍSTICAS DE DIFUSIÓN MUSICAL - RCM", heading: "Heading1", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: `Mes: ${currentMonthName} ${currentYear}`, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "1. Resumen de Obras", heading: "Heading2" }),
                new Paragraph({ text: `Total de obras difundidas: ${allTracks.length}` }),
                new Paragraph({ text: `Obras de autores/intérpretes cubanos: ${cubanWorks}` }),
                new Paragraph({ text: `Obras de autores/intérpretes extranjeros: ${foreignWorks}` }),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "2. Registro de Talento", heading: "Heading2" }),
                new Paragraph({ text: `Autores Cubanos: ${cubanAuthors}` }),
                new Paragraph({ text: `Autores Extranjeros: ${foreignAuthors}` }),
                new Paragraph({ text: `Intérpretes Cubanos: ${cubanPerformers}` }),
                new Paragraph({ text: `Intérpretes Extranjeros: ${foreignPerformers}` }),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "3. Desglose Geográfico (Extranjeros)", heading: "Heading2" }),
                ...Object.entries(foreignTalentRegions).map(([region, count]) => 
                    new Paragraph({ text: `${region}: ${count}` })
                ),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "4. Rankings (Top 5)", heading: "Heading2" }),
                new Paragraph({ text: "Canciones más difundidas:", style: "Strong" }),
                ...topSongs.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Autores más registrados:", style: "Strong" }),
                ...topAuthors.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Intérpretes más registrados:", style: "Strong" }),
                ...topPerformers.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Géneros más difundidos:", style: "Strong" }),
                ...topGenres.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Estadisticas_Musica_${currentMonthStr}.docx`);
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return months[monthNum - 1] || "Desconocido";
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentMonthName = getMonthName(currentMonth);
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const getYearMonth = (dateStr?: string) => {
      if (!dateStr || typeof dateStr !== 'string') return { year: 0, month: 0, key: 'Desconocido' };
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
      }
      return { year: 0, month: 0, key: 'Desconocido' };
  };

  const stockMensual = (dbProductions || []).filter(p => {
      if (!p) return false;
      const { year, month } = getYearMonth(p.date);
      return year === currentYear && month === currentMonth && !p.archived;
  });
  
  const archivo = (dbProductions || []).filter(p => {
      if (!p) return false;
      const { year, month } = getYearMonth(p.date);
      return !(year === currentYear && month === currentMonth) || p.archived;
  });

  // Agrupar archivo por mes (usando el formato normalizado YYYY-MM)
  const archivoPorMes: Record<string, Production[]> = {};
  archivo.forEach(p => {
      if (!p) return;
      const { key } = getYearMonth(p.date);
      if (!archivoPorMes[key]) archivoPorMes[key] = [];
      archivoPorMes[key].push(p);
  });

  const handleExportDB = async () => {
      const history = await loadProductionsFromDB();
      if (history.length === 0) return alert("No hay producciones para exportar.");
      const dataStr = JSON.stringify(history, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      saveAs(blob, `RCM_Producciones_BD_${currentMonthStr}.json`);
      setShowActionsMenu(false);
  };

  const handleLoadDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const text = await file.text();
      try {
          const parsed = JSON.parse(text) as Production[];
          if (!Array.isArray(parsed)) throw new Error("Invalid format");
          for (const prod of parsed) {
              await saveProductionToDB(prod);
          }
          await fetchProductions();
          alert("Base de datos cargada correctamente.");
      } catch (err) {
          alert("Error al cargar la base de datos. Asegúrese de que sea un archivo JSON válido.");
      }
      e.target.value = '';
      setShowActionsMenu(false);
  };

  const handleClearAll = async () => {
      if (stockMensual.length === 0) return alert("No hay producciones en el stock mensual para limpiar.");
      if (window.confirm("¿Estás seguro de que deseas eliminar TODAS las producciones del mes actual? Esta acción no se puede deshacer.")) {
          for (const prod of stockMensual) {
              await deleteProductionFromDB(prod.id);
          }
          await fetchProductions();
          alert("Todas las producciones del mes han sido eliminadas.");
      }
      setShowActionsMenu(false);
  };

  const getExpectedDaysForProgram = (program: string, year: number, month: number) => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const expectedDates: string[] = [];
      
      let allowedDays: number[] = [];
      if (program.includes("Lunes a Viernes") || ["Todos en Casa", "Arte Bayamo", "Parada Joven", "Hablando con Juana", "Al Son de la Radio", "Sigue a tu Ritmo"].includes(program)) {
          allowedDays = [1, 2, 3, 4, 5];
      } else if (program.includes("Sábado")) {
          allowedDays = [6];
      } else if (["Buenos Días Bayamo", "Buenos Días, Bayamo"].includes(program)) {
          allowedDays = [1, 2, 3, 4, 5, 6];
      } else if (["Cómplices", "Estación 95.3", "Palco de Domingo", "Coloreando Melodías", "Alba y Crisol"].includes(program)) {
          allowedDays = [0];
      } else {
          allowedDays = [1, 2, 3, 4, 5, 6, 0];
      }

      for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(year, month - 1, day);
          if (allowedDays.includes(d.getDay())) {
              expectedDates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
          }
      }
      return expectedDates;
  };

  const getBalanceData = () => {
      return BALANCE_PROGRAMS.map(prog => {
          const expectedDates = getExpectedDaysForProgram(prog, currentYear, currentMonth);
          
          const prods = stockMensual.filter(p => {
              if (!p) return false;
              const pName = (p.program || '').toString().toLowerCase();
              const progLower = prog.toLowerCase();
              if (progLower === "buenos días bayamo" && pName === "buenos días, bayamo") return true;
              if (progLower === "la cumbancha (lunes a viernes)" && pName === "la cumbancha") {
                  const d = new Date((p.date || '') + 'T12:00:00');
                  return !isNaN(d.getTime()) && d.getDay() >= 1 && d.getDay() <= 5;
              }
              if (progLower === "la cumbancha sábado" && pName === "la cumbancha") {
                  const d = new Date((p.date || '') + 'T12:00:00');
                  return !isNaN(d.getTime()) && d.getDay() === 6;
              }
              return pName === progLower;
          });

          const completedDates = prods.map(p => p.date).filter(Boolean);
          const missingDates = expectedDates.filter(d => !completedDates.includes(d));

          return {
              program: prog,
              required: expectedDates.length,
              completed: completedDates.length,
              missing: expectedDates.length - completedDates.length,
              missingDates
          };
      });
  };

  const handleExportAuditDOCX = async (programData: any) => {
      const doc = new Document({
          sections: [{
              properties: {},
              children: [
                  new Paragraph({ text: `AUDITORÍA DE METAS - ${programData.program}`, heading: "Heading1", alignment: AlignmentType.CENTER }),
                  new Paragraph({ text: `Mes: ${currentMonthName} ${currentYear}`, alignment: AlignmentType.CENTER }),
                  new Paragraph({ text: "" }),
                  new Paragraph({ text: `Producciones Requeridas: ${programData.required}` }),
                  new Paragraph({ text: `Producciones Realizadas: ${programData.completed}` }),
                  new Paragraph({ text: `Producciones Faltantes: ${programData.missing}` }),
                  new Paragraph({ text: "" }),
                  new Paragraph({ text: "Fechas Faltantes:", heading: "Heading2" }),
                  ...programData.missingDates.map((d: string) => new Paragraph({ text: `• ${d}` }))
              ]
          }]
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Auditoria_${programData.program.replace(/[^a-z0-9]/gi, '_')}_${currentMonthStr}.docx`);
  };

  return (
    <div id="productions-container" className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-[#9E7649]">playlist_add</span> 
            Control de Producciones
        </h2>

        {/* Tabs */}
        <div className="flex bg-[#2C1B15] rounded-xl p-1 mb-6">
            <button 
                onClick={() => setActiveTab('intro')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'intro' ? 'bg-[#9E7649] text-white shadow' : 'text-[#E8DCCF]/60 hover:text-white'}`}
            >
                Introducción
            </button>
            <button 
                onClick={() => setActiveTab('stock')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'stock' ? 'bg-[#9E7649] text-white shadow' : 'text-[#E8DCCF]/60 hover:text-white'}`}
            >
                Stock Mensual
            </button>
            <button 
                onClick={() => setActiveTab('archive')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'archive' ? 'bg-[#9E7649] text-white shadow' : 'text-[#E8DCCF]/60 hover:text-white'}`}
            >
                Archivo
            </button>
        </div>

        {activeTab === 'intro' && (
            <>
                <div className="bg-[#2C1B15] p-6 rounded-2xl shadow-sm border border-[#9E7649]/20 mb-6">
                    <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">Datos del Programa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-[#E8DCCF]/60 mb-1">Fecha</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="w-full p-2 border border-[#9E7649]/30 rounded-lg bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#E8DCCF]/60 mb-1">Programa</label>
                            <select 
                                value={program} 
                                onChange={e => setProgram(e.target.value)} 
                                className="w-full p-2 border border-[#9E7649]/30 rounded-lg bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]"
                            >
                                {DEFAULT_PROGRAMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">
                        {editingTrackIndex !== null ? 'Editando Créditos' : 'Créditos de Archivo'}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Título</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm" value={currentTrack?.title || ''} onChange={e => setCurrentTrack({...currentTrack, title: e.target.value})} placeholder="Nombre del tema" />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Género</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm" list="genre-options" value={currentTrack?.genre || ''} onChange={e => setCurrentTrack({...currentTrack, genre: e.target.value})} placeholder="Ej: Salsa" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-3 bg-[#1A100C] p-3 rounded-xl border border-dashed border-[#9E7649]/30">
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Autor</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" value={currentTrack?.author || ''} onChange={e => setCurrentTrack({...currentTrack, author: e.target.value})} />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Autor</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" list="country-options" value={currentTrack?.authorCountry || ''} onChange={e => setCurrentTrack({...currentTrack, authorCountry: e.target.value})} />
                            </div>
                            
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Intérprete</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" value={currentTrack?.performer || ''} onChange={e => setCurrentTrack({...currentTrack, performer: e.target.value})} />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Intérprete</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" list="country-options" value={currentTrack?.performerCountry || ''} onChange={e => setCurrentTrack({...currentTrack, performerCountry: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleAddTrack} className="flex-1 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">{editingTrackIndex !== null ? 'save' : 'add_circle'}</span> 
                                {editingTrackIndex !== null ? 'Guardar Cambios' : 'Agregar Tema'}
                            </button>
                            {editingTrackIndex !== null && (
                                <button onClick={() => {
                                    setEditingTrackIndex(null);
                                    setCurrentTrack({id: '', title: '', author: '', authorCountry: '', performer: '', performerCountry: '', genre: ''});
                                }} className="bg-[#2C1B15] hover:bg-[#3E1E16] text-[#E8DCCF] font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center">
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 mb-6">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h4 className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-widest">Temas en esta producción ({sessionTracks.length})</h4>
                        {sessionTracks.length > 0 && <button onClick={() => setSessionTracks([])} className="text-xs text-red-400 hover:underline">Limpiar todo</button>}
                    </div>
                    
                    <div className="space-y-2">
                        {sessionTracks.map((t, idx) => {
                            if (!t) return null;
                            return (
                            <div key={idx} className={`bg-[#2C1B15] p-3 rounded-xl border flex items-center justify-between shadow-sm ${editingTrackIndex === idx ? 'border-[#9E7649]' : 'border-[#9E7649]/20'}`}>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate text-white">{t.title || 'Sin título'}</p>
                                    <p className="text-[10px] text-[#E8DCCF]/60 truncate">{t.performer || 'Desconocido'} • {t.genre || 'Sin género'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEditTrack(idx)} className="text-[#E8DCCF]/60 hover:text-[#9E7649] p-1">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button onClick={() => setSessionTracks(prev => prev.filter((_, i) => i !== idx))} className="text-[#E8DCCF]/40 hover:text-red-400 p-1">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            </div>
                        )})}
                        {sessionTracks.length === 0 && (
                            <div className="p-8 border-2 border-dashed border-[#9E7649]/20 rounded-2xl text-center text-[#E8DCCF]/40 text-xs">
                                Agrega temas arriba para comenzar la producción.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                     <label className="w-full bg-[#2C1B15] border border-[#9E7649]/30 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-[#3E1E16] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-[#9E7649]">upload_file</span> Cargar Producción desde TXT
                        <input type="file" accept=".txt" multiple onChange={handleImportTxt} className="hidden" />
                     </label>

                     <button onClick={handleSaveProduction} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-700 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">save</span> Guardar Producción (DB)
                     </button>
                </div>
            </>
        )}

        {activeTab === 'stock' && (
            <div className="space-y-4">
                <div className="bg-[#2C1B15] p-5 rounded-2xl border border-[#9E7649]/20 shadow-inner">
                    <h3 className="font-bold text-[#9E7649] text-[10px] uppercase tracking-widest mb-4 border-b border-[#9E7649]/10 pb-2 text-center sm:text-left">Resumen Mensual</h3>
                    <div className="grid grid-cols-4 gap-2 sm:gap-6">
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Mes</p>
                            <p className="font-bold text-white text-sm sm:text-lg truncate w-full text-center sm:text-left">{currentMonthName}</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Plan</p>
                            <p className="font-bold text-white text-sm sm:text-lg">{getBalanceData().reduce((acc, curr) => acc + curr.required, 0)}</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Real</p>
                            <p className="font-bold text-green-400 text-sm sm:text-lg">{getBalanceData().reduce((acc, curr) => acc + curr.completed, 0)}</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Resto</p>
                            <p className="font-bold text-red-400 text-sm sm:text-lg">{getBalanceData().reduce((acc, curr) => acc + curr.missing, 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-6 border-b border-[#9E7649]/20 pb-6">
                    <h3 className="font-bold text-white text-xs uppercase tracking-widest hidden sm:block">En Stock</h3>
                    <div className="flex gap-4 w-full sm:w-auto justify-center px-2">
                        <button 
                            onClick={() => setShowBalanceModal(true)} 
                            className="flex-1 sm:flex-none bg-[#9E7649] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#8B653D] flex items-center justify-center gap-2 text-xs shadow-lg transition-all active:scale-95"
                        >
                            <Activity size={18} /> Balance
                        </button>
                        
                        <div className="relative flex-1 sm:flex-none">
                            <button 
                                onClick={() => setShowActionsMenu(!showActionsMenu)} 
                                className="w-full bg-[#2C1B15] border border-[#9E7649]/30 text-white font-bold py-3 px-6 rounded-xl hover:bg-[#3E1E16] flex items-center justify-center gap-2 text-xs transition-all active:scale-95"
                            >
                                Acciones <ChevronDown size={18} />
                            </button>
                            
                            {showActionsMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button onClick={() => { handleGenerateDetailedStatsDOCX(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <FileText size={14} className="text-blue-400" /> Informe
                                    </button>
                                    <button onClick={handleExportDB} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <Database size={14} className="text-green-400" /> Exportar BD
                                    </button>
                                    <button onClick={() => { fileInputRef.current?.click(); }} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <Upload size={14} className="text-yellow-400" /> Cargar BD
                                    </button>
                                    <button onClick={() => { handleMoveToArchive(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <Archive size={14} className="text-purple-400" /> Pasar Archivo
                                    </button>
                                    <div className="border-t border-[#9E7649]/20 my-1"></div>
                                    <button onClick={handleClearAll} className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-900/30 flex items-center gap-2">
                                        <Trash2 size={14} /> Limpiar Todo
                                    </button>
                                </div>
                            )}
                        </div>
                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleLoadDB} className="hidden" />
                    </div>
                </div>
                {stockMensual.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[#9E7649]/20 rounded-2xl text-center text-[#E8DCCF]/40 text-xs">
                        No hay producciones guardadas en este mes.
                    </div>
                ) : (
                    stockMensual.map(prod => {
                        if (!prod) return null;
                        return (
                        <div key={prod.id || Math.random()} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{prod.program || 'Sin programa'}</h4>
                                    <p className="text-xs text-[#E8DCCF]/60">{prod.date || 'Sin fecha'} • {prod.tracks?.length || 0} temas</p>
                                </div>
                                <button onClick={() => prod.id && handleDeleteProduction(prod.id)} className="text-red-400 hover:text-red-300 p-1">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                            <div className="mt-3 space-y-1">
                                {(prod.tracks || []).slice(0, 3).map((t, i) => (
                                    <p key={i} className="text-[10px] text-[#E8DCCF]/80 truncate">• {t?.title || 'Sin título'} - {t?.author || 'Desconocido'}</p>
                                ))}
                                {(prod.tracks || []).length > 3 && (
                                    <p className="text-[10px] text-[#9E7649] italic">...y {(prod.tracks || []).length - 3} temas más</p>
                                )}
                            </div>
                        </div>
                    )})
                )}
            </div>
        )}

        {activeTab === 'archive' && (
            <div className="space-y-6">
                <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">Archivo Histórico</h3>
                {Object.keys(archivoPorMes).length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[#9E7649]/20 rounded-2xl text-center text-[#E8DCCF]/40 text-xs">
                        No hay producciones archivadas de meses anteriores.
                    </div>
                ) : (
                    Object.keys(archivoPorMes).sort().reverse().map(month => (
                        <div key={month} className="space-y-3">
                            <h4 className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-widest sticky top-0 bg-[#1A100C] py-2 z-10">{month}</h4>
                            {archivoPorMes[month].map(prod => {
                                if (!prod) return null;
                                return (
                                <div key={prod.id || Math.random()} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{prod.program || 'Sin programa'}</h4>
                                            <p className="text-xs text-[#E8DCCF]/60">{prod.date || 'Sin fecha'} • {prod.tracks?.length || 0} temas</p>
                                        </div>
                                        <button onClick={() => prod.id && handleDeleteProduction(prod.id)} className="text-red-400 hover:text-red-300 p-1">
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ))
                )}
            </div>
        )}

        <datalist id="genre-options">
            {GENRES_LIST.map(g => <option key={g} value={g} />)}
        </datalist>
        <datalist id="country-options">
            {COUNTRIES_LIST.map(c => <option key={c} value={c} />)}
        </datalist>

        {showBalanceModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
                <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center p-6 border-b border-[#9E7649]/20">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-[#9E7649]" /> Balance Mensual de Producción ({currentMonthStr})
                        </h2>
                        <button onClick={() => setShowBalanceModal(false)} className="text-[#E8DCCF]/60 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                        <select 
                            value={selectedBalanceProgram || ''} 
                            onChange={e => setSelectedBalanceProgram(e.target.value)} 
                            className="w-full p-3 border border-[#9E7649]/30 rounded-lg bg-[#2C1B15] text-white text-sm outline-none focus:border-[#9E7649] mb-4"
                        >
                            <option value="">Seleccione un programa...</option>
                            {BALANCE_PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        {selectedBalanceProgram && getBalanceData().filter(d => d.program === selectedBalanceProgram).map((data, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#2C1B15] p-4 rounded-lg text-center">
                                        <p className="text-xs text-[#E8DCCF]/60 uppercase">Plan</p>
                                        <p className="text-2xl font-bold text-white">{data.required}</p>
                                    </div>
                                    <div className="bg-[#2C1B15] p-4 rounded-lg text-center">
                                        <p className="text-xs text-[#E8DCCF]/60 uppercase">Real</p>
                                        <p className="text-2xl font-bold text-green-400">{data.completed}</p>
                                    </div>
                                    <div className="bg-[#2C1B15] p-4 rounded-lg text-center">
                                        <p className="text-xs text-[#E8DCCF]/60 uppercase">Resto</p>
                                        <p className="text-2xl font-bold text-red-400">{data.missing}</p>
                                    </div>
                                </div>

                                <div className="bg-[#2C1B15] p-4 rounded-lg">
                                    <p className="text-sm font-bold text-[#E8DCCF]/60 mb-2">Días faltantes:</p>
                                    <div className="text-sm text-white space-y-1">
                                        {data.missingDates.map(d => <p key={d}>{d}</p>)}
                                    </div>
                                </div>
                                
                                <div className="flex justify-between mt-6">
                                    <button onClick={() => handleExportAuditDOCX(data)} className="bg-[#9E7649] text-white px-4 py-2 rounded-lg text-sm font-bold">Generar DOCX</button>
                                    <button onClick={() => {
                                        let message = `*BALANCE ${data.program} - ${currentMonthStr}*\n\n*Plan:* ${data.required}\n*Real:* ${data.completed}\n*Resto:* ${data.missing}\n\n*Días faltantes:*\n${data.missingDates.join('\n')}`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                    }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Compartir WhatsApp</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Productions;
