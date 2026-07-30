import { ProgramFicha } from '../../types';
import { INITIAL_FICHAS } from '../../utils/fichasData';
import { DEFAULT_PROGRAMS_LIST } from './types';

export const normalizeProgramName = (s: string): string => {
  if (!s) return '';
  return s.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
};

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 9999;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
  if (!match) return 9999;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
};

const getFichaCategory = (frequency: string) => {
  const f = (frequency || "").toLowerCase();
  // Group 3: Domingo (Sunday only)
  if (f.includes("domingo") && !f.includes("lunes") && !f.includes("sábado") && !f.includes("sabado") && !f.includes("diario")) {
    return 3;
  }
  // Group 2: Sábado (Saturday only)
  if ((f.includes("sábado") || f.includes("sabado")) && !f.includes("viernes") && !f.includes("lunes") && !f.includes("domingo")) {
    return 2;
  }
  // Group 1: Lunes a Viernes / Weekday / Diario / Lunes a Sábado
  return 1;
};

export const getFichasFromStorage = (): ProgramFicha[] => {
  try {
    const saved = localStorage.getItem('rcm_data_fichas');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error loading rcm_data_fichas:", e);
  }
  return INITIAL_FICHAS;
};

/**
 * Gets active programs list from storage, merging DEFAULT_PROGRAMS_LIST,
 * saved selections, productions, reports and user preferences.
 */
export const getActiveProgramsFromStorage = (): string[] => {
  const activeSet = new Set<string>();

  // Always seed with default programs
  DEFAULT_PROGRAMS_LIST.forEach(p => activeSet.add(p));

  // Add from saved active programs list
  try {
    const saved = localStorage.getItem('rcm_programs_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((p: any) => {
          if (p && typeof p === 'string') activeSet.add(p);
        });
      }
    }
  } catch (e) {}

  // Add from saved selections
  try {
    const saved = localStorage.getItem('rcm_saved_selections');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: any) => {
          if (s.program && typeof s.program === 'string') activeSet.add(s.program);
          if (s.programName && typeof s.programName === 'string') activeSet.add(s.programName);
        });
      }
    }
  } catch (e) {}

  // Add from productions
  try {
    const saved = localStorage.getItem('rcm_productions_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          if (p.program && typeof p.program === 'string') activeSet.add(p.program);
        });
      }
    }
  } catch (e) {}

  // Add from reports
  try {
    const saved = localStorage.getItem('rcm_music_reports');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((r: any) => {
          if (r.program && typeof r.program === 'string') activeSet.add(r.program);
        });
      }
    }
  } catch (e) {}

  return sortAndStandardizePrograms(Array.from(activeSet));
};

/**
 * Sorts and standardizes program names based on Programación schedule (Fichas):
 * 1. Lunes a Viernes (by start time)
 * 2. Sábado (by start time)
 * 3. Domingo (by start time)
 * 4. Custom/Other programs (alphabetical)
 * Standardizes program names to match exact official Ficha names (e.g. "Buenos Días Bayamo").
 */
export const sortAndStandardizePrograms = (progs: string[], fichas?: ProgramFicha[]): string[] => {
  const effectiveFichas = fichas && fichas.length > 0 ? fichas : getFichasFromStorage();

  const fichaMap = new Map<string, { category: number; minutes: number; index: number; officialName: string }>();
  effectiveFichas.forEach((f, idx) => {
    const key = normalizeProgramName(f.name);
    fichaMap.set(key, {
      category: getFichaCategory(f.frequency),
      minutes: parseTimeToMinutes(f.schedule),
      index: idx,
      officialName: f.name
    });
  });

  // Standardize program names against official Ficha names
  const standardized = (progs || []).map(p => {
    if (!p) return '';
    const key = normalizeProgramName(p);
    const info = fichaMap.get(key);
    return info ? info.officialName : p.trim();
  }).filter(Boolean);

  const uniqueProgs = Array.from(new Set(standardized));

  return uniqueProgs.sort((a, b) => {
    const infoA = fichaMap.get(normalizeProgramName(a));
    const infoB = fichaMap.get(normalizeProgramName(b));

    const catA = infoA ? infoA.category : 4;
    const catB = infoB ? infoB.category : 4;
    if (catA !== catB) return catA - catB;

    const minA = infoA ? infoA.minutes : 9999;
    const minB = infoB ? infoB.minutes : 9999;
    if (minA !== minB) return minA - minB;

    const idxA = infoA ? infoA.index : 9999;
    const idxB = infoB ? infoB.index : 9999;
    if (idxA !== idxB) return idxA - idxB;

    return a.localeCompare(b, "es");
  });
};
