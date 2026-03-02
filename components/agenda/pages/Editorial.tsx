import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, Program, DailyContent, UserProfile, DayThemeData, EfemeridesData, ConmemoracionesData } from '../types.ts';
import { getWeeksInMonth, DayInfo, getCurrentDateInfo } from '../utils/dateUtils.ts';
import { MONTHS_DATA } from '../constants.ts';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";

interface EditorialProps {
  user: UserProfile;
  programs: Program[];
  dayThemes: DayThemeData;
  efemerides: EfemeridesData;
  conmemoraciones: ConmemoracionesData;
  onUpdateProgram: (p: Program) => void;
  onUpdateMany: (progs: Program[]) => void;
  onUpdateDayThemes: (themes: DayThemeData) => void;
  onClearAll: () => void;
  filterEnabled: boolean;
}

const ContentModal: React.FC<{ title: string; content: string; onClose: () => void }> = ({ title, content, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isIdea = title.startsWith("Ideas:");
  const displayTitle = isIdea ? title.replace("Ideas: ", "") : title;
  const displaySubtitle = isIdea ? "Sugerencias Creativas" : "Detalle de Contenido";

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-card-dark w-full max-w-lg rounded-[2rem] border border-white/10 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-card-dark z-10">
          <div className="flex items-center gap-4">
             <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                <span className="material-symbols-outlined text-2xl">lightbulb</span>
             </div>
             <div>
                <h3 className="text-white font-bold text-lg leading-tight">{displayTitle}</h3>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80 mt-1">{displaySubtitle}</p>
             </div>
          </div>
          <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5">
            <span className="material-symbols-outlined text-white text-sm">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-black/20">
            <div className="prose prose-invert max-w-none">
               <p className="text-white/90 text-sm leading-loose font-serif whitespace-pre-wrap selection:bg-primary/30">
                  {content}
               </p>
            </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-card-dark flex gap-3 z-10">
            <button 
              onClick={handleCopy} 
              className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border ${copied ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
            >
               <span className="material-symbols-outlined text-base">
                  {copied ? 'check' : 'content_copy'}
               </span>
               {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button 
              onClick={onClose} 
              className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
               Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};

const Editorial: React.FC<EditorialProps> = ({ 
  user, programs, dayThemes, efemerides, conmemoraciones, onUpdateProgram, onUpdateMany, onUpdateDayThemes, onClearAll, filterEnabled
}) => {
  const navigate = useNavigate();
  const dateInfo = getCurrentDateInfo(); 
  
  // Nivel 0: Selección de Mes
  const [isMonthSelection, setIsMonthSelection] = useState(true);
  const [targetDate, setTargetDate] = useState(new Date());
  
  const weeks = useMemo(() => getWeeksInMonth(targetDate), [targetDate]);
  const currentMonthLabel = MONTHS_DATA[targetDate.getMonth()].name;

  // Nivel 1: Selección de Semana (Lista de Semanas)
  // Nivel 2: Vista de Semana (Lista de Días)
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  
  // Nivel 3: Editor de Programa (Día Específico)
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  
  const [editingProg, setEditingProg] = useState<{program: Program, key: string} | null>(null);
  const [editData, setEditData] = useState<DailyContent>({ theme: '', ideas: '' }); 
  const [editThemePortada, setEditThemePortada] = useState<string | null>(null);
  
  const [progSearch, setProgSearch] = useState(''); 
  const [viewModal, setViewModal] = useState<{ title: string, content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWeek = weeks.find(w => w.id === selectedWeekId);
  
  // Filtrado de usuario
  const applyFilter = user.role === UserRole.ESCRITOR && user.interests && filterEnabled;
  const searchablePrograms = applyFilter
    ? programs.filter(p => user.interests?.programIds.includes(p.id))
    : programs;

  const normalize = (str: string) => 
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // --- LÓGICA DE CLAVES DE DATOS (CORREGIDA) ---
  const getDataKey = (weekId: string, dayName: string) => `${currentMonthLabel}-${weekId}-${dayName}`;
  const getLegacyKey = (weekId: string, dayName: string) => `${weekId}-${dayName}`;

  // CORRECCIÓN CRÍTICA: Solo usar fallback a legacy si el mes es Enero.
  // Esto evita que datos de Enero se muestren en Febrero, Marzo, etc.
  const getEffectiveData = (program: Program, weekId: string, dayName: string): DailyContent => {
      const newKey = getDataKey(weekId, dayName);
      const oldKey = getLegacyKey(weekId, dayName);
      
      // 1. Buscar dato específico del mes (Prioridad Alta)
      if (program.dailyData && program.dailyData[newKey]) {
          return program.dailyData[newKey];
      }

      // 2. Si es Enero, permitir fallback a datos antiguos (Compatibilidad)
      if (currentMonthLabel === 'Enero' && program.dailyData && program.dailyData[oldKey]) {
          return program.dailyData[oldKey];
      }

      // 3. Si es otro mes y no tiene datos específicos, devolver vacío
      return { theme: '', ideas: '' };
  };

  const getEffectiveTheme = (weekId: string, dayName: string): string => {
      const newKey = getDataKey(weekId, dayName);
      const oldKey = getLegacyKey(weekId, dayName);
      
      if (dayThemes[newKey]) return dayThemes[newKey];
      if (currentMonthLabel === 'Enero' && dayThemes[oldKey]) return dayThemes[oldKey];
      
      return "";
  };

  // --- NAVEGACIÓN ---
  const handleMonthSelect = (index: number) => {
    setTargetDate(new Date(new Date().getFullYear(), index, 1));
    setIsMonthSelection(false);
    setSelectedWeekId(null);
    setSelectedDay(null);
  };

  const handleBack = () => {
    if (selectedDay) {
        // Volver de Editor a Vista de Semana
        setSelectedDay(null);
    } else if (selectedWeekId) {
        // Volver de Vista de Semana a Lista de Semanas
        setSelectedWeekId(null);
        setProgSearch('');
    } else {
        // Volver de Lista de Semanas a Selección de Mes
        setIsMonthSelection(true);
    }
  };

  // --- ACCIONES DE SEMANA ---
  const clearWeekData = () => {
     if (!selectedWeekId) return;
     
     const newKeyPrefix = `${currentMonthLabel}-${selectedWeekId}-`;
     const oldKeyPrefix = `${selectedWeekId}-`;

     const updatedPrograms = programs.map(p => {
        const newData = { ...(p.dailyData || {}) };
        Object.keys(newData).forEach(key => {
            // Borrar datos específicos del mes actual
            if (key.startsWith(newKeyPrefix)) {
                delete newData[key];
            }
            // Borrar datos legacy SOLO si estamos en Enero
            if (currentMonthLabel === 'Enero' && key.startsWith(oldKeyPrefix)) {
                delete newData[key];
            }
        });
        return { ...p, dailyData: newData };
     });

     const updatedDayThemes = { ...dayThemes };
     Object.keys(updatedDayThemes).forEach(key => {
        if (key.startsWith(newKeyPrefix)) {
            delete updatedDayThemes[key];
        }
        if (currentMonthLabel === 'Enero' && key.startsWith(oldKeyPrefix)) {
            delete updatedDayThemes[key];
        }
     });

     onUpdateMany(updatedPrograms);
     onUpdateDayThemes(updatedDayThemes);
  };

  const handleClearWeek = () => {
    if (confirm(`¿Estás seguro de BORRAR toda la planificación de esta semana (${currentMonthLabel})?`)) {
        clearWeekData();
        alert("🗑️ Semana limpiada correctamente.");
    }
  };

  const processImportText = (text: string) => {
    const lines = text.split(/\r?\n/);
    const updatedPrograms = JSON.parse(JSON.stringify(programs));
    const updatedDayThemes = { ...dayThemes };
    const dayMap: Record<string, string> = { 'lunes': 'Lunes', 'martes': 'Martes', 'miercoles': 'Miércoles', 'jueves': 'Jueves', 'viernes': 'Viernes', 'sabado': 'Sábado', 'domingo': 'Domingo' };

    let currentDayName: string | null = null;
    let currentProgIndex: number = -1;
    let currentKey: string | null = null; 
    let capturing: 'ideas' | null = null;
    let updatesCount = 0;

    const ensureDailyData = (progIndex: number, key: string) => {
        if (!updatedPrograms[progIndex].dailyData) updatedPrograms[progIndex].dailyData = {};
        if (!updatedPrograms[progIndex].dailyData[key]) updatedPrograms[progIndex].dailyData[key] = { theme: '', ideas: '' };
    };

    const matchProgramName = (prog: Program, inputName: string): boolean => {
      const pName = normalize(prog.name);
      const search = normalize(inputName);
      if (pName.includes(search) || search.includes(pName)) return true;
      if ((search.includes('noticiero') || search.includes('rcm noticias')) && (pName.includes('noticiero') || pName.includes('rcm noticias'))) return true;
      if (search.includes('buenos dias') && pName.includes('buenos dias')) return true;
      return false;
    };

    lines.forEach(line => {
      const clean = line.trim();
      const dayMatch = clean.match(/^\*\*?D[IÍ]A:\*\*?\s*(.*)/i) || clean.match(/^D[IÍ]A:\s*(.*)/i);
      if (dayMatch) {
        const rawContent = dayMatch[1].trim();
        const firstWord = rawContent.split(/[\s,.]+/)[0]; 
        const normalizedDay = normalize(firstWord);
        currentDayName = dayMap[normalizedDay] || null;
        if (currentDayName) {
            // Siempre guardamos con el formato nuevo específico del mes
            currentKey = getDataKey(selectedWeekId!, currentDayName);
        }
        currentProgIndex = -1;
        capturing = null;
        return;
      }
      
      const dayThemeMatch = clean.match(/^\*\*?Temática\s+del\s+d[íi]a:\*\*?\s*(.*)/i) || clean.match(/^Temática\s+del\s+d[íi]a:\s*(.*)/i);
      if (dayThemeMatch && currentKey) {
         updatedDayThemes[currentKey] = dayThemeMatch[1].trim();
         updatesCount++;
         return;
      }

      const progMatch = clean.match(/^\*\*?Programa:\*\*?\s*(.*)/i) || clean.match(/^Programa:\s*(.*)/i);
      if (progMatch) {
         const progNameInput = progMatch[1].trim();
         currentProgIndex = updatedPrograms.findIndex((p: Program) => matchProgramName(p, progNameInput));
         if (currentProgIndex !== -1 && currentKey) {
             ensureDailyData(currentProgIndex, currentKey!);
         } else {
             currentProgIndex = -1;
         }
         capturing = null;
         return;
      }

      if (!currentKey || currentProgIndex === -1) return;

      const themeMatch = clean.match(/^\*\*?Temática:\*\*?\s*(.*)/i) || clean.match(/^Temática:\s*(.*)/i);
      if (themeMatch) {
          updatedPrograms[currentProgIndex].dailyData[currentKey].theme = themeMatch[1].trim();
          updatesCount++;
          capturing = null;
          return;
      }

      const ideasMatch = clean.match(/^\*\*?Ideas:\*\*?/i) || clean.match(/^Ideas:/i);
      if (ideasMatch) {
          capturing = 'ideas';
          updatedPrograms[currentProgIndex].dailyData[currentKey].ideas = ""; 
          const content = clean.replace(/^\*\*?Ideas:\*\*?/i, '').replace(/^Ideas:/i, '').trim();
          if(content) updatedPrograms[currentProgIndex].dailyData[currentKey].ideas = content;
          updatesCount++;
          return;
      }

      if (clean.match(/^\*\*?Fuentes:\*\*?/i) || clean.match(/^Fuentes:/i)) {
          capturing = null;
          return;
      }

      if (capturing === 'ideas') {
          const currentText = updatedPrograms[currentProgIndex].dailyData[currentKey].ideas;
          updatedPrograms[currentProgIndex].dailyData[currentKey].ideas = currentText ? currentText + "\n" + line : line;
      }
    });

    if (updatesCount > 0) {
        onUpdateMany(updatedPrograms);
        onUpdateDayThemes(updatedDayThemes);
        return updatesCount;
    } else {
        return 0;
    }
  };

  const handleBulkTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWeekId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const count = processImportText(text);
      if (count > 0) alert(`✅ Agenda actualizada correctamente para ${currentMonthLabel} (${count} cambios).`);
      else alert("⚠️ No se detectaron datos válidos.");
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const getVisibleDays = () => {
    if (!activeWeek) return [];
    let days = activeWeek.days;
    // Filtro de días según perfil de usuario
    if (applyFilter && user.interests && user.interests.days.length > 0) {
      days = days.filter(d => d && user.interests!.days.includes(d.name));
    }
    return days;
  };

  const handleDownloadDocx = async () => {
      if (!activeWeek) return;
      const visibleDays = getVisibleDays(); // Usamos los días filtrados
      if (visibleDays.length === 0) {
          alert("No hay días visibles para generar el reporte.");
          return;
      }

      const weekNumber = activeWeek.label.replace('Semana ', '');
      const dateRange = `del ${activeWeek.start} al ${activeWeek.end}`;
      const docChildren: any[] = [];

      // TÍTULO DE LA EMISORA
      docChildren.push(new Paragraph({
          children: [new TextRun({ text: "RADIO CIUDAD MONUMENTO", bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
      }));

      // SUBTÍTULO
      docChildren.push(new Paragraph({
          children: [new TextRun({ text: "AGENDA EDITORIAL", bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
      }));

      const headerTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 } },
          rows: [
              new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: "MES", bold: true })] }), new TableCell({ children: [new Paragraph(currentMonthLabel)] }), new TableCell({ children: [new Paragraph({ text: "Semana", bold: true })] }), new TableCell({ children: [new Paragraph(weekNumber)] }) ] }),
              new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: dateRange, alignment: AlignmentType.CENTER })], columnSpan: 4 }) ] })
          ]
      });
      docChildren.push(headerTable);
      docChildren.push(new Paragraph({ text: "" }));

      for (const day of visibleDays) {
          if (!day) continue;
          
          const dayTheme = getEffectiveTheme(selectedWeekId!, day.name);
          const dayEfemerides = efemerides[currentMonthLabel]?.filter(e => e.day === day.date) || [];
          const dayConmemoraciones = conmemoraciones[currentMonthLabel]?.filter(c => c.day === day.date) || [];

          const efemeridesParagraphs: Paragraph[] = [];
          if (dayEfemerides.length > 0) {
              dayEfemerides.forEach(e => {
                  efemeridesParagraphs.push(new Paragraph({ children: [ new TextRun({ text: `${e.event}: `, bold: true }), new TextRun({ text: e.description }) ], spacing: { after: 100 } }));
              });
          } else {
              efemeridesParagraphs.push(new Paragraph(" "));
          }

          const conmemoracionesParagraphs: Paragraph[] = [];
          if (dayConmemoraciones.length > 0) {
              dayConmemoraciones.forEach(c => {
                  if (c.national) conmemoracionesParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Nacional: ", bold: true }), new TextRun(c.national)], spacing: { after: 100 } }));
                  if (c.international) conmemoracionesParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Internacional: ", bold: true }), new TextRun(c.international)], spacing: { after: 100 } }));
              });
          }
          if (conmemoracionesParagraphs.length === 0) conmemoracionesParagraphs.push(new Paragraph(" "));

          const dayRows: TableRow[] = [];
          dayRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${day.name} ${day.date}`, bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 2, shading: { fill: "F2F2F2" } })] }));
          dayRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "EFEMÉRIDES", alignment: AlignmentType.CENTER })], columnSpan: 2 })] }));
          dayRows.push(new TableRow({ children: [new TableCell({ children: efemeridesParagraphs, columnSpan: 2 })] }));
          dayRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "CONMEMORACIONES", alignment: AlignmentType.CENTER })], columnSpan: 2 })] }));
          dayRows.push(new TableRow({ children: [new TableCell({ children: conmemoracionesParagraphs, columnSpan: 2 })] }));
          dayRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "TEMÁTICA CENTRAL", alignment: AlignmentType.CENTER })], columnSpan: 2 })] }));
          dayRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: dayTheme || " ", alignment: AlignmentType.LEFT })], columnSpan: 2 })] }));

          dayRows.push(new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: "PROGRAMA", bold: true })], width: { size: 40, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph({ text: "Temática", bold: true, alignment: AlignmentType.CENTER })], width: { size: 60, type: WidthType.PERCENTAGE } }) ] }));

          // Filtro de programas también aquí para la exportación
          const dayProgs = searchablePrograms.filter(p => p.days.includes(day.name));
          dayProgs.sort((a,b) => a.time.localeCompare(b.time));

          if (dayProgs.length > 0) {
              dayProgs.forEach(p => {
                  const data = getEffectiveData(p, selectedWeekId!, day.name);
                  dayRows.push(new TableRow({ children: [ new TableCell({ children: [new Paragraph(p.name)] }), new TableCell({ children: [new Paragraph(data.theme || "-")] }) ] }));
              });
          } else {
              dayRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph("Sin programas asignados")] }), new TableCell({ children: [new Paragraph("-")] })] }));
          }
          docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: dayRows, borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 } } }));
          docChildren.push(new Paragraph({ text: "" }));
      }

      const doc = new Document({ sections: [{ children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // FORMATO: Agenda-Mes-Inicio-Fin
      a.download = `Agenda-${currentMonthLabel}-${activeWeek.start}-${activeWeek.end}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
  };

  const savePortadaEdit = () => {
    if (!selectedWeekId || !selectedDay || editThemePortada === null) return;
    const key = getDataKey(selectedWeekId, selectedDay.name);
    const newThemes = { ...dayThemes, [key]: editThemePortada };
    onUpdateDayThemes(newThemes);
    setEditThemePortada(null);
  };

  const openEditor = (p: Program, weekId: string, dayName: string) => {
    const data = getEffectiveData(p, weekId, dayName);
    const key = getDataKey(weekId, dayName);
    setEditingProg({ program: p, key });
    setEditData({ theme: data.theme, ideas: data.ideas || '' });
  };

  const saveProgEdit = () => {
    if (!editingProg) return;
    const { program, key } = editingProg;
    
    // Create a copy to update
    const updatedProgram = { ...program, dailyData: { ...program.dailyData } };
    updatedProgram.dailyData[key] = {
      theme: editData.theme,
      ideas: editData.ideas
    };
    onUpdateProgram(updatedProgram);
    setEditingProg(null);
  };

  // --- EDITOR DE PROGRAMA (Nivel 3) ---
  if (selectedWeekId && selectedDay) {
    const dayProgs = searchablePrograms.filter(p => {
        const matchesDay = p.days.includes(selectedDay.name);
        const matchesSearch = progSearch === '' || normalize(p.name).includes(normalize(progSearch));
        return matchesDay && matchesSearch;
    });
    
    const currentTheme = getEffectiveTheme(selectedWeekId, selectedDay.name);

    return (
      <div className="h-full flex flex-col bg-background-dark">
        <header className="flex-none bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5 shadow-xl z-20">
          <div className="flex items-center justify-between">
             <button onClick={handleBack} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10"><span className="material-symbols-outlined text-white">arrow_back</span></button>
             <div className="text-center"><h1 className="text-white text-xs font-bold uppercase">{selectedDay.name} {selectedDay.date}</h1><p className="text-[9px] text-primary font-bold uppercase tracking-widest">{currentMonthLabel}</p></div>
             <div className="size-10"></div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">
          <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem] relative group">
            <span className="text-[10px] font-bold text-primary uppercase block mb-1 tracking-widest">Temática del día</span>
            {editThemePortada !== null ? (
              <div className="space-y-3 mt-2">
                <textarea value={editThemePortada} onChange={e => setEditThemePortada(e.target.value)} className="w-full bg-background-dark border-none rounded-xl p-3 text-sm text-white min-h-[80px]" />
                <div className="flex gap-2">
                  <button onClick={savePortadaEdit} className="bg-primary px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Guardar</button>
                  <button onClick={() => setEditThemePortada(null)} className="bg-white/10 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <p className="text-white font-serif italic text-lg leading-tight flex-1">{currentTheme || "Sin temática cargada."}</p>
                {user.role === UserRole.ADMIN && (
                  <button onClick={() => setEditThemePortada(currentTheme || '')} className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0"><span className="material-symbols-outlined text-sm">edit</span></button>
                )}
              </div>
            )}
          </div>

          {dayProgs.length === 0 ? (
            <div className="text-center py-10 text-white/40">{progSearch ? "No se encontraron programas." : "No hay programas asignados para este día."}</div>
          ) : (
            dayProgs.map(p => {
              const data = getEffectiveData(p, selectedWeekId, selectedDay.name);
              const hasIdeas = data.ideas && data.ideas.length > 0;

              return (
                <div key={p.id} className="bg-card-dark border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-primary font-bold text-[9px] uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">{p.time} — {p.name}</span>
                     {user.role === UserRole.ADMIN && (
                        <button onClick={() => openEditor(p, selectedWeekId, selectedDay.name)} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:text-white z-10"><span className="material-symbols-outlined text-sm">edit</span></button>
                     )}
                  </div>
                  <h3 className="text-white font-bold text-base mb-4">{data.theme}</h3>
                  <div className="mt-2">
                    <button 
                        onClick={() => setViewModal({ title: `Ideas: ${p.name}`, content: data.ideas || "No hay ideas registradas." })}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 ${hasIdeas ? 'bg-primary/20 border-primary/30 text-white hover:bg-primary/30' : 'bg-white/5 border-white/5 text-text-secondary opacity-50'}`}
                    >
                        <span className="material-symbols-outlined text-sm">lightbulb</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ver Ideas</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </main>

        {editingProg && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="bg-card-dark w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 space-y-6 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="shrink-0">
                    <h3 className="text-primary font-bold text-[10px] uppercase tracking-widest mb-1">Editando Contenido</h3>
                    <p className="text-white font-bold text-lg">{editingProg.program.name}</p>
                </div>
                <div className="overflow-y-auto no-scrollbar space-y-4 pr-1">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Temática</label>
                    <input type="text" value={editData.theme} onChange={e => setEditData({...editData, theme: e.target.value})} className="w-full bg-background-dark border-none rounded-2xl p-4 text-sm text-white focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Ideas (200-250 palabras)</label>
                    <textarea value={editData.ideas} onChange={e => setEditData({...editData, ideas: e.target.value})} className="w-full bg-background-dark border-none rounded-2xl p-4 text-sm text-white min-h-[150px] focus:ring-1 focus:ring-primary font-serif leading-relaxed" />
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button onClick={saveProgEdit} className="flex-1 bg-primary py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Actualizar</button>
                    <button onClick={() => setEditingProg(null)} className="flex-1 bg-white/5 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                </div>
             </div>
          </div>
        )}
        {viewModal && <ContentModal title={viewModal.title} content={viewModal.content} onClose={() => setViewModal(null)} />}
      </div>
    );
  }

  // --- VISTA DE SEMANA (Nivel 2: Días de la Semana) ---
  if (selectedWeekId && !isMonthSelection && !selectedDay) {
      const visibleDays = getVisibleDays();
      
      const filteredDays = visibleDays.filter(d => {
          if(!d) return false;
          if(!progSearch) return true;
          return searchablePrograms.some(p => 
              p.days.includes(d.name) && 
              normalize(p.name).includes(normalize(progSearch))
          );
      });

      return (
        <div className="h-full flex flex-col bg-background-dark">
            <header className="flex-none flex flex-col bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5 z-20 space-y-3">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold leading-none">{activeWeek?.label}</h1>
                        <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">{currentMonthLabel}</p>
                    </div>
                </div>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-secondary">search</span>
                    <input type="text" placeholder="Filtrar por programa..." value={progSearch} onChange={(e) => setProgSearch(e.target.value)} className="w-full bg-background-dark border-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-primary shadow-inner placeholder:text-text-secondary/50" />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 pb-32">
                {filteredDays.length === 0 ? (
                    <div className="text-center py-20 text-white/40">
                        {progSearch ? "No se encontraron días con ese programa." : "No hay días visibles según tus filtros."}
                    </div>
                ) : (
                    filteredDays.map((d) => {
                        if (!d) return null;
                        const theme = getEffectiveTheme(selectedWeekId, d.name);
                        return (
                            <button 
                                key={d.date} 
                                onClick={() => setSelectedDay(d)} 
                                className="w-full flex items-center justify-between bg-card-dark p-6 rounded-[2rem] border border-white/5 shadow-lg active:scale-[0.98] transition-transform text-left group"
                            >
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-primary font-bold text-xl">{d.date}</span>
                                        <span className="text-white font-bold text-lg">{d.name}</span>
                                    </div>
                                    {progSearch ? (
                                        <div className="space-y-1">
                                            {searchablePrograms
                                                .filter(p => p.days.includes(d.name) && normalize(p.name).includes(normalize(progSearch)))
                                                .map(p => {
                                                    const pData = getEffectiveData(p, selectedWeekId, d.name);
                                                    return (
                                                        <div key={p.id} className="text-left">
                                                            <span className="text-primary text-[9px] font-bold uppercase tracking-wider">{p.name}</span>
                                                            <p className="text-white/90 text-[10px] line-clamp-2 leading-tight">{pData.theme || "Sin tema asignado"}</p>
                                                        </div>
                                                    );
                                                })
                                            }
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-text-secondary uppercase tracking-widest truncate">{theme || "Sin temática"}</p>
                                    )}
                                </div>
                                <span className="material-symbols-outlined text-white/20 group-hover:text-white transition-colors">chevron_right</span>
                            </button>
                        );
                    })
                )}
            </main>

            {/* HERRAMIENTAS DE SEMANA (Solo visibles aquí) */}
            <div className="flex-none bg-card-dark/95 backdrop-blur border-t border-white/5 p-4 z-40">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Botón Word */}
                     <button onClick={handleDownloadDocx} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                        <span className="material-symbols-outlined text-sm">description</span> Exportar Word
                    </button>
                    
                    {/* Botón Cargar TXT (Solo Admin) */}
                    {user.role === UserRole.ADMIN && (
                        <>
                             <input type="file" accept=".txt" ref={fileInputRef} className="hidden" onChange={handleBulkTxtUpload} />
                             <button onClick={() => fileInputRef.current?.click()} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                                <span className="material-symbols-outlined text-sm">upload_file</span> Cargar TXT
                            </button>
                        </>
                    )}
                </div>
                
                {/* HINT PARA TXT UPLOAD */}
                {user.role === UserRole.ADMIN && (
                    <div className="mb-3 p-3 bg-black/20 rounded-xl border border-white/5 text-[9px] text-text-secondary font-mono leading-relaxed">
                        <p className="font-bold text-primary mb-1 uppercase tracking-widest">Formato TXT Requerido:</p>
                        **DÍA:** Lunes<br/>
                        **Temática del día:** Tarea Vida<br/>
                        <br/>
                        **Programa:** Buenos Días, Bayamo<br/>
                        **Temática:** Ahorro energético<br/>
                        **Ideas:** Entrevista a especialista...
                    </div>
                )}

                {/* Botón Limpiar (Solo Admin) */}
                {user.role === UserRole.ADMIN && (
                    <button onClick={handleClearWeek} className="w-full bg-admin-red/10 border border-admin-red/20 text-admin-red hover:bg-admin-red/20 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                        <span className="material-symbols-outlined text-sm">delete_sweep</span> Limpiar Semana
                    </button>
                )}
            </div>
        </div>
      );
  }

  // --- VISTA PRINCIPAL (Meses o Semanas) ---
  // Nivel 0 y 1
  return (
    <div className="h-full flex flex-col bg-background-dark">
      <header className="flex-none p-4 border-b border-white/5 flex items-center justify-between bg-card-dark/50 z-20 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => isMonthSelection ? navigate('/home') : handleBack()} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5">
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-bold leading-none">{isMonthSelection ? "Agenda Anual" : "Planificación"}</h1>
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">{isMonthSelection ? dateInfo.year : currentMonthLabel}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">
        {/* VISTA SELECCIÓN DE MES (Nivel 0) */}
        {isMonthSelection ? (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                {MONTHS_DATA.map((month, index) => {
                    const isCurrent = index === new Date().getMonth();
                    return (
                        <button 
                            key={month.id}
                            onClick={() => handleMonthSelect(index)}
                            className={`relative h-24 flex flex-col items-center justify-center rounded-[1.5rem] border transition-all active:scale-95 shadow-lg ${isCurrent ? 'bg-primary border-primary text-white shadow-primary/20' : 'bg-card-dark border-white/5 text-text-secondary hover:bg-white/5'}`}
                        >
                            <p className={`text-xl font-bold ${isCurrent ? 'text-white' : 'text-white/80'}`}>{month.name}</p>
                            {isCurrent && <span className="text-[8px] font-bold uppercase tracking-widest mt-1 bg-black/20 px-2 py-0.5 rounded-full">En Curso</span>}
                        </button>
                    );
                })}
            </div>
        ) : (
          /* VISTA LISTA DE SEMANAS (Nivel 1) */
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            {weeks.map(w => (
              <button key={w.id} onClick={() => { setSelectedWeekId(w.id); setProgSearch(''); }} className="w-full flex items-center justify-between bg-card-dark p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-transform">
                <div className="text-left relative z-10">
                  <span className="text-white font-bold text-xl block group-hover:text-primary transition-colors">{w.label}</span>
                  <p className="text-[10px] text-text-secondary font-bold uppercase mt-1">Días {w.range}</p>
                </div>
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10"><span className="material-symbols-outlined text-2xl">calendar_view_week</span></div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Editorial;
