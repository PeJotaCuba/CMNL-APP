import React, { useState } from 'react';
import { UserProfile, PropagandaData } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

interface Props {
  user: UserProfile;
  data: PropagandaData;
  onUpdate: (data: PropagandaData) => void;
}

const THEMES = [
  "Todas", "Historia", "Política", "Adicciones", "Gobierno", "Conmemoraciones", 
  "Naturaleza", "Radio", "Bayamo", "Fidel", "Martí"
];

const Propaganda: React.FC<Props> = ({ user, data, onUpdate }) => {
  const [selectedTheme, setSelectedTheme] = useState<string>(THEMES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rcm_propaganda_search_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out entries older than 24 hours
        const now = Date.now();
        const valid = parsed.filter((item: { term: string, timestamp: number }) => now - item.timestamp < 24 * 60 * 60 * 1000);
        return valid.map((item: { term: string }) => item.term);
      }
      return [];
    } catch { return []; }
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const canEdit = user.role === 'admin'; 

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    setShowSuggestions(false);
    
    if (term.trim()) {
      const now = Date.now();
      const historyItem = { term: term.trim(), timestamp: now };
      
      try {
        const saved = localStorage.getItem('rcm_propaganda_search_history');
        let history = saved ? JSON.parse(saved) : [];
        
        // Remove duplicates and keep only recent
        history = history.filter((item: { term: string }) => item.term !== term.trim());
        history.unshift(historyItem);
        
        // Limit to last 10 items
        if (history.length > 10) history = history.slice(0, 10);
        
        localStorage.setItem('rcm_propaganda_search_history', JSON.stringify(history));
        setSearchHistory(history.map((item: { term: string }) => item.term));
      } catch (e) { console.error(e); }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split('\n');
      const newData = { ...data };
      let currentTheme = "Historia"; // Default fallback if no theme found first
      let pendingTitle: string | null = null;

      // Regex to match: (104) Carlos M De Cespedes.mp3 -> 104 Carlos M De Cespedes
      // Captures number and name separately, then we combine.
      const titleRegex = /^\((\d+)\)\s*(.*?)\.mp3\s*$/i;
      
      // Regex to match: Ruta: D:\...
      const pathRegex = /^Ruta:\s*(.*)$/i;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 1. Check for Theme
        const themeMatch = THEMES.find(t => 
            t !== "Todas" && (
              trimmed.toLowerCase() === t.toLowerCase() || 
              trimmed.toLowerCase() === `temática: ${t.toLowerCase()}` ||
              trimmed.toLowerCase() === `# ${t.toLowerCase()}`
            )
        );

        if (themeMatch) {
          currentTheme = themeMatch;
          if (!newData[currentTheme]) newData[currentTheme] = [];
          pendingTitle = null; 
          return;
        }

        // 2. Check for File Name (Title)
        const titleMatch = trimmed.match(titleRegex);
        if (titleMatch) {
            // titleMatch[1] is number (e.g. 104), titleMatch[2] is name (e.g. Carlos M De Cespedes)
            pendingTitle = `${titleMatch[1]} ${titleMatch[2].trim()}`;
            return;
        }

        // 3. Check for Path
        const pathMatch = trimmed.match(pathRegex);
        if (pathMatch && pendingTitle) {
            const path = pathMatch[1].trim();
            const fullItem = `${pendingTitle}|${path}`;
            
            if (!newData[currentTheme]) newData[currentTheme] = [];
            
            // Avoid duplicates
            if (!newData[currentTheme].includes(fullItem)) {
                newData[currentTheme].push(fullItem);
            }
            
            pendingTitle = null; 
            return;
        }
      });

      onUpdate(newData);
      alert('Propaganda cargada exitosamente.');
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (!canEdit) return;
    if (selectedTheme === "Todas") {
        if (confirm(`¿Estás seguro de borrar TODA la propaganda de TODAS las categorías?`)) {
            onUpdate({});
        }
        return;
    }

    if (confirm(`¿Estás seguro de borrar toda la propaganda de "${selectedTheme}"?`)) {
      const newData = { ...data };
      newData[selectedTheme] = [];
      onUpdate(newData);
    }
  };

  const handleDownloadDocx = async () => {
    if (!canEdit) return;
    
    const children = [];

    children.push(
      new Paragraph({
        text: "Base de Datos de Propaganda - Radio Ciudad Monumento",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    );

    const themesToExport = selectedTheme === "Todas" ? THEMES.filter(t => t !== "Todas") : [selectedTheme];

    themesToExport.forEach(theme => {
      const items = data[theme] || [];
      if (items.length > 0) {
        children.push(
          new Paragraph({
            text: theme,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 }
          })
        );

        items.forEach(item => {
          const parts = item.split('|');
          const title = parts[0];
          const path = parts.length > 1 ? parts[1] : "";

          children.push(
            new Paragraph({
              children: [
                  new TextRun({ text: title, bold: true, size: 24 }), 
                  new TextRun({ text: "\n", size: 20 }),
                  new TextRun({ text: path, size: 20, color: "666666" }) 
              ], 
              spacing: { after: 100 }
            })
          );
        });
        
        children.push(new Paragraph({ text: "" })); 
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Propaganda_RCM_${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter logic
  const getFilteredItems = () => {
    let items: string[] = [];

    if (selectedTheme === "Todas") {
        // Collect ALL items from ALL themes
        Object.values(data).forEach(themeItems => {
            items = [...items, ...themeItems];
        });
        // Deduplicate
        items = Array.from(new Set(items));
    } else {
        items = data[selectedTheme] || [];
    }

    // Apply Search Filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        items = items.filter(item => item.toLowerCase().includes(query));
    }

    // Sort by number prefix
    // Expected format: "104 Title..."
    return items.sort((a, b) => {
        const numA = parseInt(a.split(' ')[0]) || 0;
        const numB = parseInt(b.split(' ')[0]) || 0;
        return numA - numB;
    });
  };

  const currentItems = getFilteredItems();

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-hidden">
      {/* Header */}
      <header className="bg-card-dark border-b border-white/5 px-6 py-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Propaganda</h1>
            <p className="text-text-secondary text-xs uppercase tracking-widest">Base de Datos Institucional</p>
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
               <label className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-white/10">
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  <span className="hidden sm:inline">Cargar TXT</span>
                  <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
               </label>
               <button 
                  onClick={handleDownloadDocx}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-primary/20"
               >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span className="hidden sm:inline">Descargar DOCX</span>
               </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary">search</span>
                <input 
                    type="text" 
                    placeholder="Buscar propaganda..." 
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSearch(searchQuery);
                        }
                    }}
                    className="w-full bg-background-dark border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:border-primary outline-none transition-colors"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                )}
            </div>

            {/* Search Suggestions / History */}
            {showSuggestions && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card-dark border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] uppercase font-bold text-text-secondary tracking-widest border-b border-white/5 bg-white/5">
                        Búsquedas Recientes
                    </div>
                    {searchHistory.map((term, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSearch(term)}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px] text-text-secondary">history</span>
                            {term}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </header>

      {/* Controls */}
      <div className="p-4 border-b border-white/5 bg-background-dark flex flex-wrap items-center gap-4 shrink-0">
        <div className="relative min-w-[200px]">
           <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary z-10">category</span>
           <select 
             value={selectedTheme} 
             onChange={(e) => setSelectedTheme(e.target.value)}
             className="w-full bg-card-dark border border-white/10 rounded-xl py-2 pl-10 pr-8 text-white text-sm focus:border-primary outline-none appearance-none relative z-0 cursor-pointer"
           >
             {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
           </select>
           {/* Custom Arrow */}
           <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary pointer-events-none text-sm">keyboard_arrow_down</span>
        </div>
        
        <div className="flex-1 text-right text-xs text-text-secondary">
           {currentItems.length} elementos visibles
        </div>

        {canEdit && currentItems.length > 0 && (
            <button 
                onClick={handleClear}
                className="text-admin-red hover:bg-admin-red/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Limpiar Categoría
            </button>
        )}
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentItems.length > 0 ? (
          currentItems.map((item, idx) => {
            const parts = item.split('|');
            const title = parts[0];
            const path = parts.length > 1 ? parts[1] : null;

            return (
              <div key={idx} className="bg-card-dark p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-colors group relative">
                 <p className="text-white/90 text-sm font-bold leading-relaxed">{title}</p>
                 {path && <p className="text-text-secondary text-xs mt-1 break-all font-mono opacity-70">{path}</p>}
                 
                 {canEdit && (
                   <button 
                     onClick={() => {
                        const newData = { ...data };
                        let deleted = false;
                        
                        // Try removing from selected theme first
                        if (newData[selectedTheme] && newData[selectedTheme].includes(item)) {
                            newData[selectedTheme] = newData[selectedTheme].filter(i => i !== item);
                            deleted = true;
                        }
                        
                        // If not deleted (meaning it was a 001 item from another category), search and destroy
                        if (!deleted) {
                            for (const theme of THEMES) {
                                if (newData[theme] && newData[theme].includes(item)) {
                                    newData[theme] = newData[theme].filter(i => i !== item);
                                }
                            }
                        }
                        
                        onUpdate(newData);
                     }}
                     className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-text-secondary hover:text-admin-red transition-all"
                     title="Eliminar elemento"
                   >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                   </button>
                 )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-50">
             <span className="material-symbols-outlined text-4xl mb-2">campaign</span>
             <p className="text-sm">No hay propaganda registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Propaganda;
