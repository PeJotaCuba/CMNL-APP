import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Download, Upload, FileText, Calendar, Filter, FileCode } from 'lucide-react';
import CMNLHeader from '../CMNLHeader';
import { User, FP02Report, ProgramFicha } from '../../types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle } from 'docx';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: User | null;
  fichas: ProgramFicha[];
  equipoData: any[]; // The array from 'rcm_equipo_cmnl'
  isCoordinatorWithAccess: boolean; // Tells if the user can insert/edit
  isGlobalAdmin: boolean;
}

const ReportesSection: React.FC<Props> = ({ onBack, onMenuClick, currentUser, fichas, equipoData, isCoordinatorWithAccess, isGlobalAdmin }) => {
  const [reports, setReports] = useState<FP02Report[]>(() => {
    const saved = localStorage.getItem('rcm_gestion_reportes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTab, setActiveTab] = useState<'ver' | 'nuevo'>('ver');
  const [inputMethod, setInputMethod] = useState<'manual' | 'archivo' | 'pegar'>('manual');
  
  const [formData, setFormData] = useState<Partial<FP02Report>>({
    fecha: new Date().toISOString().split('T')[0],
    emisora: 'CMNL',
    programa: '',
    especialidades: [
      { rol: 'Director', nombre: '' },
      { rol: 'Asesor', nombre: '' },
      { rol: 'Locutor', nombre: '' },
      { rol: 'Realizador de Sonido', nombre: '' },
    ]
  });

  const [textareaData, setTextareaData] = useState('');
  
  // Filters for informes
  const [filterProgram, setFilterProgram] = useState('Todos');
  const [filterDate, setFilterDate] = useState('Todos');
  const [filterMember, setFilterMember] = useState('Todos');

  // Normalization logic for matching programs
  const normalize = (s: string) => s ? s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const isMatch = (name1: string, name2: string) => {
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    if (norm1 === norm2) return true;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    return false; // simplified exactish match
  };

  useEffect(() => {
    localStorage.setItem('rcm_gestion_reportes', JSON.stringify(reports));
  }, [reports]);

  const canEdit = isGlobalAdmin || isCoordinatorWithAccess;

  const handleProgramSelect = (progName: string) => {
    setFormData(prev => ({ ...prev, programa: progName }));
    const ficha = fichas.find(f => f.name === progName);
    
    // Attempt auto-fill from Equipo
    const newEspecialidades = [...(formData.especialidades || [])];
    
    newEspecialidades.forEach(esp => {
      // Find someone in equipo whose habitualProgramsByRole for esp.rol includes progName
      const assigned = equipoData.find(m => {
        const rolesObj = m.habitualProgramsByRole || {};
        for (const [rName, progs] of Object.entries(rolesObj)) {
            const rn = normalize(rName);
            const en = normalize(esp.rol);
            if (rn === en || rn.includes(en) || en.includes(rn) || 
                (en.includes('sonido') && rn.includes('sonido')) ||
                (en.includes('locutor') && rn.includes('locuc')) ||
                (en.includes('asesor') && rn.includes('asesor')) ||
                (en.includes('director') && rn.includes('direc'))) {
                
                if ((progs as string[]).some((p: string) => isMatch(p, progName))) {
                    return true;
                }
            }
        }
        return false;
      });

      if (assigned && !esp.nombre) {
        esp.nombre = assigned.name;
      } else if (!assigned && progName) {
        // Only reset if it's currently empty, to avoid clearing manual entries unless switching programs
        esp.nombre = ''; 
      }
    });

    setFormData(prev => ({
      ...prev,
      programa: progName,
      especialidades: newEspecialidades
    }));
  };

  const handleParseText = (text: string) => {
    const lines = text.split('\n');
    let prog = '';
    let dir = '', as = '', loc = '', rds = '';
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.startsWith('programa:')) prog = line.substring(9).trim();
      if (lower.startsWith('director:')) dir = line.substring(9).trim();
      if (lower.startsWith('asesor:')) as = line.substring(7).trim();
      if (lower.startsWith('locutor:')) loc = line.substring(8).trim();
      if (lower.startsWith('realizador de sonido:') || lower.startsWith('sonido:')) 
        rds = line.split(':')[1].trim();
    });

    if (prog) handleProgramSelect(prog);
    
    setTimeout(() => {
      setFormData(prev => {
        const esp = [...(prev.especialidades || [])];
        if(dir) esp[0].nombre = dir;
        if(as) esp[1].nombre = as;
        if(loc) esp[2].nombre = loc;
        if(rds) esp[3].nombre = rds;
        return { ...prev, especialidades: esp };
      });
    }, 100); // small delay to let handleProgramSelect set base fields first
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        handleParseText(content);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!formData.programa || !formData.fecha) {
      alert("Programa y Fecha son obligatorios.");
      return;
    }
    
    const mes = formData.fecha.substring(0, 7); // YYYY-MM
    
    const newReport: FP02Report = {
      id: Date.now().toString(),
      fecha: formData.fecha,
      emisora: formData.emisora || 'CMNL',
      programa: formData.programa,
      especialidades: formData.especialidades || [],
      mes: mes
    };

    setReports([...reports, newReport]);
    alert("Reporte guardado exitosamente");
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      emisora: 'CMNL',
      programa: '',
      especialidades: [
        { rol: 'Director', nombre: '' },
        { rol: 'Asesor', nombre: '' },
        { rol: 'Locutor', nombre: '' },
        { rol: 'Realizador de Sonido', nombre: '' },
      ]
    });
    setActiveTab('ver');
  };

  const downloadReportBackup = () => {
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
    saveAs(blob, `CMNL_Reportes_${new Date().toISOString().split('T')[0]}.json`);
  };

  const uploadReportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = JSON.parse(evt.target?.result as string);
          if (Array.isArray(content)) {
            setReports(content);
            alert("Base de datos de reportes cargada.");
          }
        } catch {
          alert("Error al cargar archivo.");
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const exportDoc = async (report: FP02Report) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "Modelo FP-02", alignment: AlignmentType.CENTER, heading: "Heading1" }),
          new Paragraph({ text: `Fecha: ${report.fecha}` }),
          new Paragraph({ text: `Emisora: ${report.emisora}` }),
          new Paragraph({ text: `Programa: ${report.programa}` }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                   new TableCell({ children: [new Paragraph("Especialidad")] }),
                   new TableCell({ children: [new Paragraph("Nombre y Apellidos")] }),
                ]
              }),
              ...report.especialidades.map(esp => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(esp.rol)] }),
                  new TableCell({ children: [new Paragraph(esp.nombre)] }),
                ]
              }))
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Reporte_FP02_${report.programa}_${report.fecha}.docx`);
  };

  // Visibility logic
  const visibleReports = reports.filter(r => {
    if (canEdit) return true; // Admins / Coordinators see all
    // normal workers only see reports where they are in "especialidades"
    return r.especialidades.some(esp => normalize(esp.nombre).includes(normalize(currentUser?.name || '')));
  });

  // Filter logic for Informes
  const filteredForInforme = visibleReports.filter(r => {
    if (filterProgram !== 'Todos' && r.programa !== filterProgram) return false;
    if (filterDate !== 'Todos' && r.fecha !== filterDate) return false;
    if (filterMember !== 'Todos' && !r.especialidades.some(esp => esp.nombre === filterMember)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      <CMNLHeader 
          user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
          sectionTitle="Gestión de Reportes"
          onMenuClick={onMenuClick}
          onBack={onBack}
      />
      
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-[#9E7649]/30 mb-6">
          <button 
            className={`pb-2 px-4 font-bold border-b-2 transition-colors ${activeTab === 'ver' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
            onClick={() => setActiveTab('ver')}
          >
            Ver Reportes
          </button>
          {canEdit && (
            <button 
              className={`pb-2 px-4 font-bold border-b-2 transition-colors ${activeTab === 'nuevo' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
              onClick={() => setActiveTab('nuevo')}
            >
              Nuevo Reporte (FP-02)
            </button>
          )}
        </div>

        {activeTab === 'ver' && (
          <div className="space-y-6">
            <div className="flex gap-4 p-4 bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 flex-wrap items-end">
               <div className="flex-1 min-w-[200px]">
                 <label className="block text-xs text-[#9E7649] mb-1">Programa</label>
                 <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white">
                   <option value="Todos">Todos</option>
                   {Array.from(new Set(visibleReports.map(r => r.programa))).map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
               </div>
               <div className="flex-1 min-w-[200px]">
                 <label className="block text-xs text-[#9E7649] mb-1">Fecha</label>
                 <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white">
                   <option value="Todos">Todos</option>
                   {Array.from(new Set(visibleReports.map(r => r.fecha))).map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
               </div>
               <div className="flex-1 min-w-[200px]">
                 <label className="block text-xs text-[#9E7649] mb-1">Miembro</label>
                 <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white">
                   <option value="Todos">Todos</option>
                   {Array.from(new Set(visibleReports.flatMap(r => r.especialidades.map(e => e.nombre).filter(n => n)))).map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
               </div>
               <div className="pb-2">
                 <span className="text-sm font-bold text-[#9E7649] bg-black/30 px-3 py-1 rounded">Total: {filteredForInforme.length}</span>
               </div>
               {canEdit && (
                 <div className="flex gap-2 pb-1">
                   <button onClick={downloadReportBackup} className="p-2 bg-blue-900/60 rounded text-blue-300 hover:bg-blue-800/60" title="Descargar BD Reportes"><Download size={18} /></button>
                   <label className="p-2 bg-purple-900/60 rounded text-purple-300 hover:bg-purple-800/60 cursor-pointer" title="Cargar BD Reportes">
                     <Upload size={18} />
                     <input type="file" accept=".json" className="hidden" onChange={uploadReportBackup} />
                   </label>
                 </div>
               )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
               {filteredForInforme.map(rep => (
                 <div key={rep.id} className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20 relative group">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold text-white text-lg">{rep.programa}</h3>
                       <p className="text-sm text-[#9E7649]">{rep.fecha}</p>
                     </div>
                     <button onClick={() => exportDoc(rep)} className="p-2 text-[#9E7649] hover:bg-[#9E7649]/20 rounded-full transition-colors" title="Exportar a Word">
                        <FileCode size={20} />
                     </button>
                   </div>
                   <div className="text-sm border-t border-[#9E7649]/10 pt-3">
                     {rep.especialidades.filter(e => e.nombre).map(e => (
                       <div key={e.rol} className="flex justify-between py-1">
                         <span className="text-[#E8DCCF]/60 text-xs">{e.rol}</span>
                         <span className="text-white text-sm">{e.nombre}</span>
                       </div>
                     ))}
                   </div>
                   {canEdit && (
                       <button 
                         onClick={() => { if(confirm('¿Eliminar?')) setReports(reports.filter(r => r.id !== rep.id)) }} 
                         className="absolute bottom-2 right-2 p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-full transition-all"
                       >
                         ✕
                       </button>
                   )}
                 </div>
               ))}
               {filteredForInforme.length === 0 && <p className="col-span-2 text-center text-[#E8DCCF]/50 py-10">No hay reportes encontrados.</p>}
            </div>
          </div>
        )}

        {canEdit && activeTab === 'nuevo' && (
          <div className="space-y-6">
             <div className="flex gap-2 p-1 bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 w-fit">
               <button onClick={() => setInputMethod('manual')} className={`px-4 py-2 rounded-lg text-sm font-bold ${inputMethod === 'manual' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}>Manual</button>
               <button onClick={() => setInputMethod('archivo')} className={`px-4 py-2 rounded-lg text-sm font-bold ${inputMethod === 'archivo' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}>TXT</button>
               <button onClick={() => setInputMethod('pegar')} className={`px-4 py-2 rounded-lg text-sm font-bold ${inputMethod === 'pegar' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}>Pegar Texto</button>
             </div>

             {inputMethod === 'archivo' && (
               <div className="border-2 border-dashed border-[#9E7649]/40 rounded-xl p-10 text-center hover:bg-[#9E7649]/5 transition-colors cursor-pointer relative">
                 <input type="file" accept=".txt" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                 <Upload size={32} className="mx-auto text-[#9E7649] mb-4" />
                 <p className="text-[#E8DCCF] font-bold">Cargar archivo TXT</p>
                 <p className="text-sm text-[#E8DCCF]/50 mt-1">El sistema identificará palabras clave como Programa:, Director:, etc.</p>
               </div>
             )}

             {inputMethod === 'pegar' && (
               <div className="space-y-3">
                 <textarea 
                   rows={6}
                   value={textareaData}
                   onChange={e => setTextareaData(e.target.value)}
                   className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white"
                   placeholder="Pega el contenido aquí. Ejemplo:&#10;Programa: Noticiero&#10;Director: Juan"
                 />
                 <button 
                   onClick={() => handleParseText(textareaData)}
                   className="px-4 py-2 bg-[#9E7649] text-white font-bold rounded-lg"
                 >
                   Procesar Texto
                 </button>
               </div>
             )}

             <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 space-y-6 mt-6">
                <h3 className="font-bold text-xl text-white border-b border-[#9E7649]/20 pb-3">Modelo FP-02</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase tracking-wider">Emisora</label>
                    <input type="text" value={formData.emisora} readOnly className="w-full bg-black/40 border border-transparent rounded-lg p-3 text-[#E8DCCF]/60 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase tracking-wider">Fecha</label>
                    <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full bg-black/20 border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase tracking-wider">Programa</label>
                    <select 
                      value={formData.programa} 
                      onChange={e => handleProgramSelect(e.target.value)}
                      className="w-full bg-black/20 border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {[...fichas.map(f => f.name), 'Trabajos Periodísticos', 'Propaganda', 'Cabina 12:00 a 12:30', 'Cabina 1:00 a 1:30'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-8 border-t border-[#9E7649]/20 pt-6">
                  <h4 className="font-bold text-[#E8DCCF] mb-4">Especialidades</h4>
                  <div className="space-y-3">
                    {formData.especialidades?.map((esp, i) => (
                      <div key={esp.rol} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                         <div className="w-40 text-sm font-bold text-[#9E7649]">{esp.rol}</div>
                         <input 
                           type="text" 
                           value={esp.nombre}
                           onChange={e => {
                             const newEspecs = [...(formData.especialidades || [])];
                             newEspecs[i].nombre = e.target.value;
                             setFormData({...formData, especialidades: newEspecs});
                           }}
                           className="flex-1 bg-black/20 border border-[#9E7649]/30 rounded-lg p-2 text-white text-sm"
                           placeholder="Nombre y Apellidos"
                         />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="bg-[#5D3A24] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#4A2E1D] transition-colors shadow-lg"
                  >
                    Guardar Reporte
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportesSection;
