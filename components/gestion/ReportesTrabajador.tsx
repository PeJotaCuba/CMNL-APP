import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Save, Clock, ArrowRight, FileCode, FileDown, Search, PenTool, Share2, Mail, Lock, ClipboardList } from 'lucide-react';
import { User, FP02Report, ProgramFicha, ConsolidatedPayment, ProgramCatalog, WorkLog } from '../../types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocRow, TableCell as DocCell, TextRun, AlignmentType, WidthType } from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStoredCertificate, getStoredPassword, generateDigitalSignature, checkSigningAuthorization } from '../../utils/signatureUtils';

interface Props {
  currentUser: User | null;
  fichas: ProgramFicha[];
  equipoData: any[]; 
  catalogo: ProgramCatalog[];
  consolidatedPayments: ConsolidatedPayment[];
  setConsolidatedPayments: React.Dispatch<React.SetStateAction<ConsolidatedPayment[]>>;
  getProgramRate: (name: string, role: string, level: string) => number;
  calculateTax: (amount: number) => number;
  reports: FP02Report[];
  isMatch: (name1: string, name2: string) => boolean;
  normalize: (s: string) => string;
  workLogs: WorkLog[];
  setWorkLogs: React.Dispatch<React.SetStateAction<WorkLog[]>>;
  workLogDate: string;
  setWorkLogDate: React.Dispatch<React.SetStateAction<string>>;
  workLogView: 'daily' | 'weekly' | 'monthly';
  setWorkLogView: React.Dispatch<React.SetStateAction<'daily' | 'weekly' | 'monthly'>>;
}

interface AdditionalPayment {
  id: string;
  userId: string;
  month: string; // e.g., '2026-05'
  role: string;  // e.g., 'Director', 'Locutor'
  concept: string; // "concepto"
  amount: number; // "importe"
  period: 'diario' | 'semanal' | 'mensual'; // "período"
}

