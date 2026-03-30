import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchNewsFromFacebook } from '../services/newsService';
import { NewsItem } from '../../types';

export const NewsCarousel: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await fetchNewsFromFacebook();
        setNews(data);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % news.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + news.length) % news.length);
  };

  useEffect(() => {
    if (news.length === 0) return;
    const interval = setInterval(nextSlide, 5000);
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
    <div className="relative w-full h-96 rounded-3xl overflow-hidden shadow-xl group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {currentNews.image ? (
            <div className="absolute inset-0">
              <img
                src={currentNews.image}
                alt={currentNews.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900" />
          )}

          <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
            <div className="flex items-center gap-4 mb-3 text-sm text-gray-300">
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                <Calendar size={14} />
                {format(new Date(currentNews.date), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
              <span className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                <User size={14} />
                {currentNews.author}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              {currentNews.title}
            </h2>
            <p className="text-gray-200 line-clamp-3 md:line-clamp-2 text-lg max-w-3xl">
              {currentNews.content}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 right-8 flex gap-2">
        <button
          onClick={prevSlide}
          className="p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-colors focus:outline-none"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-colors focus:outline-none"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="absolute bottom-8 left-8 flex gap-2">
        {news.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-8 bg-blue-500' : 'bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
