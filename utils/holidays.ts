// Holiday utilities for Cuban labor recesos (double salary days)

function getViernesSanto(year: number): string {
  // Lookup dictionary for Good Friday (Viernes Santo) for years 2020-2035
  const dates: Record<number, string> = {
    2020: "04-10",
    2021: "04-02",
    2022: "04-15",
    2023: "04-07",
    2024: "03-29",
    2025: "04-18",
    2026: "04-03", // Current year
    2027: "03-26",
    2028: "04-14",
    2029: "03-30",
    2030: "04-19",
    2031: "04-11",
    2032: "03-26",
    2033: "04-15",
    2034: "04-07",
    2035: "03-23"
  };
  return dates[year] || "";
}

/**
 * Checks if a given date string (YYYY-MM-DD) is a double salary day in Cuba.
 */
export function isDoubleSalaryDay(dateStr: string): boolean {
  if (!dateStr) return false;
  
  // Accept standard ISO strings or YYYY-MM-DD
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return false;
  
  const year = parseInt(parts[0], 10);
  const month = parts[1]; // "MM"
  const day = parts[2];   // "DD"
  const md = `${month}-${day}`;

  // Fixed holidays
  const fixedHolidays = [
    "01-01", // 1 de enero: Triunfo de la Revolución
    "01-02", // 2 de enero: Día de la Victoria
    "05-01", // 1 de mayo: Día de los Trabajadores
    "07-25", // 25 de julio: Feriado del 26
    "07-26", // 26 de julio: Día de la Rebeldía Nacional
    "07-27", // 27 de julio: Feriado del 26
    "10-10", // 10 de octubre: Inicio de las Guerras de Independencia
    "12-25", // 25 de diciembre: Navidad
    "12-31"  // 31 de diciembre: Fin de Año
  ];

  if (fixedHolidays.includes(md)) {
    return true;
  }

  // Variable holiday: Viernes Santo
  const vsMD = getViernesSanto(year);
  if (vsMD && vsMD === md) {
    return true;
  }

  return false;
}

/**
 * Returns the holiday name if the date is a holiday, otherwise null.
 */
export function getHolidayName(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0], 10);
  const month = parts[1];
  const day = parts[2];
  const md = `${month}-${day}`;

  switch (md) {
    case "01-01": return "Aniversario del Triunfo de la Revolución";
    case "01-02": return "Día de la Victoria";
    case "05-01": return "Día Internacional de los Trabajadores";
    case "07-25": return "Feriado de la Rebeldía Nacional";
    case "07-26": return "Día de la Rebeldía Nacional";
    case "07-27": return "Feriado de la Rebeldía Nacional";
    case "10-10": return "Inicio de las Guerras de Independencia";
    case "12-25": return "Navidad";
    case "12-31": return "Fin de Año";
  }

  const vsMD = getViernesSanto(year);
  if (vsMD && vsMD === md) {
    return "Viernes Santo";
  }

  return null;
}
