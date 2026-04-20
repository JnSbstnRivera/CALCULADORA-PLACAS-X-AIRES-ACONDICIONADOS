
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Sun, Moon, BatteryCharging, DollarSign, Settings, Zap,
  MapPin, Sparkles, Cloud, CloudRain, CloudSun,
  ChevronDown, RefreshCw, Wind
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { ACUnit, ACType, GlobalConfig, PRCity } from './types';
import { DEFAULT_CONFIG, BTU_OPTIONS, LOAD_FACTOR, PR_CITIES, getWeatherDescription } from './constants';
import { calculateUnitStats, calculateSolarNeeds } from './utils/calculations';
import { SummaryCard } from './components/SummaryCard';
import { MathExplanation } from './components/MathExplanation';
import { InfoTooltip } from './components/InfoTooltip';

const generateId = () => Math.random().toString(36).substr(2, 9);

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Energy rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-orange-400/20"
          style={{ width: 120 + i * 180, height: 120 + i * 180 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.0, 1.4] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
        />
      ))}

      <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />

      {/* Logo — PNG transparente, sin caja blanca */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative mb-8"
      >
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src="https://i.postimg.cc/6T5J2v2G/6T5J2v2G.png"
            alt="Windmar Home Logo"
            className="w-36 h-36 object-contain drop-shadow-2xl"
          />
        </motion.div>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -top-3 -right-3 bg-orange-400 p-1.5 rounded-full shadow-lg text-blue-900"
        >
          <Sun size={16} />
        </motion.div>

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-3 -left-3 bg-blue-400 p-1.5 rounded-full shadow-lg text-white"
        >
          <Wind size={16} />
        </motion.div>
      </motion.div>

      {/* Texto */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="text-center px-6"
      >
        <h1 className="text-3xl font-black tracking-tighter text-white mb-2">¿Cuántas placas para mis aires? ❄️</h1>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
          className="h-0.5 w-24 bg-orange-400 mx-auto rounded-full mb-3"
        />
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest opacity-80">
          Calculadora Solar · Windmar Home
        </p>
      </motion.div>

      {/* Dots */}
      <motion.div
        className="mt-10 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
            className="w-2 h-2 bg-orange-400 rounded-full"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; city: string; code: number; isAuto: boolean } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [units, setUnits] = useState<ACUnit[]>([
    { id: '1', btu: 12000, type: ACType.INVERTER, hours: 8 }
  ]);
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('wh-theme') === 'dark';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      try { localStorage.setItem('wh-theme', 'dark'); } catch (e) {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('wh-theme', 'light'); } catch (e) {}
    }
  }, [isDarkMode]);

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
    } catch (err) {
      console.error("Error fetching weather", err);
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
    if (city) fetchWeather(city.lat, city.lon, city.name, false);
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
    <div className="min-h-screen pb-12 text-slate-900 dark:text-[#e8eaed] bg-[#f8fafc] dark:bg-[#0f1215]">
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      <header className="bg-gradient-to-r from-blue-800 to-blue-600 dark:from-[#0d1f3c] dark:to-[#0a1730] text-white shadow-xl relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

            {/* Logo + título */}
            <div className="flex items-center gap-4">
              <div className="p-1 flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 overflow-hidden transition-all duration-300 hover:scale-105">
                <img
                  src="https://i.postimg.cc/6T5J2v2G/6T5J2v2G.png"
                  alt="Windmar Home Logo"
                  className="w-full h-full object-contain drop-shadow-lg"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none mb-1">Calculadora de Placas para Aires ❄️</h1>
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest opacity-80">Windmar Home | Puerto Rico</p>
              </div>
            </div>

            {/* Lado derecho: toggle encima, ciudad+clima abajo */}
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">

              {/* Theme Toggle — réplica exacta del Panel #8 */}
              <div className="flex items-center gap-2 bg-black/20 dark:bg-wh-navy/60 backdrop-blur-md p-1 pr-3 rounded-full border border-white/15 dark:border-wh-navy/50 shadow-sm self-end">
                <motion.button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  animate={{ rotate: isDarkMode ? 360 : 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className={`p-1.5 rounded-full transition-colors duration-500 ${
                    isDarkMode
                      ? 'bg-wh-orange text-white shadow-[0_0_10px_rgba(248,155,36,0.3)]'
                      : 'bg-white text-blue-800 shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                  }`}
                >
                  {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                </motion.button>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[8px] font-black text-white/60 uppercase tracking-tighter">Tema</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-wh-orange' : 'text-white'}`}>
                    {isDarkMode ? 'Oscuro' : 'Claro'}
                  </span>
                </div>
              </div>

              {/* Ciudad + Clima */}
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
          </div>
        </div>

        <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 bg-white dark:bg-[#161b22] shadow-md border border-slate-200 dark:border-white/[0.08] px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 dark:text-[#e8eaed] hover:bg-slate-50 dark:hover:bg-[#1a1d25] transition-all active:scale-95"
          >
            <Settings size={14} className={showConfig ? 'animate-spin-slow' : ''} />
            {showConfig ? 'Guardar Variables' : 'Variables Técnicas'}
          </button>
        </div>

        {showConfig && (
          <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl p-6 mb-8 border border-blue-100 dark:border-white/[0.08] animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-white/[0.08] pb-4">
              <Settings className="text-blue-600 dark:text-blue-400" size={20} />
              <h3 className="font-bold text-slate-800 dark:text-[#e8eaed] text-sm uppercase tracking-widest">Ajustes del Sistema</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  label: 'Tarifa LUMA ($/kWh)',
                  hint: 'Costo actual de la energía eléctrica',
                  val: config.costPerKwh,
                  key: 'costPerKwh',
                  step: 0.01,
                  icon: <DollarSign size={12} />
                },
                {
                  label: 'Potencia por Placa (W)',
                  hint: 'Vataje nominal del panel solar (ej: 400W)',
                  val: config.panelWattage,
                  key: 'panelWattage',
                  step: 5,
                  icon: <BatteryCharging size={12} />
                },
                {
                  label: 'Horas de Sol Pico (HSP)',
                  hint: 'Promedio diario de radiación solar en PR',
                  val: config.peakSunHours,
                  key: 'peakSunHours',
                  step: 0.1,
                  icon: <Sun size={12} />
                },
                {
                  label: 'Rendimiento Real del Sistema',
                  hint: `${Math.round(config.systemLossFactor * 100)}% efectivo — pérdidas por calor en techo (0.78 = 78%)`,
                  val: config.systemLossFactor,
                  key: 'systemLossFactor',
                  step: 0.01,
                  icon: <Zap size={12} />
                },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-[#a0a4ad] uppercase flex items-center gap-1">
                    {field.icon} {field.label}
                  </label>
                  <p className="text-[9px] text-slate-400 dark:text-[#6b7280] italic">{field.hint}</p>
                  <input
                    type="number"
                    step={field.step}
                    value={field.val}
                    onChange={(e) => setConfig({ ...config, [field.key]: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 bg-slate-50 dark:bg-[#1a1d25] border border-slate-200 dark:border-white/[0.08] rounded-xl text-gray-900 dark:text-[#e8eaed] font-bold focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2 tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <SummaryCard
            title="Carga Diaria"
            value={`${totals.totalKwh.toFixed(1)} kWh`}
            icon={<Zap />}
            colorClass="bg-orange-500"
          />
          <SummaryCard
            title="Paneles Requeridos"
            value={totals.panelsNeeded}
            subValue={`${config.panelWattage}W por panel`}
            icon={<BatteryCharging />}
            colorClass="bg-green-600"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Unidades de aire */}
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-slate-100 dark:border-white/[0.08] p-8">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-[#e8eaed]">Unidades de Aire</h2>
                  <p className="text-xs text-slate-400 dark:text-[#a0a4ad] font-medium">Inventario de equipos</p>
                </div>
                <button
                  onClick={addUnit}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg transition-all active:scale-95 shrink-0"
                >
                  <Plus size={16} /> Añadir Equipo
                </button>
              </div>

              <div className="space-y-4">
                {units.map((unit, idx) => (
                  <div
                    key={unit.id}
                    className="group relative bg-slate-50 dark:bg-[#1a1d25] hover:bg-white dark:hover:bg-[#161b22] hover:shadow-lg transition-all rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">

                      {/* Capacidad */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#a0a4ad] uppercase tracking-widest ml-1">Capacidad</label>
                        <div className="relative">
                          <select
                            value={unit.btu}
                            onChange={(e) => updateUnit(unit.id, 'btu', parseInt(e.target.value))}
                            className="w-full p-3 pl-4 pr-9 bg-white dark:bg-[#0f1215] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-sm font-bold text-gray-900 dark:text-[#e8eaed] focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                          >
                            {BTU_OPTIONS.map(btu => <option key={btu} value={btu}>{btu.toLocaleString()} BTU</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#a0a4ad] pointer-events-none" />
                        </div>
                      </div>

                      {/* Tecnología */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#a0a4ad] uppercase tracking-widest ml-1">Tecnología</label>
                        <div className="relative">
                          <select
                            value={unit.type}
                            onChange={(e) => updateUnit(unit.id, 'type', e.target.value)}
                            className="w-full p-3 pl-4 pr-9 bg-white dark:bg-[#0f1215] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-sm font-bold text-gray-900 dark:text-[#e8eaed] focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                          >
                            {Object.values(ACType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#a0a4ad] pointer-events-none" />
                        </div>
                      </div>

                      {/* Horas / Día */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#a0a4ad] uppercase tracking-widest ml-1">Horas / Día</label>
                        <input
                          type="number"
                          value={unit.hours}
                          onChange={(e) => updateUnit(unit.id, 'hours', parseFloat(e.target.value) || 0)}
                          className="w-full p-3 bg-white dark:bg-[#0f1215] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-sm font-bold text-gray-900 dark:text-[#e8eaed] focus:ring-2 focus:ring-blue-500 outline-none shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        />
                      </div>

                      {/* Paneles — misma altura, label fuera, trash dentro */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-[#a0a4ad] uppercase tracking-widest ml-1">Paneles</label>
                        <div className="relative w-full p-3 bg-white dark:bg-[#0f1215] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-sm flex items-center justify-center">
                          <span className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">{totals.breakdown[idx]?.panelsRequired}</span>
                          <button
                            onClick={() => removeUnit(unit.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Costo de No Tener Sol */}
            <div className="bg-amber-50 dark:bg-[#1c1409] rounded-3xl p-8 border border-amber-200 dark:border-amber-900/30 relative overflow-hidden">
              <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-4 flex items-center gap-3 text-xl relative z-10">
                <DollarSign className="text-amber-500" size={24} />
                El Costo de No Tener Sol
              </h4>
              <div className="grid sm:grid-cols-2 gap-6 text-sm relative z-10">
                <div className="bg-white/80 dark:bg-black/20 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/20">
                  <p className="text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase mb-1">Equipo 12k Convencional</p>
                  <p className="font-bold text-red-600 dark:text-red-400 text-lg">~$0.48 <span className="text-xs text-slate-400 dark:text-[#a0a4ad] font-normal">cada hora de uso</span></p>
                </div>
                <div className="bg-white/80 dark:bg-black/20 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/20">
                  <p className="text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase mb-1">Ahorro con Placas</p>
                  <p className="font-bold text-green-700 dark:text-green-400 text-lg">100% <span className="text-xs text-slate-400 dark:text-[#a0a4ad] font-normal">de la carga AC</span></p>
                </div>
              </div>
              <div className="mt-6 flex items-start gap-3 bg-amber-900/5 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/20">
                <InfoTooltip text="Calculado con la tarifa actual de LUMA y factores de carga reales de Puerto Rico." />
                <p className="text-sm text-amber-800 dark:text-amber-300 italic font-medium">
                  "Usted ya está pagando por el sol, solo que el cheque hoy se lo envía a LUMA."
                </p>
              </div>
            </div>

            <MathExplanation config={config} />
          </div>

          <div className="space-y-6">
            {/* Gráfica */}
            <div className="bg-white dark:bg-[#161b22] rounded-3xl shadow-sm border border-slate-100 dark:border-white/[0.08] p-8">
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 dark:text-[#e8eaed] text-lg">Mix de Consumo</h3>
                <p className="text-xs text-slate-400 dark:text-[#a0a4ad] font-medium tracking-tight">Carga por unidad</p>
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

            {/* Puntos de Cierre */}
            <div className="bg-blue-900 dark:bg-[#0d1f3c] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
              <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                <Sparkles size={18} className="text-blue-400" />
                Puntos de Cierre
              </h3>
              <ul className="space-y-6 text-sm">
                <li className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <p className="leading-relaxed"><strong className="text-blue-200 block mb-1">Medición Neta:</strong> La red es su batería. Lo que sobra hoy, lo consume esta noche sin costo.</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <p className="leading-relaxed"><strong className="text-blue-200 block mb-1">Carga Tropical:</strong> Ajustamos al {Math.round(LOAD_FACTOR[ACType.INVERTER] * 100)}%. Diseñamos para la realidad de nuestra isla.</p>
                </li>
                <li className="bg-white/10 p-4 rounded-xl">
                  <p className="text-sm font-bold italic text-blue-50">"Dígale adiós al miedo a encender el aire. Con Windmar, el sol paga la cuenta."</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-16 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-200 dark:border-white/[0.08]">
          <div className="flex gap-4">
            <div className="bg-orange-400/10 p-3 rounded-xl h-fit">
              <Sun className="text-orange-400" size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-[#e8eaed] text-sm mb-1">Paneles QCells</h4>
              <p className="text-slate-600 dark:text-[#a0a4ad] text-xs leading-relaxed">Placas de alto rendimiento certificadas para el clima tropical de Puerto Rico.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-600/10 p-3 rounded-xl h-fit">
              <Zap className="text-blue-600" size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-[#e8eaed] text-sm mb-1">Cálculo para Aires</h4>
              <p className="text-slate-600 dark:text-[#a0a4ad] text-xs leading-relaxed">Dimensionamiento preciso de paneles según la capacidad BTU de tus equipos de aire acondicionado.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-emerald-600/10 p-3 rounded-xl h-fit">
              <BatteryCharging className="text-emerald-600" size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-[#e8eaed] text-sm mb-1">Sistema Eficiente</h4>
              <p className="text-slate-600 dark:text-[#a0a4ad] text-xs leading-relaxed">Tecnología inverter para máxima eficiencia y menor consumo energético diario.</p>
            </div>
          </div>
        </div>
        <div className="text-center pt-8 pb-4">
          <p className="text-[10px] font-black text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.3em]">
            © 2026 Equipo de Análisis y Desarrollo — Call Center Windmar Home
          </p>
        </div>
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
