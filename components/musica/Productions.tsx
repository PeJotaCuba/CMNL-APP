import React, { useEffect, useState } from 'react';
import { Track, Production, PROGRAMS_LIST } from './types';
import { GENRES_LIST, COUNTRIES_LIST } from './constants';
import * as XLSX from 'xlsx';
import { saveProductionToDB, loadProductionsFromDB } from './services/db';
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

const Productions: React.FC<ProductionsProps> = ({ }) => {
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

  useEffect(() => {
  }, []);

  const handleAddTrack = () => {
      if (!currentTrack.title || !currentTrack.author || !currentTrack.performer) {
          alert("Título, Autor e Intérprete son obligatorios.");
          return;
      }
      setSessionTracks(prev => [...prev, { ...currentTrack, id: `temp-${Date.now()}` }]);
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
      } catch (e) {
          alert("Error guardando producción.");
      }
  };

  const handleImportTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const text = await file.text();
      
      const lines = text.split('\n');
      let parsedDate = '';
      let parsedProgram = '';
      const parsedTracks: TempTrack[] = [];
      let current: Partial<TempTrack> = {};

      const saveCurrent = () => {
          if (current.title && current.author && current.performer) {
               parsedTracks.push({
                   id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                   title: current.title,
                   author: current.author,
                   authorCountry: current.authorCountry || '',
                   performer: current.performer,
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
              parsedDate = d;
          } else if (lower.startsWith('programa:')) {
              parsedProgram = l.substring(9).trim();
          } else if (/\d+\.\s*titulo:/.test(lower) || lower.startsWith('titulo:')) {
              saveCurrent();
              const val = l.replace(/^\d+\.\s*/, '').replace(/^titulo:\s*/i, '').trim();
              current.title = val;
          } else if (lower.startsWith('autor:')) {
              current.author = l.substring(6).trim();
          } else if (lower.startsWith('intérprete:') || lower.startsWith('interprete:')) {
               current.performer = l.substring(l.indexOf(':') + 1).trim();
          } else if (lower.startsWith('país:') || lower.startsWith('pais:')) {
               const val = l.substring(5).trim();
               if (current.performer) {
                   current.performerCountry = val;
               } else {
                   current.authorCountry = val;
               }
          } else if (lower.startsWith('género:') || lower.startsWith('genero:')) {
               current.genre = l.substring(l.indexOf(':') + 1).trim();
          }
      });
      saveCurrent();

      if (parsedTracks.length === 0) {
          alert("No se encontraron temas válidos en el archivo TXT.");
          e.target.value = '';
          return;
      }

      const newProd: Production = {
          id: `prod-${Date.now()}`,
          date: parsedDate || new Date().toISOString().split('T')[0],
          program: parsedProgram || 'Sin Nombre',
          tracks: parsedTracks
      };

      try {
          await saveProductionToDB(newProd);
          alert(`Producción "${newProd.program}" importada y guardada con ${parsedTracks.length} temas.`);
          setDate(newProd.date);
          setProgram(newProd.program);
          setSessionTracks([]); 
      } catch (err) {
          alert("Error guardando la producción importada.");
          console.error(err);
      }
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

  return (
    <div className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-[#9E7649]">playlist_add</span> 
            Control de Producciones
        </h2>

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

            <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">Créditos de Archivo</h3>
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

                <button onClick={handleAddTrack} className="mt-2 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">add_circle</span> Agregar Tema
                </button>
            </div>
        </div>

        <div className="flex-1 mb-6">
            <div className="flex justify-between items-center mb-2 px-1">
                <h4 className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-widest">Temas en esta producción ({sessionTracks.length})</h4>
                {sessionTracks.length > 0 && <button onClick={() => setSessionTracks([])} className="text-xs text-red-400 hover:underline">Limpiar todo</button>}
            </div>
            
            <div className="space-y-2">
                {sessionTracks.map((t, idx) => (
                    <div key={idx} className="bg-[#2C1B15] p-3 rounded-xl border border-[#9E7649]/20 flex items-center justify-between shadow-sm">
                        <div className="min-w-0">
                            <p className="font-bold text-sm truncate text-white">{t.title}</p>
                            <p className="text-[10px] text-[#E8DCCF]/60 truncate">{t.performer} • {t.genre}</p>
                        </div>
                        <button onClick={() => setSessionTracks(prev => prev.filter((_, i) => i !== idx))} className="text-[#E8DCCF]/40 hover:text-red-400"><span className="material-symbols-outlined text-sm">close</span></button>
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
                <input type="file" accept=".txt" onChange={handleImportTxt} className="hidden" />
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
