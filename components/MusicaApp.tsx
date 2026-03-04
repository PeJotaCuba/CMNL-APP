import React, { useState, useEffect } from 'react';
import CMNLHeader from './CMNLHeader';
import { User as GlobalUser } from '../types';
import { Track, ViewState, AuthMode, User, PROGRAMS_LIST, Report, ExportItem, SavedSelection } from './musica/types';
import { parseTxtDatabase, GENRES_LIST, COUNTRIES_LIST } from './musica/constants';
import TrackList from './musica/TrackList';
import TrackDetail from './musica/TrackDetail';
import CreditResults from './musica/CreditResults';
import Settings from './musica/Settings';
import Productions from './musica/Productions';
import ReportsViewer from './musica/ReportsViewer';
import Guide from './musica/Guide';
import { loadTracksFromDB, saveTracksToDB, saveReportToDB, loadReportsFromDB, loadProductionsFromDB, saveProductionToDB } from './musica/services/db'; 
import { generateReportPDF } from './musica/services/pdfService';

const USERS_KEY = 'rcm_users_db';
const SELECTION_KEY = 'rcm_current_selection';
const SAVED_SELECTIONS_KEY = 'rcm_saved_selections';
const CUSTOM_ROOTS_KEY = 'rcm_custom_roots';

const USERS_DB_URL = 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/musuarios.json';

