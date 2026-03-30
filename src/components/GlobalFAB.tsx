import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  CreditCard, 
  BarChart2, 
  Users, 
  Radio, 
  Music, 
  MessageCircle,
  X
} from 'lucide-react';
import { User, AppView } from '../../types';

interface GlobalFABProps {
  currentUser: User | null;
  onNavigate: (view: AppView) => void;
}

export const GlobalFAB: React.FC<GlobalFABProps> = ({ currentUser, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNavigate = (view: AppView, hash?: string) => {
    onNavigate(view);
    if (hash) {
      setTimeout(() => {
        window.location.hash = hash;
      }, 100);
    }
    setIsOpen(false);
  };

  const role = currentUser?.classification;

  if (role !== 'Administrador' && role !== 'Coordinador') {
    return null;
  }

  interface MenuItem {
    label: string;
    icon: React.ReactNode;
    view?: AppView;
    hash?: string;
    path?: string;
    external?: boolean;
  }

  const menuItems: MenuItem[] = [
    { label: 'Agenda Editorial', icon: <Calendar size={20} />, view: AppView.APP_AGENDA, hash: '/editorial' },
    { label: 'Equipo', icon: <Users size={20} />, view: AppView.APP_EQUIPO },
    { label: 'Transmisión', icon: <Radio size={20} />, view: AppView.APP_PROGRAMACION, hash: 'transmision' },
    { label: 'Producción', icon: <Music size={20} />, view: AppView.APP_MUSICA, hash: 'PRODUCTIONS' }
  ];

  // All roles
  menuItems.push(
    { label: 'Grupo de WhatsApp', icon: <MessageCircle size={20} />, path: 'https://chat.whatsapp.com/example', external: true }
  );

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="mb-4 flex flex-col gap-2 items-end"
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => item.external ? window.open(item.path, '_blank') : item.view && handleNavigate(item.view, item.hash)}
                className="flex items-center gap-3 bg-[#3E1E16] text-[#F5EFE6] px-4 py-3 rounded-full shadow-lg hover:bg-[#2C1B15] transition-colors border border-[#C69C6D]/20"
              >
                <span className="font-medium text-sm">{item.label}</span>
                <div className="bg-[#C69C6D]/20 p-2 rounded-full text-[#C69C6D]">
                  {item.icon}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMenu}
        className="w-16 h-16 bg-[#2C1B15] hover:bg-[#1A100C] border border-[#9E7649]/30 text-[#C69C6D] rounded-full shadow-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-4 focus:ring-[#9E7649]/50"
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <div className="size-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-[#3E1E16] font-black text-2xl leading-none pb-1 font-sans">m</span>
          </div>
        )}
      </motion.button>
    </div>
  );
};
