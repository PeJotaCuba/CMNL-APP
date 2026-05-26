import React, { useState } from 'react';
import { AppView, User } from '../types';
import { Radio, Lock, User as UserIcon, Eye, EyeOff, Smartphone, ArrowLeft } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';
import { DeviceIdentityService } from '../src/services/DeviceIdentityService';

interface Props {
  onNavigate: (view: AppView) => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
}

const PublicLanding: React.FC<Props> = ({ onNavigate, users, onLoginSuccess }) => {
  const [identity, setIdentity] = useState('');
  const [credential, setCredential] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  React.useEffect(() => {
    const initDeviceIdentity = async () => {
      try {
        const sig = await DeviceIdentityService.getDeviceSignature();
        setDeviceToken(sig.deviceToken);
        setIsMobileDevice(sig.platform === 'iOS' || sig.platform === 'Android');
      } catch (err) {
        console.error('Failed to init device identity, using sync fallback:', err);
        const fbToken = DeviceIdentityService.getDeviceTokenSync();
        setDeviceToken(fbToken);
        setIsMobileDevice(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
      }
    };
    initDeviceIdentity();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedIdentity = identity.trim();
    const trimmedCredential = credential.trim();

    if (!trimmedIdentity || !trimmedCredential) {
      setError('Ambos campos son obligatorios');
      return;
    }

    let user: User | undefined;

    if (trimmedIdentity === 'admincmnl' && (trimmedCredential === 'RCBay010206' || trimmedCredential === '010206')) {
      const storedAdminUser = users.find(u => u.id === 'admin' || u.username === 'admincmnl');
      const savedEquipo = localStorage.getItem('rcm_equipo_cmnl');
      let designatedUserId = 'pedro';
      if (savedEquipo) {
        try {
          const parsed = JSON.parse(savedEquipo);
          if (Array.isArray(parsed)) {
            const adminMember = parsed.find((m: any) => m.id === 'admin_app_static');
            if (adminMember && adminMember.designatedUserId) {
              designatedUserId = adminMember.designatedUserId;
            }
          }
        } catch (e) {
          console.error("Error reading team details during admin login:", e);
        }
      }
      const linkedUser = users.find(u => u.id === designatedUserId);

      user = {
        id: 'admin_app_static',
        username: 'admincmnl',
        name: 'Administrador Global',
        mobile: '',
        password: 'RCBay010206',
        role: 'admin',
        classification: 'Administrador',
        deviceLimitEnabled: storedAdminUser ? storedAdminUser.deviceLimitEnabled : false,
        authorizedDevices: linkedUser ? linkedUser.authorizedDevices : []
      };
    } else {
      user = users.find(u => {
        const matchIdentity = 
          u.username.toLowerCase() === trimmedIdentity.toLowerCase() || 
          (u.mobile && u.mobile.trim() === trimmedIdentity);
        
        const matchPassword = u.password === trimmedCredential;
        
        // PIN Extraction: last 4 digits of password
        const digitsAtEnd = u.password ? (u.password.match(/\d+$/)?.[0] || "") : "";
        const expectedPin = digitsAtEnd.slice(-4);
        const matchPin = trimmedCredential === expectedPin;

        return matchIdentity && (matchPassword || matchPin);
      });
    }

    if (user) {
      // Check if device limits are enabled for this user
      if (user.deviceLimitEnabled) {
        const clientToken = deviceToken || localStorage.getItem('rcm_device_token') || 'DVC-STDC';
        const isAuthorized = user.authorizedDevices?.some(
          d => d.token.trim().toUpperCase() === clientToken.trim().toUpperCase()
        );
        
        if (!isAuthorized) {
          setError(`Dispositivo no autorizado (${clientToken}). Solicita el registro de este dispositivo a tu Administrador.`);
          return;
        }
      }

      localStorage.setItem('rcm_user_session', user.role);
      localStorage.setItem('rcm_user_username', user.username);
      onLoginSuccess(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#FDFCF8] bg-heritage-pattern font-display text-[#4A3B32]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#F5F0EB] to-transparent pointer-events-none"></div>

      <button 
        onClick={() => onNavigate(AppView.LISTENER_HOME)}
        className="absolute z-20 flex items-center gap-2 text-[#5D3A24] font-medium hover:opacity-70 transition-opacity"
        style={{ top: 'calc(1rem + var(--sat))', left: '1rem' }}
      >
        <ArrowLeft size={20} />
        Volver a la Radio
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo Section */}
        <div className="w-24 h-24 mb-6 rounded-2xl bg-white flex items-center justify-center shadow-lg p-0 overflow-hidden ring-4 ring-[#F5F0EB]">
             <img src={LOGO_URL} alt="Radio Ciudad" className="w-full h-full object-cover" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-[#5D3A24] tracking-tight mb-2">
          Acceso Personal
        </h2>
        <p className="text-xs text-[#8C7B70] mb-8 text-center max-w-xs">
            Ingresa tus credenciales para acceder al sistema.
        </p>

        {/* Login Form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B70]">
                <UserIcon size={18} />
              </div>
              <input 
                type="text" 
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Usuario o Móvil" 
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#E8DCCF] bg-white text-[#4A3B32] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none transition-all placeholder:text-[#8C7B70]/70 text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B70]">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="Contraseña o PIN" 
                className="w-full pl-11 pr-11 py-3 rounded-lg border border-[#E8DCCF] bg-white text-[#4A3B32] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none transition-all placeholder:text-[#8C7B70]/70 text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7B70] hover:text-[#5D3A24]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold text-center mt-1 uppercase tracking-wider">{error}</p>}

            <button 
              type="submit"
              className="mt-4 w-full bg-[#5D3A24] text-white font-bold py-3.5 rounded-lg hover:bg-[#4A2E1C] hover:scale-[1.02] shadow-lg transition-all duration-300 uppercase tracking-widest text-xs"
            >
              Iniciar Sesión
            </button>
          </form>

          {/* Device identity info for authorized devices */}
          <div className="mt-5 p-3.5 bg-white border border-[#E8DCCF]/50 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Smartphone className="text-[#8B5E3C] animate-pulse" size={18} />
              <div className="text-left">
                <p className="text-[9px] text-[#8C7B70] uppercase font-bold tracking-wider">ID de este Dispositivo</p>
                <p className="text-xs font-mono font-bold text-[#5D3A24]">{deviceToken || 'Generando...'}</p>
              </div>
            </div>
            <span className="text-[9px] px-2.5 py-1 bg-[#F5F0EB] text-[#5D3A24] rounded-full font-bold uppercase tracking-wider">
              {isMobileDevice ? 'Móvil' : 'PC / Laptop'}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center">
         <p className="text-[10px] text-[#8C7B70]">Sistema de Gestión Interna CMNL</p>
      </div>
    </div>
  );
};

export default PublicLanding;