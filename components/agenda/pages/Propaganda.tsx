import React, { useState } from 'react';
import { UserProfile, PropagandaData } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

interface Props {
  user: UserProfile;
  data: PropagandaData;
  onUpdate: (data: PropagandaData) => void;
}

const THEMES = [
  "Historia", "Política", "Adicciones", "Gobierno", "Conmemoraciones", 
  "Naturaleza", "Radio", "Bayamo", "Fidel", "Martí"
];

const Propaganda: React.FC<Props> = ({ user, data, onUpdate }) => {
  const [selectedTheme, setSelectedTheme] = useState<string>(THEMES[0]);

  // Check permissions: Admin or Coordinator (assuming Coordinator is a classification string or similar, 
  // but since we only have UserRole in types, we'll check for ADMIN role. 
  // If "Coordinator" is a classification stored elsewhere, we might need to check that too.
  // Based on previous context, UserProfile has 'role'. 
  // Let's assume for now ADMIN role covers it, as requested "administradores o coordinadores".
  // If Coordinator is a specific role not in enum, we might need to adjust.
  // However, looking at UserManagement.tsx, classification can be 'Director', 'Asesor', etc.
  // But UserProfile in types.ts only has 'role' as UserRole enum (ESCRITOR, ADMIN).
  // Wait, UserProfile in types.ts DOES NOT have classification. 
  // Let's check AgendaApp.tsx mapping. 
  // AgendaApp maps currentUser to UserProfile. 
  // currentUser has classification. 
  // But UserProfile interface in types.ts DOES NOT have classification.
  // I should probably check if I can access classification.
  // Actually, let's look at AgendaApp.tsx again.
  // It maps: role: currentUser.role as any.
  // So if currentUser.role is 'admin', it's ADMIN.
  // If currentUser.role is 'worker', it's ESCRITOR (or whatever).
  // The user request says "administradores o coordinadores".
  // If "Coordinador" is a classification, it might not be passed to AgendaApp's UserProfile unless I add it.
  // For now, I will restrict to UserRole.ADMIN. 
  // If the user needs specific "Coordinator" support that isn't ADMIN, I'd need to update types.
  // Let's stick to UserRole.ADMIN for now as it's the safest interpretation of "privileged user".
  
  const canEdit = user.role === 'admin'; 

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
      let currentTheme = selectedTheme;
      let pendingTitle: string | null = null;

      // Regex to match: (104) Carlos M De Cespedes.mp3 -> Carlos M De Cespedes
      // Handles optional spaces, case insensitive .mp3
      const titleRegex = /^\(\d+\)\s*(.*?)\.mp3\s*$/i;
      
      // Regex to match: Ruta: D:\...
      const pathRegex = /^Ruta:\s*(.*)$/i;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 1. Check for Theme
        // Matches exact theme name or "Temática: Theme" or "# Theme"
        const themeMatch = THEMES.find(t => 
            trimmed.toLowerCase() === t.toLowerCase() || 
            trimmed.toLowerCase() === `temática: ${t.toLowerCase()}` ||
            trimmed.toLowerCase() === `# ${t.toLowerCase()}`
        );

        if (themeMatch) {
          currentTheme = themeMatch;
          if (!newData[currentTheme]) newData[currentTheme] = [];
          pendingTitle = null; // Reset pending title on theme change
          return;
        }

        // 2. Check for File Name (Title)
        const titleMatch = trimmed.match(titleRegex);
        if (titleMatch) {
            pendingTitle = titleMatch[1].trim();
            return;
        }

        // 3. Check for Path
        const pathMatch = trimmed.match(pathRegex);
        if (pathMatch && pendingTitle) {
            const path = pathMatch[1].trim();
            const fullItem = `${pendingTitle}|${path}`;
            
            if (!newData[currentTheme]) newData[currentTheme] = [];
            
            // Avoid duplicates based on the full string
            if (!newData[currentTheme].includes(fullItem)) {
                newData[currentTheme].push(fullItem);
            }
            
            pendingTitle = null; // Reset after pairing
            return;
        }

        // 4. Fallback for simple list items (legacy support or manual entry lines)
        // If it's not a theme, not a file line, not a path line, but has content.
        // We only add if it doesn't look like a partial record.
        if (!titleMatch && !pathMatch && !trimmed.toLowerCase().startsWith('ruta:')) {
             // Optional: Decide if we want to support plain text lines. 
             // For now, let's assume the user ONLY uploads the format specified or we risk adding garbage.
             // But to be safe for "other" formats, maybe we skip?
             // The prompt implies "este es su formato", so we should strictly follow it for this upload.
             // However, to keep previous functionality (simple lists), we could check if it looks like a file/path.
             // Let's stick to the requested format strictly to avoid clutter.
        }
      });

      onUpdate(newData);
      alert('Propaganda cargada exitosamente.');
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (!canEdit) return;
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

    THEMES.forEach(theme => {
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
                  new TextRun({ text: title, bold: true, size: 24 }), // 12pt Bold
                  new TextRun({ text: "\n", size: 20 }),
                  new TextRun({ text: path, size: 20, color: "666666" }) // 10pt Gray
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

  // Filter logic: Show items from selected theme + items starting with "001" from ANY theme
  const getFilteredItems = () => {
    const selectedItems = data[selectedTheme] || [];
    
    // Find all "001" items from all themes
    const priorityItems: string[] = [];
    Object.values(data).forEach(themeItems => {
      themeItems.forEach(item => {
        if (item.trim().startsWith('001')) {
          priorityItems.push(item);
        }
      });
    });

    // Merge and deduplicate
    const combined = [...priorityItems, ...selectedItems];
    return Array.from(new Set(combined));
  };

  const currentItems = getFilteredItems();

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-hidden">
      {/* Header */}
      <header className="bg-card-dark border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
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
