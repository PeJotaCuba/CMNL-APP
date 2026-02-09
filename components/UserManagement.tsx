import React, { useState } from 'react';
import { ArrowLeft, Save, Upload, Trash2, UserPlus, Search } from 'lucide-react';
import { User } from '../types';
import { INITIAL_USERS } from '../utils/scheduleData';

interface Props {
  onBack: () => void;
}

const UserManagement: React.FC<Props> = ({ onBack }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [newUser, setNewUser] = useState<User>({ name: '', username: '', mobile: '', password: '', role: 'worker' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.username && newUser.password) {
      setUsers([...users, newUser]);
      setNewUser({ name: '', username: '', mobile: '', password: '', role: 'worker' });
    }
  };

  const removeUser = (username: string) => {
    setUsers(users.filter(u => u.username !== username));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseAndAddUsers(text);
      };
      reader.readAsText(file);
    }
  };

  const parseAndAddUsers = (text: string) => {
    // Regex based on the provided format:
    // Nombre completo: X, Nombre de usuario: Y, Número de móvil: Z, Contraseña: W
    const regex = /Nombre completo:\s*(.*?),\s*Nombre de usuario:\s*(.*?),\s*Número de móvil:\s*(.*?),\s*Contraseña:\s*(.*?)(?:\n|$)/g;
    let match;
    const newUsers: User[] = [];

    while ((match = regex.exec(text)) !== null) {
      newUsers.push({
        name: match[1].trim(),
        username: match[2].trim(),
        mobile: match[3].trim(),
        password: match[4].trim(),
        role: 'worker'
      });
    }

    if (newUsers.length > 0) {
      setUsers(prev => [...prev, ...newUsers]);
      alert(`Se han importado ${newUsers.length} usuarios correctamente.`);
    } else {
        // Fallback for simple line structure if needed, or alert error
        alert("No se encontraron usuarios con el formato esperado.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-[#1A100C] text-[#E8DCCF] font-display">
       {/* Header */}
      <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-[#F5EFE6]" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">Gestión de Usuarios</h1>
          <p className="text-[10px] text-[#9E7649]">Administración de cuentas y accesos</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Create / Import */}
        <div className="w-full md:w-1/3 bg-[#2C1B15] p-6 overflow-y-auto border-r border-[#9E7649]/10">
            <h2 className="text-sm font-bold text-[#9E7649] uppercase tracking-wider mb-4">Crear Usuario</h2>
            
            <form onSubmit={addUser} className="flex flex-col gap-3 mb-8">
                <input 
                    name="name" placeholder="Nombre completo" value={newUser.name} onChange={handleInputChange}
                    className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required
                />
                <input 
                    name="username" placeholder="Nombre de usuario" value={newUser.username} onChange={handleInputChange}
                    className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required
                />
                <input 
                    name="mobile" placeholder="Número de móvil" value={newUser.mobile} onChange={handleInputChange}
                    className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none"
                />
                <input 
                    name="password" type="text" placeholder="Contraseña" value={newUser.password} onChange={handleInputChange}
                    className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none" required
                />
                <button type="submit" className="bg-[#9E7649] hover:bg-[#8B653D] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 mt-2 transition-colors">
                    <UserPlus size={18} /> Crear Usuario
                </button>
            </form>

            <div className="border-t border-[#9E7649]/20 pt-6">
                <h2 className="text-sm font-bold text-[#9E7649] uppercase tracking-wider mb-2">Carga Masiva (TXT)</h2>
                <p className="text-[10px] text-[#E8DCCF]/60 mb-3 leading-relaxed">
                    Sube un archivo .txt con el formato:<br/>
                    <code>Nombre completo: X, Nombre de usuario: Y...</code>
                </p>
                <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[#9E7649]/30 rounded-lg hover:bg-[#9E7649]/5 cursor-pointer transition-colors">
                    <div className="flex flex-col items-center gap-1">
                        <Upload size={24} className="text-[#9E7649]" />
                        <span className="text-xs font-medium text-[#E8DCCF]">Seleccionar archivo</span>
                    </div>
                    <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>
        </div>

        {/* Right: List */}
        <div className="flex-1 bg-[#1A100C] flex flex-col overflow-hidden">
             <div className="p-4 border-b border-[#9E7649]/10 bg-[#1A100C]">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E7649]" />
                    <input 
                        type="text" 
                        placeholder="Buscar usuarios..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#2C1B15] pl-10 pr-4 py-2 rounded-lg text-sm border border-[#9E7649]/10 focus:border-[#9E7649]/50 outline-none placeholder:text-[#E8DCCF]/30"
                    />
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 grid gap-3">
                {filteredUsers.map((user, idx) => (
                    <div key={idx} className="bg-[#2C1B15] p-3 rounded-xl border border-[#9E7649]/10 flex items-center justify-between group hover:border-[#9E7649]/30 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1A100C] flex items-center justify-center text-[#9E7649] font-bold text-xs border border-[#9E7649]/20">
                                {user.username.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">{user.name}</h3>
                                <p className="text-[10px] text-[#9E7649] mt-0.5">@{user.username} • {user.mobile || 'Sin móvil'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="text-[10px] bg-black/20 px-2 py-1 rounded text-[#E8DCCF]/50 font-mono hidden sm:block">
                                {user.password}
                             </div>
                             {user.username !== 'admin' && (
                                <button onClick={() => removeUser(user.username)} className="p-2 text-[#E8DCCF]/40 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                             )}
                        </div>
                    </div>
                ))}
             </div>
             <div className="p-2 text-center text-[10px] text-[#E8DCCF]/30 bg-[#1A100C] border-t border-[#9E7649]/10">
                Mostrando {filteredUsers.length} usuarios
             </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
