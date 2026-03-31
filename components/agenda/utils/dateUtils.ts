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
}

export interface WeekInfo {
  id: string;
  label: string;
  range: string;
  days: (DayInfo | null)[];
  start: number;
  end: number;
}

export const getWeeksInMonth = (targetDate: Date = new Date()): WeekInfo[] => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  const weeks: WeekInfo[] = [];
  let currentDate = 1;
  let weekCount = 1;

  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  while (currentDate <= lastDayOfMonth) {
    const days: (DayInfo | null)[] = [null, null, null, null, null, null, null];
    let weekStarted = false;
    let firstDateInWeek = currentDate;

    // Llenar la semana actual
    for (let i = 0; i < 7; i++) {
      if (currentDate > lastDayOfMonth) break;
      
      const dateObj = new Date(year, month, currentDate);
      let dayOfWeekIdx = dateObj.getDay(); // 0=Dom, 1=Lun
      dayOfWeekIdx = dayOfWeekIdx === 0 ? 6 : dayOfWeekIdx - 1; // Ajustar a 0=Lun...6=Dom

      // Si el día del mes corresponde a la posición de la columna (Lunes, Martes...)
      if (dayOfWeekIdx === i) {
        days[i] = {
          name: dayNames[i],
          date: currentDate
        };
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
};
