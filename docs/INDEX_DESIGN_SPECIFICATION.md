# Comprehensive Design & UI/UX Architectural Specification of `pages/index.vue`

**System:** CowCare AI (Heat Stress Intelligence for Dairy Farms)  
**Author:** Senior Frontend & UI/UX Architect  
**Document Status:** Production Specification (Updated October 24, 2026)  

---

## 1. Executive Overview & Design Intent

The public-facing `pages/index.vue` serves as the primary digital gateway for **CowCare AI**. It is architected as an **Agritech Product Overview & Interactive THI Sandbox**.

### Core Objectives:
1. **Evidence-Based Storytelling:** Present the biological reality of heat stress in Thai crossbred dairy cattle using verified daily-mean THI thresholds (`74 / 76 / 82`) and 3-day proactive THI forecasts.
2. **Interactive Scientific Verification:** Provide farmers and evaluators with a sandbox that models the **National Research Council (NRC, 1971)** heat stress equation using Thai-Holstein biological thresholds (`THI 74 / 76 / 82` — Boonkum et al., 2011; 2024).
3. **Zero Administrative Exposure:** Ensure public users have access to educational content, the interactive simulator, and member login flows (`/login`), while strictly segregating administrative management surfaces (`/Admin`) behind authentication guards.

---

## 2. Visual Identity & Design Tokens (Biophilic Agritech System)

The visual design is grounded in the **Biophilic Agritech Design System**, balancing biological warmth with readable telemetry hierarchy.

### Color Palette & Semantic Tokens

| Design Token | Hex Code | Semantic Role | Functional Impact |
| :--- | :--- | :--- | :--- |
| **Warm Ivory Canvas** | `#FFFDF7` | Global Page Background | Replaces stark `#FFFFFF` glare with a warm tone that reduces eye strain. |
| **Deep Forest Green** | `#24433A` / `#163026` | Primary Brand & Structure | Represents agricultural stability and primary structural framing. |
| **Deep Night Forest** | `#19362E` | Forecast & Vision Section Accent | Inverted background for Section 4 to signal technical depth. |
| **Terracotta Amber** | `#D87939` / `#F2BD7C` | Primary Action / Accent | Highlights thermal inflection points and forecast chart lines. |
| **Normal (Comfort)** | `#10B981` (Bg `#ECFDF5`) | $\text{THI} < 74.0$ | Normal thermal condition for Thai crossbred dairy cattle. |
| **Mild (Watch)** | `#F59E0B` (Bg `#FFFBEB`) | $\text{THI } 74.0 \text{ -- } 75.9$ | Onset threshold where milk yield begins to decline in multiparous high-HF cows (Boonkum et al., 2011). |
| **Moderate Stress** | `#EA580C` (Bg `#FFF7ED`) | $\text{THI } 76.0 \text{ -- } 81.9$ | Population-level heat stress threshold for Thai-Holstein crossbreds; milk yield and conception rate decline (Boonkum et al., 2024). |
| **Severe Heat Stress** | `#E11D48` (Bg `#FFF1F2`) | $\text{THI} \ge 82.0$ | Critical thermal load where milk production drops more rapidly (Boonkum et al., 2011); requires active cooling. |

### Typographic System
- **Type Family:** `'Noto Sans Thai'`, `'Inter'`, `-apple-system, sans-serif` for high legibility across bilingual Thai/English scientific copy.
- **Tabular Numerals (`tabular-nums`):** Enforced across all sensor readouts, sliders, and telemetry counters to prevent jitter and layout shifts during dynamic calculation.
- **Fluid Type Scaling:** Headings leverage CSS `clamp()` (e.g., `clamp(2rem, 5vw, 3.4rem)`) for continuous responsive scaling across mobile, tablet, and widescreen monitors.

---

