import React from 'react';

interface BackupDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onBackup: () => void;
}

const BackupDialog: React.FC<BackupDialogProps> = ({ isOpen, onClose, onBackup }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl shadow-2xl p-6 border border-[#9E7649]/30">
                <h3 className="text-lg font-bold text-white mb-4">¿Deseas guardar un respaldo?</h3>
                <p className="text-sm text-[#E8DCCF]/80 mb-6">Has realizado cambios. Se recomienda guardar un respaldo antes de salir.</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 bg-[#1A100C] border border-[#9E7649]/30 rounded-lg text-white text-sm font-bold">No, salir</button>
                    <button onClick={onBackup} className="flex-1 py-2 bg-[#9E7649] text-white rounded-lg text-sm font-bold">Guardar Respaldo</button>
                </div>
            </div>
        </div>
    );
};

export default BackupDialog;
