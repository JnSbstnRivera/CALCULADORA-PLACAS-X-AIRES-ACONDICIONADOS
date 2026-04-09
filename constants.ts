
import { GlobalConfig, ACType, PRCity } from './types';

export const BTU_TO_KW_FACTOR = 0.00029307107;

export const LOAD_FACTOR = {
  [ACType.INVERTER]: 0.45,
  [ACType.CONVENTIONAL]: 0.85
};

export const DEFAULT_CONFIG: GlobalConfig = {
  costPerKwh: 0.35,
  panelWattage: 410,
  peakSunHours: 4.5,
  systemLossFactor: 0.85
};

export const BTU_OPTIONS = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];

export const PR_CITIES: PRCity[] = [
  { name: "San Juan", lat: 18.4655, lon: -66.1057 },
  { name: "Ponce", lat: 18.0111, lon: -66.6141 },
  { name: "Mayagüez", lat: 18.2013, lon: -67.1396 },
  { name: "Arecibo", lat: 18.4724, lon: -66.7157 },
  { name: "Caguas", lat: 18.2341, lon: -66.0485 },
  { name: "Bayamón", lat: 18.3950, lon: -66.1555 },
  { name: "Carolina", lat: 18.3808, lon: -65.9574 },
  { name: "Guaynabo", lat: 18.3577, lon: -66.1110 },
  { name: "Humacao", lat: 18.1497, lon: -65.8274 },
  { name: "Fajardo", lat: 18.3258, lon: -65.6524 },
  { name: "Vieques", lat: 18.1447, lon: -65.4421 }
];

export const getWeatherDescription = (code: number) => {
  if (code === 0) return { label: "Despejado", color: "text-yellow-400" };
  if (code <= 3) return { label: "Parcialmente Nublado", color: "text-blue-200" };
  if (code <= 48) return { label: "Neblina/Nubes", color: "text-gray-300" };
  if (code <= 67) return { label: "Lluvia Ligera", color: "text-blue-400" };
  if (code <= 82) return { label: "Chubascos", color: "text-blue-600" };
  return { label: "Tormenta", color: "text-indigo-500" };
};
