# Comprehensive Design & UI/UX Architectural Specification of `pages/index.vue`
**System:** CowCare AI (Heat Stress Intelligence for Dairy Farms)  
**Author:** Senior Frontend & UI/UX Architect  
**Document Status:** Approved Production Specification (v2.1)  
**Date:** October 14, 2026  

---

## 1. Executive Overview & Design Intent

The public-facing `pages/index.vue` serves as the primary digital gateway for **CowCare AI**. It is architected not merely as a marketing landing page, but as an **Enterprise-Grade Agritech Product Showcase & Interactive Sandbox**.

### Core Objectives:
1. **Evidence-Based Storytelling:** Shift the narrative of tropical smallholder dairy management from **"Reactive" (waiting for milk drop after 5 days)** to **"Proactive" (3–7 day AI early warnings)**.
2. **Interactive Scientific Verification:** Provide farmers and agritech evaluators with a real-time sandbox that models the **National Research Council (NRC, 1971)** heat stress equations using Thai-Holstein biological thresholds ($\text{THI } 76.0$).
3. **Zero Administrative Exposure:** Ensure public users have access to educational, simulator, and general member login flows (`/login`), while strictly segregating administrative management surfaces (`/Admin`) behind rigorous authentication guards.

---

## 2. Visual Identity & Design Tokens (Biophilic Agritech System)

The visual design is grounded in the **Biophilic Agritech Design System**, balancing biological warmth with precision industrial engineering.

### Color Palette & Semantic Tokens

| Design Token | Hex Code | Semantic Role | Psychological / Functional Impact |
|---|---|---|---|
| **Warm Ivory Canvas** | `#FFFDF7` | Global Page Background | Replaces stark `#FFFFFF` glare with an organic, tactile tone that reduces eye strain in outdoor agricultural environments. |
| **Deep Forest Green** | `#24433A` / `#163026` | Primary Brand & Structure | Represents ecological balance, vitality, and enterprise reliability. |
| **Deep Night Forest** | `#19362E` | High-Tech Section Accent | Inverted background for Section 4 (Predictive AI) to signal computational depth. |
| **Terracotta Amber** | `#D87939` / `#F2BD7C` | Primary Action / Accent | Evokes thermal energy, critical inflection points, and predictive chart lines. |
| **Comfort Zone** | `#10B981` (Bg `#ECFDF5`) | $\text{THI} < 76.0$ | Optimal bovine thermal comfort, standard milk yield, and zero heat load. |
| **Mild Stress** | `#F59E0B` (Bg `#FFFBEB`) | $\text{THI } 76.0 - 79.9$ | Critical onset threshold; initiation of milk drop ($-0.28\text{ kg/THI}$). |
| **Moderate Stress** | `#EA580C` (Bg `#FFF7ED`) | $\text{THI } 80.0 - 83.9$ | Elevated somatic cell count; doubling of milk loss ($-0.56\text{ kg/day}$). |
| **Severe Heat Stress**| `#E11D48` (Bg `#FFF1F2`) | $\text{THI} \ge 84.0$ | Emergency heat load; risk of embryonic death and acidosis ($\text{FPR} < 1.2$). |

### Typographic System
- **Type Family:** `'Noto Sans Thai', 'Inter', -apple-system, sans-serif` for high legibility across bilingual Thai/English scientific copy.
- **Tabular Numerals (`tabular-nums`):** Enforced across all sensor readouts, sliders, and telemetry counters to prevent jitter and layout shifts during dynamic calculation.
- **Fluid Type Scaling:** Headings leverage CSS `clamp()` (e.g., `clamp(2rem, 5vw, 3.4rem)`) for continuous responsive scaling across mobile, tablet, and widescreen monitors.

---

