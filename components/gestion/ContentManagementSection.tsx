import React from 'react';
import { FileText, Upload, Info, Newspaper } from 'lucide-react';
import { NewsItem, ProgramItem } from '../../types';

interface Props {
  historyContent: string;
  setHistoryContent: React.Dispatch<React.SetStateAction<string>>;
  aboutContent: string;
  setAboutContent: React.Dispatch<React.SetStateAction<string>>;
  news: any[];
  setNews: React.Dispatch<React.SetStateAction<any[]>>;
  onDirtyChange?: (isDirty: boolean) => void;
}

const ContentManagementSection: React.FC<Props> = ({ historyContent, setHistoryContent, aboutContent, setAboutContent, news, setNews, onDirtyChange }) => {
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'history' | 'about' | 'news' | 'programacion') => {
    const file = e.target.files?.[0];
    if (file) {
      if (onDirtyChange) onDirtyChange(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (type === 'history') {
            setHistoryContent(text);
            alert('Contenido de Historia actualizado.');
        } else if (type === 'about') {
            setAboutContent(text);
            alert('Contenido de Quiénes Somos actualizado.');
        } else if (type === 'news') {
            // Parse news: Title on first line, content on subsequent lines, separated by ---
            const blocks = text.split(/---/).filter(b => b.trim());
            const newNews: NewsItem[] = blocks.map((block, index) => {
              const lines = block.trim().split('\n').filter(l => l.trim());
              const title = lines[0] || 'Sin Título';
              const content = lines.slice(1).join('\n') || '';
              return {
                id: `news-${Date.now()}-${index}`,
                title,
                content,
                category: 'General',
                date: new Date().toLocaleDateString(),
                excerpt: content.slice(0, 100) + '...'
              };
            });
            setNews(newNews);
            localStorage.setItem('rcm_news', JSON.stringify(newNews));
            alert(`${newNews.length} noticias cargadas correctamente.`);
        } else if (type === 'programacion') {
            // Parse programming: Time | Name | Description
            const lines = text.split('\n').filter(l => l.trim());
            const newPrograms: ProgramItem[] = lines.map((line, index) => {
              const [time, name, description] = line.split('|').map(s => s.trim());
              return {
                id: `prog-${Date.now()}-${index}`,
                time: time || '00:00',
                name: name || 'Programa sin nombre',
                description: description || '',
                days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
              };
            });
            localStorage.setItem('rcm_programming', JSON.stringify(newPrograms));
            alert(`${newPrograms.length} programas cargados correctamente.`);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto grid gap-8 animate-in fade-in duration-300">
        {/* Historia Section */}
        <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4 border-b border-[#9E7649]/10 pb-4">
                <div className="p-3 bg-[#9E7649]/20 rounded-xl text-[#9E7649]">
                    <FileText size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Historia de la Emisora</h3>
                    <p className="text-xs text-[#E8DCCF]/60">Visible en la sección pública "Historia"</p>
                </div>
            </div>
            <label className="flex items-center gap-2 bg-[#1A100C] hover:bg-[#2C1B15] text-[#E8DCCF] px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-[#9E7649]/30 cursor-pointer">
                <Upload size={16} />
                <span>Cargar Historia (.txt)</span>
                <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'history')} className="hidden" />
            </label>
        </div>

        {/* Quiénes Somos Section */}
        <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4 border-b border-[#9E7649]/10 pb-4">
                <div className="p-3 bg-[#9E7649]/20 rounded-xl text-[#9E7649]">
                    <Info size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Quiénes Somos</h3>
                    <p className="text-xs text-[#E8DCCF]/60">Visible en la sección pública "Quiénes Somos"</p>
                </div>
            </div>
            <label className="flex items-center gap-2 bg-[#1A100C] hover:bg-[#2C1B15] text-[#E8DCCF] px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-[#9E7649]/30 cursor-pointer">
                <Upload size={16} />
                <span>Cargar Quiénes Somos (.txt)</span>
                <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'about')} className="hidden" />
            </label>
        </div>
        {/* Noticias Section */}
        <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4 border-b border-[#9E7649]/10 pb-4">
                <div className="p-3 bg-[#9E7649]/20 rounded-xl text-[#9E7649]">
                    <Newspaper size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Noticias</h3>
                    <p className="text-xs text-[#E8DCCF]/60">Gestión de noticias</p>
                </div>
            </div>
            <label className="flex items-center gap-2 bg-[#1A100C] hover:bg-[#2C1B15] text-[#E8DCCF] px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-[#9E7649]/30 cursor-pointer">
                <Upload size={16} />
                <span>Cargar Noticias (.txt)</span>
                <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'news')} className="hidden" />
            </label>
        </div>

        {/* Programación Section */}
        <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-4 border-b border-[#9E7649]/10 pb-4">
                <div className="p-3 bg-[#9E7649]/20 rounded-xl text-[#9E7649]">
                    <FileText size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Programación</h3>
                    <p className="text-xs text-[#E8DCCF]/60">Gestión de programación</p>
                </div>
            </div>
            <label className="flex items-center gap-2 bg-[#1A100C] hover:bg-[#2C1B15] text-[#E8DCCF] px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-[#9E7649]/30 cursor-pointer">
                <Upload size={16} />
                <span>Cargar Programación (.txt)</span>
                <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'programacion')} className="hidden" />
            </label>
        </div>
    </div>
  );
};

export default ContentManagementSection;
