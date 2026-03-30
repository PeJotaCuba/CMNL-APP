import React, { useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { parseNewsFromFile } from '../services/newsService';

export const NewsManagement: React.FC = () => {
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedContent, setParsedContent] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
      setParsedContent(parseNewsFromFile(text));
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Gestión de Noticias</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Cargar Archivo de Noticias (.txt)</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Sube un archivo de texto con las noticias. El sistema omitirá automáticamente las etiquetas "Titular:", "Autor:" y "Texto:".
        </p>
        
        <div className="flex items-center justify-center w-full">
          <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Archivos TXT (MAX. 5MB)</p>
            </div>
            <input id="dropzone-file" type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {parsedContent && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Vista Previa del Contenido Limpio</h2>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300 h-64 overflow-y-auto">
            {parsedContent}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              {success ? <CheckCircle size={20} /> : null}
              {success ? 'Guardado Exitosamente' : 'Guardar Noticias'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
