export const getCurrentDateInfo = () => {
  const now = new Date();
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const day = now.getDate();
  const monthName = monthNames[now.getMonth()];
  const year = now.getFullYear();
  
  return {
    day,
    monthName,
    year,
    fullDate: now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  };
};

export const getAgendaFilenameCode = (): string => {
  const now = new Date();
  // Mes (0-11) a (01-12)
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Calcular semana del mes (aproximada basada en el día actual)
  // Día 1-7 = Semana 1, 8-14 = Semana 2, etc.
  const day = now.getDate();
  const week = Math.ceil(day / 7).toString().padStart(2, '0');
  
  return `Agenda${month}${week}`;
};

export interface DayInfo {
  name: string;
  date: number;
  monthName?: string;
}

export interface WeekInfo {
  id: string;
  label: string;
  range: string;
  days: (DayInfo | null)[];
  start: number;
  end: number;
  startMonth?: string;
  endMonth?: string;
}

export const getWeeksInMonth = (targetDate: Date = new Date()): WeekInfo[] => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Check if we should use the new logic (April 2026 onwards)
  const isNewLogic = year > 2026 || (year === 2026 && month >= 3); // 3 is April

  if (!isNewLogic) {
    // EXISTING LOGIC (Jan-Mar 2026)
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const weeks: WeekInfo[] = [];
    let currentDate = 1;
    let weekCount = 1;

    while (currentDate <= lastDayOfMonth) {
      const days: (DayInfo | null)[] = [null, null, null, null, null, null, null];
      let weekStarted = false;

      for (let i = 0; i < 7; i++) {
        if (currentDate > lastDayOfMonth) break;
        const dateObj = new Date(year, month, currentDate);
        let dayOfWeekIdx = dateObj.getDay(); 
        dayOfWeekIdx = dayOfWeekIdx === 0 ? 6 : dayOfWeekIdx - 1; 

        if (dayOfWeekIdx === i) {
          days[i] = { name: dayNames[i], date: currentDate };
          currentDate++;
          weekStarted = true;
        }
      }

      if (weekStarted) {
        const realDays = days.filter(d => d !== null) as DayInfo[];
        weeks.push({
          id: `semana-${weekCount}`,
          label: `Semana ${weekCount}`,
          range: `${realDays[0].date} - ${realDays[realDays.length - 1].date}`,
          days,
          start: realDays[0].date,
          end: realDays[realDays.length - 1].date
        });
        weekCount++;
      }
    }
    return weeks;
  } else {
    // NEW LOGIC (April 2026 onwards)
    const weeks: WeekInfo[] = [];
    
    // Start searching from the end of the previous month
    let checkDate = new Date(year, month, 1);
    // Move to the Monday of that week
    let dayOfWeek = checkDate.getDay();
    let diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    checkDate.setDate(checkDate.getDate() - diff);
    
    let weekCount = 1;
    // Limit to prevent infinite loops
    let safetyCounter = 0;
    while (safetyCounter < 10) {
      safetyCounter++;
      const thursday = new Date(checkDate);
      thursday.setDate(thursday.getDate() + 3);
      
      // Rule: Week belongs to month if its Thursday is in month
      if (thursday.getMonth() < month && thursday.getFullYear() <= year) {
        // This week belongs to previous month, skip
        checkDate.setDate(checkDate.getDate() + 7);
        continue;
      }
      
      if (thursday.getMonth() > month || thursday.getFullYear() > year) {
        // This week belongs to next month, stop
        break;
      }
      
      // This week belongs to current month
      const days: (DayInfo | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(checkDate);
        d.setDate(d.getDate() + i);
        days.push({
          name: dayNames[i],
          date: d.getDate(),
          monthName: monthNames[d.getMonth()]
        });
      }
      
      const sunday = new Date(checkDate);
      sunday.setDate(sunday.getDate() + 6);
      
      weeks.push({
        id: `semana-${weekCount}`,
        label: `Semana ${weekCount}`,
        range: `${days[0]!.date} - ${days[6]!.date}`,
        days,
        start: days[0]!.date,
        end: days[6]!.date,
        startMonth: monthNames[checkDate.getMonth()],
        endMonth: monthNames[sunday.getMonth()]
      });
      
      checkDate.setDate(checkDate.getDate() + 7);
      weekCount++;
    }
    return weeks;
  }
};
