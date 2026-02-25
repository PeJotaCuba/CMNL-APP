import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, FileBarChart, Library, FileText, Users, CreditCard, Upload, Save, X, Edit2, Check, CalendarCheck, ChevronLeft, ChevronRight, Trash2, FileDown, Plus } from 'lucide-react';
import { ProgramFicha, ProgramSection, User, ProgramCatalog, RolePaymentInfo } from '../types';
import { INITIAL_FICHAS } from '../utils/fichasData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  onBack: () => void;
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
}

const GestionApp: React.FC<Props> = ({ onBack, currentUser }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
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
      if (currentUser && userPaymentConfig) {
          localStorage.setItem(`rcm_payment_config_${currentUser.username}`, JSON.stringify(userPaymentConfig));
      }
  }, [userPaymentConfig, currentUser]);

  const menuItems = [
    { id: 'transmision', icon: <Radio size={32} />, label: 'Transmisión', color: 'bg-red-900/40 text-red-400 border-red-500/30' },
    { id: 'reportes', icon: <FileBarChart size={32} />, label: 'Reportes', color: 'bg-blue-900/40 text-blue-400 border-blue-500/30' },
    { id: 'catalogo', icon: <Library size={32} />, label: 'Catálogo', color: 'bg-amber-900/40 text-amber-400 border-amber-500/30' },
    { id: 'fichas', icon: <FileText size={32} />, label: 'Fichas', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' },
    { id: 'equipo', icon: <Users size={32} />, label: 'Equipo', color: 'bg-purple-900/40 text-purple-400 border-purple-500/30' },
    { id: 'pagos', icon: <CreditCard size={32} />, label: 'Pagos', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-500/30' },
  ];

  const isAdmin = currentUser?.role === 'admin';

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
          setCatalogo(programs);
          alert(`Se han importado ${programs.length} programas al catálogo.`);
      } else {
          alert('No se pudieron encontrar datos válidos en el archivo.');
      }
  };

  const parseAndImportFichas = (text: string) => {
    // Basic parser based on the provided format
    // This assumes the text format matches the provided example
    const programs: ProgramFicha[] = [];
    const blocks = text.split('________________________________________________________');
    
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
        setFichas(programs);
        alert(`Se han importado ${programs.length} fichas de programas.`);
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

  const calculateTotalPayment = () => {
      if (!userPaymentConfig || !currentUser) return 0;
      
      // Sum existing work logs
      const logsTotal = workLogs
          .filter(l => l.userId === currentUser.username && userPaymentConfig.roles.some(r => r.role === l.role))
          .reduce((acc, log) => acc + log.amount, 0);

      // Sum habitual earnings for the current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      let habitualTotal = 0;
      userPaymentConfig.roles.forEach(role => {
          if (role.isHabitual) {
              for (let d = 1; d <= daysInMonth; d++) {
                  const date = new Date(year, month, d);
                  const dayOfWeek = date.getDay();
                  if (role.habitualDays.includes(dayOfWeek)) {
                      role.habitualPrograms.forEach(prog => {
                          habitualTotal += getProgramRate(prog, role.role, role.level);
                      });
                  }
              }
          }
      });

      return logsTotal + habitualTotal;
  };

  // Render Pagos Section
  if (activeSection === 'pagos') {
      // Configuration View
      if (!userPaymentConfig) {
          const addRole = () => {
              if (configForm.roles.length < 3) {
                  setConfigForm({
                      ...configForm,
                      roles: [...configForm.roles, {
                          id: Date.now().toString(),
                          role: 'Director',
                          level: 'I',
                          isHabitual: false,
                          habitualPrograms: [],
                          habitualDays: []
                      }]
                  });
              }
          };

          const removeRole = (id: string) => {
              if (configForm.roles.length > 1) {
                  setConfigForm({
                      ...configForm,
                      roles: configForm.roles.filter(r => r.id !== id)
                  });
              }
          };

          const updateRole = (id: string, updates: Partial<RoleConfig>) => {
              setConfigForm({
                  ...configForm,
                  roles: configForm.roles.map(r => r.id === id ? { ...r, ...updates } : r)
              });
          };

          const toggleHabitualDay = (roleId: string, day: number) => {
              const role = configForm.roles.find(r => r.id === roleId);
              if (!role) return;
              const newDays = role.habitualDays.includes(day)
                  ? role.habitualDays.filter(d => d !== day)
                  : [...role.habitualDays, day];
              updateRole(roleId, { habitualDays: newDays });
          };

          const toggleHabitualProgram = (roleId: string, program: string) => {
              const role = configForm.roles.find(r => r.id === roleId);
              if (!role) return;
              const newProgs = role.habitualPrograms.includes(program)
                  ? role.habitualPrograms.filter(p => p !== program)
                  : [...role.habitualPrograms, program];
              updateRole(roleId, { habitualPrograms: newProgs });
          };

          const programsList = fichas.map(f => f.name).sort();
          if (programsList.length === 0 && catalogo.length > 0) {
              catalogo.forEach(c => {
                  if (!programsList.includes(c.name)) programsList.push(c.name);
              });
          }

          return (
              <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
                  <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
                      <button onClick={() => setActiveSection(null)} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
                          <ArrowLeft size={20} className="text-[#F5EFE6]" />
                      </button>
                      <div className="flex-1">
                          <h1 className="text-lg font-bold text-white leading-none">Configuración de Pagos</h1>
                          <p className="text-[10px] text-[#9E7649]">Información requerida</p>
                      </div>
                  </div>
                  <div className="p-6 max-w-2xl mx-auto w-full mt-4">
                      <div className="bg-[#2C1B15] p-6 rounded-xl border border-[#9E7649]/10 shadow-lg">
                          <h2 className="text-xl font-bold text-white mb-4">Configure su Perfil</h2>
                          <p className="text-sm text-[#E8DCCF]/70 mb-6">Seleccione sus cargos (hasta 3) y niveles. Puede configurar la habitualidad para cada uno.</p>
                          
                          <div className="space-y-8">
                              {configForm.roles.map((role, index) => (
                                  <div key={role.id} className="p-4 bg-black/20 rounded-lg border border-[#9E7649]/20 relative">
                                      <div className="flex justify-between items-center mb-4">
                                          <h3 className="text-[#9E7649] font-bold uppercase text-xs tracking-widest">Función {index + 1}</h3>
                                          {configForm.roles.length > 1 && (
                                              <button onClick={() => removeRole(role.id)} className="text-red-400 hover:text-red-300">
                                                  <Trash2 size={16} />
                                              </button>
                                          )}
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                          <div>
                                              <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Cargo</label>
                                              <select 
                                                  value={role.role}
                                                  onChange={(e) => updateRole(role.id, { role: e.target.value })}
                                                  className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded p-2 text-sm text-white"
                                              >
                                                  <option value="Director">Director</option>
                                                  <option value="Asesor">Asesor</option>
                                                  <option value="Locutor">Locutor</option>
                                                  <option value="Realizador de sonido">Realizador de sonido</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Nivel</label>
                                              <select 
                                                  value={role.level}
                                                  onChange={(e) => updateRole(role.id, { level: e.target.value })}
                                                  className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded p-2 text-sm text-white"
                                              >
                                                  <option value="I">Nivel I</option>
                                                  <option value="II">Nivel II</option>
                                                  <option value="III">Nivel III</option>
                                              </select>
                                          </div>
                                      </div>

                                      <div className="mt-4 pt-4 border-t border-[#9E7649]/10">
                                          <div className="flex items-center justify-between mb-4">
                                              <div className="flex items-center gap-2">
                                                  <input 
                                                      type="checkbox" 
                                                      id={`habitual-${role.id}`}
                                                      checked={role.isHabitual}
                                                      onChange={(e) => updateRole(role.id, { isHabitual: e.target.checked })}
                                                      className="w-4 h-4 accent-[#9E7649]"
                                                  />
                                                  <label htmlFor={`habitual-${role.id}`} className="text-sm font-bold text-white cursor-pointer">Activar Habitualidad</label>
                                              </div>
                                          </div>

                                          {role.isHabitual && (
                                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                  <div>
                                                      <label className="block text-[10px] text-[#9E7649] uppercase mb-2">Días Habituales</label>
                                                      <div className="flex flex-wrap gap-2">
                                                          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                                                              <button
                                                                  key={i}
                                                                  onClick={() => toggleHabitualDay(role.id, i)}
                                                                  className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all ${role.habitualDays.includes(i) ? 'bg-[#9E7649] text-white' : 'bg-black/40 text-[#9E7649] border border-[#9E7649]/20'}`}
                                                              >
                                                                  {day}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </div>
                                                  <div>
                                                      <label className="block text-[10px] text-[#9E7649] uppercase mb-2">Programas Habituales</label>
                                                      <div className="max-h-40 overflow-y-auto bg-black/40 rounded border border-[#9E7649]/20 p-2 grid grid-cols-1 gap-1">
                                                          {programsList.map(prog => (
                                                              <button
                                                                  key={prog}
                                                                  onClick={() => toggleHabitualProgram(role.id, prog)}
                                                                  className={`text-left px-2 py-1 rounded text-xs transition-colors ${role.habitualPrograms.includes(prog) ? 'bg-[#9E7649]/20 text-white border border-[#9E7649]/30' : 'text-[#E8DCCF]/60 hover:bg-white/5'}`}
                                                              >
                                                                  {prog}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))}

                              {configForm.roles.length < 3 && (
                                  <button 
                                      onClick={addRole}
                                      className="w-full py-3 border-2 border-dashed border-[#9E7649]/30 rounded-lg text-[#9E7649] hover:bg-[#9E7649]/10 hover:border-[#9E7649]/50 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                                  >
                                      <Plus size={18} /> Añadir Función
                                  </button>
                              )}

                              <button 
                                  onClick={() => setUserPaymentConfig(configForm)}
                                  className="w-full bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-8"
                              >
                                  Guardar Configuración
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

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
              const start = new Date(currentDate);
              const day = start.getDay();
              const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
              start.setDate(diff);
              
              for(let i=0; i<7; i++) {
                  const d = new Date(start);
                  d.setDate(start.getDate() + i);
                  dates.push(d.toISOString().split('T')[0]);
              }
              return dates;
          }
          return [workLogDate];
      };

      const dates = getDates();
      const totalGenerated = calculateTotalPayment();

      return (
          <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
              {/* Header */}
              <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
                  <button onClick={() => setActiveSection(null)} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
                      <ArrowLeft size={20} className="text-[#F5EFE6]" />
                  </button>
                  <div className="flex-1">
                      <h1 className="text-lg font-bold text-white leading-none">Pagos</h1>
                      <p className="text-[10px] text-[#9E7649]">Control y Cálculo de Salarios</p>
                  </div>
                  <div className="flex gap-2">
                       <button 
                          onClick={() => setShowAccumulated(!showAccumulated)}
                          className={`text-xs px-3 py-1 rounded border ${showAccumulated ? 'bg-[#9E7649] text-white border-[#9E7649]' : 'border-[#9E7649]/30 text-[#9E7649]'}`}
                      >
                          {showAccumulated ? 'Ver Registro' : 'Ver Acumulado'}
                      </button>
                      <button 
                          onClick={() => setUserPaymentConfig(null)}
                          className="text-xs text-[#9E7649] hover:text-white underline"
                      >
                          Configuración
                      </button>
                  </div>
              </div>

              <div className="p-6 max-w-6xl mx-auto w-full">
                  {/* Summary Card */}
                  <div className="bg-gradient-to-r from-[#2C1B15] to-[#3E1E16] p-6 rounded-xl border border-[#9E7649]/20 shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                          <p className="text-[#9E7649] text-sm uppercase tracking-wider mb-1">Total Generado</p>
                          <h2 className="text-4xl font-bold text-white">${totalGenerated.toFixed(2)}</h2>
                          <p className="text-xs text-[#E8DCCF]/50 mt-1">Antes de impuestos</p>
                      </div>
                      <div className="text-right">
                          <div className="text-sm text-[#E8DCCF]">
                              <span className="text-[#9E7649]">Cargo:</span> {userPaymentConfig.role}
                          </div>
                          <div className="text-sm text-[#E8DCCF]">
                              <span className="text-[#9E7649]">Nivel:</span> {userPaymentConfig.level}
                          </div>
                      </div>
                  </div>

                  {showAccumulated ? (
                      <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 overflow-hidden p-4">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-white font-bold">Historial Acumulado</h3>
                              <button onClick={generatePDF} className="flex items-center gap-2 bg-[#9E7649] text-white px-3 py-1 rounded text-sm hover:bg-[#8B653D]">
                                  <FileDown size={16} /> Descargar PDF
                              </button>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-[#9E7649] uppercase bg-[#3E1E16]">
                                      <tr>
                                          <th className="px-6 py-3">Fecha</th>
                                          <th className="px-6 py-3">Programa</th>
                                          <th className="px-6 py-3 text-right">Monto</th>
                                          <th className="px-6 py-3 text-center">Acciones</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {workLogs
                                          .filter(l => l.userId === currentUser?.username && l.role === userPaymentConfig.role)
                                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                          .map(log => (
                                          <tr key={log.id} className="border-b border-[#9E7649]/10 hover:bg-white/5">
                                              <td className="px-6 py-4 text-white">{log.date}</td>
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
                  ) : (
                      <>
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
                                      {workLogView === 'daily' ? workLogDate : `Semana del ${dates[0]}`}
                                  </span>

                                  <button onClick={() => {
                                      const d = new Date(workLogDate);
                                      d.setDate(d.getDate() + (workLogView === 'weekly' ? 7 : 1));
                                      setWorkLogDate(d.toISOString().split('T')[0]);
                                  }} className="p-2 hover:bg-white/10 rounded-full"><ChevronRight size={20}/></button>
                              </div>
                          </div>

                          {/* Grid */}
                          <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 overflow-hidden">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="text-xs text-[#9E7649] uppercase bg-[#3E1E16]">
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
                                              // Check if program is aired on any of the selected dates
                                              const isAired = dates.some(date => {
                                                  const ficha = fichas.find(f => f.name === prog);
                                                  return ficha ? isProgramOnDay(ficha, date) : true; // If no ficha, assume yes
                                              });

                                              if (!isAired) return null;

                                              return (
                                                  <tr key={prog} className="border-b border-[#9E7649]/10 hover:bg-white/5">
                                                      <td className="px-6 py-4 font-medium text-white">{prog}</td>
                                                      {dates.map(date => {
                                                          const isWorked = workLogs.some(l => 
                                                              l.userId === currentUser?.username && 
                                                              l.role === userPaymentConfig.role && 
                                                              l.programName === prog && 
                                                              l.date === date
                                                          );
                                                          
                                                          const ficha = fichas.find(f => f.name === prog);
                                                          const canWork = ficha ? isProgramOnDay(ficha, date) : true;

                                                          return (
                                                              <td key={date} className="px-6 py-4 text-center">
                                                                  {canWork ? (
                                                                      <button 
                                                                          onClick={() => toggleWorkLog(prog, date, userPaymentConfig.role)}
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
                                          {programsList.length === 0 && (
                                              <tr>
                                                  <td colSpan={dates.length + 1} className="px-6 py-8 text-center text-[#E8DCCF]/50">
                                                      No hay programas registrados. Importa fichas o catálogo primero.
                                                  </td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
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
                      </>
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
              <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
                  <button onClick={() => setActiveSection(null)} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
                      <ArrowLeft size={20} className="text-[#F5EFE6]" />
                  </button>
                  <div className="flex-1">
                      <h1 className="text-lg font-bold text-white leading-none">Catálogo</h1>
                      <p className="text-[10px] text-[#9E7649]">Gestión de Pagos Artísticos</p>
                  </div>
                  {isAdmin && (
                      <div className="flex gap-2">
                          <label className="p-2 bg-[#2C1B15] hover:bg-[#3E1E16] text-[#9E7649] rounded-lg cursor-pointer transition-colors border border-[#9E7649]/30" title="Importar TXT">
                              <Upload size={20} />
                              <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'catalogo')} className="hidden" />
                          </label>
                      </div>
                  )}
              </div>

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
                              <button 
                                  key={idx}
                                  onClick={() => setSelectedCatalogItem(item)}
                                  className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10 hover:border-[#9E7649]/50 hover:bg-[#3E1E16] transition-all text-left group shadow-sm hover:shadow-md flex flex-col gap-2"
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
                  <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
                      <button onClick={() => { setSelectedFicha(null); setIsEditing(false); }} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
                          <ArrowLeft size={20} className="text-[#F5EFE6]" />
                      </button>
                      <div className="flex-1">
                          <h1 className="text-lg font-bold text-white leading-none">{selectedFicha.name}</h1>
                          <p className="text-[10px] text-[#9E7649]">Ficha Técnica</p>
                      </div>
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
                  </div>
                  
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
              <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
                  <button onClick={() => setActiveSection(null)} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
                      <ArrowLeft size={20} className="text-[#F5EFE6]" />
                  </button>
                  <div className="flex-1">
                      <h1 className="text-lg font-bold text-white leading-none">Fichas de Programas</h1>
                      <p className="text-[10px] text-[#9E7649]">Catálogo Técnico</p>
                  </div>
                  {isAdmin && (
                      <div className="flex gap-2">
                          <label className="p-2 bg-[#2C1B15] hover:bg-[#3E1E16] text-[#9E7649] rounded-lg cursor-pointer transition-colors border border-[#9E7649]/30" title="Importar TXT">
                              <Upload size={20} />
                              <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'fichas')} className="hidden" />
                          </label>
                      </div>
                  )}
              </div>

              <div className="p-6 overflow-y-auto pb-20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                      {fichas.map((ficha, idx) => (
                          <button 
                              key={idx}
                              onClick={() => setSelectedFicha(ficha)}
                              className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/10 hover:border-[#9E7649]/50 hover:bg-[#3E1E16] transition-all text-left group shadow-sm hover:shadow-md flex flex-col gap-2"
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
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  // Main Menu
  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      {/* Header */}
      <div className="bg-[#3E1E16] px-4 py-4 flex items-center gap-4 border-b border-[#9E7649]/20 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 hover:bg-[#9E7649]/20 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-[#F5EFE6]" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">Gestión</h1>
          <p className="text-[10px] text-[#9E7649]">Sistema de Control Interno</p>
        </div>
      </div>

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

        {/* Global Admin/Update Buttons */}
        <div className="mt-auto pt-10 pb-6 flex flex-col sm:flex-row gap-4 max-w-4xl mx-auto w-full">
          {isAdmin && (
            <button 
              onClick={handleSaveGestionData}
              className="flex-1 flex items-center justify-center gap-2 bg-[#9E7649] hover:bg-[#8B653D] text-white py-4 rounded-xl font-bold transition-colors shadow-lg"
            >
              <Save size={20} />
              Guardar base de datos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestionApp;
