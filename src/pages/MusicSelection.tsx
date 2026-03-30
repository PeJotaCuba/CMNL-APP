import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Save, Music, User, Globe, Calendar as CalendarIcon, ListMusic } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface SongFormData {
  title: string;
  author: string;
  authorCountry: string;
  interpreter: string;
  interpreterCountry: string;
  date: string;
}

export const MusicSelection: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [songs, setSongs] = useState<SongFormData[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SongFormData>();

  useEffect(() => {
    const savedSongs = localStorage.getItem('cmnl_music_selection');
    if (savedSongs) {
      try {
        setSongs(JSON.parse(savedSongs));
      } catch (e) {
        console.error('Error parsing saved songs', e);
      }
    }
  }, []);

  const onSubmit = (data: SongFormData) => {
    const updatedSongs = [...songs, data];
    setSongs(updatedSongs);
    localStorage.setItem('cmnl_music_selection', JSON.stringify(updatedSongs));
    reset(); // Clear form for next entry
    setIsFormOpen(false); // Close modal on save
  };

  return (
    <div className="max-w-6xl mx-auto p-6 relative min-h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-2xl text-blue-600 dark:text-blue-400">
          <ListMusic size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Selección Musical</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona el catálogo de temas musicales de la emisora.</p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <Music size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No hay temas en la selección</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Utiliza el botón flotante en la esquina inferior derecha para agregar nuevos temas musicales a la base de datos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {songs.map((song, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                  <Music size={24} />
                </div>
                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
                  {song.date}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{song.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-1">por {song.interpreter}</p>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="truncate">Autor: {song.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-gray-400" />
                  <span className="truncate">{song.authorCountry} / {song.interpreterCountry}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agregar Nuevo Tema</h2>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Título del Tema</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Music size={18} className="text-gray-400" />
                      </div>
                      <input
                        {...register('title', { required: 'Campo requerido' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                        placeholder="Ej. El Triste"
                      />
                    </div>
                    {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon size={18} className="text-gray-400" />
                      </div>
                      <input
                        type="date"
                        {...register('date', { required: 'Campo requerido' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                      />
                    </div>
                    {errors.date && <span className="text-red-500 text-xs">{errors.date.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Autor</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={18} className="text-gray-400" />
                      </div>
                      <input
                        {...register('author', { required: 'Campo requerido' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                        placeholder="Nombre del autor"
                      />
                    </div>
                    {errors.author && <span className="text-red-500 text-xs">{errors.author.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">País del Autor</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe size={18} className="text-gray-400" />
                      </div>
                      <input
                        {...register('authorCountry', { required: 'Campo requerido' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                        placeholder="Ej. México"
                      />
                    </div>
                    {errors.authorCountry && <span className="text-red-500 text-xs">{errors.authorCountry.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Intérprete</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={18} className="text-gray-400" />
                      </div>
                      <input
                        {...register('interpreter', { required: 'Campo requerido' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                        placeholder="Nombre del intérprete"
                      />
                    </div>
                    {errors.interpreter && <span className="text-red-500 text-xs">{errors.interpreter.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">País del Intérprete</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe size={18} className="text-gray-400" />
                      </div>
                      <input
                        {...register('interpreterCountry', { required: 'Campo requerido' })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                        placeholder="Ej. México"
                      />
                    </div>
                    {errors.interpreterCountry && <span className="text-red-500 text-xs">{errors.interpreterCountry.message}</span>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
                  >
                    <Save size={20} />
                    Agregar Tema
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB for Music Selection */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-6 right-28 z-40 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
        title="Agregar nuevo tema"
      >
        <Plus size={28} />
      </motion.button>
    </div>
  );
};
