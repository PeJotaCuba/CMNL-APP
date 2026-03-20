import React, { useState } from 'react';
import { ArrowLeft, Upload, Trash2, UserPlus, Search, FileText, Info, Edit2, Download, Newspaper, DownloadCloud, RefreshCw } from 'lucide-react';
import { User, NewsItem, UserClassification, UserPermissions } from '../types';
import { getCategoryVector } from '../utils/scheduleData';
import CMNLHeader from './CMNLHeader';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  historyContent: string;
  setHistoryContent: React.Dispatch<React.SetStateAction<string>>;
  aboutContent: string;
  setAboutContent: React.Dispatch<React.SetStateAction<string>>;
  news: NewsItem[];
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  isSyncing: boolean;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: User | null;
}

const UserManagement: React.FC<Props> = ({ 
    onBack, onMenuClick, users, setUsers, 
    historyContent, setHistoryContent, 
    aboutContent, setAboutContent,
    news, setNews,
    isSyncing, setIsSyncing,
    currentUser
}) => {
  const [newUser, setNewUser] = useState<User>({ name: '', username: '', mobile: '', password: '', role: 'worker', classification: 'Usuario', permissions: { canEditNews: false, canEditProgramming: false, canEditAbout: false, canEditCatalog: false, canEditFichas: false, canEditHours: false, canEditTeam: false } });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'content'>('users');

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleNewUserPermissionChange = (permission: keyof UserPermissions) => {
      setNewUser(prev => ({
          ...prev,
          permissions: {
              ...(prev.permissions || { canEditNews: false, canEditProgramming: false, canEditAbout: false }),
              [permission]: !prev.permissions?.[permission]
          }
      }));
  };

  const handleEditUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingUser(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleEditUserPermissionChange = (permission: keyof UserPermissions) => {
      setEditingUser(prev => prev ? ({
          ...prev,
          permissions: {
              ...(prev.permissions || { canEditNews: false, canEditProgramming: false, canEditAbout: false }),
              [permission]: !prev.permissions?.[permission]
          }
      }) : null);
  };

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.username && newUser.password) {
         if (users.find(u => u.username === newUser.username)) {
            alert('El nombre de usuario ya existe');
            return;
         }
         setUsers([...users, newUser]);
         setNewUser({ name: '', username: '', mobile: '', password: '', role: 'worker', classification: 'Usuario' });
    }
  };

  const saveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && editingUser.username && editingUser.password) {
         setUsers(prev => prev.map(u => u.username === editingUser.username ? editingUser : u));
         setEditingUser(null);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
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

  const detectCategory = (text: string): string => {
      return 'Noticia';
  };

  const parseAndAddNews = (text: string) => {
    const normalizedText = text.replace(/\r\n/g, '\n');
    const blocks = normalizedText.split(/\n\s*_{3,}\s*\n/);
    
    const parsedNews: NewsItem[] = [];
    let count = 0;

    blocks.forEach(block => {
        if (!block.trim()) return;

        const titleKey = "Titular:";
        const authorKey = "Autor:";
        const textKey = "Texto:";

        const titleIndex = block.indexOf(titleKey);
        const textIndex = block.indexOf(textKey);

        if (titleIndex !== -1 && textIndex !== -1) {
            const authorIndex = block.indexOf(authorKey);
            
            let titleEnd = textIndex;
            if (authorIndex !== -1 && authorIndex > titleIndex && authorIndex < textIndex) {
                titleEnd = authorIndex;
            }
            const title = block.substring(titleIndex + titleKey.length, titleEnd).trim();

            let author = "Redacción";
            if (authorIndex !== -1 && authorIndex > titleIndex && authorIndex < textIndex) {
                author = block.substring(authorIndex + authorKey.length, textIndex).trim();
            }

            const content = block.substring(textIndex + textKey.length).trim();

            if (title && content) {
                 const category = detectCategory(title + ' ' + content);
                 parsedNews.push({
                    id: Date.now().toString() + Math.random().toString(),
                    title: title,
                    author: author,
                    content: content,
                    date: 'Reciente',
                    category: category,
                    image: getCategoryVector(category, title)
                });
                count++;
            }
        }
    });

    if (count > 0) {
      setNews(parsedNews);
      alert(`Se han cargado ${count} noticias correctamente. La lista anterior ha sido reemplazada.`);
    } else {
      alert('No se encontraron noticias válidas. Use el formato:\nTitular: ...\nAutor: ...\nTexto: ...\n____ (separador)');
    }
  };

  // --- LÓGICA DE RESPALDO Y RESTAURACIÓN ---

  const handleDownloadBackup = () => {
    // Recopilar datos de guiones y secciones de programas
    const scriptData: Record<string, any> = {};
    const programSections: Record<string, any> = {};
    
    // Recopilar configuraciones de pago
    const paymentConfigs: Record<string, any> = {};

    // Iterar sobre todo el localStorage para capturar claves dinámicas
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key.startsWith('guionbd_data_')) {
            try {
                scriptData[key] = JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e) {}
        } else if (key.startsWith('program_sections_')) {
            try {
                programSections[key] = JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e) {}
        } else if (key.startsWith('rcm_payment_config_')) {
            try {
                paymentConfigs[key] = JSON.parse(localStorage.getItem(key) || '{}');
            } catch (e) {}
        }
    }

    // Recopilar datos de Gestión (Fichas, Catálogo, Worklogs, Consolidados)
    let fichas = [];
    const savedFichas = localStorage.getItem('rcm_data_fichas');
    if (savedFichas) {
        try { fichas = JSON.parse(savedFichas); } catch (e) {}
    }

    let catalogo = [];
    try { catalogo = JSON.parse(localStorage.getItem('rcm_data_catalogo') || '[]'); } catch (e) {}
    
    let worklogs = [];
    try { worklogs = JSON.parse(localStorage.getItem('rcm_data_worklogs') || '[]'); } catch (e) {}

    let consolidated = [];
    try { consolidated = JSON.parse(localStorage.getItem('rcm_data_consolidated') || '[]'); } catch (e) {}

    let interruptions = [];
    try { interruptions = JSON.parse(localStorage.getItem('rcm_interruptions') || '[]'); } catch (e) {}

    let consolidatedMonths = [];
    try { consolidatedMonths = JSON.parse(localStorage.getItem('rcm_consolidated_months') || '[]'); } catch (e) {}

    let transmissionConfig = {};
    try { transmissionConfig = JSON.parse(localStorage.getItem('rcm_transmission_config') || '{}'); } catch (e) {}

    // Recopilar datos de Agenda
    let agendaPrograms = [];
    try { agendaPrograms = JSON.parse(localStorage.getItem('rcm_programs') || '[]'); } catch (e) {}

    let agendaEfemerides = {};
    try { agendaEfemerides = JSON.parse(localStorage.getItem('rcm_efemerides') || '{}'); } catch (e) {}

    let agendaConmemoraciones = {};
    try { agendaConmemoraciones = JSON.parse(localStorage.getItem('rcm_conmemoraciones') || '{}'); } catch (e) {}

    let agendaDayThemes = {};
    try { agendaDayThemes = JSON.parse(localStorage.getItem('rcm_day_themes') || '{}'); } catch (e) {}

    let agendaUsers = [];
    try { agendaUsers = JSON.parse(localStorage.getItem('rcm_users') || '[]'); } catch (e) {}

    let agendaPropaganda = {};
    try { agendaPropaganda = JSON.parse(localStorage.getItem('rcm_propaganda') || '{}'); } catch (e) {}

    const data = {
        users, // Usuarios del sistema principal
        historyContent,
        aboutContent,
        news,
        fichas,
        catalogo,
        worklogs,
        consolidated,
        interruptions,
        consolidatedMonths,
        transmissionConfig,
        paymentConfigs,
        scripts: scriptData,
        programSections,
        agendaPrograms,
        agendaEfemerides,
        agendaConmemoraciones,
        agendaDayThemes,
        agendaUsers, // Usuarios de la agenda (perfiles extendidos)
        agendaPropaganda
    };
    
    // Nombre fijo solicitado para coincidir con el repositorio
    const filename = `actualcmnl.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadFromGithub = async () => {
      if(!confirm('¿Estás seguro de sincronizar con GitHub? Esto reemplazará los datos locales con la versión oficial de la nube.')) {
          return;
      }

      setIsSyncing(true);
      const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/actualcmnl.json';

      try {
          const response = await fetch(GITHUB_RAW_URL, { cache: "no-store" });
          if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
          
          const json = await response.json();
          let restoredCount = 0;

          // Restaurar Usuarios Principales
          if (json.users && Array.isArray(json.users)) {
            setUsers(prev => {
                const map = new Map(prev.map(u => [u.username, u]));
                json.users.forEach(u => map.set(u.username, u));
                return Array.from(map.values());
            });
            restoredCount++;
          }
          
          // Restaurar Contenido Estático
          if (typeof json.historyContent === 'string') {
            setHistoryContent(json.historyContent);
            restoredCount++;
          }
          if (typeof json.aboutContent === 'string') {
            setAboutContent(json.aboutContent);
            restoredCount++;
          }
          
          // Restaurar Noticias
          if (json.news && Array.isArray(json.news)) {
            const processedNews = json.news.map((n: NewsItem) => ({
                ...n,
                image: (!n.image || n.image === '') 
                    ? getCategoryVector(n.category || 'Boletín', n.title) 
                    : n.image
            }));
            setNews(processedNews);
            restoredCount++;
          }

          const mergeData = (localKey: string, jsonData: any[], idKey: string | ((item: any) => string)) => {
              if (!jsonData || !Array.isArray(jsonData)) return;
              const localDataStr = localStorage.getItem(localKey);
              const localData = localDataStr ? JSON.parse(localDataStr) : [];
              if (!Array.isArray(localData)) {
                  localStorage.setItem(localKey, JSON.stringify(jsonData));
                  return;
              }
              const getId = (item: any) => typeof idKey === 'function' ? idKey(item) : String(item[idKey]);
              const mergedMap = new Map();
              localData.forEach(item => { if (item) mergedMap.set(getId(item), item); });
              jsonData.forEach(item => { if (item) mergedMap.set(getId(item), item); });
              localStorage.setItem(localKey, JSON.stringify(Array.from(mergedMap.values())));
          };

          const mergeRecordData = (localKey: string, jsonData: Record<string, any[]>, idKey: string) => {
              if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
              const localDataStr = localStorage.getItem(localKey);
              const localData = localDataStr ? JSON.parse(localDataStr) : {};
              const mergedObj: Record<string, any[]> = { ...localData };
              
              Object.entries(jsonData).forEach(([dateKey, items]) => {
                  if (!Array.isArray(items)) return;
                  if (!mergedObj[dateKey]) {
                      mergedObj[dateKey] = items;
                  } else {
                      const mergedMap = new Map();
                      const getKey = (item: any) => typeof item === 'string' ? item : (item[idKey] || JSON.stringify(item));
                      mergedObj[dateKey].forEach(item => { if (item) mergedMap.set(getKey(item), item); });
                      items.forEach(item => { if (item) mergedMap.set(getKey(item), item); });
                      mergedObj[dateKey] = Array.from(mergedMap.values());
                  }
              });
              localStorage.setItem(localKey, JSON.stringify(mergedObj));
          };

          const mergeSimpleRecord = (localKey: string, jsonData: Record<string, string>) => {
              if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
              const localDataStr = localStorage.getItem(localKey);
              const localData = localDataStr ? JSON.parse(localDataStr) : {};
              localStorage.setItem(localKey, JSON.stringify({ ...localData, ...jsonData }));
          };

          // Restaurar Gestión
          if (json.fichas) {
              mergeData('rcm_data_fichas', json.fichas, 'name');
              restoredCount++;
          }
          if (json.catalogo) {
              mergeData('rcm_data_catalogo', json.catalogo, 'name');
              restoredCount++;
          }
          if (json.worklogs) {
              mergeData('rcm_data_worklogs', json.worklogs, 'id');
              restoredCount++;
          }
          if (json.consolidated) {
              mergeData('rcm_data_consolidated', json.consolidated, 'id');
              restoredCount++;
          }
          if (json.interruptions) {
              mergeData('rcm_interruptions', json.interruptions, 'id');
              restoredCount++;
          }
          if (json.consolidatedMonths) {
              mergeData('rcm_consolidated_months', json.consolidatedMonths, (item: any) => `${item.month}-${item.year}`);
              restoredCount++;
          }
          if (json.transmissionConfig) {
              localStorage.setItem('rcm_transmission_config', JSON.stringify(json.transmissionConfig));
              restoredCount++;
          }
          if (json.paymentConfigs) {
              Object.entries(json.paymentConfigs).forEach(([key, value]) => {
                  const localValStr = localStorage.getItem(key);
                  const localVal = localValStr ? JSON.parse(localValStr) : {};
                  localStorage.setItem(key, JSON.stringify({ ...localVal, ...(value as any) }));
              });
              restoredCount++;
          }

          // Restaurar Guiones y Secciones
          if (json.scripts) {
              Object.entries(json.scripts).forEach(([key, value]) => {
                  mergeData(key, value as any[], 'id');
              });
              restoredCount++;
          }
          if (json.programSections) {
              Object.entries(json.programSections).forEach(([key, value]) => {
                  mergeData(key, value as any[], 'name');
              });
              restoredCount++;
          }

          // Restaurar Agenda
          if (json.agendaPrograms) {
              localStorage.setItem('rcm_programs', JSON.stringify(json.agendaPrograms));
              restoredCount++;
          }
          if (json.agendaEfemerides) {
              mergeRecordData('rcm_efemerides', json.agendaEfemerides, 'id');
              restoredCount++;
          }
          if (json.agendaConmemoraciones) {
              mergeRecordData('rcm_conmemoraciones', json.agendaConmemoraciones, 'id');
              restoredCount++;
          }
          if (json.agendaDayThemes) {
              mergeSimpleRecord('rcm_day_themes', json.agendaDayThemes);
              restoredCount++;
          }
          if (json.agendaUsers) {
              mergeData('rcm_users', json.agendaUsers, 'id');
              restoredCount++;
          }
          if (json.agendaPropaganda) {
              mergeRecordData('rcm_propaganda', json.agendaPropaganda, 'id');
              restoredCount++;
          }

          // Fetch equipocmnl.json
          try {
              const equipoResponse = await fetch('https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json', { cache: "no-store" });
              if (equipoResponse.ok) {
                  const equipoData = await equipoResponse.json();
                  if (Array.isArray(equipoData)) {
                      localStorage.setItem('rcm_equipo_cmnl', JSON.stringify(equipoData));
                      localStorage.setItem('rcm_equipo_last_update', Date.now().toString());
                      restoredCount++;
                  }
              }
          } catch (equipoError) {
              console.error("Error fetching equipo data during sync:", equipoError);
          }

          if (restoredCount > 0) {
            alert('¡Sincronización exitosa! Los datos se han actualizado desde el repositorio oficial.');
            window.location.reload();
          } else {
            alert('El archivo descargado no tiene el formato esperado.');
          }

      } catch (error) {
          console.error("Error cargando desde GitHub:", error);
          alert('Error al conectar con GitHub. Verifique su conexión a internet.');
      } finally {
          setIsSyncing(false);
      }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadCoorBackup = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            try {
                data[key] = JSON.parse(localStorage.getItem(key) || 'null');
            } catch (e) {}
        }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coorbd.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-[#1A100C] text-[#E8DCCF] font-display overflow-hidden">
       {/* Header */}
      <CMNLHeader 
        user={null}
        sectionTitle="Ajustes & Gestión"
        onMenuClick={onMenuClick}
        onBack={onBack}
      >
        <div className="flex gap-2">
            <button 
                onClick={handleLoadFromGithub} 
                disabled={isSyncing}
                className="flex items-center gap-2 bg-[#2C1B15] hover:bg-[#3E1E16] text-[#9E7649] px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-[#9E7649]/30 disabled:opacity-50" 
                title="Actualizar datos desde GitHub"
            >
                {isSyncing ? <RefreshCw size={16} className="animate-spin"/> : <DownloadCloud size={16} />}
                <span className="hidden sm:inline">Actualizar</span>
            </button>
            {currentUser?.role === 'admin' ? (
              <button 
                  onClick={handleDownloadBackup} 
                  className="flex items-center gap-2 bg-[#9E7649] hover:bg-[#8B653D] text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm" 
                  title="Descargar actualcmnl.json"
              >
                  <Download size={16} /> 
                  <span className="hidden sm:inline">Respaldar Sistema</span>
              </button>
            ) : currentUser?.classification === 'Coordinador' ? (
              <button 
                  onClick={handleDownloadCoorBackup} 
                  className="flex items-center gap-2 bg-[#9E7649] hover:bg-[#8B653D] text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm" 
                  title="Descargar coorbd.json"
              >
                  <Download size={16} /> 
                  <span className="hidden sm:inline">Respaldar Coordinador</span>
              </button>
            ) : null}
        </div>
      </CMNLHeader>

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

      {/* Scrollable Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-40"> 
        
        {activeTab === 'users' && (
            <div className="flex flex-col md:flex-row-reverse h-full md:h-auto">
                {/* Form & Upload Section */}
                <div className="w-full md:w-1/3 bg-[#2C1B15] p-6 shrink-0 md:h-full md:overflow-y-auto border-b md:border-b-0 md:border-l border-[#9E7649]/10">
                    <div className="mb-10">
                        <h2 className="text-sm font-bold text-[#9E7649] uppercase tracking-wider mb-4">Crear Usuario</h2>
                        
                        <form onSubmit={addUser} className="flex flex-col gap-3">
                            <input name="name" placeholder="Nombre completo" value={newUser.name} onChange={handleNewUserChange} className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required />
                            <div className="flex gap-2">
                                <input name="username" placeholder="Usuario" value={newUser.username} onChange={handleNewUserChange} className="flex-1 bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required />
                                <input name="mobile" placeholder="Móvil" value={newUser.mobile} onChange={handleNewUserChange} className="flex-1 bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" />
                            </div>
                            
                            <select name="classification" value={newUser.classification} onChange={handleNewUserChange} className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-[#E8DCCF]">
                                <option value="Usuario">Usuario</option>
                                <option value="Director">Director</option>
                                <option value="Asesor">Asesor</option>
                                <option value="Realizador de sonido">Realizador</option>
                                <option value="Locutor">Locutor</option>
                                <option value="Administrador">Administrador</option>
                                <option value="Coordinador">Coordinador</option>
                            </select>

                            {newUser.classification === 'Coordinador' && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                                        <input type="checkbox" checked={newUser.permissions?.canEditNews} onChange={() => handleNewUserPermissionChange('canEditNews')} className="accent-[#9E7649]" />
                                        Editar Noticias
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                                        <input type="checkbox" checked={newUser.permissions?.canEditProgramming} onChange={() => handleNewUserPermissionChange('canEditProgramming')} className="accent-[#9E7649]" />
                                        Editar Programación
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                                        <input type="checkbox" checked={newUser.permissions?.canEditAbout} onChange={() => handleNewUserPermissionChange('canEditAbout')} className="accent-[#9E7649]" />
                                        Editar Quiénes Somos
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                                        <input type="checkbox" checked={newUser.permissions?.canEditCatalog} onChange={() => handleNewUserPermissionChange('canEditCatalog')} className="accent-[#9E7649]" />
                                        Catálogo
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                                        <input type="checkbox" checked={newUser.permissions?.canEditFichas} onChange={() => handleNewUserPermissionChange('canEditFichas')} className="accent-[#9E7649]" />
                                        Fichas técnicas
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                                        <input type="checkbox" checked={newUser.permissions?.canEditHours} onChange={() => handleNewUserPermissionChange('canEditHours')} className="accent-[#9E7649]" />
                                        Horas de transmisión
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                                        <input type="checkbox" checked={newUser.permissions?.canEditTeam} onChange={() => handleNewUserPermissionChange('canEditTeam')} className="accent-[#9E7649]" />
                                        Equipo
                                    </label>
                                </div>
                            )}

                            <input name="password" type="text" placeholder="Contraseña" value={newUser.password} onChange={handleNewUserChange} className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required />
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-[#9E7649] hover:bg-[#8B653D] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-2 transition-colors">
                                    <UserPlus size={18} /> Crear
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="border-t border-[#9E7649]/20 pt-6 pb-12">
                        <h2 className="text-sm font-bold text-[#9E7649] uppercase tracking-wider mb-2">Carga Masiva (TXT)</h2>
                        <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[#9E7649]/30 rounded-lg hover:bg-[#9E7649]/5 cursor-pointer transition-colors">
                            <div className="flex flex-col items-center gap-1">
                                <Upload size={24} className="text-[#9E7649]" />
                                <span className="text-xs font-medium text-[#E8DCCF]">Importar Lista Usuarios</span>
                            </div>
                            <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'users')} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* List Section */}
                <div className="flex-1 bg-[#1A100C] flex flex-col min-h-[50vh] md:h-full md:overflow-y-auto">
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
            </div>
        )}

        {/* Content Management Tab */}
        {activeTab === 'content' && (
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
               
               <div className="bg-black/20 p-4 rounded-lg mb-6 text-sm text-[#E8DCCF]/80 max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/5 font-mono leading-relaxed">
                  {historyContent || <span className="italic opacity-50">No hay contenido definido actualmente.</span>}
               </div>

               <label className="group flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-[#9E7649]/30 rounded-xl hover:bg-[#9E7649]/5 cursor-pointer transition-all hover:border-[#9E7649]">
                  <Upload size={20} className="text-[#9E7649] group-hover:scale-110 transition-transform" />
                  <span className="text-[#9E7649] font-bold text-sm">Cargar archivo .TXT (Historia)</span>
                  <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'history')} className="hidden" />
               </label>
            </div>

            {/* About Section */}
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

               <div className="bg-black/20 p-4 rounded-lg mb-6 text-sm text-[#E8DCCF]/80 max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/5 font-mono leading-relaxed">
                  {aboutContent || <span className="italic opacity-50">No hay contenido definido actualmente.</span>}
               </div>

               <label className="group flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-[#9E7649]/30 rounded-xl hover:bg-[#9E7649]/5 cursor-pointer transition-all hover:border-[#9E7649]">
                  <Upload size={20} className="text-[#9E7649] group-hover:scale-110 transition-transform" />
                  <span className="text-[#9E7649] font-bold text-sm">Cargar archivo .TXT (Quiénes Somos)</span>
                  <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'about')} className="hidden" />
               </label>
            </div>

            {/* News Section */}
            <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 shadow-lg">
               <div className="flex items-center gap-4 mb-4 border-b border-[#9E7649]/10 pb-4">
                  <div className="p-3 bg-[#9E7649]/20 rounded-xl text-[#9E7649]">
                    <Newspaper size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Gestión de Noticias</h3>
                    <p className="text-xs text-[#E8DCCF]/60">Carga masiva de noticias y boletines</p>
                  </div>
               </div>

               <div className="flex flex-col md:flex-row gap-6 mb-6">
                   <div className="flex-1 bg-[#1A100C] p-4 rounded-lg border border-white/5">
                      <p className="text-xs text-[#9E7649] font-bold mb-3 uppercase tracking-wide flex items-center gap-2">
                        <FileText size={14}/> Formato Requerido (.txt)
                      </p>
                      <code className="text-[10px] text-[#E8DCCF]/70 font-mono block whitespace-pre bg-black/30 p-3 rounded border border-white/5">
                        Titular: Título de la noticia{'\n'}
                        Autor: Nombre del periodista{'\n'}
                        Texto: Cuerpo de la noticia...{'\n'}
                        ___{'\n'}
                        (Separador de 3 guiones bajos)
                      </code>
                   </div>
                   
                   <div className="flex-1 flex flex-col justify-center items-center bg-[#1A100C] p-4 rounded-lg border border-white/5">
                      <span className="text-xs text-[#E8DCCF]/60 mb-1">Noticias en sistema</span>
                      <span className="text-4xl font-bold text-white mb-4">{news.length}</span>
                      <button 
                        onClick={() => {if(confirm('¿Está seguro de eliminar todas las noticias?')) setNews([])}} 
                        className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border border-red-900/30"
                      >
                        <Trash2 size={14}/> Eliminar todas
                      </button>
                   </div>
               </div>

               <label className="group flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-[#9E7649]/30 rounded-xl hover:bg-[#9E7649]/5 cursor-pointer transition-all hover:border-[#9E7649]">
                  <Upload size={20} className="text-[#9E7649] group-hover:scale-110 transition-transform" />
                  <span className="text-[#9E7649] font-bold text-sm">Importar archivo .TXT (Noticias)</span>
                  <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'news')} className="hidden" />
               </label>
            </div>

          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Edit2 size={20} className="text-[#9E7649]" />
              Editar Usuario
            </h2>
            
            <form onSubmit={saveEditedUser} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Nombre completo</label>
                <input name="name" placeholder="Nombre completo" value={editingUser.name} onChange={handleEditUserChange} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-white" required />
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Usuario</label>
                  <input name="username" placeholder="Usuario" value={editingUser.username} disabled className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm outline-none text-white opacity-50 cursor-not-allowed" required />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Móvil</label>
                  <input name="mobile" placeholder="Móvil" value={editingUser.mobile} onChange={handleEditUserChange} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-white" />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Clasificación</label>
                <select name="classification" value={editingUser.classification} onChange={handleEditUserChange} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-[#E8DCCF]">
                    <option value="Usuario">Usuario</option>
                    <option value="Director">Director</option>
                    <option value="Asesor">Asesor</option>
                    <option value="Realizador de sonido">Realizador</option>
                    <option value="Locutor">Locutor</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Coordinador">Coordinador</option>
                </select>
              </div>

              {editingUser.classification === 'Coordinador' && (
                  <div className="flex flex-col gap-2 mt-2">
                      <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                          <input type="checkbox" checked={editingUser.permissions?.canEditNews} onChange={() => handleEditUserPermissionChange('canEditNews')} className="accent-[#9E7649]" />
                          Editar Noticias
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                          <input type="checkbox" checked={editingUser.permissions?.canEditProgramming} onChange={() => handleEditUserPermissionChange('canEditProgramming')} className="accent-[#9E7649]" />
                          Editar Programación
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                          <input type="checkbox" checked={editingUser.permissions?.canEditAbout} onChange={() => handleEditUserPermissionChange('canEditAbout')} className="accent-[#9E7649]" />
                          Editar Quiénes Somos
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                          <input type="checkbox" checked={editingUser.permissions?.canEditCatalog} onChange={() => handleEditUserPermissionChange('canEditCatalog')} className="accent-[#9E7649]" />
                          Catálogo
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                          <input type="checkbox" checked={editingUser.permissions?.canEditFichas} onChange={() => handleEditUserPermissionChange('canEditFichas')} className="accent-[#9E7649]" />
                          Fichas técnicas
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                          <input type="checkbox" checked={editingUser.permissions?.canEditHours} onChange={() => handleEditUserPermissionChange('canEditHours')} className="accent-[#9E7649]" />
                          Horas de transmisión
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#E8DCCF]">
                          <input type="checkbox" checked={editingUser.permissions?.canEditTeam} onChange={() => handleEditUserPermissionChange('canEditTeam')} className="accent-[#9E7649]" />
                          Equipo
                      </label>
                  </div>
              )}

              <div>
                <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-1 block">Contraseña</label>
                <input name="password" type="text" placeholder="Contraseña" value={editingUser.password} onChange={handleEditUserChange} className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-white" required />
              </div>

              <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors">
                      Cancelar
                  </button>
                  <button type="submit" className="flex-1 bg-[#9E7649] hover:bg-[#8B653D] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">
                      <UserPlus size={18} /> Guardar
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
