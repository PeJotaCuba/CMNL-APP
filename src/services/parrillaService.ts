export interface ParrillaModification {
  id: string;
  date: string; // YYYY-MM-DD
  specialProgram: string;
  schedule: string;
  replacedProgram?: string;
  createdAt: string;
  createdBy: string;
}

export interface TransmissionInterruption {
  id: string;
  date: string; // YYYY-MM-DD
  programName: string;
  category?: string;
  affectedMinutes?: number;
  percentage?: number;
  startTime?: string;
  endTime?: string;
}

export const getStoredInterruptions = (): TransmissionInterruption[] => {
  try {
    const saved = localStorage.getItem('rcm_transmission_interruptions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const getStoredParrillaModifications = (): ParrillaModification[] => {
  try {
    const saved = localStorage.getItem('rcm_parrilla_modifications');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveParrillaModifications = (mods: ParrillaModification[]) => {
  localStorage.setItem('rcm_parrilla_modifications', JSON.stringify(mods));
};
