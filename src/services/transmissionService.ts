
export interface TransmissionBreakdown {
    informativos: number;
    boletines: number;
    publicidad: number;
    orientacion: number;
    cienciaTecnica: number;
    variados: number;
    historicos: number;
    literaturaArte: number;
    musicales: number;
    reposiciones: number;
    total: number;
}

export const DAY_MINUTES: Record<string, TransmissionBreakdown> = {
    WEEKDAY: {
        informativos: 69,
        boletines: 20,
        publicidad: 20,
        orientacion: 171,
        cienciaTecnica: 0,
        variados: 99,
        historicos: 0,
        literaturaArte: 43,
        musicales: 58,
        reposiciones: 480,
        total: 960
    },
    SATURDAY: {
        informativos: 69,
        boletines: 20,
        publicidad: 20,
        orientacion: 80,
        cienciaTecnica: 0,
        variados: 184,
        historicos: 0,
        literaturaArte: 0,
        musicales: 101,
        reposiciones: 480,
        total: 954
    },
    SUNDAY: {
        informativos: 28,
        boletines: 15,
        publicidad: 10,
        orientacion: 139,
        cienciaTecnica: 5,
        variados: 13,
        historicos: 13,
        literaturaArte: 85,
        musicales: 172,
        reposiciones: 480,
        total: 960
    }
};

/**
 * Determines the type of day for a given date.
 * @param date The date to check.
 * @returns 'WEEKDAY', 'SATURDAY', or 'SUNDAY'.
 */
export const getDayType = (date: Date): keyof typeof DAY_MINUTES => {
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0) return 'SUNDAY';
    if (day === 6) return 'SATURDAY';
    return 'WEEKDAY';
};

/**
 * Calculates accumulated transmission data from the start of the month to the target date.
 * @param targetDate The end date for accumulation.
 * @returns An object with total hours and breakdown.
 */
export const getAccumulatedData = (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const dayOfMonth = targetDate.getDate();

    const accumulated: TransmissionBreakdown = {
        informativos: 0,
        boletines: 0,
        publicidad: 0,
        orientacion: 0,
        cienciaTecnica: 0,
        variados: 0,
        historicos: 0,
        literaturaArte: 0,
        musicales: 0,
        reposiciones: 0,
        total: 0
    };

    for (let d = 1; d <= dayOfMonth; d++) {
        const current = new Date(year, month, d);
        const dayType = getDayType(current);
        const minutes = DAY_MINUTES[dayType];

        Object.keys(accumulated).forEach((key) => {
            const k = key as keyof TransmissionBreakdown;
            accumulated[k] += minutes[k];
        });
    }

    return {
        hours: parseFloat((accumulated.total / 60).toFixed(2)),
        breakdown: accumulated
    };
};

/**
 * Calculates total transmission data for a specific month.
 * @param month 0-indexed month (0 = Jan).
 * @param year The year.
 * @returns An object with total hours and breakdown.
 */
export const getMonthlyTotalData = (month: number, year: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const total: TransmissionBreakdown = {
        informativos: 0,
        boletines: 0,
        publicidad: 0,
        orientacion: 0,
        cienciaTecnica: 0,
        variados: 0,
        historicos: 0,
        literaturaArte: 0,
        musicales: 0,
        reposiciones: 0,
        total: 0
    };

    for (let d = 1; d <= daysInMonth; d++) {
        const current = new Date(year, month, d);
        const dayType = getDayType(current);
        const minutes = DAY_MINUTES[dayType];

        Object.keys(total).forEach((key) => {
            const k = key as keyof TransmissionBreakdown;
            total[k] += minutes[k];
        });
    }

    return {
        hours: parseFloat((total.total / 60).toFixed(2)),
        breakdown: total
    };
};
