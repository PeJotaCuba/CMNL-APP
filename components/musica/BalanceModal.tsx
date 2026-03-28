import React, { useState, useMemo } from 'react';
import { Production } from './types';
import { ProgramFicha } from '../../types';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun } from "docx";
import { saveAs } from 'file-saver';

interface BalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    productions: Production[];
    fichas: ProgramFicha[];
}

const PROGRAMS_TO_BALANCE = [
    "Buenos Días Bayamo",
    "La Cumbancha", // Merged
    "Todos en Casa",
    "Arte Bayamo",
    "Parada Joven",
    "Hablando con Juana",
    "Al son de la radio",
    "Sigue a tu ritmo",
    "Cómplices",
    "Estación 95.3",
    "Palco de domingo"
];

const BalanceModal: React.FC<BalanceModalProps> = ({ isOpen, onClose, productions, fichas }) => {
    const [selectedProgram, setSelectedProgram] = useState<string>(PROGRAMS_TO_BALANCE[0]);

    const getDaysOfWeek = (frequency: string): number[] => {
        const days: number[] = [];
        const freq = frequency.toLowerCase();

        // Handle ranges like "Lunes a Viernes"
        if (freq.includes('lunes a viernes')) {
            return [1, 2, 3, 4, 5];
        }
        if (freq.includes('lunes a sábado')) {
            return [1, 2, 3, 4, 5, 6];
        }

        // Individual days
        if (freq.includes('lunes')) days.push(1);
        if (freq.includes('martes')) days.push(2);
        if (freq.includes('miércoles') || freq.includes('miercoles')) days.push(3);
        if (freq.includes('jueves')) days.push(4);
        if (freq.includes('viernes')) days.push(5);
        if (freq.includes('sábado') || freq.includes('sabado')) days.push(6);
        if (freq.includes('domingo')) days.push(0);
        return days;
    };

    const balanceData = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        let targetFichas: ProgramFicha[] = [];
        if (selectedProgram === "La Cumbancha") {
            targetFichas = fichas.filter(f => f.name.includes("La Cumbancha"));
        } else {
            targetFichas = fichas.filter(f => f.name === selectedProgram);
        }

        if (targetFichas.length === 0) return null;

        // Calculate expected dates based on all target fichas
        const expectedDates: Date[] = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dayOfWeek = date.getDay();
            
            // Check if any ficha covers this day
            const isScheduled = targetFichas.some(f => getDaysOfWeek(f.frequency).includes(dayOfWeek));
            
            if (isScheduled) {
                expectedDates.push(date);
            }
        }

        const executedProductions = productions.filter(p => {
            const pDate = new Date(p.date);
            return pDate.getFullYear() === year && pDate.getMonth() === month && 
                   (selectedProgram === "La Cumbancha" ? p.program.includes("La Cumbancha") : p.program === selectedProgram);
        });

        const executedDates = executedProductions.map(p => new Date(p.date).toDateString());
        const omissions = expectedDates.filter(d => !executedDates.includes(d.toDateString()));

        return {
            quota: expectedDates.length,
            executed: executedProductions.length,
            deficit: expectedDates.length - executedProductions.length,
            omissions
        };
    }, [selectedProgram, productions, fichas]);

    const handleExportDocx = async () => {
        if (!balanceData) return;
        
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: `Balance de Producción: ${selectedProgram}`, heading: "Heading1" }),
                    new Paragraph({ text: `Mes: ${new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}` }),
                    new Paragraph({ text: "" }),
                    new Table({
                        rows: [
                            new TableRow({ children: [new TableCell({ children: [new Paragraph("Concepto")] }), new TableCell({ children: [new Paragraph("Cantidad")] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph("Cuota Mensual")] }), new TableCell({ children: [new Paragraph(balanceData.quota.toString())] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph("Ejecución")] }), new TableCell({ children: [new Paragraph(balanceData.executed.toString())] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph("Déficit")] }), new TableCell({ children: [new Paragraph(balanceData.deficit.toString())] })] }),
                        ]
                    }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "Fechas de Omisión:", heading: "Heading2" }),
                    ...balanceData.omissions.map(d => new Paragraph(d.toLocaleDateString()))
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Balance_${selectedProgram}_${new Date().getMonth() + 1}.docx`);
    };

    const handleShareWhatsApp = () => {
        if (!balanceData) return;
        const message = `Balance de Producción: ${selectedProgram}\n` +
                        `Mes: ${new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}\n` +
                        `Cuota: ${balanceData.quota}\n` +
                        `Ejecución: ${balanceData.executed}\n` +
                        `Déficit: ${balanceData.deficit}\n` +
                        `Fechas de Omisión:\n${balanceData.omissions.map(d => d.toLocaleDateString()).join('\n')}`;
        
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1A100C] border border-[#9E7649]/30 p-6 rounded-2xl w-full max-w-2xl text-white shadow-2xl">
                <h2 className="text-2xl font-bold mb-4">Balance de Producción</h2>
                <select 
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full bg-[#2C1B15] border border-[#9E7649]/30 p-2 rounded-xl mb-4"
                >
                    {PROGRAMS_TO_BALANCE.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {balanceData && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[#2C1B15] p-4 rounded-xl text-center">
                                <p className="text-xs text-[#E8DCCF]/60">Cuota</p>
                                <p className="text-2xl font-bold">{balanceData.quota}</p>
                            </div>
                            <div className="bg-[#2C1B15] p-4 rounded-xl text-center">
                                <p className="text-xs text-[#E8DCCF]/60">Ejecución</p>
                                <p className="text-2xl font-bold text-green-400">{balanceData.executed}</p>
                            </div>
                            <div className="bg-[#2C1B15] p-4 rounded-xl text-center">
                                <p className="text-xs text-[#E8DCCF]/60">Déficit</p>
                                <p className="text-2xl font-bold text-red-400">{balanceData.deficit}</p>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="font-bold mb-2">Fechas de Omisión:</h3>
                            <div className="max-h-40 overflow-y-auto bg-[#2C1B15] p-4 rounded-xl text-sm">
                                {balanceData.omissions.length > 0 ? balanceData.omissions.map(d => (
                                    <p key={d.toString()}>{d.toLocaleDateString()}</p>
                                )) : <p>No hay omisiones.</p>}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={handleExportDocx} className="flex-1 bg-[#9E7649] text-white font-bold py-2 rounded-xl">
                                Exportar (.docx)
                            </button>
                            <button onClick={handleShareWhatsApp} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">chat</span> WhatsApp
                            </button>
                        </div>
                    </div>
                )}
                <button onClick={onClose} className="w-full mt-4 text-[#E8DCCF]/60 hover:text-white">Cerrar</button>
            </div>
        </div>
    );
};

export default BalanceModal;