export const ReportesTrabajador: React.FC<Props> = ({
  currentUser, fichas, equipoData, catalogo,
  consolidatedPayments, setConsolidatedPayments,
  getProgramRate, calculateTax, reports, isMatch, normalize,
  workLogs, setWorkLogs, workLogDate, setWorkLogDate, workLogView, setWorkLogView
}) => {
  const [activeTab, setActiveTab] = useState<'autogestion' | 'oficiales' | 'pagos'>('autogestion');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));
  const [signingReport, setSigningReport] = useState<FP02Report | null>(null);
  const [signPass, setSignPass] = useState('');
    const [pendingSignWarning, setPendingSignWarning] = useState<string | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMode, setDetailMode] = useState<'autogestion' | 'oficial'>('autogestion');
  const ADMIN_EMAIL = 'emisora@cmnl.cu';

  // State for additional payments
  const [additionalPayments, setAdditionalPayments] = useState<AdditionalPayment[]>(() => {
    try {
      const saved = localStorage.getItem('cmnl_additional_payments_json');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading additional payments:", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cmnl_additional_payments_json', JSON.stringify(additionalPayments));
  }, [additionalPayments]);

  const [openAddFormRole, setOpenAddFormRole] = useState<string | null>(null);
  const [newConcept, setNewConcept] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPeriod, setNewPeriod] = useState<'diario' | 'semanal' | 'mensual'>('mensual');

  const getDaysInViewedMonth = () => {
      const currentMonthPrefix = workLogDate.substring(0, 7);
      const parts = currentMonthPrefix.split('-');
      const yyyy = parseInt(parts[0]);
      const mm = parseInt(parts[1]);
      const daysInMonth = new Date(yyyy, mm, 0).getDate();
      
      const today = new Date();
      const [yearNow, monthNow] = [today.getFullYear(), today.getMonth() + 1];
      if (yyyy === yearNow && mm === monthNow) {
          return Math.max(0, today.getDate() - 1);
      }
      return daysInMonth;
  };

  const getPeriodMultiplier = (period: 'diario' | 'semanal' | 'mensual', daysCount: number) => {
      if (period === 'diario') return daysCount;
      if (period === 'semanal') return Math.ceil(daysCount / 7);
      return 1; // mensual is added once
  };

  const handleAddAdditionalPayment = (role: string) => {
      if (!currentUser) return;
      if (!newConcept.trim()) {
          alert('Por favor, introduzca un concepto.');
          return;
      }
      const amountNum = parseFloat(newAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
          alert('Por favor, introduzca un importe válido mayor a 0.');
          return;
      }

      const currentMonthPrefix = workLogDate.substring(0, 7);

      const newPayment: AdditionalPayment = {
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.username,
          month: currentMonthPrefix,
          role: role,
          concept: newConcept.trim(),
          amount: amountNum,
          period: newPeriod
      };

      setAdditionalPayments(prev => [...prev, newPayment]);
      setNewConcept('');
      setNewAmount('');
      setNewPeriod('mensual');
      setOpenAddFormRole(null);
  };

  const handleDeleteAdditionalPayment = (id: string) => {
      setAdditionalPayments(prev => prev.filter(ap => ap.id !== id));
  };

  // Persistence for signed reports (Local simulation)
  const [signedReports, setSignedReports] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('cmnl_signed_reports_json');
      if (saved) {
        const parsed = JSON.parse(saved);
        return (parsed && typeof parsed === 'object') ? parsed : {};
      }
    } catch (e) {
      console.error("Error loading signed reports:", e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('cmnl_signed_reports_json', JSON.stringify(signedReports));
  }, [signedReports]);

  const handleSignReport = () => {
    if (!currentUser || !signingReport) return;
    
    // Find the worker whose signature is being requested (should be the specialist in the report)
    const specialist = signingReport.especialidades.find(e => isMatch(e.nombre, currentUser.name));
    if (!specialist) {
        alert("Su nombre no figura en este reporte.");
        return;
    }

    const storedPass = getStoredPassword(currentUser.id);
    const cert = getStoredCertificate(currentUser.id);

    if (cert) {
        const authCheck = checkSigningAuthorization(currentUser.id);
        if (!authCheck.authorized) {
            alert(authCheck.reason);
            return;
        }
        if (authCheck.warning && !sessionStorage.getItem(`warn_acked_${currentUser.id}`)) {
            setPendingSignWarning(authCheck.warning);
            return;
        }
    }

    const effectivePass = storedPass || (cert ? cert.originalPassword : '') || '';

    // Fallback logic for Director/Coordinator authorized devices
    const isAuthorizedDevice = currentUser.role === 'director' || currentUser.role === 'coordinator' || currentUser.classification === 'Coordinador';
    
    // Original password calculation: 8 characters (name + CI)
    const ciPart = currentUser.ci || '';
    const namePart = currentUser.name.split(' ')[0] || '';
    const originalPass = (namePart.substring(0, 4) + ciPart.substring(0, 4)).toUpperCase().substring(0, 8);

    if (cert) {
        const issueDate = cert.issueDate ? new Date(cert.issueDate).getTime() : Date.now();
        
    }

    if (!cert) {
        if (isAuthorizedDevice) {
            if (signPass.toUpperCase() === originalPass) {
                // Generate a temporary signature using user data since we don't have the cert (using a mock/stable one for now)
                const mockCert = { 
                    userData: { 
                        fullName: currentUser.name, 
                        ci: currentUser.ci || '', 
                        tomo: currentUser.tomo || '0', 
                        folio: currentUser.folio || '0' 
                    }, 
                    contracts: {} 
                };
                const signature = generateDigitalSignature(mockCert);
                setSignedReports(prev => ({ ...prev, [signingReport.id]: `[AUTH] ${signature}` }));
                setShowSignDialog(false);
                setSignPass('');
                setSigningReport(null);
                alert("Reporte firmado mediante autorización de dirección.");
                return;
            } else {
                alert("Contraseña original incorrecta o equipo no certificado.");
                return;
            }
        } else {
            alert("No tiene un certificado de firma digital cargado en este equipo.");
            return;
        }
    }

    if (signPass !== effectivePass) {
        alert("Contraseña de firma incorrecta.");
        return;
    }

    const signature = generateDigitalSignature(cert);
    setSignedReports(prev => ({ ...prev, [signingReport.id]: signature }));
    
    setShowSignDialog(false);
    setSignPass('');
    setSigningReport(null);
    alert("Reporte firmado exitosamente.");
  };

  const shareSignedReport = (report: FP02Report) => {
    const signature = signedReports[report.id];
    if (!signature) return;

    const signatureData = {
        type: 'REPORT_SIGNATURE',
        reportId: report.id,
        userName: currentUser?.name,
        userId: currentUser?.id,
        signature: signature,
        program: report.programa,
        date: report.fecha,
        timestamp: new Date().toISOString()
    };

    const fileContent = JSON.stringify(signatureData, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firma_${report.programa.replace(/\s+/g, '_')}_${report.fecha}.json`;
    a.click();

    const msg = `Hola Administrador, adjunto el archivo JSON de mi firma digital para el reporte de emisión de "${report.programa}" del día ${report.fecha}.\n\nNombre: ${currentUser?.name}\nToken: ${signature.substring(0, 32)}...`;
    
    // Check if web share is available, else fallback or just notice
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const isDirectorUser = currentUser?.role === 'director' || currentUser?.classification === 'Director' || currentUser?.classification === 'Directora';

  const isReportFullySignedByOthers = (report: FP02Report) => {
      if (!currentUser) return false;
      const otherSpecialists = report.especialidades.filter(e => e.nombre && !isMatch(e.nombre, currentUser.name));
      const signedUserIds = Object.keys(report.signatures || {});
      return otherSpecialists.every(esp => 
          signedUserIds.some(uid => {
              const u = equipoData.find(m => m.id === uid || m.username === uid);
              return u && isMatch(u.name, esp.nombre);
          })
      );
  };

  const handleDirectorSignAndShare = async (report: FP02Report) => {
      // First sign the report
      setSigningReport(report);
      setShowSignDialog(true);
      // Signature happens in handleSignReport which is called from the dialog
  };

  const generateAndSharePDF = (report: FP02Report) => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Modelo FP-02", 14, 22);
      doc.setFontSize(12);
      doc.text(`Fecha: ${report.fecha}`, 14, 32);
      doc.text(`Emisora: ${report.emisora}`, 14, 40);
      doc.text(`Programa: ${report.programa}`, 14, 48);

      const tableData = report.especialidades.filter(e => e.nombre).map(esp => {
          const userMatch = equipoData.find(m => isMatch(m.name, esp.nombre));
          // Use either existing signatures in report object or the locally stored one if just signed
          const signature = (report.signatures?.[userMatch?.id || userMatch?.username]) || (isMatch(esp.nombre, currentUser?.name || '') ? signedReports[report.id] : null);
          let displaySig = 'SIN FIRMAR';
          if (signature) {
              const sigLines = signature.startsWith('[AUTH]') ? [signature] : (signature.length > 50 ? [signature.substring(0, 32) + '...', signature.substring(32, 64) + '...'] : [signature]);
              displaySig = sigLines.join('\n');
          }
          return [esp.rol, esp.nombre, displaySig];
      });

      autoTable(doc, {
          startY: 55,
          head: [['Especialidad', 'Nombre y Apellidos', 'Firma Digital']],
          body: tableData,
      });

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `Reporte_${report.programa}_${report.fecha}.pdf`;
      a.click();

      // Share via WhatsApp
      const msg = `Hola Administrador, adjunto el PDF del reporte de emisión de "${report.programa}" del día ${report.fecha}, ya firmado por todo el equipo técnico y por mí como director.\n\nAtentamente,\n${currentUser?.name}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };


  // Auto-set view to daily and prevent weekly
  useEffect(() => {
    if (workLogView === 'weekly') {
      setWorkLogView('daily');
    }
  }, [workLogView, setWorkLogView]);

  // Determine user configuration
  const userPaymentConfig = React.useMemo(() => {
      if (!currentUser) return null;
      const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
      if (!member) return null;
      
      const specialties = member.specialty ? member.specialty.split(' / ') : [];
      const levels = member.level ? member.level.split(' / ') : [];
      const supportedRoles = ['Locutor', 'Realizador de sonido', 'Director', 'Asesor'];
      
      const roles: { role: string, level: string }[] = [];
      
      specialties.forEach((spec: string, index: number) => {
          const matchedRole = supportedRoles.find(r => spec.toLowerCase().includes(r.toLowerCase()));
          if (matchedRole && roles.length < 3) {
              let levelStr = levels[index] || levels[0] || 'I';
              let level = 'I';
              if (levelStr.toLowerCase().includes('primer')) level = 'I';
              else if (levelStr.toLowerCase().includes('segundo')) level = 'II';
              else if (levelStr.toLowerCase().includes('tercer')) level = 'III';
              else if (levelStr.toLowerCase().includes('habilitado') || levelStr.toLowerCase().includes('no especificado')) level = 'SR';
              
              if (!roles.some(r => r.role === matchedRole)) {
                  roles.push({
                      role: matchedRole,
                      level: level
                  });
              }
          }
      });

      return {
          roles,
          baseSalary: 0
      };
  }, [currentUser, equipoData]);

  // Autogestion Date calculations
  const todayForState = new Date();
  
  const parseLocalDate = (dateString: string) => {
      const parts = dateString.split('-');
      if (parts.length === 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return new Date(dateString + 'T12:00:00');
  };
  
  const handlePrevDay = () => {
      const d = parseLocalDate(workLogDate);
      d.setDate(d.getDate() - 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setWorkLogDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
      const d = parseLocalDate(workLogDate);
      d.setDate(d.getDate() + 1);
      const todayStripped = new Date(todayForState.getFullYear(), todayForState.getMonth(), todayForState.getDate());
      if (d > todayStripped) return;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setWorkLogDate(`${yyyy}-${mm}-${dd}`);
  };

  const getDates = () => {
      return [workLogDate];
  };

  const dates = getDates();

  const toggleWorkLog = (date: string, programName: string, role: string) => {
      if (!currentUser) return;

      // Rule: Director and Asesor cannot coincide in the same program on the same day
      const normalizedRole = normalize(role);
      const isDirector = normalizedRole.includes('director');
      const isAsesor = normalizedRole.includes('asesor');

      if (isDirector || isAsesor) {
          const otherRoleName = isDirector ? 'Asesor' : 'Director';
          const hasConflictingRole = workLogs.some(l => 
              l.userId === currentUser.username && 
              l.date === date && 
              l.programName === programName && 
              normalize(l.role).includes(otherRoleName.toLowerCase()) &&
              l.type !== 'manual_delete'
          );

          if (hasConflictingRole) {
              alert(`¡Conflicto de especialidades! Las especialidades de Director y Asesor no pueden coincidir en un mismo programa. Por favor, selecciona una sola para "${programName}".`);
              return;
          }

          // Check habitual conflict too
          const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
          const habitualPrograms = member?.habitualProgramsByRole || {};
          let otherRoleHabitualProgs: string[] = [];
          for (const [rName, plist] of Object.entries(habitualPrograms)) {
              if (normalize(rName).includes(otherRoleName.toLowerCase())) {
                  otherRoleHabitualProgs = plist as string[];
                  break;
              }
          }
          
          const isOtherRoleHabitual = otherRoleHabitualProgs.some(p => isMatch(p, programName)) && isProgramOnDay(programName, date);
          const otherRoleDeleted = workLogs.some(l => 
              l.userId === currentUser.username && 
              l.date === date && 
              l.programName === programName && 
              normalize(l.role).includes(otherRoleName.toLowerCase()) &&
              l.type === 'manual_delete'
          );

          if (isOtherRoleHabitual && !otherRoleDeleted) {
              alert(`¡Conflicto de especialidades! Este programa ya está asignado habitualmente como ${otherRoleName}. No puede ser marcado como ${isDirector ? 'Director' : 'Asesor'} simultáneamente.`);
              return;
          }
      }
      
      const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
      const habitualPrograms = member?.habitualProgramsByRole || {};
      let progsForRole: string[] = [];
      for (const [rName, plist] of Object.entries(habitualPrograms)) {
         if (rName.toLowerCase().includes(role.toLowerCase()) || role.toLowerCase().includes(rName.toLowerCase())) {
             progsForRole = plist as string[]; break;
         }
      }
      const isHabitualAssigned = progsForRole.some((p: string) => isMatch(p, programName));
      const isHabitual = isHabitualAssigned && isProgramOnDay(programName, date);

      const existingIndex = workLogs.findIndex(l => 
          l.userId === currentUser.username && 
          l.date === date && 
          l.programName === programName && 
          l.role === role
      );

      const existingLog = existingIndex >= 0 ? workLogs[existingIndex] : null;

      if (isHabitual) {
          if (existingLog && existingLog.type === 'manual_delete') {
              const newLogs = [...workLogs];
              newLogs.splice(existingIndex, 1);
              setWorkLogs(newLogs);
          } else if (!existingLog) {
              setWorkLogs([...workLogs, {
                  id: Date.now().toString(),
                  userId: currentUser.username,
                  date,
                  programName,
                  role,
                  hours: 0,
                  type: 'manual_delete',
                  syncStatus: 'pending'
              }]);
          }
      } else {
          if (existingLog && existingLog.type !== 'manual_delete') {
              const newLogs = [...workLogs];
              newLogs.splice(existingIndex, 1);
              setWorkLogs(newLogs);
          } else {
              const roleConfig = userPaymentConfig?.roles.find(r => r.role === role);
              const computedAmount = getProgramRate(programName, role, roleConfig?.level || 'I');
              const defaultHours = normalize(programName) === 'propaganda' ? 1 : 0;
              setWorkLogs([...workLogs, {
                  id: Date.now().toString(),
                  userId: currentUser.username,
                  date,
                  programName,
                  role,
                  hours: defaultHours,
                  type: 'habitual',
                  amount: computedAmount,
                  syncStatus: 'pending'
              }]);
          }
      }
  };

  const updatePropagandaQuantity = (date: string, programName: string, role: string, qty: number) => {
      if (!currentUser) return;

      const existingIndex = workLogs.findIndex(l => 
          l.userId === currentUser.username && 
          l.date === date && 
          l.programName === programName && 
          l.role === role
      );

      const roleConfig = userPaymentConfig?.roles.find(r => r.role === role);
      const computedAmount = getProgramRate(programName, role, roleConfig?.level || 'I');

      if (existingIndex >= 0) {
          const newLogs = [...workLogs];
          newLogs[existingIndex] = {
              ...newLogs[existingIndex],
              hours: qty,
              amount: computedAmount,
              type: newLogs[existingIndex].type === 'manual_delete' ? 'habitual' : newLogs[existingIndex].type
          };
          setWorkLogs(newLogs);
      } else {
          setWorkLogs([...workLogs, {
              id: Date.now().toString(),
              userId: currentUser.username,
              date,
              programName,
              role,
              hours: qty,
              type: 'habitual',
              amount: computedAmount,
              syncStatus: 'pending'
          }]);
      }
  };

  const getProgramStartTime = (progName: string) => {
      const DEFAULT_PROGRAMS = [
          { name: "Noticiero Nacional", schedule: "13:00-13:30" },
          { name: "Noticiero Provincial", schedule: "12:00-12:28" }
      ];
      
      const allFichas = [...fichas, ...DEFAULT_PROGRAMS];
      
      let bestFicha = null;
      let bestDiff = Infinity;
      for (const f of allFichas) {
          if (isMatch(f.name, progName)) {
              const diff = Math.abs(f.name.length - progName.length);
              if (diff < bestDiff) {
                  bestDiff = diff;
                  bestFicha = f;
              }
          }
      }

      if (bestFicha && bestFicha.schedule) {
          const match = bestFicha.schedule.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
          if (match) {
              let hours = parseInt(match[1]);
              const minutes = parseInt(match[2]);
              const ampm = match[3] ? match[3].toUpperCase() : null;
              if (ampm === 'PM' && hours < 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
              return hours * 60 + minutes;
          }
      }
      
      // Fallback for Cabinas
      if (normalize(progName).includes('cabina')) {
          if (progName.includes('12:00') || progName.includes('12.00')) return 12 * 60;
          if (progName.includes('1:00') || progName.includes('1.00') || progName.includes('13:00')) return 13 * 60;
      }

      return 9999;
  };

  const isProgramOnDay = (programName: string, dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      const day = date.getDay();
      const progNameLower = normalize(programName);

      if (progNameLower === 'propaganda' || progNameLower.includes('propaganda')) {
          return true;
      }

      // Cabina specific logic first
      if (progNameLower.includes('cabina')) {
          if (progNameLower.includes('12:00') || progNameLower.includes('12.00')) {
              // Noticiero Provincial: Mon-Sat
              return day !== 0;
          }
          if (progNameLower.includes('1:00') || progNameLower.includes('1.00') || progNameLower.includes('13:00')) {
              // Noticiero Nacional: Mon-Sun
              return true;
          }
      }

      // Name-based hints (override ficha if explicit in catalog name)
      if (progNameLower.includes('sabado') && day === 6) return true;
      if (progNameLower.includes('domingo') && day === 0) return true;
      if (progNameLower.includes('lunes a viernes') && day >= 1 && day <= 5) return true;
      if (progNameLower.includes('lunes a sabado') && day !== 0) return true;

      const DEFAULT_PROGRAMS = [
          { name: "Noticiero Nacional", duration: "28 min", frequency: "Lunes a Domingo", schedule: "13:00-13:30" },
          { name: "Noticiero Provincial", duration: "28 min", frequency: "Lunes a Sábado", schedule: "12:00-12:28" }
      ];
      
      const allFichas = [...fichas, ...DEFAULT_PROGRAMS];
      let ficha = allFichas.find(f => isMatch(f.name, programName));
      
      if (!ficha) return false;
      const freq = normalize(ficha.frequency || '');
      
      if (freq.includes('diario') || freq.includes('lunes a domingo') || freq.includes('lunes-domingo') || freq.includes('lunes - domingo')) return true;
      if ((freq.includes('lunes a sabado') || freq.includes('lunes-sabado') || freq.includes('lunes - sabado')) && day !== 0) return true;
      if ((freq.includes('lunes a viernes') || freq.includes('lunes-viernes') || freq.includes('lunes - viernes')) && day >= 1 && day <= 5) return true;
      if ((freq.includes('lunes a jueves') || freq.includes('lunes-jueves') || freq.includes('lunes - jueves')) && day >= 1 && day <= 4) return true;
      if ((freq.includes('lunes a miercoles') || freq.includes('lunes-miercoles') || freq.includes('lunes - miercoles')) && day >= 1 && day <= 3) return true;
      if ((freq.includes('martes a viernes') || freq.includes('martes-viernes') || freq.includes('martes - viernes')) && day >= 2 && day <= 5) return true;
      if ((freq.includes('martes a jueves') || freq.includes('martes-jueves') || freq.includes('martes - jueves')) && day >= 2 && day <= 4) return true;
      if ((freq.includes('miercoles a viernes') || freq.includes('miercoles-viernes') || freq.includes('miercoles - viernes')) && day >= 3 && day <= 5) return true;
      if ((freq.includes('jueves a domingo') || freq.includes('jueves-domingo') || freq.includes('jueves - domingo')) && (day >= 4 || day === 0)) return true;
      if ((freq.includes('viernes a domingo') || freq.includes('viernes-domingo') || freq.includes('viernes - domingo')) && (day >= 5 || day === 0)) return true;
      if ((freq.includes('fines de semana') || freq.includes('fin de semana')) && (day === 0 || day === 6)) return true;
      
      const daysMap: { [key: number]: string[] } = {
          0: ['domingo', 'dominical'],
          1: ['lunes'],
          2: ['martes'],
          3: ['miercoles'],
          4: ['jueves'],
          5: ['viernes'],
          6: ['sabado', 'sabatina']
      };

      const freqWords = freq.split(/[\s,y-]+/);
      return daysMap[day].some(d => freqWords.some(w => w.includes(d) || (d.includes(w) && w.length >= 3)));
  };

  const programsListRaw = React.useMemo(() => {
      const uniqueCanonical = new Map<string, string>();
      catalogo.forEach(c => {
          const norm = normalize(c.name);
          if (!uniqueCanonical.has(norm)) {
              uniqueCanonical.set(norm, c.name);
          }
      });
      if (!uniqueCanonical.has(normalize('Propaganda'))) {
          uniqueCanonical.set(normalize('Propaganda'), 'Propaganda');
      }
      return Array.from(uniqueCanonical.values());
  }, [catalogo, normalize]);

  const programsListFilteredByDay = React.useMemo(() => {
      return programsListRaw.filter(prog => dates.some(date => isProgramOnDay(prog, date)));
  }, [programsListRaw, dates, isProgramOnDay]);


  const sortedPrograms = (list: string[]) => {
      const newList = [...list];
      const hasPropaganda = newList.some(p => normalize(p) === 'propaganda');
      const filtered = newList.filter(p => normalize(p) !== 'propaganda');

      filtered.sort((a, b) => {
          const timeA = getProgramStartTime(a);
          const timeB = getProgramStartTime(b);
          if (timeA !== timeB) return timeA - timeB;
          return a.localeCompare(b);
      });

      if (hasPropaganda) {
          filtered.push('Propaganda');
      }
      return filtered;
  };

  const programsByRole = React.useMemo(() => {
      if (!currentUser || !userPaymentConfig) return [];
      return userPaymentConfig.roles.map((role, idx) => {
          const filtered = programsListFilteredByDay.filter(prog => {
              if (normalize(prog) === 'propaganda') return true;

              // Rate check
              const rate = getProgramRate(prog, role.role, role.level);
              if (rate <= 0) return false;

              // Cabina restrictions
              if (prog.toLowerCase().includes('cabina')) {
                  const rName = normalize(role.role);
                  const isRealizador = rName.includes('realizador');
                  const isLocutor = rName.includes('locutor');
                  if (!isRealizador && !isLocutor) return false;
              }

              return true;
          });
          return { ...role, programs: sortedPrograms(filtered), id: `${role.role}-${idx}` };
      });
  }, [currentUser, userPaymentConfig, programsListFilteredByDay, getProgramRate]);

  // Autogestion Calculation (Current Month)
  const autogestionMetrics = React.useMemo(() => {
    let income = 0;
    let count = 0;
    const currentMonthPrefix = workLogDate.substring(0, 7);
    const today = new Date();
    const [yearNow, monthNow] = [today.getFullYear(), today.getMonth() + 1];

    const parts = currentMonthPrefix.split('-');
    const yyyy = parseInt(parts[0]);
    const mm = parseInt(parts[1]);
    const daysInMonth = new Date(yyyy, mm, 0).getDate();

    // Rule: Calculate from day 1 to (current day - 1) for current month
    // For past months, do full month.
    let endDay = daysInMonth;
    if (yyyy === yearNow && mm === monthNow) {
        endDay = Math.max(0, today.getDate() - 1);
    }

    if (userPaymentConfig && currentUser) {
        const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
        const habitualPrograms = member?.habitualProgramsByRole || {};
        const allPossiblePrograms = programsListRaw;

        for (let day = 1; day <= endDay; day++) {
             const dateStr = `${yyyy}-${String(mm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

             userPaymentConfig.roles.forEach(role => {
                 allPossiblePrograms.forEach(prog => {
                     const isManual = workLogs.some(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr && l.type !== 'manual_delete');
                     const isDeleted = workLogs.some(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr && l.type === 'manual_delete');
                     
                     let progsForRole: string[] = [];
                     for (const [rName, plist] of Object.entries(habitualPrograms)) {
                        if (normalize(rName).includes(normalize(role.role)) || normalize(role.role).includes(normalize(rName))) {
                            progsForRole = plist as string[]; break;
                        }
                     }

                     const isHabitualAssigned = progsForRole.some((p: string) => isMatch(p, prog));
                     const isHabitual = isHabitualAssigned && isProgramOnDay(prog, dateStr);
                     const isWorked = isManual || (isHabitual && !isDeleted);

                     if (isWorked) {
                         const baseRate = getProgramRate(prog, role.role, role.level || 'I');
                         if (normalize(prog) === 'propaganda') {
                             const log = workLogs.find(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr);
                             const qty = log && log.hours ? log.hours : 1;
                             income += baseRate * qty;
                         } else {
                             income += baseRate;
                         }
                         count++;
                     }
                 });
             });
        }
    }

    // Add additional payments to total gross income
    let additionalGross = 0;
    if (currentUser) {
        additionalPayments
            .filter(ap => ap.userId === currentUser.username && ap.month === currentMonthPrefix)
            .forEach(ap => {
                const mult = getPeriodMultiplier(ap.period, endDay);
                additionalGross += ap.amount * mult;
            });
    }

    const totalIncome = income + additionalGross;
    const tax = calculateTax(totalIncome);

    return {
        bruto: totalIncome,
        tax: tax,
        neto: totalIncome - tax,
        count
    };
  }, [workLogs, userPaymentConfig, currentUser, workLogDate.substring(0, 7), getProgramRate, calculateTax, equipoData, catalogo, isMatch, normalize, additionalPayments]);

  const [showEditConsolidatedModal, setShowEditConsolidatedModal] = useState(false);

  useEffect(() => {
      const viewedMonthPrefix = workLogDate.substring(0, 7);
      const existingConsolidation = consolidatedPayments.find(c => 
          c.userId === currentUser?.username && 
          c.month === viewedMonthPrefix && 
          c.calculationMode === 'autogestionado'
      );

      if (existingConsolidation && autogestionMetrics) {
          if (
              Math.abs(existingConsolidation.amount - autogestionMetrics.neto) > 0.01 ||
              existingConsolidation.reportCount !== autogestionMetrics.count
          ) {
              setShowEditConsolidatedModal(true);
          } else {
              setShowEditConsolidatedModal(false);
          }
      } else {
          setShowEditConsolidatedModal(false);
      }
  }, [autogestionMetrics.neto, autogestionMetrics.count, consolidatedPayments, currentUser, workLogDate]);

  // Handle Autogestion Consolidate
  const handleConsolidateAutogestion = () => {
    // Only allow if today > last day of the shown month
    const currentDate = new Date();
    const currentMonthPrefix = currentDate.toISOString().substring(0, 7);
    const viewedMonthPrefix = workLogDate.substring(0, 7);
    
    if (viewedMonthPrefix >= currentMonthPrefix) {
        alert("Consolidar mes: Solo funcional a partir del día 1 del mes siguiente.");
        return;
    }

    if (!currentUser) return;

    const newConsolidated: ConsolidatedPayment = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.username,
        month: viewedMonthPrefix,
        amount: autogestionMetrics.neto,
        grossAmount: autogestionMetrics.bruto,
        taxAmount: autogestionMetrics.tax,
        reportCount: autogestionMetrics.count,
        dateConsolidated: new Date().toISOString(),
        calculationMode: 'autogestionado'
    };
    
    setConsolidatedPayments(prev => [...prev.filter(c => !(c.userId === currentUser.username && c.month === viewedMonthPrefix && c.calculationMode === 'autogestionado')), newConsolidated]);
    
    alert("Cierre de autogestión procesado y guardado en la sección de Pagos.");
    setActiveTab('pagos');
  };

  const handleSaveConsolidatedEdit = () => {
      const viewedMonthPrefix = workLogDate.substring(0, 7);
      if (!currentUser) return;
      const newConsolidated: ConsolidatedPayment = {
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.username,
          month: viewedMonthPrefix,
          amount: autogestionMetrics.neto,
          grossAmount: autogestionMetrics.bruto,
          taxAmount: autogestionMetrics.tax,
          reportCount: autogestionMetrics.count,
          dateConsolidated: new Date().toISOString(),
          calculationMode: 'autogestionado'
      };
      setConsolidatedPayments(prev => [...prev.filter(c => !(c.userId === currentUser.username && c.month === viewedMonthPrefix && c.calculationMode === 'autogestionado')), newConsolidated]);
      setShowEditConsolidatedModal(false);
  };

  // Oficiales Calculation (Current User Only)
  const oficialesMetrics = React.useMemo(() => {
      if (!currentUser) return null;
      let income = 0;
      let count = 0;
      
      const userReports = reports.filter(r => 
        r.mes === workLogDate.substring(0, 7) && 
        r.especialidades.some(esp => 
          isMatch(esp.nombre, currentUser.name) || 
          (currentUser.username && esp.nombre.toLowerCase().includes(currentUser.username.toLowerCase()))
        )
      );

      userReports.forEach(rep => {
          const esp = rep.especialidades.find(e => 
              isMatch(e.nombre, currentUser.name) || 
              (currentUser.username && e.nombre.toLowerCase().includes(currentUser.username.toLowerCase()))
          );
          if (esp) {
              const roleConfig = userPaymentConfig?.roles.find(r => normalize(r.role).includes(normalize(esp.rol)));
              income += getProgramRate(rep.programa, esp.rol, roleConfig?.level || 'I');
              count++;
          }
      });

      const tax = calculateTax(income);
      return {
          bruto: income,
          tax: tax,
          neto: income - tax,
          count
      }
  }, [reports, workLogDate, currentUser, userPaymentConfig, getProgramRate, calculateTax, isMatch]);

  const getAutogestionLogs = () => {
      if (!currentUser) return [];
      const currentMonthPrefix = filterMonth;
      const parts = currentMonthPrefix.split('-');
      const yyyy = parseInt(parts[0]);
      const mm = parseInt(parts[1]);
      const daysInMonth = new Date(yyyy, mm, 0).getDate();
      const today = new Date();
      const [yearNow, monthNow] = [today.getFullYear(), today.getMonth() + 1];
  
      let endDay = daysInMonth;
      if (yyyy === yearNow && mm === monthNow) {
          endDay = Math.max(0, today.getDate() - 1);
      }
  
      const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
      const habitualPrograms = member?.habitualProgramsByRole || {};
      const allPossiblePrograms = programsListRaw;
      
      const logs: {date: string, program: string, amount: number}[] = [];
  
      if (userPaymentConfig) {
          for (let day = 1; day <= endDay; day++) {
               const dateStr = `${yyyy}-${String(mm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
               
               userPaymentConfig.roles.forEach(role => {
                   allPossiblePrograms.forEach(prog => {
                       const isManual = workLogs.some(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr && l.type !== 'manual_delete');
                       const isDeleted = workLogs.some(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr && l.type === 'manual_delete');
                       
                       let progsForRole: string[] = [];
                       for (const [rName, plist] of Object.entries(habitualPrograms)) {
                          if (normalize(rName).includes(normalize(role.role)) || normalize(role.role).includes(normalize(rName))) {
                              progsForRole = plist as string[]; break;
                          }
                       }
  
                       const isHabitualAssigned = progsForRole.some((p: string) => isMatch(p, prog));
                       const isHabitual = isHabitualAssigned && isProgramOnDay(prog, dateStr);
                       const isWorked = isManual || (isHabitual && !isDeleted);
  
                       if (isWorked) {
                           const baseRate = getProgramRate(prog, role.role, role.level || 'I');
                           let currentAmount = 0;
                           if (normalize(prog) === 'propaganda') {
                               const log = workLogs.find(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr);
                               const qty = log && log.hours ? log.hours : 1;
                               currentAmount = baseRate * qty;
                           } else {
                               currentAmount = baseRate;
                           }
                           logs.push({ date: dateStr, program: prog, amount: currentAmount });
                       }
                   });
               });
          }
      }
      return logs;
  };

  const getDetailData = () => {
      if (!currentUser) return [];
      
      let baseLogs: {date: string, program: string, amount: number}[] = [];
      if (detailMode === 'oficial') {
          baseLogs = reports
            .filter(r => r.mes === filterMonth && r.especialidades.some(esp => isMatch(esp.nombre, currentUser.name)))
            .map(r => {
                const esp = r.especialidades.find(e => isMatch(e.nombre, currentUser.name));
                let amt = 0;
                if (esp) {
                    const roleConfig = userPaymentConfig?.roles.find(rc => normalize(rc.role).includes(normalize(esp.rol)));
                    amt = getProgramRate(r.programa, esp.rol, roleConfig?.level || 'I');
                }
                return { date: r.fecha, program: r.programa, amount: amt };
            });
      } else {
          baseLogs = getAutogestionLogs();
      }
  
      const grouped: Record<string, { program: string, dates: string[], count: number, totalAmount: number }> = {};
      baseLogs.forEach(log => {
          if (!grouped[log.program]) {
              grouped[log.program] = { program: log.program, dates: [], count: 0, totalAmount: 0 };
          }
          if (!grouped[log.program].dates.includes(log.date)) {
              grouped[log.program].dates.push(log.date);
              grouped[log.program].count++;
              grouped[log.program].totalAmount += log.amount;
          }
      });
      return Object.values(grouped).sort((a, b) => b.count - a.count);
  };
  
  const getDetailTotals = () => {
      let totalBruto = 0;
      const details = getDetailData();
      details.forEach(d => {
          totalBruto += d.totalAmount;
      });

      const existingConsolidation = consolidatedPayments.find(c => 
          c.userId === currentUser?.username && 
          c.month === filterMonth && 
          c.calculationMode === (detailMode === 'oficial' ? 'oficial_from_reports' : 'autogestionado')
      );

      if (existingConsolidation) {
          return {
              bruto: existingConsolidation.grossAmount || existingConsolidation.amount,
              neto: existingConsolidation.amount
          };
      } else {
          const tax = calculateTax(totalBruto);
          return {
              bruto: totalBruto,
              neto: totalBruto - tax
          };
      }
  };
  
  const handleSendWhatsAppDetail = () => {
      if (!currentUser) return;
      const details = getDetailData();
      let msg = `*Informe de Programas Realizados (${detailMode === 'oficial' ? 'Oficial' : 'Autogestión'})*\n*Usuario:* ${currentUser.name}\n*Mes:* ${filterMonth}\n\n`;
      let total = 0;
      details.forEach(d => {
          msg += `🎙️ *${d.program}*\nCant: ${d.count} | Importe: $${d.totalAmount.toFixed(2)}\nFechas: ${d.dates.sort().map(dt => dt.substring(8)).join(', ')}\n\n`;
          total += d.count;
      });
      const totals = getDetailTotals();
      msg += `*Total de Programas:* ${total}\n*BRUTO:* $${totals.bruto.toFixed(2)}  /  *NETO:* $${totals.neto.toFixed(2)}`;
      
      const phone = currentUser.telefono ? currentUser.telefono.replace(/\D/g,'') : '';
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
  };
  
  const handleDownloadPDFDetail = () => {
      if (!currentUser) return;
      const doc = new jsPDF();
      const details = getDetailData();
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Informe de Programas Realizados (${detailMode === 'oficial' ? 'Oficial' : 'Autogestión'})`, 14, 20);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Usuario: ${currentUser.name}`, 14, 30);
      doc.text(`Mes: ${filterMonth}`, 14, 38);
      
      let total = 0;
      let totalAmount = 0;
      const tableData = details.map(d => {
          total += d.count;
          totalAmount += d.totalAmount;
          return [
              d.program,
              d.count.toString(),
              `$${d.totalAmount.toFixed(2)}`,
              d.dates.sort().map(dt => dt.substring(8)).join(', ')
          ];
      });
  
      autoTable(doc, {
          startY: 45,
          head: [['Programa', 'Cantidad', 'Importe', 'Fechas']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [158, 118, 73] },
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 20, halign: 'center' },
              2: { cellWidth: 25, halign: 'right' },
              3: { cellWidth: 'auto' }
          }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 45;
      doc.setFont("helvetica", "bold");
      const totals = getDetailTotals();
      doc.text(`Total de programas: ${total}   |   BRUTO: $${totals.bruto.toFixed(2)}  /  NETO: $${totals.neto.toFixed(2)}`, 14, finalY + 10);
  
      doc.save(`Detalle_Programas_${currentUser.name}_${filterMonth}.pdf`);
  };

  const generateComparativa = () => {
      // Find differences in the current filterMonth between user insertions and official reports
      if (!currentUser) return;
      
      const officialLogs = reports
        .filter(r => r.mes === filterMonth && r.especialidades.some(esp => isMatch(esp.nombre, currentUser.name)))
        .map(r => {
            const esp = r.especialidades.find(e => isMatch(e.nombre, currentUser.name));
            return { date: r.fecha, program: r.programa, role: esp?.rol || '' };
        });

      const userLogs = workLogs.filter(l => l.userId === currentUser.username && l.date.startsWith(filterMonth));

      // Quick visual comparison in a docx
      const table = new DocTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocRow({
                    children: [
                        new DocCell({ children: [new Paragraph({ text: "Fecha", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } }),
                        new DocCell({ children: [new Paragraph({ text: "Programa", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } }),
                        new DocCell({ children: [new Paragraph({ text: "Autogestión", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } }),
                        new DocCell({ children: [new Paragraph({ text: "Oficial", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } })
                    ]
                }),
                // Group by date
                ...Array.from(new Set([...officialLogs.map(o => o.date), ...userLogs.map(u => u.date)])).sort().map(d => {
                    const uProgs = userLogs.filter(u => u.date === d).map(u => u.programName).join(', ');
                    const oProgs = officialLogs.filter(o => o.date === d).map(o => o.program).join(', ');
                    const isDiff = uProgs !== oProgs;

                    return new DocRow({
                        children: [
                            new DocCell({ children: [new Paragraph({ text: d, alignment: AlignmentType.CENTER })] }),
                            new DocCell({ children: [new Paragraph({ text: Array.from(new Set([...uProgs.split(', '), ...oProgs.split(', ')])).join(', '), alignment: AlignmentType.CENTER })] }),
                            new DocCell({ children: [new Paragraph({ text: uProgs || '-', alignment: AlignmentType.CENTER })] }),
                            new DocCell({ children: [new Paragraph({ text: oProgs || '-', alignment: AlignmentType.CENTER })], shading: isDiff ? { fill: 'FFEEEE' } : { fill: 'EEFFEE' } })
                        ]
                    });
                })
            ]
      });

      const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ children: [new TextRun({ text: `COMPARATIVA MES: ${filterMonth} - ${currentUser.name}`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                    table
                ]
            }]
      });

      Packer.toBlob(doc).then(blob => saveAs(blob, `Comparativa_${currentUser.username}_${filterMonth}.docx`));
  };

  const generateInforme = () => {
      // Basic Informe matching official and autogestion tables
      generateComparativa();
  };

  return (
      <div className="flex-1 w-full flex flex-col">
          <div className="flex gap-4 border-b border-[#9E7649]/30 mb-6 overflow-x-auto no-scrollbar justify-between">
              <button 
                className={`flex-1 min-w-[100px] text-center pb-2 px-2 font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'autogestion' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('autogestion')}
              >
                Autogestión
              </button>
              <button 
                className={`flex-1 min-w-[100px] text-center pb-2 px-2 font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'oficiales' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('oficiales')}
              >
                Oficial
              </button>
              <button 
                className={`flex-1 min-w-[100px] text-center pb-2 px-2 font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'pagos' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('pagos')}
              >
                Pagos
              </button>
          </div>

          {activeTab === 'autogestion' && (
              <div className="space-y-6">
                 {/* Income Band */}
                 <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                           <CalendarIcon size={20} className="text-[#9E7649]" />
                           <div className="flex flex-col">
                               <h3 className="text-white font-bold text-lg leading-tight">Registro mensual</h3>
                               <span className="text-[#9E7649] font-bold text-sm leading-none capitalize">
                                   {new Date(workLogDate + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                               </span>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-[#9E7649]/30">
                                <button onClick={handlePrevDay} className="p-1 text-[#9E7649] hover:bg-[#9E7649]/20 rounded transition-colors"><ChevronLeft size={18} /></button>
                                <input 
                                    type="date" 
                                    className="bg-[#1A100C]/60 text-white text-sm font-bold w-32 border border-[#9E7649]/30 rounded-md focus:ring-2 focus:ring-[#9E7649]/50 p-1 text-center" 
                                    value={workLogDate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                            const d = new Date(val + 'T12:00:00');
                                            const todayStripped = new Date(todayForState.getFullYear(), todayForState.getMonth(), todayForState.getDate());
                                            if (d <= todayStripped) {
                                                setWorkLogDate(val);
                                            }
                                        }
                                    }}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <button onClick={handleNextDay} className="p-1 text-[#9E7649] hover:bg-[#9E7649]/20 rounded transition-colors"><ChevronRight size={18} /></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#9E7649]/20 pt-4">
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowRight size={48} /></div>
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Ingresos Brutos</p>
                             <div className="text-3xl font-display font-bold text-white">${autogestionMetrics.bruto.toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowRight size={48} /></div>
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Impuestos a Descontar</p>
                             <div className="text-3xl font-display font-bold text-red-400">-${autogestionMetrics.tax.toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-green-500/20 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 size={48} /></div>
                             <p className="text-[10px] text-green-400 uppercase font-bold tracking-wider mb-1">Ingreso Neto (A Pagar)</p>
                             <div className="text-3xl font-display font-bold text-green-400">${autogestionMetrics.neto.toFixed(2)}</div>
                         </div>
                    </div>
                 </div>

                 {/* Work Logs Edition */}
                 <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-[#9E7649] uppercase tracking-widest bg-[#3E1E16] border-y border-[#9E7649]/10">
                            <tr>
                                <th className="px-4 py-3 border-r border-[#9E7649]/10 w-1/3">Programa (Parrilla)</th>
                                {dates.map(date => (
                                    <th key={date} className="px-2 py-3 text-center border-r border-[#9E7649]/10 last:border-r-0 min-w-[80px]">
                                        {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-[#9E7649]/10">
                            {programsByRole.map(roleData => {
                                const mem = equipoData.find(m => m.username === currentUser?.username || m.name === currentUser?.name);
                                const habitualPrograms = mem?.habitualProgramsByRole || {};
                                let progsForRole: string[] = [];
                                for (const [rName, plist] of Object.entries(habitualPrograms)) {
                                    if (normalize(rName).includes(normalize(roleData.role)) || normalize(roleData.role).includes(normalize(rName))) {
                                        progsForRole = plist as string[]; break;
                                    }
                                }

                                return (
                                    <React.Fragment key={roleData.id}>
                                        <tr className="bg-[#1A100C]">
                                            <td colSpan={dates.length + 1} className="px-4 py-2 text-xs font-bold text-[#9E7649] bg-[#3E1E16]/30 uppercase tracking-widest border-y border-[#9E7649]/20">
                                                Especialidad: {roleData.role} ({roleData.level})
                                            </td>
                                        </tr>
                                        {roleData.programs.map(prog => (
                                            <tr key={prog} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white/90 border-r border-[#9E7649]/10">
                                                    <div>{prog}</div>
                                                    {progsForRole.some(p => isMatch(p, prog)) && (
                                                        <div className="text-[9px] text-green-500/70 font-bold uppercase mt-0.5">Habitual</div>
                                                    )}
                                                </td>
                                                {dates.map(date => {
                                                    const isHabitualAssigned = progsForRole.some((p: string) => isMatch(p, prog));
                                                    const isHabitual = isHabitualAssigned && isProgramOnDay(prog, date);
                                                    const hasManualEdit = workLogs.some(l => l.userId === currentUser?.username && l.role === roleData.role && isMatch(l.programName, prog) && l.date === date && l.type !== 'manual_delete');
                                                    const isDeleted = workLogs.some(l => l.userId === currentUser?.username && l.role === roleData.role && isMatch(l.programName, prog) && l.date === date && l.type === 'manual_delete');
                                                    const isWorked = hasManualEdit || (isHabitual && !isDeleted);
                                                    
                                                    return (
                                                        <td key={date} className="px-2 py-3 text-center border-r border-[#9E7649]/10 last:border-r-0">
                                                            <div className="flex flex-col items-center justify-center gap-1.5 whitespace-nowrap">
                                                                <button 
                                                                    onClick={() => toggleWorkLog(date, prog, roleData.role)}
                                                                    className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-all ${isWorked ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-black/40 text-[#E8DCCF]/20 border border-[#9E7649]/20 hover:border-[#9E7649]/50 hover:text-[#E8DCCF]/50'}`}
                                                                >
                                                                    {isWorked ? <CheckCircle2 size={18} /> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                                                </button>
                                                                {isWorked && normalize(prog) === 'propaganda' && (
                                                                    <div className="flex items-center gap-1 mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-[#9E7649]/30">
                                                                        <span className="text-[10px] text-[#E8DCCF]/65 font-bold">Cant:</span>
                                                                        <select 
                                                                            value={(() => {
                                                                                const log = workLogs.find(l => l.userId === currentUser?.username && l.role === roleData.role && isMatch(l.programName, prog) && l.date === date);
                                                                                return log && log.hours ? log.hours : 1;
                                                                            })()}
                                                                            onChange={(e) => {
                                                                                const qty = parseInt(e.target.value);
                                                                                updatePropagandaQuantity(date, prog, roleData.role, qty);
                                                                            }}
                                                                            className="bg-[#1A100C] text-[#E8DCCF] text-[10px] font-bold rounded px-1 py-0.5 border border-[#9E7649]/20 outline-none focus:border-[#9E7649] cursor-pointer"
                                                                        >
                                                                            <option value={1} className="bg-[#1A100C]">1</option>
                                                                            <option value={2} className="bg-[#1A100C]">2</option>
                                                                            <option value={3} className="bg-[#1A100C]">3</option>
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        {/* Row for Additional Payments */}
                                        <tr className="bg-[#1A100C]/60">
                                            <td colSpan={dates.length + 1} className="px-4 py-4 border-t border-[#9E7649]/10">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center bg-[#2C1B15]/40 p-2.5 rounded-lg border border-[#9E7649]/10">
                                                        <span className="text-xs font-bold text-[#E8DCCF]/80 uppercase tracking-wider">
                                                            Pagos Adicionales ({roleData.role})
                                                        </span>
                                                        {openAddFormRole !== roleData.role && (
                                                            <button 
                                                                onClick={() => {
                                                                    setOpenAddFormRole(roleData.role);
                                                                    setNewConcept('');
                                                                    setNewAmount('');
                                                                    setNewPeriod('mensual');
                                                                }}
                                                                className="text-xs px-3 py-1.5 bg-[#9E7649]/30 text-white rounded border border-[#9E7649]/50 hover:bg-[#9E7649]/50 hover:text-white transition-all font-bold"
                                                            >
                                                                + Añadir Pago Adicional
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* List of existing additional payments for this role in the active month */}
                                                    {additionalPayments.filter(ap => ap.userId === currentUser?.username && ap.month === workLogDate.substring(0, 7) && ap.role === roleData.role).length > 0 ? (
                                                        <div className="space-y-2 max-w-2xl">
                                                            {additionalPayments
                                                                .filter(ap => ap.userId === currentUser?.username && ap.month === workLogDate.substring(0, 7) && ap.role === roleData.role)
                                                                .map(ap => {
                                                                    const daysCount = getDaysInViewedMonth();
                                                                    const mult = getPeriodMultiplier(ap.period, daysCount);
                                                                    const subtotal = ap.amount * mult;
                                                                    return (
                                                                        <div key={ap.id} className="flex justify-between items-center bg-[#1A100C]/80 px-4 py-2 rounded border border-[#9E7649]/10 text-xs">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="font-bold text-white">{ap.concept}</span>
                                                                                <span className="text-[10px] text-[#9E7649] capitalize">
                                                                                    Importe base: ${ap.amount.toFixed(2)} | Período: {ap.period} (x{mult})
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="font-bold text-green-400 font-mono">${subtotal.toFixed(2)}</span>
                                                                                <button 
                                                                                    onClick={() => handleDeleteAdditionalPayment(ap.id)}
                                                                                    className="text-red-400 hover:text-red-300 font-black px-1.5 py-0.5 hover:bg-red-500/10 rounded-md transition-colors"
                                                                                    title="Eliminar pago"
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            }
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-[#E8DCCF]/40 italic">No hay pagos adicionales registrados para esta especialidad.</p>
                                                    )}

                                                    {/* inline form to add additional payment */}
                                                    {openAddFormRole === roleData.role && (
                                                        <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/20 flex flex-col gap-3 max-w-md animate-in fade-in slide-in-from-top-1">
                                                            <div className="text-xs font-bold text-white mb-1 border-b border-[#9E7649]/10 pb-1">Nuevo Pago Adicional</div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[10px] text-[#9E7649] uppercase font-bold">Concepto:</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Ej. Cobertura transmisión especial, Guardia" 
                                                                    value={newConcept}
                                                                    onChange={e => setNewConcept(e.target.value)}
                                                                    className="bg-black/40 text-white border border-[#9E7649]/30 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#9E7649] outline-none"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-[10px] text-[#9E7649] uppercase font-bold">Importe ($):</label>
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.01"
                                                                        min="0.01"
                                                                        placeholder="Ej. 150.00" 
                                                                        value={newAmount}
                                                                        onChange={e => setNewAmount(e.target.value)}
                                                                        className="bg-black/40 text-white border border-[#9E7649]/30 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#9E7649] outline-none"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-[10px] text-[#9E7649] uppercase font-bold">Período:</label>
                                                                    <select 
                                                                        value={newPeriod}
                                                                        onChange={e => setNewPeriod(e.target.value as any)}
                                                                        className="bg-[#2C1B15] text-white border border-[#9E7649]/30 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#9E7649] outline-none"
                                                                    >
                                                                        <option value="diario">Diario</option>
                                                                        <option value="semanal">Semanal</option>
                                                                        <option value="mensual">Mensual</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <button 
                                                                    onClick={() => setOpenAddFormRole(null)}
                                                                    className="px-3 py-1.5 bg-black/40 border border-[#9E7649]/20 text-[#E8DCCF]/60 hover:text-white rounded text-xs font-bold"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleAddAdditionalPayment(roleData.role)}
                                                                    className="px-3 py-1.5 bg-[#9E7649] text-white hover:bg-[#8B653D] rounded text-xs font-bold transition-all"
                                                                >
                                                                    Guardar Pago
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>

                 {/* Consolidate Button */}
                 <div className="flex justify-end">
                     <button 
                         onClick={handleConsolidateAutogestion}
                         className="flex items-center gap-2 px-6 py-3 bg-[#9E7649] text-white font-bold rounded-xl hover:bg-[#8B653D] shadow-lg transition-all"
                     >
                         <Save size={20} /> Consolidar Mes
                     </button>
                 </div>
              </div>
          )}

          {activeTab === 'oficiales' && (
              <div className="space-y-6">
                 {/* Income Band based on Official Reports */}
                 <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-6 border-b border-[#9E7649]/20 pb-4">
                        <CalendarIcon size={24} className="text-blue-400" />
                        <div className="flex flex-col">
                            <h3 className="text-white font-bold text-xl leading-tight">Pagos y Reportes Oficiales</h3>
                            <span className="text-blue-400 font-bold text-sm leading-none capitalize">
                                {new Date(workLogDate + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                             <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mb-1">Total Entradas</p>
                             <div className="text-3xl font-display font-bold text-white">{oficialesMetrics?.count || 0}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Ingresos Brutos</p>
                             <div className="text-3xl font-display font-bold text-white">${(oficialesMetrics?.bruto || 0).toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Impuestos a Descontar</p>
                             <div className="text-3xl font-display font-bold text-red-400">-${(oficialesMetrics?.tax || 0).toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-blue-500/20">
                             <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mb-1">Ingreso Neto (A Pagar)</p>
                             <div className="text-3xl font-display font-bold text-blue-400">${(oficialesMetrics?.neto || 0).toFixed(2)}</div>
                         </div>
                    </div>
                 </div>

                  {/* Display simple list of user's official reports */}
                  <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl">
                      <h4 className="text-[#E8DCCF] font-bold mb-4">
                        {isDirectorUser ? 'Reportes Listos para Cierre/Firma de Dirección' : 'Detalle de Inserciones Oficiales'}
                      </h4>
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                          {reports.filter(r => {
                              if (r.mes !== workLogDate.substring(0, 7)) return false;
                              const assigned = r.especialidades.some(esp => isMatch(esp.nombre, currentUser?.name || ''));
                              if (!assigned) return false;
                              // Requirement: Only show to directors if fully signed by others
                              if (isDirectorUser) return isReportFullySignedByOthers(r);
                              return true;
                          }).map(rep => {
                              const esp = rep.especialidades.find(e => isMatch(e.nombre, currentUser?.name || ''));
                              const isSigned = !!signedReports[rep.id];
                              
                              return (
                                  <div key={rep.id} className="flex flex-col p-4 bg-black/20 rounded-xl border border-[#9E7649]/10 hover:border-[#9E7649]/30 transition-all gap-3">
                                      <div className="flex justify-between items-center">
                                          <div className="flex-1">
                                              <div className="text-white font-bold text-base">{rep.programa}</div>
                                              <div className="flex items-center gap-3 mt-1">
                                                <div className="text-[10px] text-[#9E7649] flex items-center gap-1 font-bold"><Clock size={12}/> {rep.fecha}</div>
                                                <div className="text-[10px] font-bold text-[#E8DCCF]/60 bg-[#3E1E16] px-2 py-0.5 rounded uppercase tracking-wider">
                                                  {esp?.rol}
                                                </div>
                                              </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                             {!isSigned ? (
                                               <button 
                                                 onClick={() => { setSigningReport(rep); setShowSignDialog(true); }}
                                                 className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-500 font-bold rounded-lg hover:bg-amber-500/20 transition-all text-xs border border-amber-500/20"
                                               >
                                                 <PenTool size={14} /> FIRMAR
                                               </button>
                                             ) : (
                                               <div className="flex items-center gap-2">
                                                  <button 
                                                    onClick={() => isDirectorUser ? generateAndSharePDF(rep) : shareSignedReport(rep)}
                                                    className={`flex items-center gap-2 px-3 py-2 ${isDirectorUser ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'} text-white font-bold rounded-lg transition-all text-xs shadow-lg`}
                                                  >
                                                    <Share2 size={14} /> {isDirectorUser ? 'ENVIAR PDF (WA)' : 'ENVIAR FIRMA (JSON)'}
                                                  </button>
                                                  <div className="p-2 bg-green-500/10 text-green-500 rounded-lg" title="Firmado">
                                                    <CheckCircle2 size={18} />
                                                  </div>
                                               </div>
                                             )}
                                          </div>
                                      </div>

                                      {/* Signatories List for Review */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                                          {rep.especialidades.filter(e => e.nombre).map(e => {
                                              const userMatch = equipoData.find(m => isMatch(m.name, e.nombre));
                                              const hasSigned = (rep.signatures?.[userMatch?.id || userMatch?.username]) || (isMatch(e.nombre, currentUser?.name || '') && isSigned);
                                              return (
                                                  <div key={e.rol} className="flex flex-col bg-black/30 p-2 rounded border border-white/5">
                                                      <span className="text-[8px] text-[#9E7649] uppercase font-bold truncate">{e.rol}</span>
                                                      <div className="flex items-center justify-between gap-1">
                                                          <span className="text-[10px] text-white/70 truncate">{e.nombre.split(' ')[0]}</span>
                                                          {hasSigned && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)] shrink-0" title="Usuario firmó este reporte" />}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              );
                          })}
                          {reports.filter(r => r.mes === workLogDate.substring(0, 7) && r.especialidades.some(esp => isMatch(esp.nombre, currentUser?.name || ''))).length === 0 && (
                              <p className="text-center text-[#E8DCCF]/50 italic py-10">No hay reportes oficiales registrados para este mes.</p>
                          )}
                      </div>
                  </div>

                  {/* SIGNING DIALOG */}
                  {showSignDialog && createPortal(
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
                      <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                        <div className="flex items-center gap-4 text-amber-500">
                          <div className="p-3 bg-amber-500/10 rounded-2xl">
                             <Lock size={32} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Confirmar Firma</h3>
                            <p className="text-sm text-stone-400">Ingrese su contraseña de firma digital para {signingReport?.programa}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                           <input 
                              type="password"
                              placeholder="Contraseña de Firma"
                              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold text-center tracking-widest focus:border-amber-500 outline-none"
                              value={signPass}
                              onChange={e => setSignPass(e.target.value)}
                              autoFocus
                           />
                           <div className="flex gap-4">
                              <button 
                                onClick={() => { setShowSignDialog(false); setSignPass(''); }}
                                className="flex-1 py-4 bg-stone-800 text-white font-bold rounded-2xl hover:bg-stone-700 transition-all"
                              >
                                CANCELAR
                              </button>
                              <button 
                                onClick={handleSignReport}
                                className="flex-1 py-4 bg-amber-500 text-black font-black rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                              >
                                FIRMAR
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
               </div>
          )}

          {activeTab === 'pagos' && (
              <div className="space-y-6">
                  {/* Selector de Mes Governance */}
                  <div className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 flex justify-between items-center">
                     <div className="text-[#E8DCCF] font-bold">Consolidaciones Pagos</div>
                     <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-[#9E7649]/30">
                        <label className="text-[10px] text-[#9E7649] uppercase font-bold">Mes Consultar:</label>
                        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-transparent text-white border-none focus:ring-0 text-sm" />
                     </div>
                  </div>

                  {/* Two Tables Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Autogestionados */}
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 overflow-hidden shadow-xl">
                          <div className="p-4 border-b border-[#9E7649]/20 bg-[#3E1E16]/30">
                              <h4 className="text-white font-bold">Pagos Autogestionados</h4>
                          </div>
                          <div className="p-4">
                              <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-[#9E7649] uppercase tracking-widest bg-black/20">
                                    <tr>
                                        <th className="px-4 py-2">Mes</th>
                                        <th className="px-4 py-2 text-right">Bruto</th>
                                        <th className="px-4 py-2 text-right">Neto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consolidatedPayments
                                        .filter(p => p.userId === currentUser?.username && p.calculationMode === 'autogestionado' && p.month === filterMonth)
                                        .map(p => (
                                            <tr key={p.id} className="border-b border-[#9E7649]/10">
                                                <td className="px-4 py-3 font-mono">{p.month}</td>
                                                <td className="px-4 py-3 text-right text-[#E8DCCF]/60">${p.grossAmount?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-green-400">${p.amount.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                              </table>
                          </div>
                          <div className="p-4 border-t border-[#9E7649]/20 bg-black/20 flex justify-end">
                              <button onClick={() => { setDetailMode('autogestion'); setShowDetailModal(true); }} className="flex items-center gap-2 px-4 py-2 border border-green-500/40 text-green-400 font-bold rounded-lg hover:bg-green-500/10 transition-all text-sm">
                                  <ClipboardList size={16} /> Detalle de Programas
                              </button>
                          </div>
                      </div>

                      {/* Oficiales */}
                      <div className="bg-[#2C1B15] rounded-2xl border border-blue-900/30 overflow-hidden shadow-xl">
                          <div className="p-4 border-b border-blue-900/30 bg-blue-900/10">
                              <h4 className="text-blue-400 font-bold">Pagos Oficiales</h4>
                          </div>
                          <div className="p-4">
                              <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-blue-400/70 uppercase tracking-widest bg-black/20">
                                    <tr>
                                        <th className="px-4 py-2">Mes</th>
                                        <th className="px-4 py-2 text-right">Bruto</th>
                                        <th className="px-4 py-2 text-right">Neto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consolidatedPayments
                                        .filter(p => p.userId === currentUser?.username && p.calculationMode === 'oficial_from_reports' && p.month === filterMonth)
                                        .map(p => (
                                            <tr key={p.id} className="border-b border-blue-900/20">
                                                <td className="px-4 py-3 font-mono">{p.month}</td>
                                                <td className="px-4 py-3 text-right text-[#E8DCCF]/60">${p.grossAmount?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-400">${p.amount.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                              </table>
                          </div>
                          <div className="p-4 border-t border-blue-900/30 bg-blue-900/5 flex justify-end">
                              <button onClick={() => { setDetailMode('oficial'); setShowDetailModal(true); }} className="flex items-center gap-2 px-4 py-2 border border-blue-500/40 text-blue-400 font-bold rounded-lg hover:bg-blue-500/10 transition-all text-sm">
                                  <ClipboardList size={16} /> Detalle de Programas
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex justify-end gap-4 mt-6">
                      <button onClick={generateComparativa} className="flex items-center gap-2 px-6 py-3 bg-blue-900/40 text-blue-400 border border-blue-900/50 font-bold rounded-xl hover:bg-blue-900/60 shadow-lg transition-all">
                          <Search size={20} /> Comparativa
                      </button>
                  </div>
              </div>
          )}

          {/* Modal de Detalle */}
          {showDetailModal && createPortal(
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 sm:p-6" onClick={() => setShowDetailModal(false)}>
                  <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-full overflow-hidden" onClick={e => e.stopPropagation()}>
                      {/* Header */}
                      <div className="flex items-center justify-between p-6 border-b border-[#9E7649]/20 bg-[#2C1B15]">
                          <div className="flex items-center gap-4">
                              <div className="bg-[#9E7649]/20 p-3 rounded-xl border border-[#9E7649]/40 text-[#9E7649]">
                                  <ClipboardList size={28} />
                              </div>
                              <div>
                                  <h2 className="text-white font-bold text-xl leading-tight">Detalle de Programas</h2>
                                  <span className="text-[#E8DCCF]/60 text-sm">Mes: {filterMonth}</span>
                              </div>
                          </div>
                          <button onClick={() => setShowDetailModal(false)} className="text-[#E8DCCF]/40 hover:text-white transition-colors">
                              ✕
                          </button>
                      </div>

                      {/* Content */}
                      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                              <thead className="text-[10px] text-[#9E7649] uppercase tracking-widest bg-black/40 sticky top-0 z-10">
                                  <tr>
                                      <th className="px-4 py-3 border-b border-[#9E7649]/20">Programa</th>
                                      <th className="px-4 py-3 border-b border-[#9E7649]/20 text-center">Cantidad</th>
                                      <th className="px-4 py-3 border-b border-[#9E7649]/20 text-right">Importe</th>
                                      <th className="px-4 py-3 border-b border-[#9E7649]/20 w-1/2">Fechas</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-[#9E7649]/10 text-sm">
                                  {getDetailData().map(d => (
                                      <tr key={d.program} className="hover:bg-[#2C1B15] transition-colors">
                                          <td className="px-4 py-3 font-bold text-[#E8DCCF]">{d.program}</td>
                                          <td className="px-4 py-3 text-center text-white">{d.count}</td>
                                          <td className="px-4 py-3 text-right text-green-400 font-mono">${d.totalAmount.toFixed(2)}</td>
                                          <td className="px-4 py-3 text-[#E8DCCF]/60 font-mono text-xs">{d.dates.sort().map(dt => dt.substring(8)).join(', ')}</td>
                                      </tr>
                                  ))}
                                  {getDetailData().length === 0 && (
                                      <tr>
                                          <td colSpan={4} className="px-4 py-8 text-center text-[#E8DCCF]/40 italic">
                                              No hay programas registrados para este mes.
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                              {getDetailData().length > 0 && (
                                  <tfoot className="bg-black/20 text-[#9E7649] font-bold">
                                      <tr>
                                          <td className="px-4 py-3 border-t border-[#9E7649]/20 font-bold">TOTAL</td>
                                          <td className="px-4 py-3 text-center border-t border-[#9E7649]/20 font-bold text-white">{getDetailData().reduce((acc, curr) => acc + curr.count, 0)}</td>
                                          <td className="px-4 py-3 text-right border-t border-[#9E7649]/20 font-bold text-green-400 font-mono text-xs">
                                              <div className="whitespace-nowrap">BRUTO: ${getDetailTotals().bruto.toFixed(2)}</div>
                                              <div className="whitespace-nowrap text-[#9E7649]">NETO: ${getDetailTotals().neto.toFixed(2)}</div>
                                          </td>
                                          <td className="px-4 py-3 border-t border-[#9E7649]/20"></td>
                                      </tr>
                                  </tfoot>
                              )}
                          </table>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-6 border-t border-[#9E7649]/20 bg-[#2C1B15] flex justify-end gap-4 shrink-0">
                          <button onClick={handleSendWhatsAppDetail} className="flex items-center gap-2 px-6 py-3 bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/50 font-bold rounded-xl hover:bg-[#25D366]/30 transition-all">
                              <Share2 size={20} /> Enviar por WhatsApp
                          </button>
                          <button onClick={handleDownloadPDFDetail} className="flex items-center gap-2 px-6 py-3 bg-[#E8DCCF]/10 text-white border border-[#E8DCCF]/30 font-bold rounded-xl hover:bg-[#E8DCCF]/20 transition-all">
                              <FileDown size={20} /> Descargar PDF
                          </button>
                      </div>
                  </div>
              </div>
          , document.body)}

          {/* Modal Edición de Mes Consolidado */}
          {showEditConsolidatedModal && createPortal(
              <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 sm:p-6 backdrop-blur-sm">
                  <div className="bg-[#1A100C] border border-[#9E7649]/50 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col p-8 text-center" onClick={e => e.stopPropagation()}>
                      <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-500 mx-auto flex items-center justify-center mb-6">
                          <Save size={32} />
                      </div>
                      <h2 className="text-white font-bold text-2xl mb-4">Mes Consolidado Editado</h2>
                      <p className="text-[#E8DCCF]/70 mb-8 leading-relaxed">
                          Has introducido cambios en la autogestión de un mes que ya estaba consolidado ({workLogDate.substring(0, 7)}). Debes guardar esta edición para que la información se actualice correctamente en la sección de Pagos y Detalles.
                      </p>
                      <button 
                          onClick={handleSaveConsolidatedEdit} 
                          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#9E7649] text-white font-bold rounded-xl hover:bg-[#8B6840] transition-all shadow-lg"
                      >
                          <Save size={20} /> Guardar Edición del Mes
                      </button>
                  </div>
              </div>
          , document.body)}
      </div>
  );
};