## 3. Structural Decomposition of the 7 Key Sections

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Hero Section & Interactive Sandbox (Split Grid 7 : 5 Columns)       │
│    ├── Value Proposition, Eyebrow & Public Action CTAs (/login)        │
│    └── Real-time NRC 1971 Calculator, 4 Thai Presets, Continuous Gauge │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Scientific Signal Strip (Deep Green Banner #24433A)                 │
│    ├── THI 76.0 (Onset)         ├── 5 Days (Lag Effect)                │
│    ├── 14 Days (Lookback)       └── 3–7 Days (Proactive Horizon)       │
├────────────────────────────────────────────────────────────────────────┤
│ 3. 3-Layer Architecture & Bento Feature Matrix (Sense → Rec → Cap)     │
│    ├── Card 01: SENSE (ESP32-S3 + SHT40 + YOLO26m Edge Vision Mockup)  │
│    ├── Card 02: RECOMMEND (LSTM Time-Series + Gemini LINE Advisory)    │
│    └── Card 03: CAPITALIZE (Digital Logbook + ESG Green Credit)        │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Predictive Analytics & LSTM Brain Engine (Dark Night Forest #19362E)│
│    ├── Node-Based Architecture Flow: Inputs → LSTM Brain → Outputs     │
│    └── Comparative Bento: Reactive (Traditional) vs Proactive (CowCare)│
├────────────────────────────────────────────────────────────────────────┤
│ 5. Digital Logbook & ESG Preview (Bridging the Digital Divide)         │
│    ├── Thai Smallholder Barn Realities & 17.5% Methane Reduction       │
│    └── Mockup Digital Logbook Card with 7-Day Dynamic SVG Sparkline    │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Academic Foundation & Peer-Reviewed Citation Matrix (2022–2026)     │
│    ├── Boonkum et al. (2024)    ├── Hasan et al. (2026)                │
│    ├── Onan-Martinez (2026)     └── Mulajkar & Abdourhamane (2026)     │
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
  - **Pulsing Eyebrow Badge:** `"PRECISION LIVESTOCK FARMING • MULTIMODAL AI"` indicating live technology status.
  - **Problem Statement Callout:** Highlights the urgency that Thai crossbred cows experience $\text{THI} \ge 76.0$ for **250 days per year (67% of the annual cycle)**.
  - **Public Action CTA:** Contains a primary button redirecting to member authentication (`/login`) and a secondary smooth-scroll button focusing the simulator.
- **Right Column (5 Cols — Interactive Telemetry Sandbox):**
  - **Real-time NRC Formulation:** Executes reactive client-side computation:
    $$\text{THI} = (1.8 \times T + 32) - (0.55 - 0.0055 \times \text{RH}) \times (1.8 \times T - 26)$$
  - **4 Quick Presets for Thai Regional Scenarios:**
    1. *Chiang Mai (Winter):* $24.0^\circ\text{C}, 55\% \text{ RH} \rightarrow \text{THI } 70.8$ (Comfort)
    2. *Saraburi (Summer):* $34.0^\circ\text{C}, 60\% \text{ RH} \rightarrow \text{THI } 83.8$ (Moderate)
    3. *Pak Chong / Korat (Rainy Season):* $31.5^\circ\text{C}, 82\% \text{ RH} \rightarrow \text{THI } 85.2$ (Severe)
    4. *Heatwave Crisis:* $36.5^\circ\text{C}, 78\% \text{ RH} \rightarrow \text{THI } 92.5$ (Extreme Severe)
  - **Continuous Color Gauge Bar:** A 4-color gradient bar with a smoothly positioned pointer (`transition: left 0.25s`) mapping the current value across a $60 - 95+$ scale.
  - **Immediate Impact & Advisory Output:** Calculates live milk loss rates (e.g. $-0.28\text{ to } -0.42\text{ kg/THI}$), subclinical acidosis risk ($\text{FPR} < 1.2$), and enteric methane spikes ($+17.5\%$), paired with immediate mitigation instructions (fans, mist sprayers, Sodium Bicarbonate buffers).

### 4.2 Section 2: Scientific Signal Strip
- Anchors the platform's credibility with 4 responsive metrics:
  - **`THI 76.0`:** Physiological onset threshold in tropical crossbred cattle.
  - **`5 Days`:** Biological lag effect before milk production bottoms out.
  - **`14 Days`:** Historical lookback window for thermal accumulation analysis.
  - **`3–7 Days`:** Lead time horizon for proactive intervention.

### 4.3 Section 3: 3-Layer Architecture & Bento Matrix
- **Sense (Card 01 — Deep Forest `#24433A`):**
  - Details the industrial hardware spec: **ESP32-S3 (N16R8)** + **SHT40** sensor over **RS485 Modbus RTU**.
  - **YOLO26m Edge Vision Viewfinder:** A simulated real-time camera interface running the project's actual fine-tuned `YOLO26m` model (`best1.pt`), displaying the 4 core bovine behavior classes:
    - `standing` (94.2% confidence)
    - `lying down` (91.8% confidence)
    - `drinking` (89.4% confidence)
    - `feeding` (88.5% confidence)
- **Recommend (Card 02 — Glass Card):**
  - Highlights LSTM time-series modeling coupled with **Context-Aware Gemini GenAI** translating telemetry into farmer-friendly Thai alerts via **LINE Messaging API**.
- **Capitalize (Card 03 — Glass Card):**
  - Bridges technical data to financial incentives: Digital Logbooks on PostgreSQL / Supabase, ESG compliance, and parametric weather index insurance.

### 4.4 Section 4: Predictive Analytics & LSTM Brain Engine
- **Inverted Dark Mode (`#19362E`):** Distinct aesthetic shift for deep-learning concepts.
- **Node-Based Model Flow Diagram:**
  - *Inputs:* SHT40 Microclimate Signals + 14-Day Accumulation + YOLO26m Behavioral Vectors.
  - *Brain Core:* LSTM Neural Network displaying **96.08% Validation Accuracy**.
  - *Outputs:* 3–7 Day THI Trajectory, Milk Loss Prevention, and LINE Broadcasts.
- **Comparative Analysis Matrix:** Side-by-side comparison illustrating why traditional reactive responses fail due to the 5-day lag effect, contrasted with CowCare AI's proactive preemptive cooling.

### 4.5 Section 5: Digital Logbook & ESG Preview
- **Digital Divide Context:** Explains that 80%+ of Thai smallholders operate low 2.7m barns with heat-radiating zinc roofs and lack the capital for expensive wearable sensors.
- **Interactive Mockup Logbook Card:**
  - Weekly Average THI ($74.8$), Cumulative Heat Hours ($12.5\text{ hrs}$), and Transmission Completeness ($98.4\%$).
  - **Custom 7-Day SVG Sparkline:** Vector-drawn line graph plotting weekly thermal trajectory with an active dashed reference line at the critical $\text{THI } 76.0$ mark and a highlighted Friday peak.

### 4.6 Section 6: Academic Foundation & Peer-Reviewed Citations
- Bento grid quoting 4 international peer-reviewed papers (2022–2026):
  1. *Boonkum et al. (2024, Animals):* Thai-Holstein THI 76 threshold and milk/conception rate degradation.
  2. *Hasan et al. (2026, Comput. Electron. Agric.):* Discovery of the 5-day lag effect across 82,000+ cattle.
  3. *Onan-Martinez et al. (2026, J. Dairy Sci.):* Documentation of $+17.5\%$ methane emission intensity under thermal stress.
  4. *Mulajkar et al. & Abdourhamane (2026):* Edge AI fusion and 14-day LSTM forecasting performance.

### 4.7 Section 7: Final Conversion CTA & Footer
- A clean, cohesive closing block driving visitors to `/login` or internal documentation anchors (`#solution`), completed with `<AppFooter />`.

---

## 5. Security & Access Segregation Architecture

In response to strict security and authorization requirements:
1. **Public Surface Neutrality:**
   - All direct hyperlinks and mentions of `/Admin` ("Command Center") have been completely removed from the public landing page.
   - Any external visitor seeking system entry is directed strictly to `/login`.
2. **Layout Route Guard (`layouts/admin.vue`):**
   - Enforces an automated client-side check on `onMounted`:
     - If `localStorage.getItem('token')` is missing $\rightarrow$ immediate redirection to `/login`.
     - If the authenticated user's role is not `'admin'` (e.g. general member, farmer) $\rightarrow$ access is rejected and redirected to `/login`.
3. **Foundation for Upcoming User Portal:**
   - Prepares the groundwork for the upcoming User Interface (`/user`), ensuring that `/login` serves as the centralized, role-based traffic controller.

---

## 6. Performance & Motion Engineering

- **Native IntersectionObserver:** Replaces heavy third-party scroll libraries. Scans `.reveal` elements with a threshold of `0.12` and activates the `.is-visible` state.
- **Hardware Acceleration:** All transition animations utilize `translate3d(0, 0, 0)` with `will-change: opacity, transform` to ensure smooth 60fps rendering on mobile devices.
- **Accessibility (`prefers-reduced-motion`):** Includes a global media query neutralizing animation durations to `0.01ms` for users with vestibular sensitivities.
- **History Scroll Restoration:** Sets `history.scrollRestoration = 'manual'` and forces `window.scrollTo(0, 0)` on load to guarantee predictable layout rendering upon browser refreshes.
