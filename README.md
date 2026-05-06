# CALCULADORA DE PLACAS PARA AIRES ACONDICIONADOS

Calculadora de paneles solares optimizada para sistemas de aire acondicionado de **Windmar Home Puerto Rico**.

---

## ¿Qué hace?

El asesor ingresa los equipos de A/C del cliente (BTU, cantidad, horas de uso) y la herramienta calcula el número exacto de paneles solares necesarios para cubrir su carga de climatización. Calibrada con los promedios de Puerto Rico (4.5 HSP, paneles 410 W).

---

## Características

- Calculadora de carga por BTU y eficiencia SEER
- Soporte para múltiples unidades de A/C (mini-split, central, window)
- Cálculo de kWh/día → paneles solares necesarios
- Recomendación de batería de respaldo
- Análisis IA contextual (Gemini)
- Gráficas de consumo (Recharts)
- Dark / Light mode

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| IA | Google Gemini (@google/genai) |
| Gráficas | Recharts |
| Animaciones | Motion (Framer Motion) |
| Iconos | Lucide React |
| Fuentes | Poppins |

---

## Variables de entorno

```
GEMINI_API_KEY=
```

---

## Instalación local

```bash
npm install
npm run dev
# http://localhost:5173
```

---

## Despliegue

**Producción:** https://calculadora-placas-aires-acondicion.vercel.app

---

*Desarrollado para Windmar Home Puerto Rico — Call Center Operations*
