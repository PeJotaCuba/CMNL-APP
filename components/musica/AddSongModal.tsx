import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Music, User, Globe, Calendar as CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Track } from './types';

interface SongFormData {
  title: string;
  author: string;
  authorCountry: string;
  interpreter: string;
  interpreterCountry: string;
  date: string;
}

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (track: Track) => void;
}

const AddSongModal: React.FC<AddSongModalProps> = ({ isOpen, onClose, onSave }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SongFormData>();

  const onSubmit = (data: SongFormData) => {
    const newTrack: Track = {
      id: `manual-${Date.now()}`,
      filename: `${data.title} - ${data.interpreter}.mp3`,
      path: 'Manual',
      metadata: {
        title: data.title,
        author: data.author,
        authorCountry: data.authorCountry,
        performer: data.interpreter,
        performerCountry: data.interpreterCountry,
        album: 'Añadido Manualmente',
        year: data.date,
      },
      isVerified: true,
    };
    onSave(newTrack);
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#2C1B15] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[#9E7649]/30"
          >
            <div className="flex items-center justify-between p-6 border-b border-[#9E7649]/20 bg-[#1A100C]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Music size={24} className="text-[#9E7649]" />
                Agregar Nuevo Tema
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-[#E8DCCF]/40 hover:text-white rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-wider">Título de la Obra</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Music size={16} className="text-[#9E7649]" />
                    </div>
                    <input
                      {...register('title', { required: 'Campo requerido' })}
                      className="w-full pl-10 pr-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl focus:border-[#9E7649] outline-none transition-all text-white text-sm"
                      placeholder="Ej. El Triste"
                    />
                  </div>
                  {errors.title && <span className="text-red-400 text-xs">{errors.title.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-wider">Fecha</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon size={16} className="text-[#9E7649]" />
                    </div>
                    <input
                      type="date"
                      {...register('date', { required: 'Campo requerido' })}
                      className="w-full pl-10 pr-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl focus:border-[#9E7649] outline-none transition-all text-white text-sm"
                    />
                  </div>
                  {errors.date && <span className="text-red-400 text-xs">{errors.date.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-wider">Autor</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-[#9E7649]" />
                    </div>
                    <input
                      {...register('author', { required: 'Campo requerido' })}
                      className="w-full pl-10 pr-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl focus:border-[#9E7649] outline-none transition-all text-white text-sm"
                      placeholder="Nombre del autor"
                    />
                  </div>
                  {errors.author && <span className="text-red-400 text-xs">{errors.author.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-wider">País del Autor</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe size={16} className="text-[#9E7649]" />
                    </div>
                    <input
                      {...register('authorCountry', { required: 'Campo requerido' })}
                      className="w-full pl-10 pr-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl focus:border-[#9E7649] outline-none transition-all text-white text-sm"
                      placeholder="Ej. Cuba"
                    />
                  </div>
                  {errors.authorCountry && <span className="text-red-400 text-xs">{errors.authorCountry.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-wider">Intérprete</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-[#9E7649]" />
                    </div>
                    <input
                      {...register('interpreter', { required: 'Campo requerido' })}
                      className="w-full pl-10 pr-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl focus:border-[#9E7649] outline-none transition-all text-white text-sm"
                      placeholder="Nombre del intérprete"
                    />
                  </div>
                  {errors.interpreter && <span className="text-red-400 text-xs">{errors.interpreter.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-wider">País del Intérprete</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe size={16} className="text-[#9E7649]" />
                    </div>
                    <input
                      {...register('interpreterCountry', { required: 'Campo requerido' })}
                      className="w-full pl-10 pr-4 py-3 bg-[#1A100C] border border-[#9E7649]/30 rounded-xl focus:border-[#9E7649] outline-none transition-all text-white text-sm"
                      placeholder="Ej. Cuba"
                    />
                  </div>
                  {errors.interpreterCountry && <span className="text-red-400 text-xs">{errors.interpreterCountry.message}</span>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#9E7649]/20">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold text-[#E8DCCF]/60 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#9E7649] hover:bg-[#8B653D] text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
                >
                  <Save size={18} />
                  Guardar Canción
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddSongModal;
