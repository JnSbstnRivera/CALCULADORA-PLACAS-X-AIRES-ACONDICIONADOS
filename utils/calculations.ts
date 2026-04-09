
import { ACUnit, GlobalConfig } from '../types';
import { BTU_TO_KW_FACTOR, LOAD_FACTOR } from '../constants';

export const calculateUnitStats = (unit: ACUnit, config: GlobalConfig) => {
  // Potencia máxima en kW
  const maxPowerKw = (unit.btu / 12000) * 1.2; // Lógica del archivo original (12k BTU = 1.2kW)
  
  // Consumo promedio diario
  const loadFactor = LOAD_FACTOR[unit.type];
  const dailyKwh = maxPowerKw * loadFactor * unit.hours;
  
  // Costos
  const monthlyCost = dailyKwh * 30 * config.costPerKwh;

  // Cálculo de placas para esta unidad específica
  const panelProd = (config.panelWattage / 1000) * config.peakSunHours * config.systemLossFactor;
  const panelsRequired = Math.ceil(dailyKwh / panelProd);

  return {
    maxPowerKw,
    dailyKwh,
    monthlyCost,
    panelsRequired
  };
};

export const calculateSolarNeeds = (totalDailyKwh: number, config: GlobalConfig): number => {
  const panelProductionKwh = (config.panelWattage / 1000) * config.peakSunHours * config.systemLossFactor;
  if (panelProductionKwh === 0) return 0;
  return Math.ceil(totalDailyKwh / panelProductionKwh);
};
