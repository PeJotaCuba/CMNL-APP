import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MONTHS_DATA } from '../constants';
import { getCurrentDateInfo } from '../utils/dateUtils';
import { UserProfile, UserRole, CulturalOptionsData, CulturalOption } from '../types';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import AgendaHeader from '../components/AgendaHeader';

interface CulturalOptionsProps {
  user: UserProfile;
  data: CulturalOptionsData;
  onUpdate: (data: CulturalOptionsData) => void;
  onMenuClick?: () => void;
  onBack: () => void;
}

const CulturalOptions: React.FC<CulturalOptionsProps> = ({ user, data, onUpdate, onMenuClick, onBack }) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [daySearch, setDaySearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInfo = getCurrentDateInfo();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newData: CulturalOptionsData = { ...data };
      
      const currentMonth = dateInfo.monthName.charAt(0).toUpperCase() + dateInfo.monthName.slice(1).toLowerCase();
      
      let currentDay = 0;
      let currentActivity: Partial<CulturalOption> = {};
      let parsedDays: Record<number, CulturalOption[]> = {};

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const dayMatch = trimmed.match(/^D[IÍ]A\s+(\d+)/i);
        if (dayMatch) {
          currentDay = parseInt(dayMatch[1]);
          if (!parsedDays[currentDay]) parsedDays[currentDay] = [];
          return;
        }

        if (currentDay > 0) {
          if (trimmed.toLowerCase().startsWith('actividad:')) {
            if (currentActivity.actividad) {
              parsedDays[currentDay].push(currentActivity as CulturalOption);
              currentActivity = {};
            }
            currentActivity.actividad = trimmed.substring(10).trim();
          } else if (trimmed.toLowerCase().startsWith('hora:')) {
            currentActivity.hora = trimmed.substring(5).trim();
          } else if (trimmed.toLowerCase().startsWith('lugar:')) {
            currentActivity.lugar = trimmed.substring(6).trim();
            parsedDays[currentDay].push(currentActivity as CulturalOption);
            currentActivity = {};
          }
        }
      });

      if (currentActivity.actividad && currentDay > 0) {
        parsedDays[currentDay].push({
          actividad: currentActivity.actividad || '',
          hora: currentActivity.hora || '',
          lugar: currentActivity.lugar || ''
        });
      }

      if (!newData[currentMonth]) newData[currentMonth] = [];

      let monthData = [...newData[currentMonth]];
      
      Object.keys(parsedDays).forEach(dayStr => {
        const dayNum = parseInt(dayStr);
        monthData = monthData.filter(d => d.day !== dayNum);
        monthData.push({
          day: dayNum,
          activities: parsedDays[dayNum]
        });
      });

      newData[currentMonth] = monthData;

      onUpdate(newData);
      alert("Opciones Culturales cargadas con éxito.");
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDownloadDocx = async () => {
    if (!selectedMonth || !data[selectedMonth]) return;

    const monthData = [...data[selectedMonth]].sort((a, b) => a.day - b.day);
    
    const children: any[] = [
      new Paragraph({
        text: `Opciones Culturales - ${selectedMonth}`,
        heading: "Heading1",
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: "" })
    ];

    monthData.forEach(dayData => {
      children.push(new Paragraph({
        text: `DÍA ${dayData.day}`,
        heading: "Heading2",
        spacing: { before: 200, after: 100 }
      }));

      dayData.activities.forEach(act => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Actividad: ", bold: true }),
            new TextRun(act.actividad)
          ]
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Hora: ", bold: true }),
            new TextRun(act.hora)
          ]
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Lugar: ", bold: true }),
            new TextRun(act.lugar)
          ],
          spacing: { after: 200 }
        }));
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Opciones_Culturales_${selectedMonth}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderUploadBtn = () => {
    if (user.role !== UserRole.ADMIN) return null;
    return (
      <div className="px-4 py-6 border-t border-white/10 mt-auto bg-card-dark">
        <input type="file" accept=".txt" ref={fileInputRef} className="hidden" onChange={handleUpload} />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-2xl font-bold text-xs shadow-xl active:scale-95 transition-all mb-3"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Cargar TXT
        </button>
        <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[9px] text-text-secondary font-mono leading-relaxed">
            <p className="font-bold text-primary mb-1 uppercase tracking-widest">Formato Requerido:</p>
            DÍA 13<br/>
            Actividad: Taller del proyecto...<br/>
            Hora: 8:30 AM<br/>
            Lugar: Casa de orientación...
        </div>
      </div>
    );
  };

  if (selectedMonth) {
    let monthData = (data[selectedMonth] || []).sort((a, b) => a.day - b.day);
    if (daySearch) {
      const dayNum = parseInt(daySearch);
      if (!isNaN(dayNum)) {
        monthData = monthData.filter(d => d.day === dayNum);
      }
    }

    return (
      <div className="h-full flex flex-col bg-background-dark">
        <AgendaHeader 
          title={`Opciones Culturales - ${selectedMonth}`} 
          user={user} 
          onMenuClick={onMenuClick} 
          onBack={() => { setSelectedMonth(null); setDaySearch(''); }}
        />
        
        <div className="flex-none flex flex-col bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5 z-20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1"></div>
            <button onClick={handleDownloadDocx} className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all" title="Exportar DOCX">
                <span className="material-symbols-outlined text-sm">description</span>
            </button>
          </div>
          <div className="relative">
             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-text-secondary">search</span>
             <input 
              type="number" 
              placeholder="Filtrar por número de día (ej: 15)..."
              value={daySearch}
              onChange={(e) => setDaySearch(e.target.value)}
              className="w-full bg-background-dark border-none rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary shadow-inner"
             />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-32">
          {monthData.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-white/10 mb-2">theater_comedy</span>
              <p className="text-text-secondary text-sm">No se encontraron opciones culturales para el filtro actual.</p>
            </div>
          ) : (
            monthData.map(dayData => (
              <div key={dayData.day} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5"></div>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-[0.4em]">Día {dayData.day}</span>
                  <div className="h-px flex-1 bg-white/5"></div>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {dayData.activities.map((act, i) => (
                    <div key={i} className="bg-card-dark border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                      <p className="text-white/90 text-sm font-medium leading-relaxed">{act.actividad}</p>
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                          <span>{act.hora}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                          <span>{act.lugar}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </main>
        {renderUploadBtn()}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-dark">
      <AgendaHeader 
        title="Opciones Culturales" 
        user={user} 
        onMenuClick={onMenuClick} 
        onBack={onBack}
      />

      <main className="flex-1 overflow-y-auto no-scrollbar flex flex-col pb-32">
        <div className="px-4 pt-8 pb-4 text-center">
          <div className="size-16 mx-auto bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">theater_comedy</span>
          </div>
          <h2 className="text-white text-4xl font-bold tracking-tight mb-2">{dateInfo.year}</h2>
          <p className="text-text-secondary text-sm font-medium px-8">Opciones culturales y eventos para RCM.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 mb-4">
          {MONTHS_DATA.map((month) => {
            const hasData = data[month.name]?.length > 0;
            const isCurrent = month.name.toLowerCase() === dateInfo.monthName.toLowerCase();
            return (
              <button 
                key={month.id}
                onClick={() => setSelectedMonth(month.name)}
                className={`relative h-24 flex flex-col items-center justify-center rounded-2xl border transition-all active:scale-95 ${isCurrent ? 'bg-primary border-transparent shadow-lg shadow-primary/20' : 'bg-card-dark border-white/5'}`}
              >
                <p className={`text-xl font-bold ${isCurrent ? 'text-white' : 'text-white/80'}`}>{month.name}</p>
                {hasData && (
                  <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isCurrent ? 'text-white/60' : 'text-primary/60'}`}>
                    {data[month.name].reduce((acc, curr) => acc + curr.activities.length, 0)} eventos
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {renderUploadBtn()}
      </main>
    </div>
  );
};

export default CulturalOptions;
