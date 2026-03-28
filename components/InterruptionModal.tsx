import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Clock, AlertTriangle } from 'lucide-react';
import { ProgramFicha } from '../types';
import { TransmissionBreakdown } from '../src/services/transmissionService';

interface Interruption {
    id: string;
    date: string;
    programName: string;
    category: keyof TransmissionBreakdown;
    affectedMinutes: number;
    percentage: number;
}

interface Props {
    onClose: () => void;
    onSave: (interruptions: Interruption[]) => void;
    fichas: ProgramFicha[];
    categories: (keyof TransmissionBreakdown)[];
    categoryLabels: Record<keyof TransmissionBreakdown, string>;
    programCategories: Record<string, string[]>;
}

const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
};

const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const getProgramDuration = (ficha: ProgramFicha): number => {
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
    return totalMinutes || 60;
};

const MIN_TIME = 7 * 60; // 07:00 AM
const MAX_TIME = 15 * 60; // 03:00 PM

export const InterruptionModal: React.FC<Props> = ({ onClose, onSave, fichas, categories, categoryLabels, programCategories }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState<number>(MIN_TIME);
    const [endTime, setEndTime] = useState<number>(MIN_TIME + 60);

    const [startInput, setStartInput] = useState('07:00');
    const [endInput, setEndInput] = useState('08:00');

    useEffect(() => {
        const h = Math.floor(startTime / 60).toString().padStart(2, '0');
        const m = (startTime % 60).toString().padStart(2, '0');
        setStartInput(`${h}:${m}`);
    }, [startTime]);

    useEffect(() => {
        const h = Math.floor(endTime / 60).toString().padStart(2, '0');
        const m = (endTime % 60).toString().padStart(2, '0');
        setEndInput(`${h}:${m}`);
    }, [endTime]);

    const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStartInput(val);
        const [h, m] = val.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
            let total = h * 60 + m;
            if (total >= MIN_TIME && total <= MAX_TIME && total < endTime) {
                setStartTime(total);
            }
        }
    };

    const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setEndInput(val);
        const [h, m] = val.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
            let total = h * 60 + m;
            if (total >= MIN_TIME && total <= MAX_TIME && total > startTime) {
                setEndTime(total);
            }
        }
    };

    const affectedPrograms = useMemo(() => {
        const results: Interruption[] = [];
        
        const getCategoryForProgram = (progName: string): keyof TransmissionBreakdown => {
            for (const cat of categories) {
                if (cat === 'total') continue;
                if (programCategories[cat]?.includes(progName)) {
                    return cat;
                }
            }
            return 'variados'; // Default
        };

        const allPrograms = [
            ...fichas.map(f => ({
                name: f.name,
                schedule: f.schedule,
                duration: getProgramDuration(f),
                category: getCategoryForProgram(f.name),
                frequency: f.frequency
            })),
            { name: 'Cabina 12:00-12:30', schedule: '12:00 PM - 12:30 PM', duration: 30, category: 'variados' as keyof TransmissionBreakdown, frequency: 'Lunes a Domingo' },
            { name: 'Cabina 13:00-13:30', schedule: '1:00 PM - 1:30 PM', duration: 30, category: 'variados' as keyof TransmissionBreakdown, frequency: 'Lunes a Domingo' }
        ];

        const selectedDate = new Date(date + 'T12:00:00');
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        allPrograms.forEach(prog => {
            const freq = prog.frequency?.toLowerCase() || '';
            let runsOnThisDay = false;

            if (freq.includes('lunes a domingo') || freq.includes('todos los días')) {
                runsOnThisDay = true;
            } else if (freq.includes('lunes a viernes')) {
                runsOnThisDay = dayOfWeek >= 1 && dayOfWeek <= 5;
            } else if (freq.includes('lunes a sábado') || freq.includes('lunes a sabado')) {
                runsOnThisDay = dayOfWeek >= 1 && dayOfWeek <= 6;
            } else if (freq.includes('domingo')) {
                runsOnThisDay = dayOfWeek === 0;
            } else if (freq.includes('sábado') || freq.includes('sabado')) {
                runsOnThisDay = dayOfWeek === 6;
            } else {
                runsOnThisDay = true; // Fallback
            }

            if (!runsOnThisDay) return;

            const parts = prog.schedule.split('-');
            if (parts.length !== 2) return;
            
            const progStart = parseTime(parts[0].trim());
            const progEnd = parseTime(parts[1].trim());
            const progDuration = prog.duration;

            if (progStart === 0 || progEnd === 0) return;

            const overlapStart = Math.max(startTime, progStart);
            const overlapEnd = Math.min(endTime, progEnd);
            const overlap = overlapEnd - overlapStart;

            if (overlap > 0) {
                let isInterrupted = true;

                // Regla A: Exclusión por Inicio Tardío (Regla de los 5 Minutos)
                if (startTime >= progStart + 5) {
                    isInterrupted = false;
                }

                // Regla B: Exclusión por Restablecimiento Temprano (Regla del 75%)
                if (endTime <= progStart + (progDuration * 0.75)) {
                    isInterrupted = false;
                }

                // Regla C: Aplicación de Afectación Total
                if (isInterrupted) {
                    results.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        date,
                        programName: prog.name,
                        category: prog.category,
                        affectedMinutes: progDuration,
                        percentage: 100
                    });
                }
            }
        });

        return results;
    }, [startTime, endTime, date, fichas, categories, programCategories]);

    const handleSave = () => {
        onSave(affectedPrograms);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="text-red-500" />
                        Registrar Interrupción
                    </h3>
                    <button onClick={onClose} className="text-[#E8DCCF]/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    <div>
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Fecha</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white" 
                        />
                    </div>
                    
                    <div className="bg-black/20 p-4 rounded-xl border border-[#9E7649]/10">
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock size={14} /> Rango de Interrupción
                        </label>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1">
                                <label className="text-[10px] text-[#E8DCCF]/40 uppercase mb-1 block">Inicio</label>
                                <input 
                                    type="time" 
                                    value={startInput}
                                    onChange={handleStartInputChange}
                                    className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white text-center"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-[#E8DCCF]/40 uppercase mb-1 block">Fin</label>
                                <input 
                                    type="time" 
                                    value={endInput}
                                    onChange={handleEndInputChange}
                                    className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white text-center"
                                />
                            </div>
                        </div>

                        <div className="relative pt-6 pb-2 px-2">
                            <div className="absolute top-0 left-0 w-full flex justify-between text-[10px] text-[#E8DCCF]/30 font-mono">
                                <span>07:00</span>
                                <span>11:00</span>
                                <span>15:00</span>
                            </div>
                            <div className="relative h-2 bg-[#1A100C] rounded-full overflow-hidden border border-[#9E7649]/20">
                                <div 
                                    className="absolute h-full bg-red-500/50 rounded-full"
                                    style={{ 
                                        left: `${((startTime - MIN_TIME) / (MAX_TIME - MIN_TIME)) * 100}%`,
                                        width: `${((endTime - startTime) / (MAX_TIME - MIN_TIME)) * 100}%`
                                    }}
                                />
                            </div>
                            <style dangerouslySetInnerHTML={{__html: `
                                .dual-slider::-webkit-slider-thumb {
                                    pointer-events: auto;
                                    width: 16px;
                                    height: 16px;
                                    border-radius: 50%;
                                    background: #ef4444;
                                    cursor: pointer;
                                    -webkit-appearance: none;
                                    margin-top: -6px;
                                }
                                .dual-slider::-moz-range-thumb {
                                    pointer-events: auto;
                                    width: 16px;
                                    height: 16px;
                                    border-radius: 50%;
                                    background: #ef4444;
                                    cursor: pointer;
                                    border: none;
                                }
                            `}} />
                            <input 
                                type="range" 
                                min={MIN_TIME} 
                                max={MAX_TIME} 
                                value={startTime} 
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    if (val < endTime) setStartTime(val);
                                }}
                                className="absolute top-5 left-0 w-full appearance-none bg-transparent pointer-events-none dual-slider"
                            />
                            <input 
                                type="range" 
                                min={MIN_TIME} 
                                max={MAX_TIME} 
                                value={endTime} 
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    if (val > startTime) setEndTime(val);
                                }}
                                className="absolute top-5 left-0 w-full appearance-none bg-transparent pointer-events-none dual-slider"
                            />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-white mb-3 border-b border-[#9E7649]/20 pb-2">Programas Afectados Calculados</h4>
                        {affectedPrograms.length > 0 ? (
                            <div className="space-y-2">
                                {affectedPrograms.map((prog, idx) => (
                                    <div key={idx} className="bg-[#1A100C] p-3 rounded-lg border border-red-500/20 flex justify-between items-center">
                                        <div>
                                            <p className="text-white font-bold text-sm">{prog.programName}</p>
                                            <p className="text-xs text-[#E8DCCF]/50">{categoryLabels[prog.category]}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-red-400 font-mono font-bold">{prog.affectedMinutes} min</p>
                                            <p className="text-[10px] text-[#E8DCCF]/40">{prog.percentage}% afectado</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-black/10 rounded-xl border border-[#9E7649]/10">
                                <p className="text-[#E8DCCF]/50 text-sm">No hay programas afectados en este rango de tiempo según las reglas establecidas.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 shrink-0 pt-4 border-t border-[#9E7649]/20">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={affectedPrograms.length === 0}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={16} /> Registrar {affectedPrograms.length} Interrupciones
                    </button>
                </div>
            </div>
        </div>
    );
};
