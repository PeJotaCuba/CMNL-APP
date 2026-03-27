import React, { useEffect, useState } from 'react';
import { Track, Production, DEFAULT_PROGRAMS_LIST, User } from './types';
import { GENRES_LIST, COUNTRIES_LIST } from './constants';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { saveProductionToDB, loadProductionsFromDB, deleteProductionFromDB, bulkUpdateProductions } from './services/db';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";

interface ProductionsProps {
  onUpdateTracks: (updateFunc: (prev: Track[]) => Track[]) => void;
  allTracks?: Track[];
  currentUser: User | null;
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

const Productions: React.FC<ProductionsProps> = ({ onUpdateTracks, allTracks, currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('intro');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [program, setProgram] = useState(DEFAULT_PROGRAMS_LIST[0]);
  const [director, setDirector] = useState('');
  
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
  
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({isOpen: false, message: '', onConfirm: () => {}});
  const [alertDialog, setAlertDialog] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});

  const fetchProductions = async () => {
      const prods = await loadProductionsFromDB();
      setDbProductions(prods);
  };

  useEffect(() => {
      fetchProductions();
  }, [activeTab]);

  const handleAddTrack = () => {
      if (!currentTrack.title || !currentTrack.author || !currentTrack.performer) {
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
      setCurrentTrack(sessionTracks[index]);
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
          director,
          tracks: sessionTracks
      };

      try {
          await saveProductionToDB(newProduction);
          
          // Sincronización de Datos: Add tracks to the main music section
          onUpdateTracks(prev => {
              const newTracks: Track[] = sessionTracks.map(t => ({
                  id: `prod-track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  filename: `${t.title} - ${t.performer}.mp3`,
                  path: `Producciones/${program}/${date}`,
                  isVerified: true,
                  metadata: {
                      title: t.title,
                      author: t.author,
                      authorCountry: t.authorCountry,
                      performer: t.performer,
                      performerCountry: t.performerCountry,
                      genre: t.genre,
                      album: program,
                      year: date.split('-')[0]
                  }
              }));
              return [...prev, ...newTracks];
          });

          alert("Producción guardada correctamente y sincronizada con la sección de música.");
          setSessionTracks([]); 
          fetchProductions();
      } catch (e) {
          alert("Error guardando producción.");
      }
  };

  const handleDeleteProduction = async (id: string) => {
      if (window.confirm("¿Estás seguro de que deseas eliminar esta producción?")) {
          try {
              await deleteProductionFromDB(id);
              fetchProductions();
          } catch (e) {
              console.error("Error deleting production:", e);
              alert("Error al eliminar la producción.");
          }
      }
  };

  const handleImportTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files) as File[];
      
      if (files.length > 1) {
          let importedCount = 0;
          let allNewTracks: Track[] = [];
          
          for (const file of files) {
              const text = await file.text();
              const lines = text.split('\n');
              
              let fileTracks: TempTrack[] = [];
              let fileDate = date;
              let fileProgram = program;
              let fileDirector = '';
              let current: Partial<TempTrack> = {};

              const saveCurrent = () => {
                  if (current.title && (current.author || current.performer)) {
                       fileTracks.push({
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
                      fileDate = d;
                  } else if (lower.startsWith('programa:')) {
                      fileProgram = l.substring(9).trim();
                  } else if (lower.startsWith('director:')) {
                      fileDirector = l.substring(9).trim();
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

              if (fileTracks.length > 0) {
                  const newProduction: Production = {
                      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                      date: fileDate,
                      program: fileProgram,
                      director: fileDirector,
                      tracks: fileTracks
                  };
                  await saveProductionToDB(newProduction);
                  importedCount++;

                  const newTracks: Track[] = fileTracks.map(t => ({
                      id: `prod-track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                      filename: `${t.title} - ${t.performer}.mp3`,
                      path: `Producciones/${fileProgram}/${fileDate}`,
                      isVerified: true,
                      metadata: {
                          title: t.title,
                          author: t.author,
                          authorCountry: t.authorCountry,
                          performer: t.performer,
                          performerCountry: t.performerCountry,
                          genre: t.genre,
                          album: fileProgram,
                          year: fileDate.split('-')[0]
                      }
                  }));
                  allNewTracks = [...allNewTracks, ...newTracks];
              }
          }
          
          if (allNewTracks.length > 0) {
              onUpdateTracks(prev => [...prev, ...allNewTracks]);
          }
          
          alert(`Se han importado ${importedCount} producciones correctamente.`);
          fetchProductions();
          e.target.value = '';
          return;
      }

      // Single file logic
      let allParsedTracks: TempTrack[] = [];
      let lastParsedDate = date;
      let lastParsedProgram = program;
      let lastParsedDirector = director;

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
              } else if (lower.startsWith('director:')) {
                  lastParsedDirector = l.substring(9).trim();
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
      setDirector(lastParsedDirector);
      if (DEFAULT_PROGRAMS_LIST.includes(lastParsedProgram)) {
          setProgram(lastParsedProgram);
      }
      
      setSessionTracks(prev => [...prev, ...allParsedTracks]);
      alert(`Se han cargado ${allParsedTracks.length} temas a la sesión. Revisa y edita antes de guardar.`);
      
      e.target.value = ''; 
  };

