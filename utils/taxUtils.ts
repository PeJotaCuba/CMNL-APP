// Tax and Social Security Contribution utilities according to MFP Cuba regulations

/**
 * Calculates the Contribución Especial a la Seguridad Social (CESS)
 * Escala progresiva:
 * - Hasta 15,000.00 pesos: 5%
 * - Exceso de 15,000.00 pesos: 10%
 */
export function calculateCESS(amount: number): number {
  if (amount <= 15000) {
    return amount * 0.05;
  } else {
    return (15000 * 0.05) + ((amount - 15000) * 0.10);
  }
}

/**
 * Calculates the Impuesto sobre Ingresos Personales (ISIP)
 * Escala progresiva mensual:
 * - Hasta 3,260.00 pesos: 0% (Exento)
 * - Desde 3,260.01 hasta 9,510.00 pesos: 3% (sobre el exceso de 3,260)
 * - Más de 9,510.00 pesos: 5% (sobre la cantidad que supere los 9,510 + el 3% del tramo anterior = 187.50)
 */
export function calculateISIP(amount: number): number {
  if (amount <= 3260) {
    return 0;
  } else if (amount <= 9510) {
    return (amount - 3260) * 0.03;
  } else {
    const bracket1 = (9510 - 3260) * 0.03; // 187.50
    const bracket2 = (amount - 9510) * 0.05;
    return bracket1 + bracket2;
  }
}

/**
 * Calculates the total tax (CESS + ISIP)
 */
export function calculateTotalTax(amount: number): number {
  return calculateCESS(amount) + calculateISIP(amount);
}
