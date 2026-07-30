import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { ProgramFicha } from '../types';
import { TransmissionBreakdown } from '../src/services/transmissionService';

interface Interruption {
    id: string;
    date: string;
    programName: string;
    category: keyof TransmissionBreakdown;
    affectedMinutes: number;
    percentage: number;
    startTime: string;
    endTime: string;
}

interface Props {
    onClose: () => void;
    onSave: (interruptions: Interruption[]) => void;
    fichas: ProgramFicha[];
    categories: (keyof TransmissionBreakdown)[];
    categoryLabels: Record<keyof TransmissionBreakdown, string>;
    categoryPrograms?: Record<string, string[]>;
}

const CABINA_SEGMENTS = [
    { name: 'Cabina 12:00-12:30', duration: 30, category: 'variados' as keyof TransmissionBreakdown, schedule: '12:00 PM - 12:30 PM' },
    { name: 'Cabina 13:00-13:30', duration: 30, category: 'variados' as keyof TransmissionBreakdown, schedule: '01:00 PM - 01:30 PM' }
];

const normalize = (s: string) => s ? s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const isMatch = (name1: string, name2: string) => {
    if (!name1 || !name2) return false;
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    if (n1 === n2) return true;
    if (n1.replace(/\s+/g, '') === n2.replace(/\s+/g, '')) return true;
    if (n1.replace('del', 'de') === n2.replace('del', 'de')) return true;
    return false;
};

const formatMinutesTo12h = (minutes: number): string => {
    let h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};

const parseTimeToMinutes = (timeStr: string, defaultPeriod?: 'AM' | 'PM'): number => {
    if (!timeStr) return 0;
    const str = timeStr.trim().toLowerCase();
    
    const isPM = str.includes('pm') || (defaultPeriod === 'PM' && !str.includes('am'));
    const isAM = str.includes('am') || (defaultPeriod === 'AM' && !str.includes('pm'));

    const match = str.match(/(\d{1,2})[:.](\d{2})/);
    if (!match) {
        const hourOnlyMatch = str.match(/(\d{1,2})/);
        if (!hourOnlyMatch) return 0;
        let h = parseInt(hourOnlyMatch[1], 10);
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        return h * 60;
    }

    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);

    if (isPM && h < 12) {
        h += 12;
    } else if (isAM && h === 12) {
        h = 0;
    } else if (!str.includes('am') && !str.includes('pm') && !defaultPeriod) {
        if (h >= 1 && h <= 6) {
            h += 12;
        }
    }

    return h * 60 + m;
};

