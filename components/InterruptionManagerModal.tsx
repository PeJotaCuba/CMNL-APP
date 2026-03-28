import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { ProgramFicha } from '../types';
import { TransmissionBreakdown } from '../src/services/transmissionService';
import { InterruptionModal } from './InterruptionModal';

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
    onSaveAdd: (interruptions: Interruption[]) => void;
    interruptions: Interruption[];
    onUpdateInterruptions: (interruptions: Interruption[]) => void;
    fichas: ProgramFicha[];
    categories: (keyof TransmissionBreakdown)[];
    categoryLabels: Record<keyof TransmissionBreakdown, string>;
    programCategories: Record<string, string[]>;
}

export const InterruptionManagerModal: React.FC<Props> = ({
    onClose,
    onSaveAdd,
    interruptions,
    onUpdateInterruptions,
    fichas,
    categories,
    categoryLabels,
    programCategories
}) => {
    const [mode, setMode] = useState<'select' | 'add' | 'edit'>('select');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Interruption | null>(null);

    const handleDelete = (id: string) => {
        if (window.confirm('¿Está seguro de eliminar esta interrupción?')) {
            onUpdateInterruptions(interruptions.filter(i => i.id !== id));
            if (editingId === id) {
                setEditingId(null);
                setEditForm(null);
            }
        }
    };

    const handleDeleteAll = () => {
        if (window.confirm('¿Está seguro de eliminar TODAS las interrupciones registradas? Esta acción no se puede deshacer.')) {
            onUpdateInterruptions([]);
            setEditingId(null);
            setEditForm(null);
        }
    };

    const handleEditClick = (interruption: Interruption) => {
        setEditingId(interruption.id);
        setEditForm({ ...interruption });
    };

    const handleSaveEdit = () => {
        if (editForm) {
            onUpdateInterruptions(interruptions.map(i => i.id === editForm.id ? editForm : i));
            setEditingId(null);
            setEditForm(null);
        }
    };

    if (mode === 'add') {
        return (
            <InterruptionModal
                onClose={() => setMode('select')}
                onSave={(newInterruptions) => {
                    onSaveAdd(newInterruptions);
                    onClose();
                }}
                fichas={fichas}
                categories={categories}
                categoryLabels={categoryLabels}
                programCategories={programCategories}
            />
        );
    }

    if (mode === 'edit') {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-3xl border border-[#9E7649]/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gradient-to-r from-[#9E7649] to-[#8B653D] p-6 flex justify-between items-center shrink-0">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Edit2 size={24} />
                            Editar Interrupciones
                        </h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                        {interruptions.length === 0 ? (
                            <p className="text-center text-[#E8DCCF]/50 py-8">No hay interrupciones registradas.</p>
                        ) : (
                            <>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {interruptions.map(int => (
                                        <div 
                                            key={int.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                                editingId === int.id 
                                                    ? 'bg-[#9E7649]/20 border-[#9E7649]' 
                                                    : 'bg-black/20 border-white/5 hover:border-[#9E7649]/30 cursor-pointer'
                                            }`}
                                            onClick={() => handleEditClick(int)}
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium text-[#E8DCCF]">{int.programName}</div>
                                                <div className="text-sm text-[#E8DCCF]/60">
                                                    {int.date} • {categoryLabels[int.category]} • {int.affectedMinutes} min ({int.percentage}%)
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(int.id);
                                                }}
                                                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-4"
                                                title="Eliminar interrupción"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {editingId && editForm && (
                                    <div className="bg-black/30 p-6 rounded-xl border border-white/10 space-y-4">
                                        <h3 className="text-lg font-bold text-[#9E7649] mb-4">Editar Datos</h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-[#E8DCCF]/70 mb-1">Fecha</label>
                                                <input 
                                                    type="date" 
                                                    value={editForm.date}
                                                    onChange={e => setEditForm({...editForm, date: e.target.value})}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-[#E8DCCF] focus:outline-none focus:border-[#9E7649]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#E8DCCF]/70 mb-1">Programa</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm.programName}
                                                    onChange={e => setEditForm({...editForm, programName: e.target.value})}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-[#E8DCCF] focus:outline-none focus:border-[#9E7649]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#E8DCCF]/70 mb-1">Categoría</label>
                                                <select
                                                    value={editForm.category}
                                                    onChange={e => setEditForm({...editForm, category: e.target.value as keyof TransmissionBreakdown})}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-[#E8DCCF] focus:outline-none focus:border-[#9E7649]"
                                                >
                                                    {categories.map(cat => cat !== 'total' && (
                                                        <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#E8DCCF]/70 mb-1">Minutos Afectados</label>
                                                <input 
                                                    type="number" 
                                                    value={editForm.affectedMinutes}
                                                    onChange={e => setEditForm({...editForm, affectedMinutes: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-[#E8DCCF] focus:outline-none focus:border-[#9E7649]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#E8DCCF]/70 mb-1">Porcentaje (%)</label>
                                                <input 
                                                    type="number" 
                                                    value={editForm.percentage}
                                                    onChange={e => setEditForm({...editForm, percentage: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-[#E8DCCF] focus:outline-none focus:border-[#9E7649]"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6">
                                            <button 
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditForm(null);
                                                }}
                                                className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleSaveEdit}
                                                className="bg-[#9E7649] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#8B653D] transition-colors flex items-center gap-2"
                                            >
                                                <Save size={16} /> Guardar Cambios
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="bg-black/40 p-6 border-t border-[#9E7649]/20 flex justify-between items-center shrink-0">
                        <button 
                            onClick={handleDeleteAll}
                            disabled={interruptions.length === 0}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Eliminar Todas
                        </button>
                        <button 
                            onClick={() => setMode('select')}
                            className="px-6 py-2 rounded-lg text-sm font-bold text-[#E8DCCF] hover:bg-white/5 transition-colors"
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-md border border-[#9E7649]/20 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#9E7649] to-[#8B653D] p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Gestionar Interrupciones</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-8 flex flex-col gap-4">
                    <button 
                        onClick={() => setMode('add')}
                        className="w-full bg-[#9E7649]/20 hover:bg-[#9E7649]/30 border border-[#9E7649]/50 text-[#E8DCCF] p-6 rounded-xl transition-all flex flex-col items-center justify-center gap-3 group"
                    >
                        <div className="bg-[#9E7649] p-3 rounded-full text-white group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <span className="font-bold text-lg">Agregar Interrupción</span>
                        <span className="text-sm text-[#E8DCCF]/60 text-center">Registrar una nueva interrupción en la transmisión</span>
                    </button>

                    <button 
                        onClick={() => setMode('edit')}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-[#E8DCCF] p-6 rounded-xl transition-all flex flex-col items-center justify-center gap-3 group"
                    >
                        <div className="bg-white/10 p-3 rounded-full text-white group-hover:scale-110 transition-transform">
                            <Edit2 size={24} />
                        </div>
                        <span className="font-bold text-lg">Editar Registradas</span>
                        <span className="text-sm text-[#E8DCCF]/60 text-center">Modificar o eliminar interrupciones existentes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
