import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  User, 
  Calendar, 
  Layers, 
  DollarSign, 
  RefreshCw, 
  Check, 
  HelpCircle, 
  ArrowLeft,
  Share2,
  ChevronDown,
  Info
} from 'lucide-react';
import { openWhatsApp } from '../utils/whatsappUtils';
import { generateProgramming, ProgramSchedule } from '../src/services/programmingService';

interface SalarySimulatorProps {
  onBack: () => void;
  currentUser?: any;
}

interface TeamMember {
  id: string;
  name: string;
  specialty: string;
  level: string;
  habitualPrograms?: string[];
  habitualProgramsByRole?: Record<string, string[]>;
}

interface ProgramFicha {
  name: string;
  schedule: string;
  duration: string;
  frequency: string;
}

interface RolePaymentInfo {
  role: string;
  percentage: string;
  tr: string;
  salaries: { level: string; amount: string }[];
  rates: { level: string; amount: string }[];
}

interface ProgramCatalog {
  name: string;
  roles: RolePaymentInfo[];
}

const ROLES = [
  { id: 'director', label: 'Director', keywords: ['director', 'directora'] },
  { id: 'asesor', label: 'Asesor', keywords: ['asesor', 'asesora'] },
  { id: 'locutor', label: 'Locutor', keywords: ['locutor', 'locutora'] },
  { id: 'realizador_sonido', label: 'Realizador de Sonido', keywords: ['realizador', 'sonido', 'efectos', 'operador', 'grabador'] }
];

const LEVELS = ['I', 'II', 'III', 'SR'];

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MONTHS = [
  { index: 0, name: 'Enero' },
  { index: 1, name: 'Febrero' },
  { index: 2, name: 'Marzo' },
  { index: 3, name: 'Abril' },
  { index: 4, name: 'Mayo' },
  { index: 5, name: 'Junio' },
  { index: 6, name: 'Julio' },
  { index: 7, name: 'Agosto' },
  { index: 8, name: 'Septiembre' },
  { index: 9, name: 'Octubre' },
  { index: 10, name: 'Noviembre' },
  { index: 11, name: 'Diciembre' }
];

