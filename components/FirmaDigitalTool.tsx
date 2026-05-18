import React, { useState, useEffect } from 'react';
import { Shield, Key, FileUp, FileCheck, Download, AlertTriangle, CheckCircle2, Lock, FileText, FileDown } from 'lucide-react';

// --- UTILIDADES CRIPTOGRÁFICAS ---

const cryptoUtils = {
  // Generar par de claves ECDSA
  async generateKeyPair() {
    return await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true, // extractable
      ["sign", "verify"]
    );
  },

  // Exportar clave para envío
  async exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  },

  // Importar clave privada guardada
  async exportPrivateKey(key) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }
};

export const FirmaDigitalTool = ({ user, isAdmin, onUpdateDatabase }) => {
  const [view, setView] = useState('main'); // main, request, load, admin_process
  const [loading, setLoading] = useState(false);
  const [certStatus, setCertStatus] = useState(null); // 'none', 'pending', 'active'
  
  // Estados de Formulario Usuario
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    ci: '',
    tomo: '',
    folio: ''
  });

  // Estados de Admin
  const [pendingRequest, setPendingRequest] = useState(null);

  useEffect(() => {
    // Verificar si ya existe una clave privada local
    const localKey = localStorage.getItem(`cmnl_sk_${user?.id}`);
    const cert = localStorage.getItem(`cmnl_cert_${user?.id}`);
    
    if (cert) setCertStatus('active');
    else if (localKey) setCertStatus('pending');
    else setCertStatus('none');
  }, [user]);

  // --- LÓGICA DE USUARIO ---

  const handleGenerateRequest = async () => {
    setLoading(true);
    try {
      const keys = await cryptoUtils.generateKeyPair();
      const pubBase64 = await cryptoUtils.exportPublicKey(keys.publicKey);
      const privBase64 = await cryptoUtils.exportPrivateKey(keys.privateKey);

      // Guardar privada localmente
      localStorage.setItem(`cmnl_sk_${user?.id}`, privBase64);

      const requestObj = {
        type: 'CERT_REQUEST',
        userId: user?.id,
        userData: formData,
        publicKey: pubBase64,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peticion_firma_${user?.name.replace(/\s+/g, '_')}.cmnl`;
      a.click();
      
      setCertStatus('pending');
      alert("Petición generada. Envíe este archivo al administrador.");
    } catch (err) {
      console.error(err);
      alert("Error al generar las claves.");
    }
    setLoading(false);
  };

  const handleLoadCertificate = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const certData = JSON.parse(result);
        if (certData.userId !== user?.id) {
          throw new Error("Este certificado no pertenece a este usuario.");
        }
        
        localStorage.setItem(`cmnl_cert_${user?.id}`, JSON.stringify(certData));
        // Generar contraseña de firma inicial
        const initialPass = Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem(`cmnl_pass_${user?.id}`, initialPass);
        
        setCertStatus('active');
        alert(`Certificado cargado con éxito. Su clave de firma inicial es: ${initialPass}`);
      } catch (err) {
        alert("Archivo inválido: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // --- LÓGICA DE ADMINISTRADOR ---

  const handleProcessRequest = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const req = JSON.parse(result);
        setPendingRequest(req);
        setView('admin_process');
      } catch (err) {
        alert("Petición corrupta");
      }
    };
    reader.readAsText(file);
  };

  const generateFinalCertificate = () => {
    const finalCert = {
      ...pendingRequest,
      issueDate: new Date().toISOString(),
      issuer: "Administrador CMNL",
      validUntil: new Date(Date.now() + 31536000000).toISOString(), // 1 año
    };

    // Actualizar actualcmnl.json mediante el prop onUpdateDatabase
    if (onUpdateDatabase) {
      onUpdateDatabase(finalCert);
    }

    const blob = new Blob([JSON.stringify(finalCert)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CERT_${finalCert.userData.fullName}.json`;
    a.click();
    
    // Simular envío por mail
    window.location.href = `mailto:${pendingRequest.userData.email || ''}?subject=Certificado Firma Digital CMNL&body=Adjunto envío su certificado generado.`;
    
    setView('main');
    setPendingRequest(null);
  };

  // --- VISTAS ---

  if (view === 'admin_process' && pendingRequest) {
    return (
      <div className="bg-[#2C1B15] p-6 rounded-2xl border border-amber-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Emitir Certificado</h3>
        <div className="space-y-4">
          <div className="p-4 bg-black/20 rounded-lg">
            <p className="text-amber-500 text-xs uppercase font-bold">Usuario</p>
            <p className="text-white">{pendingRequest.userData.fullName}</p>
            <p className="text-stone-400 text-sm">CI: {pendingRequest.userData.ci}</p>
          </div>
          <button 
            onClick={generateFinalCertificate}
            className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} /> VALIDAR Y GENERAR ARCHIVO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-[#2C1B15] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Centro de Firma Digital</h2>
              <p className="text-stone-400">Gestión de identidad corporativa CMNL</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {certStatus === 'active' ? (
               <span className="px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-sm font-bold border border-green-500/20 flex items-center gap-2">
                 <CheckCircle2 size={16} /> CERTIFICADO ACTIVO
               </span>
             ) : certStatus === 'pending' ? (
               <span className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-full text-sm font-bold border border-blue-500/20 flex items-center gap-2">
                 <Key size={16} /> ESPERANDO EMISIÓN
               </span>
             ) : (
               <span className="px-4 py-2 bg-stone-500/10 text-stone-500 rounded-full text-sm font-bold border border-stone-500/20">
                 SIN CERTIFICADO
               </span>
             )}
          </div>
        </div>
      </div>

      {/* RENDERIZADO POR ROL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* VISTA USUARIO (SOLICITUD) */}
        {!isAdmin && certStatus === 'none' && (
          <div className="bg-[#2C1B15] p-8 rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={20} className="text-amber-500" /> Solicitud Nueva
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <input 
                type="text" placeholder="Número de CI" 
                className="bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 online-none"
                value={formData.ci} onChange={e => setFormData({...formData, ci: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                 <input 
                  type="text" placeholder="Tomo" 
                  className="bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                  value={formData.tomo} onChange={e => setFormData({...formData, tomo: e.target.value})}
                />
                 <input 
                  type="text" placeholder="Folio" 
                  className="bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none"
                  value={formData.folio} onChange={e => setFormData({...formData, folio: e.target.value})}
                />
              </div>
            </div>
            <button 
              onClick={handleGenerateRequest}
              disabled={loading || !formData.ci}
              className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              {loading ? "GENERANDO LLAVES..." : "GENERAR PETICIÓN (.CMNL)"}
            </button>
          </div>
        )}

        {/* VISTA USUARIO (CARGA) */}
        {!isAdmin && certStatus === 'pending' && (
          <div className="bg-[#2C1B15] p-8 rounded-3xl border border-blue-500/20 space-y-6">
            <div className="flex items-center gap-4 text-blue-400">
              <Key size={32} />
              <div>
                <h3 className="font-bold">Petición en curso</h3>
                <p className="text-sm opacity-70">Cargue el archivo JSON que recibió del Administrador.</p>
              </div>
            </div>
            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-colors">
                <FileUp className="text-stone-500" size={40} />
                <span className="text-stone-400 text-sm font-medium">Click para cargar certificado (.json)</span>
              </div>
              <input type="file" className="hidden" accept=".json" onChange={handleLoadCertificate} />
            </label>
          </div>
        )}

        {/* VISTA ADMINISTRADOR (GESTOR) */}
        {isAdmin && (
          <div className="bg-[#2C1B15] p-8 rounded-3xl border border-amber-500/20 space-y-6 h-fit">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={20} className="text-amber-500" /> Panel de Emisión
            </h3>
            <p className="text-stone-400 text-sm">Cargue las peticiones (.cmnl) de los trabajadores para validar su identidad y emitir la firma.</p>
            
            <label className="block w-full cursor-pointer">
              <div className="bg-black/30 border border-amber-500/30 rounded-2xl p-6 flex items-center gap-4 hover:border-amber-500 transition-all">
                <div className="p-3 bg-amber-500 text-black rounded-xl">
                  <FileUp size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-bold">Cargar Petición</p>
                  <p className="text-xs text-stone-500">Seleccionar archivo .cmnl</p>
                </div>
              </div>
              <input type="file" className="hidden" accept=".cmnl" onChange={handleProcessRequest} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirmaDigitalTool;
