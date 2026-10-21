# Disease Risk Screening Frontend (React 18 + Vite)

Human-Centered Clinical Editorial interface for CDC BRFSS 2015 diabetes and cardiometabolic risk screening.

## HCI & Usability Highlights

- **Nielsen #8 (Minimalist Design)**: Warm Alabaster canvas (`#F8FAFC`), crisp Slate hairlines, and Clinical Teal accents without decorative clutter.
- **Nielsen #5 (Error Prevention)**: Inline height/weight BMI calculator supporting Metric and Imperial units so users don't have to calculate BMI manually.
- **Nielsen #6 (Recognition Over Recall)**: Contextual tooltips on all clinical conditions explaining medical terms in accessible plain English.
- **Fitts's Law**: Large tactile choice cards (`min-h-[56px]`) with prominent keyboard focus rings and active states.
- **WCAG 2.1 AA (1.4.1 Use of Color)**: Triple-encoded risk communication combining color, explicit textual badges, and geometric icons (✓, ⚠, !).
- **Direct Manipulation**: "What-If" sandbox updates the risk gauge and feature importance in <300ms using a 150ms debounced hook with baseline delta tracking.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

App runs at `http://localhost:5173`. Ensure the FastAPI backend is running at `http://localhost:8000`.

## Production Build

```bash
npm run build
npm run preview
```