const ROOT_DB_CONFIG: Record<string, { url: string, filename: string }> = {
    'Música 1': { url: 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/mdatos1.json', filename: 'mdatos1.json' },
    'Música 2': { url: 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/mdatos2.json', filename: 'mdatos2.json' },
    'Música 3': { url: 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/mdatos3.json', filename: 'mdatos3.json' },
    'Música 4': { url: 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/mdatos4.json', filename: 'mdatos4.json' },
    'Música 5': { url: 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/mdatos5.json', filename: 'mdatos5.json' },
    'Otros':    { url: 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/motros.json', filename: 'motros.json' }
};

interface MusicaAppProps {
  currentUser: GlobalUser | null;
  onBack: () => void;
  onMenuClick: () => void;
}

const MusicaApp: React.FC<MusicaAppProps> = ({ currentUser: globalUser, onBack, onMenuClick }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [view, setView] = useState<ViewState>(ViewState.LIST);
  const [users, setUsers] = useState<User[]>([]);
  
  // Map global user to music app user
  const currentUser: User | null = globalUser ? {
      username: globalUser.username,
      password: globalUser.password || '',
      role: globalUser.role === 'admin' ? 'admin' : (globalUser.classification === 'Director' ? 'director' : 'user'),
      fullName: globalUser.name,
      phone: globalUser.mobile || '',
      uniqueId: `RCM-${globalUser.username.toUpperCase()}-0000`
  } : null;

  const authMode: AuthMode = currentUser ? currentUser.role : null;

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedTracksList, setSelectedTracksList] = useState<Track[]>([]);
  const [savedSelections, setSavedSelections] = useState<SavedSelection[]>([]);

  const [customRoots, setCustomRoots] = useState<string[]>([]);
  
  const [showWishlist, setShowWishlist] = useState(false);
  const [wishlistText, setWishlistText] = useState('');

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);
  const [programName, setProgramName] = useState(PROGRAMS_LIST[0]);
  const [editingReportId, setEditingReportId] = useState<string | null>(null); 

  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initApp = async () => {
        try { const dbTracks = await loadTracksFromDB(); if (dbTracks.length > 0) setTracks(dbTracks); } catch (e) { console.error(e); }
        
        const localUsers = localStorage.getItem(USERS_KEY);
        let currentUsersList: User[] = [];
        if (localUsers) { 
            try { 
                const parsed = JSON.parse(localUsers); 
                if (Array.isArray(parsed) && parsed.length > 0) {
                    currentUsersList = parsed;
                }
            } catch { } 
        }
        setUsers(currentUsersList);

        const savedRoots = localStorage.getItem(CUSTOM_ROOTS_KEY);
        if (savedRoots) setCustomRoots(JSON.parse(savedRoots));

        const currentSel = localStorage.getItem(SELECTION_KEY);
        if (currentSel) setSelectedTracksList(JSON.parse(currentSel));

        const savedSels = localStorage.getItem(SAVED_SELECTIONS_KEY);
        if (savedSels) setSavedSelections(JSON.parse(savedSels));
    };
    
    initApp();
  }, []);

  useEffect(() => { if (authMode) localStorage.setItem(SELECTION_KEY, JSON.stringify(selectedTracksList)); }, [selectedTracksList, authMode]);
  useEffect(() => { if (authMode) localStorage.setItem(SAVED_SELECTIONS_KEY, JSON.stringify(savedSelections)); }, [savedSelections, authMode]);

  const updateTracks = async (newTracksInput: Track[] | ((prev: Track[]) => Track[])) => {
      let finalTracks: Track[];
      if (typeof newTracksInput === 'function') { finalTracks = newTracksInput(tracks); } else { finalTracks = newTracksInput; }
      setTracks(finalTracks);
      setIsSaving(true);
      try { await saveTracksToDB(finalTracks); } catch (e) { console.error("Error guardando DB:", e); } finally { setIsSaving(false); }
  };

  const handleSyncData = async () => {
      setIsUpdating(true);
      try {
          const r = await fetch(USERS_DB_URL);
          const data = await r.json();
          let fetchedUsers: User[] = [];
          let fetchedRoots: string[] = [];

          if (Array.isArray(data)) {
              fetchedUsers = data;
          } else if (data.users || data.customRoots) {
              fetchedUsers = data.users || [];
              fetchedRoots = data.customRoots || [];
          }

          if (fetchedUsers.length > 0) {
              setUsers(fetchedUsers);
              localStorage.setItem(USERS_KEY, JSON.stringify(fetchedUsers));
          }
          if (fetchedRoots.length > 0) {
              setCustomRoots(fetchedRoots);
              localStorage.setItem(CUSTOM_ROOTS_KEY, JSON.stringify(fetchedRoots));
          }
          alert("Sincronización completada.");
      } catch(e) {
          alert("Error al sincronizar.");
      } finally {
          setIsUpdating(false);
      }
  };

  const handleExportUsersDB = () => {
      const exportData = { users: users, customRoots: customRoots };
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = "musuarios.json";
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const base64ToBlob = async (base64: string): Promise<Blob> => {
      const res = await fetch(base64);
      return await res.blob();
  };

  const handleExportBackup = async () => {
      if (!currentUser) return;
      setIsUpdating(true);
      try {
          const dbTracks = await loadTracksFromDB();
          const dbReports = await loadReportsFromDB();
          const dbProductions = await loadProductionsFromDB();
          
          const reportsForExport = await Promise.all(dbReports.map(async r => {
              const base64 = r.pdfBlob ? await blobToBase64(r.pdfBlob) : null;
              const { pdfBlob, ...rest } = r;
              return { ...rest, pdfBlobBase64: base64 };
          }));

          const backup = {
              tracks: dbTracks,
              reports: reportsForExport,
              productions: dbProductions,
              savedSelections: savedSelections,
              currentSelection: selectedTracksList,
              timestamp: new Date().toISOString(),
              user: currentUser.username
          };

          const dateStr = new Date().toISOString().split('T')[0];
          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `RCM_Backup_${currentUser.username}_${dateStr}.json`;
          a.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          console.error("Error exporting backup:", e);
          alert("Error al exportar la copia de seguridad.");
      } finally {
          setIsUpdating(false);
      }
  };

  const handleImportBackup = (file: File) => {
      if (!file) return;
      setIsUpdating(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const backup = JSON.parse(e.target?.result as string);
              
              if (backup.tracks && Array.isArray(backup.tracks)) {
                  await saveTracksToDB(backup.tracks);
                  setTracks(backup.tracks);
              }
              
              if (backup.reports && Array.isArray(backup.reports)) {
                  for (const r of backup.reports) {
                      if (r.pdfBlobBase64) {
                          r.pdfBlob = await base64ToBlob(r.pdfBlobBase64);
                          delete r.pdfBlobBase64;
                      } else {
                          r.pdfBlob = new Blob();
                      }
                      await saveReportToDB(r);
                  }
              }
              
              if (backup.productions && Array.isArray(backup.productions)) {
                  for (const p of backup.productions) {
                      await saveProductionToDB(p);
                  }
              }
              
              if (backup.savedSelections) {
                  setSavedSelections(backup.savedSelections);
                  localStorage.setItem(SAVED_SELECTIONS_KEY, JSON.stringify(backup.savedSelections));
              }
              
              if (backup.currentSelection) {
                  setSelectedTracksList(backup.currentSelection);
                  localStorage.setItem(SELECTION_KEY, JSON.stringify(backup.currentSelection));
              }
              
              alert("Copia de seguridad restaurada con éxito.");
          } catch (err) {
              console.error("Error importing backup:", err);
              alert("Error al restaurar la copia de seguridad. El archivo puede estar corrupto.");
          } finally {
              setIsUpdating(false);
          }
      };
      reader.readAsText(file);
  };

  const handleSyncRoot = async (rootName: string) => {
      const config = ROOT_DB_CONFIG[rootName];
      if (!config) return alert(`No hay configuración remota para ${rootName}`);
      setIsUpdating(true);
      try {
          const r = await fetch(config.url);
          if (!r.ok) throw new Error("Error DB");
          const newTracks: Track[] = await r.json();
          const otherTracks = tracks.filter(t => !t.path.startsWith(rootName));
          await updateTracks([...otherTracks, ...newTracks]);
          alert(`Base de datos de ${rootName} actualizada.`);
      } catch (e) { alert(`Error al actualizar ${rootName}.`); } finally { setIsUpdating(false); }
  };

  const handleExportRoot = (rootName: string) => {
      const rootTracks = tracks.filter(t => t.path.startsWith(rootName));
      if (rootTracks.length === 0) return alert(`No hay datos en ${rootName}.`);
      const config = ROOT_DB_CONFIG[rootName];
      const dataStr = JSON.stringify(rootTracks, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = config ? config.filename : `${rootName.replace(/\s+/g, '').toLowerCase()}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleClearRoot = async (rootName: string) => {
      if (!window.confirm(`¿Borrar ${rootName}?`)) return;
      const remainingTracks = tracks.filter(t => !t.path.startsWith(rootName));
      await updateTracks(remainingTracks);
  };

  const handleAddCustomRoot = (name: string) => { const newRoots = [...customRoots, name]; setCustomRoots(newRoots); localStorage.setItem(CUSTOM_ROOTS_KEY, JSON.stringify(newRoots)); };
  const handleRenameRoot = async (oldName: string, newName: string) => {
      const newRoots = customRoots.map(r => r === oldName ? newName : r);
      setCustomRoots(newRoots); localStorage.setItem(CUSTOM_ROOTS_KEY, JSON.stringify(newRoots));
      const updatedTracks = tracks.map(t => t.path.startsWith(oldName) ? { ...t, path: t.path.replace(oldName, newName) } : t);
      await updateTracks(updatedTracks);
      alert(`Carpeta renombrada.`);
  };

  const handleUploadMultipleTxt = async (files: FileList, targetRoot: string) => {
      if (!files || files.length === 0) return;
      setIsUpdating(true);
      let parsedTracks: Track[] = [];
      try {
          for (let i = 0; i < files.length; i++) {
              const text = await files[i].text();
              parsedTracks = [...parsedTracks, ...parseTxtDatabase(text, targetRoot)];
          }
          await updateTracks(prev => [...prev, ...parsedTracks]);
          alert(`${parsedTracks.length} pistas añadidas.`);
      } catch (e) { console.error(e); } finally { setIsUpdating(false); }
  };

  const handleSelectTrack = (track: Track) => { setSelectedTrack(track); };
  const handleToggleSelection = (track: Track) => { setSelectedTracksList(prev => prev.find(t => t.id === track.id) ? prev.filter(t => t.id !== track.id) : [...prev, track]); };
  const handleClearSelection = () => { if (window.confirm('¿Limpiar selección?')) { setSelectedTracksList([]); localStorage.removeItem(SELECTION_KEY); } };

  const handleSaveSelectionPersist = () => {
    if (selectedTracksList.length === 0) return alert("Selección vacía.");
    if (savedSelections.length >= 5) return alert("Límite de 5 selecciones.");
    const name = window.prompt("Nombre:");
    if (!name) return;
    const newSelection: SavedSelection = { id: `sel-${Date.now()}`, name: name.trim(), date: new Date().toISOString(), tracks: [...selectedTracksList] };
    setSavedSelections(prev => [newSelection, ...prev]);
    setSelectedTracksList([]); localStorage.removeItem(SELECTION_KEY);
  };

  const handleLoadSavedSelection = (sel: SavedSelection) => {
      if (selectedTracksList.length > 0 && !window.confirm("¿Fusionar con selección actual?")) return;
      const currentIds = new Set(selectedTracksList.map(t => t.id));
      const toAdd = sel.tracks.filter(t => !currentIds.has(t.id));
      setSelectedTracksList(prev => [...prev, ...toAdd]);
  };

  const handleDeleteSavedSelection = (id: string) => { if (window.confirm("¿Eliminar?")) setSavedSelections(prev => prev.filter(s => s.id !== id)); };

  const handleProcessWishlist = () => {
      if (!wishlistText.trim()) return;
      const queries = wishlistText.split('\n').map(l => l.trim()).filter(l => l);
      const found: Track[] = [];
      queries.forEach(q => {
          const match = tracks.find(t => t.metadata.title.toLowerCase().includes(q.toLowerCase()) || t.filename.toLowerCase().includes(q.toLowerCase()));
          if (match && !selectedTracksList.find(s => s.id === match.id)) found.push(match);
      });
      if (found.length > 0) { setSelectedTracksList(prev => [...prev, ...found]); alert(`${found.length} añadidos.`); } else { alert("Sin coincidencias."); }
      setShowWishlist(false); setWishlistText('');
  };

  const handleOpenExportModal = () => {
      setEditingReportId(null);
      const items: ExportItem[] = selectedTracksList.map(t => ({ id: t.id, title: t.metadata.title, author: t.metadata.author, authorCountry: t.metadata.authorCountry || '', performer: t.metadata.performer, performerCountry: t.metadata.performerCountry || '', genre: t.metadata.genre || '', source: 'db', path: t.path }));
      setExportItems(items); setShowExportModal(true);
  };

  const handleUpdateExportItem = (index: number, field: keyof ExportItem, value: string) => {
      const newItems = [...exportItems]; newItems[index] = { ...newItems[index], [field]: value }; setExportItems(newItems);
  };

  const handleShareWhatsApp = () => {
      let message = `*CRÉDITOS RCM*\n*Programa:* ${programName}\n\n`;
      exportItems.forEach(item => { message += `🎵 *${item.title}* - ${item.performer}\n📂 _${item.path || 'Manual'}_\n\n`; });
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDownloadReport = async () => {
      if (!currentUser) return;
      const pdfBlob = generateReportPDF({ userFullName: currentUser.fullName, userUniqueId: currentUser.uniqueId || 'N/A', program: programName, items: exportItems });
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `PM-${programName}-${dateStr}.pdf`;
      await saveReportToDB({ id: editingReportId || `rep-${Date.now()}`, date: new Date().toISOString(), program: programName, generatedBy: currentUser.username, fileName, pdfBlob, items: exportItems, status: { downloaded: false, sent: false } });
      alert("Reporte guardado."); setShowExportModal(false);
  };

  const handleSaveEdit = (updatedTrack: Track) => {
      updateTracks(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
      if (view === ViewState.SELECTION) setSelectedTracksList(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
      setSelectedTrack(null);
  };

  const handleEditReport = (report: Report) => { if (report.items) { setExportItems(report.items); setProgramName(report.program); setEditingReportId(report.id); setShowExportModal(true); } };

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      <CMNLHeader 
        user={globalUser ? { name: globalUser.name, role: globalUser.role } : null}
        sectionTitle="Música CMNL"
        onMenuClick={onMenuClick}
        onBack={onBack}
      >
        {(authMode === 'admin' || authMode === 'director') && (
            <div className="flex gap-4 items-center">
                <button onClick={handleExportBackup} className="text-[#9E7649] hover:text-white transition-colors flex items-center justify-center" title="Exportar Copia de Seguridad">
                    <span className="material-symbols-outlined text-2xl">cloud_download</span>
                </button>
                <label className="text-[#9E7649] hover:text-white transition-colors cursor-pointer flex items-center justify-center" title="Restaurar Copia de Seguridad">
                    <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                    <input type="file" accept=".json" onChange={(e) => { if (e.target.files && e.target.files[0]) handleImportBackup(e.target.files[0]); e.target.value = ''; }} className="hidden" />
                </label>
            </div>
        )}
      </CMNLHeader>
      
      <div className="flex-1 overflow-hidden relative flex flex-col">
            {view === ViewState.LIST && (
                <TrackList 
                    tracks={tracks} onSelectTrack={handleSelectTrack} onUploadTxt={handleUploadMultipleTxt} isAdmin={authMode === 'admin'} 
                    onSyncRoot={handleSyncRoot} onExportRoot={handleExportRoot} onClearRoot={handleClearRoot} 
                    customRoots={customRoots} onAddCustomRoot={handleAddCustomRoot} onRenameRoot={handleRenameRoot}
                    selectedTrackIds={new Set(selectedTracksList.map(t => t.id))} onToggleSelection={handleToggleSelection}
                />
            )}
            
            {view === ViewState.SELECTION && (
                <div className="h-full bg-[#1A100C] flex flex-col">
                    <div className="p-4 bg-[#2C1B15] border-b border-[#9E7649]/20 flex items-center justify-between">
                         <h2 className="font-bold text-white flex items-center gap-2"><span className="material-symbols-outlined text-[#9E7649]">checklist</span> Selección</h2>
                         <div className="flex gap-2">
                             <button onClick={() => setShowWishlist(true)} className="text-[9px] font-bold uppercase bg-[#9E7649]/10 text-[#9E7649] px-3 py-1.5 rounded-lg flex items-center gap-1">Deseos</button>
                             <button onClick={handleClearSelection} className="text-[9px] font-bold uppercase bg-red-900/20 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-1">Limpiar</button>
                         </div>
                    </div>
                    
                    {savedSelections.length > 0 && (
                        <div className="bg-[#2C1B15] border-b border-[#9E7649]/10 p-2">
                            <p className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase tracking-widest px-2 mb-2">Guardadas ({savedSelections.length}/5)</p>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-2">
                                {savedSelections.map(sel => (
                                    <div key={sel.id} className="flex-none bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-2 min-w-[120px] flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-xs text-white truncate w-20">{sel.name}</span>
                                            <button onClick={() => handleDeleteSavedSelection(sel.id)} className="text-[#E8DCCF]/40 hover:text-red-400"><span className="material-symbols-outlined text-xs">close</span></button>
                                        </div>
                                        <div className="text-[9px] text-[#E8DCCF]/60">{sel.tracks.length} temas</div>
                                        <button onClick={() => handleLoadSavedSelection(sel)} className="text-[9px] bg-[#2C1B15] border border-[#9E7649]/30 rounded py-1 font-bold text-[#9E7649] hover:bg-[#9E7649] hover:text-white transition-colors">Cargar</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        <TrackList 
                            tracks={selectedTracksList} onSelectTrack={handleSelectTrack} onUploadTxt={() => {}} isAdmin={false} 
                            onSyncRoot={() => {}} onExportRoot={() => {}} onClearRoot={() => {}} 
                            isSelectionView={true} customRoots={[]} onAddCustomRoot={() => {}} onRenameRoot={() => {}}
                            onToggleSelection={handleToggleSelection} selectedTrackIds={new Set(selectedTracksList.map(t => t.id))}
                        />
                    </div>
                    <div className="p-4 bg-[#2C1B15] border-t border-[#9E7649]/20 flex flex-col gap-2">
                         <button onClick={handleSaveSelectionPersist} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 hover:bg-green-700">
                             <span className="material-symbols-outlined text-sm">save</span> Guardar Selección
                         </button>
                         <button onClick={handleOpenExportModal} className="w-full bg-[#9E7649] text-white py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#8B653D]">
                            <span className="material-symbols-outlined">ios_share</span> Exportar / Compartir ({selectedTracksList.length})
                         </button>
                    </div>
                </div>
            )}

            {view === ViewState.SETTINGS && (authMode === 'admin' || authMode === 'director') && <Settings tracks={tracks} users={users} onAddUser={() => {}} onEditUser={() => {}} onDeleteUser={() => {}} onExportUsers={handleExportUsersDB} onImportUsers={() => {}} currentUser={currentUser} onExportBackup={handleExportBackup} onImportBackup={handleImportBackup} />}
            {view === ViewState.PRODUCTIONS && authMode === 'admin' && <Productions onUpdateTracks={updateTracks} allTracks={tracks} />}
            {view === ViewState.REPORTS && authMode === 'director' && <ReportsViewer onEdit={handleEditReport} currentUser={currentUser} />}
            {view === ViewState.GUIDE && authMode !== 'admin' && <Guide />}
        </div>

        {selectedTrack && (
            <TrackDetail 
                track={selectedTrack} authMode={authMode} onClose={() => setSelectedTrack(null)} 
                onSearchCredits={() => {}} 
                onSaveEdit={handleSaveEdit}
            />
        )}

        {showWishlist && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowWishlist(false)}>
                <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-lg mb-2 text-white">Lista de Deseos</h3>
                    <textarea className="w-full h-40 p-3 border border-[#9E7649]/30 bg-[#1A100C] text-white rounded-xl text-sm outline-none focus:border-[#9E7649]" placeholder="Títulos..." value={wishlistText} onChange={e => setWishlistText(e.target.value)} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowWishlist(false)} className="flex-1 py-3 text-[#E8DCCF]/60 font-bold hover:text-white">Cerrar</button>
                        <button onClick={handleProcessWishlist} className="flex-1 py-3 bg-[#9E7649] text-white rounded-xl font-bold shadow-lg hover:bg-[#8B653D]">Buscar</button>
                    </div>
                </div>
            </div>
        )}

        {showExportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowExportModal(false)}>
                <div className="w-full max-w-lg bg-[#2C1B15] rounded-2xl shadow-2xl flex flex-col h-[85vh] border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                    
                    <div className="flex justify-between items-center p-4 border-b border-[#9E7649]/20 shrink-0 bg-[#1A100C] rounded-t-2xl">
                        <div>
                            <h3 className="font-bold text-white">Exportar Selección</h3>
                            <p className="text-xs text-[#E8DCCF]/60">Edita los detalles antes de compartir</p>
                        </div>
                        <button onClick={() => setShowExportModal(false)}><span className="material-symbols-outlined text-[#E8DCCF]/40 hover:text-white">close</span></button>
                    </div>

                    <div className="p-4 bg-[#2C1B15] border-b border-[#9E7649]/20 shrink-0">
                        <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Programa</label>
                        <select value={programName} onChange={e => setProgramName(e.target.value)} className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]">
                            {PROGRAMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {exportItems.map((item, idx) => (
                            <div key={item.id} className="p-4 border border-[#9E7649]/20 rounded-xl bg-[#1A100C] shadow-sm">
                                <div className="mb-2">
                                    <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Título</label>
                                    <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-sm font-bold outline-none focus:border-[#9E7649]" value={item.title} onChange={e => handleUpdateExportItem(idx, 'title', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Autor</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" value={item.author} onChange={e => handleUpdateExportItem(idx, 'author', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Autor</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" list="country-options" value={item.authorCountry} onChange={e => handleUpdateExportItem(idx, 'authorCountry', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Intérprete</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" value={item.performer} onChange={e => handleUpdateExportItem(idx, 'performer', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Intérprete</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" list="country-options" value={item.performerCountry} onChange={e => handleUpdateExportItem(idx, 'performerCountry', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Género</label>
                                    <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" list="genre-options" value={item.genre} onChange={e => handleUpdateExportItem(idx, 'genre', e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-3 bg-[#1A100C] border-t border-[#9E7649]/20 rounded-b-2xl shrink-0">
                        <button onClick={handleShareWhatsApp} className={`bg-[#25D366] hover:bg-[#1DA851] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm ${authMode !== 'director' ? 'col-span-2' : ''}`}>
                            <i className="material-symbols-outlined text-lg">chat</i> WhatsApp
                        </button>
                        {authMode === 'director' && (
                            <button onClick={handleDownloadReport} className="bg-[#9E7649] hover:bg-[#8B653D] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm">
                                <i className="material-symbols-outlined text-lg">picture_as_pdf</i> Generar PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {isUpdating && (
            <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-[#2C1B15] border border-[#9E7649]/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-fade-in">
                    <div className="relative size-12">
                        <svg className="animate-spin size-12 text-[#E8DCCF]/20" viewBox="0 0 24 24"></svg> 
                        <div className="absolute inset-0 border-4 border-[#9E7649] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center">
                        <h4 className="font-bold text-white">Actualizando</h4>
                        <p className="text-xs text-[#E8DCCF]/60">Por favor espere...</p>
                    </div>
                </div>
            </div>
        )}

        <nav className="bg-[#2C1B15] border-t border-[#9E7649]/20 h-20 px-4 flex items-center justify-between pb-2 z-20 shrink-0">
            <NavButton icon="folder_open" label="Explorar" active={view === ViewState.LIST} onClick={() => setView(ViewState.LIST)} />
            <NavButton icon="checklist" label="Selección" active={view === ViewState.SELECTION} onClick={() => setView(ViewState.SELECTION)} />
            {authMode === 'director' && <NavButton icon="description" label="Reportes" active={view === ViewState.REPORTS} onClick={() => setView(ViewState.REPORTS)} />}
            {authMode === 'admin' && <NavButton icon="playlist_add" label="Producción" active={view === ViewState.PRODUCTIONS} onClick={() => setView(ViewState.PRODUCTIONS)} />}
            {(authMode === 'admin' || authMode === 'director') && <NavButton icon="settings" label="Ajustes" active={view === ViewState.SETTINGS} onClick={() => setView(ViewState.SETTINGS)} />}
            {authMode !== 'admin' && <NavButton icon="help" label="Guía" active={view === ViewState.GUIDE} onClick={() => setView(ViewState.GUIDE)} />}
        </nav>
    </div>
  );
};

const NavButton: React.FC<{ icon: string, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center transition-all ${active ? 'text-[#9E7649]' : 'text-[#E8DCCF]/40 hover:text-[#E8DCCF]/80'}`}>
        <span className={`material-symbols-outlined text-2xl ${active ? 'material-symbols-filled' : ''}`}>{icon}</span>
        <span className="text-[9px] font-bold uppercase mt-1">{label}</span>
    </button>
);

export default MusicaApp;