export const InterruptionModal: React.FC<Props> = ({ onClose, onSave, fichas, categories, categoryLabels, categoryPrograms }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Interruption range: 07:00 AM (420) to 03:00 PM (900)
    const [iInicio, setIInicio] = useState(420);
    const [iFin, setIFin] = useState(480);

    const getProgramDetails = (name: string) => {
        const cabina = CABINA_SEGMENTS.find(c => isMatch(c.name, name));
        if (cabina) {
            const parts = cabina.schedule.split(/[-–a]/);
            const startPart = parts[0] ? parts[0].trim() : '';
            const endPart = parts[1] ? parts[1].trim() : '';
            const endPeriod = endPart.toLowerCase().includes('pm') ? 'PM' : (endPart.toLowerCase().includes('am') ? 'AM' : undefined);
            return {
                dTotal: cabina.duration,
                category: cabina.category,
                tInicio: parseTimeToMinutes(startPart, endPeriod)
            };
        }
        const ficha = fichas.find(f => isMatch(f.name, name));
        if (ficha) {
            const lower = (ficha.duration || '').toLowerCase();
            let totalMinutes = 0;
            const hoursMatch = lower.match(/(\d+)\s*hora/);
            if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
            const minutesMatch = lower.match(/(\d+)\s*minuto/);
            if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
            if (totalMinutes === 0) {
                const match = lower.match(/(\d+)/);
                if (match) totalMinutes = parseInt(match[1]);
            }
            const dTotal = totalMinutes || 60;
            
            let tInicio = 0;
            if (ficha.schedule) {
                const parts = ficha.schedule.split(/[-–a]/);
                const startPart = parts[0] ? parts[0].trim() : '';
                const endPart = parts[1] ? parts[1].trim() : '';
                const endPeriod = endPart.toLowerCase().includes('pm') ? 'PM' : (endPart.toLowerCase().includes('am') ? 'AM' : undefined);
                tInicio = parseTimeToMinutes(startPart, endPeriod);
            }

            // Find category for this program
            let category: keyof TransmissionBreakdown = 'variados';
            if (categoryPrograms) {
                for (const [cat, programs] of Object.entries(categoryPrograms)) {
                    if ((programs as string[]).some(p => isMatch(p, name))) {
                        category = cat as keyof TransmissionBreakdown;
                        break;
                    }
                }
            }

            return { dTotal, category, tInicio };
        }
        return null;
    };

    const isProgramOnDay = (program: any, dateStr: string) => {
        // Use T12:00:00 to avoid timezone issues with YYYY-MM-DD
        const date = new Date(dateStr + 'T12:00:00');
        const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
        
        // If it's a cabina segment, assume daily
        if (!program.frequency) return true;

        const freq = program.frequency.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Normalize frequency string
        if (freq.includes('diario') || freq.includes('lunes a domingo') || freq.includes('lunes-domingo') || freq.includes('lunes - domingo')) return true;
        if ((freq.includes('lunes a sabado') || freq.includes('lunes-sabado') || freq.includes('lunes - sabado')) && day !== 0) return true;
        if ((freq.includes('lunes a viernes') || freq.includes('lunes-viernes') || freq.includes('lunes - viernes')) && day >= 1 && day <= 5) return true;
        if ((freq.includes('lunes a jueves') || freq.includes('lunes-jueves') || freq.includes('lunes - jueves')) && day >= 1 && day <= 4) return true;
        if ((freq.includes('lunes a miercoles') || freq.includes('lunes-miercoles') || freq.includes('lunes - miercoles')) && day >= 1 && day <= 3) return true;
        if ((freq.includes('martes a viernes') || freq.includes('martes-viernes') || freq.includes('martes - viernes')) && day >= 2 && day <= 5) return true;
        if ((freq.includes('martes a jueves') || freq.includes('martes-jueves') || freq.includes('martes - jueves')) && day >= 2 && day <= 4) return true;
        if ((freq.includes('miercoles a viernes') || freq.includes('miercoles-viernes') || freq.includes('miercoles - viernes')) && day >= 3 && day <= 5) return true;
        if ((freq.includes('jueves a domingo') || freq.includes('jueves-domingo') || freq.includes('jueves - domingo')) && (day >= 4 || day === 0)) return true;
        if ((freq.includes('viernes a domingo') || freq.includes('viernes-domingo') || freq.includes('viernes - domingo')) && (day >= 5 || day === 0)) return true;
        if ((freq.includes('fines de semana') || freq.includes('fin de semana')) && (day === 0 || day === 6)) return true;
        
        const daysMap: { [key: number]: string[] } = {
            0: ['domingo', 'dominical'],
            1: ['lunes'],
            2: ['martes'],
            3: ['miercoles'],
            4: ['jueves'],
            5: ['viernes'],
            6: ['sabado', 'sabatina']
        };

        if (isNaN(day) || !daysMap[day]) return false;

        return daysMap[day].some(d => freq.includes(d));
    };

    const calculateAffectedPrograms = () => {
        const affected: { name: string; minutes: number; category: keyof TransmissionBreakdown }[] = [];

        // Check Cabina Segments
        CABINA_SEGMENTS.forEach(cabina => {
            const details = getProgramDetails(cabina.name);
            if (!details) return;
            const { dTotal, category, tInicio } = details;
            const tFin = tInicio + dTotal;
            
            const ruleA = iInicio >= (tInicio + 5);
            const ruleB = iFin <= (tInicio + (0.75 * dTotal));
            const hasOverlap = Math.max(iInicio, tInicio) < Math.min(iFin, tFin);

            if (hasOverlap && !ruleA && !ruleB) {
                if (!affected.some(p => isMatch(p.name, cabina.name))) {
                    affected.push({ name: cabina.name, minutes: dTotal, category });
                }
            }
        });

        // Check Fichas
        fichas.forEach(ficha => {
            if (!isProgramOnDay(ficha, date)) return;

            const details = getProgramDetails(ficha.name);
            if (!details) return;

            const { dTotal, category, tInicio } = details;
            const tFin = tInicio + dTotal;

            const ruleA = iInicio >= (tInicio + 5);
            const ruleB = iFin <= (tInicio + (0.75 * dTotal));
            const hasOverlap = Math.max(iInicio, tInicio) < Math.min(iFin, tFin);

            if (hasOverlap && !ruleA && !ruleB) {
                if (!affected.some(p => isMatch(p.name, ficha.name))) {
                    affected.push({ name: ficha.name, minutes: dTotal, category });
                }
            }
        });

        return affected;
    };

    const affectedPrograms = calculateAffectedPrograms();

    const handleSave = () => {
        if (affectedPrograms.length === 0) return;

        const hasComplices = affectedPrograms.some(p => isMatch(p.name, 'cómplices') || isMatch(p.name, 'complices'));
        const timestamp = Date.now();

        const newInterruptions: Interruption[] = affectedPrograms.map(p => {
            let finalMinutes = p.minutes;
            if (hasComplices && (isMatch(p.name, 'alba y crisol') || isMatch(p.name, 'coloreando melodías') || isMatch(p.name, 'coloreando melodias'))) {
                finalMinutes = 0;
            }

            return {
                id: `${timestamp}-${p.name}`,
                date,
                programName: p.name,
                category: p.category,
                affectedMinutes: finalMinutes,
                percentage: 100,
                startTime: formatMinutesTo12h(iInicio),
                endTime: formatMinutesTo12h(iFin)
            };
        });

        onSave(newInterruptions);
    };

    const get12Hour = (totalMinutes: number) => {
        let h = Math.floor(totalMinutes / 60) % 12;
        return h === 0 ? 12 : h;
    };

    const handle12hTimeChange = (type: 'inicio' | 'fin', field: 'h' | 'm' | 'period', value: any) => {
        const current = type === 'inicio' ? iInicio : iFin;
        let currentH12 = get12Hour(current);
        let currentM = current % 60;
        let currentPeriod = current >= 720 ? 'PM' : 'AM';

        if (field === 'h') currentH12 = Math.min(12, Math.max(1, Number(value) || 12));
        if (field === 'm') currentM = Math.min(59, Math.max(0, Number(value) || 0));
        if (field === 'period') currentPeriod = value;

        let h24 = currentH12 % 12;
        if (currentPeriod === 'PM') h24 += 12;

        const newTotal = Math.min(900, Math.max(420, h24 * 60 + currentM));
        if (type === 'inicio') setIInicio(newTotal);
        else setIFin(newTotal);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-lg w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Registrar Interrupción Técnica</h3>
                    <button onClick={onClose} className="text-[#E8DCCF]/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-6 mb-8">
                    <div>
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Fecha</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white" 
                        />
                    </div>

                    <div className="space-y-4 bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-[#9E7649]">Rango de Interrupción (12 Horas)</span>
                            <span className="text-xs text-[#E8DCCF]/40">07:00 AM - 03:00 PM</span>
                        </div>

                        <div className="space-y-6">
                            {/* Inicio Control */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[#E8DCCF]/80 font-bold">Inicio: {formatMinutesTo12h(iInicio)}</span>
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="number" min="1" max="12" 
                                            value={get12Hour(iInicio)}
                                            onChange={e => handle12hTimeChange('inicio', 'h', e.target.value)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs text-white"
                                        />
                                        <span className="text-[#E8DCCF]/30">:</span>
                                        <input 
                                            type="number" min="0" max="59" 
                                            value={iInicio % 60}
                                            onChange={e => handle12hTimeChange('inicio', 'm', e.target.value)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs text-white"
                                        />
                                        <select
                                            value={iInicio >= 720 ? 'PM' : 'AM'}
                                            onChange={e => handle12hTimeChange('inicio', 'period', e.target.value)}
                                            className="bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-xs text-amber-300 font-bold"
                                        >
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                                <input 
                                    type="range" min="420" max="900" step="1"
                                    value={iInicio}
                                    onChange={e => setIInicio(parseInt(e.target.value))}
                                    className="w-full accent-[#9E7649]"
                                />
                            </div>

                            {/* Fin Control */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[#E8DCCF]/80 font-bold">Fin: {formatMinutesTo12h(iFin)}</span>
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="number" min="1" max="12" 
                                            value={get12Hour(iFin)}
                                            onChange={e => handle12hTimeChange('fin', 'h', e.target.value)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs text-white"
                                        />
                                        <span className="text-[#E8DCCF]/30">:</span>
                                        <input 
                                            type="number" min="0" max="59" 
                                            value={iFin % 60}
                                            onChange={e => handle12hTimeChange('fin', 'm', e.target.value)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs text-white"
                                        />
                                        <select
                                            value={iFin >= 720 ? 'PM' : 'AM'}
                                            onChange={e => handle12hTimeChange('fin', 'period', e.target.value)}
                                            className="bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-xs text-amber-300 font-bold"
                                        >
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                                <input 
                                    type="range" min="420" max="900" step="1"
                                    value={iFin}
                                    onChange={e => setIFin(parseInt(e.target.value))}
                                    className="w-full accent-[#9E7649]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider block">Programas Afectados</label>
                        <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                            {affectedPrograms.length > 0 ? (
                                <ul className="space-y-2">
                                    {affectedPrograms.map(p => (
                                        <li key={p.name} className="flex justify-between items-center text-sm">
                                            <span className="text-white font-medium">{p.name}</span>
                                            <span className="text-red-400 font-mono font-bold">{p.minutes} min</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[#E8DCCF]/30 text-sm italic text-center mt-8">No hay programas afectados en este rango</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={affectedPrograms.length === 0 || iFin <= iInicio}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#9E7649]/20"
                    >
                        <Save size={16} /> Registrar Interrupción
                    </button>
                </div>
            </div>
        </div>
    );
};

