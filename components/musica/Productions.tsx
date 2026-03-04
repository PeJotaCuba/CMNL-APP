import React, { useEffect, useState } from 'react';
import { Track, Production, PROGRAMS_LIST } from './types';
import { GENRES_LIST, COUNTRIES_LIST } from './constants';
import * as XLSX from 'xlsx';
import { saveProductionToDB, loadProductionsFromDB, deleteProductionFromDB } from './services/db';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";

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
  const [program, setProgram] = useState(PROGRAMS_LIST[0]);
  
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
      const files = Array.from(e.target.files);
      
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
      if (PROGRAMS_LIST.includes(lastParsedProgram)) {
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
          prod.tracks.forEach(t => {
              rows.push({
                  Fecha: prod.date,
                  Programa: prod.program,
                  Título: t.title,
                  Autor: t.author,
                  "País Autor": t.authorCountry,
                  Intérprete: t.performer,
                  "País Intérprete": t.performerCountry,
                  Género: t.genre
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
        ...sessionTracks.map(t => new TableRow({
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
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Produccion_${program}_${date}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const getYearMonth = (dateStr: string) => {
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
      return year === currentYear && month === currentMonth;
  });
  
  const archivo = dbProductions.filter(p => {
      const { year, month } = getYearMonth(p.date);
      return !(year === currentYear && month === currentMonth);
  });

  // Agrupar archivo por mes (usando el formato normalizado YYYY-MM)
  const archivoPorMes: Record<string, Production[]> = {};
  archivo.forEach(p => {
      const { key } = getYearMonth(p.date);
      if (!archivoPorMes[key]) archivoPorMes[key] = [];
      archivoPorMes[key].push(p);
  });

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
                                {PROGRAMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
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

                     <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#9E7649]/20">
                        <button onClick={handleExportHistoryCSV} className="bg-[#2C1B15] border border-[#9E7649]/30 text-white font-bold py-3 rounded-xl hover:bg-[#3E1E16] flex items-center justify-center gap-2 text-xs">
                            <span className="material-symbols-outlined text-green-500">table_view</span> Exportar Histórico CSV
                        </button>
                        <button onClick={handleGenerateDOCX} className="bg-[#2C1B15] border border-[#9E7649]/30 text-white font-bold py-3 rounded-xl hover:bg-[#3E1E16] flex items-center justify-center gap-2 text-xs">
                            <span className="material-symbols-outlined text-blue-400">description</span> Informe DOCX (Sesión)
                        </button>
                     </div>
                </div>
            </>
        )}

        {activeTab === 'stock' && (
            <div className="space-y-4">
                <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">Producciones del Mes ({currentMonthStr})</h3>
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
                                    <p className="text-xs text-[#E8DCCF]/60">{prod.date} • {prod.tracks.length} temas</p>
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
                                            <p className="text-xs text-[#E8DCCF]/60">{prod.date} • {prod.tracks.length} temas</p>
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
    </div>
  );
};

export default Productions;
