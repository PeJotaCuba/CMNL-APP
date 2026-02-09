import React, { useState } from 'react';
import { AppView, User } from '../types';
import { Radio, Lock, User as UserIcon, Eye, EyeOff, Smartphone, ArrowLeft } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView) => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
}

const PublicLanding: React.FC<Props> = ({ onNavigate, users, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [identity, setIdentity] = useState(''); // Can be username or mobile
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Find user by username OR mobile
    const user = users.find(u => 
        (u.username.toLowerCase() === identity.toLowerCase() || u.mobile === identity) && 
        u.password === password
    );

    if (user) {
      localStorage.setItem('rcm_user_session', user.role);
      onLoginSuccess(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#FDFCF8] bg-heritage-pattern font-display text-[#4A3B32]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#F5F0EB] to-transparent pointer-events-none"></div>

      {/* Back Button */}
      <button 
        onClick={() => onNavigate(AppView.LISTENER_HOME)}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 text-[#5D3A24] font-medium hover:opacity-70 transition-opacity"
      >
        <ArrowLeft size={20} />
        Volver a la Radio
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Logo Section */}
        <div className="w-24 h-24 mb-6 rounded-2xl bg-white flex items-center justify-center shadow-lg p-0 overflow-hidden ring-4 ring-[#F5F0EB]">
             <img src={LOGO_URL} alt="Radio Ciudad" className="w-full h-full object-cover" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-[#5D3A24] tracking-tight mb-2">
          Acceso Personal
        </h2>
        <p className="text-xs text-[#8C7B70] mb-8 text-center max-w-xs">
            Ingresa con tu usuario o número de móvil corporativo.
        </p>

        {/* Login Form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B70]">
                <UserIcon size={20} />
              </div>
              <input 
                type="text" 
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Usuario o Móvil" 
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

            {error && <p className="text-red-500 text-xs font-medium text-center">{error}</p>}

            <button 
              type="submit"
              className="mt-4 w-full bg-[#5D3A24] text-white font-bold py-3.5 rounded-lg hover:bg-[#4A2E1C] hover:scale-[1.02] shadow-lg transition-all duration-300"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center">
         <p className="text-[10px] text-[#8C7B70]">Sistema de Gestión Interna CMNL</p>
      </div>
    </div>
  );
};

export default PublicLanding;