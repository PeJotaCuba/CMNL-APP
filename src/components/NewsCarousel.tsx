import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NewsItem } from '../../types';

export const NewsCarousel: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNews = () => {
    try {
      const storedNews = localStorage.getItem('news');
      if (storedNews) {
        const parsed = JSON.parse(storedNews);
        setNews(parsed);
        // Resetear índice si queda fuera de rango tras la actualización
        setCurrentIndex((prev) => (prev >= parsed.length ? 0 : prev));
      }
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();

    const handleStorageChange = () => {
      loadNews();
    };

    // Escuchar el evento storage para actualización instantánea en la misma pestaña
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const nextSlide = () => {
    if (news.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % news.length);
  };

  const prevSlide = () => {
    if (news.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + news.length) % news.length);
  };

  useEffect(() => {
    if (news.length === 0) return;
    const interval = setInterval(nextSlide, 10000);
    return () => clearInterval(interval);
  }, [news.length]);

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse flex items-center justify-center">
        <span className="text-gray-400 dark:text-gray-500">Cargando noticias...</span>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
        <span className="text-gray-500 dark:text-gray-400">No hay noticias disponibles.</span>
      </div>
    );
  }

  const currentNews = news[currentIndex];

  return (
    <>
      {/* Carrusel: Al hacer clic se abre el Modal superpuesto */}
      <div 
        className="relative w-full rounded-3xl overflow-hidden shadow-xl group bg-white dark:bg-gray-800 p-8 cursor-pointer hover:shadow-2xl transition-shadow border border-gray-100 dark:border-gray-700" 
        onClick={() => setSelectedNews(currentNews)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
              {currentNews.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
              Por {currentNews.author}
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed line-clamp-3">
              {currentNews.content}
            </p>
            <div className="mt-2 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
              Leer noticia completa &rarr;
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-6 right-8 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white transition-colors focus:outline-none shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white transition-colors focus:outline-none shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Modal de Detalle: Mantiene al usuario en la misma pantalla */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">
                {selectedNews.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mb-8 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-4">
                Por {selectedNews.author}
              </p>
              <div className="text-gray-800 dark:text-gray-200 text-xl leading-relaxed space-y-4 whitespace-pre-wrap">
                {selectedNews.content}
              </div>
              
              <div className="mt-12">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98]"
                >
                  Cerrar Noticia
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};