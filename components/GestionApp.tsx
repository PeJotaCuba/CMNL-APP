import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, FileBarChart, Library, FileText, Users, CreditCard, Upload, Save, X, Edit2, Check, CalendarCheck, ChevronLeft, ChevronRight, Trash2, FileDown, Plus, Settings, AlertTriangle } from 'lucide-react';
import { ProgramFicha, ProgramSection, User, ProgramCatalog, RolePaymentInfo } from '../types';
import CMNLHeader from './CMNLHeader';
import { INITIAL_FICHAS } from '../utils/fichasData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAccumulatedData, getMonthlyTotalData, getDayMinutesConfig, saveDayMinutesConfig, DayType, TransmissionBreakdown } from '../src/services/transmissionService';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { InterruptionModal } from './InterruptionModal';
import EquipoSection from './gestion/EquipoSection';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: User | null;
}

interface WorkLog {
    id: string;
    userId: string;
    role: string;
    programName: string;
    date: string; // YYYY-MM-DD
    amount: number;
}

interface ConsolidatedPayment {
    id: string;
    userId: string;
    month: string; // YYYY-MM
    amount: number;
    grossAmount?: number;
    taxAmount?: number;
    dateConsolidated: string;
}

interface RoleConfig {
    id: string;
    role: string;
    level: string;
    isHabitual: boolean;
    habitualPrograms: string[];
    habitualDays: number[]; // 0=Sun, 1=Mon, etc.
}

interface UserPaymentConfig {
    roles: RoleConfig[];
    otherPayments?: number | string;
}

interface Interruption {
    id: string;
    date: string;
    programName: string;
    category: keyof TransmissionBreakdown;
    affectedMinutes: number;
    percentage: number;
}

interface ConsolidatedMonth {
    id: string;
    month: string; // YYYY-MM
    accumulated: TransmissionBreakdown;
    interruptions: Record<keyof TransmissionBreakdown, number>;
    totalRealMinutes: number;
    dateConsolidated: string;
}

