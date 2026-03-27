import React, { useRef } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';

interface NewsUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

const NewsUploadModal: React.FC<NewsUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#FDFCF8] rounded-3xl shadow-2xl overflow-hidden border border-[#5D3A24]/20 animate-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#5D3A24] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl">Cargar Noticias</h3>
              <p className="text-xs text-[#E8DCCF] opacity-70">Actualización masiva de contenido</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-8 p-4 bg-[#F5F0EB] rounded-2xl border border-[#5D3A24]/10">
            <div className="flex gap-3 text-[#5D3A24]">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold mb-1">Formato del archivo:</p>
                <p className="opacity-80">Use un archivo .txt con bloques separados por <span className="font-mono font-bold">---</span>.</p>
                <p className="opacity-80 mt-1">La primera línea de cada bloque es el título.</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-12 border-2 border-dashed border-[#5D3A24]/30 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-[#C69C6D] hover:bg-[#C69C6D]/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-[#5D3A24]/5 flex items-center justify-center text-[#5D3A24] group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-[#5D3A24]">Seleccionar archivo TXT</p>
              <p className="text-xs text-stone-500 mt-1">Haga clic para buscar en su equipo</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".txt" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#F5F0EB] border-t border-[#5D3A24]/10 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-stone-500 hover:text-[#5D3A24] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsUploadModal;
