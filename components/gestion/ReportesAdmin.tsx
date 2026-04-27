import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, FileCode, Search, FileDown, Trash2, Save, Upload } from 'lucide-react';
import { User, FP02Report, ProgramFicha, ConsolidatedPayment, ProgramCatalog } from '../../types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocRow, TableCell as DocCell, TextRun, AlignmentType, WidthType } from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

// [NOTE]: Extracted Admin section to preserve all existing logic safely
interface Props {
  currentUser: User | null;
  fichas: ProgramFicha[];
  equipoData: any[]; // The array from 'rcm_equipo_cmnl'
  catalogo: ProgramCatalog[];
  consolidatedPayments: ConsolidatedPayment[];
  setConsolidatedPayments: React.Dispatch<React.SetStateAction<ConsolidatedPayment[]>>;
  getProgramRate: (name: string, role: string, level: string) => number;
  calculateTax: (amount: number) => number;
  reports: FP02Report[];
  setReports: React.Dispatch<React.SetStateAction<FP02Report[]>>;
  isMatch: (name1: string, name2: string) => boolean;
  normalize: (s: string) => string;
}

export const ReportesAdmin: React.FC<Props> = ({
  currentUser, fichas, equipoData, catalogo,
  consolidatedPayments, setConsolidatedPayments,
  getProgramRate, calculateTax, reports, setReports, isMatch, normalize
}) => {
  const [activeTab, setActiveTab] = useState<'registro' | 'reportes' | 'pagosRealizados'>('registro');
  const [inputMethod, setInputMethod] = useState<'manual' | 'archivo' | 'pegar'>('manual');
  
  const [formData, setFormData] = useState<Partial<FP02Report>>({
    fecha: new Date().toLocaleDateString('sv'),
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
  
  const [filterProgram, setFilterProgram] = useState('Todos');
  const [filterDate, setFilterDate] = useState('Todos');
  const [filterMember, setFilterMember] = useState('Todos');
  const [filterMonth, setFilterMonth] = useState(new Date().toLocaleDateString('sv').substring(0, 7));

  const getMemberRoleLevel = (member: any, role: string) => {
    if (!member) return 'I';
    const specialties = member.specialty ? member.specialty.split(' / ') : [];
    const levels = member.level ? member.level.split(' / ') : [];
    
    const roleIndex = specialties.findIndex((s: string) => normalize(s).includes(normalize(role)));
    const levelStr = (roleIndex >= 0 ? (levels[roleIndex] || levels[0]) : (member.level || 'I')).toLowerCase();
    
    if (levelStr.includes('primer')) return 'I';
    if (levelStr.includes('segundo')) return 'II';
    if (levelStr.includes('tercer')) return 'III';
    if (levelStr.includes('habilitado') || levelStr.includes('no especificado')) return 'SR';
    return 'I';
  };

  const metrics = React.useMemo(() => {
    if (filterMember === 'Todos' || !filterMember) return null;
    
    const memberData = equipoData.find(m => isMatch(m.name, filterMember) || (m.username && isMatch(m.username, filterMember)));
    
    const userReportsInMonth = reports.filter(r => 
        r.mes === filterMonth && 
        r.especialidades.some(esp => isMatch(esp.nombre, filterMember))
    );

    let bruto = 0;
    userReportsInMonth.forEach(rep => {
        const esp = rep.especialidades.find(e => isMatch(e.nombre, filterMember));
        if (esp) {
            const level = getMemberRoleLevel(memberData, esp.rol);
            bruto += getProgramRate(rep.programa, esp.rol, level);
        }
    });

    const tax = calculateTax(bruto);
    return {
        bruto,
        tax,
        neto: bruto - tax,
        count: userReportsInMonth.length
    };
  }, [filterMember, filterMonth, reports, equipoData, getProgramRate, calculateTax, isMatch]);

  const handleConsolidate = () => {
    if (!metrics || filterMember === 'Todos') return;
    
    if (window.confirm(`¿Consolidar el pago de ${filterMember} para el mes ${filterMonth}?`)) {
        const user = equipoData.find(m => m.name === filterMember);
        const newConsolidated: ConsolidatedPayment = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user?.username || filterMember,
            month: filterMonth,
            amount: metrics.neto,
            grossAmount: metrics.bruto,
            taxAmount: metrics.tax,
            reportCount: metrics.count,
            dateConsolidated: new Date().toISOString(),
            calculationMode: 'oficial_from_reports'
        };
        
        setConsolidatedPayments(prev => [...prev.filter(c => !(c.userId === newConsolidated.userId && c.month === filterMonth)), newConsolidated]);
        alert("Pago consolidado exitosamente. Puede verlo en la pestaña Pagos Realizados.");
    }
  };

  const exportPaymentsTable = (format: 'docx' | 'pdf' | 'xlsx') => {
    const data = consolidatedPayments
      .filter(p => p.month === filterMonth)
      .map(p => {
          const user = equipoData.find(m => m.username === p.userId || m.name === p.userId);
          return {
              nombre: user?.name || p.userId,
              mes: p.month,
              reportes: p.reportCount || 0,
              bruto: p.grossAmount || 0,
              impuestos: p.taxAmount || 0,
              neto: p.amount
          };
      });

    if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pagos");
        XLSX.writeFile(wb, `Pagos_CMNL_${filterMonth}.xlsx`);
    } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text(`Pagos Realizados - CMNL - ${filterMonth}`, 14, 15);
        autoTable(doc, {
            startY: 20,
            head: [['Nombre', 'Mes', 'Reportes', 'Bruto', 'Impuestos', 'Neto']],
            body: data.map(d => [d.nombre, d.mes, d.reportes.toString(), `$${d.bruto.toFixed(2)}`, `$${d.impuestos.toFixed(2)}`, `$${d.neto.toFixed(2)}`]),
        });
        doc.save(`Pagos_CMNL_${filterMonth}.pdf`);
    } else if (format === 'docx') {
        const table = new DocTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocRow({
                    children: ['Nombre', 'Mes', 'Reps', 'Bruto', 'Imp.', 'Neto'].map(text => 
                        new DocCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                            shading: { fill: '5D3A24' }
                        })
                    )
                }),
                ...data.map(d => new DocRow({
                    children: [
                        d.nombre, d.mes, d.reportes.toString(), `$${d.bruto.toFixed(2)}`, `$${d.impuestos.toFixed(2)}`, `$${d.neto.toFixed(2)}`
                    ].map(text => new DocCell({ children: [new Paragraph({ text, alignment: AlignmentType.CENTER })] }))
                }))
            ]
        });

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ children: [new TextRun({ text: `PAGOS CONSOLIDADOS - CMNL - ${filterMonth}`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                    table
                ]
            }]
        });

        Packer.toBlob(doc).then(blob => saveAs(blob, `Pagos_CMNL_${filterMonth}.docx`));
    }
  };

  const handleProgramSelect = (progName: string) => {
    setFormData(prev => ({ ...prev, programa: progName }));
    const newEspecialidades = [...(formData.especialidades || [])];
    
    const matchRole = (r1: string, r2: string) => {
        const n1 = normalize(r1);
        const n2 = normalize(r2);
        if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
        if (n1.includes('sonido') && n2.includes('sonido')) return true;
        if (n1.includes('locut') && n2.includes('locut')) return true;
        if (n1.includes('asesor') && n2.includes('asesor')) return true;
        if (n1.includes('direc') && n2.includes('direc')) return true;
        return false;
    };

    newEspecialidades.forEach(esp => {
      const assigned = equipoData.find(m => {
        const rolesObj = m.habitualProgramsByRole || {};
        for (const [rName, progs] of Object.entries(rolesObj)) {
            if (matchRole(rName, esp.rol)) {
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
    }, 100); 
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
    
    const mes = formData.fecha.substring(0, 7); 
    
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
      fecha: new Date().toLocaleDateString('sv'),
      emisora: 'CMNL',
      programa: '',
      especialidades: [
        { rol: 'Director', nombre: '' },
        { rol: 'Asesor', nombre: '' },
        { rol: 'Locutor', nombre: '' },
        { rol: 'Realizador de Sonido', nombre: '' },
      ]
    });
    setActiveTab('reportes');
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
          new DocTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new DocRow({
                children: [
                   new DocCell({ children: [new Paragraph("Especialidad")] }),
                   new DocCell({ children: [new Paragraph("Nombre y Apellidos")] }),
                ]
              }),
              ...report.especialidades.map(esp => new DocRow({
                children: [
                  new DocCell({ children: [new Paragraph(esp.rol)] }),
                  new DocCell({ children: [new Paragraph(esp.nombre)] }),
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

  const filteredForInforme = reports.filter(r => {
    if (filterProgram !== 'Todos' && r.programa !== filterProgram) return false;
    if (filterDate !== 'Todos' && r.fecha !== filterDate) return false;
    if (filterMember !== 'Todos') {
        const hasMember = r.especialidades.some(esp => isMatch(esp.nombre, filterMember));
        if (!hasMember) return false;
    }
    return true;
  });

  return (
      <div className="flex-1 w-full flex flex-col">
          <div className="flex gap-4 border-b border-[#9E7649]/30 mb-6 overflow-x-auto no-scrollbar">
              <button 
                className={`pb-2 px-4 font-bold text-xs md:text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'registro' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('registro')}
              >
                Registro
              </button>
              <button 
                className={`pb-2 px-4 font-bold text-xs md:text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'reportes' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('reportes')}
              >
                Reportes
              </button>
              <button 
                className={`pb-2 px-4 font-bold text-xs md:text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'pagosRealizados' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('pagosRealizados')}
              >
                Pagos
              </button>
          </div>

          {activeTab === 'reportes' && (
          <div className="space-y-6">
            <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-4 space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                   <div className="flex-1 min-w-[150px]">
                     <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Mes</label>
                     <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white border border-[#9E7649]/20" />
                   </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Filtrar por Miembro</label>
                      <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white border border-[#9E7649]/20">
                        <option value="Todos">Todos los Miembros</option>
                        {equipoData
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(m => <option key={m.id} value={m.name}>{m.name}</option>)
                        }
                      </select>
                    </div>
                   <div className="flex-1 min-w-[200px]">
                     <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Filtrar por Programa</label>
                     <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white border border-[#9E7649]/20">
                       <option value="Todos">Favoritos/Todos</option>
                       {Array.from(new Set(reports.map(r => r.programa))).map(p => <option key={p} value={p as string}>{p}</option>)}
                     </select>
                   </div>
                </div>

                {metrics && (
                    <div className="mt-4 p-4 bg-[#3E1E16] rounded-xl border border-[#9E7649]/30 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1">
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Pagos y Reportes</p>
                            <p className="text-xl font-bold text-white">{metrics.count}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Ingreso Bruto</p>
                            <p className="text-xl font-bold text-white">${metrics.bruto.toFixed(2)}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Impuestos</p>
                            <p className="text-xl font-bold text-red-400">-${metrics.tax.toFixed(2)}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Pago Neto</p>
                            <p className="text-xl font-bold text-green-400">${metrics.neto.toFixed(2)}</p>
                        </div>
                        <div className="col-span-full border-t border-[#9E7649]/20 pt-4 flex justify-end">
                            <button 
                                onClick={handleConsolidate}
                                className="flex items-center gap-2 bg-[#9E7649] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8B653D] shadow-lg transition-all"
                            >
                                <Save size={18} /> Consolidar Pago Mes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
               {filteredForInforme.filter(r => r.mes === filterMonth).map(rep => (
                 <div key={rep.id} className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20 relative group hover:border-[#9E7649]/40 transition-all">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold text-white text-lg">{rep.programa}</h3>
                       <div className="flex items-center gap-2 text-xs text-[#9E7649]">
                           <Calendar size={12} />
                           <span>{rep.fecha}</span>
                       </div>
                     </div>
                     <button 
                         onClick={() => { if(confirm('¿Eliminar reporte?')) setReports(reports.filter(r => r.id !== rep.id)) }} 
                         className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                         title="Eliminar Reporte"
                      >
                         <Trash2 size={20} />
                      </button>
                   </div>
                    <div className="text-sm border-t border-[#9E7649]/10 pt-3 space-y-1">
                      {rep.especialidades.filter(e => e.nombre).map(e => {
                        return (
                          <div key={e.rol} className="flex justify-between items-center py-1 bg-black/10 px-2 rounded">
                            <span className="text-[#E8DCCF]/60 text-[10px] uppercase font-bold">{e.rol}</span>
                            <span className="text-white text-sm font-medium">{e.nombre}</span>
                          </div>
                        );
                      })}
                    </div>
                 </div>
               ))}
               {filteredForInforme.filter(r => r.mes === filterMonth).length === 0 && <p className="col-span-2 text-center text-[#E8DCCF]/50 py-20 border border-dashed border-[#9E7649]/20 rounded-xl italic">No hay reportes para este mes y filtros.</p>}
            </div>
          </div>
          )}

          {activeTab === 'pagosRealizados' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white">Pagos</h3>
                        <p className="text-xs md:text-sm text-[#9E7649]">Listado completo de consolidaciones mensuales ({filterMonth})</p>
                    </div>
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                         <div className="bg-black/40 border border-[#9E7649]/20 p-2 rounded-lg flex items-center gap-2 flex-grow sm:flex-grow-0">
                            <label className="text-[10px] text-[#9E7649] uppercase font-bold">Mes:</label>
                            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-transparent border-none text-white text-sm focus:ring-0 w-full sm:w-32" />
                        </div>
                        <div className="flex gap-2 justify-center sm:justify-start">
                            <button onClick={() => exportPaymentsTable('xlsx')} className="flex-1 sm:flex-none p-2.5 bg-green-900/40 text-green-400 rounded-lg border border-green-900/40 hover:bg-green-800 transition-all shadow-lg" title="Exportar Excel"><FileDown size={20} className="mx-auto" /></button>
                            <button onClick={() => exportPaymentsTable('pdf')} className="flex-1 sm:flex-none p-2.5 bg-red-900/40 text-red-400 rounded-lg border border-red-900/40 hover:bg-red-800 transition-all shadow-lg" title="Exportar PDF"><FileDown size={20} className="mx-auto" /></button>
                            <button onClick={() => exportPaymentsTable('docx')} className="flex-1 sm:flex-none p-2.5 bg-blue-900/40 text-blue-400 rounded-lg border border-blue-900/40 hover:bg-blue-800 transition-all shadow-lg" title="Exportar Word"><FileCode size={20} className="mx-auto" /></button>
                        </div>
                    </div>
                </div>

                    <div className="overflow-x-auto -mx-6">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-[#9E7649] uppercase tracking-widest bg-[#3E1E16] border-y border-[#9E7649]/10">
                                <tr>
                                    <th className="px-6 py-4">Miembro</th>
                                    <th className="px-6 py-4 text-center">Mes</th>
                                    <th className="px-6 py-4 text-center">Pagos y Reportes</th>
                                    <th className="px-6 py-4 text-right">Bruto</th>
                                    <th className="px-6 py-4 text-right">Impuestos</th>
                                    <th className="px-6 py-4 text-right">Pago Neto</th>
                                    <th className="px-6 py-4 text-center">Consolidado</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#9E7649]/10">
                                {consolidatedPayments
                                    .filter(p => p.month === filterMonth)
                                    .map(p => {
                                        const user = equipoData.find(m => m.username === p.userId || m.name === p.userId);
                                        return (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white">{user?.name || p.userId}</div>
                                                    <div className="text-[10px] text-[#9E7649]">{user?.classification}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono">{p.month}</td>
                                                <td className="px-6 py-4 text-center font-bold text-blue-400">{p.reportCount || '-'}</td>
                                                <td className="px-6 py-4 text-right text-[#E8DCCF]/60 font-mono">${(p.grossAmount || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-red-400 font-mono">-${(p.taxAmount || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-green-400 font-mono font-bold text-lg">${p.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center text-[10px] text-[#9E7649] whitespace-nowrap">
                                                    {new Date(p.dateConsolidated).toLocaleDateString()}<br/>
                                                    {new Date(p.dateConsolidated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                <td className="px-6 py-4 text-center space-x-2">
                                                    <button onClick={() => { if(confirm('¿Eliminar registro?')) setConsolidatedPayments(prev => prev.filter(x => x.id !== p.id)) }} className="text-red-500/50 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                }
                                {consolidatedPayments.filter(p => p.month === filterMonth).length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-[#E8DCCF]/20 italic">No se han encontrado pagos consolidados para este mes.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'registro' && (
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
                <h3 className="font-bold text-lg md:text-xl text-white border-b border-[#9E7649]/20 pb-3">Registro (Modelo FP-02)</h3>
                
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
  );
};
