
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, Sun, BatteryCharging, DollarSign, Settings, Zap, 
  MapPin, Sparkles, Cloud, CloudRain, CloudSun, 
  ChevronDown, RefreshCw, Wind, LayoutGrid
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { ACUnit, ACType, GlobalConfig, PRCity } from './types';
import { DEFAULT_CONFIG, BTU_OPTIONS, LOAD_FACTOR, PR_CITIES, getWeatherDescription } from './constants';
import { calculateUnitStats, calculateSolarNeeds } from './utils/calculations';
import { SummaryCard } from './components/SummaryCard';
import { MathExplanation } from './components/MathExplanation';
import { InfoTooltip } from './components/InfoTooltip';

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; city: string; code: number; isAuto: boolean } | null>(null);
  const [aiAdvice, setAiAdvice] = useState("Sincronizando con el clima de la isla...");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [units, setUnits] = useState<ACUnit[]>([
    { id: '1', btu: 12000, type: ACType.INVERTER, hours: 8 }
  ]);
  const [showSplash, setShowSplash] = useState(true);

  // Splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Fix for Recharts dimensions error - ensure component is mounted before rendering charts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number, cityName: string, isAuto: boolean) => {
    setLoadingWeather(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const data = await res.json();
      const current = data.current_weather;
      
      setWeather({ 
        temp: current.temperature, 
        city: cityName, 
        code: current.weathercode,
        isAuto
      });

      const weatherDesc = getWeatherDescription(current.weathercode).label;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como un mentor experto en ventas de energía solar en Puerto Rico. 
      La ubicación es ${cityName}. La temperatura es ${current.temperature}°C y el cielo está ${weatherDesc}. 
      Genera una frase de cierre corta (máx 20 palabras) que use el clima actual como argumento de venta. 
      No uses introducciones.`;
      
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiAdvice(aiResponse.text || "La independencia energética no depende de un día de sol, sino de tu decisión de hoy. ⚡");
    } catch (err) {
      console.error("Error fetching weather", err);
      setAiAdvice("El ahorro solar es constante, como el compromiso de Windmar con tu hogar. 🔋");
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    const initWeather = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "Tu Ubicación", true),
          () => fetchWeather(PR_CITIES[0].lat, PR_CITIES[0].lon, PR_CITIES[0].name, false),
          { timeout: 5000 }
        );
      } else {
        fetchWeather(PR_CITIES[0].lat, PR_CITIES[0].lon, PR_CITIES[0].name, false);
      }
    };
    initWeather();
  }, [fetchWeather]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = PR_CITIES.find(c => c.name === e.target.value);
    if (city) {
      fetchWeather(city.lat, city.lon, city.name, false);
    }
  };

  const addUnit = () => setUnits([...units, { id: generateId(), btu: 12000, type: ACType.INVERTER, hours: 8 }]);
  const removeUnit = (id: string) => setUnits(units.filter(u => u.id !== id));
  const updateUnit = (id: string, field: keyof ACUnit, value: any) => {
    setUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const totals = useMemo(() => {
    let totalKwh = 0;
    let totalMonthlyCost = 0;
    const breakdown = units.map(unit => {
      const stats = calculateUnitStats(unit, config);
      totalKwh += stats.dailyKwh;
      totalMonthlyCost += stats.monthlyCost;
      return { ...unit, ...stats };
    });
    const panelsNeeded = calculateSolarNeeds(totalKwh, config);
    return { totalKwh, totalMonthlyCost, panelsNeeded, breakdown };
  }, [units, config]);

  const chartData = totals.breakdown.map((item) => ({
    name: `${item.btu} BTU`,
    value: parseFloat(item.dailyKwh.toFixed(2))
  }));

  const COLORS = ['#0072ce', '#33b7ff', '#00C49F', '#FFBB28', '#FF8042'];

  const WeatherIcon = () => {
    if (!weather) return <Sun size={24} className="animate-pulse text-yellow-200" />;
    const code = weather.code;
    if (code === 0) return <Sun size={24} className="text-yellow-400 fill-yellow-400" />;
    if (code <= 3) return <CloudSun size={24} className="text-blue-200" />;
    if (code <= 48) return <Cloud size={24} className="text-gray-300" />;
    return <CloudRain size={24} className="text-blue-400" />;
  };

  return (
    <div className="min-h-screen pb-12 text-slate-900 bg-[#f8fafc]">
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-blue-800 flex flex-col items-center justify-center text-white p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative mb-8"
            >
              <div className="bg-white p-6 rounded-3xl shadow-2xl">
                <img 
                  src="https://i.postimg.cc/6T5J2v2G/6T5J2v2G.png" 
                  alt="Solar Logo" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              
              {/* Animated Elements representing Solar and AC */}
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute -top-4 -right-4 bg-yellow-400 p-2 rounded-full shadow-lg text-blue-900"
              >
                <Sun size={24} />
              </motion.div>
              
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  x: [0, 5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 bg-blue-400 p-2 rounded-full shadow-lg text-white"
              >
                <Wind size={24} />
              </motion.div>

              <motion.div
                animate={{ 
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute top-1/2 -right-12 -translate-y-1/2 bg-white/20 p-2 rounded-lg backdrop-blur-sm"
              >
                <LayoutGrid size={20} className="text-white" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h1 className="text-3xl font-black tracking-tighter mb-2">SOLAR ADVISOR PRO</h1>
              <div className="h-1 w-24 bg-yellow-400 mx-auto rounded-full mb-4"></div>
              <p className="text-blue-100 font-medium opacity-80 uppercase tracking-widest text-xs">Optimizando su ahorro en Puerto Rico</p>
            </motion.div>
            
            <motion.div 
              className="mt-12 flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md shadow-lg border border-white/10 flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 overflow-hidden transition-all duration-300 hover:scale-105">
                <img 
                  src="https://i.postimg.cc/6T5J2v2G/6T5J2v2G.png" 
                  alt="Solar Logo" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none mb-1">SOLAR ADVISOR PRO ⚡</h1>
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest opacity-80">Windmar Home | Puerto Rico</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-48">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 z-10" />
                <select 
                  onChange={handleCityChange}
                  value={weather?.city === "Tu Ubicación" ? "San Juan" : weather?.city}
                  className="w-full pl-9 pr-8 py-2.5 bg-black/30 hover:bg-black/40 border border-white/20 rounded-xl text-sm font-bold appearance-none transition outline-none cursor-pointer"
                >
                  {PR_CITIES.map(c => <option key={c.name} value={c.name} className="bg-blue-800">{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 pointer-events-none" />
              </div>

              {weather && (
                <div className="flex items-center gap-4 bg-white/10 px-5 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2">
                    <WeatherIcon />
                    <div className="leading-tight">
                      <p className="font-bold text-lg">{weather.temp}°C</p>
                      <p className="text-[10px] uppercase font-black opacity-60 tracking-tighter">
                        {getWeatherDescription(weather.code).label}
                      </p>
                    </div>
                  </div>
                  {loadingWeather && <RefreshCw size={14} className="animate-spin text-blue-200" />}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-blue-900/40 rounded-2xl p-4 flex items-center gap-4 border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="bg-yellow-400 p-2 rounded-lg shadow-lg">
              <Sparkles className="text-blue-900" size={20} />
            </div>
            <p className="text-sm md:text-base font-medium italic text-blue-50 leading-relaxed">
              "{aiAdvice}"
            </p>
          </div>
        </div>
        
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="flex justify-end mb-4">
           <button 
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 bg-white shadow-md border border-slate-200 px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
            >
              <Settings size={14} className={showConfig ? 'animate-spin-slow' : ''} /> 
              {showConfig ? 'Guardar Variables' : 'Variables Técnicas'}
            </button>
        </div>

        {showConfig && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8 border border-blue-100 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
               <Settings className="text-blue-600" size={20} />
               <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">Ajustes del Sistema</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Tarifa LUMA ($/kWh)', val: config.costPerKwh, key: 'costPerKwh', step: 0.01, icon: <DollarSign size={12}/> },
                { label: 'Wataje Placa (W)', val: config.panelWattage, key: 'panelWattage', step: 5, icon: <BatteryCharging size={12}/> },
                { label: 'Horas Sol Pico', val: config.peakSunHours, key: 'peakSunHours', step: 0.1, icon: <Sun size={12}/> },
                { label: 'Eficiencia (%)', val: config.systemLossFactor, key: 'systemLossFactor', step: 0.01, icon: <Zap size={12}/> },
              ].map(field => (
                <div key={field.key} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    {field.icon} {field.label}
                  </label>
                  <input 
                    type="number" step={field.step} value={field.val}
                    onChange={(e) => setConfig({...config, [field.key]: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Carga Diaria" value={`${totals.totalKwh.toFixed(1)} kWh`} icon={<Zap />} colorClass="bg-orange-500" />
          <SummaryCard title="Paneles Requeridos" value={totals.panelsNeeded} subValue={`${config.panelWattage}W por panel`} icon={<BatteryCharging />} colorClass="bg-green-600" />
          <SummaryCard title="Crédito LUMA Estimado" value={`$${totals.totalMonthlyCost.toFixed(2)}`} subValue="Potencial Mensual" icon={<DollarSign />} colorClass="bg-blue-700" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Unidades de Aire</h2>
                  <p className="text-xs text-slate-400 font-medium">Inventario de equipos</p>
                </div>
                <button onClick={addUnit} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all active:scale-95">
                  <Plus size={18} /> Añadir Equipo
                </button>
              </div>

              <div className="space-y-5">
                {units.map((unit, idx) => (
                  <div key={unit.id} className="group relative bg-slate-50 hover:bg-white hover:shadow-lg transition-all rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row items-center gap-6 overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1 w-full relative z-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Capacidad</label>
                        <select 
                          value={unit.btu} onChange={(e) => updateUnit(unit.id, 'btu', parseInt(e.target.value))}
                          className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        >
                          {BTU_OPTIONS.map(btu => <option key={btu} value={btu}>{btu.toLocaleString()} BTU</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tecnología</label>
                        <select 
                          value={unit.type} onChange={(e) => updateUnit(unit.id, 'type', e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        >
                          {Object.values(ACType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2 col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Horas/Día</label>
                        <input 
                          type="number" value={unit.hours} onChange={(e) => updateUnit(unit.id, 'hours', parseFloat(e.target.value) || 0)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 bg-white px-7 py-4 rounded-3xl border border-slate-100 shadow-sm w-full md:w-auto relative z-10">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Paneles</p>
                          <p className="text-2xl font-black text-blue-600 leading-none">{totals.breakdown[idx]?.panelsRequired}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-100"></div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Costo</p>
                          <p className="text-2xl font-black text-slate-800 leading-none">${totals.breakdown[idx]?.monthlyCost.toFixed(0)}</p>
                        </div>
                        <button onClick={() => removeUnit(unit.id)} className="ml-2 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                          <Trash2 size={22} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 relative overflow-hidden">
                <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-3 text-xl relative z-10">
                  <DollarSign className="text-amber-500" size={24} />
                  El Costo de No Tener Sol
                </h4>
                <div className="grid sm:grid-cols-2 gap-6 text-sm relative z-10">
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-amber-100">
                    <p className="text-amber-700 text-[10px] font-black uppercase mb-1">Equipo 12k Convencional</p>
                    <p className="font-bold text-red-600 text-lg">~$0.48 <span className="text-xs text-slate-400 font-normal text-slate-900">cada hora de uso</span></p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-amber-100">
                    <p className="text-amber-700 text-[10px] font-black uppercase mb-1">Ahorro con Placas</p>
                    <p className="font-bold text-green-700 text-lg">100% <span className="text-xs text-slate-400 font-normal text-slate-900">de la carga AC</span></p>
                  </div>
                </div>
                <div className="mt-6 flex items-start gap-3 bg-amber-900/5 p-4 rounded-2xl border border-amber-200/50">
                  <InfoTooltip text="Calculado con la tarifa actual de LUMA y factores de carga reales de Puerto Rico." />
                  <p className="text-sm text-amber-800 italic font-medium">
                    "Usted ya está pagando por el sol, solo que el cheque hoy se lo envía a LUMA."
                  </p>
                </div>
            </div>
            
            <MathExplanation config={config} />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 text-lg">Mix de Consumo</h3>
                <p className="text-xs text-slate-400 font-medium tracking-tight">Carga por unidad</p>
              </div>
              <div className="h-64">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie 
                        data={chartData} 
                        cx="50%" cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                        stroke="none"
                        animationDuration={1000}
                      >
                        {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-blue-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                  <Sparkles size={18} className="text-blue-400" />
                  Puntos de Cierre
                </h3>
                <ul className="space-y-6 text-sm">
                  <li className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                    <p className="leading-relaxed"><strong className="text-blue-200 block mb-1">Medición Neta:</strong> La red es su batería. Lo que sobra hoy, lo consume esta noche sin costo.</p>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                    <p className="leading-relaxed"><strong className="text-blue-200 block mb-1">Carga Tropical:</strong> Ajustamos al {Math.round(LOAD_FACTOR[ACType.INVERTER]*100)}%. Diseñamos para la realidad de nuestra isla.</p>
                  </li>
                  <li className="bg-white/10 p-4 rounded-xl">
                    <p className="text-sm font-bold italic text-blue-50">"Dígale adiós al miedo a encender el aire. Con Windmar, el sol paga la cuenta."</p>
                  </li>
                </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-16 text-center pb-12">
        <p className="font-bold text-slate-800 text-lg uppercase">Juan S Rivera</p>
        <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-1">Consultor Energético Senior</p>
        <p className="text-slate-400 text-[10px] font-medium">Windmar Home | Puerto Rico</p>
      </footer>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
