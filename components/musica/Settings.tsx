import React, { useState, useEffect } from 'react';
import { Track, User, DEFAULT_PROGRAMS_LIST } from './types';
import { INITIAL_FICHAS } from '../../utils/fichasData';
import { sortAndStandardizePrograms, normalizeProgramName, getActiveProgramsFromStorage } from './programUtils';
import * as XLSX from 'xlsx';

const PROGRAMS_KEY = 'rcm_programs_list';

interface SettingsProps {
  tracks: Track[];
  currentUser?: User | null;
  onSaveCMNL?: () => void;
  programs?: string[];
  onProgramsChange?: (programs: string[]) => void;
  // Legacy optional props to prevent breaking callers if passed
  users?: User[];
  onAddUser?: (u: User) => void;
  onEditUser?: (u: User, originalUsername?: string) => void;
  onDeleteUser?: (username: string) => void;
  onExportUsers?: () => void;
  onImportUsers?: (users: User[]) => void;
}

const Settings: React.FC<SettingsProps> = ({
  tracks,
  currentUser,
  onSaveCMNL,
  programs: initialProgramsProp,
  onProgramsChange
}) => {
  const [programs, setPrograms] = useState<string[]>(() => {
    let baseList: string[] = [];
    if (initialProgramsProp && initialProgramsProp.length > 0) {
      baseList = initialProgramsProp;
    } else {
      baseList = getActiveProgramsFromStorage();
    }
    return sortAndStandardizePrograms(baseList);
  });

  const [fichasProgramsList, setFichasProgramsList] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'fichas'>('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Sync if initialProp changes
  useEffect(() => {
    if (initialProgramsProp && initialProgramsProp.length > 0) {
      setPrograms(sortAndStandardizePrograms(initialProgramsProp));
    }
  }, [initialProgramsProp]);

  // Load programs from Fichas (rcm_data_fichas + INITIAL_FICHAS)
  useEffect(() => {
    const namesSet = new Set<string>();

    // 1. From localStorage rcm_data_fichas
    try {
      const savedFichas = localStorage.getItem('rcm_data_fichas');
      if (savedFichas) {
        const parsed = JSON.parse(savedFichas);
        if (Array.isArray(parsed)) {
          parsed.forEach((f: any) => {
            if (f && f.name && typeof f.name === 'string' && f.name.trim()) {
              namesSet.add(f.name.trim());
            }
          });
        }
      }
    } catch (e) {
      console.error("Error reading rcm_data_fichas", e);
    }

    // 2. From INITIAL_FICHAS
    INITIAL_FICHAS.forEach(f => {
      if (f && f.name && f.name.trim()) {
        namesSet.add(f.name.trim());
      }
    });

    // 3. Ensure any program currently in `programs` is included
    programs.forEach(p => {
      if (p && p.trim()) {
        namesSet.add(p.trim());
      }
    });

    const sortedList = sortAndStandardizePrograms(Array.from(namesSet));
    setFichasProgramsList(sortedList);
  }, [programs]);

  const handleUpdatePrograms = (newProgramsList: string[]) => {
    const sortedList = sortAndStandardizePrograms(newProgramsList);
    setPrograms(sortedList);
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(sortedList));

    if (onProgramsChange) {
      onProgramsChange(sortedList);
    }

    // Trigger save to actualcmnl.json for all users
    if (onSaveCMNL) {
      onSaveCMNL();
    }

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const toggleProgram = (programName: string) => {
    const normTarget = normalizeProgramName(programName);
    const isCurrentlyActive = programs.some(p => normalizeProgramName(p) === normTarget);
    if (isCurrentlyActive) {
      handleUpdatePrograms(programs.filter(p => normalizeProgramName(p) !== normTarget));
    } else {
      handleUpdatePrograms([...programs, programName]);
    }
  };

  const downloadCreditStats = () => {
    const dataTracks = tracks;
    if (dataTracks.length === 0) {
      alert("No hay pistas en la base de datos.");
      return;
    }
    const totalTracks = dataTracks.length;
    const countUnique = (field: keyof typeof dataTracks[0]['metadata']) => {
      const s = new Set<string>();
      dataTracks.forEach(t => {
        if (t.metadata[field] && t.metadata[field] !== 'Desconocido') s.add(t.metadata[field] as string);
      });
      return s.size;
    };
    const totalAuthors = countUnique('author');
    const totalPerformers = countUnique('performer');
    const getDistribution = (field: keyof typeof dataTracks[0]['metadata']) => {
      const counts: Record<string, number> = {};
      dataTracks.forEach(t => {
        const val = (t.metadata[field] as string) || 'Sin Especificar';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    };
    const genres = getDistribution('genre');
    const authorCountries = getDistribution('authorCountry');
    const performerCountries = getDistribution('performerCountry');

    const sheet1Rows: any[] = [];
    sheet1Rows.push(["REPORTE GENERAL DE ESTADÍSTICAS RCM"]);
    sheet1Rows.push([""]);
    sheet1Rows.push(["TOTALES"]);
    sheet1Rows.push(["Cantidad de Temas Musicales", totalTracks]);
    sheet1Rows.push(["Cantidad de Autores Únicos", totalAuthors]);
    sheet1Rows.push(["Cantidad de Intérpretes Únicos", totalPerformers]);
    sheet1Rows.push([""]);
    const addSection = (title: string, data: [string, number][], header1: string) => {
      sheet1Rows.push([title]);
      sheet1Rows.push([header1, "Cantidad"]);
      data.forEach(([key, val]) => sheet1Rows.push([key, val]));
      sheet1Rows.push([""]);
    };
    addSection("GÉNEROS MUSICALES", genres, "Género");
    addSection("PAÍSES DE AUTORES", authorCountries, "País");
    addSection("PAÍSES DE INTÉRPRETES", performerCountries, "País");
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    const detailData = dataTracks.map(t => ({ Título: t.metadata.title, Autor: t.metadata.author, Intérprete: t.metadata.performer, Ruta: t.path }));
    const ws2 = XLSX.utils.json_to_sheet(detailData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws1, "Estadísticas");
    XLSX.utils.book_append_sheet(workbook, ws2, "Detalle de Temas");
    XLSX.writeFile(workbook, "RCM_Reporte_Completo.xlsx");
  };

  // Filtered list of Fichas programs for the interactive selection box
  const availableFichasNotActive = fichasProgramsList.filter(p => !programs.some(prog => normalizeProgramName(prog) === normalizeProgramName(p)));

  const filteredPrograms = fichasProgramsList.filter(p => {
    const matchesText = p.toLowerCase().includes(filterText.toLowerCase());
    if (!matchesText) return false;
    if (filterTab === 'active') return programs.some(prog => normalizeProgramName(prog) === normalizeProgramName(p));
    if (filterTab === 'fichas') return !programs.some(prog => normalizeProgramName(prog) === normalizeProgramName(p));
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#1A100C] p-4 sm:p-6 overflow-y-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#9E7649]">settings</span>
            Ajustes de Música
          </h2>
          <p className="text-xs text-[#E8DCCF]/60 mt-1">
            Gestión de catálogo musical y catálogo de programas vinculados a Fichas
          </p>
        </div>
        {saveSuccessMsg && (
          <div className="bg-green-900/80 text-green-200 text-xs px-3 py-1.5 rounded-xl border border-green-500/40 flex items-center gap-1.5 animate-fade-in shadow-lg">
            <span className="material-symbols-outlined text-sm text-green-400">check_circle</span>
            Guardado en actualcmnl.json
          </div>
        )}
      </div>

      {/* 1. Base de Datos Musical (Excel & Tracks Count) */}
      <div className="mb-8 p-6 bg-[#2C1B15] rounded-2xl shadow-sm border border-[#9E7649]/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#9E7649]">library_music</span>
              Base de Datos Musical
            </h3>
            <p className="text-xs text-[#E8DCCF]/60">Estadísticas y reportes del catálogo musical activo</p>
          </div>
          <span className="bg-[#9E7649]/20 text-[#E8DCCF] border border-[#9E7649]/40 px-3 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-[#9E7649]">music_note</span>
            {tracks.length} Pistas
          </span>
        </div>
        <button
          onClick={downloadCreditStats}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors w-full sm:w-auto justify-center shadow-md"
        >
          <span className="material-symbols-outlined">table_view</span>
          Descargar Reporte Excel
        </button>
      </div>

      {/* 2. Gestión de Programas (Vinculado a Fichas) */}
      <div className="p-6 bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#9E7649]/20 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#9E7649]">playlist_add_check</span>
              Gestión de Programas para Producción Musical
            </h3>
            <p className="text-xs text-[#E8DCCF]/70 mt-1">
              Vinculado a las <b>Fichas Técnicas</b> de la sección Gestión. Marque o desmarque programas para habilitarlos o deshabilitarlos en Producción Musical. Los cambios se guardan en <b>actualcmnl.json</b>.
            </p>
          </div>
          <span className="bg-[#9E7649] text-white px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-sm">radio</span>
            {programs.length} Programas Activos
          </span>
        </div>



        {/* Selector interactivo con checkboxes (Cuadro de selección donde se marcan y desmarcan programas de Fichas) */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#9E7649]">checklist</span>
              Programas de Fichas Técnicas (Marque para activar / Desmarque para desactivar)
            </h4>

            {/* Sub-filtros */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  placeholder="Buscar programa..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#1A100C] border border-[#9E7649]/30 text-white text-xs outline-none focus:border-[#9E7649]"
                />
                <span className="material-symbols-outlined absolute left-2 top-1.5 text-sm text-[#E8DCCF]/40">search</span>
              </div>
              <div className="flex bg-[#1A100C] p-1 rounded-lg border border-[#9E7649]/20 text-[11px] font-bold">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded ${filterTab === 'all' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}
                >
                  Todos ({fichasProgramsList.length})
                </button>
                <button
                  onClick={() => setFilterTab('active')}
                  className={`px-2.5 py-1 rounded ${filterTab === 'active' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}
                >
                  Activos ({programs.length})
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-3 bg-[#1A100C] rounded-xl border border-[#9E7649]/20">
            {filteredPrograms.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-[#E8DCCF]/50">
                No se encontraron programas con el filtro especificado.
              </div>
            ) : (
              filteredPrograms.map(prog => {
                const isActive = programs.some(p => normalizeProgramName(p) === normalizeProgramName(prog));
                return (
                  <div
                    key={prog}
                    onClick={() => toggleProgram(prog)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                      isActive
                        ? 'bg-[#9E7649]/20 border-[#9E7649] text-white shadow-sm'
                        : 'bg-[#2C1B15] border-[#9E7649]/10 text-[#E8DCCF]/70 hover:border-[#9E7649]/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`size-5 rounded flex items-center justify-center shrink-0 text-xs font-bold ${
                        isActive ? 'bg-[#9E7649] text-white' : 'border border-[#9E7649]/40 bg-[#1A100C]'
                      }`}>
                        {isActive && <span className="material-symbols-outlined text-xs">check</span>}
                      </div>
                      <span className="text-xs font-bold truncate">{prog}</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                      isActive ? 'bg-[#9E7649] text-white' : 'bg-[#1A100C] text-[#E8DCCF]/40 border border-[#9E7649]/20'
                    }`}>
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