  const handleExportDB = async () => {
      const history = await loadProductionsFromDB();
      if (history.length === 0) return alert("No hay producciones para exportar.");

      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      saveAs(blob, `RCM_Producciones_BD.json`);
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const content = evt.target?.result as string;
              const importedProductions = JSON.parse(content);

              if (!Array.isArray(importedProductions)) return alert("El archivo no tiene un formato válido.");

              const currentProductions = await loadProductionsFromDB();
              
              for (const importedProd of importedProductions) {
                  // Find if exists
                  const existingIndex = currentProductions.findIndex(p => p.date === importedProd.date && p.program === importedProd.program);
                  if (existingIndex !== -1) {
                      // Update: keep the existing ID
                      importedProd.id = currentProductions[existingIndex].id;
                      await saveProductionToDB(importedProd);
                  } else {
                      // Add: generate a new ID
                      importedProd.id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                      await saveProductionToDB(importedProd);
                  }
              }

              await fetchProductions();
              alert("Base de datos cargada correctamente.");
          } catch (error) {
              console.error("Error importing DB:", error);
              alert("Error al importar el archivo JSON.");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleGenerateMonthlyReportDOCX = async () => {
    if (stockMensual.length === 0) return alert("No hay producciones en el mes actual para generar el informe.");

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const allTracks = stockMensual.flatMap(p => p.tracks);
    
    // Stats calculations
    const cubanWorks = allTracks.filter(t => t.authorCountry.toLowerCase() === 'cuba' || t.performerCountry.toLowerCase() === 'cuba').length;
    const foreignWorks = allTracks.length - cubanWorks;

    const authors = allTracks.map(t => ({ name: t.author, country: t.authorCountry }));
    const performers = allTracks.map(t => ({ name: t.performer, country: t.performerCountry }));
    
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

    const tableRows = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "Título", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Aut/Int", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Países", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Género", style: "Strong" })] }),
            ],
        }),
        ...allTracks.map(t => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(t.title)] }),
                new TableCell({ children: [new Paragraph(`${t.author} / ${t.performer}`)] }),
                new TableCell({ children: [new Paragraph(`${t.authorCountry} / ${t.performerCountry}`)] }),
                new TableCell({ children: [new Paragraph(t.genre)] }),
            ],
        }))
    ];

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "INFORME MENSUAL DE PRODUCCIÓN MUSICAL - RCM", heading: "Heading1", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: `Mes: ${currentMonthStr}`, alignment: AlignmentType.CENTER }),
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
                new Paragraph({ text: "" }),

                new Paragraph({ text: "5. Detalle de Temas", heading: "Heading2" }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows,
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Informe_Mensual_Musica_${currentMonthStr}.docx`);
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

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const getYearMonth = (dateStr: any) => {
      if (typeof dateStr !== 'string') return { year: 0, month: 0, key: 'Desconocido' };
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
      }
      return { year: 0, month: 0, key: 'Desconocido' };
  };

  const stockMensual = dbProductions.filter(p => {
      const { year, month } = getYearMonth(p.date);
      return year === currentYear && month === currentMonth && !p.archived;
  });
  
  const archivo = dbProductions.filter(p => {
      const { year, month } = getYearMonth(p.date);
      return !(year === currentYear && month === currentMonth) || p.archived;
  });

  // Agrupar archivo por mes (usando el formato normalizado YYYY-MM)
  const archivoPorMes: Record<string, Production[]> = {};
  archivo.forEach(p => {
      const { key } = getYearMonth(p.date);
      if (!archivoPorMes[key]) archivoPorMes[key] = [];
      archivoPorMes[key].push(p);
  });

  return (
    <div id="productions-container" className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24 relative">
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
                        <div>
                            <label className="block text-xs font-bold text-[#E8DCCF]/60 mb-1">Director</label>
                            <input 
                                type="text" 
                                value={director} 
                                onChange={e => setDirector(e.target.value)} 
                                className="w-full p-2 border border-[#9E7649]/30 rounded-lg bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]"
                                placeholder="Nombre del director"
                            />
                        </div>
                    </div>

                    <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">
                        {editingTrackIndex !== null ? 'Editando Créditos' : 'Créditos de Archivo'}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Título</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm" value={currentTrack.title} onChange={e => setCurrentTrack({...currentTrack, title: e.target.value})} placeholder="Nombre del tema" />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Género</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm" list="genre-options" value={currentTrack.genre} onChange={e => setCurrentTrack({...currentTrack, genre: e.target.value})} placeholder="Ej: Salsa" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-3 bg-[#1A100C] p-3 rounded-xl border border-dashed border-[#9E7649]/30">
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Autor</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" value={currentTrack.author} onChange={e => setCurrentTrack({...currentTrack, author: e.target.value})} />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Autor</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" list="country-options" value={currentTrack.authorCountry} onChange={e => setCurrentTrack({...currentTrack, authorCountry: e.target.value})} />
                            </div>
                            
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Intérprete</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" value={currentTrack.performer} onChange={e => setCurrentTrack({...currentTrack, performer: e.target.value})} />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Intérprete</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" list="country-options" value={currentTrack.performerCountry} onChange={e => setCurrentTrack({...currentTrack, performerCountry: e.target.value})} />
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
                        {sessionTracks.map((t, idx) => (
                            <div key={idx} className={`bg-[#2C1B15] p-3 rounded-xl border flex items-center justify-between shadow-sm ${editingTrackIndex === idx ? 'border-[#9E7649]' : 'border-[#9E7649]/20'}`}>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate text-white">{t.title}</p>
                                    <p className="text-[10px] text-[#E8DCCF]/60 truncate">{t.performer} • {t.genre}</p>
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
                        ))}
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
                <div className="sticky top-0 z-20 bg-[#1A100C] flex justify-between items-center mb-4 border-b border-[#9E7649]/20 pb-2">
                    <h3 className="font-bold text-white">Producciones del Mes ({currentMonthStr}) - {stockMensual.length} cargadas</h3>
                    <div className="relative">
                        <button 
                            onClick={() => setIsActionsOpen(!isActionsOpen)}
                            className="bg-[#2C1B15] border border-[#9E7649]/30 text-white font-bold py-1 px-3 rounded-lg hover:bg-[#3E1E16] flex items-center gap-2 text-[10px]"
                        >
                            <span className="material-symbols-outlined text-sm">settings</span> Acciones
                        </button>
                        {isActionsOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-2 shadow-xl z-20 w-40 space-y-2">
                                <button 
                                    onClick={() => { handleGenerateMonthlyReportDOCX(); setIsActionsOpen(false); }} 
                                    className="w-full text-left text-white font-bold py-1 px-2 rounded hover:bg-[#3E1E16] flex items-center gap-2 text-[10px]"
                                >
                                    <span className="material-symbols-outlined text-blue-400 text-sm">description</span> Informe
                                </button>
                                <button 
                                    onClick={() => { handleExportDB(); setIsActionsOpen(false); }} 
                                    className="w-full text-left text-white font-bold py-1 px-2 rounded hover:bg-[#3E1E16] flex items-center gap-2 text-[10px]"
                                >
                                    <span className="material-symbols-outlined text-green-500 text-sm">download</span> Exportar BD
                                </button>
                                <label className="w-full text-left text-white font-bold py-1 px-2 rounded hover:bg-[#3E1E16] flex items-center gap-2 text-[10px] cursor-pointer">
                                    <span className="material-symbols-outlined text-green-400 text-sm">upload</span> Cargar BD
                                    <input type="file" accept=".json" onChange={(e) => { handleImportDB(e); setIsActionsOpen(false); }} className="hidden" />
                                </label>
                                <button 
                                    onClick={() => { handleMoveToArchive(); setIsActionsOpen(false); }} 
                                    className="w-full text-left text-red-200 font-bold py-1 px-2 rounded hover:bg-red-900/60 flex items-center gap-2 text-[10px]"
                                >
                                    <span className="material-symbols-outlined text-sm">archive</span> Pasar a archivo
                                </button>
                                {(currentUser?.username === 'admin' || currentUser?.classification === 'Administrador' || currentUser?.role === 'coordinador') && (
                                    <button 
                                        onClick={() => { if(confirm('¿Estás seguro de limpiar toda la lista de producciones?')) { onUpdateTracks([]); setIsActionsOpen(false); } }} 
                                        className="w-full text-left text-red-200 font-bold py-1 px-2 rounded hover:bg-red-900/60 flex items-center gap-2 text-[10px]"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete_sweep</span> Limpiar lista
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {stockMensual.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[#9E7649]/20 rounded-2xl text-center text-[#E8DCCF]/40 text-xs">
                        No hay producciones guardadas en este mes.
                    </div>
                ) : (
                    stockMensual.map(prod => (
                        <div key={prod.id} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{prod.program}</h4>
                                    <p className="text-xs text-[#E8DCCF]/60">{prod.date} • {prod.tracks.length} temas {prod.director ? `• Dir: ${prod.director}` : ''}</p>
                                </div>
                                <button onClick={() => handleDeleteProduction(prod.id)} className="text-red-400 hover:text-red-300 p-1">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                            <div className="mt-3 space-y-1">
                                {prod.tracks.slice(0, 3).map((t, i) => (
                                    <p key={i} className="text-[10px] text-[#E8DCCF]/80 truncate">• {t.title} - {t.author}</p>
                                ))}
                                {prod.tracks.length > 3 && (
                                    <p className="text-[10px] text-[#9E7649] italic">...y {prod.tracks.length - 3} temas más</p>
                                )}
                            </div>
                        </div>
                    ))
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
                            {archivoPorMes[month].map(prod => (
                                <div key={prod.id} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{prod.program}</h4>
                                            <p className="text-xs text-[#E8DCCF]/60">{prod.date} • {prod.tracks.length} temas {prod.director ? `• Dir: ${prod.director}` : ''}</p>
                                        </div>
                                        <button onClick={() => handleDeleteProduction(prod.id)} className="text-red-400 hover:text-red-300 p-1">
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
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

        {/* Custom Alert Dialog */}
        {alertDialog.isOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                    <h3 className="text-white font-bold mb-4">Aviso</h3>
                    <p className="text-[#E8DCCF]/80 text-sm mb-6 whitespace-pre-wrap">{alertDialog.message}</p>
                    <div className="flex justify-end">
                        <button onClick={() => setAlertDialog({isOpen: false, message: ''})} className="bg-[#9E7649] hover:bg-[#8B653D] text-white px-6 py-2 rounded-xl font-bold transition-colors">
                            Aceptar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Custom Confirm Dialog */}
        {confirmDialog.isOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                    <h3 className="text-white font-bold mb-4">Confirmar Acción</h3>
                    <p className="text-[#E8DCCF]/80 text-sm mb-6 whitespace-pre-wrap">{confirmDialog.message}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setConfirmDialog({isOpen: false, message: '', onConfirm: () => {}})} className="bg-transparent border border-[#9E7649]/30 text-white px-4 py-2 rounded-xl hover:bg-[#3E1E16] transition-colors">
                            Cancelar
                        </button>
                        <button onClick={() => {
                            confirmDialog.onConfirm();
                            setConfirmDialog({isOpen: false, message: '', onConfirm: () => {}});
                        }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold transition-colors">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Productions;
