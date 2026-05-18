import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, ChevronLeft, ArrowRight, ExternalLink, Download, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface toolItem {
  id: string;
  name: string;
  description: string;
  action?: string;
  link?: string;
  type?: 'link' | 'download' | 'action';
}

interface Props {
  id: string;
  title: string;
  description: string;
  onBack: () => void;
  isAdmin: boolean;
  defaultItems?: toolItem[];
}

const GenericTool: React.FC<Props> = ({ id, title, description, onBack, isAdmin, defaultItems = [] }) => {
  const [items, setItems] = useState<toolItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<toolItem | null>(null);

  const storageKey = `rcm_tool_data_${id}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        setItems(defaultItems);
      }
    } else {
      setItems(defaultItems);
    }
  }, [id, defaultItems]);

  const saveItems = (newItems: toolItem[]) => {
    setItems(newItems);
    localStorage.setItem(storageKey, JSON.stringify(newItems));
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      if (!editingItem.id) {
        const newItem = { ...editingItem, id: Date.now().toString() };
        saveItems([...items, newItem]);
      } else {
        saveItems(items.map(i => i.id === editingItem.id ? editingItem : i));
      }
      setEditingItem(null);
    }
  };

  const handleDelete = (itemId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este elemento?')) {
      saveItems(items.filter(i => i.id !== itemId));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Volver a Herramientas</span>
        </button>

        {isAdmin && (
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isSettingsOpen ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Settings size={18} />
            <span>Ajustes</span>
          </button>
        )}
      </div>

      <div className="bg-[#2A1810]/40 border border-[#9E7649]/20 rounded-xl p-6 mb-8 flex gap-4">
        <Info className="text-[#9E7649] shrink-0" />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
          <p className="text-stone-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isSettingsOpen && isAdmin ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-serif text-amber-500">Configuración de Elementos</h3>
              <button 
                onClick={() => setEditingItem({ id: '', name: '', description: '', type: 'link' })}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                <span>Agregar Elemento</span>
              </button>
            </div>

            {editingItem && (
              <div className="p-6 bg-[#2A1810] border border-amber-500/30 rounded-xl space-y-4 shadow-2xl">
                <h4 className="text-white font-medium">{editingItem.id ? 'Editar Elemento' : 'Nuevo Elemento'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={editingItem.name}
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full bg-black/40 border border-stone-700 rounded-lg p-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">Tipo</label>
                    <select 
                      value={editingItem.type}
                      onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}
                      className="w-full bg-black/40 border border-stone-700 rounded-lg p-2 text-white outline-none focus:border-amber-500"
                    >
                      <option value="link">Enlace / Acceso</option>
                      <option value="download">Descarga de Documento</option>
                      <option value="action">Acción de Sistema</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">Descripción</label>
                  <textarea 
                    value={editingItem.description}
                    onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                    className="w-full bg-black/40 border border-stone-700 rounded-lg p-2 text-white outline-none focus:border-amber-500 h-20"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">URL o Comando</label>
                  <input 
                    type="text" 
                    value={editingItem.link || ''}
                    onChange={e => setEditingItem({...editingItem, link: e.target.value})}
                    className="w-full bg-black/40 border border-stone-700 rounded-lg p-2 text-white outline-none focus:border-amber-500 font-mono text-sm"
                    placeholder="https://... o comando de sistema"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-medium text-stone-400 hover:text-white">Cancelar</button>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={!editingItem.name}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400"
                  >
                    <Save size={16} />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-center">
                  <div className="p-3 bg-black/30 rounded-lg text-stone-400">
                    {item.type === 'download' ? <Download size={20} /> : (item.type === 'link' ? <ExternalLink size={20} /> : <FileText size={20} />)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-stone-400 text-xs mt-1">{item.description}</p>
                    {item.link && <p className="text-[#9E7649] text-[10px] mt-1 font-mono truncate">{item.link}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingItem(item)} className="p-2 text-stone-400 hover:text-white bg-white/5 rounded-lg"><Settings size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {items.map(item => (
              <div 
                key={item.id} 
                className="group p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-[#9E7649]/40 transition-all hover:bg-stone-800/50 flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-stone-950 rounded-xl text-[#9E7649] border border-stone-800">
                    {item.type === 'download' ? <Download size={24} /> : (item.type === 'link' ? <ExternalLink size={24} /> : <FileText size={24} />)}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-[#9E7649]/60 font-bold bg-[#9E7649]/10 px-2 py-1 rounded">
                    {item.type === 'download' ? 'Documento' : (item.type === 'link' ? 'Acceso' : 'Proceso')}
                  </span>
                </div>
                
                <h4 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-amber-500 transition-colors">
                  {item.name}
                </h4>
                <p className="text-stone-400 text-sm mb-6 flex-1">
                  {item.description}
                </p>

                <button 
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#9E7649]/20 hover:bg-[#9E7649]/30 text-[#E8DCCF] rounded-xl text-sm font-bold transition-all group-hover:bg-[#9E7649] group-hover:text-black"
                  onClick={() => {
                    if (item.link) {
                      if (item.type === 'link') window.open(item.link, '_blank');
                      else alert(`Iniciando: ${item.name}`);
                    } else {
                      alert(`Iniciando proceso: ${item.name}`);
                    }
                  }}
                >
                  <span>{item.type === 'download' ? 'Descargar' : 'Acceder'}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-stone-500">No hay funciones configuradas para esta herramienta todavía.</p>
                {isAdmin && <p className="text-stone-600 text-sm mt-2">Usa el botón de Ajustes para agregar nuevas funcionalidades.</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GenericTool;
