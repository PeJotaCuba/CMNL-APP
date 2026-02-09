import React, { useState } from 'react';
import { ArrowLeft, Upload, Trash2, UserPlus, Search, FileText, Info, Edit2, Download, Newspaper } from 'lucide-react';
import { User, NewsItem, UserClassification } from '../types';

interface Props {
  onBack: () => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  historyContent: string;
  setHistoryContent: React.Dispatch<React.SetStateAction<string>>;
  aboutContent: string;
  setAboutContent: React.Dispatch<React.SetStateAction<string>>;
  news: NewsItem[];
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
}

const UserManagement: React.FC<Props> = ({ 
    onBack, users, setUsers, 
    historyContent, setHistoryContent, 
    aboutContent, setAboutContent,
    news, setNews
}) => {
  const [newUser, setNewUser] = useState<User>({ name: '', username: '', mobile: '', password: '', role: 'worker', classification: 'Usuario' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'content'>('users');
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.username && newUser.password) {
      if (isEditing) {
         setUsers(prev => prev.map(u => u.username === newUser.username ? newUser : u));
         setIsEditing(false);
      } else {
         if (users.find(u => u.username === newUser.username)) {
            alert('El nombre de usuario ya existe');
            return;
         }
         setUsers([...users, newUser]);
      }
      setNewUser({ name: '', username: '', mobile: '', password: '', role: 'worker', classification: 'Usuario' });
    }
  };

  const startEditUser = (user: User) => {
    setNewUser(user);
    setIsEditing(true);
    // Scroll to form on mobile if needed, though with new layout it's just below
  };

  const removeUser = (username: string) => {
    if(confirm('¿Eliminar usuario?')) {
        setUsers(users.filter(u => u.username !== username));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'users' | 'history' | 'about' | 'news') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (type === 'users') {
            parseAndAddUsers(text);
        } else if (type === 'history') {
            setHistoryContent(text);
            alert('Contenido de Historia actualizado.');
        } else if (type === 'about') {
            setAboutContent(text);
            alert('Contenido de Quiénes Somos actualizado.');
        } else if (type === 'news') {
            parseAndAddNews(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const parseAndAddUsers = (text: string) => {
    const regex = /Nombre completo:\s*(.*?),\s*Nombre de usuario:\s*(.*?),\s*Número de móvil:\s*(.*?),\s*Contraseña:\s*(.*?)(?:\n|$)/g;
    let match;
    const newUsers: User[] = [];

    while ((match = regex.exec(text)) !== null) {
      newUsers.push({
        name: match[1].trim(),
        username: match[2].trim(),
        mobile: match[3].trim(),
        password: match[4].trim(),
        role: 'worker',
        classification: 'Usuario' // Default
      });
    }

    if (newUsers.length > 0) {
      setUsers(prev => {
          const combined = [...prev];
          newUsers.forEach(nu => {
              if(!combined.find(u => u.username === nu.username)) {
                  combined.push(nu);
              }
          });
          return combined;
      });
      alert(`Usuarios procesados. Importados nuevos: ${newUsers.length}`);
    } else {
        alert("No se encontraron usuarios con el formato esperado.");
    }
  };

  const parseAndAddNews = (text: string) => {
    const titleMatch = text.match(/Titular:\s*([\s\S]*?)(?=\nAutor:|$)/i);
    const authorMatch = text.match(/Autor:\s*([\s\S]*?)(?=\nTexto:|$)/i);
    const contentMatch = text.match(/Texto:\s*([\s\S]*)/i);

    if (titleMatch && contentMatch) {
      const newNews: NewsItem = {
        id: Date.now().toString(),
        title: titleMatch[1].trim(),
        author: authorMatch ? authorMatch[1].trim() : 'Redacción',
        content: contentMatch[1].trim(),
        date: 'Ahora mismo',
        category: 'Boletín',
        image: 'https://picsum.photos/600/300?random=' + Date.now()
      };
      setNews(prev => [newNews, ...prev]);
      alert('Noticia cargada correctamente.');
    } else {
      alert('Formato de noticia incorrecto. Asegúrese de usar Titular:, Autor:, Texto:');
    }
  };

  const handleDownloadBackup = () => {
    const data = {
        users,
        historyContent,
        aboutContent,
        news
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'actualcmnl.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-[#1A100C] text-[#E8DCCF] font-display overflow-hidden">
       {/* Header */}
      <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-[#F5EFE6]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white leading-none">Ajustes & Gestión</h1>
          <p className="text-[10px] text-[#9E7649]">Administración de sistema</p>
        </div>
        <button onClick={handleDownloadBackup} className="flex items-center gap-2 bg-[#9E7649] hover:bg-[#8B653D] text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors">
            <Download size={16} /> Respaldar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#9E7649]/20 shrink-0">
          <button 
            onClick={() => setActiveTab('users')} 
            className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider ${activeTab === 'users' ? 'text-[#9E7649] bg-[#2C1B15] border-b-2 border-[#9E7649]' : 'text-[#E8DCCF]/50'}`}
          >
            Usuarios
          </button>
          <button 
             onClick={() => setActiveTab('content')}
             className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider ${activeTab === 'content' ? 'text-[#9E7649] bg-[#2C1B15] border-b-2 border-[#9E7649]' : 'text-[#E8DCCF]/50'}`}
          >
            Contenido
          </button>
      </div>

      {/* Scrollable Main Content Area - Single scroll for mobile flow */}
      <div className="flex-1 overflow-y-auto pb-40"> 
        
        {activeTab === 'users' && (
            <div className="flex flex-col md:flex-row h-full md:h-auto">
                
                {/* List Section - Displays first on mobile, Left on Desktop */}
                <div className="flex-1 bg-[#1A100C] flex flex-col min-h-[50vh] md:h-full md:overflow-y-auto border-b md:border-b-0 md:border-r border-[#9E7649]/10">
                    <div className="p-4 border-b border-[#9E7649]/10 bg-[#1A100C] sticky top-0 z-10">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E7649]" />
                            <input type="text" placeholder="Buscar usuarios..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#2C1B15] pl-10 pr-4 py-2 rounded-lg text-sm border border-[#9E7649]/10 focus:border-[#9E7649]/50 outline-none placeholder:text-[#E8DCCF]/30" />
                        </div>
                    </div>
                    
                    <div className="p-4 grid gap-3">
                        {filteredUsers.map((user, idx) => (
                            <div key={idx} className="bg-[#2C1B15] p-3 rounded-xl border border-[#9E7649]/10 flex items-center justify-between group hover:border-[#9E7649]/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#1A100C] flex items-center justify-center text-[#9E7649] font-bold text-xs border border-[#9E7649]/20">
                                        {user.username.substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{user.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                             <span className="text-[10px] bg-[#9E7649]/20 text-[#9E7649] px-1.5 py-0.5 rounded">{user.classification || 'Usuario'}</span>
                                             <span className="text-[10px] text-[#E8DCCF]/50">@{user.username}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-[10px] bg-black/20 px-2 py-1 rounded text-[#E8DCCF]/50 font-mono hidden sm:block">{user.password}</div>
                                    <button onClick={() => startEditUser(user)} className="p-2 text-[#E8DCCF]/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    {user.username !== 'admin' && (
                                        <button onClick={() => removeUser(user.username)} className="p-2 text-[#E8DCCF]/40 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form & Upload Section - Displays second on mobile (scrolled down), Right on Desktop */}
                <div className="w-full md:w-1/3 bg-[#2C1B15] p-6 shrink-0 md:h-full md:overflow-y-auto">
                    <div className="mb-10">
                        <h2 className="text-sm font-bold text-[#9E7649] uppercase tracking-wider mb-4">{isEditing ? 'Editar Usuario' : 'Crear Usuario'}</h2>
                        
                        <form onSubmit={addUser} className="flex flex-col gap-3">
                            <input name="name" placeholder="Nombre completo" value={newUser.name} onChange={handleInputChange} className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required />
                            <div className="flex gap-2">
                                <input name="username" placeholder="Usuario" value={newUser.username} onChange={handleInputChange} disabled={isEditing} className={`flex-1 bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none ${isEditing ? 'opacity-50' : ''}`} required />
                                <input name="mobile" placeholder="Móvil" value={newUser.mobile} onChange={handleInputChange} className="flex-1 bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" />
                            </div>
                            
                            <select name="classification" value={newUser.classification} onChange={handleInputChange} className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-[#E8DCCF]">
                                <option value="Usuario">Usuario</option>
                                <option value="Director">Director</option>
                                <option value="Asesor">Asesor</option>
                                <option value="Realizador de sonido">Realizador</option>
                                <option value="Locutor">Locutor</option>
                                <option value="Administrador">Administrador</option>
                            </select>

                            <input name="password" type="text" placeholder="Contraseña" value={newUser.password} onChange={handleInputChange} className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required />
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-[#9E7649] hover:bg-[#8B653D] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-2 transition-colors">
                                    <UserPlus size={18} /> {isEditing ? 'Guardar' : 'Crear'}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={() => { setIsEditing(false); setNewUser({ name: '', username: '', mobile: '', password: '', role: 'worker', classification: 'Usuario' }); }} className="bg-white/10 text-white px-4 rounded-lg mt-2 font-bold">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="border-t border-[#9E7649]/20 pt-6 pb-12">
                        <h2 className="text-sm font-bold text-[#9E7649] uppercase tracking-wider mb-2">Carga Masiva (TXT)</h2>
                        <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[#9E7649]/30 rounded-lg hover:bg-[#9E7649]/5 cursor-pointer transition-colors">
                            <div className="flex flex-col items-center gap-1">
                                <Upload size={24} className="text-[#9E7649]" />
                                <span className="text-xs font-medium text-[#E8DCCF]">Importar Lista</span>
                            </div>
                            <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'users')} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'content' && (
            <div className="p-6 bg-[#1A100C]">
                <h2 className="text-sm font-bold text-[#9E7649] uppercase tracking-wider mb-6">Carga de Contenido</h2>
                
                <div className="grid gap-6 max-w-2xl mx-auto pb-12">
                    {/* History Section */}
                    <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-[#9E7649]/10 flex items-center justify-center text-[#9E7649]">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Sección Historia</h3>
                                <p className="text-xs text-[#E8DCCF]/60">Texto para "Nuestra Historia"</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <label className="flex-1 bg-[#3E1E16] hover:bg-[#4E2A20] text-[#E8DCCF] py-3 rounded-lg border border-[#9E7649]/20 cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                <Upload size={16} /> Cargar TXT
                                <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'history')} className="hidden" />
                             </label>
                             <button onClick={() => {setHistoryContent(''); alert('Historia borrada');}} className="px-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-900/20">
                                <Trash2 size={16} />
                             </button>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-[#9E7649]/10 flex items-center justify-center text-[#9E7649]">
                                <Info size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Sección Quiénes Somos</h3>
                                <p className="text-xs text-[#E8DCCF]/60">Texto institucional</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <label className="flex-1 bg-[#3E1E16] hover:bg-[#4E2A20] text-[#E8DCCF] py-3 rounded-lg border border-[#9E7649]/20 cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                <Upload size={16} /> Cargar TXT
                                <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'about')} className="hidden" />
                             </label>
                             <button onClick={() => {setAboutContent(''); alert('Quiénes Somos borrado');}} className="px-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-900/20">
                                <Trash2 size={16} />
                             </button>
                        </div>
                    </div>

                    {/* News Section */}
                    <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-[#9E7649]/10 flex items-center justify-center text-[#9E7649]">
                                <Newspaper size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Sección Noticias</h3>
                                <p className="text-xs text-[#E8DCCF]/60">Carga de noticias recientes</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <label className="flex-1 bg-[#3E1E16] hover:bg-[#4E2A20] text-[#E8DCCF] py-3 rounded-lg border border-[#9E7649]/20 cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                <Upload size={16} /> Cargar TXT
                                <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'news')} className="hidden" />
                             </label>
                             <button onClick={() => {setNews([]); alert('Noticias borradas');}} className="px-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-900/20">
                                <Trash2 size={16} />
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;