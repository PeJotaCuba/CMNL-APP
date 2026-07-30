import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Clock, Plus, AlertCircle, Check } from 'lucide-react';
import { ProgramFicha, ProgramCatalog, User } from '../../types';
import { ParrillaModification, getStoredParrillaModifications, saveParrillaModifications } from '../../src/services/parrillaService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fichas: ProgramFicha[];
  catalogo: ProgramCatalog[];
  currentUser: User | null;
  onModificationsChange?: () => void;
  isMatch: (a: string, b: string) => boolean;
  normalize: (s: string) => string;
}

export const ParrillaModificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  fichas,
  catalogo,
  currentUser,
  onModificationsChange,
  isMatch,
  normalize
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [selectedSpecialProgram, setSelectedSpecialProgram] = useState('');
  const [schedule, setSchedule] = useState('09:00 - 10:00');
  const [replacedProgram, setReplacedProgram] = useState('');
  const [modifications, setModifications] = useState<ParrillaModification[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setModifications(getStoredParrillaModifications());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to check if a program is regularly scheduled on selectedDate
  const isProgramOnDay = (programName: string, dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    const progNameLower = normalize(programName);

    if (progNameLower === 'propaganda' || progNameLower.includes('propaganda')) return true;

    if (progNameLower.includes('sabado') && day === 6) return true;
    if (progNameLower.includes('domingo') && day === 0) return true;
    if (progNameLower.includes('lunes a viernes') && day >= 1 && day <= 5) return true;
    if (progNameLower.includes('lunes a sabado') && day !== 0) return true;

    const ficha = fichas.find(f => isMatch(f.name, programName));
    if (!ficha) return false;
    const freq = normalize(ficha.frequency || '');

    if (freq.includes('diario') || freq.includes('lunes a domingo') || freq.includes('lunes-domingo') || freq.includes('lunes - domingo')) return true;
    if ((freq.includes('lunes a sabado') || freq.includes('lunes-sabado') || freq.includes('lunes - sabado')) && day !== 0) return true;
    if ((freq.includes('lunes a viernes') || freq.includes('lunes-viernes') || freq.includes('lunes - viernes')) && day >= 1 && day <= 5) return true;
    if ((freq.includes('lunes a jueves') || freq.includes('lunes-jueves') || freq.includes('lunes - jueves')) && day >= 1 && day <= 4) return true;
    if ((freq.includes('fines de semana') || freq.includes('fin de semana')) && (day === 0 || day === 6)) return true;

    const daysMap: Record<number, string[]> = {
      0: ['domingo', 'dominical'], 1: ['lunes'], 2: ['martes'], 3: ['miercoles'],
      4: ['jueves'], 5: ['viernes'], 6: ['sabado', 'sabatina']
    };
    const freqWords = freq.split(/[\s,y-]+/);
    return daysMap[day]?.some(d => freqWords.some(w => w.includes(d) || (d.includes(w) && w.length >= 3)));
  };

  // List all available programs from Fichas and Catalogo
  const allAvailablePrograms = Array.from(new Set([
    ...fichas.map(f => f.name),
    ...catalogo.map(c => c.name)
  ])).sort((a, b) => a.localeCompare(b));

  // Programs regularly scheduled on the selected date (candidates for replacement)
  const regularProgramsOnSelectedDate = allAvailablePrograms.filter(p => isProgramOnDay(p, selectedDate));

  // Programs in Fichas that are NOT regularly scheduled on the selected date (ideal special programs)
  const specialProgramCandidates = allAvailablePrograms;

  const handleSaveModification = () => {
    if (!selectedSpecialProgram) {
      alert("Por favor seleccione un programa especial.");
      return;
    }

    const newMod: ParrillaModification = {
      id: `mod-${Date.now()}`,
      date: selectedDate,
      specialProgram: selectedSpecialProgram,
      schedule: schedule || 'Horario Especial',
      replacedProgram: replacedProgram || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || currentUser?.username || 'Admin'
    };

    const updated = [newMod, ...modifications];
    setModifications(updated);
    saveParrillaModifications(updated);

    if (onModificationsChange) onModificationsChange();

    setSuccessMsg(`Modificación guardada: "${selectedSpecialProgram}" agregado para el ${selectedDate}`);
    setTimeout(() => setSuccessMsg(''), 3000);

    // Reset inputs
    setSelectedSpecialProgram('');
    setReplacedProgram('');
  };

  const handleDeleteModification = (id: string) => {
    const updated = modifications.filter(m => m.id !== id);
    setModifications(updated);
    saveParrillaModifications(updated);
    if (onModificationsChange) onModificationsChange();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/30 p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar text-[#E8DCCF]">
        <div className="flex justify-between items-center mb-6 border-b border-[#9E7649]/20 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-[#9E7649]" size={22} />
              Modificar Parrilla de Programación (Especial)
            </h3>
            <p className="text-xs text-[#E8DCCF]/60 mt-1">
              Sustituye o añade programas especiales de Fichas/Catálogo para un día específico en Pagos y Reportes.
            </p>
          </div>
          <button onClick={onClose} className="text-[#E8DCCF]/50 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/40 text-green-300 text-xs rounded-lg flex items-center gap-2 font-medium">
            <Check size={16} />
            {successMsg}
          </div>
        )}

        <div className="space-y-4 bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/20 mb-6">
          <h4 className="text-xs font-bold text-[#9E7649] uppercase tracking-wider mb-2">Registrar Nueva Modificación</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[#E8DCCF]/70 font-semibold uppercase tracking-wider block mb-1">
                1. Fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#9E7649]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#E8DCCF]/70 font-semibold uppercase tracking-wider block mb-1">
                2. Horario / Franja Horaria
              </label>
              <input
                type="text"
                placeholder="Ej. 09:00 - 10:00"
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
                className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#9E7649]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[#E8DCCF]/70 font-semibold uppercase tracking-wider block mb-1">
                3. Programa Especial a Transmitir
              </label>
              <select
                value={selectedSpecialProgram}
                onChange={e => setSelectedSpecialProgram(e.target.value)}
                className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#9E7649]"
              >
                <option value="">-- Seleccionar Programa de Fichas --</option>
                {specialProgramCandidates.map(prog => {
                  const isHabitualOnDate = isProgramOnDay(prog, selectedDate);
                  return (
                    <option key={prog} value={prog}>
                      {prog} {isHabitualOnDate ? '(Habitual)' : '(Especial)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#E8DCCF]/70 font-semibold uppercase tracking-wider block mb-1">
                4. Programa Habitual a Sustituir (Opcional)
              </label>
              <select
                value={replacedProgram}
                onChange={e => setReplacedProgram(e.target.value)}
                className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#9E7649]"
              >
                <option value="">Ninguno (Añadir sin sustituir)</option>
                {regularProgramsOnSelectedDate.map(prog => (
                  <option key={prog} value={prog}>
                    Sustituir: {prog}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveModification}
              disabled={!selectedSpecialProgram}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[#9E7649] text-white hover:bg-[#8B653D] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#9E7649]/20 transition-all"
            >
              <Plus size={16} /> Guardar Cambio de Parrilla
            </button>
          </div>
        </div>

        {/* List of modifications */}
        <div>
          <h4 className="text-xs font-bold text-[#9E7649] uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Modificaciones Registradas ({modifications.length})</span>
          </h4>

          {modifications.length === 0 ? (
            <div className="bg-[#1A100C] p-6 rounded-xl border border-[#9E7649]/10 text-center text-xs text-[#E8DCCF]/50 italic">
              No hay modificaciones especiales registradas en la parrilla.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {modifications.map(mod => (
                <div
                  key={mod.id}
                  className="bg-[#1A100C] p-3 rounded-lg border border-[#9E7649]/20 flex justify-between items-center text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="bg-[#9E7649]/20 text-[#9E7649] px-2 py-0.5 rounded font-mono text-[10px]">
                        {mod.date}
                      </span>
                      <span>{mod.specialProgram}</span>
                      <span className="text-[10px] text-amber-400 font-mono">({mod.schedule})</span>
                    </div>
                    {mod.replacedProgram && (
                      <div className="text-[11px] text-red-300/80">
                        Sustituye a: <span className="line-through">{mod.replacedProgram}</span>
                      </div>
                    )}
                    <div className="text-[9px] text-[#E8DCCF]/40">
                      Creado por {mod.createdBy}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteModification(mod.id)}
                    className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Eliminar modificación"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#2C1B15] text-[#E8DCCF] hover:bg-[#3E251E] border border-[#9E7649]/30 rounded-lg text-xs font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
