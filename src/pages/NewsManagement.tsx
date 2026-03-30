import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { NewsItem } from '../../types';

export const NewsManagement: React.FC = () => {
  const [parsedNews, setParsedNews] = useState<NewsItem[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      // Regla de Separación: split estrictamente por la línea de 27 guiones
      const newsItems = text.split('___________________________').map(chunk => {
        const trimmedChunk = chunk.trim();
        if (!trimmedChunk) return null;

        // Uso de Expresiones Regulares (Regex) para el parseo estricto
        const titleMatch = trimmedChunk.match(/Titular:\s*(.*)/i);
        const authorMatch = trimmedChunk.match(/Autor:\s*(.*)/i);
        const contentMatch = trimmedChunk.match(/Texto:\s*([\s\S]*)/i);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const author = authorMatch ? authorMatch[1].trim() : 'Redacción';
        const content = contentMatch ? contentMatch[1].trim() : '';

        if (!title) return null;

        return {
          id: `txt-${Date.now()}-${Math.random()}`,
          title,
          author,
          content,
          category: 'Noticias',
          date: new Date().toISOString(),
          excerpt: content.slice(0, 100) + '...'
        } as NewsItem;
      }).filter((item): item is NewsItem => item !== null);

      if (newsItems.length > 0) {
        // Guardado Automático inmediato
        localStorage.setItem('news', JSON.stringify(newsItems));
        
        // Disparar evento de ventana para que el carrusel se actualice al instante
        window.dispatchEvent(new Event('storage'));
        
        setParsedNews(newsItems);
        
        // Feedback al Usuario: Alert exacto solicitado
        alert(`Se han cargado con éxito ${newsItems.length} noticias`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Gestión de Noticias</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Cargar Archivo de Noticias (.txt)</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Sube un archivo de texto con las noticias separadas por 27 guiones bajos.
        </p>
        
        <div className="flex items-center justify-center w-full">
          <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:hover:bg-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Haz clic para subir</span> el archivo TXT</p>
            </div>
            <input id="dropzone-file" type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {parsedNews.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Noticias Cargadas ({parsedNews.length})</h2>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-64 overflow-y-auto">
            {parsedNews.map((news, index) => (
              <div key={index} className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white">{news.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Autor: {news.author}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};