## 3. Structural Decomposition of the 7 Key Sections

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Hero Section & Interactive Sandbox (Split Grid 7 : 5 Columns)       │
│    ├── Value Proposition, Eyebrow & Public Action CTAs (/login)        │
│    └── Real-time NRC 1971 Calculator, 4 Thai Presets, Continuous Gauge │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Scientific Signal Strip (Deep Green Banner #24433A)                 │
│    ├── THI 74 / 76 / 82 (Thresholds)  ├── 22:00–06:00 (Night Relief)   │
│    ├── 5-Min Buckets (Unified Metric) └── 3 Days (ECMWF + Bias)        │
├────────────────────────────────────────────────────────────────────────┤
│ 3. 3-Layer Architecture & Bento Feature Matrix (Sense → Rec → Cap)     │
│    ├── Card 01: SENSE (ESP32-S3 + SHT20 + YOLO26m ONNX 4-Class Vision) │
│    ├── Card 02: RECOMMEND (3-Day Hybrid Forecast + Context Advisory)   │
│    └── Card 03: CAPITALIZE (Cooperative Logbook + Data Completeness)   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. 3-Day THI Forecast & Thermal Accumulation (#19362E)                 │
│    ├── Architecture Flow: Barn Sensor + Open-Meteo ECMWF → 3-Day THI   │
│    └── Comparative Bento: Reactive vs Proactive Cooling Management     │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Cooperative Digital Logbook Preview                                 │
│    ├── Data Completeness, Night Relief Hours & Stress Streak           │
│    └── Sample Digital Logbook Card (Explicitly Labeled as Sample Data) │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Academic Foundation & Verified Citations                            │
│    ├── NRC (1971) & Sae-tiao et al. (2019)                             │
│    ├── Boonkum et al. (2011; 2024) & Duangjinda et al.                 │
│    └── Igono et al. (1992) & Penn State Extension                      │
├────────────────────────────────────────────────────────────────────────┤
│ 7. Final Conversion CTA & Global Footer                                │
│    ├── Public Sign-in Link (/login) & Architecture Anchor (#solution)  │
│    └── Global Semantic <AppFooter />                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Deep-Dive: Engineering & Interaction Architecture

### 4.1 Section 1: Hero Section & Interactive Telemetry Sandbox
- **Left Column (7 Cols — Value Narrative):**
  - **Eyebrow Badge:** `"PRECISION LIVESTOCK FARMING • IOT & COMPUTER VISION"` indicating system focus.
  - **Problem Statement Callout:** Explains heat stress thresholds in Thai crossbred dairy cattle (`THI 74 / 76 / 82` — Boonkum et al., 2011; 2024).
  - **Public Action CTA:** Contains a primary button redirecting to member authentication (`/login`) and a secondary smooth-scroll button focusing the simulator.
- **Right Column (5 Cols — Interactive Telemetry Sandbox):**
  - **Real-time NRC Formulation:** Executes reactive client-side computation for demonstration:
    $$\text{THI} = (1.8 \times T + 32) - (0.55 - 0.0055 \times \text{RH}) \times (1.8 \times T - 26)$$
  - **4 Quick Presets for Thai Scenarios (Sample Presets):**
    1. *Chiang Mai (Winter):* $24.0^\circ\text{C}$, $55\%\text{ RH}$ $\rightarrow$ **THI 70.8** (Normal $< 74$)
    2. *Watch Condition:* $27.5^\circ\text{C}$, $65\%\text{ RH}$ $\rightarrow$ **THI 75.1** (Mild $74\text{--}75.9$)
    3. *Moderate Stress:* $30.5^\circ\text{C}$, $65\%\text{ RH}$ $\rightarrow$ **THI 79.6** (Moderate $76\text{--}81.9$)
    4. *Severe Heat Stress:* $34.0^\circ\text{C}$, $70\%\text{ RH}$ $\rightarrow$ **THI 85.6** (Severe $\ge 82$)
  - **Continuous Color Gauge Bar:** A 4-color gradient bar with a smoothly positioned pointer (`transition: left 0.25s`) mapping the current value across a $60 \text{ -- } 95+$ scale.
  - **Cooling Advisory Output:** Follows the same humidity rule as `heatStress.js`: when $\text{RH} \ge 75\%$, advises avoiding fine misting and using brief direct cow wetting combined with high-airflow fans (Penn State Extension). Does not claim milk loss in kilograms.

### 4.2 Section 2: Scientific Signal Strip
- Anchors the platform's methodology with 4 key parameters:
  - **THI 74 / 76 / 82:** Daily-mean thresholds for Thai crossbred dairy cattle (Boonkum et al., 2011; 2024).
  - **22:00–06:00:** Night relief window where $\text{THI} < 74$ (the system's Thai-crossbred watch threshold) lets cows dissipate accumulated heat. The night-cooling idea is from Igono et al., 1992 (Holsteins, desert climate), which did not set the value 74.
  - **5-Min Buckets:** Unified sensor aggregation interval without gap interpolation (`heatMetrics.js`).
  - **3-Day Forecast:** Daily-mean THI forecast using Open-Meteo ECMWF adjusted by 3–14 day farm sensor median bias (`forecastService.js`).

### 4.3 Section 3: 3-Layer Architecture & Bento Matrix
- **Sense (Card 01 — Deep Forest `#24433A`):**
  - Details the hardware spec: **ESP32-S3 (v1.4.1) + SHT20 (XY-MD02)** sensor over RS485 Modbus RTU ($\pm 0.3^\circ\text{C} / \pm 3\%\text{ RH}$, $\text{THI} \pm 0.7$) and Dahua IP camera snapshot every 10 minutes.
  - **YOLO26m ONNX Vision Preview:** Displays the 4 posture classes counted by `best.onnx` with Class-Agnostic NMS (1 cow = 1 box):
    - `drinking`
    - `feeding`
    - `lying down`
    - `standing`
- **Recommend (Card 02 — Glass Card):**
  - Highlights the 3-day hybrid THI forecast (`hybrid-ecmwf-bias-v1`: Open-Meteo ECMWF + 3–14 day farm sensor bias, backtested over 354 days at Chiang Mai airport station WMO 48327 with MAE `0.69 / 0.78 / 0.88` vs 72h mean `1.10 / 1.38 / 1.56`) and farm-specific peak/cool windows.
- **Capitalize (Card 03 — Glass Card):**
  - Cooperative digital logbook on PostgreSQL / Supabase showing honest data completeness (`coverage_pct`), night relief hours, and consecutive stress days.

### 4.4 Section 4: 3-Day Forecast & Thermal Accumulation Pipeline
- **Inverted Dark Mode (`#19362E`):** Distinct visual contrast for technical architecture.
- **Node-Based Model Flow Diagram:**
  - *Inputs:* SHT20 Barn Telemetry (3–14 Days) + Open-Meteo ECMWF Hourly Forecast.
  - *Core:* Per-horizon median bias correction (`hybrid-ecmwf-bias-v1`) and 5-minute bucketed THI metrics.
  - *Outputs:* 3-Day Daily-Mean THI Forecast, Farm Peak/Cool Windows, and Humidity-Aware Cooling Advice.

### 4.5 Section 5: Cooperative Digital Logbook Preview
- **Interactive Sample Logbook Card (Explicitly Labeled as Sample Data):**
  - Displays sample weekly average THI, stress hours, night relief hours, and recording completeness (`coverage_pct`), without unverified certification badges or milk-loss promises.

### 4.6 Section 6: Academic Foundation & Verified Citations
- Quotes verified dairy science references used in `heatStress.js`:
  1. **NRC (1971):** Standard Temperature-Humidity Index (THI) equation.
  2. **Sae-tiao et al. (2019, LRRD 31(12)):** Application of the NRC (1971) equation in Thai dairy cattle studies.
  3. **Boonkum et al. (2011, J. Dairy Sci. 94:487; 2024, Animals 14(20):3026):** Thai-Holstein daily-mean THI thresholds (`74 / 76 / 82`) and effects on milk yield and conception rate.
  4. **Igono et al. (1992, Int. J. Biometeorol. 36:77–87) & Penn State Extension:** Importance of nighttime cooling (74 is the system threshold, not from Igono) and direct wetting + fan ventilation under high humidity.

### 4.7 Section 7: Final Conversion CTA & Footer
- A clean closing block driving visitors to `/login` or internal documentation anchors (`#solution`), completed with `<AppFooter />`.

---

## 5. Security & Access Segregation Architecture

1. **Public Surface Neutrality:**
   - All direct hyperlinks and mentions of `/Admin` ("Command Center") have been removed from the public landing page.
   - Any external visitor seeking system entry is directed to `/login`.
2. **Layout Route Guard (`layouts/admin.vue`):**
   - Enforces an automated client-side check on `onMounted` alongside backend `verifyToken` + `requireRole('admin')`:
   - If `localStorage.getItem('token')` is missing or the user's role is not `'admin'`, access is rejected and redirected to `/login`.

---

## 6. Performance & Motion Engineering

- **Native `IntersectionObserver`:** Scans `.reveal` elements with a threshold of `0.12` and activates the `.is-visible` state.
- **Hardware Acceleration:** Transition animations utilize `translate3d(0, 0, 0)` with `will-change: opacity, transform`.
- **Accessibility (`prefers-reduced-motion`):** Includes a global media query neutralizing animation durations to `0.01ms` for users with vestibular sensitivities.
- **History Scroll Restoration:** Sets `history.scrollRestoration = 'manual'` and forces `window.scrollTo(0, 0)` on load.
