import React, { useState } from 'react';
import { AppView } from '../types';
import { Radio, Headphones, Lock, User, Eye, EyeOff } from 'lucide-react';

interface Props {
  onNavigate: (view: AppView) => void;
}

const PublicLanding: React.FC<Props> = ({ onNavigate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'admin') {
      onNavigate(AppView.ADMIN_DASHBOARD);
    } else {
      onNavigate(AppView.WORKER_HOME);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#FDFCF8] bg-heritage-pattern font-display text-[#4A3B32]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#F5F0EB] to-transparent pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center justify-center pt-12 pb-6 px-6">
        {/* Logo Section */}
        <div className="w-28 h-28 mb-6 rounded-full bg-[#E8DCCF] flex items-center justify-center shadow-inner ring-8 ring-[#F5F0EB]">
           <div className="flex flex-col items-center justify-center text-[#8B5E3C]">
             <Radio size={40} strokeWidth={1.5} />
             <span className="text-[8px] font-bold mt-1 uppercase tracking-wider text-center leading-none">Radio Ciudad<br/>Monumento</span>
           </div>
        </div>

        <h2 className="text-xl font-serif font-bold italic text-[#5D3A24] tracking-tight mb-8">
          Voz de la segunda villa cubana
        </h2>

        {/* Listener Action */}
        <button 
          onClick={() => onNavigate(AppView.LISTENER_HOME)}
          className="w-full max-w-sm bg-[#5D3A24] text-[#FDFCF8] h-16 rounded-xl flex items-center justify-center gap-3 shadow-lg hover:bg-[#4A2E1C] hover:scale-[1.02] transition-all duration-300 group"
        >
          <Headphones className="group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-lg">Entrar como Oyente</span>
        </button>

        <p className="mt-4 text-xs text-[#8C7B70] font-medium">
          Acceso libre a la programación en vivo
        </p>

        {/* Divider */}
        <div className="w-full max-w-sm flex items-center gap-4 my-10 opacity-60">
          <div className="h-px bg-[#C69C6D] flex-1"></div>
          <span className="text-xs uppercase tracking-widest text-[#8C7B70] font-semibold">Personal Administrativo</span>
          <div className="h-px bg-[#C69C6D] flex-1"></div>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4 text-[#3E1E16]">
            <div className="p-1.5 bg-[#5D3A24] rounded-full text-white">
                <Lock size={14} />
            </div>
            <h3 className="font-bold text-lg">Acceso Usuario</h3>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B70]">
                <User size={20} />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario" 
                className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#E8DCCF] bg-white text-[#4A3B32] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none transition-all placeholder:text-[#8C7B70]/70"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B70]">
                <Lock size={20} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña" 
                className="w-full pl-12 pr-12 py-3.5 rounded-lg border border-[#E8DCCF] bg-white text-[#4A3B32] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none transition-all placeholder:text-[#8C7B70]/70"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7B70] hover:text-[#5D3A24]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-[#E8DCCF] text-[#8B5E3C] focus:ring-[#8B5E3C]" />
                <span className="text-sm text-[#5D3A24]">Recordarme</span>
              </label>
              <button type="button" className="text-sm font-bold text-[#5D3A24] hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button 
              type="submit"
              className="mt-4 w-full bg-white border-2 border-[#5D3A24] text-[#5D3A24] font-bold py-3.5 rounded-lg hover:bg-[#5D3A24] hover:text-white transition-all duration-300"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>

      <div className="mt-auto py-6 text-center">
         <p className="text-[10px] text-[#8C7B70]">v1.0.2 • © 2023 Radio Ciudad Monumento</p>
      </div>
    </div>
  );
};

export default PublicLanding;
