import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Program, UserProfile, UserRole } from '../types';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";

interface AdminConfigProps {
  user: UserProfile;
  programs: Program[];
  onAddProgram: (p: Program) => void;
  onUpdateProgram: (p: Program) => void;
  onDeleteProgram: (id: string) => void;
  users: UserProfile[];
  onAddUser: (u: UserProfile) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (u: UserProfile) => void;
  onExportAgenda: () => void;
  onExportUsers: () => void;
  onSync: () => Promise<boolean>;
  onAdminLogin: (targetUser: UserProfile, currentAdmin: UserProfile) => void;
}

const AdminConfig: React.FC<AdminConfigProps> = ({ 
  user, programs, onAddProgram, onUpdateProgram, onDeleteProgram, users, onAddUser, onDeleteUser, onUpdateUser, onExportAgenda, onExportUsers, onSync, onAdminLogin
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'save' | 'programs' | 'users'>('save');
  const userTxtInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Program States
  const [showAddProg, setShowAddProg] = useState(false);
  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [progData, setProgData] = useState({ name: '', time: '', days: [] as string[] });
  
  // User States
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: '', username: '', phone: '', password: '', confirmPassword: '', role: UserRole.ESCRITOR as UserRole
  });

  // --- LOGICA DE CONTRASEÑAS AUTOMÁTICAS ---
  const generateAutoPassword = (offset = 0) => {
    // Calculamos el número secuencial: Total usuarios actuales + 1 (el nuevo) + offset (si estamos agregando varios en bucle)
    const nextNum = users.length + 1 + offset;
    const numStr = nextNum.toString().padStart(2, '0');
    const yearStr = new Date().getFullYear().toString().slice(-2);
    // Fórmula: RadioCiudad + número + año
    return `RadioCiudad${numStr}${yearStr}`;
  };

  const handleSyncClick = async () => {
      if(isSyncing) return;
      if(!confirm("¿Estás seguro de sobrescribir los datos locales con la versión de GitHub?")) return;
      
      setIsSyncing(true);
      const success = await onSync();
      setIsSyncing(false);
      
      if(success) {
          alert("✅ Sincronización finalizada.");
      } else {
          alert("❌ Error en la sincronización.");
      }
  };

  const handleImpersonate = (targetUser: UserProfile) => {
    if (confirm(`¿Iniciar sesión como ${targetUser.name}?`)) {
      onAdminLogin(targetUser, user);
      navigate('/home');
    }
  };

  const handleSendCredentials = (u: UserProfile) => {
    const message = `Saludos. Tus credenciales APP-RCM son
Usuario: ${u.username}
Contraseña: ${u.pin || ''}
Disfruta de nuestras apps en los siguientes enlaces:

Agenda https://rcmagenda.vercel.app/#/home

Música https://rcm-musica.vercel.app/`;

    const cleanPhone = u.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- EXPORTAR USUARIOS A DOCX ---
  const handleDownloadUsersDocx = async () => {
    const docChildren: any[] = [];

    docChildren.push(new Paragraph({
        children: [new TextRun({ text: "LISTADO DE USUARIOS - RCM AGENDA", bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
    }));

    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: "NOMBRE", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "USUARIO", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "CONTRASEÑA", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "ROL", bold: true })] }),
        ]
    });

    const rows = users.map(u => new TableRow({
        children: [
            new TableCell({ children: [new Paragraph(u.name)] }),
            new TableCell({ children: [new Paragraph(u.username)] }),
            new TableCell({ children: [new Paragraph(u.pin || "N/A")] }),
            new TableCell({ children: [new Paragraph(u.role === UserRole.ESCRITOR ? 'USUARIO' : u.role)] }),
        ]
    }));

    rows.unshift(headerRow);

    docChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        }
    }));

    const doc = new Document({ sections: [{ children: docChildren }] });
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Usuarios_RCM.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- IMPORTAR USUARIOS DESDE TXT ---
  const handleBulkUserUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      
      let addedCount = 0;
      // Usamos una lista temporal para verificar duplicados durante el proceso de carga
      const tempExistingUsernames = users.map(u => u.username.toLowerCase());
      
      const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      let currentName = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Detección de Nombre
        if (lowerLine.startsWith("nombre:")) {
            currentName = line.substring(7).trim(); // Quitar "Nombre:"
        } 
        // Detección de Móvil (solo si ya tenemos un nombre capturado)
        else if ((lowerLine.startsWith("móvil:") || lowerLine.startsWith("movil:")) && currentName) {
            const phone = line.substring(6).trim(); // Quitar "Móvil:"
            
            // Generar Usuario
            const nameParts = currentName.split(/\s+/);
            const rawFirstName = nameParts[0];
            const rawLastName = nameParts.length > 1 ? nameParts[1] : '';
            
            const cleanFirstName = normalize(rawFirstName);
            const cleanLastName = normalize(rawLastName);
            
            let username = cleanFirstName;
            
            // Si el nombre existe, agregamos apellido (también normalizado)
            if (tempExistingUsernames.includes(username)) {
                username = cleanFirstName + cleanLastName;
            }
            
            // Registrar usuario temporalmente para evitar duplicados en el mismo archivo
            tempExistingUsernames.push(username);

            // Generar Contraseña Secuencial (RadioCiudad + N + AA)
            const password = generateAutoPassword(addedCount);

            // Generación de ID más robusta para bucles rápidos
            const uniqueId = Date.now().toString() + "-" + Math.random().toString().slice(2, 8) + "-" + addedCount;

            const newUserObj: UserProfile = {
                id: uniqueId,
                name: currentName,
                username: username,
                phone: phone,
                pin: password,
                role: UserRole.ESCRITOR,
                photo: '' // Sin foto
            };

            onAddUser(newUserObj);
            addedCount++;
            currentName = ""; // Resetear para el siguiente
        }
      }

      alert(`✅ Se han procesado ${addedCount} usuarios nuevos.`);
      if (userTxtInputRef.current) userTxtInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const prepareEditProg = (p: Program) => {
    setProgData({ name: p.name, time: p.time, days: p.days });
    setEditingProgId(p.id);
    setShowAddProg(true);
  };

  const resetProgForm = () => {
    setProgData({ name: '', time: '', days: [] });
    setEditingProgId(null);
    setShowAddProg(false);
  };

  const handleSubmitProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const pData = { name: progData.name, time: progData.time, days: progData.days };
    if (editingProgId) {
       const existing = programs.find(p => p.id === editingProgId);
       if (existing) onUpdateProgram({ ...existing, ...pData });
    } else {
       onAddProgram({ id: Date.now().toString(), ...pData, active: true, dailyData: {} });
    }
    resetProgForm();
  };

  // --- EDITAR USUARIO ---
  const prepareEditUser = (u: UserProfile) => {
    setNewUser({
      name: u.name, 
      username: u.username, 
      phone: u.phone, 
      password: u.pin || '', 
      confirmPassword: u.pin || '', 
      role: u.role
    });
    setEditingUserId(u.id);
    setShowAddUser(true);
  };

  const resetUserForm = () => {
    // Al resetear (crear nuevo), generamos la contraseña automáticamente
    const autoPass = generateAutoPassword();
    setNewUser({ 
        name: '', 
        username: '', 
        phone: '', 
        password: autoPass, 
        confirmPassword: autoPass, 
        role: UserRole.ESCRITOR 
    });
    setEditingUserId(null);
    setShowAddUser(false);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.password !== newUser.confirmPassword) {
      alert("❌ Las contraseñas no coinciden.");
      return;
    }
    
    // Verificar duplicados solo si cambiamos el username
    const isDuplicate = users.some(u => u.username === newUser.username && u.id !== editingUserId);
    if (isDuplicate) {
        alert("❌ El nombre de usuario ya existe.");
        return;
    }

    const userData = {
        name: newUser.name, 
        username: newUser.username, 
        phone: newUser.phone, 
        pin: newUser.password, 
        role: newUser.role, 
        photo: '' // Asegurar que no hay foto
    };

    if (editingUserId) {
        const existing = users.find(u => u.id === editingUserId);
        if (existing) {
            onUpdateUser({ ...existing, ...userData });
            alert("Usuario actualizado correctamente.");
        }
    } else {
        onAddUser({ id: Date.now().toString(), ...userData });
        alert("Usuario creado correctamente.");
    }
    resetUserForm();
  };

  return (
    <div className="h-full flex flex-col bg-background-dark">
      <div className="flex-none bg-card-dark border-b border-white/5 z-20 shadow-xl">
        <header className="p-4 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-white">home</span>
          </button>
          <h2 className="text-lg font-bold">Configuración</h2>
          <div className="size-10"></div>
        </header>

        <div className="flex overflow-x-auto no-scrollbar p-2 gap-2">
          {[
            {id: 'save', label: 'Datos', icon: 'cloud_sync'},
            {id: 'users', label: 'Equipo', icon: 'group'},
            {id: 'programs', label: 'Parrilla', icon: 'radio'},
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-32">
        
        {/* PESTAÑA DATOS (Exportar/Sincronizar) */}
        {activeTab === 'save' && (
          <section className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-card-dark border border-white/5 p-8 rounded-[2.5rem] text-center space-y-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-primary/20"></div>
               
               <h3 className="text-xl font-bold text-white">Gestión de Agenda</h3>
               
               {/* Sección Exportar Agenda */}
               <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3 text-text-secondary">
                      <span className="material-symbols-outlined text-xl">download</span>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-left">Respaldo de Contenido</p>
                  </div>
                  <button onClick={onExportAgenda} className="w-full bg-white/5 hover:bg-white/10 text-white py-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/10">
                      Descargar "agenda.json"
                  </button>
                  <p className="text-[10px] text-text-secondary/50 text-left px-2 leading-relaxed">
                    Guarda la programación, efemérides y temáticas actuales.
                  </p>
               </div>

               <div className="h-px bg-white/5 w-full"></div>

               {/* Sección Sincronizar */}
               <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                      <span className="material-symbols-outlined text-xl">cloud_download</span>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-left">Nube (GitHub)</p>
                  </div>
                  <button onClick={handleSyncClick} disabled={isSyncing} className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
                      <span className={`material-symbols-outlined text-xl ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar Todo'}
                  </button>
                  <p className="text-[10px] text-text-secondary/50 text-left px-2 leading-relaxed">
                    Descarga la última versión de los datos (agenda y usuarios) desde el repositorio.
                  </p>
               </div>
            </div>
          </section>
        )}

        {/* PESTAÑA USUARIOS */}
        {activeTab === 'users' && (
          <section className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 mb-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white uppercase text-xs tracking-widest pl-2">Gestión de Personal</h3>
                  <button onClick={() => { resetUserForm(); setShowAddUser(!showAddUser); }} className="bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest transition-colors">
                      {showAddUser ? 'Cerrar' : '+ Añadir'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleDownloadUsersDocx} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-white/10">
                        <span className="material-symbols-outlined text-sm">description</span>
                        <span className="text-[8px] uppercase font-bold">Listado DOCX</span>
                    </button>
                    <button onClick={onExportUsers} className="bg-primary/10 border border-primary/20 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-primary/20 text-primary">
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span className="text-[8px] uppercase font-bold">agusuario.json</span>
                    </button>
                </div>
                
                <div className="w-full">
                    <input type="file" accept=".txt" ref={userTxtInputRef} className="hidden" onChange={handleBulkUserUpload} />
                    <button onClick={() => userTxtInputRef.current?.click()} className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10">
                        <span className="material-symbols-outlined text-sm">upload_file</span>
                        <span className="text-[9px] uppercase font-bold">Importar desde TXT</span>
                    </button>
                </div>
            </div>
            
            {showAddUser && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="w-full max-w-sm bg-card-dark p-6 rounded-[2.5rem] border border-primary/30 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
                  <form onSubmit={handleSubmitUser} className="space-y-5">
                    <h4 className="text-center text-primary font-bold uppercase text-xs tracking-widest">
                        {editingUserId ? 'Editando Perfil' : 'Nuevo Registro'}
                    </h4>
                    
                    <div className="space-y-3">
                      <input type="text" value={newUser.name} required onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-background-dark border-none rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-primary" placeholder="Nombre Completo" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={newUser.username} required onChange={e => setNewUser({...newUser, username: e.target.value})} className="bg-background-dark border-none rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-primary" placeholder="Usuario" />
                        <input type="tel" value={newUser.phone} required onChange={e => setNewUser({...newUser, phone: e.target.value})} className="bg-background-dark border-none rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-primary" placeholder="Teléfono" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 relative">
                        <div className="relative">
                            <input type="text" value={newUser.password} required onChange={e => setNewUser({...newUser, password: e.target.value, confirmPassword: e.target.value})} className="w-full bg-background-dark border-none rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-primary" placeholder="PIN (4 dígitos)" />
                            <span className="absolute -top-3 left-1 text-[8px] text-primary font-bold bg-card-dark px-1">
                                {editingUserId ? 'Modificar' : 'Auto-Gen'}
                            </span>
                        </div>
                        <div className="flex items-center justify-center bg-white/5 rounded-xl">
                            <span className="text-[8px] text-white/50 uppercase font-bold text-center leading-tight">
                                4 Dígitos
                            </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {[UserRole.ESCRITOR, UserRole.ADMIN].map(role => (
                          <button key={role} type="button" onClick={() => setNewUser({...newUser, role})} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase border ${newUser.role === role ? 'bg-primary border-primary text-white' : 'border-white/10 text-text-secondary'}`}>
                            {role === UserRole.ESCRITOR ? 'USUARIO' : role}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 bg-white/5 text-text-secondary py-3 rounded-xl font-bold text-[10px] uppercase shadow-lg hover:bg-white/10">Cancelar</button>
                        <button type="submit" className="flex-1 bg-white text-background-dark py-3 rounded-xl font-bold text-[10px] uppercase shadow-lg hover:bg-gray-200">
                            {editingUserId ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-card-dark p-4 rounded-[1.5rem] border border-white/5 flex items-center gap-4 hover:border-white/10 transition-colors group">
                  <div className="size-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                    <span className="material-symbols-outlined text-text-secondary text-lg">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{u.name}</p>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">{u.role === UserRole.ESCRITOR ? 'USUARIO' : u.role}</p>
                  </div>
                  <div className="flex gap-2">
                     {/* Botón para entrar como este usuario */}
                     {u.id !== user.id && (
                        <button 
                            onClick={() => handleImpersonate(u)} 
                            className="size-8 bg-primary/20 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white text-primary transition-all"
                            title="Iniciar sesión como este usuario"
                        >
                            <span className="material-symbols-outlined text-sm">login</span>
                        </button>
                     )}

                     {/* Botón enviar credenciales por WhatsApp */}
                     <button
                        onClick={() => handleSendCredentials(u)}
                        className="size-8 bg-green-500/10 rounded-lg flex items-center justify-center hover:bg-green-500 hover:text-white text-green-500 transition-colors"
                        title="Enviar credenciales por WhatsApp"
                     >
                        <span className="material-symbols-outlined text-sm">chat</span>
                     </button>
                     
                     <button 
                        onClick={() => prepareEditUser(u)} 
                        className="size-8 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                        title="Editar Usuario"
                     >
                        <span className="material-symbols-outlined text-sm">edit</span>
                     </button>
                     
                     {u.id !== 'admin-root' && u.id !== user.id && (
                        <button onClick={() => confirm(`¿Eliminar a ${u.name}?`) && onDeleteUser(u.id)} className="size-8 bg-admin-red/10 rounded-lg flex items-center justify-center hover:bg-admin-red/20"><span className="material-symbols-outlined text-sm text-admin-red">delete</span></button>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PESTAÑA PROGRAMAS */}
        {activeTab === 'programs' && (
          <section className="space-y-4 animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-white uppercase text-xs tracking-widest pl-2">Parrilla</h3>
              <button onClick={() => { resetProgForm(); setShowAddProg(!showAddProg); }} className="bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest transition-colors">
                  {showAddProg ? 'Cerrar' : '+ Añadir'}
              </button>
            </div>

            {showAddProg && (
              <form onSubmit={handleSubmitProgram} className="bg-card-dark p-6 rounded-[2rem] border border-primary/30 space-y-4 shadow-2xl">
                <h4 className="text-center text-primary font-bold uppercase text-xs tracking-widest mb-4">{editingProgId ? 'Editar' : 'Nuevo'}</h4>
                <input type="text" value={progData.name} required onChange={e => setProgData({...progData, name: e.target.value})} className="w-full bg-background-dark border-none rounded-xl p-3 text-white text-sm" placeholder="Nombre" />
                <input type="time" value={progData.time} required onChange={e => setProgData({...progData, time: e.target.value})} className="w-full bg-background-dark border-none rounded-xl p-3 text-white text-sm" />
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                    <button type="button" key={d} onClick={() => setProgData(prev => ({...prev, days: prev.days.includes(d) ? prev.days.filter(x => x !== d) : [...prev.days, d]}))} className={`px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase border transition-all ${progData.days.includes(d) ? 'bg-primary border-primary text-white' : 'border-white/10 text-text-secondary'}`}>{d.substring(0,3)}</button>
                  ))}
                </div>
                <button type="submit" className="w-full bg-white text-background-dark py-3 rounded-xl font-bold text-[10px] uppercase shadow-lg mt-2 hover:bg-gray-200">Guardar</button>
              </form>
            )}

            <div className="space-y-3">
              {programs.map(p => (
                <div key={p.id} className="bg-card-dark p-4 rounded-[1.5rem] border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[9px] font-bold">{p.time}</span>
                        <span className="text-[9px] text-text-secondary font-bold uppercase truncate">{p.days.map(d => d.substring(0,3)).join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-2">
                    <button onClick={() => prepareEditProg(p)} className="size-8 flex items-center justify-center bg-white/5 text-white rounded-lg hover:bg-white/10"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => confirm(`¿Eliminar ${p.name}?`) && onDeleteProgram(p.id)} className="size-8 flex items-center justify-center text-admin-red bg-admin-red/10 rounded-lg hover:bg-admin-red/20"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminConfig;
