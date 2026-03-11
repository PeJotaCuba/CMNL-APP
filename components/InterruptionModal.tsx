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
}

interface Props {
    onClose: () => void;
    onSave: (interruption: Interruption) => void;
    fichas: ProgramFicha[];
    categories: (keyof TransmissionBreakdown)[];
    categoryLabels: Record<keyof TransmissionBreakdown, string>;
}

const CABINA_SEGMENTS = [
    { name: 'Cabina 12:00-12:30', duration: 30, category: 'variados' as keyof TransmissionBreakdown },
    { name: 'Cabina 13:00-13:30', duration: 30, category: 'variados' as keyof TransmissionBreakdown }
];

export const InterruptionModal: React.FC<Props> = ({ onClose, onSave, fichas, categories, categoryLabels }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [programName, setProgramName] = useState('');
    const [percentage, setPercentage] = useState<number>(100);
    const [category, setCategory] = useState<keyof TransmissionBreakdown>('informativos');

    const handleSave = () => {
        if (!programName) return;

        let duration = 0;
        let selectedCategory = category;

        const cabina = CABINA_SEGMENTS.find(c => c.name === programName);
        if (cabina) {
            duration = cabina.duration;
            selectedCategory = cabina.category;
        } else {
            const ficha = fichas.find(f => f.name === programName);
            if (ficha) {
                const lower = (ficha.duration || '').toLowerCase();
                let totalMinutes = 0;
                
                const hoursMatch = lower.match(/(\d+)\s*hora/);
                if (hoursMatch) {
                    totalMinutes += parseInt(hoursMatch[1]) * 60;
                }
                
                const minutesMatch = lower.match(/(\d+)\s*minuto/);
                if (minutesMatch) {
                    totalMinutes += parseInt(minutesMatch[1]);
                }
                
                if (totalMinutes === 0) {
                    const match = lower.match(/(\d+)/);
                    if (match) {
                        totalMinutes = parseInt(match[1]);
                    }
                }
                
                duration = totalMinutes;
            }
        }

        if (duration === 0) {
            // If duration is 0, maybe it's a custom program not in ficha, but we need duration.
            // Let's assume 60 min if not found, or require it to be in ficha.
            duration = 60; 
        }

        const affectedMinutes = Math.round(duration * (percentage / 100));

        onSave({
            id: Date.now().toString(),
            date,
            programName,
            category: selectedCategory,
            affectedMinutes,
            percentage
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Registrar Interrupción</h3>
                    <button onClick={onClose} className="text-[#E8DCCF]/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Fecha</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white" 
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Programa Afectado</label>
                        <select 
                            value={programName} 
                            onChange={e => setProgramName(e.target.value)}
                            className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white"
                        >
                            <option value="">Seleccionar programa...</option>
                            <optgroup label="Segmentos de Cabina">
                                {CABINA_SEGMENTS.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Parrilla de Programación">
                                {fichas.map(f => (
                                    <option key={f.id} value={f.name}>{f.name} ({f.duration} min)</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Categoría de Transmisión</label>
                        <select 
                            value={category} 
                            onChange={e => setCategory(e.target.value as keyof TransmissionBreakdown)}
                            className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white"
                        >
                            {categories.filter(c => c !== 'total').map(cat => (
                                <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Porcentaje de Afectación</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[25, 50, 75, 100].map(pct => (
                                <button
                                    key={pct}
                                    onClick={() => setPercentage(pct)}
                                    className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                                        percentage === pct 
                                            ? 'bg-[#9E7649] text-white border-[#9E7649]' 
                                            : 'bg-[#1A100C] text-[#E8DCCF]/70 border-[#9E7649]/30 hover:border-[#9E7649]'
                                    }`}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!programName}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={16} /> Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};
