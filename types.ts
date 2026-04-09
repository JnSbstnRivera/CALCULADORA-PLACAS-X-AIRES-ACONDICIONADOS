
export enum ACType {
  INVERTER = 'Inverter',
  CONVENTIONAL = 'Convencional'
}

export interface ACUnit {
  id: string;
  btu: number;
  type: ACType;
  hours: number;
}

export interface GlobalConfig {
  costPerKwh: number;
  panelWattage: number;
  peakSunHours: number;
  systemLossFactor: number;
}

export interface CalculationResult {
  dailyKwh: number;
  monthlyCost: number;
  panelsRequired: number;
}

export interface PRCity {
  name: string;
  lat: number;
  lon: number;
}
