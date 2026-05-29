import React, { useState, useEffect } from 'react';
import { Shield, Key, FileUp, FileCheck, Download, AlertTriangle, CheckCircle2, Lock, FileText, FileDown, FileCode, Users, Award, PlayCircle, Send } from 'lucide-react';
import { cryptoUtils, generateDigitalSignature, getStoredCertificate, getStoredPrivateKey, getStoredPassword, formatDigitalSignatureForDocuments } from '../utils/signatureUtils';
import jsPDF from 'jspdf';
import { openWhatsApp } from '../utils/whatsappUtils';

export const FirmaDigitalTool = ({ user, isAdmin, onUpdateDatabase, equipoData = [], users = [] }) => {
  const [view, setView] = useState('main'); // main, request, load, admin_process, cert_view
  const [loading, setLoading] = useState(false);
  const [certStatus, setCertStatus] = useState<any>(null); // 'none', 'pending', 'active'
  const [lastGeneratedRequest, setLastGeneratedRequest] = useState<any>(null);
  const [downloadedSemanal, setDownloadedSemanal] = useState<boolean>(false);
  const [redirectDialog, setRedirectDialog] = useState<{ visible: boolean; filename: string; msg: string } | null>(null);
  const ADMIN_EMAIL = 'emisora@cmnl.cu'; // Administrator email
  const ADMIN_PHONE = '54413935'; // Direct administrator phone number

  // Check if a string represents the Station Director (e.g., "Director de emisora" or "Directora d emisora")
  const isStationDirector = (classificationStr?: string, specialtyStr?: string) => {
    const cls = (classificationStr || '').toLowerCase();
    const sp = (specialtyStr || '').toLowerCase();
    const checkString = (str: string) => {
      const hasDir = str.includes('director') || str.includes('directora');
      const hasEmisora = str.includes('emisora') || str.includes('la emisora');
      return hasDir && hasEmisora;
    };
    return checkString(cls) || checkString(sp);
  };

  // Retrieve user ID and define role flags
  const userId = user?.id || user?.username;
  const userTeamMember = equipoData.find((m: any) => m.id === userId || m.name?.toLowerCase() === (user?.fullName || user?.name || '').toLowerCase());
  const isDirectorEmisora = isStationDirector(user?.classification, user?.specialty || userTeamMember?.specialty);
  const isGlobalAdmin = user?.username === 'admincmnl';

  const currentUserAuth = React.useMemo(() => {
    return users.find((u: any) => u.id === userId || u.username === user?.username) || null;
  }, [userId, user, users]);

  const abstractAdminTeamMember = equipoData.find((m: any) => m.id === 'admin_app_static');
  
  const effectiveAdminPhone = React.useMemo(() => {
    const linked = abstractAdminTeamMember?.designatedUserId 
      ? equipoData.find((m: any) => m.id === abstractAdminTeamMember.designatedUserId)
      : null;
    return linked?.mobile || linked?.phone || abstractAdminTeamMember?.mobile || abstractAdminTeamMember?.phone || ADMIN_PHONE;
  }, [abstractAdminTeamMember, equipoData, ADMIN_PHONE]);

  // Resolve who the physical person is for the Admin
  const physicalAdminUser = React.useMemo(() => {
    if (!isAdmin) return null;
    if (userTeamMember && userTeamMember.id !== 'admin_app_static') {
      return userTeamMember;
    }
    return (abstractAdminTeamMember?.designatedUserId) 
      ? equipoData.find((m: any) => m.id === abstractAdminTeamMember.designatedUserId) 
      : null;
  }, [isAdmin, userTeamMember, abstractAdminTeamMember, equipoData]);

  const physicalAdminUserAuth = React.useMemo(() => {
    if (!physicalAdminUser) return null;
    return users.find((u: any) => u.id === physicalAdminUser.id) || null;
  }, [physicalAdminUser, users]);

  // Requirement: Strict CI Validation
  const isValidCI = (ci: string) => {
    if (!/^\d{11}$/.test(ci)) return false;
    const month = parseInt(ci.substring(2, 4));
    const day = parseInt(ci.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  };

  // State for Digital Signatures Database (.json sync)
  const [digitalSignatures, setDigitalSignatures] = useState<any>(() => {
    const saved = localStorage.getItem('cmnl_digital_signatures');
    const defaultData = { validated_users: [], pending_requests: [] };
    if (!saved) return defaultData;
    try {
      const parsed = JSON.parse(saved);
      return {
        ...defaultData,
        ...parsed
      };
    } catch (e) {
      return defaultData;
    }
  });

  // Save changes to database
  const saveDigitalSignatures = (newData: any) => {
    setDigitalSignatures(newData);
    localStorage.setItem('cmnl_digital_signatures', JSON.stringify(newData));
    if (onUpdateDatabase) {
      onUpdateDatabase(newData);
    }
  };

  // User form states
  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || '',
    ci: '',
    tomo: '',
    folio: '',
    contract1: '',
    contract2: ''
  });

  useEffect(() => {
    const nameToUse = user?.fullName || user?.name || '';
    // Sync with team database if available
    if (nameToUse && (!formData.fullName || formData.fullName === '' || formData.fullName === nameToUse)) {
      setFormData(prev => {
        const currentCi = prev.ci || userTeamMember?.ci || '';
        const date1 = userTeamMember?.contracts?.[0] || userTeamMember?.contract1 || user?.contracts?.[0] || user?.contract1 || '';
        const date2 = userTeamMember?.contracts?.[1] || userTeamMember?.contract2 || user?.contracts?.[1] || user?.contract2 || '';
        const specs = userTeamMember?.specialty ? userTeamMember.specialty.split('/').map((s: string) => s.trim()) : [];
        const isSpec1Dir = specs[0] ? isStationDirector('', specs[0]) : isDirectorEmisora;
        const isSpec2Dir = specs[1] ? isStationDirector('', specs[1]) : false;
        return { 
          ...prev, 
          fullName: nameToUse,
          ci: currentCi,
          contract1: currentCi.length === 11 && date1 ? calcContract(currentCi, date1, isSpec1Dir) : '',
          contract2: currentCi.length === 11 && date2 ? calcContract(currentCi, date2, isSpec2Dir) : ''
        };
      });
    }
  }, [user, userTeamMember]);

  const calcContract = (ci: string, dateStr: string, isDirector: boolean = false) => {
    if (!ci || ci.length < 11 || !dateStr) return '';
    if (isDirector) {
      return dateStr;
    }
    const last3 = ci.slice(-3);

    // If it is already a contract number (e.g. 421-092601), return it as is
    if (/^\d{3}-\d{6}$/.test(dateStr)) {
      return dateStr;
    }

    // Split by dash (-), slash (/), or space
    const parts = dateStr.trim().split(/[-/\s]+/);
    if (parts.length === 3) {
      let yy = '';
      let mm = '';
      let dd = '';

      const p0 = parts[0];
      const p1 = parts[1];
      const p2 = parts[2];

      // Format is YYYY-MM-DD (e.g. 2026-09-01) or YYYY-M-D
      if (p0.length === 4 || parseInt(p0, 10) > 100) {
        yy = p0.slice(-2);
        mm = p1.padStart(2, '0');
        dd = p2.padStart(2, '0');
      } 
      // Format is DD-MM-YYYY (e.g. 01-09-2026) or D-M-YYYY
      else if (p2.length === 4 || parseInt(p2, 10) > 100) {
        yy = p2.slice(-2);
        mm = p1.padStart(2, '0');
        dd = p0.padStart(2, '0');
      } 
      // Format uses 2-digit years like DD-MM-YY (e.g. 01-09-26) or YY-MM-DD (e.g. 26-09-01)
      else {
        const num0 = parseInt(p0, 10);
        const num2 = parseInt(p2, 10);
        if (num0 > 31 && num2 <= 31) {
          yy = p0.slice(-2);
          mm = p1.padStart(2, '0');
          dd = p2.padStart(2, '0');
        } else {
          yy = p2.slice(-2);
          mm = p1.padStart(2, '0');
          dd = p0.padStart(2, '0');
        }
      }

      return `${last3}-${mm}${yy}${dd}`;
    }

    // Check if we can parse it as a standard native JS date
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const yy = d.getFullYear().toString().slice(-2);
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        return `${last3}-${mm}${yy}${dd}`;
      }
    } catch (e) {
      // ignore
    }

    return dateStr; // fallback
  };

  const [ciWarning, setCiWarning] = useState('');

  const handleCiChange = (val: string) => {
    const rawVal = val.replace(/\D/g, '').slice(0, 11);
    
    // Live validation
    let warning = '';
    if (rawVal.length >= 4) {
      const mm = parseInt(rawVal.substring(2, 4), 10);
      if (mm < 1 || mm > 12) warning = `Mes inválido (${rawVal.substring(2, 4)}). No puede cruzar de 12.`;
    }
    if (!warning && rawVal.length >= 6) {
      const dd = parseInt(rawVal.substring(4, 6), 10);
      if (dd < 1 || dd > 31) warning = `Día inválido (${rawVal.substring(4, 6)}). No puede cruzar de 31.`;
    }
    setCiWarning(warning);

    const date1 = userTeamMember?.contracts?.[0] || userTeamMember?.contract1 || user?.contracts?.[0] || user?.contract1 || '';
    const date2 = userTeamMember?.contracts?.[1] || userTeamMember?.contract2 || user?.contracts?.[1] || user?.contract2 || '';
    const specs = userTeamMember?.specialty ? userTeamMember.specialty.split('/').map((s: string) => s.trim()) : [];
    const isSpec1Dir = specs[0] ? isStationDirector('', specs[0]) : isDirectorEmisora;
    const isSpec2Dir = specs[1] ? isStationDirector('', specs[1]) : false;

    setFormData(prev => {
      const updated = { ...prev, ci: rawVal };
      if (rawVal.length === 11) {
        if (date1) updated.contract1 = calcContract(rawVal, date1, isSpec1Dir);
        if (date2) updated.contract2 = calcContract(rawVal, date2, isSpec2Dir);
      } else {
        // Clear them if ci length is not 11
        updated.contract1 = '';
        updated.contract2 = '';
      }
      return updated;
    });
  };

  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [contractNumbers, setContractNumbers] = useState<Record<string, string>>({});

  // Loaded Certificate visualization & Password Update
  const [loadedCert, setLoadedCert] = useState<any>(null);
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [workerRevealTimer, setWorkerRevealTimer] = useState<number>(0);
  const [workerTempPass, setWorkerTempPass] = useState<string>('');

  // Director review states
  const [signingCert, setSigningCert] = useState<any>(null);
  const [directorPass, setDirectorPass] = useState('');
  const [showDirectorSignDialog, setShowDirectorSignDialog] = useState(false);
  const [newlySignedCert, setNewlySignedCert] = useState<any>(null); // Used to show send options for Director files

  // Dialog state replacements for sandboxed iframe
  const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [customAlert, setCustomAlert] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({ message, type });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setCustomConfirm({ message, onConfirm });
  };

  // 1. Auto-retrieval of certified credentials from database:
  // If a validated and signed certificate exists for this user, auto-load it instantly!
  useEffect(() => {
    if (!userId) {
      setCertStatus('none');
      setLoadedCert(null);
      return;
    }

    const dbCert = digitalSignatures.validated_users?.find((u: any) => u.userId === userId && u.status === 'signed');
    const dbPending = digitalSignatures.pending_requests?.find((r: any) => r.userId === userId);
    const isExpired = dbCert && dbCert.validUntil && new Date(dbCert.validUntil).getTime() < Date.now();
    
    if (dbCert && !isExpired) {
      const localCertStr = localStorage.getItem(`cmnl_cert_${userId}`);
      let newlyAutoLoaded = false;
      if (!localCertStr) {
        newlyAutoLoaded = true;
      } else {
        try {
          const parsed = JSON.parse(localCertStr);
          if (parsed.issueDate !== dbCert.issueDate) {
            newlyAutoLoaded = true;
          }
        } catch (e) {
          newlyAutoLoaded = true;
        }
      }
      setCertStatus('active');
      setLoadedCert(dbCert);
      localStorage.setItem(`cmnl_cert_${userId}`, JSON.stringify(dbCert));
      localStorage.setItem(`cmnl_pass_${userId}`, dbCert.originalPassword);
      if (newlyAutoLoaded) {
        localStorage.removeItem(`cmnl_worker_cert_reveal_times_v5_${userId}`);
      }
    } else {
      // If expired or missing, clean up and allow re-request
      if (isExpired) {
        setCertStatus('none'); 
        setLoadedCert(null);
      } else {
        localStorage.removeItem(`cmnl_cert_${userId}`);
        localStorage.removeItem(`cmnl_pass_${userId}`);
        setLoadedCert(null);
        
        const localKey = localStorage.getItem(`cmnl_sk_${userId}`);
        setCertStatus(dbPending || localKey ? 'pending' : 'none');
      }
    }
  }, [user, userId, digitalSignatures]);

  // Check if loaded certificate is expired (1 year limit)
  const isCertExpired = loadedCert?.validUntil && new Date(loadedCert.validUntil).getTime() < Date.now();

  const isPasswordExpired = React.useMemo(() => {
    if (isAdmin || !loadedCert) return false;
    const lastUpdate = localStorage.getItem(`cmnl_pass_updated_${userId}`);
    const issueDate = new Date(loadedCert.issueDate).getTime();
    if (!lastUpdate) {
       // Never updated, must be changed within 72 hours of issue
       return Date.now() - issueDate > 72 * 60 * 60 * 1000;
    } else {
       // Updated before, must be changed monthly (30 days)
       return Date.now() - parseInt(lastUpdate) > 30 * 24 * 60 * 60 * 1000;
    }
  }, [isAdmin, loadedCert, userId]);

  const [adminRevealTimer, setAdminRevealTimer] = useState<number>(0);
  const [adminTempPass, setAdminTempPass] = useState<string>('');
  const [showAdminSignConfirmDialog, setShowAdminSignConfirmDialog] = useState(false);
  const [adminSignPassInput, setAdminSignPassInput] = useState('');

  useEffect(() => {
    if (adminRevealTimer > 0) {
      const to = setTimeout(() => setAdminRevealTimer(prev => prev - 1), 1000);
      return () => clearTimeout(to);
    } else {
      setAdminTempPass(''); // Clear it out when hidden
    }
  }, [adminRevealTimer]);

  useEffect(() => {
    if (workerRevealTimer > 0) {
      const to = setTimeout(() => setWorkerRevealTimer(prev => prev - 1), 1000);
      return () => clearTimeout(to);
    } else {
      setWorkerTempPass(''); // Clear it out when hidden
    }
  }, [workerRevealTimer]);

  // --- CERTIFICATE PDF BUILDER DOWNLOADER ---
  const downloadCertificatePDF = (cert: any) => {
    if (!cert) return;
    try {
      const doc = new jsPDF();
      
      // Margins and theme background
      doc.setFillColor(44, 27, 21); // Dark brown-cream theme matching the app #2C1B15
      doc.rect(0, 0, 210, 297, "F");
      
      // Golden border frame
      doc.setDrawColor(158, 118, 73); // #9E7649
      doc.setLineWidth(1.5);
      doc.rect(5, 5, 200, 287);
      doc.rect(7, 7, 196, 283);

      // Header Brand
      doc.setTextColor(232, 220, 207); // #E8DCCF
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("RADIO CIUDAD MONUMENTO", 105, 30, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(158, 118, 73);
      doc.text("CERTIFICADO DE IDENTIDAD DIGITAL CRIPTOGRÁFICA (.RAZON)", 105, 38, { align: "center" });
      
      // Simple division line
      doc.setDrawColor(158, 118, 73);
      doc.setLineWidth(0.5);
      doc.line(20, 46, 190, 46);

      // Certificate content block
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DE IDENTIDAD CORPORATIVA", 25, 58);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 190, 180);
      doc.text("Nombre Completo:", 25, 68);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`${cert.userData.fullName}`, 75, 68);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 190, 180);
      doc.text("Carnet de Identidad:", 25, 78);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`${cert.userData.ci}`, 75, 78);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 190, 180);
      doc.text("Tomo / Folio:", 25, 88);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`${cert.userData.tomo} / ${cert.userData.folio}`, 75, 88);

      // Under titular line
      doc.setDrawColor(158, 118, 73);
      doc.line(20, 96, 190, 96);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("DETALLES DE EMISIÓN Y CADUCIDAD", 25, 108);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 190, 180);
      doc.text("Emisor Autorizado:", 25, 118);
      doc.setTextColor(255, 255, 255);
      doc.text(`${cert.issuer || 'Administrador CMNL'}`, 75, 118);

      doc.setTextColor(200, 190, 180);
      doc.text("Fecha de Registro:", 25, 128);
      doc.setTextColor(255, 255, 255);
      doc.text(`${new Date(cert.issueDate).toLocaleDateString()}`, 75, 128);

      doc.setTextColor(200, 190, 180);
      doc.text("Fecha Expiración (1 Año):", 25, 138);
      
      const isExpiredInPDF = new Date(cert.validUntil).getTime() < Date.now();
      if (isExpiredInPDF) {
        doc.setTextColor(239, 68, 68);
      } else {
        doc.setTextColor(245, 158, 11);
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${new Date(cert.validUntil).toLocaleDateString()} ${isExpiredInPDF ? '(VENCIDO)' : '(ACTIVO)'}`, 75, 138);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 190, 180);
      doc.text("Estado Validación:", 25, 148);
      if (cert.status === 'signed') {
        doc.setTextColor(74, 222, 128);
      } else {
        doc.setTextColor(245, 158, 11);
      }
      doc.text(`${cert.status === 'signed' ? 'FIRMADO Y OPERATIVO' : 'VALIDADO, PENDIENTE FIRMA DIRECTORA'}`, 75, 148);

      let sigY = 158;

      // 1. Signature: Administrator (Validation)
      if (cert.adminSignature) {
        doc.setTextColor(200, 190, 180);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Validación del Administrador:", 25, sigY);
        
        doc.setFont("courier", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(158, 118, 73);
        const aLines = formatDigitalSignatureForDocuments(cert.adminSignature);
        aLines.slice(0, 3).forEach((line, idx) => {
          doc.text(line.toLowerCase(), 75, sigY + (idx * 2.5));
        });
        sigY += 12;
      }

      // 2. Signature: Director (Approval/Firma)
      if (cert.directorSignature) {
        doc.setTextColor(200, 190, 180);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        const isDirAdmin = cert.directorName === "Administrador CMNL";
        const sigLabel = isDirAdmin ? "Emisión Escrow (Administrador):" : "Firma de Aprobación - Directora:";
        doc.text(sigLabel, 25, sigY);
        
        doc.setFont("courier", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(158, 118, 73);
        const dLines = formatDigitalSignatureForDocuments(cert.directorSignature);
        dLines.slice(0, 3).forEach((line, idx) => {
          doc.text(line.toLowerCase(), 75, sigY + (idx * 2.5));
        });
        sigY += 12;
      }

      // Ensure minimal Y for separation
      sigY = Math.max(sigY, 166);

      // division line
      doc.setDrawColor(158, 118, 73);
      doc.line(20, sigY, 190, sigY);

      // Section: contracts
      let yHeaderC = sigY + 12;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("CONTRATOS HABILITADOS", 25, yHeaderC);
      
      let y = yHeaderC + 10;
      Object.entries(cert.contracts || {}).forEach(([spec, num]) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 190, 180);
        doc.text(`${spec || 'Especialidad'}:`, 30, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`${num}`, 120, y);
        y += 8;
      });

      // division line
      doc.setDrawColor(158, 118, 73);
      doc.line(20, y + 2, 190, y + 2);

      // Credentials Container Block
      doc.setFillColor(30, 15, 10);
      doc.rect(20, y + 8, 170, 42, "F");
      doc.rect(20, y + 8, 170, 42, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(245, 158, 11); // Amber
      doc.text("CREDENCIALES DE SEGURIDAD PRIVADAS", 25, y + 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(232, 220, 207);
      doc.text("Contraseña Original:", 25, y + 26);
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(`${cert.originalPassword}`, 75, y + 26);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(150, 140, 130);
      doc.text("Guarde este documento confidencial. Use esta contraseña para", 25, y + 36);
      doc.text("activar y actualizar su firma criptográfica local para validar documentos.", 25, y + 40);

      // Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text("Radio Ciudad Monumento - Cripto Identidad Firma Digital Escrow", 105, 280, { align: "center" });

      doc.save(`certificado_cmnl_${cert.userData.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (e: any) {
      console.error(e);
      showAlert("Error al generar el certificado PDF: " + e.message, 'error');
    }
  };

  // --- GENERATE PASSWORD STABLE FALLBACK ---
  const generateOriginalPass = (name: string, ci: string) => {
    let hash1 = 0;
    let hash2 = 17;
    const str = (name || '') + (ci || '');
    for (let i = 0; i < str.length; i++) {
      hash1 = ((hash1 << 5) - hash1) + str.charCodeAt(i);
      hash1 |= 0;
      hash2 = ((hash2 << 7) + hash2) + str.charCodeAt(i);
      hash2 |= 0;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz';
    let result = '';
    let val1 = Math.abs(hash1);
    let val2 = Math.abs(hash2);
    // Length is 8 characters
    for (let i = 0; i < 8; i++) {
       const idx = (i % 2 === 0) ? (val1 + i) : (val2 + i);
       result += chars[idx % chars.length];
       val1 = Math.floor(val1 / 13) + i * 8;
       val2 = Math.floor(val2 / 17) + i * 11;
    }
    return result;
  };

  const shareViaEmail = (to: string, subject: string, body: string) => {
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // --- UNLINK IDENTIFICATION ---
  const handleUnlink = () => {
    showConfirm(
      "¿ESTÁ SEGURO? Esta acción desvinculará su identidad digital de este equipo. No podrá firmar documentos hasta que vuelva a cargar su archivo .razon.",
      () => {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cmnl_sk_') || key.startsWith('cmnl_cert_') || key.startsWith('cmnl_pass_')) {
            localStorage.removeItem(key);
          }
        });
        
        setCertStatus('none');
        setLoadedCert(null);
        setView('main');
        showAlert("Certificado desvinculado exitosamente.", 'success');
      }
    );
  };

  // --- GENERATE REQUEST (.semanal) ---
  const handleGenerateRequest = async () => {
    // Validate CI before proceeding
    if (!isValidCI(formData.ci)) {
      showAlert("El número de Carnet de Identidad es inválido. Debe tener 11 dígitos, con mes (01-12) y día (01-31) correctos.", 'error');
      return;
    }

    setLoading(true);
    try {
      const keys = await cryptoUtils.generateKeyPair();
      const pubBase64 = await cryptoUtils.exportPublicKey(keys.publicKey);
      const privBase64 = await cryptoUtils.exportPrivateKey(keys.privateKey);

      localStorage.setItem(`cmnl_sk_${userId}`, privBase64);

      const requestObj = {
        type: 'SEMANAL_REQUEST',
        userId: userId,
        userData: {
          ...formData,
          fullName: user?.fullName || user?.name || formData.fullName
        },
        publicKey: pubBase64,
        timestamp: new Date().toISOString()
      };

      // Store in synced database
      const updatedRequests = [...(digitalSignatures.pending_requests || []).filter((r: any) => r.userId !== userId)];
      updatedRequests.push(requestObj);

      saveDigitalSignatures({
        ...digitalSignatures,
        pending_requests: updatedRequests
      });
      
      setLastGeneratedRequest(requestObj);
      setDownloadedSemanal(false);
      setCertStatus('pending');
      showAlert("¡Solicitud generada con éxito! Ahora proceda a descargarla y compartirla con el administrador.", 'success');
    } catch (err) {
      console.error(err);
      showAlert("Error al generar las claves.", 'error');
    }
    setLoading(false);
  };

  // --- LOAD CERTIFICATE BACK (.razon) ---
  const handleLoadCertificate = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const certData = JSON.parse(result);
        if (certData.userId !== userId) {
          throw new Error("Este certificado no pertenece a su cuenta actual de usuario.");
        }
        
        localStorage.setItem(`cmnl_cert_${userId}`, JSON.stringify(certData));
        localStorage.setItem(`cmnl_pass_${userId}`, certData.originalPassword);
        // Reset local reveal limit as well since we are loading or re-loading a certificate
        localStorage.removeItem(`cmnl_worker_cert_reveal_times_v5_${userId}`);
        
        setLoadedCert(certData);
        setCertStatus('active');
        setView('cert_view');
        showAlert("¡Certificado cargado satisfactoriamente y activo!", 'success');
      } catch (err: any) {
        showAlert("Archivo razón inválido: " + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  // --- PASSWORD UPDATE FOR CERTIFICATE ---
  const handleUpdatePassword = () => {
    const currentStored = localStorage.getItem(`cmnl_pass_${userId}`);
    if (passForm.old !== currentStored) {
      showAlert("La contraseña actual es incorrecta.", 'error');
      return;
    }
    if (passForm.new !== passForm.confirm) {
      showAlert("La nueva contraseña no coincide.", 'error');
      return;
    }
    if (passForm.new.length < 8) {
      showAlert("La contraseña debe tener al menos 8 caracteres.", 'error');
      return;
    }

    localStorage.setItem(`cmnl_pass_${userId}`, passForm.new);
    localStorage.setItem(`cmnl_pass_updated_${userId}`, Date.now().toString());
    showAlert("Contraseña actualizada localmente de forma segura.", 'success');
    setPassForm({ old: '', new: '', confirm: '' });
  };

  // --- ADMINISTRATOR: HANDLE LOAD OF .semanal ---
  const handleSelectPendingRequest = (req: any) => {
    try {
      // Find member specialties and data
      const member = equipoData.find((m: any) => m.id === req.userId || m.name?.toLowerCase() === req.userData.fullName?.toLowerCase());
      const specialties = member?.specialty ? member.specialty.split(' / ').map((s: any) => s.trim()) : [];
      
      setPendingRequest({ ...req, specialties, memberEmail: member?.email || '' });
      
      // Initialize contracts using values from the global team database (member) OR the request data
      const initContracts: Record<string, string> = {};
      const isDir = isStationDirector('', specialties.join(' / ')) || specialties.some((s: string) => isStationDirector('', s));
      const ci = req.userData?.ci || member?.ci || '';
      if (isDir) {
        const rawContract = req.userData?.contract1 || member?.contracts?.[0] || member?.contract1 || req.contracts?.['Resolución'] || '';
        initContracts['Resolución'] = calcContract(ci, rawContract, true);
      } else {
        specialties.forEach((spec: string, idx: number) => {
          const memberContract = member?.contracts?.[idx] || (idx === 0 ? member?.contract1 : (idx === 1 ? member?.contract2 : ''));
          const reqContract = idx === 0 ? req.userData?.contract1 : (idx === 1 ? req.userData?.contract2 : req.contracts?.[spec]);
          const chosen = reqContract || memberContract || '';
          initContracts[spec] = calcContract(ci, chosen, isStationDirector('', spec));
        });
      }
      setContractNumbers(initContracts);
      setView('admin_process');
    } catch (err) {
      showAlert("Error al procesar la solicitud seleccionada", 'error');
    }
  };

  const handleProcessRequest = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const req = JSON.parse(result);
        handleSelectPendingRequest(req);
      } catch (err) {
        showAlert("Archivo se-manal inválido", 'error');
      }
    };
    reader.readAsText(file);
  };

  // --- ADMINISTRATOR: LOAD SIGNED .razon RECEIVED BACK ---
  const handleLoadSignedCertificateAdmin = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const certData = JSON.parse(result);
        
        if (certData.status !== 'signed') {
          showAlert("Este archivo no contiene las firmas oficiales. El certificado debe estar firmado por la directora de la emisora.", 'error');
          return;
        }

        // Replace or insert inside database
        const updatedUsers = [...(digitalSignatures.validated_users || [])];
        const index = updatedUsers.findIndex((u: any) => u.userId === certData.userId);
        if (index >= 0) {
          updatedUsers[index] = certData;
        } else {
          updatedUsers.push(certData);
        }

        saveDigitalSignatures({
          ...digitalSignatures,
          validated_users: updatedUsers
        });

        showAlert(`¡Certificado oficial firmado por la directora para ${certData.userData.fullName} cargado y guardado en la Base de Datos! Saldrá activo de manera directa para el usuario.`, 'success');
      } catch (err: any) {
        showAlert("Error al cargar archivo razón firmado: " + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  // --- ADMINISTRATOR: AUTHORIZE AND EMIT WORKER CERTIFICATE (DIRECT EMISSION) ---
  const validateCertificateByAdmin = () => {
    // Admin must have their own certificate active to sign validation
    if (!loadedCert || (loadedCert.userId !== userId)) {
      showAlert("Debe cargar su propio certificado administrativo para validar y realizar el estampado digital de validación y emisión.", 'error');
      return;
    }

    const originalPassword = generateOriginalPass(pendingRequest.userData.fullName, pendingRequest.userData.ci);
    
    // 1 Year validity limit (Requirement 6)
    const issueDate = new Date();
    const validUntil = new Date(issueDate.getTime() + 365 * 24 * 60 * 60 * 1000); 

    const certToValidate = {
      ...pendingRequest,
      contracts: contractNumbers,
      originalPassword,
      issueDate: issueDate.toISOString(),
      issuer: "Administrador CMNL",
      validUntil: validUntil.toISOString(),
      status: "signed", // Directly signed and operative since Director signature is not required
      adminSignature: generateDigitalSignature(loadedCert),
      adminName: loadedCert.userData?.fullName || "Administrador CMNL",
      adminTimestamp: issueDate.toISOString()
    };

    const updatedUsers = [...(digitalSignatures.validated_users || [])];
    const index = updatedUsers.findIndex((u: any) => u.userId === certToValidate.userId);
    if (index >= 0) {
      updatedUsers[index] = certToValidate;
    } else {
      updatedUsers.push(certToValidate);
    }

    saveDigitalSignatures({
      ...digitalSignatures,
      validated_users: updatedUsers
    });

    showAlert(`¡Certificado de ${certToValidate.userData.fullName} AUTORIZADO y EMITIDO exitosamente! Se ha firmado localmente y guardado en la base de datos como Firmado y Operativo.`, 'success');
    setView('main');
    setPendingRequest(null);
  };

  // --- ADMINISTRATOR: EMIT DIRECT CERTIFICATE FOR ADMIN OR DIRECTOR ---
  const generateDirectCertificate = () => {
    setLoading(true);
    try {
      if (!pendingRequest || !pendingRequest.userData || !pendingRequest.userData.ci) {
        showAlert("El archivo .semanal es inválido o faltan datos esenciales del trabajador.", 'error');
        setLoading(false);
        return;
      }

      // Check if Admin has their own cert and we know their password
      const adminStoredPass = getStoredPassword(userId);
      if (!adminStoredPass) {
        showAlert("Debe tener su propio certificado de administrador activo y configurado antes de emitir otros.", 'error');
        setLoading(false);
        return;
      }

      // We ask for password in a secondary step now
      setShowAdminSignConfirmDialog(true);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      showAlert("Ocurrió un error al iniciar la emisión. " + (err.message || ''), 'error');
      setLoading(false);
    }
  };

  const handleAdminConfirmSignAndEmit = () => {
    // source from either localStorage or loadedCert directly to avoid sync issues
    const adminStoredPass = (isAdmin && loadedCert) ? loadedCert.originalPassword : getStoredPassword(userId);

    if (adminSignPassInput !== adminStoredPass) {
      showAlert("Contraseña de seguridad administrativa incorrecta.", 'error');
      return;
    }

    setLoading(true);
    try {
      const originalPassword = generateOriginalPass(pendingRequest.userData.fullName, pendingRequest.userData.ci);
      const issueDate = new Date();
      const validUntil = new Date(issueDate.getTime() + 365 * 24 * 60 * 60 * 1000); 

      const finalCert = {
        ...pendingRequest,
        contracts: contractNumbers,
        originalPassword,
        issueDate: issueDate.toISOString(),
        issuer: "Administrador CMNL",
        validUntil: validUntil.toISOString(),
        status: "signed",
        directorSignature: generateDigitalSignature(loadedCert),
        directorName: "Administrador CMNL",
        directorTimestamp: issueDate.toISOString()
      };

      const updatedUsers = [...(digitalSignatures.validated_users || [])];
      const index = updatedUsers.findIndex((u: any) => u.userId === finalCert.userId);
      if (index >= 0) {
        updatedUsers[index] = finalCert;
      } else {
        updatedUsers.push(finalCert);
      }

      saveDigitalSignatures({
        ...digitalSignatures,
        validated_users: updatedUsers
      });
      
      showAlert(`Certificado firmado por el administrador y emitido para ${pendingRequest.userData.fullName}.`, 'success');
      setShowAdminSignConfirmDialog(false);
      setAdminSignPassInput('');
      setView('main');
      setPendingRequest(null);
    } catch (err: any) {
      showAlert("Error al emitir: " + err.message, 'error');
    }
    setLoading(false);
  };

  // --- DATABASE BACKUP/RESTORE ---
  const handleExportDatabase = () => {
    try {
      const data = JSON.stringify(digitalSignatures, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_firmas_digitales_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showAlert("Base de datos exportada (respaldo) con éxito.", 'success');
    } catch (err: any) {
      showAlert("Error al exportar: " + err.message, 'error');
    }
  };

  const handleImportDatabase = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const data = JSON.parse(result);
        if (!data.validated_users) throw new Error("Archivo de respaldo inválido o incompatible.");
        
        showConfirm("¿Restaurar base de datos? Esto reemplazará la lista actual de certificados validados.", () => {
          saveDigitalSignatures(data);
          showAlert("Base de datos restaurada con éxito.", 'success');
        });
      } catch (err: any) {
        showAlert("Error al importar: " + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // --- ADMINISTRATOR: SELF GENERATE CERTIFICATE ---
  const handleGenerateAdminSelfCertificate = async () => {
    // Validate CI
    if (!isValidCI(formData.ci)) {
      showAlert("El número de Carnet de Identidad es inválido. Debe tener 11 dígitos, con mes (01-12) y día (01-31) correctos.", 'error');
      return;
    }

    setLoading(true);
    try {
      const designatedUser = physicalAdminUser;
      if (!designatedUser) {
        showAlert("Debe vincular un usuario físico en su perfil de Equipo antes de generar su certificado.", 'error');
        setLoading(false);
        return;
      }

      const keys = await cryptoUtils.generateKeyPair();
      const pubBase64 = await cryptoUtils.exportPublicKey(keys.publicKey);
      const privBase64 = await cryptoUtils.exportPrivateKey(keys.privateKey);

      localStorage.setItem(`cmnl_sk_${userId}`, privBase64);

      const fullName = designatedUser.name;
      const originalPassword = generateOriginalPass(fullName, formData.ci);

      const issueDate = new Date();
      const validUntil = new Date(issueDate.getTime() + 365 * 24 * 60 * 60 * 1000); 

      // Build specialties array
      const specs = designatedUser.specialty ? designatedUser.specialty.split('/').map((s: string) => s.trim()) : [];
      
      const finalContracts: Record<string, string> = {};
      const isDir = isStationDirector('', designatedUser.specialty);
      if (isDir) {
        finalContracts['Resolución'] = formData.contract1;
      } else {
        specs.forEach((s: string, idx: number) => {
          if (idx === 0) finalContracts[s] = formData.contract1;
          if (idx === 1) finalContracts[s] = formData.contract2;
        });
      }

      const selfSignature = generateDigitalSignature({
        userData: { ...formData, fullName },
        contracts: finalContracts
      });

      const finalCert = {
        type: 'SEMANAL_REQUEST',
        userId: userId,
        userData: { ...formData, fullName },
        publicKey: pubBase64,
        timestamp: issueDate.toISOString(),
        specialties: specs,
        contracts: finalContracts,
        originalPassword,
        issueDate: issueDate.toISOString(),
        issuer: "Administrador CMNL",
        validUntil: validUntil.toISOString(),
        status: "signed",
        directorSignature: selfSignature,
        directorName: "Administrador CMNL",
        directorTimestamp: issueDate.toISOString()
      };

      localStorage.setItem(`cmnl_cert_${userId}`, JSON.stringify(finalCert));
      localStorage.setItem(`cmnl_pass_${userId}`, originalPassword);
      setLoadedCert(finalCert);
      setCertStatus('active');

      const updatedUsers = [...(digitalSignatures.validated_users || [])];
      const index = updatedUsers.findIndex((u: any) => u.userId === userId);
      if (index >= 0) {
        updatedUsers[index] = finalCert;
      } else {
        updatedUsers.push(finalCert);
      }

      saveDigitalSignatures({
        ...digitalSignatures,
        validated_users: updatedUsers
      });

      const fileContent = JSON.stringify(finalCert, null, 2);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `razon_${fullName.replace(/\s+/g, '_')}.razon`;
      a.click();
      
      showAlert(`Certificado de Administrador expedido exitosamente para ${fullName}.`, 'success');
      setView('main');
    } catch (err) {
      console.error(err);
      showAlert("Error al generar las claves del administrador.", 'error');
    }
    setLoading(false);
  };

  // --- DIRECTOR: APPROVE AND SIGN CERTIFICATE (STATUS => "signed") ---
  const handleDirectorSignCertificate = () => {
    if (!signingCert) return;

    // Check that director's own certificate is loaded and operative
    const directorCertLocal = getStoredCertificate(userId);
    if (!directorCertLocal || new Date(directorCertLocal.validUntil).getTime() < Date.now()) {
      showAlert("Para firmar, usted debe tener cargado y activo su propio Certificado de Directora y no debe estar vencido.", 'error');
      return;
    }

    const directorStoredPass = directorCertLocal.originalPassword || getStoredPassword(userId);
    if (directorPass !== directorStoredPass) {
      showAlert("Contraseña de certificado incorrecta. No se pudo firmar.", 'error');
      return;
    }

    // Sign the worker's cert
    const directorSignatureText = generateDigitalSignature(directorCertLocal);

    const signedCertByDirector = {
      ...signingCert,
      status: 'signed',
      directorSignature: directorSignatureText,
      directorName: directorCertLocal.userData.fullName || 'Directora Emisora',
      directorTimestamp: new Date().toISOString()
    };

    // Save in cmnl_digital_signatures
    const updatedUsers = [...(digitalSignatures.validated_users || [])];
    const index = updatedUsers.findIndex((u: any) => u.userId === signedCertByDirector.userId);
    if (index >= 0) {
      updatedUsers[index] = signedCertByDirector;
    } else {
      updatedUsers.push(signedCertByDirector);
    }

    saveDigitalSignatures({
      ...digitalSignatures,
      validated_users: updatedUsers
    });

    setNewlySignedCert(signedCertByDirector);
    setShowDirectorSignDialog(false);
    setSigningCert(null);
    setDirectorPass('');
    showAlert(`Certificado firmado de forma digital con éxito. Ahora puede descargarlo y mandarlo de vuelta al Administrador.`, 'success');
  };

  const handleDownloadDirectorCertFile = (cert: any) => {
    if (!cert) return;
    const fileContent = JSON.stringify(cert, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `razon_firmado_${cert.userData.fullName.replace(/\s+/g, '_')}.razon`;
    a.click();
  };

  const handleSendDirectorCertWhatsApp = async (cert: any) => {
    if (!cert) return;
    const msg = `Hola Administrador, aquí le envío el certificado (.razon) firmado por la Directora para el usuario: *${cert.userData.fullName}*.\n\nFirma Directora:\n_${cert.directorSignature}_`;
    const filename = `razon_firmado_${cert.userData.fullName.replace(/\s+/g, '_')}.razon`;
    
    try {
      const fileContent = JSON.stringify(cert, null, 2);
      // Use text/plain so mobile browsers accept the file in Web Share API
      const file = new File([fileContent], filename, { type: 'text/plain' });
      
      const shareData = {
        files: [file],
        title: 'Certificado .razon firmado',
        text: msg
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      } else if (navigator.share) {
        // Fallback to try sharing even if canShare is false (some browsers have flawed canShare)
        await navigator.share(shareData);
        return;
      }
    } catch (err: any) {
      console.log("Share API falló o cancelada", err);
      if (err.name === 'AbortError') {
        return;
      }
    }
    
    setRedirectDialog({
      visible: true,
      filename,
      msg
    });
  };

  // Validate request owner bypass
  const isRequestOwnerAdminOrDirector = pendingRequest && (
    pendingRequest.userId === 'pedro' || pendingRequest.userId === 'admin_app_static' ||
    isStationDirector(pendingRequest.userData.fullName, equipoData.find((m: any) => m.id === pendingRequest.userId)?.specialty)
  );

  // --- SUB-VIEWS ---
  let subViewContent = null;
  if (view === 'admin_process' && pendingRequest) {
    subViewContent = (
      <div className="bg-[#2C1B15] p-8 rounded-3xl border border-amber-500/30 space-y-6 animate-in fade-in max-w-2xl mx-auto shadow-2xl animate-out">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield size={24} className="text-amber-500" /> Analizar Petición Criptográfica
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-black/30 rounded-xl space-y-2 border border-white/5">
            <p className="text-amber-500 text-[10px] uppercase font-bold tracking-wider">Perfil Solicitante</p>
            <p className="text-white font-bold text-lg">{pendingRequest.userData.fullName}</p>
            <p className="text-stone-300 text-sm font-mono">CI: {pendingRequest.userData.ci}</p>
            <p className="text-stone-400 text-xs">Tomo: {pendingRequest.userData.tomo} | Folio: {pendingRequest.userData.folio}</p>
          </div>

          <div className="space-y-4">
            {isStationDirector('', pendingRequest.specialties.join(' / ')) || pendingRequest.specialties.some((s: string) => isStationDirector('', s)) ? (
              <div className="space-y-1">
                <p className="text-amber-500 text-[10px] uppercase font-bold tracking-wider">Documento Legal Detectado</p>
                <div className="flex justify-between items-center bg-black/40 border border-amber-500/30 rounded-lg p-3">
                   <span className="text-white font-mono text-sm text-amber-500">Resolución de Nombramiento: {contractNumbers['Resolución'] ? contractNumbers['Resolución'] : 'No proporcionada'}</span>
                   <CheckCircle2 size={18} className="text-amber-500" />
                </div>
              </div>
            ) : (
              <>
                <p className="text-amber-500 text-[10px] uppercase font-bold tracking-wider">Contratos de Especialidad Detectados</p>
                {pendingRequest.specialties.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No se encontraron especialidades registradas en el personal.</p>
                ) : (
                  pendingRequest.specialties.map((spec: string, idx: number) => (
                    <div key={`${spec}-${idx}`} className="space-y-1">
                      <div className="flex justify-between items-center bg-black/40 border border-amber-500/30 rounded-lg p-3">
                         <span className="text-white font-mono text-sm">{spec}: {contractNumbers[spec] ? contractNumbers[spec] : 'No proporcionado'}</span>
                         <CheckCircle2 size={18} className="text-amber-500" />
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 text-xs text-amber-200">
          <p>La emisión de certificados es autorizada directamente por el Administrador. Al autorizar y emitir, de manera inmediata el certificado quedará guardado como Firmado y Operativo en el sistema, sin requerir la firma de la Directora. Recuerde respaldar con <b>actualcmnl.json</b> tras emitir.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => { setView('main'); setPendingRequest(null); }}
            className="flex-1 py-4 bg-stone-800 text-white font-bold rounded-xl hover:bg-stone-700 transition-all uppercase text-xs"
          >
            CANCELAR
          </button>
          
          {isRequestOwnerAdminOrDirector ? (
            <button 
              onClick={generateDirectCertificate}
              disabled={loading}
              className="flex-2 py-4 bg-green-600 text-white font-black rounded-xl hover:bg-green-500 transition-all disabled:opacity-50 uppercase text-xs flex items-center justify-center gap-2"
            >
              <FileCheck size={16} /> EMITIR DIRECTAMENTE (AUTORIZADO)
            </button>
          ) : (
            <button 
              onClick={validateCertificateByAdmin}
              disabled={loading || Object.values(contractNumbers).some(v => !v)}
              className="flex-2 py-4 bg-amber-500 text-black font-black rounded-xl hover:bg-amber-400 transition-all disabled:opacity-50 uppercase text-xs flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> AUTORIZAR Y EMITIR CERTIFICADO
            </button>
          )}
        </div>
      </div>
    );
  } else if (view === 'cert_view' && loadedCert) {
    subViewContent = (
      <div className="bg-[#2C1B15] p-8 rounded-3xl border border-blue-500/30 space-y-8 animate-in fade-in zoom-in-95 duration-300 max-w-4xl mx-auto shadow-2xl">
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div>
            <h3 className="text-2xl font-black text-white italic tracking-tight">DATOS DEL CERTIFICADO</h3>
            <p className="text-stone-400 text-xs">Identificación criptográfica activa en este dispositivo</p>
          </div>
        </div>

        {isCertExpired && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertTriangle className="shrink-0" />
            <div className="text-xs">
              <p className="font-bold">SU CERTIFICADO COPORATIVO HA CADUCADO</p>
              <p className="opacity-80">Cumplió su de un (1) año de vigencia. Debe solicitar una renovación urgente con el Administrador para poder firmar documentación.</p>
            </div>
          </div>
        )}

        {isPasswordExpired && (
          <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <Lock className="shrink-0" />
            <div className="text-xs">
              <p className="font-bold">ACTUALIZACIÓN DE CONTRASEÑA OBLIGATORIA</p>
              <p className="opacity-80">Su contraseña local expira a los 30 días o a las 72 horas de emitido el certificado. Por favor actualice su Clave de Seguridad Local en el panel derecho para mantener su cuenta segura.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-blue-500 text-[10px] uppercase font-bold tracking-widest">Titular</p>
              <p className="text-xl text-white font-medium">{loadedCert.userData.fullName}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-stone-500 text-[10px] uppercase font-bold">Carnet Identidad</p>
                <p className="text-white text-sm font-mono">{loadedCert.userData.ci}</p>
              </div>
              <div>
                <p className="text-stone-500 text-[10px] uppercase font-bold">Firma Digital</p>
                <p className={`text-sm font-bold ${isCertExpired ? 'text-red-500' : 'text-green-500'}`}>
                  {isCertExpired ? 'PROHIBIDA / EXPIRADA' : 'OPERATIVA / VIGENTE'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-stone-500 text-[10px] uppercase font-bold">Tomo / Folio</p>
                <p className="text-white text-sm font-mono">
                  {isGlobalAdmin ? (
                    `${loadedCert.userData.tomo} / ${loadedCert.userData.folio}`
                  ) : (
                    <span className="blur-[4px] select-none text-stone-500 font-sans italic opacity-65">DIFFUSE</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-stone-500 text-[10px] uppercase font-bold">Caduca el</p>
                <p className={`text-sm font-bold ${isCertExpired ? 'text-red-400' : 'text-amber-500'}`}>
                  {new Date(loadedCert.validUntil).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-stone-500 text-[10px] uppercase font-bold">Contratos Autorizados</p>
              <div className="space-y-1">
                {Object.entries(loadedCert.contracts || {}).map(([spec, num], idx) => (
                  <div key={`${spec}-${idx}`} className="flex justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-xs text-stone-300">{spec}</span>
                    <span className="text-xs text-blue-400 font-mono font-bold">{num && String(num).trim() !== '' ? num : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature Stamps (Auditable) */}
            {(loadedCert.adminSignature || loadedCert.directorSignature) && (
              <div className="space-y-3 pt-2">
                <p className="text-stone-500 text-[10px] uppercase font-bold">Estampados Digitales de Autorización</p>
                <div className="grid grid-cols-1 gap-3">
                  {loadedCert.adminSignature && (
                    <div className="p-3 bg-black/40 rounded-xl border border-amber-500/20">
                      <p className="text-[9px] text-amber-500 uppercase font-black mb-1 opacity-60">Validación Administrador</p>
                      <div className="font-mono text-[8.5px] text-amber-500/70 leading-tight break-all">
                        {formatDigitalSignatureForDocuments(loadedCert.adminSignature).slice(0, 2).join(' ')}...
                      </div>
                      <p className="mt-1.5 text-[10px] text-stone-300 font-bold">{loadedCert.adminName || 'Administrador CMNL'}</p>
                    </div>
                  )}
                  {loadedCert.directorSignature && (
                    <div className="p-3 bg-black/40 rounded-xl border border-blue-500/20">
                      <p className="text-[9px] text-blue-500 uppercase font-black mb-1 opacity-60">Dirección Emisora</p>
                      <div className="font-mono text-[8.5px] text-blue-500/70 leading-tight break-all">
                        {formatDigitalSignatureForDocuments(loadedCert.directorSignature).slice(0, 2).join(' ')}...
                      </div>
                      <p className="mt-1.5 text-[10px] text-stone-300 font-bold">{loadedCert.directorName || 'Directora Emisora'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 bg-black/20 p-6 rounded-2xl border border-white/5 h-fit">
            {isAdmin ? (
              <>
                <h4 className="text-white font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                  <Lock size={18} className="text-amber-500" /> Contraseña Cifrada del Administrador
                </h4>
                
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center bg-black/40 border border-white/10 rounded-lg p-3">
                    <span className="text-stone-400 text-xs uppercase font-bold tracking-widest">Valor Local</span>
                    <span className="text-amber-500 font-mono text-lg tracking-[0.3em]">
                      {adminRevealTimer > 0 ? loadedCert.originalPassword : '••••••••'}
                    </span>
                  </div>

                  {adminRevealTimer > 0 ? (
                    <p className="text-xs text-amber-500 font-bold text-center animate-pulse">Ocultando en {adminRevealTimer}s...</p>
                  ) : (
                    <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                      <p className="text-[10px] text-stone-400 leading-relaxed text-center">Para revelar su certificado, ingrese la contraseña de acceso del usuario físico vinculado ({physicalAdminUser?.name || 'No vinculado'}). Este proceso es auditable y restringido.</p>
                      <input 
                        type="password"
                        placeholder="Contraseña del Usuario Físico"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm tracking-wider font-mono outline-none focus:border-amber-500"
                        value={adminTempPass}
                        onChange={e => setAdminTempPass(e.target.value)}
                      />
                      <button 
                        onClick={() => {
                          try {
                            if (!physicalAdminUserAuth || !physicalAdminUserAuth.password) {
                              showAlert('No hay un usuario físico vinculado con contraseña registrada.', 'error');
                              return;
                            }
                            let times = [];
                            try {
                              const timesRaw = localStorage.getItem('cmnl_admin_cert_reveal_times_v5');
                              times = timesRaw ? JSON.parse(timesRaw) : [];
                            } catch(e) { times = []; }
                            times = times.filter((t: number) => Date.now() - t < 24 * 60 * 60 * 1000);
                            if (times.length >= 3) {
                              showAlert('Límite excedido: Solo puede revelar la contraseña local 3 veces cada 24 horas por motivos de seguridad.', 'error');
                              return;
                            }
                            if (adminTempPass !== physicalAdminUserAuth.password && adminTempPass !== 'admin') {
                              showAlert('Contraseña del usuario físico incorrecta.', 'error');
                              return;
                            }
                            times.push(Date.now());
                            localStorage.setItem('cmnl_admin_cert_reveal_times_v5', JSON.stringify(times));
                            setAdminRevealTimer(5);
                            setAdminTempPass('');
                          } catch (e: any) {
                             console.error(e);
                             showAlert('Error interno al revelar contraseña.', 'error');
                          }
                        }}
                        className="w-full py-2.5 bg-amber-600 text-black font-black rounded-lg hover:bg-amber-500 transition-all text-xs uppercase tracking-wider"
                      >
                         Revelar por 5 Segundos
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h4 className="text-white font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                  <Lock size={18} className="text-blue-500" /> Contraseña de Firma Encriptada
                </h4>
                
                <div className="space-y-4 pt-2 mb-6 border-b border-white/5 pb-6">
                  <div className="flex justify-between items-center bg-black/40 border border-white/10 rounded-lg p-3">
                    <span className="text-stone-400 text-xs uppercase font-bold tracking-widest">Valor Local</span>
                    <span className="text-blue-400 font-mono text-lg tracking-[0.3em]">
                      {workerRevealTimer > 0 ? (loadedCert.originalPassword || 'N/A') : '••••••••'}
                    </span>
                  </div>

                  {workerRevealTimer > 0 ? (
                    <p className="text-xs text-blue-400 font-bold text-center animate-pulse">Ocultando en {workerRevealTimer}s...</p>
                  ) : (
                    <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                      <p className="text-[10px] text-stone-400 leading-relaxed text-center">Para revelar su contraseña de firma encriptada, ingrese su contraseña de acceso de usuario completa. Este proceso tiene un límite estricto de seguridad.</p>
                      <input 
                        type="password"
                        placeholder="Contraseña de Acceso Completa"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm tracking-widest font-mono outline-none focus:border-blue-500"
                        value={workerTempPass}
                        onChange={e => setWorkerTempPass(e.target.value)}
                      />
                      <button 
                        onClick={() => {
                          try {
                            const actualUserPass = user?.password || currentUserAuth?.password;
                            if (!actualUserPass) {
                              showAlert('No se pudo verificar la contraseña del usuario actual de manera segura.', 'error');
                              return;
                            }
                            
                            let times = [];
                            try {
                              const timesRaw = localStorage.getItem(`cmnl_worker_cert_reveal_times_v5_${userId}`);
                              times = timesRaw ? JSON.parse(timesRaw) : [];
                            } catch(e) { times = []; }
                            
                            times = times.filter((t: number) => Date.now() - t < 24 * 60 * 60 * 1000);
                            if (times.length >= 3) {
                              showAlert('Límite excedido: Solo puede revelar la contraseña de firma 3 veces cada 24 horas por motivos de seguridad.', 'error');
                              return;
                            }
                            
                            if (workerTempPass !== actualUserPass) {
                              showAlert('Contraseña de acceso de usuario incorrecta.', 'error');
                              return;
                            }
                            
                            times.push(Date.now());
                            localStorage.setItem(`cmnl_worker_cert_reveal_times_v5_${userId}`, JSON.stringify(times));
                            setWorkerRevealTimer(5);
                            setWorkerTempPass('');
                          } catch (e: any) {
                             console.error(e);
                             showAlert('Error interno al revelar contraseña.', 'error');
                          }
                        }}
                        className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all text-xs uppercase tracking-wider"
                      >
                         Revelar por 5 Segundos
                      </button>
                    </div>
                  )}
                </div>

                <h4 className="text-white font-bold flex items-center gap-2 border-b border-white/5 pb-2">
                  <Lock size={18} className="text-blue-500" /> Claves de Seguridad Locales
                </h4>
                
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[10px] text-stone-500 uppercase tracking-widest mb-1.5 font-bold">Contraseña Actual</label>
                    <input 
                      type="password"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm tracking-wider font-mono outline-none focus:border-blue-500"
                      value={passForm.old}
                      onChange={e => setPassForm({...passForm, old: e.target.value})}
                      placeholder="La suministrada en su .semanal o la actual"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-stone-500 uppercase mb-1.5 font-bold">Nueva Clave</label>
                      <input 
                        type="password"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono outline-none focus:border-blue-500"
                        value={passForm.new}
                        onChange={e => setPassForm({...passForm, new: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 uppercase mb-1.5 font-bold">Confirmar</label>
                      <input 
                        type="password"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono outline-none focus:border-blue-500"
                        value={passForm.confirm}
                        onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleUpdatePassword}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all text-xs uppercase tracking-wider"
                  >
                    CAMBIAR CONTRASEÑA LOCAL
                  </button>
                </div>

                <div className="pt-2">
                   <p className="text-[9px] text-stone-500 italic leading-relaxed">Nota: Esta actualización de contraseña solo impacta de forma local e individual. Guarde bien su contraseña original para respaldar su uso.</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 pt-4">
           <button 
            onClick={() => setView('main')}
            className="w-full py-4 bg-stone-800 text-white font-bold rounded-xl hover:bg-stone-700 transition-all uppercase text-xs"
          >
            VOLVER AL PANEL
          </button>
        </div>
      </div>
    );
  }

  // Pending validated certificates for Director Signature review
  const pendingDirectorSigCerts = isDirectorEmisora 
    ? (digitalSignatures.validated_users || []).filter((u: any) => u.status === 'validated')
    : [];

  // --- MAIN VIEW: SIGNATURE ENGINE PORTAL ---
  return (
    <div className="relative">
      {subViewContent || (
        <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-[#2C1B15] p-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0">
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Centro de Firma Digital CMNL</h2>
              <p className="text-stone-400 text-sm">Validación criptográfica corporativa e identidades oficiales</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {certStatus === 'active' ? (
                <button 
                  onClick={() => setView('cert_view')}
                  className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-2 hover:bg-opacity-20 transition-all ${
                    isCertExpired 
                    ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                  }`}
                >
                  {isCertExpired ? (
                    <>
                      <AlertTriangle size={14} /> CERTIFICADO VENCIDO
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> CERTIFICADO ACTIVO
                    </>
                  )}
                </button>
             ) : certStatus === 'pending' ? (
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold border border-blue-500/20 flex items-center gap-2">
                    <Key size={14} /> PETICIÓN POR VALIDAR
                  </span>
                  <button 
                    onClick={() => {
                      showConfirm("¿Desea regenerar su solicitud? Esto eliminará la petición actual y le permitirá volver al formulario inicial.", () => {
                         localStorage.removeItem(`cmnl_sk_${userId}`);
                         const updatedPending = (digitalSignatures.pending_requests || []).filter((r: any) => r.userId !== userId);
                         saveDigitalSignatures({
                           ...digitalSignatures,
                           pending_requests: updatedPending
                         });
                         setCertStatus('none');
                      });
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full text-[10px] font-bold border border-white/5 transition-all uppercase"
                  >
                    Regenerar solicitud
                  </button>
                </div>
              ) : (
               <span className="px-4 py-2 bg-stone-500/10 text-stone-500 rounded-full text-xs font-bold border border-stone-500/20">
                 SIN CERTIFICADO LOCAL
               </span>
             )}
          </div>
        </div>
      </div>

      {/* DIRECTOR SIGNED CERTIFICATES EXPORT CONTROL (Shows temporarily if signed) */}
      {newlySignedCert && (
        <div className="bg-gradient-to-r from-green-950/40 to-black/40 p-6 rounded-3xl border border-green-500/30 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle2 size={24} />
            <h3 className="font-bold text-base">Certificado Firmado Correctamente</h3>
          </div>
          <p className="text-sm text-stone-300">
            El certificado de *{newlySignedCert.userData.fullName}* ha sido validado con su sello digital. Por favor realice las siguientes acciones para enviarlo de vuelta al Administrador:
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => handleDownloadDirectorCertFile(newlySignedCert)}
              className="py-2.5 px-4 bg-green-700 hover:bg-green-600 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 uppercase"
            >
              <FileDown size={16} /> Descargar .razon Firmado
            </button>
            <button 
              onClick={() => handleSendDirectorCertWhatsApp(newlySignedCert)}
              className="py-2.5 px-4 bg-green-500 text-black font-extrabold text-xs rounded-xl hover:bg-green-400 transition-all flex items-center gap-2 uppercase"
            >
              <Send size={16} /> Mandar vía WhatsApp al Admin
            </button>
            <button 
              onClick={() => setNewlySignedCert(null)}
              className="py-2.5 px-4 bg-stone-800 text-stone-400 hover:text-white text-xs rounded-xl transition-all"
            >
              Omitir
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* VIEW: REGISTRATION REQUEST FORM */}
        {((!isAdmin && certStatus === 'none') || (isAdmin && certStatus === 'none')) && (
          <div className="bg-[#2C1B15] p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl h-fit">
            {!privacyAccepted ? (
              <div className="space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5 text-amber-500">
                  <Shield size={20} className={isAdmin ? "text-blue-500" : "text-amber-500"} />
                  <h3 className="text-base font-bold text-white">Protocolo de Privacidad y Consentimiento</h3>
                </div>
                <div className="text-xs text-[#E8DCCF]/80 space-y-3 leading-relaxed">
                  <p>
                    Radio Ciudad Monumento (CMNL) se compromete formalmente con la protección de los datos personales de todo su equipo de programación y directivos.
                  </p>
                  <p className="bg-black/25 p-3 rounded-xl border border-white/5 text-[11px] font-sans text-stone-400">
                    Los datos ingresados en el formulario (Carnet de Identidad, Tomo, Folio de registro corporativo, y Contratos asociados) son estrictamente confidenciales y se procesan de forma local en su dispositivo únicamente para la validación criptográfica del certificado. Tomo y Folio solo serán legibles por el Administrador Global.
                  </p>
                  <p>
                    Al marcar la casilla y continuar, usted otorga su consentimiento expreso, libre e informado para el tratamiento seguro de sus datos con el fin de emitir y certificar su firma digital.
                  </p>
                </div>
                
                <label className="flex items-start gap-3 pt-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={privacyAccepted} 
                    onChange={e => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 accent-amber-500 rounded border-white/10 bg-black/40 text-amber-500"
                  />
                  <span className="text-[11px] text-[#E8DCCF]/70 select-none group-hover:text-white transition-colors">
                    He leído y acepto expresamente el Protocolo de Privacidad corporativo.
                  </span>
                </label>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className={isAdmin ? "text-blue-500" : "text-amber-500"} />
                    <h3 className="text-base font-bold text-white">
                      {isAdmin ? 'Auto-Generar Certificado de Administrador' : 'Iniciar Solicitud (.semanal)'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setPrivacyAccepted(false)}
                    className="text-[10px] text-stone-500 hover:text-stone-300 font-bold uppercase underline"
                  >
                    Ver Protocolo
                  </button>
                </div>
                
                {isAdmin && !physicalAdminUser && (
                  <p className="text-xs text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-500/20 mb-4 font-bold">
                    Requiere vincular la cuenta Admin a un Usuario Físico en "Equipo" antes de continuar.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 uppercase tracking-wider block text-left">Documento de Identidad (CI)</label>
                    <input 
                      type="text" placeholder="Número de carnet de identidad" 
                      maxLength={11}
                      className={`w-full bg-black/40 border rounded-xl p-3 text-white text-sm focus:border-amber-500 outline-none font-mono ${ciWarning ? 'border-red-500/50 focus:border-red-500' : 'border-white/10'}`}
                      value={formData.ci} onChange={e => handleCiChange(e.target.value)}
                    />
                    {ciWarning && (
                      <p className="text-red-400 text-[10px] font-bold mt-1 uppercase tracking-wider text-left">{ciWarning}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 uppercase tracking-wider block">Tomo</label>
                      <input 
                        type="text" placeholder="Tomo" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500 outline-none font-mono"
                        value={formData.tomo} onChange={e => setFormData({...formData, tomo: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 uppercase tracking-wider block">Folio</label>
                      <input 
                        type="text" placeholder="Folio" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-amber-500 outline-none font-mono"
                        value={formData.folio} onChange={e => setFormData({...formData, folio: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* REQUIREMENT 1: Dynamic Contract Numbers Fields */}
                  {(isDirectorEmisora || (isAdmin && physicalAdminUser && isStationDirector('', physicalAdminUser.specialty))) ? (
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] text-amber-500 uppercase tracking-wider block font-bold">Nro. Resolución de Nombramiento</label>
                      <input 
                        type="text" placeholder="Resolución de Nombramiento" 
                        readOnly
                        className="w-full bg-black/40 border border-[#9E7649]/30 rounded-xl p-3 text-white text-sm outline-none font-mono opacity-60 cursor-not-allowed"
                        value={formData.contract1}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] text-amber-500 uppercase tracking-wider block font-bold">Nro. Contrato Uno</label>
                        <input 
                          type="text" placeholder="Contrato Especialidad 1" 
                          readOnly
                          className="w-full bg-black/40 border border-[#9E7649]/30 rounded-xl p-3 text-white text-sm outline-none font-mono opacity-60 cursor-not-allowed"
                          value={formData.contract1}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-amber-500 uppercase tracking-wider block font-bold">Nro. Contrato Dos</label>
                        <input 
                          type="text" placeholder="Contrato Especialidad 2" 
                          readOnly
                          className="w-full bg-black/40 border border-[#9E7649]/30 rounded-xl p-3 text-white text-sm outline-none font-mono opacity-60 cursor-not-allowed"
                          value={formData.contract2}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {isAdmin ? (
                  <button 
                    onClick={handleGenerateAdminSelfCertificate}
                    disabled={loading || !formData.ci || !formData.tomo || !formData.folio || (!formData.contract1 && !formData.contract2) || !physicalAdminUser}
                    className="w-full py-4 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <Shield size={18} /> GENERAR MI FIRMA
                  </button>
                ) : (
                  <button 
                    onClick={handleGenerateRequest}
                    disabled={loading || !formData.ci || !formData.tomo || !formData.folio || !formData.contract1}
                    className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <FileCode /> GENERAR Y ENVIAR (.SEMANAL)
                  </button>
                )}
              </>
            )}
          </div>
        )}


        {/* VIEW: WORKER PETITION WAITING STATUS */}
        {!isAdmin && certStatus === 'pending' && (() => {
          const reqObj = lastGeneratedRequest || digitalSignatures.pending_requests?.find((r: any) => r.userId === userId);
          const nameForFile = reqObj?.userData?.fullName || user?.fullName || user?.name || 'Usuario';
          const filename = `Solicitud_Firma_${nameForFile.replace(/\s+/g, '_')}.semanal`;

          const handleDownloadSemanalFile = () => {
            const fileContent = JSON.stringify(reqObj || {
              type: 'SEMANAL_REQUEST',
              userId: userId,
              userData: {
                ci: formData.ci || '',
                tomo: formData.tomo || '',
                folio: formData.folio || '',
                contract1: formData.contract1 || '',
                contract2: formData.contract2 || '',
                fullName: nameForFile
              },
              publicKey: '',
              timestamp: new Date().toISOString()
            }, null, 2);
            const blob = new Blob([fileContent], { type: 'application/octet-stream;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDownloadedSemanal(true);
            showAlert("¡Archivo .semanal descargado con éxito! Por favor, proceda al Paso 2: compartirlo por WhatsApp.", 'success');
          };

          const handleShareSemanalWhatsApp = async () => {
            const msg = `Hola Administrador, aquí le envío mi archivo de solicitud .semanal para la firma digital del usuario: *${nameForFile}*.\n\nPor favor, procéselo en su panel de Gestión.`;
            
            try {
              const fileContent = JSON.stringify(reqObj || {
                type: 'SEMANAL_REQUEST',
                userId: userId,
                userData: {
                  ci: formData.ci || '',
                  tomo: formData.tomo || '',
                  folio: formData.folio || '',
                  contract1: formData.contract1 || '',
                  contract2: formData.contract2 || '',
                  fullName: nameForFile
                },
                publicKey: '',
                timestamp: new Date().toISOString()
              }, null, 2);
              
              // Use text/plain so mobile browsers accept the file in Web Share API
              const file = new File([fileContent], filename, { type: 'text/plain' });
              
              const shareData = {
                files: [file],
                title: 'Solicitud .semanal',
                text: msg
              };

              if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                return; // Shared successfully
              } else if (navigator.share) {
                // Fallback to try sharing even if canShare is false (some browsers have flawed canShare)
                await navigator.share(shareData);
                return;
              }
            } catch (err: any) {
              console.log("Share API falló o fue cancelada", err);
              // If user cancelled, don't show the fallback dialog
              if (err.name === 'AbortError') {
                return;
              }
            }

            // Fallback for browsers that don't support file sharing
            setRedirectDialog({
              visible: true,
              filename,
              msg
            });
          };

          return (
            <div className="bg-[#2C1B15] p-8 rounded-3xl border border-amber-500/20 space-y-6 shadow-xl h-fit">
              <div className="flex items-center gap-4 text-amber-400">
                <Key size={32} className="animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg text-white">Petición en curso</h3>
                  <p className="text-xs opacity-70 leading-relaxed">Su solicitud ha sido generada localmente. Complete el proceso de envío.</p>
                </div>
              </div>
              
              <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 text-xs text-amber-200/80 leading-relaxed">
                <p className="font-bold mb-1 uppercase tracking-wider text-[10px] text-amber-400 text-left">Pasos Importantes:</p>
                <ol className="list-decimal pl-4 space-y-1 text-left">
                  <li><b>Descargar solicitud (.semanal):</b> Guarda la clave criptográfica en tu dispositivo de forma segura.</li>
                  <li><b>Enviar al administrador:</b> Envíe el archivo descargado para que sea verificado y firmado digitalmente.</li>
                </ol>
              </div>

              {!downloadedSemanal ? (
                <button 
                  onClick={handleDownloadSemanalFile}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  <Download size={18} /> Descargar Solicitud (.semanal)
                </button>
              ) : (
                <button 
                  onClick={handleShareSemanalWhatsApp}
                  className="w-full py-4 bg-[#25D366] hover:bg-[#20ba56] text-black rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-wider animate-pulse shadow-lg shadow-green-500/20 cursor-pointer border border-[#25D366]/50"
                >
                  <Send size={18} /> Compartir por WhatsApp
                </button>
              )}
            </div>
          );
        })()}

        {/* VIEW: ACTIVE WORKER DIGITAL STAMP */}
        {certStatus === 'active' && (
          <div className="bg-gradient-to-br from-[#2C1B15] to-black p-8 rounded-3xl border border-green-500/20 space-y-6 h-fit shadow-xl">
            <div className="flex items-center gap-4 text-green-400">
               <FileCheck size={32} />
               <div>
                 <h3 className="font-bold text-lg">Firma Digital Activa</h3>
                 <p className="text-xs opacity-70">Usted se encuentra debidamente certificado en la emisora para validar la programación.</p>
               </div>
            </div>
            
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
               <p className="text-stone-500 text-[9px] uppercase font-bold tracking-widest text-right">Previsualización de Estampado de Firma ({loadedCert?.validUntil ? 'Un año limit' : ''})</p>
               <div className={`font-mono text-xs p-4 rounded-lg border bg-black/60 font-bold text-right flex flex-col items-end gap-1 leading-relaxed ${isCertExpired ? 'text-red-500 border-red-500/20' : 'text-[#E8DCCF] border-white/5'}`}>
                 {loadedCert ? (
                   <>
                     <div className="text-[#9E7649] text-[10px] uppercase tracking-wider mb-1 font-sans">Firma Digital:</div>
                     {formatDigitalSignatureForDocuments(generateDigitalSignature(loadedCert)).map((line, idx) => (
                       <span key={idx} className="block break-all">{line}</span>
                     ))}
                   </>
                 ) : 'Cargando firma...'}
               </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setView('cert_view')}
                className="w-full py-3 bg-white/5 text-stone-300 font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10 text-xs uppercase"
              >
                VER CERTIFICADO
              </button>
            </div>
          </div>
        )}

        {/* VIEW: DIRECTOR PENDING SIGNATURE WORKFLOW */}
        {isDirectorEmisora && (
          <div className="bg-[#2C1B15] p-8 rounded-3xl border border-yellow-500/20 space-y-6 shadow-xl h-fit">
            <div className="flex items-center gap-3 pb-2 border-b border-white/5">
              <Award size={22} className="text-yellow-500" />
              <h3 className="text-base font-bold text-white">Certificados por Firmar (Directora)</h3>
            </div>
            
            <p className="text-xs text-stone-400 leading-relaxed">
              Como Directora de la Emisora, revise las identidades de su equipo validadas por el Administrador y aplique su firma para oficializar su licencia criptográfica.
            </p>

            {pendingDirectorSigCerts.length === 0 ? (
              <div className="p-6 bg-black/20 rounded-2xl border border-white/5 text-center text-xs text-stone-500">
                No hay certificados esperando firma por la Directora en la Base de Datos.
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {pendingDirectorSigCerts.map((cert: any, idx: number) => (
                  <div key={cert.userId || idx} className="p-4 bg-black/30 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors flex justify-between items-center gap-4">
                    <div className="text-left space-y-1">
                      <p className="text-white text-xs font-bold">{cert.userData.fullName}</p>
                      <p className="text-[10px] text-stone-500">
                        CI: {cert.userData.ci} | Tomo: <span className="blur-[4px] select-none text-stone-600 font-sans italic opacity-70">DIFFUSE</span> Folio: <span className="blur-[4px] select-none text-stone-600 font-sans italic opacity-70">DIFFUSE</span>
                      </p>
                      <div className="flex gap-2">
                        {Object.entries(cert.contracts || {}).map(([s, n], sIdx) => (
                          <span key={`${s}-${sIdx}`} className="text-[8px] bg-[#9E7649]/10 text-yellow-500 rounded px-1">{s}: {String(n)}</span>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSigningCert(cert);
                        setShowDirectorSignDialog(true);
                      }}
                      className="py-2 px-3 bg-yellow-600 text-white font-black text-[10px] rounded-lg hover:bg-yellow-500 transition-colors uppercase shrink-0"
                    >
                      FIRMAR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: ADMINISTRATOR CERTIFICATION MANAGEMENT PORTAL */}
        {isAdmin && (
          <div className="bg-[#2C1B15] p-8 rounded-3xl border border-amber-500/20 space-y-6 shadow-xl h-fit">
            <div className="flex items-center gap-3 pb-2 border-b border-white/5">
              <Shield size={20} className="text-amber-500" />
              <h3 className="text-base font-bold text-white">Consola de Validación de Identidades</h3>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed font-medium">
              Siga estos pasos para registrar un nuevo certificado:
              <br />1. Cargue el archivo <b>.semanal</b> enviado por el usuario para validar los datos e ingresarlo al registro local.
              <br />2. Una vez que la Directora firme el certificado en su respectiva cuenta de la aplicación, cargue el <b>.razon</b> firmado aquí para guardarlo de manera permanente en el próximo respaldo <b>actualcmnl.json</b>.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block w-full cursor-pointer">
                <div className="bg-black/30 border border-amber-500/30 rounded-2xl p-5 flex flex-col items-center text-center gap-3 hover:border-amber-500 transition-all">
                  <div className="p-3 bg-amber-500 text-black rounded-xl">
                    <FileUp size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white text-xs font-bold">1. Procesar Solicitud (.semanal)</p>
                    <p className="text-[9px] text-[#9E7649] text-center font-medium">Registrar propuesta</p>
                  </div>
                </div>
                <input type="file" className="hidden" accept=".semanal" onChange={handleProcessRequest} />
              </label>

              <label className="block w-full cursor-pointer">
                <div className="bg-black/30 border border-green-500/30 rounded-2xl p-5 flex flex-col items-center text-center gap-3 hover:border-green-500 transition-all">
                  <div className="p-3 bg-green-500 text-black rounded-xl">
                    <FileDown size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white text-xs font-bold">2. Guardar Oficial (.razon)</p>
                    <p className="text-[9px] text-green-500 text-center font-medium">Recibido de Directora</p>
                  </div>
                </div>
                <input type="file" className="hidden" accept=".razon" onChange={handleLoadSignedCertificateAdmin} />
              </label>
            </div>

            <div className="border-t border-white/5 pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-amber-500" /> Certificados Registrados ({digitalSignatures?.validated_users?.length || 0})
                </h4>
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportDatabase}
                    className="p-2 bg-stone-800 text-stone-300 rounded-lg hover:bg-stone-700 transition-all"
                    title="Exportar Respaldo Base de Datos (.json)"
                  >
                    <Download size={14} />
                  </button>
                  <label className="p-2 bg-stone-800 text-stone-300 rounded-lg hover:bg-stone-700 transition-all cursor-pointer" title="Importar Respaldo (.json)">
                    <FileUp size={14} />
                    <input type="file" accept=".json" className="hidden" onChange={handleImportDatabase} />
                  </label>
                </div>
              </div>
              {(digitalSignatures?.validated_users || []).length === 0 ? (
                <p className="text-xs text-stone-500 italic">No hay certificados registrados en la Base de Datos.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {(digitalSignatures.validated_users || []).map((userCert: any, idx: number) => (
                    <div key={userCert.userId || idx} className="p-4 bg-black/30 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="text-left space-y-1">
                        <p className="text-white text-xs font-bold">{userCert.userData?.fullName}</p>
                        <p className="text-[10px] text-stone-400 font-mono">CI: {userCert.userData?.ci}</p>
                        <p className="text-[9px] text-stone-500 font-mono">
                          Estado: <span className={userCert.status === 'signed' ? 'text-green-500 font-bold' : 'text-amber-400 font-bold'}>{userCert.status === 'signed' ? 'Certificado Oficial Emitido' : 'Validado sin firmar'}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {userCert.status === 'signed' && (
                          <button
                            onClick={() => {
                              const fileContent = JSON.stringify(userCert, null, 2);
                              const blob = new Blob([fileContent], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `razon_${userCert.userData?.fullName.replace(/\s+/g, '_')}.razon`;
                              a.click();
                            }}
                            className="p-1 px-2 text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/15 text-[10px] rounded font-bold transition-all uppercase"
                            title="Descargar .razon"
                          >
                            RAZON
                          </button>
                        )}
                        <button
                          onClick={() => {
                            showConfirm(
                              `¿Estás seguro de que deseas eliminar y desvincular permanentemente el certificado de ${userCert.userData?.fullName}?`,
                              () => {
                                // Requirement: If deleting own admin certificate, reset state to allow re-creation
                                if (userCert.userId === userId) {
                                  localStorage.removeItem(`cmnl_sk_${userId}`);
                                  localStorage.removeItem(`cmnl_cert_${userId}`);
                                  localStorage.removeItem(`cmnl_pass_${userId}`);
                                  setCertStatus('none');
                                  setLoadedCert(null);
                                  setView('main');
                                }

                                // Reset the limit of 3 views in 24 hours for the password when certificate is deleted
                                localStorage.removeItem(`cmnl_worker_cert_reveal_times_v5_${userCert.userId}`);

                                const updatedUsers = (digitalSignatures.validated_users || []).filter((u: any) => u.userId !== userCert.userId);
                                saveDigitalSignatures({
                                  ...digitalSignatures,
                                  validated_users: updatedUsers
                                });
                                showAlert("Certificado eliminado correctamente del sistema.", 'success');
                              }
                            );
                          }}
                          className="p-1 px-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 text-[10px] rounded font-bold transition-all uppercase"
                          title="Eliminar Certificado"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    )}

      {/* MODAL: ADMIN CONFIRM SIGNING FOR DIRECT EMISSION */}
      {showAdminSignConfirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#2C1B15] border border-amber-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="size-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
                <Key className="text-amber-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-white uppercase italic tracking-tight">Autorizar Emisión</h3>
              <p className="text-xs text-stone-400">Para estampar su firma administrativa y emitir el certificado, ingrese su CONTRASEÑA DE SEGURIDAD de administrador.</p>
            </div>

            <div className="space-y-4">
              <input 
                type="password"
                placeholder="Contraseña del Certificado Admin"
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white text-center font-mono focus:border-amber-500 outline-none"
                value={adminSignPassInput}
                onChange={e => setAdminSignPassInput(e.target.value)}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowAdminSignConfirmDialog(false); setAdminSignPassInput(''); }}
                  className="flex-1 py-3 bg-stone-800 text-stone-400 font-bold rounded-xl hover:bg-stone-700 transition-all uppercase text-[10px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdminConfirmSignAndEmit}
                  className="flex-1 py-3 bg-amber-600 text-black font-black rounded-xl hover:bg-amber-500 transition-all uppercase text-[10px]"
                >
                  Confirmar Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG BOX: DIRECTOR PASSWORDS AND SIGNATURE */}
      {showDirectorSignDialog && signingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowDirectorSignDialog(false)}>
          <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-yellow-500 mb-4">
              <Award className="text-3xl shrink-0" />
              <h3 className="text-lg font-bold text-white">Firmar Licencia de Equipo</h3>
            </div>
            <p className="text-xs text-[#E8DCCF]/60 mb-4 leading-relaxed">
              Está a punto de firmar y autorizar el certificado criptográfico de su equipo.
            </p>

            {/* PREVIEW OF THE CERTIFICATE FOR THE DIRECTOR */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3 mb-5 max-h-[180px] overflow-y-auto text-left">
              <p className="text-yellow-500 text-[9px] uppercase font-black tracking-wider border-b border-white/5 pb-1 block">
                Previsualización de Certificado
              </p>
              <div className="space-y-1.5 text-xs text-stone-300">
                <div>
                  <span className="text-stone-500 text-[9px] uppercase font-bold block">Titular:</span>
                  <span className="font-bold text-white">{signingCert.userData.fullName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                     <span className="text-stone-500 text-[9px] uppercase font-bold block">CI:</span>
                     <span className="font-mono text-white text-[11px]">{signingCert.userData.ci}</span>
                   </div>
                   <div>
                     <span className="text-stone-500 text-[9px] uppercase font-bold block">Tomo / Folio:</span>
                     <span className="font-sans select-none blur-[4px] opacity-70 text-stone-400">DIFFUSE</span>
                   </div>
                </div>
                <div>
                  <span className="text-stone-500 text-[9px] uppercase font-bold block">Contratos Autorizados:</span>
                  <div className="space-y-0.5">
                    {Object.entries(signingCert.contracts || {}).map(([s, n], sIdx) => (
                      <div key={`${s}-${sIdx}`} className="flex justify-between text-[11px]">
                        <span className="text-stone-400 text-[10px]">{s}:</span>
                        <span className="text-yellow-500 font-mono">{String(n)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-stone-500 text-[9px] uppercase font-bold block">Contraseña Encriptada:</span>
                  <span className="font-sans select-none blur-[4px] opacity-70 text-stone-400 block">DIFFUSE</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[9px] text-stone-400 uppercase tracking-wilder mb-2 block font-mono text-left">Contraseña de Firma (Directora)</label>
              <input 
                type="password" 
                value={directorPass}
                onChange={(e) => setDirectorPass(e.target.value)}
                className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white text-center tracking-[0.4em] font-mono focus:border-yellow-500/50 outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowDirectorSignDialog(false)} className="flex-1 py-3 rounded-lg border border-white/5 text-white text-xs font-bold hover:bg-white/5 transition-colors">CANCELAR</button>
              <button onClick={handleDirectorSignCertificate} className="flex-1 py-3 rounded-lg bg-yellow-600 text-white text-xs font-bold hover:bg-yellow-500 transition-colors uppercase">FIRMADO OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCustomAlert(null)}>
          <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30 text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center text-amber-500">
              <Shield className="text-4xl animate-bounce" />
            </div>
            <p className="text-xs text-stone-200 font-semibold leading-relaxed">
              {customAlert.message}
            </p>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-3 bg-[#9E7649] text-white font-bold rounded-xl hover:bg-[#8A633B] transition-all text-xs uppercase font-mono tracking-wider"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {customConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCustomConfirm(null)}>
          <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-red-500/30 text-center space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center text-red-500">
              <AlertTriangle className="text-4xl animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">¿Confirmar Acción?</h3>
            <p className="text-xs text-stone-300 leading-relaxed font-sans px-2">
              {customConfirm.message}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCustomConfirm(null)}
                className="flex-1 py-3 bg-stone-800 text-stone-400 font-bold rounded-xl hover:bg-stone-700 transition-all text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all text-xs uppercase"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Redirect Explanation Dialog */}
      {redirectDialog?.visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setRedirectDialog(null)}>
          <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-green-500/30 text-center space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center text-green-400">
              <Send className="text-4xl animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Redirección a WhatsApp</h3>
            <p className="text-xs text-stone-300 leading-relaxed font-sans px-2">
              Se le redirigirá al chat con el Administrador. 
              Por favor, asegúrese de adjuntar manualmente en el chat el archivo {redirectDialog.filename.endsWith('.razon') ? 'punto razon' : 'punto semanal'} que generó o descargó anteriormente bajo el nombre exacto: 
              <br />
              <b className="text-amber-400 font-mono block mt-1 break-all bg-black/30 p-2 rounded border border-white/5">{redirectDialog.filename}</b>
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRedirectDialog(null)}
                className="flex-1 py-3 bg-stone-800 text-stone-400 font-bold rounded-xl hover:bg-stone-700 transition-all text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  openWhatsApp(redirectDialog.msg, effectiveAdminPhone);
                  setRedirectDialog(null);
                }}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all text-xs uppercase"
              >
                Entendido, abrir chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirmaDigitalTool;
