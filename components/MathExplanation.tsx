
import React from 'react';
import { GlobalConfig, ACType } from '../types';
import { LOAD_FACTOR } from '../constants';

interface Props {
  config: GlobalConfig;
}

export const MathExplanation: React.FC<Props> = ({ config }) => {
  const productionPerPanel = (config.panelWattage / 1000) * config.peakSunHours * config.systemLossFactor;

  return (
    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-8">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        📘 Verificación de Fórmulas y Tarifas
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
        <div>
          <h4 className="font-semibold text-slate-900 mb-2">1. Consumo Eléctrico (LUMA)</h4>
          <p className="mb-2">
            La tarifa residencial de LUMA se calcula por kWh. Un equipo no gasta su máximo todo el tiempo:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Inverter (Factor {Math.round(LOAD_FACTOR[ACType.INVERTER] * 100)}%):</strong> El compresor ajusta su velocidad. Es el estándar recomendado en PR.</li>
            <li><strong>Convencional (Factor {Math.round(LOAD_FACTOR[ACType.CONVENTIONAL] * 100)}%):</strong> Gasta más por los picos de arranque constantes.</li>
          </ul>
          <div className="mt-2 bg-white p-2 rounded border border-slate-200 font-mono text-xs">
            (BTU × 0.000293) × Factor Carga × Horas = kWh Diarios
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 mb-2">2. Producción Fotovoltaica (PR)</h4>
          <p className="mb-2">
            Basado en el promedio conservador de **{config.peakSunHours} Horas Sol Pico** en la isla:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Placa QCells:</strong> {config.panelWattage}W nominales.</li>
            <li><strong>Eficiencia Real:</strong> {Math.round(config.systemLossFactor * 100)}% tras pérdidas por calor extremo en techos de PR.</li>
          </ul>
          <div className="mt-2 bg-white p-2 rounded border border-slate-200 font-mono text-xs text-blue-700">
            Cada placa genera ≈ <strong>{productionPerPanel.toFixed(2)} kWh/día</strong>
          </div>
          <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] leading-relaxed">
            <p className="font-bold text-blue-800 mb-1">Impacto en el Sistema:</p>
            <p><strong>Factor de Carga:</strong> Al bajar el factor de carga (eficiencia del equipo), la carga diaria calculada disminuye, reduciendo la cantidad de paneles necesarios. Un equipo Inverter eficiente requiere menos inversión solar.</p>
            <p className="mt-1"><strong>Horas Sol:</strong> Al usar un promedio de {config.peakSunHours}h (más conservador), el sistema se diseña con mayor seguridad para asegurar que incluso en días menos soleados, sus aires acondicionados sigan funcionando gratis.</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-slate-400 italic">
        * Nota: La tarifa de ${config.costPerKwh}/kWh es un promedio. Facturas con consumo alto de AC suelen reflejar cargos por ajuste de combustible más elevados.
      </p>
    </div>
  );
};