const GestionApp: React.FC<Props> = ({ onBack, onMenuClick, currentUser }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Hash Navigation Logic
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['pagos', 'catalogo', 'fichas', 'transmision', 'equipo', 'reportes'].includes(hash)) {
        setActiveSection(hash);
      } else {
        setActiveSection(null);
      }
    };

    // Set initial hash if empty
    if (!window.location.hash) {
         window.history.replaceState(null, '', '#menu');
    } else {
        handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync state to hash
  useEffect(() => {
    const targetHash = activeSection ? `#${activeSection}` : '#menu';
    if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
    }
  }, [activeSection]);
  const [fichas, setFichas] = useState<ProgramFicha[]>(() => {
      const saved = localStorage.getItem('rcm_data_fichas');
      return saved ? JSON.parse(saved) : INITIAL_FICHAS;
  });
  const [catalogo, setCatalogo] = useState<ProgramCatalog[]>(() => {
      const saved = localStorage.getItem('rcm_data_catalogo');
      return saved ? JSON.parse(saved) : [];
  });
  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
      const saved = localStorage.getItem('rcm_data_worklogs');
      return saved ? JSON.parse(saved) : [];
  });
  const [consolidatedPayments, setConsolidatedPayments] = useState<ConsolidatedPayment[]>(() => {
      const saved = localStorage.getItem('rcm_data_consolidated');
      return saved ? JSON.parse(saved) : [];
  });
  const [userPaymentConfig, setUserPaymentConfig] = useState<UserPaymentConfig | null>(() => {
      if (!currentUser) return null;
      const saved = localStorage.getItem(`rcm_payment_config_${currentUser.username}`);
      // Migrate old config if necessary
      if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role && !parsed.roles) {
              return {
                  roles: [{
                      id: '1',
                      role: parsed.role,
                      level: parsed.level,
                      isHabitual: false,
                      habitualPrograms: [],
                      habitualDays: []
                  }]
              };
          }
          return parsed;
      }
      return null;
  });

  const [selectedFicha, setSelectedFicha] = useState<ProgramFicha | null>(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProgramCatalog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProgramFicha | null>(null);

  // Work Log State
  const [workLogDate, setWorkLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [workLogView, setWorkLogView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showAccumulated, setShowAccumulated] = useState(false);
  const [showMonthlyPayments, setShowMonthlyPayments] = useState(false);
  
  // Payment Config State
  const [configForm, setConfigForm] = useState<UserPaymentConfig>({ 
      roles: [{ 
          id: '1', 
          role: 'Director', 
          level: 'I', 
          isHabitual: false, 
          habitualPrograms: [], 
          habitualDays: [] 
      }] 
  });

  // Transmission State
  const [transmissionConfig, setTransmissionConfig] = useState(getDayMinutesConfig());
  const [interruptions, setInterruptions] = useState<Interruption[]>(() => {
      const saved = localStorage.getItem('rcm_interruptions');
      return saved ? JSON.parse(saved) : [];
  });
  const [consolidatedMonths, setConsolidatedMonths] = useState<ConsolidatedMonth[]>(() => {
      const saved = localStorage.getItem('rcm_consolidated_months');
      return saved ? JSON.parse(saved) : [];
  });
  const [showInterruptionsModal, setShowInterruptionsModal] = useState(false);
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [showPrematureAlert, setShowPrematureAlert] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [showAccumulatedMonths, setShowAccumulatedMonths] = useState(false);
  const [editingCategory, setEditingCategory] = useState<keyof TransmissionBreakdown | null>(null);
  const [categoryEditForm, setCategoryEditForm] = useState({ WEEKDAY: 0, SATURDAY: 0, SUNDAY: 0 });
  
  const [dialog, setDialog] = useState<{isOpen: boolean, title: string, message: string, type: 'alert' | 'confirm', onConfirm?: () => void}>({
      isOpen: false, title: '', message: '', type: 'alert'
  });
  
  const todayForState = new Date();
  const [manualMonth, setManualMonth] = useState(todayForState.getMonth() === 0 ? 11 : todayForState.getMonth() - 1);
  const [manualYear, setManualYear] = useState(todayForState.getMonth() === 0 ? todayForState.getFullYear() - 1 : todayForState.getFullYear());
  const [manualInterruptions, setManualInterruptions] = useState(0);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('rcm_interruptions', JSON.stringify(interruptions));
  }, [interruptions]);

  useEffect(() => {
    localStorage.setItem('rcm_consolidated_months', JSON.stringify(consolidatedMonths));
  }, [consolidatedMonths]);

  useEffect(() => {
    const today = new Date();
    // Restriction starts April 1st, 2026
    const isApril2026OrLater = today.getFullYear() > 2026 || (today.getFullYear() === 2026 && today.getMonth() >= 3); // 3 is April
    const isDays1To3 = today.getDate() >= 1 && today.getDate() <= 3;
    
    if (isApril2026OrLater && isDays1To3) {
        // Check if previous month is consolidated
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthString = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const isConsolidated = consolidatedMonths.some(c => c.month === prevMonthString);
        if (!isConsolidated) {
            setShowRestrictionModal(true);
        }
    }
  }, [consolidatedMonths]);

  useEffect(() => {
    localStorage.setItem('rcm_data_fichas', JSON.stringify(fichas));
  }, [fichas]);

  useEffect(() => {
    localStorage.setItem('rcm_data_catalogo', JSON.stringify(catalogo));
  }, [catalogo]);

  useEffect(() => {
      localStorage.setItem('rcm_data_worklogs', JSON.stringify(workLogs));
  }, [workLogs]);

  useEffect(() => {
      localStorage.setItem('rcm_data_consolidated', JSON.stringify(consolidatedPayments));
  }, [consolidatedPayments]);

  useEffect(() => {
      if (currentUser && userPaymentConfig) {
          localStorage.setItem(`rcm_payment_config_${currentUser.username}`, JSON.stringify(userPaymentConfig));
      }
  }, [userPaymentConfig, currentUser]);

  const menuItems = [
    { id: 'transmision', icon: <Radio size={32} />, label: 'Transmisión', color: 'bg-red-900/40 text-red-400 border-red-500/30' },
    { id: 'reportes', icon: <FileBarChart size={32} />, label: 'Reportes', color: 'bg-blue-900/40 text-blue-400 border-blue-500/30' },
    { id: 'pagos', icon: <CreditCard size={32} />, label: 'Pagos', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-500/30' },
    { id: 'catalogo', icon: <Library size={32} />, label: 'Catálogo', color: 'bg-amber-900/40 text-amber-400 border-amber-500/30' },
    { id: 'fichas', icon: <FileText size={32} />, label: 'Fichas', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' },
    { id: 'equipo', icon: <Users size={32} />, label: 'Equipo', color: 'bg-purple-900/40 text-purple-400 border-purple-500/30' },
  ];

  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador' || currentUser?.classification === 'Coordinador';

  const formatPercentage = (value: string) => {
      if (!value) return '';
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      if (num <= 1 && num > 0) return `${Math.round(num * 100)}%`;
      return `${num}%`;
  };

  const isProgramOnDay = (program: ProgramFicha, dateStr: string) => {
      const date = new Date(dateStr);
      const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
      const freq = program.frequency.toLowerCase();
      
      // Normalize frequency string
      if (freq.includes('diario') || freq.includes('lunes a domingo')) return true;
      if (freq.includes('lunes a sábado') && day !== 0) return true;
      if (freq.includes('lunes a viernes') && day >= 1 && day <= 5) return true;
      
      const daysMap: { [key: number]: string[] } = {
          0: ['domingo', 'dominical'],
          1: ['lunes'],
          2: ['martes'],
          3: ['miércoles', 'miercoles'],
          4: ['jueves'],
          5: ['viernes'],
          6: ['sábado', 'sabado', 'sabatina']
      };

      return daysMap[day].some(d => freq.includes(d));
  };

  const getProgramRate = (programName: string, role: string, level: string) => {
      if (!programName || !role || !level) return 0;
      // Normalize names for better matching (remove accents, lowercase, trim)
      const normalize = (s: string) => s ? s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
      
      const program = catalogo.find(p => normalize(p.name) === normalize(programName) || normalize(p.name).includes(normalize(programName)) || normalize(programName).includes(normalize(p.name)));
      
      if (!program) return 0;

      let total = 0;
      
      // Normalize role for matching
      let searchRole = role;
      if (normalize(role) === 'realizador de sonido') searchRole = 'Realizador';

      // Find main role rate
      const roleInfo = program.roles.find(r => normalize(r.role) === normalize(searchRole) || normalize(r.role).includes(normalize(searchRole)));
      
      if (roleInfo) {
           const rateObj = roleInfo.rates.find(r => r.level === level);
           if (rateObj) {
               total += parseFloat(rateObj.amount) || 0;
           }
      }

      // If Director, add Musical Production if available
      if (role === 'Director') {
          const musicRole = program.roles.find(r => normalize(r.role).includes('produccion musical'));
          if (musicRole) {
              const rateObj = musicRole.rates.find(r => r.level === level);
              if (rateObj) {
                  total += parseFloat(rateObj.amount) || 0;
              }
          }
      }
      
      return total;
  };

  const generatePDF = () => {
      if (!currentUser || !userPaymentConfig) return;
      
      const doc = new jsPDF();
      const title = `Reporte de Pagos - ${currentUser.name}`;
      const subtitle = `Cargos: ${userPaymentConfig.roles.map(r => `${r.role} (${r.level})`).join(', ')}`;
      const date = `Fecha de emisión: ${new Date().toLocaleDateString()}`;

      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(12);
      doc.text(subtitle, 14, 30);
      doc.setFontSize(10);
      doc.text(date, 14, 36);

      const tableColumn = ["Fecha", "Cargo", "Programa", "Monto"];
      const tableRows: any[] = [];

      // Filter logs for current user and roles
      const userLogs = workLogs.filter(l => 
          l.userId === currentUser.username && 
          userPaymentConfig.roles.some(r => r.role === l.role)
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let totalAmount = 0;

      userLogs.forEach(log => {
          const logData = [
              log.date,
              log.role,
              log.programName,
              `$${log.amount.toFixed(2)}`
          ];
          tableRows.push(logData);
          totalAmount += log.amount;
      });

      // Add total row
      tableRows.push(["", "", "TOTAL", `$${totalAmount.toFixed(2)}`]);

      autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 40,
      });

      doc.save(`reporte_pagos_${currentUser.username}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'fichas' | 'catalogo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (type === 'fichas') {
            parseAndImportFichas(text);
        } else {
            parseAndImportCatalogo(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const parseAndImportCatalogo = (text: string) => {
      const programs: ProgramCatalog[] = [];
      const blocks = text.split(/_{10,}/); // Split by 10 or more underscores

      blocks.forEach(block => {
          if (!block.trim()) return;

          const nameMatch = block.match(/Programa:\s*(.+)/);
          if (!nameMatch) return;
          const name = nameMatch[1].trim();

          const roles: RolePaymentInfo[] = [];
          
          // Regex to find roles. Roles seem to be lines that don't start with - or whitespace-dash, and aren't the Program line.
          // A better approach might be to split by known role names or structure.
          // Given the format, roles are headers followed by properties.
          // Let's try splitting by double newlines or identifying blocks.
          
          // Strategy: Split by role keywords if possible, or parse line by line.
          // The roles in the example are: Director, Producción Musical, Asesor, Locutor, Realizador, Comentarista.
          // But they might vary.
          // Let's look for lines that do NOT contain ':' and are not empty, or contain specific keywords.
          
          const lines = block.split('\n').map(l => l.trim()).filter(l => l);
          let currentRole: RolePaymentInfo | null = null;
          let currentSection: 'salaries' | 'rates' | null = null;

          for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.startsWith('Programa:')) continue;

              // Heuristic for Role Header: Not a key-value pair (no colon usually, or colon at end), not a list item
              // In the example: "Director", "Producción Musical (asociada al Director)", "Asesor"
              // They don't have colons at the start.
              // Key values have colons: "Porcentaje:", "T/R:", "I:", "II:"
              
              const isKeyValue = line.includes(':') && !line.endsWith(':'); // "Key: Value"
              const isSectionHeader = line.includes('Salarios por niveles') || line.includes('Tasas por niveles');
              
              if (!isKeyValue && !isSectionHeader && !line.match(/^[IVX]+:/) && !line.match(/^SR:/)) {
                  // Likely a role name
                  if (currentRole) {
                      roles.push(currentRole);
                  }
                  currentRole = {
                      role: line,
                      percentage: '',
                      tr: '',
                      salaries: [],
                      rates: []
                  };
                  currentSection = null;
                  continue;
              }

              if (!currentRole) continue;

              if (line.toLowerCase().includes('porcentaje:')) {
                  currentRole.percentage = line.split(':')[1].trim();
              } else if (line.toLowerCase().includes('t/r:')) {
                  currentRole.tr = line.split(':')[1].trim();
              } else if (line.toLowerCase().includes('salarios por niveles')) {
                  currentSection = 'salaries';
              } else if (line.toLowerCase().includes('tasas por niveles')) {
                  currentSection = 'rates';
              } else if (currentSection && (line.match(/^[IVX]+:/) || line.match(/^SR:/) || line.match(/^- [IVX]+:/) || line.match(/^- SR:/))) {
                  // It's a level value
                  const cleanLine = line.replace(/^- /, '');
                  const [level, amount] = cleanLine.split(':');
                  if (level && amount) {
                      if (currentSection === 'salaries') {
                          currentRole.salaries.push({ level: level.trim(), amount: amount.trim() });
                      } else {
                          currentRole.rates.push({ level: level.trim(), amount: amount.trim() });
                      }
                  }
              }
          }
          if (currentRole) roles.push(currentRole);

          if (roles.length > 0) {
              programs.push({ name, roles });
          }
      });

      if (programs.length > 0) {
          setCatalogo(prev => {
              const newCatalogo = [...prev];
              programs.forEach(newProg => {
                  const existingIndex = newCatalogo.findIndex(p => p.name === newProg.name);
                  if (existingIndex >= 0) {
                      newCatalogo[existingIndex] = newProg;
                  } else {
                      newCatalogo.push(newProg);
                  }
              });
              return newCatalogo;
          });
          alert(`Se han importado/actualizado ${programs.length} programas en el catálogo.`);
      } else {
          alert('No se pudieron encontrar datos válidos en el archivo.');
      }
  };

  const parseAndImportFichas = (text: string) => {
    // Basic parser based on the provided format
    // This assumes the text format matches the provided example
    const programs: ProgramFicha[] = [];
    const blocks = text.split(/_{10,}/); // Split by 10 or more underscores
    
    blocks.forEach(block => {
        if(!block.trim()) return;
        
        const getValue = (key: string) => {
            const regex = new RegExp(`${key}:\\s*(.*)`);
            const match = block.match(regex);
            return match ? match[1].trim() : '';
        };

        const getMultiLineValue = (key: string, endKey: string) => {
             const start = block.indexOf(key);
             if (start === -1) return '';
             let end = block.indexOf(endKey, start);
             if (end === -1) end = block.length;
             return block.substring(start + key.length, end).trim();
        };

        const name = getValue('Programa');
        if(!name) return;

        const sections: any[] = [];
        const sectionsText = getMultiLineValue('Secciones:', '________________________________________________________');
        if(sectionsText && !sectionsText.includes('No especifica')) {
            const sectionLines = sectionsText.split('\n').filter(l => l.trim().length > 0);
            sectionLines.forEach(line => {
                 const parts = line.split(':');
                 if(parts.length >= 2) {
                     sections.push({
                         name: parts[0].trim(),
                         description: parts.slice(1).join(':').trim(),
                         schedule: '',
                         duration: ''
                     });
                 }
            });
        }

        programs.push({
            name: name,
            schedule: getValue('Horario'),
            duration: getValue('Tiempo'),
            frequency: getValue('Frecuencia'),
            func: getValue('Función'),
            music_cuban: getValue('Música Cubana'),
            music_foreign: getValue('Música Extranjera'),
            group: getValue('Grupo'),
            form: getValue('Forma'),
            complexity: getValue('Complejidad'),
            theme: getValue('Tema'),
            target: getValue('Intencionalidad de Destinatario'),
            times: {
                music: getValue('Música'),
                info: getValue('Información'),
                propaganda: getValue('Propaganda')
            },
            startDate: getValue('Fecha de inicio'),
            emissionType: getValue('Tipo de emisión'),
            literarySupport: getMultiLineValue('Clasificación del soporte literario:', 'Objetivo Principal:'),
            objective: getMultiLineValue('Objetivo Principal:', 'Perfil:'),
            profile: getMultiLineValue('Perfil:', 'Secciones:'),
            sections: sections
        });
    });

    if(programs.length > 0) {
        setFichas(prev => {
            const newFichas = [...prev];
            programs.forEach(newProg => {
                const existingIndex = newFichas.findIndex(p => p.name === newProg.name);
                if (existingIndex >= 0) {
                    newFichas[existingIndex] = newProg;
                } else {
                    newFichas.push(newProg);
                }
            });
            return newFichas;
        });
        alert(`Se han importado/actualizado ${programs.length} fichas de programas.`);
    } else {
        alert('No se pudieron encontrar programas en el archivo de texto.');
    }
  };

  const handleSaveGestionData = () => {
      const data = {
          fichas,
          catalogo,
      };
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gestioncmnl.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleEdit = () => {
      if (selectedFicha) {
          setEditForm({ ...selectedFicha });
          setIsEditing(true);
      }
  };

  const handleSaveEdit = () => {
      if (editForm && selectedFicha) {
          const updatedFichas = fichas.map(f => f.name === selectedFicha.name ? editForm : f);
          setFichas(updatedFichas);
          setSelectedFicha(editForm);
          setIsEditing(false);
          setEditForm(null);
      }
  };

  const handleCancelEdit = () => {
      setIsEditing(false);
      setEditForm(null);
  };

  const handleInputChange = (field: keyof ProgramFicha, value: string) => {
      if (editForm) {
          setEditForm({ ...editForm, [field]: value });
      }
  };

  const handleNestedInputChange = (parent: 'times', field: string, value: string) => {
      if (editForm) {
          setEditForm({
              ...editForm,
              [parent]: {
                  ...editForm[parent],
                  [field]: value
              }
          });
      }
  };

  const handleSectionChange = (index: number, field: keyof ProgramSection, value: string) => {
      if (editForm && editForm.sections) {
          const updatedSections = [...editForm.sections];
          updatedSections[index] = { ...updatedSections[index], [field]: value };
          setEditForm({ ...editForm, sections: updatedSections });
      }
  };

  const toggleWorkLog = (programName: string, date: string, role: string) => {
      if (!currentUser || !userPaymentConfig) return;
      const userId = currentUser.username;
      
      const roleConfig = userPaymentConfig.roles.find(r => r.role === role);
      if (!roleConfig) return;

      const existingIndex = workLogs.findIndex(l => 
          l.userId === userId && 
          l.role === role && 
          l.programName === programName && 
          l.date === date
      );

      if (existingIndex >= 0) {
          const newLogs = [...workLogs];
          newLogs.splice(existingIndex, 1);
          setWorkLogs(newLogs);
      } else {
          const amount = getProgramRate(programName, role, roleConfig.level);
          setWorkLogs([...workLogs, {
              id: Date.now().toString() + Math.random(),
              userId,
              role,
              programName,
              date,
              amount
          }]);
      }
  };

  const calculateTotalPayment = (dates: string[]) => {
      if (!userPaymentConfig || !currentUser) return { periodTotal: 0, monthTotal: 0 };
      
      const userId = currentUser.username;
      const currentMonth = new Date(workLogDate).toISOString().slice(0, 7); // YYYY-MM

      let periodTotal = 0;
      let monthTotal = 0;

      workLogs.forEach(log => {
          if (log.userId === userId && userPaymentConfig.roles.some(r => r.role === log.role)) {
              if (dates.includes(log.date)) {
                  periodTotal += log.amount;
              }
              if (log.date.startsWith(currentMonth)) {
                  monthTotal += log.amount;
              }
          }
      });

      // Add other payments to month total
      if (userPaymentConfig.otherPayments) {
          monthTotal += Number(userPaymentConfig.otherPayments) || 0;
          // Also add to period total if the period covers the whole month? 
          // For simplicity, let's assume 'otherPayments' is a monthly fixed amount that is added to the "Acumulado" view.
          // Since "Acumulado" usually shows the current month's total, adding it here makes sense.
          // However, periodTotal depends on specific dates. If the dates cover the full month, maybe we should add it.
          // But usually periodTotal is for "Week" or "Day" views. 
          // Let's only add it to monthTotal as requested ("Este se agrega al Acumulado inicial").
      }

      return { periodTotal, monthTotal };
  };

  const autoCompleteHabitual = (role: RoleConfig, dates: string[]) => {
      if (!currentUser) return;
      const newLogs = [...workLogs];
      let added = 0;

      dates.forEach(date => {
          // Adjust for local timezone to get correct day
          const d = new Date(date + 'T12:00:00');
          const day = d.getDay();
          if (role.habitualDays.includes(day)) {
              role.habitualPrograms.forEach(prog => {
                  const exists = newLogs.some(l => 
                      l.userId === currentUser.username && 
                      l.role === role.role && 
                      l.programName === prog && 
                      l.date === date
                  );
                  if (!exists) {
                      const amount = getProgramRate(prog, role.role, role.level);
                      newLogs.push({
                          id: Date.now().toString() + Math.random(),
                          userId: currentUser.username,
                          role: role.role,
                          programName: prog,
                          date: date,
                          amount
                      });
                      added++;
                  }
              });
          }
      });

      if (added > 0) {
          setWorkLogs(newLogs);
          alert(`Se han autocompletado ${added} registros habituales en este periodo.`);
      } else {
          alert('No hay nuevos registros habituales para añadir en este periodo.');
      }
  };

  const calculateTax = (amount: number) => {
      // 1. 5% Initial Deduction (Social Security)
      const tax5Percent = amount * 0.05;
      const baseAmount = amount - tax5Percent;

      // 2. Personal Income Tax Scale on Base Amount
      let scaleTax = 0;

      if (baseAmount > 3260) {
          if (baseAmount <= 9510) {
              // Only 3% bracket on the excess over 3260
              scaleTax = (baseAmount - 3260) * 0.03;
          } else {
              // Full 3% bracket (3260 to 9510) + 5% on excess over 9510
              const firstBracketTax = (9510 - 3260) * 0.03; // 187.5
              const secondBracketTax = (baseAmount - 9510) * 0.05;
              scaleTax = firstBracketTax + secondBracketTax;
          }
      }

      return tax5Percent + scaleTax;
  };

  const consolidateMonth = () => {
      if (!currentUser || !userPaymentConfig) return;
      
      // Calculate the previous month relative to today
      const today = new Date();
      const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonth = prevMonthDate.toISOString().slice(0, 7); // YYYY-MM
      
      // Check if already consolidated
      if (consolidatedPayments.some(c => c.userId === currentUser.username && c.month === prevMonth)) {
          setDialog({ isOpen: true, title: 'Acción no permitida', message: `El mes de ${prevMonth} ya ha sido consolidado.`, type: 'alert' });
          return;
      }

      // Calculate total for the previous month
      let monthTotal = workLogs
          .filter(l => l.userId === currentUser.username && l.date.startsWith(prevMonth) && userPaymentConfig.roles.some(r => r.role === l.role))
          .reduce((acc, log) => acc + log.amount, 0);

      if (monthTotal === 0 && !userPaymentConfig.otherPayments) {
          setDialog({ isOpen: true, title: 'Sin datos', message: `No hay pagos registrados para consolidar en el mes de ${prevMonth}.`, type: 'alert' });
          return;
      }

      // Add other payments
      if (userPaymentConfig.otherPayments) {
          monthTotal += Number(userPaymentConfig.otherPayments) || 0;
      }

      const tax = calculateTax(monthTotal);
      const netAmount = monthTotal - tax;

      setDialog({
          isOpen: true,
          title: 'Confirmar Consolidación',
          message: `¿Desea consolidar el mes de ${prevMonth}?\n\nMonto Bruto: $${monthTotal.toFixed(2)}\nImpuestos: $${tax.toFixed(2)}\nNeto a Pagar: $${netAmount.toFixed(2)}\n\nEsta acción guardará la cifra definitiva y limpiará los registros de ese mes.`,
          type: 'confirm',
          onConfirm: () => {
              const newConsolidation: ConsolidatedPayment = {
                  id: Date.now().toString(),
                  userId: currentUser.username,
                  month: prevMonth,
                  amount: netAmount,
                  grossAmount: monthTotal,
                  taxAmount: tax,
                  dateConsolidated: new Date().toISOString()
              };
              setConsolidatedPayments([...consolidatedPayments, newConsolidation]);
              // Clear work logs for the consolidated month
              const newLogs = workLogs.filter(l => !(l.userId === currentUser.username && l.date.startsWith(prevMonth)));
              setWorkLogs(newLogs);
              setDialog({ isOpen: true, title: 'Éxito', message: `Mes de ${prevMonth} consolidado exitosamente.`, type: 'alert' });
          }
      });
  };

  const clearMonth = () => {
      if (!currentUser) return;
      const currentMonth = new Date(workLogDate).toISOString().slice(0, 7); // YYYY-MM
      
      setDialog({
          isOpen: true,
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de que desea eliminar todos los registros del mes de ${currentMonth}? Esta acción no se puede deshacer.`,
          type: 'confirm',
          onConfirm: () => {
              const newLogs = workLogs.filter(l => !(l.userId === currentUser.username && l.date.startsWith(currentMonth)));
              setWorkLogs(newLogs);
              setDialog({ isOpen: true, title: 'Éxito', message: `Registros del mes de ${currentMonth} eliminados.`, type: 'alert' });
          }
      });
  };

  const updateRole = (id: string, updates: Partial<RoleConfig>) => {
      setConfigForm(prev => ({
          ...prev,
          roles: prev.roles.map(r => r.id === id ? { ...r, ...updates } : r)
      }));
  };

  const addRole = () => {
      setConfigForm(prev => ({
          ...prev,
          roles: [...prev.roles, {
              id: Date.now().toString(),
              role: 'Locutor',
              level: 'I',
              isHabitual: false,
              habitualPrograms: [],
              habitualDays: []
          }]
      }));
  };

  const removeRole = (id: string) => {
      setConfigForm(prev => ({
          ...prev,
          roles: prev.roles.filter(r => r.id !== id)
      }));
  };

  const toggleHabitualDay = (id: string, day: number) => {
      setConfigForm(prev => ({
          ...prev,
          roles: prev.roles.map(r => {
              if (r.id === id) {
                  const days = r.habitualDays.includes(day) 
                      ? r.habitualDays.filter(d => d !== day)
                      : [...r.habitualDays, day];
                  return { ...r, habitualDays: days };
              }
              return r;
          })
      }));
  };

  const toggleHabitualProgram = (id: string, program: string) => {
      setConfigForm(prev => ({
          ...prev,
          roles: prev.roles.map(r => {
              if (r.id === id) {
                  const programs = r.habitualPrograms.includes(program)
                      ? r.habitualPrograms.filter(p => p !== program)
                      : [...r.habitualPrograms, program];
                  return { ...r, habitualPrograms: programs };
              }
              return r;
          })
      }));
  };

  const handleBackNavigation = () => {
      if (activeSection) {
          setActiveSection(null);
          window.history.pushState(null, '', '#menu');
      } else {
          onBack();
      }
  };




  // Render Pagos Section
  if (activeSection === 'transmision') {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      let targetYear = now.getFullYear();
      let targetMonth = now.getMonth();
      let isPending = false;

      // Restricción Obligatoria a partir del 1 de Abril de 2026
      const isApril2026OrLater = now.getFullYear() > 2026 || (now.getFullYear() === 2026 && now.getMonth() >= 3);

      if (isApril2026OrLater) {
          if (consolidatedMonths.length > 0) {
              const sorted = [...consolidatedMonths].sort((a, b) => a.month.localeCompare(b.month));
              const lastConsolidated = sorted[sorted.length - 1].month;
              const [year, month] = lastConsolidated.split('-').map(Number);
              
              const nextMonthDate = new Date(year, month, 1);
              const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
              
              if (nextMonthStr < currentMonthStr) {
                  targetYear = nextMonthDate.getFullYear();
                  targetMonth = nextMonthDate.getMonth();
                  isPending = true;
              }
          } else {
              // Si no hay meses consolidados, asumimos que el mes anterior está pendiente
              const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              targetYear = prevMonthDate.getFullYear();
              targetMonth = prevMonthDate.getMonth();
              isPending = true;
          }
      }

      const targetMonthString = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

      const accumulated = isPending 
          ? getMonthlyTotalData(targetMonth, targetYear, transmissionConfig)
          : getAccumulatedData(now, transmissionConfig);
          
      const monthly = getMonthlyTotalData(targetMonth, targetYear, transmissionConfig);

      const categories: (keyof TransmissionBreakdown)[] = [
          'informativos', 'boletines', 'publicidad', 'orientacion', 
          'cienciaTecnica', 'variados', 'historicosGrabado', 
          'variadoInfantilGrabado', 'literaturaArte', 'musicales'
      ];

      const categoryLabels: Record<keyof TransmissionBreakdown, string> = {
          informativos: 'Informativos',
          boletines: 'Boletines',
          publicidad: 'Publicidad',
          orientacion: 'Orientación',
          cienciaTecnica: 'Ciencia/Técnica',
          variados: 'Variados',
          historicosGrabado: 'Histórico (Grabado)',
          variadoInfantilGrabado: 'Variado/Infantil (Grabado)',
          literaturaArte: 'Literatura/Arte',
          musicales: 'Musicales',
          total: 'Total'
      };

      const currentMonthInterruptions = interruptions.filter(i => {
          if (!i.date) return false;
          return i.date.startsWith(targetMonthString);
      });

      const interruptionsByCategory = categories.reduce((acc, cat) => {
          acc[cat] = currentMonthInterruptions.filter(i => i.category === cat).reduce((sum, i) => sum + (Number(i.affectedMinutes) || 0), 0);
          return acc;
      }, {} as Record<keyof TransmissionBreakdown, number>);
      interruptionsByCategory.total = Object.values(interruptionsByCategory).reduce((a, b) => a + b, 0);

      const renderCategoryLabel = (cat: keyof TransmissionBreakdown) => {
          if (cat === 'publicidad') return <span className="flex items-center">Publicidad<sup className="text-red-600 text-[10px] font-bold ml-1">GRABADO</sup></span>;
          if (cat === 'historicosGrabado') return <span className="flex items-center">Histórico<sup className="text-red-600 text-[10px] font-bold ml-1">GRABADO</sup></span>;
          if (cat === 'variadoInfantilGrabado') return <span className="flex items-center">Variado/Infantil<sup className="text-red-600 text-[10px] font-bold ml-1">GRABADO</sup></span>;
          return categoryLabels[cat];
      };

      const handleSaveCategoryEdit = () => {
          if (editingCategory) {
              const newConfig = { ...transmissionConfig };
              newConfig.WEEKDAY[editingCategory] = categoryEditForm.WEEKDAY;
              newConfig.SATURDAY[editingCategory] = categoryEditForm.SATURDAY;
              newConfig.SUNDAY[editingCategory] = categoryEditForm.SUNDAY;
              saveDayMinutesConfig(newConfig);
              setTransmissionConfig(newConfig);
              setEditingCategory(null);
          }
      };

      const handleOpenConsolidateModal = () => {
          if (!isPending) {
              setShowPrematureAlert(true);
              return;
          }
          setShowConsolidateModal(true);
      };

      const handleConsolidate = () => {
          const newConsolidated: ConsolidatedMonth = {
              id: Date.now().toString(),
              month: targetMonthString,
              accumulated: accumulated.breakdown,
              interruptions: interruptionsByCategory,
              totalRealMinutes: accumulated.breakdown.total - interruptionsByCategory.total,
              dateConsolidated: new Date().toISOString()
          };
          setConsolidatedMonths([...consolidatedMonths, newConsolidated]);
          setShowConsolidateModal(false);
          // Clear current month interruptions
          setInterruptions(interruptions.filter(i => {
              if (!i.date) return true;
              return !i.date.startsWith(targetMonthString);
          }));
      };

      const formatMinutesToHHMMSS = (totalMinutes: number) => {
          const h = Math.floor(totalMinutes / 60);
          const m = Math.floor(totalMinutes % 60);
          return `${h}:${m.toString().padStart(2, '0')}:00`;
      };

      const getExportDataRows = (monthData: ConsolidatedMonth) => {
          const getReal = (cat: keyof TransmissionBreakdown) => monthData.accumulated[cat] - monthData.interruptions[cat];

          const rows = [
              { group: 'Información', isGroup: true, total: getReal('informativos') + getReal('boletines'), vivo: getReal('informativos') + getReal('boletines'), grabado: 0 },
              { name: 'Espacios informativos', total: getReal('informativos'), vivo: getReal('informativos'), grabado: 0 },
              { name: 'Boletines informativos', total: getReal('boletines'), vivo: getReal('boletines'), grabado: 0 },
              
              { group: 'Orientación', isGroup: true, total: getReal('publicidad') + getReal('orientacion') + getReal('cienciaTecnica') + getReal('variados') + getReal('variadoInfantilGrabado'), vivo: getReal('orientacion') + getReal('cienciaTecnica') + getReal('variados'), grabado: getReal('publicidad') + getReal('variadoInfantilGrabado') },
              { name: 'Publicidad', total: getReal('publicidad'), vivo: 0, grabado: getReal('publicidad') },
              { name: 'Espacios Educativos', total: 0, vivo: 0, grabado: 0 },
              { name: 'Espacios de Orientación', total: getReal('orientacion'), vivo: getReal('orientacion'), grabado: 0 },
              { name: 'Espacios de Ciencia y Técnica', total: getReal('cienciaTecnica'), vivo: getReal('cienciaTecnica'), grabado: 0 },
              { name: 'Espacios Variados', total: getReal('variados') + getReal('variadoInfantilGrabado'), vivo: getReal('variados'), grabado: getReal('variadoInfantilGrabado') },
              
              { group: 'Cultura', isGroup: true, total: getReal('historicosGrabado') + getReal('literaturaArte'), vivo: getReal('literaturaArte'), grabado: getReal('historicosGrabado') },
              { name: 'Espacios Históricos', total: getReal('historicosGrabado'), vivo: 0, grabado: getReal('historicosGrabado') },
              { name: 'Espacios Dramatizados', total: 0, vivo: 0, grabado: 0 },
              { name: 'Espacios de Literatura y Arte', total: getReal('literaturaArte'), vivo: getReal('literaturaArte'), grabado: 0 },
              
              { group: 'Música', isGroup: true, total: getReal('musicales'), vivo: getReal('musicales'), grabado: 0 },
              { name: 'Espacios musicales', total: getReal('musicales'), vivo: getReal('musicales'), grabado: 0 },
              
              { group: 'Deportes', isGroup: true, total: 0, vivo: 0, grabado: 0 },
              { name: 'Espacios deportivos', total: 0, vivo: 0, grabado: 0 },
          ];

          const totalGeneral = rows.filter(r => r.isGroup).reduce((sum, r) => sum + r.total, 0);
          const totalVivo = rows.filter(r => r.isGroup).reduce((sum, r) => sum + r.vivo, 0);
          const totalGrabado = rows.filter(r => r.isGroup).reduce((sum, r) => sum + r.grabado, 0);

          return { rows, totalGeneral, totalVivo, totalGrabado };
      };

      const exportToExcel = (monthData: ConsolidatedMonth) => {
          const { rows, totalGeneral, totalVivo, totalGrabado } = getExportDataRows(monthData);
          
          const data = rows.map(row => ({
              'GRUPO DE PROGRAMAS': row.isGroup ? row.group : `    ${row.name}`,
              'Total horas emisión': formatMinutesToHHMMSS(row.total),
              'En vivo': formatMinutesToHHMMSS(row.vivo),
              'Grabado': formatMinutesToHHMMSS(row.grabado),
              'OBSERVACIONES': ''
          }));

          data.push({
              'GRUPO DE PROGRAMAS': 'Interrupciones:',
              'Total horas emisión': formatMinutesToHHMMSS(monthData.interruptions.total),
              'En vivo': '',
              'Grabado': '',
              'OBSERVACIONES': ''
          });

          data.push({
              'GRUPO DE PROGRAMAS': 'Totales:',
              'Total horas emisión': formatMinutesToHHMMSS(totalGeneral),
              'En vivo': formatMinutesToHHMMSS(totalVivo),
              'Grabado': formatMinutesToHHMMSS(totalGrabado),
              'OBSERVACIONES': ''
          });

          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Transmisión");
          XLSX.writeFile(wb, `Transmision_${monthData.month}.xlsx`);
      };

      const exportToWord = async (monthData: ConsolidatedMonth) => {
          const createCell = (text: string, bold: boolean = false, align: any = AlignmentType.CENTER) => new TableCell({
              children: [new Paragraph({
                  alignment: align,
                  children: [new TextRun({ text, font: "Arial", size: 22, bold })]
              })],
              verticalAlign: "center",
          });

          const { rows, totalGeneral, totalVivo, totalGrabado } = getExportDataRows(monthData);

          const tableRows = [
              new TableRow({
                  children: [
                      createCell("GRUPO DE PROGRAMAS", true),
                      createCell("Total horas emisión", true),
                      createCell("En vivo", true),
                      createCell("Grabado", true),
                      createCell("OBSERVACIONES", true),
                  ],
              }),
              ...rows.map(row => new TableRow({
                  children: [
                      createCell(row.isGroup ? (row.group || '') : `    ${row.name}`, row.isGroup, row.isGroup ? AlignmentType.LEFT : AlignmentType.LEFT),
                      createCell(formatMinutesToHHMMSS(row.total), row.isGroup),
                      createCell(formatMinutesToHHMMSS(row.vivo), row.isGroup),
                      createCell(formatMinutesToHHMMSS(row.grabado), row.isGroup),
                      createCell(""),
                  ],
              })),
              new TableRow({
                  children: [
                      createCell("Interrupciones:", true, AlignmentType.RIGHT),
                      createCell(formatMinutesToHHMMSS(monthData.interruptions.total), true),
                      createCell("", true),
                      createCell("", true),
                      createCell(""),
                  ],
              }),
              new TableRow({
                  children: [
                      createCell("Totales:", true, AlignmentType.RIGHT),
                      createCell(formatMinutesToHHMMSS(totalGeneral), true),
                      createCell(formatMinutesToHHMMSS(totalVivo), true),
                      createCell(formatMinutesToHHMMSS(totalGrabado), true),
                      createCell(""),
                  ],
              })
          ];

          const doc = new Document({
              sections: [{
                  properties: {},
                  children: [
                      new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { after: 400 },
                          children: [new TextRun({ text: `Reporte de Transmisión - ${monthData.month}`, font: "Arial", size: 26, bold: true })]
                      }),
                      new Table({ 
                          rows: tableRows,
                          alignment: AlignmentType.CENTER,
                          width: { size: 100, type: WidthType.PERCENTAGE }
                      }),
                  ],
              }],
          });

          const blob = await Packer.toBlob(doc);
          saveAs(blob, `Transmision_${monthData.month}.docx`);
      };

      const handleAddManualMonth = () => {
          const monthlyData = getMonthlyTotalData(manualMonth, manualYear, transmissionConfig);
          const scheduledMinutes = monthlyData.breakdown.total;
          const realMinutes = scheduledMinutes - manualInterruptions;
          
          const monthStr = `${manualYear}-${String(manualMonth + 1).padStart(2, '0')}`;
          
          if (consolidatedMonths.some(m => m.month === monthStr)) {
              alert("Este mes ya ha sido consolidado.");
              return;
          }

          const emptyBreakdown: Record<keyof TransmissionBreakdown, number> = {
              informativos: 0, boletines: 0, publicidad: 0, orientacion: 0,
              cienciaTecnica: 0, variados: 0, historicosGrabado: 0, variadoInfantilGrabado: 0, literaturaArte: 0,
              musicales: 0, total: manualInterruptions
          };

          const newConsolidated: ConsolidatedMonth = {
              id: Date.now().toString(),
              month: monthStr,
              accumulated: monthlyData.breakdown,
              interruptions: emptyBreakdown,
              totalRealMinutes: realMinutes,
              dateConsolidated: new Date().toISOString()
          };
          setConsolidatedMonths([...consolidatedMonths, newConsolidated]);
          alert("Mes histórico añadido correctamente.");
      };

      const handleDeleteConsolidatedMonth = (id: string) => {
          setItemToDelete(id);
      };

      if (showAccumulatedMonths) {
          return (
              <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
                  <CMNLHeader 
                      user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                      sectionTitle="Histórico / Evolución"
                      onMenuClick={onMenuClick}
                      onBack={() => setShowAccumulatedMonths(false)}
                  />
                  {itemToDelete && (
                      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                          <div className="bg-[#2C1B15] p-6 rounded-xl border border-[#9E7649] shadow-2xl max-w-sm w-full">
                              <h3 className="text-lg font-bold text-white mb-4">¿Confirmar eliminación?</h3>
                              <p className="text-[#E8DCCF]/70 mb-6">Esta acción no se puede deshacer.</p>
                              <div className="flex justify-end gap-4">
                                  <button 
                                      onClick={() => setItemToDelete(null)}
                                      className="px-4 py-2 text-[#E8DCCF] hover:text-white"
                                  >
                                      Cancelar
                                  </button>
                                  <button 
                                      onClick={() => {
                                          setConsolidatedMonths(prev => prev.filter(m => m.id !== itemToDelete));
                                          setItemToDelete(null);
                                      }}
                                      className="px-4 py-2 bg-red-900/40 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-900/60"
                                  >
                                      Eliminar
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
                  <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
                      {isAdmin && (
                          <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 shadow-xl mb-8">
                              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <CalendarCheck size={20} className="text-[#9E7649]" />
                                  Registrar Mes Histórico
                              </h3>
                              <p className="text-sm text-[#E8DCCF]/60 mb-4">
                                  El sistema calculará automáticamente las horas programadas según el calendario del mes.
                              </p>
                              <div className="flex flex-wrap items-end gap-4">
                                  <div>
                                      <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Mes</label>
                                      <select 
                                          value={manualMonth} 
                                          onChange={e => setManualMonth(parseInt(e.target.value))}
                                          className="bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white min-w-[120px]"
                                      >
                                          {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                              <option key={i} value={i}>{m}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Año</label>
                                      <input 
                                          type="number" 
                                          value={manualYear || ''} 
                                          onChange={e => setManualYear(parseInt(e.target.value) || new Date().getFullYear())} 
                                          className="w-24 bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white" 
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Interrupciones (minutos)</label>
                                      <input 
                                          type="number" 
                                          value={manualInterruptions === 0 ? '' : manualInterruptions} 
                                          onChange={e => setManualInterruptions(parseInt(e.target.value) || 0)} 
                                          className="w-32 bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white" 
                                      />
                                  </div>
                                  <button 
                                      onClick={handleAddManualMonth}
                                      className="bg-[#9E7649] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#8B653D] transition-colors flex items-center gap-2"
                                  >
                                      <Save size={16} /> Guardar Histórico
                                  </button>
                              </div>
                          </div>
                      )}

                      <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden shadow-xl">
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-[#9E7649] uppercase bg-black/20">
                                      <tr>
                                          <th className="px-6 py-4">Mes</th>
                                          <th className="px-6 py-4 text-center">Horas Programadas</th>
                                          <th className="px-6 py-4 text-center text-red-400">Interrupciones</th>
                                          <th className="px-6 py-4 text-center text-green-400">Horas Reales Transmitidas</th>
                                          <th className="px-6 py-4 text-right">Acciones</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#9E7649]/10">
                                      {consolidatedMonths.length === 0 ? (
                                          <tr>
                                              <td colSpan={5} className="px-6 py-8 text-center text-[#E8DCCF]/50">No hay meses consolidados aún.</td>
                                          </tr>
                                      ) : (
                                          [...consolidatedMonths].sort((a, b) => b.month.localeCompare(a.month)).map(month => (
                                              <tr key={month.id} className="hover:bg-white/5 transition-colors">
                                                  <td className="px-6 py-4 font-bold text-white">{month.month}</td>
                                                  <td className="px-6 py-4 text-center font-mono text-[#E8DCCF]/50">{(month.accumulated.total / 60).toFixed(2)} h</td>
                                                  <td className="px-6 py-4 text-center font-mono text-red-400">{(month.interruptions.total / 60).toFixed(2)} h</td>
                                                  <td className="px-6 py-4 text-center font-mono text-green-400 font-bold">{(month.totalRealMinutes / 60).toFixed(2)} h</td>
                                                  <td className="px-6 py-4 text-right whitespace-nowrap">
                                                      <div className="flex justify-end gap-2">
                                                          <button onClick={() => exportToExcel(month)} className="bg-green-900/40 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-green-900/60 transition-colors">
                                                              Excel
                                                          </button>
                                                          <button onClick={() => exportToWord(month)} className="bg-blue-900/40 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-900/60 transition-colors">
                                                              Word
                                                          </button>
                                                          <button onClick={() => handleDeleteConsolidatedMonth(month.id)} className="bg-red-900/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-900/60 transition-colors">
                                                              Eliminar
                                                          </button>
                                                      </div>
                                                  </td>
                                              </tr>
                                          ))
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col relative">
              <CMNLHeader 
                  user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                  sectionTitle="Transmisión"
                  onMenuClick={onMenuClick}
                  onBack={() => setActiveSection(null)}
              >
                  <button 
                      onClick={() => setShowAccumulatedMonths(true)}
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-bold bg-black/20 text-[#9E7649] border border-[#9E7649]/30 hover:bg-[#9E7649]/10 transition-all"
                  >
                      <Library size={16} />
                      <span className="hidden sm:inline">Histórico</span>
                  </button>
              </CMNLHeader>

              <div className="p-6 max-w-6xl mx-auto w-full space-y-8">
                  {isPending && (
                      <div className="bg-red-900/40 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                          <div>
                              <h4 className="text-red-400 font-bold mb-1">Acción Requerida</h4>
                              <p className="text-sm text-red-200/80">
                                  Debe consolidar el mes que acaba de finalizar ({new Date(targetYear, targetMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}) antes de acceder a los datos del mes en curso.
                              </p>
                          </div>
                      </div>
                  )}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-[#2C1B15] to-[#3E1E16] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl">
                          <p className="text-[#9E7649] text-xs uppercase tracking-widest mb-2">Acumulado Real del Mes</p>
                          <h2 className="text-5xl font-bold text-white mb-1">{((accumulated.breakdown.total - interruptionsByCategory.total) / 60).toFixed(2)} <span className="text-xl font-normal text-[#9E7649]">h</span></h2>
                          <p className="text-xs text-[#E8DCCF]/50">
                              {isPending 
                                  ? `Total final del mes de ${new Date(targetYear, targetMonth).toLocaleDateString('es-ES', { month: 'long' })}. Interrupciones descontadas.`
                                  : `Hasta ayer ${new Date(now.getTime() - 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}. Interrupciones descontadas.`
                              }
                          </p>
                      </div>
                      <div className="bg-gradient-to-br from-[#1A100C] to-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/10 shadow-xl">
                          <p className="text-[#9E7649] text-xs uppercase tracking-widest mb-2">Proyección Mensual</p>
                          <h2 className="text-5xl font-bold text-[#9E7649] mb-1">{monthly.hours.toFixed(2)} <span className="text-xl font-normal text-[#E8DCCF]/30">h</span></h2>
                          <p className="text-xs text-[#E8DCCF]/50">Total estimado para {new Date(targetYear, targetMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
                      </div>
                  </div>

                  {/* Breakdown Table */}
                  <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/10 overflow-hidden shadow-2xl">
                      <div className="bg-[#3E1E16] px-6 py-4 border-b border-[#9E7649]/10 flex justify-between items-center">
                          <h3 className="text-white font-bold flex items-center gap-2">
                              <FileBarChart size={20} className="text-[#9E7649]" />
                              Desglose por Categoría (Minutos)
                          </h3>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-[#9E7649] uppercase bg-black/20">
                                  <tr>
                                      <th className="px-6 py-4">Categoría</th>
                                      <th className="px-6 py-4 text-center">Programado (min)</th>
                                      <th className="px-6 py-4 text-center text-red-400">Interrupciones</th>
                                      <th className="px-6 py-4 text-center text-green-400">Real (min)</th>
                                      <th className="px-6 py-4 text-right">Progreso</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-[#9E7649]/10">
                                  {categories.map(cat => {
                                      const accMin = accumulated.breakdown[cat];
                                      const intMin = interruptionsByCategory[cat];
                                      const realMin = accMin - intMin;
                                      const totalMin = monthly.breakdown[cat];
                                      const percentage = totalMin > 0 ? (realMin / totalMin) * 100 : 0;

                                      return (
                                          <tr key={cat} className="hover:bg-white/5 transition-colors">
                                              <td className="px-6 py-4 font-medium text-white">
                                                  {isAdmin ? (
                                                      <button 
                                                          onClick={() => {
                                                              setEditingCategory(cat);
                                                              setCategoryEditForm({
                                                                  WEEKDAY: transmissionConfig.WEEKDAY[cat],
                                                                  SATURDAY: transmissionConfig.SATURDAY[cat],
                                                                  SUNDAY: transmissionConfig.SUNDAY[cat]
                                                              });
                                                          }}
                                                          className="hover:text-[#9E7649] transition-colors flex items-center gap-2"
                                                          title="Editar minutos base"
                                                      >
                                                          {renderCategoryLabel(cat)}
                                                          <Edit2 size={12} className="opacity-50" />
                                                      </button>
                                                  ) : (
                                                      <span className="flex items-center gap-2">
                                                          {renderCategoryLabel(cat)}
                                                      </span>
                                                  )}
                                              </td>
                                              <td className="px-6 py-4 text-center font-mono text-[#E8DCCF]/50">{accMin}</td>
                                              <td className="px-6 py-4 text-center font-mono text-red-400">{intMin > 0 ? `-${intMin}` : '0'}</td>
                                              <td className="px-6 py-4 text-center font-mono text-green-400 font-bold">{realMin}</td>
                                              <td className="px-6 py-4 text-right">
                                                  <div className="flex items-center justify-end gap-3">
                                                      <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                          <div 
                                                              className="h-full bg-[#9E7649] rounded-full" 
                                                              style={{ width: `${Math.min(percentage, 100)}%` }}
                                                          />
                                                      </div>
                                                      <span className="text-[10px] font-bold text-[#9E7649] w-8">{Math.round(percentage)}%</span>
                                                  </div>
                                              </td>
                                          </tr>
                                      );
                                  })}
                                  <tr className="bg-[#3E1E16]/50 font-bold">
                                      <td className="px-6 py-4 text-[#9E7649]">TOTAL GENERAL</td>
                                      <td className="px-6 py-4 text-center text-[#E8DCCF]/50">{accumulated.breakdown.total}</td>
                                      <td className="px-6 py-4 text-center text-red-400">-{interruptionsByCategory.total}</td>
                                      <td className="px-6 py-4 text-center text-green-400">{accumulated.breakdown.total - interruptionsByCategory.total}</td>
                                      <td className="px-6 py-4 text-right">
                                          <span className="text-[#9E7649]">{monthly.breakdown.total > 0 ? Math.round(((accumulated.breakdown.total - interruptionsByCategory.total) / monthly.breakdown.total) * 100) : 0}%</span>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                      {isAdmin && (
                          <div className="bg-black/20 px-6 py-4 border-t border-[#9E7649]/10 flex justify-end gap-4">
                              <button 
                                  onClick={() => setShowInterruptionsModal(true)}
                                  className="bg-red-900/40 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-900/60 transition-colors flex items-center gap-2"
                              >
                                  <Radio size={16} /> Registrar Interrupción
                              </button>
                              <button 
                                  onClick={handleOpenConsolidateModal}
                                  className="bg-[#9E7649] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#8B653D] transition-colors flex items-center gap-2"
                              >
                                  <Save size={16} /> Consolidar Mes
                              </button>
                          </div>
                      )}
                  </div>

                  {/* Info Card */}
                  <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                      <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                          <Settings size={20} />
                      </div>
                      <div>
                          <h4 className="text-blue-400 font-bold text-sm mb-1">Información del Sistema</h4>
                          <p className="text-xs text-[#E8DCCF]/60 leading-relaxed">
                              Los cálculos se basan en la matriz de programación fija de Radio Ciudad Monumento. 
                              Se detectan automáticamente años bisiestos y la distribución de días laborables, sábados y domingos para el mes en curso.
                          </p>
                      </div>
                  </div>
              </div>

              {/* Modals */}
              {editingCategory && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                          <h3 className="text-xl font-bold text-white mb-4">Editar {categoryLabels[editingCategory]}</h3>
                          <p className="text-sm text-[#9E7649] mb-6">Modifica los minutos base por tipo de día. Esto recalculará todo el histórico.</p>
                          
                          <div className="space-y-4 mb-6">
                              <div>
                                  <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Lunes a Viernes (min)</label>
                                  <input type="number" value={categoryEditForm.WEEKDAY === 0 ? '' : categoryEditForm.WEEKDAY} onChange={e => setCategoryEditForm({...categoryEditForm, WEEKDAY: parseInt(e.target.value) || 0})} className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white" />
                              </div>
                              <div>
                                  <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Sábados (min)</label>
                                  <input type="number" value={categoryEditForm.SATURDAY === 0 ? '' : categoryEditForm.SATURDAY} onChange={e => setCategoryEditForm({...categoryEditForm, SATURDAY: parseInt(e.target.value) || 0})} className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white" />
                              </div>
                              <div>
                                  <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Domingos (min)</label>
                                  <input type="number" value={categoryEditForm.SUNDAY === 0 ? '' : categoryEditForm.SUNDAY} onChange={e => setCategoryEditForm({...categoryEditForm, SUNDAY: parseInt(e.target.value) || 0})} className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white" />
                              </div>
                          </div>

                          <div className="flex justify-end gap-3">
                              <button onClick={() => setEditingCategory(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                              <button onClick={handleSaveCategoryEdit} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]">Guardar Cambios</button>
                          </div>
                      </div>
                  </div>
              )}

              {showConsolidateModal && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                          <h3 className="text-xl font-bold text-white mb-2">Consolidar Mes</h3>
                          <p className="text-sm text-[#9E7649] mb-6">Estás a punto de cerrar el mes actual. Revisa los datos antes de aceptar.</p>
                          
                          <div className="bg-[#1A100C] rounded-xl p-4 mb-6 border border-[#9E7649]/10 space-y-2">
                              <div className="flex justify-between text-sm">
                                  <span className="text-[#E8DCCF]/50">Total Programado:</span>
                                  <span className="text-white font-mono">{accumulated.breakdown.total} min</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-[#E8DCCF]/50">Total Interrupciones:</span>
                                  <span className="text-red-400 font-mono">-{interruptionsByCategory.total} min</span>
                              </div>
                              <div className="flex justify-between text-base font-bold pt-2 border-t border-[#9E7649]/20">
                                  <span className="text-[#9E7649]">Total Real:</span>
                                  <span className="text-green-400 font-mono">{accumulated.breakdown.total - interruptionsByCategory.total} min</span>
                              </div>
                          </div>

                          <div className="flex justify-end gap-3">
                              <button onClick={() => setShowConsolidateModal(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                              <button onClick={handleConsolidate} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]">Aceptar y Consolidar</button>
                          </div>
                      </div>
                  </div>
              )}

              {showPrematureAlert && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                          <div className="flex items-center gap-3 mb-4">
                              <AlertTriangle className="text-yellow-500" size={24} />
                              <h3 className="text-xl font-bold text-white">Acción no permitida</h3>
                          </div>
                          <p className="text-sm text-[#E8DCCF] mb-6">
                              El mes aún no ha finalizado. Por favor, espere al día 1 del mes próximo para consolidar los datos.
                          </p>
                          <div className="flex justify-end">
                              <button onClick={() => setShowPrematureAlert(false)} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]">
                                  Entendido
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {showInterruptionsModal && (
                  <InterruptionModal 
                      onClose={() => setShowInterruptionsModal(false)} 
                      onSave={(interruption) => {
                          setInterruptions([...interruptions, interruption]);
                          setShowInterruptionsModal(false);
                      }}
                      fichas={fichas}
                      categories={categories}
                      categoryLabels={categoryLabels}
                  />
              )}
          </div>
      );
  }

  if (activeSection === 'pagos') {
      // Main Pagos View (Work Log)
      const programsList = fichas.map(f => f.name).sort();
      if (programsList.length === 0 && catalogo.length > 0) {
          catalogo.forEach(c => {
              if (!programsList.includes(c.name)) programsList.push(c.name);
          });
      }
      
      const currentDate = new Date(workLogDate);
      
      const getDates = () => {
          if (workLogView === 'daily') return [workLogDate];
          if (workLogView === 'weekly') {
              const dates = [];
              const current = new Date(workLogDate + 'T12:00:00');
              const year = current.getFullYear();
              const month = current.getMonth();
              const date = current.getDate();
              
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const weekIndex = Math.floor((date - 1) / 7);
              const startDay = weekIndex * 7 + 1;
              const endDay = Math.min(startDay + 6, daysInMonth);
              
              for(let i = startDay; i <= endDay; i++) {
                  const d = new Date(year, month, i, 12, 0, 0);
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  dates.push(`${yyyy}-${mm}-${dd}`);
              }
              return dates;
          }
          return [workLogDate];
      };

      const dates = getDates();
      
      if (!userPaymentConfig) {
          return (
              <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col p-6">
                  <div className="max-w-2xl mx-auto w-full bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-8 shadow-2xl">
                      <h2 className="text-2xl font-bold text-white mb-2">Configura tus pagos</h2>
                      <p className="text-[#9E7649] text-sm mb-8">Define tus roles y niveles para calcular tus pagos acumulados.</p>
                      
                      <div className="space-y-6">
                          {configForm.roles.map((role, idx) => (
                              <div key={role.id} className="bg-black/20 p-6 rounded-xl border border-[#9E7649]/10 relative">
                                  <button 
                                      onClick={() => removeRole(role.id)}
                                      className="absolute top-4 right-4 text-red-400 hover:text-red-300"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                                  
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                          <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-2 block">Cargo</label>
                                          <select 
                                              value={role.role}
                                              onChange={(e) => updateRole(role.id, { role: e.target.value })}
                                              className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-[#E8DCCF]"
                                          >
                                              <option value="Director">Director</option>
                                              <option value="Locutor">Locutor</option>
                                              <option value="Escritor">Escritor</option>
                                              <option value="Asesor">Asesor</option>
                                              <option value="Realizador de Sonido">Realizador de Sonido</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-2 block">Nivel</label>
                                          <select 
                                              value={role.level}
                                              onChange={(e) => updateRole(role.id, { level: e.target.value })}
                                              className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-[#E8DCCF]"
                                          >
                                              <option value="I">Nivel I</option>
                                              <option value="II">Nivel II</option>
                                              <option value="III">Nivel III</option>
                                          </select>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-3 mb-4">
                                      <input 
                                          type="checkbox" 
                                          id={`habitual-${role.id}`}
                                          checked={role.isHabitual}
                                          onChange={(e) => updateRole(role.id, { isHabitual: e.target.checked })}
                                          className="w-4 h-4 accent-[#9E7649]"
                                      />
                                      <label htmlFor={`habitual-${role.id}`} className="text-sm text-[#E8DCCF]">¿Es habitual en programas?</label>
                                  </div>

                                  {role.isHabitual && (
                                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                          <div>
                                              <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-2 block">Días Habituales</label>
                                              <div className="flex gap-2">
                                                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                                                      <button
                                                          key={i}
                                                          onClick={() => toggleHabitualDay(role.id, i)}
                                                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${role.habitualDays.includes(i) ? 'bg-[#9E7649] text-white' : 'bg-black/20 text-[#9E7649]/50'}`}
                                                      >
                                                          {day}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                          <div>
                                              <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-2 block">Programas Habituales</label>
                                              <div className="flex flex-wrap gap-2">
                                                  {programsList.map(prog => (
                                                      <button
                                                          key={prog}
                                                          onClick={() => toggleHabitualProgram(role.id, prog)}
                                                          className={`px-3 py-1 rounded-full text-[10px] transition-all ${role.habitualPrograms.includes(prog) ? 'bg-[#9E7649] text-white' : 'bg-black/20 text-[#9E7649]/50 border border-[#9E7649]/10'}`}
                                                      >
                                                          {prog}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))}
                          
                          <button 
                              onClick={addRole}
                              className="w-full py-4 border-2 border-dashed border-[#9E7649]/20 rounded-xl text-[#9E7649] hover:bg-[#9E7649]/5 transition-all flex items-center justify-center gap-2 font-bold"
                          >
                              <Plus size={20} /> Añadir otro cargo
                          </button>

                          <div className="bg-black/20 p-4 rounded-lg border border-[#9E7649]/20">
                              <label className="text-xs text-[#9E7649] font-bold uppercase tracking-wider mb-2 block">Otros Pagos Mensuales ($)</label>
                              <input 
                                  type="number" 
                                  value={configForm.otherPayments || ''}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, otherPayments: e.target.value }))}
                                  className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-3 text-sm focus:border-[#9E7649] outline-none text-[#E8DCCF]"
                                  placeholder="0"
                              />
                              <p className="text-[10px] text-[#E8DCCF]/50 mt-1 italic">Este monto se suma al acumulado mensual antes de impuestos.</p>
                          </div>
                      </div>

                      <div className="mt-10 flex gap-4">
                          <button 
                              onClick={() => {
                                  setUserPaymentConfig(configForm);
                              }}
                              className="flex-1 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                              <Check size={20} /> Guardar Configuración
                          </button>
                          <button 
                              onClick={() => setActiveSection(null)}
                              className="px-8 bg-black/20 text-[#9E7649] border border-[#9E7649]/30 hover:bg-[#9E7649]/10 font-bold rounded-xl transition-all"
                          >
                              Cancelar
                          </button>
                      </div>
                  </div>
              </div>
          );
      }

      const { periodTotal, monthTotal } = calculateTotalPayment(dates);
      const monthTax = calculateTax(monthTotal);
      const monthNet = monthTotal - monthTax;

      const formatDateRange = (dates: string[]) => {
          if (dates.length === 0) return '';
          if (dates.length === 1) {
              return new Date(dates[0]).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          }
          const start = new Date(dates[0]);
          const end = new Date(dates[dates.length - 1]);
          return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
      };

      return (
          <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
              <CMNLHeader 
                  user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                  sectionTitle="Pagos"
                  onMenuClick={onMenuClick}
                  onBack={() => setActiveSection(null)}
              >
                  <div className="flex gap-1">
                       <button 
                          onClick={() => { setShowAccumulated(!showAccumulated); setShowMonthlyPayments(false); }}
                          className={`flex items-center gap-1 text-xs px-2 py-2 rounded-lg font-bold transition-all ${showAccumulated ? 'bg-[#9E7649] text-white shadow-lg' : 'bg-black/20 text-[#9E7649] border border-[#9E7649]/30 hover:bg-[#9E7649]/10'}`}
                          title={showAccumulated ? 'Ver Registro' : 'Ver Acumulado'}
                      >
                          <FileBarChart size={14} />
                          <span className="hidden lg:inline">{showAccumulated ? 'Ver Registro' : 'Ver Acumulado'}</span>
                      </button>
                      <button 
                          onClick={() => { setShowMonthlyPayments(!showMonthlyPayments); setShowAccumulated(false); }}
                          className={`flex items-center gap-1 text-xs px-2 py-2 rounded-lg font-bold transition-all ${showMonthlyPayments ? 'bg-[#9E7649] text-white shadow-lg' : 'bg-black/20 text-[#9E7649] border border-[#9E7649]/30 hover:bg-[#9E7649]/10'}`}
                          title="Pagos Mensuales"
                      >
                          <CalendarCheck size={14} />
                          <span className="hidden lg:inline">Pagos</span>
                      </button>
                      <button 
                          onClick={() => setUserPaymentConfig(null)}
                          className="flex items-center gap-1 text-xs px-2 py-2 rounded-lg font-bold bg-black/20 text-[#9E7649] border border-[#9E7649]/30 hover:bg-[#9E7649]/10 transition-all"
                          title="Configuración"
                      >
                          <Settings size={14} />
                          <span className="hidden lg:inline">Config</span>
                      </button>
                  </div>
              </CMNLHeader>

              <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
                  {/* Summary Card */}
                  <div className="bg-gradient-to-r from-[#2C1B15] to-[#3E1E16] p-4 sm:p-6 rounded-xl border border-[#9E7649]/20 shadow-lg mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full">
                          <div className="min-w-0">
                              <p className="text-[#9E7649] text-[10px] sm:text-sm uppercase tracking-wider mb-1">Acumulado Bruto</p>
                              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white break-words">${monthTotal.toFixed(2)}</h2>
                              <p className="text-[10px] text-[#E8DCCF]/50 mt-1">Total devengado</p>
                          </div>
                          <div className="border-t sm:border-t-0 sm:border-l border-[#9E7649]/20 pt-4 sm:pt-0 sm:pl-6 lg:pl-8 min-w-0">
                              <p className="text-[#9E7649] text-[10px] sm:text-sm uppercase tracking-wider mb-1">Impuestos</p>
                              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-400 break-words">-${monthTax.toFixed(2)}</h2>
                              <p className="text-[10px] text-[#E8DCCF]/50 mt-1">Deducciones</p>
                          </div>
                          <div className="border-t sm:border-t-0 sm:border-l border-[#9E7649]/20 pt-4 sm:pt-0 sm:pl-6 lg:pl-8 min-w-0">
                              <p className="text-[#9E7649] text-[10px] sm:text-sm uppercase tracking-wider mb-1">A Pagar (Neto)</p>
                              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400 break-words">${monthNet.toFixed(2)}</h2>
                              <p className="text-[10px] text-[#E8DCCF]/50 mt-1">Pago definitivo</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 w-full lg:w-auto lg:text-right border-t lg:border-t-0 border-[#9E7649]/10 pt-4 lg:pt-0">
                          {userPaymentConfig.roles.map(role => (
                              <div key={role.id}>
                                  <div className="text-[10px] sm:text-xs text-[#E8DCCF]">
                                      <span className="text-[#9E7649] font-bold">{role.role}:</span> {role.level}
                                      {role.isHabitual && <span className="ml-2 text-[10px] bg-[#9E7649]/20 text-[#9E7649] px-1 rounded">Habitual</span>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {showAccumulated ? (
                      <div className="space-y-6">
                          <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 overflow-hidden p-4">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="text-white font-bold">Historial Acumulado (Mes Actual)</h3>
                                  <div className="flex gap-2">
                                      <button onClick={consolidateMonth} className="flex items-center gap-2 bg-[#9E7649] text-white px-3 py-1 rounded text-sm hover:bg-[#8B653D]">
                                          <Save size={16} /> Consolidar Mes
                                      </button>
                                      <button onClick={generatePDF} className="flex items-center gap-2 bg-black/20 text-[#9E7649] border border-[#9E7649]/30 px-3 py-1 rounded text-sm hover:bg-[#9E7649]/10">
                                          <FileDown size={16} /> Descargar PDF
                                      </button>
                                      <button onClick={clearMonth} className="flex items-center gap-2 bg-red-900/50 text-red-200 border border-red-900/50 px-3 py-1 rounded text-sm hover:bg-red-900/80">
                                          <Trash2 size={16} /> Limpiar Mes
                                      </button>
                                  </div>
                              </div>
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="text-xs text-[#9E7649] uppercase bg-[#3E1E16]">
                                          <tr>
                                              <th className="px-6 py-3">Fecha</th>
                                              <th className="px-6 py-3">Cargo</th>
                                              <th className="px-6 py-3">Programa</th>
                                              <th className="px-6 py-3 text-right">Monto</th>
                                              <th className="px-6 py-3 text-center">Acciones</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {workLogs
                                              .filter(l => l.userId === currentUser?.username && userPaymentConfig.roles.some(r => r.role === l.role))
                                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                              .map(log => (
                                              <tr key={log.id} className="border-b border-[#9E7649]/10 hover:bg-white/5">
                                                  <td className="px-6 py-4 text-white">{log.date}</td>
                                                  <td className="px-6 py-4 text-[#9E7649]">{log.role}</td>
                                                  <td className="px-6 py-4 text-white">{log.programName}</td>
                                                  <td className="px-6 py-4 text-right font-mono text-[#9E7649]">${log.amount.toFixed(2)}</td>
                                                  <td className="px-6 py-4 text-center">
                                                      <button 
                                                          onClick={() => toggleWorkLog(log.programName, log.date, log.role)}
                                                          className="text-red-400 hover:text-red-300 p-1"
                                                      >
                                                          <Trash2 size={16} />
                                                      </button>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  ) : showMonthlyPayments ? (
                      <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 overflow-hidden p-6">
                          <h3 className="text-xl font-bold text-white mb-6">Pagos Mensuales Consolidados</h3>
                          {consolidatedPayments.filter(c => c.userId === currentUser?.username).length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {consolidatedPayments
                                      .filter(c => c.userId === currentUser?.username)
                                      .sort((a, b) => b.month.localeCompare(a.month))
                                      .map(c => (
                                          <div key={c.id} className="bg-black/20 p-4 rounded-lg border border-[#9E7649]/20 flex justify-between items-center">
                                              <div>
                                                  <p className="text-[#9E7649] font-bold text-lg">{c.month}</p>
                                                  <p className="text-xs text-[#E8DCCF]/50">Consolidado el {new Date(c.dateConsolidated).toLocaleDateString()}</p>
                                              </div>
                                              <p className="text-2xl font-bold text-white">${c.amount.toFixed(2)}</p>
                                          </div>
                                      ))}
                              </div>
                          ) : (
                              <div className="text-center py-12 text-[#E8DCCF]/50">
                                  No hay pagos mensuales consolidados aún.
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="space-y-8">
                          {/* Controls */}
                          <div className="flex flex-wrap gap-4 mb-6 bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/10">
                              <div className="flex items-center gap-2 bg-black/20 rounded p-1 border border-[#9E7649]/30">
                                  <button onClick={() => setWorkLogView('daily')} className={`px-3 py-1 rounded ${workLogView === 'daily' ? 'bg-[#9E7649] text-white' : 'text-[#9E7649]'}`}>Diario</button>
                                  <button onClick={() => setWorkLogView('weekly')} className={`px-3 py-1 rounded ${workLogView === 'weekly' ? 'bg-[#9E7649] text-white' : 'text-[#9E7649]'}`}>Semanal</button>
                              </div>

                              <div className="flex items-center gap-2 ml-auto">
                                  <button onClick={() => {
                                      const d = new Date(workLogDate);
                                      d.setDate(d.getDate() - (workLogView === 'weekly' ? 7 : 1));
                                      setWorkLogDate(d.toISOString().split('T')[0]);
                                  }} className="p-2 hover:bg-white/10 rounded-full"><ChevronLeft size={20}/></button>
                                  
                                  <span className="font-mono font-bold text-white">
                                      {workLogView === 'daily' ? new Date(workLogDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : `Semana: ${formatDateRange(dates)}`}
                                  </span>

                                  <button onClick={() => {
                                      const d = new Date(workLogDate);
                                      d.setDate(d.getDate() + (workLogView === 'weekly' ? 7 : 1));
                                      setWorkLogDate(d.toISOString().split('T')[0]);
                                  }} className="p-2 hover:bg-white/10 rounded-full"><ChevronRight size={20}/></button>
                              </div>
                          </div>

                          {userPaymentConfig.roles.map(role => {
                              return (
                                  <div key={role.id} className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 overflow-hidden">
                                      <div className="bg-[#3E1E16] px-6 py-3 border-b border-[#9E7649]/10 flex justify-between items-center">
                                          <div>
                                              <h3 className="text-white font-bold">{role.role}</h3>
                                              <p className="text-[10px] text-[#9E7649]">{role.isHabitual ? 'Habitualidad Activa' : 'Selección Manual'}</p>
                                          </div>
                                          {role.isHabitual && (
                                              <button 
                                                  onClick={() => autoCompleteHabitual(role, dates)}
                                                  className="flex items-center gap-2 bg-[#9E7649]/20 text-[#9E7649] hover:bg-[#9E7649] hover:text-white px-3 py-1 rounded text-xs transition-colors border border-[#9E7649]/30"
                                              >
                                                  ✨ Autocompletar Habituales
                                              </button>
                                          )}
                                      </div>
                                      <div className="overflow-x-auto">
                                          <table className="w-full text-sm text-left">
                                              <thead className="text-xs text-[#9E7649] uppercase bg-black/20">
                                                  <tr>
                                                      <th className="px-6 py-3">Programa</th>
                                                      {dates.map(date => (
                                                          <th key={date} className="px-6 py-3 text-center">
                                                              {workLogView === 'daily' ? 'Selección' : new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                                          </th>
                                                      ))}
                                                  </tr>
                                              </thead>
                                              <tbody>
                                                  {programsList.map(prog => {
                                                      const isAired = dates.some(date => {
                                                          const ficha = fichas.find(f => f.name === prog);
                                                          return ficha ? isProgramOnDay(ficha, date) : true;
                                                      });

                                                      if (!isAired) return null;

                                                      return (
                                                          <tr key={prog} className="border-b border-[#9E7649]/10 hover:bg-white/5">
                                                              <td className="px-6 py-4 font-medium text-white">{prog}</td>
                                                              {dates.map(date => {
                                                                  const isWorked = workLogs.some(l => 
                                                                      l.userId === currentUser?.username && 
                                                                      l.role === role.role && 
                                                                      l.programName === prog && 
                                                                      l.date === date
                                                                  );
                                                                  
                                                                  const ficha = fichas.find(f => f.name === prog);
                                                                  const canWork = ficha ? isProgramOnDay(ficha, date) : true;

                                                                  return (
                                                                      <td key={date} className="px-6 py-4 text-center">
                                                                          {canWork ? (
                                                                              <button 
                                                                                  onClick={() => toggleWorkLog(prog, date, role.role)}
                                                                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isWorked ? 'bg-[#9E7649] text-white shadow-lg scale-110' : 'bg-black/20 text-[#9E7649]/30 hover:bg-[#9E7649]/20'}`}
                                                                              >
                                                                                  <Check size={16} className={isWorked ? 'opacity-100' : 'opacity-0'} />
                                                                              </button>
                                                                          ) : (
                                                                              <span className="text-[#E8DCCF]/10">-</span>
                                                                          )}
                                                                      </td>
                                                                  );
                                                              })}
                                                          </tr>
                                                      );
                                                  })}
                                              </tbody>
                                          </table>
                                      </div>
                                  </div>
                              );
                          })}
                          <div className="mt-4 flex justify-end">
                              <button 
                                  onClick={() => {
                                      alert('Selección guardada en el Acumulado.');
                                      setShowAccumulated(true);
                                  }}
                                  className="bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                              >
                                  <Save size={18} />
                                  Guardar Selección
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // Render Catalog Section
  if (activeSection === 'catalogo') {
      if (selectedCatalogItem) {
          return (
              <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
                  <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
                      <button onClick={() => setSelectedCatalogItem(null)} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
                          <ArrowLeft size={20} className="text-[#F5EFE6]" />
                      </button>
                      <div className="flex-1">
                          <h1 className="text-lg font-bold text-white leading-none">{selectedCatalogItem.name}</h1>
                          <p className="text-[10px] text-[#9E7649]">Catálogo de Pagos</p>
                      </div>
                  </div>

                  <div className="p-6 max-w-5xl mx-auto w-full overflow-y-auto pb-20">
                      <div className="grid gap-6">
                          {selectedCatalogItem.roles.map((role, idx) => (
                              <div key={idx} className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 overflow-hidden">
                                  <div className="bg-[#3E1E16]/50 p-4 border-b border-[#9E7649]/10 flex justify-between items-center">
                                      <h3 className="text-white font-bold text-lg">{role.role}</h3>
                                      <div className="flex gap-4 text-xs">
                                          {role.percentage && <span className="bg-[#9E7649]/20 text-[#9E7649] px-2 py-1 rounded">Porcentaje: {formatPercentage(role.percentage)}</span>}
                                          {role.tr && <span className="bg-[#9E7649]/20 text-[#9E7649] px-2 py-1 rounded">T/R: {role.tr}</span>}
                                      </div>
                                  </div>
                                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {role.salaries.length > 0 && (
                                          <div>
                                              <h4 className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-2">Salarios por Niveles</h4>
                                              <div className="grid grid-cols-2 gap-2">
                                                  {role.salaries.map((s, i) => (
                                                      <div key={i} className="flex justify-between bg-black/20 p-2 rounded text-sm">
                                                          <span className="text-[#9E7649]">{s.level}</span>
                                                          <span className="text-white font-mono">${s.amount}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                      {role.rates.length > 0 && (
                                          <div>
                                              <h4 className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-2">Tasas por Niveles</h4>
                                              <div className="grid grid-cols-2 gap-2">
                                                  {role.rates.map((r, i) => (
                                                      <div key={i} className="flex justify-between bg-black/20 p-2 rounded text-sm">
                                                          <span className="text-[#9E7649]">{r.level}</span>
                                                          <span className="text-white font-mono">${r.amount}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
              <CMNLHeader 
                  user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                  sectionTitle="Catálogo"
                  onMenuClick={onMenuClick}
                  onBack={() => setActiveSection(null)}
              >
                  {isAdmin && (
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={() => { if(confirm('¿Eliminar todo el catálogo?')) setCatalogo([]); }}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                              title="Eliminar Todo"
                          >
                              <Trash2 size={20} />
                          </button>
                          <label className="text-[#9E7649] hover:text-white transition-colors cursor-pointer flex items-center justify-center p-2" title="Importar Catálogo (TXT)">
                              <span className="material-symbols-outlined text-2xl">upload_file</span>
                              <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'catalogo')} className="hidden" />
                          </label>
                      </div>
                  )}
              </CMNLHeader>

              <div className="p-6 overflow-y-auto pb-20">
                  {catalogo.length === 0 ? (
                      <div className="text-center py-20 text-[#E8DCCF]/30">
                          <Library size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No hay datos en el catálogo.</p>
                          {isAdmin && <p className="text-sm mt-2">Importa un archivo TXT para comenzar.</p>}
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                          {catalogo.map((item, idx) => (
                              <div key={idx} className="relative group">
                                  <button 
                                      onClick={() => setSelectedCatalogItem(item)}
                                      className="w-full bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10 hover:border-[#9E7649]/50 hover:bg-[#3E1E16] transition-all text-left shadow-sm hover:shadow-md flex flex-col gap-2"
                                  >
                                      <div className="flex justify-between items-start w-full">
                                          <div className="p-2 bg-[#9E7649]/10 rounded-lg text-[#9E7649] group-hover:bg-[#9E7649] group-hover:text-white transition-colors">
                                              <Library size={20} />
                                          </div>
                                          <span className="text-[10px] bg-black/20 px-2 py-1 rounded text-[#E8DCCF]/50">{item.roles.length} Roles</span>
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-white text-lg leading-tight group-hover:text-[#F5EFE6]">{item.name}</h3>
                                      </div>
                                  </button>
                                  {isAdmin && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar item del catálogo?')) setCatalogo(prev => prev.filter((_, i) => i !== idx)); }}
                                          className="absolute top-2 right-2 p-2 bg-red-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10"
                                          title="Eliminar"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // Render Fichas Section
  if (activeSection === 'fichas') {
      if (selectedFicha) {
          // Detail View
          return (
              <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
                  <CMNLHeader 
                      user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                      sectionTitle={selectedFicha.name}
                      onMenuClick={onMenuClick}
                      onBack={() => { setSelectedFicha(null); setIsEditing(false); }}
                  >
                      {isAdmin && !isEditing && (
                          <button onClick={handleEdit} className="p-2 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-lg transition-colors shadow-sm" title="Editar Ficha">
                              <Edit2 size={20} />
                          </button>
                      )}
                      {isEditing && (
                          <div className="flex gap-2">
                              <button onClick={handleSaveEdit} className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm" title="Guardar Cambios">
                                  <Check size={20} />
                              </button>
                              <button onClick={handleCancelEdit} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm" title="Cancelar">
                                  <X size={20} />
                              </button>
                          </div>
                      )}
                  </CMNLHeader>
                  
                  <div className="p-6 max-w-4xl mx-auto w-full overflow-y-auto pb-20">
                      {/* Header Card */}
                      <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 mb-6 shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Radio size={120} />
                          </div>
                          
                          {isEditing && editForm ? (
                              <div className="space-y-4 relative z-10">
                                  <div>
                                      <label className="text-xs text-[#9E7649] uppercase block mb-1">Nombre del Programa</label>
                                      <input 
                                          type="text" 
                                          value={editForm.name} 
                                          onChange={(e) => handleInputChange('name', e.target.value)}
                                          className="w-full bg-black/20 border border-[#9E7649]/30 rounded p-2 text-white font-bold text-xl"
                                      />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs text-[#9E7649] uppercase block mb-1">Horario</label>
                                          <input 
                                              type="text" 
                                              value={editForm.schedule} 
                                              onChange={(e) => handleInputChange('schedule', e.target.value)}
                                              className="w-full bg-black/20 border border-[#9E7649]/30 rounded p-2 text-white"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs text-[#9E7649] uppercase block mb-1">Frecuencia</label>
                                          <input 
                                              type="text" 
                                              value={editForm.frequency} 
                                              onChange={(e) => handleInputChange('frequency', e.target.value)}
                                              className="w-full bg-black/20 border border-[#9E7649]/30 rounded p-2 text-white"
                                          />
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <>
                                  <h2 className="text-3xl font-bold text-white mb-2 relative z-10">{selectedFicha.name}</h2>
                                  <p className="text-[#9E7649] text-lg font-medium mb-6 relative z-10">{selectedFicha.schedule} • {selectedFicha.frequency}</p>
                              </>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 relative z-10">
                              <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                  <span className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider block mb-1">Duración</span>
                                  {isEditing && editForm ? (
                                      <input 
                                          type="text" 
                                          value={editForm.duration} 
                                          onChange={(e) => handleInputChange('duration', e.target.value)}
                                          className="w-full bg-transparent border-b border-[#9E7649]/30 text-white font-bold"
                                      />
                                  ) : (
                                      <span className="text-xl font-bold text-white">{selectedFicha.duration}</span>
                                  )}
                              </div>
                              <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                  <span className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider block mb-1">Clasificación</span>
                                  {isEditing && editForm ? (
                                      <input 
                                          type="text" 
                                          value={editForm.func} 
                                          onChange={(e) => handleInputChange('func', e.target.value)}
                                          className="w-full bg-transparent border-b border-[#9E7649]/30 text-white font-bold"
                                      />
                                  ) : (
                                      <span className="text-xl font-bold text-white">{selectedFicha.func}</span>
                                  )}
                              </div>
                              <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                  <span className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider block mb-1">Público Meta</span>
                                  {isEditing && editForm ? (
                                      <input 
                                          type="text" 
                                          value={editForm.target} 
                                          onChange={(e) => handleInputChange('target', e.target.value)}
                                          className="w-full bg-transparent border-b border-[#9E7649]/30 text-white font-bold"
                                      />
                                  ) : (
                                      <span className="text-xl font-bold text-white">{selectedFicha.target}</span>
                                  )}
                              </div>
                              <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                  <span className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider block mb-1">Complejidad</span>
                                  {isEditing && editForm ? (
                                      <input 
                                          type="text" 
                                          value={editForm.complexity} 
                                          onChange={(e) => handleInputChange('complexity', e.target.value)}
                                          className="w-full bg-transparent border-b border-[#9E7649]/30 text-white font-bold"
                                      />
                                  ) : (
                                      <span className="text-xl font-bold text-white">{selectedFicha.complexity}</span>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* Objective */}
                      <div className="mb-8">
                          <h3 className="text-[#9E7649] font-bold text-lg mb-3 flex items-center gap-2">
                              <FileText size={20}/> Objetivo
                          </h3>
                          <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10 text-[#E8DCCF]/90 leading-relaxed">
                              {isEditing && editForm ? (
                                  <textarea 
                                      value={editForm.objective} 
                                      onChange={(e) => handleInputChange('objective', e.target.value)}
                                      className="w-full bg-black/20 border border-[#9E7649]/30 rounded p-2 text-white min-h-[100px]"
                                  />
                              ) : (
                                  selectedFicha.objective
                              )}
                          </div>
                      </div>

                      {/* Profile */}
                      <div className="mb-8">
                          <h3 className="text-[#9E7649] font-bold text-lg mb-3 flex items-center gap-2">
                              <Users size={20}/> Perfil
                          </h3>
                          <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10 text-[#E8DCCF]/90 leading-relaxed whitespace-pre-wrap">
                              {isEditing && editForm ? (
                                  <textarea 
                                      value={editForm.profile} 
                                      onChange={(e) => handleInputChange('profile', e.target.value)}
                                      className="w-full bg-black/20 border border-[#9E7649]/30 rounded p-2 text-white min-h-[200px]"
                                  />
                              ) : (
                                  selectedFicha.profile
                              )}
                          </div>
                      </div>

                      {/* Technical Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10">
                              <h4 className="text-white font-bold mb-4 border-b border-white/10 pb-2">Detalles de Emisión</h4>
                              <ul className="space-y-3 text-sm">
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Inicio:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.startDate} 
                                              onChange={(e) => handleInputChange('startDate', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.startDate}</span>
                                      )}
                                  </li>
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Tipo:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.emissionType} 
                                              onChange={(e) => handleInputChange('emissionType', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.emissionType}</span>
                                      )}
                                  </li>
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Forma:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.form} 
                                              onChange={(e) => handleInputChange('form', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.form}</span>
                                      )}
                                  </li>
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Tema:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.theme} 
                                              onChange={(e) => handleInputChange('theme', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.theme}</span>
                                      )}
                                  </li>
                              </ul>
                          </div>
                          <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10">
                              <h4 className="text-white font-bold mb-4 border-b border-white/10 pb-2">Distribución de Tiempo</h4>
                              <ul className="space-y-3 text-sm">
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Música:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.times.music} 
                                              onChange={(e) => handleNestedInputChange('times', 'music', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.times.music}</span>
                                      )}
                                  </li>
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Información:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.times.info} 
                                              onChange={(e) => handleNestedInputChange('times', 'info', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.times.info}</span>
                                      )}
                                  </li>
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Propaganda:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.times.propaganda} 
                                              onChange={(e) => handleNestedInputChange('times', 'propaganda', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.times.propaganda}</span>
                                      )}
                                  </li>
                              </ul>
                          </div>
                      </div>

                      {/* Additional Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10">
                              <h4 className="text-white font-bold mb-4 border-b border-white/10 pb-2">Musicalización</h4>
                              <ul className="space-y-3 text-sm">
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Música Cubana:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.music_cuban} 
                                              onChange={(e) => handleInputChange('music_cuban', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.music_cuban}</span>
                                      )}
                                  </li>
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Música Extranjera:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.music_foreign} 
                                              onChange={(e) => handleInputChange('music_foreign', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.music_foreign}</span>
                                      )}
                                  </li>
                              </ul>
                          </div>
                          <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10">
                              <h4 className="text-white font-bold mb-4 border-b border-white/10 pb-2">Otros Detalles</h4>
                              <ul className="space-y-3 text-sm">
                                  <li className="flex justify-between items-center">
                                      <span className="text-[#E8DCCF]/50">Grupo:</span> 
                                      {isEditing && editForm ? (
                                          <input 
                                              type="text" 
                                              value={editForm.group} 
                                              onChange={(e) => handleInputChange('group', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded px-2 py-1 text-white text-right w-1/2"
                                          />
                                      ) : (
                                          <span>{selectedFicha.group}</span>
                                      )}
                                  </li>
                                  <li className="flex flex-col gap-1">
                                      <span className="text-[#E8DCCF]/50">Soporte Literario:</span> 
                                      {isEditing && editForm ? (
                                          <textarea 
                                              value={editForm.literarySupport} 
                                              onChange={(e) => handleInputChange('literarySupport', e.target.value)}
                                              className="bg-black/20 border border-[#9E7649]/30 rounded p-2 text-white min-h-[60px]"
                                          />
                                      ) : (
                                          <span>{selectedFicha.literarySupport}</span>
                                      )}
                                  </li>
                              </ul>
                          </div>
                      </div>

                      {/* Sections */}
                      {selectedFicha.sections && selectedFicha.sections.length > 0 && (
                          <div>
                              <h3 className="text-[#9E7649] font-bold text-lg mb-3 flex items-center gap-2">
                                  <Library size={20}/> Secciones
                              </h3>
                              <div className="grid gap-3">
                                  {(isEditing && editForm ? editForm.sections : selectedFicha.sections).map((sec, idx) => (
                                      <div key={idx} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/10 hover:border-[#9E7649]/30 transition-colors">
                                          {isEditing && editForm ? (
                                              <div className="space-y-2">
                                                  <div className="flex gap-2">
                                                      <input 
                                                          type="text" 
                                                          value={sec.name} 
                                                          onChange={(e) => handleSectionChange(idx, 'name', e.target.value)}
                                                          className="flex-1 bg-black/20 border border-[#9E7649]/30 rounded p-1 text-white font-bold"
                                                          placeholder="Nombre Sección"
                                                      />
                                                      <input 
                                                          type="text" 
                                                          value={sec.schedule} 
                                                          onChange={(e) => handleSectionChange(idx, 'schedule', e.target.value)}
                                                          className="w-24 bg-black/20 border border-[#9E7649]/30 rounded p-1 text-[#9E7649] text-xs"
                                                          placeholder="Horario"
                                                      />
                                                  </div>
                                                  <textarea 
                                                      value={sec.description} 
                                                      onChange={(e) => handleSectionChange(idx, 'description', e.target.value)}
                                                      className="w-full bg-black/20 border border-[#9E7649]/30 rounded p-1 text-sm text-[#E8DCCF]/70 min-h-[60px]"
                                                      placeholder="Descripción"
                                                  />
                                              </div>
                                          ) : (
                                              <>
                                                  <div className="flex justify-between items-start mb-1">
                                                      <h5 className="font-bold text-white">{sec.name}</h5>
                                                      <span className="text-xs bg-black/30 px-2 py-1 rounded text-[#9E7649]">{sec.schedule}</span>
                                                  </div>
                                                  <p className="text-sm text-[#E8DCCF]/70">{sec.description}</p>
                                              </>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          );
      }

      // List View
      return (
          <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
              <CMNLHeader 
                  user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                  sectionTitle="Fichas de Programas"
                  onMenuClick={onMenuClick}
                  onBack={handleBackNavigation}
              >
                  {isAdmin && (
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={() => { if(confirm('¿Eliminar todas las fichas?')) setFichas([]); }}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                              title="Eliminar Todas"
                          >
                              <Trash2 size={20} />
                          </button>
                          <label className="text-[#9E7649] hover:text-white transition-colors cursor-pointer flex items-center justify-center p-2" title="Importar Fichas (TXT)">
                              <span className="material-symbols-outlined text-2xl">upload_file</span>
                              <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'fichas')} className="hidden" />
                          </label>
                      </div>
                  )}
              </CMNLHeader>

              <div className="p-6 overflow-y-auto pb-20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                      {fichas.map((ficha, idx) => (
                          <div key={idx} className="relative group">
                              <button 
                                  onClick={() => setSelectedFicha(ficha)}
                                  className="w-full bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10 hover:border-[#9E7649]/50 hover:bg-[#3E1E16] transition-all text-left shadow-sm hover:shadow-md flex flex-col gap-2"
                              >
                                  <div className="flex justify-between items-start w-full">
                                      <div className="p-2 bg-[#9E7649]/10 rounded-lg text-[#9E7649] group-hover:bg-[#9E7649] group-hover:text-white transition-colors">
                                          <FileText size={20} />
                                      </div>
                                      <span className="text-[10px] bg-black/20 px-2 py-1 rounded text-[#E8DCCF]/50">{ficha.frequency}</span>
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-white text-lg leading-tight group-hover:text-[#F5EFE6]">{ficha.name}</h3>
                                      <p className="text-xs text-[#9E7649] mt-1">{ficha.schedule}</p>
                                  </div>
                              </button>
                              {isAdmin && (
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar ficha?')) setFichas(prev => prev.filter((_, i) => i !== idx)); }}
                                      className="absolute top-2 right-2 p-2 bg-red-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10"
                                      title="Eliminar"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  // Render Equipo Section
  if (activeSection === 'equipo') {
      return <EquipoSection currentUser={currentUser} onBack={() => setActiveSection(null)} onMenuClick={onMenuClick || (() => {})} />;
  }

  // Main Menu
  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      {/* Header */}
      <CMNLHeader 
          user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
          sectionTitle="Gestión"
          onMenuClick={onMenuClick}
          onBack={onBack}
      />

      {/* Grid Menu */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
          {menuItems.map((item, index) => (
            <button 
              key={index}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border ${item.color} hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg aspect-square`}
            >
              <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm">
                {item.icon}
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generic Dialog */}
      {dialog.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">{dialog.title}</h3>
                  <p className="text-sm text-[#E8DCCF] mb-6 whitespace-pre-line">{dialog.message}</p>
                  <div className="flex justify-end gap-3">
                      {dialog.type === 'confirm' && (
                          <button onClick={() => setDialog({ ...dialog, isOpen: false })} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">
                              Cancelar
                          </button>
                      )}
                      <button 
                          onClick={() => {
                              setDialog({ ...dialog, isOpen: false });
                              if (dialog.onConfirm) dialog.onConfirm();
                          }} 
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]"
                      >
                          {dialog.type === 'confirm' ? 'Aceptar' : 'Entendido'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Restriction Modal */}
      {showRestrictionModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="text-yellow-500" size={24} />
                      <h3 className="text-xl font-bold text-white">Acción no permitida</h3>
                  </div>
                  <p className="text-sm text-[#E8DCCF] mb-6">
                      {isAdmin 
                        ? "Acción Requerida: Debe consolidar el mes anterior para habilitar la visualización del mes actual."
                        : "Datos en proceso de consolidación. Por favor, consulte en 24 horas."}
                  </p>
                  {isAdmin && (
                      <div className="flex justify-end">
                          <button onClick={() => { setShowRestrictionModal(false); setActiveSection('pagos'); }} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]">
                              Ir a Consolidar
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default GestionApp;