export const SalarySimulatorTool: React.FC<SalarySimulatorProps> = ({ onBack, currentUser }) => {
  // Data Sources
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [fichas, setFichas] = useState<ProgramFicha[]>([]);
  const [catalogo, setCatalogo] = useState<ProgramCatalog[]>([]);

  // Simulation State
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('director');
  const [selectedLevel, setSelectedLevel] = useState<string>('I');
  
  // Timeframe
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('Lunes');

  // Selected programs & customized days
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [programDaysOverride, setProgramDaysOverride] = useState<Record<string, string[]>>({});
  const [programRatesOverride, setProgramRatesOverride] = useState<Record<string, number>>({});
  const [searchProgramQuery, setSearchProgramQuery] = useState<string>('');

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedTeam = localStorage.getItem('rcm_equipo_cmnl');
      if (savedTeam) setTeam(JSON.parse(savedTeam));

      const savedFichas = localStorage.getItem('rcm_data_fichas');
      if (savedFichas) setFichas(JSON.parse(savedFichas));

      const savedCatalogo = localStorage.getItem('rcm_data_catalogo');
      if (savedCatalogo) setCatalogo(JSON.parse(savedCatalogo));
    } catch (e) {
      console.error("Error parsing localStorage values in Salary Simulator:", e);
    }
  }, []);

  // Find current logged in user's team member profile
  const currentUserMember = React.useMemo(() => {
    if (!currentUser) return null;
    const normalizeName = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const getWords = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 1);
    
    let member = team.find(m => normalizeName(m.name) === normalizeName(currentUser.name));
    if (!member) {
      const userWords = getWords(currentUser.name);
      member = team.find(m => {
        const memberWords = getWords(m.name);
        const matchCount = userWords.filter(w => memberWords.includes(w)).length;
        return matchCount >= 2;
      });
    }
    return member;
  }, [currentUser, team]);

  // Helper to map level string to standard ('I', 'II', 'III', 'SR')
  const mapLevelToStandard = (levelStr: string): string => {
    const normalized = (levelStr || '').toLowerCase().trim();
    if (normalized.includes('primer') || normalized === 'i' || normalized === '1') return 'I';
    if (normalized.includes('segundo') || normalized === 'ii' || normalized === '2') return 'II';
    if (normalized.includes('tercer') || normalized === 'iii' || normalized === '3') return 'III';
    return 'SR';
  };

  const getUserRolesAndLevels = (member: TeamMember): { roleId: string; roleLabel: string; level: string }[] => {
    const specs = member.specialty ? member.specialty.split('/').map(s => s.trim()) : [];
    const lvls = member.level ? member.level.split('/').map(l => l.trim()) : [];
    
    const results: { roleId: string; roleLabel: string; level: string }[] = [];
    specs.forEach((spec, index) => {
      const specLower = spec.toLowerCase();
      let matchedRoleId: string | null = null;
      let matchedLabel = '';
      
      for (const r of ROLES) {
        if (r.keywords.some(k => specLower.includes(k))) {
          matchedRoleId = r.id;
          matchedLabel = r.label;
          break;
        }
      }
      
      if (matchedRoleId) {
        const rawLvl = lvls[index] || lvls[0] || 'SR';
        const stdLvl = mapLevelToStandard(rawLvl);
        
        if (!results.some(item => item.roleId === matchedRoleId)) {
          results.push({
            roleId: matchedRoleId,
            roleLabel: matchedLabel,
            level: stdLvl
          });
        }
      }
    });
    
    return results;
  };

  const getRolesFromCurrentUser = (user: any): { roleId: string; roleLabel: string; level: string }[] => {
    if (!user) return [];
    const specStr = user.specialty || user.classification || '';
    const specs = specStr.split('/').map((s: string) => s.trim());
    
    const results: { roleId: string; roleLabel: string; level: string }[] = [];
    specs.forEach((spec: string) => {
      const specLower = spec.toLowerCase();
      let matchedRoleId: string | null = null;
      let matchedLabel = '';
      
      for (const r of ROLES) {
        if (r.keywords.some(k => specLower.includes(k))) {
          matchedRoleId = r.id;
          matchedLabel = r.label;
          break;
        }
      }
      
      if (matchedRoleId) {
        results.push({
          roleId: matchedRoleId,
          roleLabel: matchedLabel,
          level: 'SR'
        });
      }
    });
    
    return results;
  };

  const currentUserRoles = React.useMemo(() => {
    if (currentUserMember) {
      return getUserRolesAndLevels(currentUserMember);
    }
    return getRolesFromCurrentUser(currentUser);
  }, [currentUser, currentUserMember]);

  const isRestrictedWorker = currentUserRoles.length > 0;

  const activeSyncMember = React.useMemo(() => {
    if (isRestrictedWorker) {
      return currentUserMember;
    }
    if (selectedMemberId) {
      return team.find(m => m.id === selectedMemberId) || null;
    }
    return null;
  }, [isRestrictedWorker, currentUserMember, selectedMemberId, team]);

  const syncMemberRoles = React.useMemo(() => {
    if (isRestrictedWorker) {
      return currentUserRoles;
    }
    if (activeSyncMember) {
      return getUserRolesAndLevels(activeSyncMember);
    }
    return [];
  }, [isRestrictedWorker, currentUserRoles, activeSyncMember]);

  const getHabitualProgramsForRole = (member: TeamMember, roleId: string): string[] => {
    const habitualProgramsByRole = member.habitualProgramsByRole || {};
    const roleDef = ROLES.find(r => r.id === roleId);
    if (!roleDef) return [];
    
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const matchedKey = Object.keys(habitualProgramsByRole).find(key => {
      const normKey = normalize(key);
      return roleDef.keywords.some(k => normKey.includes(k) || k.includes(normKey));
    });
    
    if (matchedKey && habitualProgramsByRole[matchedKey]) {
      return habitualProgramsByRole[matchedKey];
    }
    
    return member.habitualPrograms || [];
  };

  // State to track last synced member and role to avoid redundant resets
  const [lastSyncedMemberKey, setLastSyncedMemberKey] = useState<string>('');
  const [lastSyncedRoleKey, setLastSyncedRoleKey] = useState<string>('');

  // Unified Synchronization Effect
  useEffect(() => {
    if (syncMemberRoles.length > 0) {
      const memberIdStr = activeSyncMember ? activeSyncMember.id : (currentUser?.id || 'current_user');
      const memberKey = `${memberIdStr}_${syncMemberRoles.map(r => `${r.roleId}:${r.level}`).join(',')}`;
      const roleKey = selectedRole;

      const hasMemberChanged = memberKey !== lastSyncedMemberKey;
      const hasRoleChanged = roleKey !== lastSyncedRoleKey;

      if (hasMemberChanged || hasRoleChanged) {
        let targetRole = selectedRole;
        let activeRoleConfig = syncMemberRoles.find(r => r.roleId === selectedRole);
        
        if (!activeRoleConfig) {
          activeRoleConfig = syncMemberRoles[0];
          targetRole = activeRoleConfig.roleId;
          setSelectedRole(targetRole);
        }

        setSelectedLevel(activeRoleConfig.level);

        if (activeSyncMember) {
          const roleProgs = getHabitualProgramsForRole(activeSyncMember, targetRole);
          const validProgs = roleProgs.filter(pName => 
            fichas.some(f => f.name.toLowerCase() === pName.toLowerCase()) || 
            catalogo.some(c => c.name.toLowerCase() === pName.toLowerCase())
          );
          setSelectedPrograms(validProgs);

          const newDaysOverride: Record<string, string[]> = {};
          validProgs.forEach(p => {
            newDaysOverride[p] = getProgramDefaultDays(p);
          });
          setProgramDaysOverride(newDaysOverride);
        } else {
          setSelectedPrograms([]);
          setProgramDaysOverride({});
        }

        setProgramRatesOverride({});

        setLastSyncedMemberKey(memberKey);
        setLastSyncedRoleKey(targetRole);
      }
    } else {
      if (lastSyncedMemberKey || lastSyncedRoleKey) {
        setLastSyncedMemberKey('');
        setLastSyncedRoleKey('');
      }
    }
  }, [
    selectedRole,
    activeSyncMember,
    syncMemberRoles,
    fichas,
    catalogo,
    isRestrictedWorker,
    currentUser,
    lastSyncedMemberKey,
    lastSyncedRoleKey
  ]);

  // Handle manual selection adjustments
  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    if (syncMemberRoles.length === 0) {
      setSelectedMemberId(''); // Deselect only if not synced
    }
  };

  const handleLevelChange = (level: string) => {
    setSelectedLevel(level);
    if (syncMemberRoles.length === 0) {
      setSelectedMemberId(''); // Deselect only if not synced
    }
  };

  // Extract default weekdays of airing for a program
  const getProgramDefaultDays = (progName: string): string[] => {
    const ficha = fichas.find(f => f.name.toLowerCase() === progName.toLowerCase());
    if (!ficha) return ['Lunes']; // Default fallback

    const freq = ficha.frequency.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (freq.includes('diario') || freq.includes('lunes a domingo')) {
      return [...WEEKDAYS];
    }
    if (freq.includes('lunes a sabado')) {
      return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    }
    if (freq.includes('lunes a viernes')) {
      return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    }

    const result: string[] = [];
    if (freq.includes('lunes')) result.push('Lunes');
    if (freq.includes('martes')) result.push('Martes');
    if (freq.includes('miercoles') || freq.includes('miércoles')) result.push('Miércoles');
    if (freq.includes('jueves')) result.push('Jueves');
    if (freq.includes('viernes')) result.push('Viernes');
    if (freq.includes('sabado') || freq.includes('sábado')) result.push('Sábado');
    if (freq.includes('domingo')) result.push('Domingo');

    return result.length > 0 ? result : ['Lunes'];
  };

  // Find payment rate for program, role, and level
  const getProgramRate = (progName: string, roleId: string, level: string): number => {
    // If overriden on the fly, return that
    if (programRatesOverride[progName] !== undefined) {
      return programRatesOverride[progName];
    }

    // Find in Catalog
    const catItem = catalogo.find(c => c.name.toLowerCase() === progName.toLowerCase());
    if (!catItem) return 0;

    // Find role match
    const roleDef = ROLES.find(r => r.id === roleId);
    if (!roleDef) return 0;

    const catRole = catItem.roles.find(r => 
      roleDef.keywords.some(k => r.role.toLowerCase().includes(k))
    );
    if (!catRole) return 0;

    // Find rate for level
    const rateObj = catRole.rates?.find(r => r.level.toUpperCase() === level.toUpperCase());
    if (rateObj && rateObj.amount && !isNaN(parseFloat(rateObj.amount))) {
      return parseFloat(rateObj.amount);
    }

    // Fallback to salary level
    const salaryObj = catRole.salaries?.find(s => s.level.toUpperCase() === level.toUpperCase());
    if (salaryObj && salaryObj.amount && !isNaN(parseFloat(salaryObj.amount))) {
      return parseFloat(salaryObj.amount);
    }

    return 0;
  };

  // Date counting math: Number of times a weekday appears in a specific month
  const countWeekdayInMonth = (year: number, monthIndex: number, dayName: string): number => {
    const dayMap: Record<string, number> = {
      'Domingo': 0,
      'Lunes': 1,
      'Martes': 2,
      'Miércoles': 3,
      'Jueves': 4,
      'Viernes': 5,
      'Sábado': 6
    };
    const targetDay = dayMap[dayName];
    if (targetDay === undefined) return 0;

    let count = 0;
    const date = new Date(year, monthIndex, 1);
    while (date.getMonth() === monthIndex) {
      if (date.getDay() === targetDay) {
        count++;
      }
      date.setDate(date.getDate() + 1);
    }
    return count;
  };

  // Toggle program selection
  const handleToggleProgram = (pName: string) => {
    if (selectedPrograms.includes(pName)) {
      setSelectedPrograms(selectedPrograms.filter(p => p !== pName));
      // Remove override values
      const newOverride = { ...programDaysOverride };
      delete newOverride[pName];
      setProgramDaysOverride(newOverride);
    } else {
      setSelectedPrograms([...selectedPrograms, pName]);
      setProgramDaysOverride({
        ...programDaysOverride,
        [pName]: getProgramDefaultDays(pName)
      });
    }
  };

  const handleMarkAll = () => {
    const filteredPrograms = allProgramNames.filter(name => 
      !searchProgramQuery || name.toLowerCase().includes(searchProgramQuery.toLowerCase())
    );
    const toAdd = filteredPrograms.filter(p => !selectedPrograms.includes(p));
    if (toAdd.length > 0) {
      const updated = [...selectedPrograms, ...toAdd];
      setSelectedPrograms(updated);
      
      const newDaysOverride = { ...programDaysOverride };
      toAdd.forEach(p => {
        newDaysOverride[p] = getProgramDefaultDays(p);
      });
      setProgramDaysOverride(newDaysOverride);
    }
  };

  const handleUnmarkAll = () => {
    const filteredPrograms = allProgramNames.filter(name => 
      !searchProgramQuery || name.toLowerCase().includes(searchProgramQuery.toLowerCase())
    );
    if (searchProgramQuery) {
      setSelectedPrograms(selectedPrograms.filter(p => !filteredPrograms.includes(p)));
      const newDaysOverride = { ...programDaysOverride };
      filteredPrograms.forEach(p => {
        delete newDaysOverride[p];
      });
      setProgramDaysOverride(newDaysOverride);
    } else {
      setSelectedPrograms([]);
      setProgramDaysOverride({});
    }
  };

  // Toggle customized day for a program
  const handleToggleProgramDay = (progName: string, day: string) => {
    const currentDays = programDaysOverride[progName] || [];
    let updatedDays = [];
    if (currentDays.includes(day)) {
      updatedDays = currentDays.filter(d => d !== day);
    } else {
      updatedDays = [...currentDays, day];
    }
    setProgramDaysOverride({
      ...programDaysOverride,
      [progName]: updatedDays
    });
  };

  // Update payment rate manually
  const handleRateOverrideChange = (progName: string, val: string) => {
    const num = parseFloat(val);
    setProgramRatesOverride({
      ...programRatesOverride,
      [progName]: isNaN(num) ? 0 : num
    });
  };

  // Compute occurrences for each program according to selected timeframe
  const getSimulationResults = () => {
    let totalEarnings = 0;
    const items = selectedPrograms.map(pName => {
      const rate = getProgramRate(pName, selectedRole, selectedLevel);
      const activeDays = programDaysOverride[pName] || [];
      let occurrences = 0;

      if (timeframe === 'day') {
        // If program airs on the selected day of the week, count is 1, else 0
        occurrences = activeDays.includes(selectedDayOfWeek) ? 1 : 0;
      } else if (timeframe === 'week') {
        // Typical week is 1 count for each active day
        occurrences = activeDays.length;
      } else if (timeframe === 'month') {
        // Count actual occurrences of each active day in that month
        activeDays.forEach(day => {
          occurrences += countWeekdayInMonth(selectedYear, selectedMonth, day);
        });
      }

      const subtotal = rate * occurrences;
      totalEarnings += subtotal;

      return {
        programName: pName,
        rate,
        activeDays,
        occurrences,
        subtotal
      };
    });

    return {
      items,
      totalEarnings
    };
  };

  const results = getSimulationResults();

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const roleLabel = ROLES.find(r => r.id === selectedRole)?.label || selectedRole;
    const memberName = selectedMemberId ? team.find(m => m.id === selectedMemberId)?.name : 'Realizador';
    let timeLabel = '';
    
    if (timeframe === 'day') timeLabel = `un día (${selectedDayOfWeek})`;
    else if (timeframe === 'week') timeLabel = 'una semana típica';
    else timeLabel = `el mes de ${MONTHS[selectedMonth].name} ${selectedYear}`;

    let text = `*SIMULADOR DE SALARIOS - CMNL*\n`;
    text += `👤 *Realizador:* ${memberName}\n`;
    text += `🎭 *Rol:* ${roleLabel} (Nivel ${selectedLevel})\n`;
    text += `📅 *Período:* Simulado para ${timeLabel}\n\n`;
    text += `📊 *Detalle de Programas:*\n`;

    results.items.forEach(item => {
      if (item.occurrences > 0) {
        text += `- *${item.programName}*: $${item.rate.toFixed(2)} x ${item.occurrences} emisiones = *$${item.subtotal.toFixed(2)}*\n`;
        text += `  _(Días: ${item.activeDays.join(', ')})_\n`;
      }
    });

    text += `\n💰 *INGRESO TOTAL ESTIMADO: $${results.totalEarnings.toFixed(2)}*`;
    openWhatsApp(text);
  };

  // Get distinct programs from combined Catalogo and Fichas, ordered as they are in Programacion
  const allProgramNames = React.useMemo(() => {
    // Generate programming
    let allPrograms: any[] = [];
    try {
      const manualData = localStorage.getItem('rcm_manual_programming');
      if (manualData && manualData !== '[]') {
        allPrograms = JSON.parse(manualData);
      } else {
        allPrograms = generateProgramming(fichas);
      }
    } catch (e) {
      allPrograms = generateProgramming(fichas);
    }

    if (!allPrograms || allPrograms.length === 0) {
      allPrograms = generateProgramming(fichas);
    }

    // Sort by time
    const getMinutes = (time: string) => {
        const match = (time || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        }
        const [h, m] = (time || '').split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    allPrograms.sort((a, b) => {
        if (a.name.toLowerCase().includes('cómplices') && a.days.includes(0) && b.days.includes(0)) return -1;
        if (b.name.toLowerCase().includes('cómplices') && b.days.includes(0) && a.days.includes(0)) return 1;
        return getMinutes(a.start) - getMinutes(b.start);
    });

    const monFri = allPrograms.filter(p => p.days && p.days.some((d: number) => [1, 2, 3, 4, 5].includes(d)));
    const saturday = allPrograms.filter(p => p.days && p.days.includes(6));
    const sunday = allPrograms.filter(p => p.days && p.days.includes(0));

    const orderedSet = new Set<string>();

    // Helper to add names (comparing case-insensitively but keeping original casing from fichas/catalogo)
    const allAvailableNames = Array.from(
      new Set([
        ...fichas.map(f => f.name),
        ...catalogo.map(c => c.name)
      ])
    );

    const findMatch = (name: string): string | null => {
      return allAvailableNames.find(n => n.toLowerCase() === name.toLowerCase()) || null;
    };

    // Add Mon-Fri
    monFri.forEach(p => {
      const match = findMatch(p.name);
      if (match) orderedSet.add(match);
    });

    // Add Saturday
    saturday.forEach(p => {
      const match = findMatch(p.name);
      if (match) orderedSet.add(match);
    });

    // Add Sunday
    sunday.forEach(p => {
      const match = findMatch(p.name);
      if (match) orderedSet.add(match);
    });

    // Add any leftovers
    const remaining = allAvailableNames.filter(name => !orderedSet.has(name));
    remaining.sort().forEach(name => orderedSet.add(name));

    return Array.from(orderedSet);
  }, [fichas, catalogo]);

  return (
    <div className="bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-10">
      <div className="flex flex-col gap-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-[#2C1B15] text-[#9E7649] hover:text-white rounded-xl border border-[#9E7649]/20 transition-all hover:border-[#9E7649]/50"
            title="Volver a Herramientas"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-xs uppercase text-[#9E7649] tracking-widest font-mono">Herramientas Especiales</span>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5">
              <Calculator className="text-[#9E7649]" size={24} />
              Simulador de Salario
            </h1>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Controls - Left Panel */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 1: Realizador Profile */}
            <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4 text-[#9E7649]">
                <User size={18} />
                <h3 className="font-bold uppercase text-xs tracking-wider">1. Perfil del Realizador</h3>
              </div>

              {/* Conditional dropdown or static name based on isRestrictedWorker */}
              {isRestrictedWorker ? (
                <div className="mb-4">
                  <label className="block text-xs uppercase text-stone-400 tracking-wider mb-1.5">Nombre</label>
                  <div className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg p-2.5 text-white font-bold text-sm">
                    {currentUserMember?.name || currentUser?.name || 'Usuario'}
                  </div>
                </div>
              ) : (
                /* Sync with Equipo dropdown */
                <div className="mb-4">
                  <label className="block text-xs uppercase text-stone-400 tracking-wider mb-1.5">Sincronizar con Miembro del Equipo</label>
                  <div className="relative">
                    <select 
                      value={selectedMemberId}
                      onChange={e => setSelectedMemberId(e.target.value)}
                      className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#9E7649] appearance-none"
                    >
                      <option value="">-- Selección Manual --</option>
                      {team.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.specialty} - Nivel {m.level})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#9E7649]">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              )}

              {/* Role Selection Buttons */}
              <div className="mb-4">
                <label className="block text-xs uppercase text-stone-400 tracking-wider mb-1.5">Especialidad / Rol de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {(syncMemberRoles.length > 0 
                    ? ROLES.filter(r => syncMemberRoles.some(ur => ur.roleId === r.id))
                    : ROLES
                  ).map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        if (syncMemberRoles.length > 0) {
                          setSelectedRole(r.id);
                        } else {
                          handleRoleChange(r.id);
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center border ${
                        selectedRole === r.id 
                          ? 'bg-[#9E7649] text-white border-transparent shadow-md'
                          : 'bg-[#1A100C] text-stone-400 border-[#9E7649]/20 hover:text-white hover:border-[#9E7649]/40'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level Selection */}
              <div>
                <label className="block text-xs uppercase text-stone-400 tracking-wider mb-1.5">Nivel Profesional</label>
                <div className="flex flex-wrap gap-1.5">
                  {syncMemberRoles.length > 0 ? (
                    <div className="h-8 px-4 flex items-center justify-center rounded-lg text-xs font-mono font-bold bg-[#9E7649] text-white border border-transparent">
                      Nivel {selectedLevel} (Asignado en Equipo)
                    </div>
                  ) : (
                    LEVELS.map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => handleLevelChange(lvl)}
                        className={`h-8 w-10 flex items-center justify-center rounded-lg text-xs font-mono font-bold transition-all border ${
                          selectedLevel === lvl 
                            ? 'bg-[#9E7649] text-white border-transparent'
                            : 'bg-[#1A100C] text-stone-400 border-[#9E7649]/20 hover:text-white hover:border-[#9E7649]/40'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Timeframe Configuration */}
            <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20">
              <div className="flex items-center gap-2 mb-4 text-[#9E7649]">
                <Calendar size={18} />
                <h3 className="font-bold uppercase text-xs tracking-wider">2. Período a Simular</h3>
              </div>

              {/* Period Select tabs */}
              <div className="flex bg-[#1A100C] rounded-lg p-1 border border-[#9E7649]/20 mb-4">
                <button
                  onClick={() => setTimeframe('day')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                    timeframe === 'day' ? 'bg-[#9E7649] text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Un Día
                </button>
                <button
                  onClick={() => setTimeframe('week')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                    timeframe === 'week' ? 'bg-[#9E7649] text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Una Semana
                </button>
                <button
                  onClick={() => setTimeframe('month')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                    timeframe === 'month' ? 'bg-[#9E7649] text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Un Mes
                </button>
              </div>

              {/* Conditional configurations */}
              {timeframe === 'day' && (
                <div>
                  <label className="block text-xs uppercase text-stone-400 tracking-wider mb-1.5">Día de la semana</label>
                  <div className="relative">
                    <select
                      value={selectedDayOfWeek}
                      onChange={e => setSelectedDayOfWeek(e.target.value)}
                      className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#9E7649] appearance-none"
                    >
                      {WEEKDAYS.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#9E7649]">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-2 font-mono leading-tight">
                    * Calcula el salario de los programas que salen al aire específicamente el {selectedDayOfWeek}.
                  </p>
                </div>
              )}

              {timeframe === 'week' && (
                <div>
                  <p className="text-xs text-stone-400 font-mono leading-relaxed bg-[#1A100C] p-3 rounded-lg border border-[#9E7649]/10">
                    * Calcula una semana estándar de producción, multiplicando la tasa de cada programa seleccionado por su frecuencia semanal configurada.
                  </p>
                </div>
              )}

              {timeframe === 'month' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-stone-400 tracking-wider mb-1.5">Mes</label>
                      <div className="relative">
                        <select
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(parseInt(e.target.value))}
                          className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#9E7649] appearance-none"
                        >
                          {MONTHS.map(m => (
                            <option key={m.index} value={m.index}>{m.name}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#9E7649]">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-stone-400 tracking-wider mb-1.5">Año</label>
                      <input
                        type="number"
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value) || 2026)}
                        className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#9E7649] font-mono text-center"
                        min="2020"
                        max="2100"
                      />
                    </div>
                  </div>

                  {/* Calendar details box */}
                  <div className="bg-[#1A100C] p-3.5 rounded-lg border border-[#9E7649]/10 space-y-1.5">
                    <p className="text-xs text-[#9E7649] font-bold uppercase flex items-center gap-1">
                      <Info size={12} />
                      Distribución de días en {MONTHS[selectedMonth].name} {selectedYear}
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono text-stone-400">
                      {WEEKDAYS.slice(0, 4).map(d => (
                        <div key={d} className="bg-[#2C1B15] p-1.5 rounded border border-[#9E7649]/5">
                          <div>{d.substring(0, 3)}</div>
                          <div className="font-bold text-white mt-0.5">{countWeekdayInMonth(selectedYear, selectedMonth, d)}</div>
                        </div>
                      ))}
                      {WEEKDAYS.slice(4).map(d => (
                        <div key={d} className="bg-[#2C1B15] p-1.5 rounded border border-[#9E7649]/5">
                          <div>{d.substring(0, 3)}</div>
                          <div className="font-bold text-white mt-0.5">{countWeekdayInMonth(selectedYear, selectedMonth, d)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Programs Selection and Calculations - Right Panels */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 3: Programs & Days Selection */}
            <div className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-[#9E7649]">
                  <Layers size={18} />
                  <h3 className="font-bold uppercase text-xs tracking-wider">3. Selección de Programas ({selectedPrograms.length})</h3>
                </div>

                {/* Filter Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar catálogo..."
                    value={searchProgramQuery}
                    onChange={e => setSearchProgramQuery(e.target.value)}
                    className="bg-[#1A100C] border border-[#9E7649]/20 rounded-lg py-1 px-3 pl-8 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#9E7649] w-full md:w-48"
                  />
                  <Layers size={12} className="absolute left-2.5 top-2 text-[#9E7649]" />
                </div>
              </div>

              {/* Mark / Unmark all buttons */}
              <div className="flex items-center justify-between gap-2 mb-3.5 px-1">
                <span className="text-[11px] font-mono text-stone-400">
                  {allProgramNames.filter(name => !searchProgramQuery || name.toLowerCase().includes(searchProgramQuery.toLowerCase())).length} programas disponibles
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border border-[#9E7649]/30 bg-[#2C1B15] text-[#9E7649] hover:bg-[#9E7649] hover:text-white transition-all cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    onClick={handleUnmarkAll}
                    className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border border-[#9E7649]/10 bg-transparent text-stone-400 hover:border-stone-500 hover:text-white transition-all cursor-pointer"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              {/* Scrollable grid of checkable programs */}
              <div className="max-h-56 overflow-y-auto custom-scrollbar border border-[#9E7649]/10 rounded-lg p-2 bg-[#1A100C] space-y-1.5">
                {allProgramNames
                  .filter(name => !searchProgramQuery || name.toLowerCase().includes(searchProgramQuery.toLowerCase()))
                  .map(progName => {
                    const isSelected = selectedPrograms.includes(progName);
                    const defaultDays = getProgramDefaultDays(progName);
                    return (
                      <div 
                        key={progName}
                        onClick={() => handleToggleProgram(progName)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-[#2C1B15] border-[#9E7649]/40 text-white'
                            : 'bg-transparent border-transparent text-stone-400 hover:bg-[#2C1B15]/20 hover:text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-4 w-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                            isSelected ? 'bg-[#9E7649] border-transparent text-white' : 'border-[#9E7649]/30 bg-[#1A100C]'
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wide truncate">{progName}</span>
                        </div>
                        <div className="text-[10px] text-[#9E7649] font-mono uppercase bg-[#2C1B15] px-2 py-0.5 rounded border border-[#9E7649]/10 shrink-0">
                          {defaultDays.length} días/sem
                        </div>
                      </div>
                    );
                })}
                {allProgramNames.length === 0 && (
                  <p className="text-center text-xs text-stone-500 p-4 font-mono">No hay programas disponibles. Cargue el catálogo o las fichas.</p>
                )}
              </div>

              {/* Active Program configuration cards */}
              {selectedPrograms.length > 0 && (
                <div className="mt-4 border-t border-[#9E7649]/10 pt-4 space-y-4">
                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Ajuste de días y tarifas de programas seleccionados</h4>
                  <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                    {selectedPrograms.map(pName => {
                      const activeDays = programDaysOverride[pName] || [];
                      const defaultRate = getProgramRate(pName, selectedRole, selectedLevel);
                      
                      return (
                        <div key={pName} className="p-3.5 bg-[#1A100C] rounded-lg border border-[#9E7649]/15">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#9E7649]/10">
                            <span className="text-xs font-bold text-white uppercase tracking-wide">{pName}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#9E7649] font-mono uppercase">Tarifa ($):</span>
                              <input
                                type="number"
                                step="0.01"
                                value={programRatesOverride[pName] !== undefined ? programRatesOverride[pName] : defaultRate}
                                onChange={e => handleRateOverrideChange(pName, e.target.value)}
                                className="bg-[#2C1B15] border border-[#9E7649]/30 rounded px-1.5 py-0.5 text-xs text-white font-mono text-right w-20 focus:outline-none focus:border-[#9E7649]"
                              />
                            </div>
                          </div>

                          {/* Days toggler */}
                          <div>
                            <span className="block text-[9px] uppercase text-stone-400 mb-1">Días de salida aplicables para este realizador:</span>
                            <div className="flex flex-wrap gap-1">
                              {WEEKDAYS.map(day => {
                                const isDefault = getProgramDefaultDays(pName).includes(day);
                                const isChecked = activeDays.includes(day);
                                return (
                                  <button
                                    key={day}
                                    onClick={() => handleToggleProgramDay(pName, day)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                                      isChecked 
                                        ? 'bg-[#9E7649]/20 text-[#9E7649] border-[#9E7649]/30 font-bold'
                                        : 'bg-[#2C1B15] text-stone-500 border-transparent hover:text-stone-300'
                                    }`}
                                  >
                                    {day.substring(0, 3)}
                                    {isDefault && <span className="text-[7px] text-[#9E7649] ml-0.5">•</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Earnings Calculator Panel (RESULT BOARD) */}
            <div className="bg-gradient-to-br from-[#2C1B15] to-[#1F120D] p-6 rounded-xl border-2 border-[#9E7649]/40 relative overflow-hidden shadow-2xl">
              
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <DollarSign size={160} className="text-[#9E7649]" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 border-b border-[#9E7649]/10 pb-3">
                  <span className="text-xs font-bold text-[#9E7649] uppercase tracking-widest">Resumen del Cálculo</span>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Tasa del nivel <span className="font-bold text-white">{selectedLevel}</span>
                  </div>
                </div>

                {/* Big Total Screen */}
                <div className="text-center py-5 bg-[#1A100C]/70 rounded-xl border border-[#9E7649]/10 mb-6 relative">
                  <div className="text-xs uppercase text-stone-400 tracking-widest mb-1.5 font-mono">Ingreso Estimado Total</div>
                  <div className="text-4xl font-extrabold text-white font-mono flex items-center justify-center">
                    <span className="text-[#9E7649] mr-1">$</span>
                    {results.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-[#9E7649] mt-1 font-mono uppercase tracking-wide">
                    Simulación ({timeframe === 'day' ? `Día ${selectedDayOfWeek}` : timeframe === 'week' ? 'Semana típica' : `Mes: ${MONTHS[selectedMonth].name}`})
                  </div>
                </div>

                {/* Detailed Table breakdown */}
                {results.items.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Desglose de ingresos</h4>
                    <div className="bg-[#1A100C]/40 border border-[#9E7649]/10 rounded-lg overflow-hidden font-mono text-xs">
                      
                      {/* Table Header */}
                      <div className="grid grid-cols-12 bg-[#2C1B15] p-2.5 text-[#9E7649] border-b border-[#9E7649]/15 text-[10px] font-bold uppercase tracking-wider">
                        <div className="col-span-5">Programa</div>
                        <div className="col-span-3 text-right">Tarifa ($)</div>
                        <div className="col-span-2 text-center">Frec.</div>
                        <div className="col-span-2 text-right">Total</div>
                      </div>

                      {/* Table Rows */}
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {results.items.map(item => (
                          <div 
                            key={item.programName}
                            className={`grid grid-cols-12 p-2.5 border-b border-[#9E7649]/5 items-center ${
                              item.occurrences === 0 ? 'opacity-30' : ''
                            }`}
                          >
                            <div className="col-span-5 truncate text-white uppercase font-bold text-[11px]">{item.programName}</div>
                            <div className="col-span-3 text-right">${item.rate.toFixed(2)}</div>
                            <div className="col-span-2 text-center text-stone-400">{item.occurrences} {timeframe === 'day' ? 'em.' : timeframe === 'week' ? 'd/s' : 'em.'}</div>
                            <div className="col-span-2 text-right font-bold text-green-400">${item.subtotal.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-stone-500 py-6 font-mono border-t border-[#9E7649]/10">
                    💡 Seleccione al menos un programa de la sección anterior para ver el desglose salarial.
                  </div>
                )}

                {/* Share actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleShareWhatsApp}
                    disabled={selectedPrograms.length === 0}
                    className="flex-1 py-3 bg-green-950/40 text-green-400 border border-green-500/30 hover:bg-green-950/60 transition-colors rounded-xl font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Share2 size={16} /> Compartir por WhatsApp
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
