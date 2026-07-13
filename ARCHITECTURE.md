# MTC Analytics — Arquitectura frontend

Estructura actual tras la extracción post-monolito. `src/main.jsx` sigue siendo el shell de la app (auth, routing por tabs, Firestore, páginas no extraídas).

## `src/lib/` — Helpers puros

Sin React. Lógica reutilizable y testeable.

| Módulo | Responsabilidad |
|--------|-----------------|
| `dateUtils.js` | Fechas operativas NY, rollover 17:00, `tradingDayKey`, normalización de fechas |
| `formatUtils.js` | Dinero, %, R, labels de UI y share |
| `tradeUtils.js` | Normalización de trades, arrays, CSV import, cuentas, sanitización Firestore |
| `analyticsUtils.js` | KPIs, calendario por día, behavior score, stats diarias |
| `operationalState.js` | Estado operativo unificado (`ready` / `caution` / `blocked`) — Sprint 05 |
| `emotionIntelligence.js` | Capa emocional: emoción ↔ conducta ↔ R/riesgo + directivas — Sprint 06 |
| `onboardingState.js` | Activación first-run / progreso hacia diagnóstico (10 trades) — Sprint 08 |
| `importExportUtils.js` | Export/import JSON y CSV de trades |
| `sharePngUtils.js` | Render canvas 9:16, normalización para share, descarga/compartir PNG |

## `src/components/dashboard/` — Centro de control

Componentes del tab Dashboard. Datos y cálculos pesados vienen de `main.jsx` + `lib/`.

| Archivo | Rol |
|---------|-----|
| `DashboardHero.jsx` | Centro de decisión diario (cuenta / sesión / foco) — no repite título del topbar |
| `DashboardCockpitPanel.jsx` | Cockpit operativo: estado + razón + pulso (Sprint 07) |
| `DashboardActionCard.jsx` | Próxima acción (1 directiva) |
| `DashboardRiskSnapshot.jsx` | Snapshot compacto de límites / R / checklist |
| `DashboardBehaviorSignal.jsx` | Señal emocional/conductual principal |
| `DashboardKpiStrip.jsx` + `DashboardKpiCard.jsx` | KPIs ejecutivos (secundarios) |
| `TradingCalendarPanel.jsx` | Calendario mensual / heatmap preview |
| `DashboardRightRail.jsx` | Próxima acción legacy, disciplina, riesgo, equity |
| `DashboardAdvancedInsights.jsx` | Score, curva P/L, heatmap sesiones |
| `MtcScoreCard.jsx`, `PnlCumulativeChartCard.jsx`, `OperationalHeatmap.jsx` | Bloques de insights |
| `MtcLightweightLineChart.jsx` | Gráficos lightweight-charts |
| `ResetTicker.jsx` | Countdown rollover NY |
| `dashboardUtils.js` | Curva diaria, heatmap operativo, utilidades locales |

## `src/components/onboarding/` — Activación first-run

| Archivo | Rol |
|---------|-----|
| `FirstRunPanel.jsx` | Panel de activación (hero / compact) en Dashboard |
| `OnboardingProgress.jsx` | Steps visuales del progreso de activación |

## `src/components/journal/` — Journal operativo

Layout y acciones del tab Journal. Estado de fecha, filtros y modales vive en `Journal()` dentro de `main.jsx`.

| Archivo | Rol |
|---------|-----|
| `JournalHeader.jsx` | FAB mobile + alerta modo reflexión |
| `JournalActions.jsx` | Cuenta, filtros checklist, búsqueda |
| `JournalMainGrid.jsx` | Grid principal (plan + trades + calendario) |
| `JournalDailyPlanSection.jsx` | Wrapper del panel de jornada |
| `JournalTradesList.jsx` + `JournalTradeRow.jsx` | Lista de trades del día |
| `JournalCalendarCard.jsx` | Calendario lateral de jornadas |
| `JournalToolsCard.jsx` | Export, import CSV, compartir día |

## `src/components/trade/` — Formulario y detalle

Pipeline de guardado desacoplado del layout del journal.

| Archivo | Rol |
|---------|-----|
| `TradeForm.jsx` | UI crear/editar trade (normal + checklist rápido) |
| `TradeDetailModal.jsx` | Modal de detalle con export y share |
| `TradeFormField.jsx`, `TradeTextarea.jsx` | Campos reutilizables |
| `MentorReviewRequest.jsx` | Solicitud de revisión mentor |
| `TraderBehaviorReviewFields.jsx` / `TraderBehaviorReviewDetail.jsx` | Revisión de conducta |
| `tradeFormConstants.js` | Opciones y enums del formulario |
| `tradeFormState.js` | Handler de cambios (fecha, R auto, etc.) |
| `tradePayload.js` | Payload numérico + patch mentor review |
| `tradeSavePipeline.js` | Validación, persistencia Firestore |

## `src/components/share/` — PNG 9:16

| Archivo | Rol |
|---------|-----|
| `SharePreviewModal.jsx` | Preview, descarga y share nativo |
| `TradeShareModal.jsx` | Share de revisión de un trade |
| `DailyReviewShareModal.jsx` | Share de resumen del día |

Motor de render en `src/lib/sharePngUtils.js`.

## `src/components/ui/` — Primitivos

| Archivo | Rol |
|---------|-----|
| `Card.jsx` | Contenedor card usado en dashboard, journal y trade |

## Flujo de datos (resumen)

```
main.jsx (App, tabs, Firestore)
  ├── Dashboard → components/dashboard/*
  ├── Journal → components/journal/* + TradeForm + TradeDetailModal + share modals
  └── lib/* (helpers compartidos)
```

---

## CSS Design System — Fase 2B (`src/styles.css`)

**Estado:** monolito seccionado (tokens Aurora + RETIRED stubs + EOF canónico). Ver **`CSS_AURORA_AUDIT.md`** + **`APP_STABILITY_AUDIT.md`**.

### Fuente de verdad canónica (gana por orden de cascada)

| Dominio | Bloque | Notas |
|---------|--------|-------|
| Tokens | `AURORA DESIGN TOKENS — SOURCE OF TRUTH` | Dark + light; aliases `--bg/--panel/--text` |
| Dark app skin | `AURORA DARK SYSTEM v20` | Authenticated dark |
| **Mobile shell** | **MOBILE — CANONICAL (EOF)** | Document scroll; sin `body:fixed` |
| **Mobile nav** | **`.mobileCommandOverlay` + `.mobileCommandSheet`** | Hamburger + sheet; sin dock |
| Bottom dock | **RETIRED** | Geometry purged; kill switch + var lock = 0 |

### Contratos de estabilidad (resumen)

1. **Scroll** — Mobile: documento. Desktop: shell actual. No `body:fixed` salvo overlay. `--app-height` no dimensiona shell/main.
2. **Nav** — Sin `.mobileBottomNav` / `.mobileNavDock`. Solo command sheet.
3. **Theme** — Light canvas `#F7F8FB`; ningún fill negro fuera de cards/sheets.
4. **Modals** — Una overlay + una superficie. Body lock solo mientras abierto.
5. **CSS** — No nuevos bloques FINAL gigantes. Legacy → delete o RETIRED stub. Guardrails al EOF.

### Aurora Mobile — post dock

| Concepto | Valor |
|----------|-------|
| Nav mobile | Topbar hamburger → `MobileNav` command sheet |
| Scroll container | Documento (`body`), no `.main.appMain` overflow |
| Viewport JS | `initMobileViewportManager()` — sin `visualViewport.scroll`; dock gap = 0 |
| `--app-height` | Auxiliar (sheet max-height); **no** height lock de shell |
| Dock classes | Purged mid-file + kill switch; residual = exclusions / comments |

### Tokens Aurora (oficial)

```css
/* Dark */
--aurora-canvas / --aurora-bg: #07050D
--aurora-shell: #0B0812
--aurora-surface / --aurora-surface-2
--aurora-text / --aurora-text-soft / --aurora-text-muted
--aurora-cyan: #33E6C4
--aurora-violet: #7C5CFF
--aurora-magenta: #FF4FA3
--aurora-brand-gold: #D4A63A   /* brand only — not action */

/* Light */
--aurora-canvas / --aurora-bg: #F7F8FB
--aurora-text: #07111F
--shadow-soft / --shadow-elevated (light-tuned)
```

### Próximos pasos (CSS hygiene — no features)

1. Extraer `paywall.css` / `analytics.css`
2. Seguir bajando `!important` en capas no canónicas
3. Consolidar `@media 860px` fragmentados
4. Migrar `.primary` global → botones Aurora scoped (JSX)

---

## Sprint 05 — OperationalState

Capa pura de **estado operativo unificado** para el bloque Cockpit.

### Propósito

Responder en &lt;60s: ¿el trader está **apto**, en **precaución** o **bloqueado** para operar ahora?

Combina de forma defensiva: riesgo diario/semanal, drawdown, trades del día, pérdida reciente, checklist incompleto, señales emocionales (si existen) y reglas configurables (si existen).

Módulo: `src/lib/operationalState.js`  
API principal: `buildOperationalState(input)`

Función pura: sin DOM, sin Firebase, sin side effects, sin mutar `trades`.

### Input esperado

```js
buildOperationalState({
  trades,            // array de trades (opcional)
  riskSettings,      // límites Risk Lab / local settings (opcional)
  checklistState,    // { complete, required, missing, attemptingToOperate, score, finalGreen }
  emotionalState,    // { anxiety, recoveryImpulse, clarity, dominantState, emotionalRisk }
  account,           // { capital | initialBalance | accountCapital }
  dailyPlan,         // { maxRisk } opcional — alinea con plan diario
  now,               // Date | ISO | ms — default: ahora
  dayKey             // override jornada operativa (YYYY-MM-DD)
})
```

Aliases tolerados: `settings`/`risk`, `checklist`, `emotion`/`journalEmotional`, y desde Sprint 06 `emotionSignals` / `emotionalSignals`.

### Output esperado

```js
{
  status: "ready" | "caution" | "blocked",
  label: "Apto" | "Precaución" | "Bloqueado",
  severity: "success" | "warning" | "danger",
  score: number,              // 0–100, orientación cockpit
  summary: string,            // lectura ejecutiva
  primaryReason: string,
  reasons: [{ code, level, title, detail, metric?, action? }],
  actions: [{ type, label, detail }],
  inputs: {
    dailyPnl, weeklyPnl, dailyR, weeklyR,
    tradesToday, maxTradesPerDay,
    dailyLossLimitHit, weeklyLossLimitHit, drawdownLimitHit,
    recentLoss, checklistComplete, emotionalRisk
  }
}
```

Helpers exportados: `normalizeOperationalInputs`, `evaluateRiskLimits`, `evaluateChecklistRisk`, `evaluateEmotionalRisk`, `buildOperationalReasons`, `buildOperationalActions`, `weekStartFromDayKey`, constantes `OPERATIONAL_*`.

### Reglas ready / caution / blocked

**BLOCKED** si:
- límite diario alcanzado ($ o R)
- límite semanal alcanzado ($ o R)
- drawdown máximo de jornada alcanzado
- max trades por día alcanzado
- checklist requerido incompleto **y** `attemptingToOperate`
- pérdida reciente + ansiedad alta / impulso de recuperación
- riesgo emocional `high`

**CAUTION** si (y no hay bloqueo):
- pérdida reciente sin límite alcanzado
- checklist incompleto (no obligatorio / sin intento de operar)
- ansiedad moderada (`medium`)
- `tradesToday` cerca del máximo
- pérdida diaria parcial relevante (≥50% del límite)
- conducta riesgosa en trades del día

**READY** si:
- sin límites alcanzados
- checklist completo o no requerido / desconocido
- riesgo emocional low/unknown
- trades dentro del plan
- sin pérdida reciente relevante

### Defaults

| Clave | Default |
|-------|---------|
| `maxTradesPerDay` | `1` (o `maxTradesDay` / settings) |
| `dailyLossLimitR` | `-1` |
| `weeklyLossLimitR` | `-3` |
| `maxDrawdownPct` | `5` (si no hay settings) |
| money limits | desde `maxDailyLoss` / `maxWeeklyLoss` / plan `maxRisk` si existen |
| `emotionalHighRiskThreshold` | `7/10` |
| ventana pérdida reciente | trades de la jornada operativa actual |

### Datos faltantes

- Input vacío / parcial no lanza.
- Sin checklist → se asume completo, reason `incomplete_data` si no hay otras señales.
- Sin emoción → `emotionalRisk: "unknown"` (no bloquea solo por unknown).
- Error interno → fallback `caution` suave con reason `incomplete_data`.

### Consumidores posteriores (Cockpit)

| Módulo | Uso previsto |
|--------|----------------|
| **Dashboard** | Badge / rail de estado operativo (apto / precaución / bloqueado) — **integrado en Sprint 07** |
| **Analytics** | Contexto de confiabilidad + filtro de decisión (no ranking P/L) |
| **Risk Lab** | Sustituir/enriquecer `evaluateRiskGuard` gate visual |
| **Checklist** | Gate pre-ejecución + razón `complete-checklist` |
| **Journal Emocional** | Señales anxiety / recovery → emotionalRisk |

Sprint 05 **no** integra UI: solo la capa pura + contrato documentado.

---

## Sprint 06 — Emotion Intelligence Layer

Capa pura que conecta **estado emocional + conducta** con ejecución, riesgo operativo y directivas. No diagnostica salud mental: solo señales operativas de performance.

### Propósito

Responder en &lt;60s (cuando haya muestra):

1. ¿Qué estado emocional está afectando la ejecución?
2. ¿Qué emoción/conducta reduce el R promedio?
3. ¿Qué patrón aparece después de una pérdida?
4. ¿Qué combinación emocional aumenta riesgo operativo?
5. ¿Qué directiva emocional recibir esta semana?

Módulo: `src/lib/emotionIntelligence.js`  
API principal: `buildEmotionIntelligence(input)`

Función pura: sin DOM, sin Firebase, sin side effects, sin mutar inputs. Sin rediseño de Dashboard/Analytics/UI.

### Inputs

```js
buildEmotionIntelligence({
  trades,              // trades con emotionBefore / anxiety / followedPlan / pnl / R
  emotionalJournals,   // cierres: mood, anxietyLevel, confidenceLevel, feltRevengeImpulse, feltFomo…
  checklistEntries,    // opcional: complete / score / finalGreen
  now,                 // Date | ISO | ms
  options              // { recentLoss?, anxietyHigh?, minCompareGroup? }
})
```

Aliases: `journals` / `emotional`, `checklists`.

### Output

```js
{
  status: "stable" | "watch" | "risk" | "unknown",
  label, severity, score,
  summary, primaryPattern, primaryRisk,
  emotionalProfile: { dominantState, bestState, worstState, avgAnxiety, avgClarity, avgConfidence, avgRecoveryImpulse, sampleSize },
  performanceByEmotion: [{ emotion, trades, pnl, avgR, winrate, planCompliance, riskLevel, insight }],
  behaviorSignals: {
    anxietyDrag, recoveryRisk, postLossRisk, fomoRisk,
    fatigueRisk, hesitationRisk, planBreakRisk, checklistMismatch
  },
  directives: [{ type: "protect"|"reduce"|"repeat"|"investigate", title, reason, metric, action, confidence }],
  operationalSignals: {
    emotionalRisk: "low"|"medium"|"high"|"unknown",
    anxiety, recoveryImpulse, clarity, dominantState, recentEmotionalState,
    postLossProtocolRequired, shouldBlockTrading, shouldReduceRisk, reason
  },
  sample: { tradesWithEmotion, journalEntries, quality, message, progressPct, total }
}
```

### Helpers

| Helper | Rol |
|--------|-----|
| `normalizeEmotionRecord` | Shape único trade/journal/checklist; labels emocionales consistentes |
| `normalizeEmotionLabel` / `normalizeScale10` | Emoción + escalas 1–10 |
| `buildEmotionSample` | empty / insufficient / observing / usable / reliable |
| `buildPerformanceByEmotion` | R, winrate, plan por emoción |
| `detectAnxietyDrag` | Ansiedad alta vs resto (R / plan) |
| `detectRecoveryRisk` | Recovery alto + post-pérdida / clustering |
| `detectPostLossRisk` | Deterioro tras pérdida |
| `detectFomoRisk` / `detectFatigueRisk` / `detectHesitationRisk` | Señales conductuales |
| `detectPlanBreakRisk` / `detectChecklistMismatch` | Plan/checklist + emoción |
| `buildEmotionDirectives` | protect / reduce / repeat / investigate |
| `buildOperationalEmotionSignals` | Señal compacta para Sprint 05 |

### Muestra emocional

| Registros emocionales | quality |
|----------------------|---------|
| 0 | `empty` |
| 1–4 | `insufficient` |
| 5–9 | `observing` |
| 10–19 | `usable` |
| 20+ | `reliable` |

Con poca muestra: lenguaje de hipótesis (“Señal en observación”, “Aún no confirmado”). Nunca inventa emociones sin datos.

### Conexión con Sprint 05 (`buildOperationalState`)

`operationalSignals` (o el objeto equivalente) se puede pasar como:

- `emotionSignals` (preferido), o
- `emotionalSignals` / `emotionalState`

**Contrato actual vs histórico (hotfix Sprint 07):**

| Campo | Rol |
|-------|-----|
| `behaviorSignals`, `directives`, `performanceByEmotion` | Analítico / histórico — **no** bloquean cockpit |
| `operationalSignals` | Solo jornada actual (`isCurrent`, `source`, `sourceDate`) |

`buildOperationalEmotionSignals` **no** cae a journals/trades de días previos. Sin check-in de hoy → `isCurrent: false`, `emotionalRisk: "unknown"`, `shouldBlockTrading: false`.

Reglas de gate (solo si `isCurrent === true` / señal conocida):

| Señal | Efecto |
|-------|--------|
| `shouldBlockTrading === true` | `blocked` |
| `postLossProtocolRequired === true` | `blocked` |
| `emotionalRisk === "high"` | `blocked` |
| `anxiety >= 7` + pérdida **de hoy** | `blocked` |
| `recoveryImpulse` alto + pérdida **de hoy** | `blocked` |
| `shouldReduceRisk === true` | `caution` |
| `clarity <= 4` | `caution` |

Sin emoción actual → `emotionalRisk: "unknown"` (no bloquea). `buildOperationalState` ignora payloads con `isCurrent: false`.

### Consumidores posteriores

| Módulo | Uso previsto |
|--------|----------------|
| **OperationalState** | Gate apto / precaución / bloqueado enriquecido |
| **Dashboard Cockpit** | Badge + patrón emocional dominante — **integrado en Sprint 07** |
| **Analytics Intelligence** | performanceByEmotion + directivas |
| **Risk Lab** | shouldReduceRisk / shouldBlockTrading |
| **Journal Emocional** | primaryPattern + progreso de muestra |

### Limitaciones

- No es diagnóstico clínico ni terapéutico.
- Solo señales operativas de mesa de riesgo/performance.
- Sprint 06 **no** integra UI/CSS/Firebase: capa pura + contrato + wire mínimo a OperationalState.
- Hotfix: señales históricas no pueden bloquear el estado operativo del día.

---

## Sprint 07 — Dashboard Cockpit

Transforma el tab Dashboard en un **cockpit operativo**: estado → razón → acción → emoción → riesgo, con KPIs y calendario como soporte.

### Propósito

En &lt;60s el trader ve:

1. Estado operativo: Apto / Precaución / Bloqueado
2. Razón principal
3. Acción inmediata (una directiva)
4. Señal emocional/conductual relevante (o vacío seguro)
5. Riesgo / límites actuales
6. KPIs + calendario debajo (no protagonistas)

### Componentes creados

| Archivo | Rol |
|---------|-----|
| `DashboardCockpitPanel.jsx` | Panel superior + badge + pulso + grid |
| `DashboardActionCard.jsx` | Próxima acción desde `operationalState.actions[0]` |
| `DashboardRiskSnapshot.jsx` | trades hoy, R diario/semanal, hard stop, checklist, riesgo emocional |
| `DashboardBehaviorSignal.jsx` | primaryRisk / patrón / empty state emocional |

Wire en `Dashboard()` (`src/main.jsx`). CSS en sección `DASHBOARD — OPERATIVE COCKPIT` de `styles.css` (sin tocar EOF / mobile nav).

### Cálculo en Dashboard

Ambos motores se calculan con `useMemo` dentro de `Dashboard()`:

```js
emotionIntelligence = buildEmotionIntelligence({
  trades: filtered,                 // cuenta activa
  emotionalJournals,
  checklistEntries: checklists,
  now: new Date()
})

// Solo señales con isCurrent === true alimentan el gate.
currentEmotionSignals = emotionIntelligence.operationalSignals.isCurrent
  ? emotionIntelligence.operationalSignals
  : { emotionalRisk: 'unknown', isCurrent: false, shouldBlockTrading: false, ... }

operationalState = buildOperationalState({
  trades: filtered,
  riskSettings,                     // localStorage + defaults
  checklistState,                   // derivado de última checklist
  emotionSignals: currentEmotionSignals,
  account: { capital, name },
  dailyPlan,
  now: new Date()
})
```

Fallback UI: `FALLBACK_OPERATIONAL_STATE` (`caution` suave) si falta output o hay excepciones. Sin journals emocionales **de hoy** → Emotion Intelligence `operationalSignals.isCurrent: false`; OperationalState no bloquea por emoción histórica.

### Hotfix — Current Operational Context

Bloqueo emocional solo con evidencia de la jornada actual (check-in de hoy, pérdida de hoy + ansiedad/recovery altos, checklist de hoy incompleto + emoción elevada). Patrones históricos quedan en `behaviorSignals` / Analytics, no en el badge Apto/Precaución/Bloqueado.

### Orden visual

1. `DashboardHero` — centro de decisión diario (cuenta / sesión / foco)
2. **Cockpit** (`DashboardCockpitPanel` → lectura operativa actual + acción + riesgo + señal)
3. KPI strip (secundario)
4. Calendario + right rail + insights (evidencia)

Jerarquía de copy: topbar “Dashboard principal” ≠ hero “Centro de decisión diario” ≠ cockpit “Lectura operativa actual”.

Mobile ≤390: stack vertical — Cockpit → acción → riesgo → señal → KPIs → calendario. Sin overflow horizontal; menú hamburguesa / command sheet intactos.

### Reglas de copy

Tono cockpit (apto / precaución / bloqueado / completar checklist / señal en observación). Sin coach motivacional ni lenguaje clínico.

### Limitaciones

- No reescribe shell, nav mobile, Firebase, Auth, Pricing, Journal save ni Analytics UI.
- Right rail legacy se conserva (disciplina / equity); la directiva primaria vive en el Cockpit.
- Sprint 07 no cambia reglas de Sprint 05/06; solo las consume.

---

## Sprint 08 — First-run / Onboarding Activation

Guía de activación para que un usuario con 0 trades no vea una plataforma vacía: entiende qué cargar primero, qué se desbloquea y el progreso hacia Decision Intelligence.

### Propósito

En &lt;60s el trader nuevo sabe:

1. Qué hacer ahora (CTA primario)
2. Que necesita 10 trades para diagnóstico operativo
3. Qué se desbloquea (journal, hipótesis, diagnóstico, lectura confiable, cockpit completo)
4. Progreso visible hacia activación

### API — `buildOnboardingState(input)`

```js
buildOnboardingState({
  trades,
  accounts,            // settings o array
  checklistEntries,
  emotionalJournals,
  riskSettings,        // confirmed/saved → step risk done
  userProfile,
  now
})
```

Retorna:

| Campo | Significado |
|-------|-------------|
| `isFirstRun` | `trades === 0` |
| `isActivated` | `trades >= 10` |
| `activationLevel` | `empty` \| `started` \| `building-sample` \| `diagnostic-ready` |
| `progressPct` | Progreso compuesto (muestra + steps) |
| `primaryStep` | Siguiente acción (id, title, detail, actionLabel, target) |
| `steps` | account, first-trade, sample, checklist, emotion, risk |
| `unlocks` | journal / hypotheses / diagnostic / reliable / cockpit-full |
| `counts` | trades, accounts, checklistEntries, emotionalCheckins |

Niveles por trades: 0 → empty · 1–4 → started · 5–9 → building-sample · 10+ → diagnostic-ready.

### Dónde se monta

`FirstRunPanel` en `Dashboard()` (`src/main.jsx`):

- **0 trades:** Hero → FirstRun (protagonista) → Cockpit → KPIs…
- **1–9 trades:** Hero → Cockpit → FirstRun compact → KPIs…
- **10+ trades:** sin panel protagonista (`shouldShowFirstRunPanel` = false)

Dismiss opcional (`mtc:onboarding:dismissed`) solo si `trades > 0`. Nunca se oculta con 0 trades.

### Relación con la regla del minuto

El panel responde “qué hacer ahora” antes de que existan métricas. El Cockpit (Sprint 07) sigue siendo el estado operativo del día; el onboarding es la rampa hacia muestra usable.

### Empty states tocados

- Journal (0 trades totales): copy de activación + CTA primer trade
- Analytics: “se activa con 10 trades” + unlocks
- Emotional: CTA check-in
- Checklist historial vacío: “Definí tu filtro antes de operar”

### Consumidores posteriores

| Módulo | Uso |
|--------|-----|
| Dashboard | FirstRunPanel (este sprint) |
| Analytics / Journal | Empty states alineados al umbral 10 |
| Futuro paywall / tips | Pueden leer `activationLevel` sin recalcular |

### Limitaciones

- No Firebase/Auth/Pricing/Checkout, no shell/nav, no Journal save core, no Risk calc, no broker sync, no IA.
- Persistencia dismiss = localStorage; risk step = key `mtc-risk-settings` presente.
- CSS en sección `ONBOARDING / FIRST RUN` (no EOF).

---

## Sprint 09 — Commercial Truth

Fuente única de verdad comercial: `src/lib/commercialConfig.js`.

### Planes y precios finales (USD / mes)

| Plan | Id interno | Checkout alias | Precio |
|------|------------|----------------|--------|
| Club | `basic` | `club` | **14.99** |
| Pro | `premium` | `pro` | **24.99** |
| Mentoría | `mentorship` | WhatsApp only | **250** |

Ciclos: mensual / trimestral (−20%) / anual (−10% sobre trimestral anualizado). Mentoría no usa PayPal.

### Feature availability model

Estados: `available` | `beta` | `coming-soon` | `not-included`.

**Diferenciación Club vs Pro (copy estratégico)**

> Club registra y ordena. Pro interpreta y decide.

| Plan | Rol | Incluye |
|------|-----|---------|
| **Club** | Captura / control | Journal, checklist, calendario P/L, riesgo básico, dashboard operativo, export básico |
| **Pro** | Decision Intelligence | Todo Club + Analytics/diagnóstico, Edge Lab, directivas, journal emocional/conducta, cockpit avanzado; PDF / AI Review / BrokerSync = próximamente |

**Disponible ahora**

- Club: journal manual, checklist, calendario P/L, riesgo básico, dashboard, export básico
- Pro (+ Mentoría): Analytics / Decision Intelligence, Edge Lab, directivas, journal emocional, Emotion Intelligence, cockpit avanzado
- Mentoría: revisión 1 a 1, acompañamiento, feedback (Pro incluido)

**Coming soon (no vender como activo)**

- BrokerSync / MT5 (sync automático)
- AI Review (IA conectada a datos)
- Reportes PDF

**Beta:** ninguna feature comercial marcada beta en este sprint.

### Honestidad MT5 / IA / BrokerSync

- Landing + paywall: Pro lista BrokerSync y AI Review como **próximamente**, no como incluidos activos.
- Página Integraciones: copy explícito de “próximamente”; journal/CSV manual disponibles.
- CoachIA (ruta huérfana): etiquetado como reglas locales + prompt externo; no “IA operativa”.

### Gating real vs pendiente

| Real hoy | Pendiente (Sprint 10/11) |
|----------|---------------------------|
| Binario: `isApproved` → app vs `AccessGate` | Gating Club vs Pro en frontend |
| Roles privilegiados bypass | Alinear `defaultPlanFeatures` server (Club `analytics:true`) |
| Backend `mt5Sync` solo en API MT5 (UI no llama) | Unificar PayPal orders vs subscriptions |

`GATING_TRUTH.commercialComparisonOnly = true` — la matriz de planes es comparativa comercial, no enforcement de tier.

### PayPal / checkout (histórico Sprint 09)

- Labels 14.99 / 24.99; mapping runtime cerrado en **Sprint 10** (ver abajo).

### Service worker (histórico Sprint 09)

- Deuda de bump v2 → v3 cerrada en **Sprint 10**.

### Docs alineados

- `docs/payments-architecture.md`, `RELEASE-v45-COMMERCIAL-READY.md` → precios 14.99 / 24.99
- `docs/COMMERCIAL_TRUTH_AUDIT.md` — auditoría Sprint 09 + runtime Sprint 10

---

## Sprint 10 — SW + Payment Runtime Integrity

Cierra consistencia runtime comercial: plan ids, precios, mapping legacy y cache PWA.

### Plan ids y mapping

| Marca (UI) | Id interno / Firestore | Checkout payload (orders) |
|------------|------------------------|---------------------------|
| Club | `basic` | `basic` (acepta también `club`) |
| Pro | `premium` | `premium` (acepta también `pro`) |
| Mentoría | `mentorship` | WhatsApp only |

Fuente: `CHECKOUT_PLAN_IDS` / `resolveBackendPlanId()` / `checkoutPlanId()` en `src/lib/commercialConfig.js`.

- Frontend checkout envía **backend ids** (`basic` / `premium`).
- Render `server/index.js` y `functions/index.js` normalizan `club`/`pro` → `basic`/`premium`.
- Vercel `api/createPayPalOrder.js` ya aceptaba ambos aliases (subscriptions vía env).

### Precios runtime

- Club **14.99** · Pro **24.99** · Mentoría **250**
- Fallbacks server: `PLAN_BASIC_MONTHLY` / `PLAN_PREMIUM_MONTHLY` (default 14.99/24.99)
- Suscripciones PayPal: montos reales en Dashboard + `PAYPAL_PLAN_ID_*` (verificar ≠ 29/49)

### Env PayPal esperadas

**Orders (Render / functions):** `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `APP_URL`, opcional `PLAN_BASIC_MONTHLY` / `PLAN_PREMIUM_MONTHLY`

**Subscriptions (Vercel api):** `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `APP_URL`, `PAYPAL_PLAN_ID_CLUB_{MONTHLY|QUARTERLY|ANNUAL}`, `PAYPAL_PLAN_ID_PRO_{MONTHLY|QUARTERLY|ANNUAL}`

### Service worker

| Antes | Después |
|-------|---------|
| `mtc-cache-v2-system-reading` | `mtc-cache-v3-commercial-truth` |

Activate borra cualquier cache ≠ actual (incluye v2). `skipWaiting` + `clients.claim` se mantienen. App version tag: `v45-commercial-truth-runtime`.

### Pendiente (no este sprint)

- Gating fino Club/Pro en frontend
- Unificación completa orders vs subscriptions
- Verificar montos reales en PayPal Dashboard vs 14.99/24.99

---

## Sprint 11 — Risk Settings Firestore

Persiste límites de Risk Lab por usuario y cuenta. Deja de depender solo de `localStorage` para el cockpit operativo.

### Path Firestore

```text
users/{uid}/riskSettings/{accountId}
```

Fallback de documento cuando no hay cuenta activa / vista “Todas”:

```text
users/{uid}/riskSettings/default
```

Rules: subcolección bajo `users/{userId}` — read/write si `isApproved()` y owner (o admin). Ver `firestore.rules`.

### Shape (dual-compatible)

Campos canónicos + aliases UI legacy:

| Campo | Alias UI | Notas |
|-------|----------|--------|
| `capital` | `accountCapital` | Capital base |
| `riskPct` | `riskPerTradePct` | % riesgo por trade |
| `dailyLossLimit` | `maxDailyLoss` | Hard stop diario $ |
| `weeklyLossLimit` | `maxWeeklyLoss` | Límite semanal $ |
| `maxTradesPerDay` | `maxTradesDay` | Ambos se escriben |
| `maxDrawdownPct` | — | % |
| `dailyLossLimitR` | — | default `-1` |
| `weeklyLossLimitR` | — | default `-3` |
| `accountId` / `accountName` | — | multi-account |
| `currency` | — | default `USD` |
| `source` | — | `firestore` \| `local` \| `default` |
| `createdAt` / `updatedAt` | — | `serverTimestamp()` |

Normalizador: `normalizeRiskSettings()` / `mergeRiskSettingsWithDefaults()` en `src/lib/riskSettingsStore.js`.

Defaults Risk UI: `maxTradesDay/maxTradesPerDay: 3` (UI actual). OperationalState sigue resolviendo `maxTradesDay` ↔ `maxTradesPerDay` y aplica sus propios defaults solo si el campo falta.

### Fallback localStorage

| Key | Uso |
|-----|-----|
| `mtc-risk-settings` | Legacy + cache de cuenta `default` |
| `mtc-risk-settings:{accountId}` | Cache por cuenta |

Evento: `mtc-risk-settings-updated` (CustomEvent con `detail.{accountId,source,settings}`).

Migración: en primera carga se usa local; en el primer **Guardar** con user logueado se escribe Firestore. No se borra local (queda como cache).

### Store / helpers

`src/lib/riskSettingsStore.js`:

- `getRiskSettingsDocRef`, `loadRiskSettings`, `saveRiskSettings`
- `normalizeRiskSettings`, `mergeRiskSettingsWithDefaults`
- `getLocalRiskSettings`, `saveLocalRiskSettings`, `hasLocalRiskSettings`
- `resolveRiskAccountId`, `resolveRiskAccountName`

Defensivo: sin `db` / sin `uid` / sin cuenta → no rompe; guarda local.

### Cómo alimenta Dashboard / OperationalState

1. Risk Lab guarda → Firestore + local + evento.
2. `useRiskSettings(profile, settings, active)` en Dashboard / Journal / Risk Lab recarga por cuenta y escucha el evento.
3. `buildOperationalState({ riskSettings })` recibe el objeto normalizado (ambos shapes).
4. Sin hard refresh: el evento actualiza listeners en la misma sesión. Si el Dashboard no está montado, refleja al volver a la tab.

### Multi-account

- Cuenta activa con `id` en `settings.accounts` → doc id = `account.id`.
- Solo nombre → slug o match por nombre.
- `__all__` / sin cuenta → `default`.
- Dashboard usa límites de la cuenta activa del AccountSwitcher.

### Riesgos pendientes

- Deploy de `firestore.rules` requerido para que la subcolección sea escribible en prod.
- Vista “Todas las cuentas” usa doc `default` (no agrega límites por cuenta).
- `sharePngUtils` sigue leyendo cache local (suficiente para labels de share).
- Gating fino Club/Pro y unificación PayPal siguen fuera de este sprint.

---

## Sprint 12 — Trade Form Mobile Stepped

Convierte el registro de trade en un flujo **stepped mobile-first** sin romper el pipeline de guardado existente (`persistTrade` → Firestore `trades`).

### Propósito

Cargar un trade desde mobile en &lt; 45s: guiado, claro, alimentando Analytics / Risk / Emotion / Checklist / Journal / Cockpit.

### Steps

| # | id | Label | Contenido |
|---|-----|-------|-----------|
| 1 | `result` | Resultado | cuenta, fecha, activo, resultado, P/L $, R |
| 2 | `setup` | Setup | setup, sesión, side, entry/exit/SL/TP, patrón |
| 3 | `behavior` | Conducta | plan, checklist, error, emociones, anxiety/recovery |
| 4 | `evidence` | Evidencia | nota, screenshot/link, resumen, mentor review |

Desktop: mismo stepper + grid 2 columnas. Mobile 390: un panel por paso + CTA sticky (Atrás / Siguiente / Guardar).

### Campos obligatorios (hard)

- fecha válida (`date` / `tradingDay`)
- cuenta (`account` / `accountName`)
- resultado (`result`: Profit / Stop / BE / …)
- P/L `$` **o** R (`resultMoney` / `resultR`; `%` también cuenta)

Activo vacío → fallback `"Sin activo"` (no bloquea).

### Campos opcionales

setup, session, side, entry/exit/sl/tp, pattern, confluences, quality, followedPlan, checklistComplete, mistakeType, emotionBefore/After, anxiety, confidence, clarity, recoveryImpulse, executionBehaviors, lesson/notes, capture, mentor review, revisión avanzada ICC.

### Validaciones

- **Hard** (bloquean avanzar desde Resultado / guardar): fecha, cuenta, resultado, métrica P/L|R.
- **Soft warnings** (no bloquean): sin setup, sin emoción, sin checklist, sin nota, sin screenshot.

### Guardado / edición

- Create: `addDoc(trades)` + link checklist si `createdFromChecklist`.
- Edit: `setDoc(..., { merge: true })` — no duplica; preserva campos viejos/nuevos.
- Quick path desde Checklist se mantiene (form compacto, sin stepper).
- First-run CTA: `mtc-open-new-trade` (localStorage + CustomEvent) abre el form en Journal.

### Cómo alimenta Decision Intelligence

| Campo | Destino |
|-------|---------|
| resultMoney / resultR / result / asset / session / setup | Analytics, Cockpit, Calendar, Journal |
| followedPlan / executionBehaviors / postTradeBehavior / mistakeType | Analytics disciplina, EmotionIntelligence |
| emotionBefore/After, anxiety, confidence, clarity, recoveryImpulse | EmotionIntelligence / Risk emocional |
| checklist / checklistComplete / createdFromChecklist | OperationalState, Risk snapshot |
| notes / lesson / capture | Journal, evidencia |

Aliases defensivos en payload: `planFollowed`, `stopLoss`/`takeProfit`, `rMultiple`, `accountName`, `symbol`, `notes`.

### Archivos

- `src/components/trade/TradeForm.jsx` — UI stepped
- `src/components/trade/TradeFormStepper.jsx` — stepper + footer
- `src/components/trade/tradeFormSteps.js` — steps, validación, warnings
- `src/components/trade/tradeSavePipeline.js` / `tradePayload.js` — validación mínima + aliases DI
- `src/main.jsx` — emptyForm DI fields + First-run open handler
- `src/styles.css` — sección `TRADE FORM — STEPPED CAPTURE`

### Riesgos restantes

- Teclado mobile puede empujar el sticky footer en algunos WebViews (mitigado con safe-area; no perfect).
- Trades legacy sin `followedPlanLabel` / `checklistComplete` siguen válidos; UI deriva de boolean.
- Deep-link First-run depende de que Journal monte el listener; flag `mtc-open-new-trade` cubre race de tab switch.
- Revisión avanzada ICC sigue en `<details>` — no es parte del path &lt;45s.

---

## Sprint 13 — Tags UI + Aurora Legacy Polish

Clasificación operativa de trades vía tags + polish visual acotado a chips/form/journal/detail (sin rediseño global).

### Propósito

Los tags ayudan a responder en &lt;1 min: qué setups repito, qué errores aparecen, qué contextos afectan el edge, qué conducta aparece en pérdidas. No son decorativos.

### Modelo de tags

Fuente: `src/lib/tradeTags.js`

| Grupo | id | Ejemplos |
|-------|-----|----------|
| Setup | `setup` | FVG, OB, Sweep, Breakout, Reversal, Continuation, Liquidity Grab, News, Manual |
| Conducta | `behavior` | FOMO, Revenge, Overtrade, Early/Late Entry, Moved SL, Closed Early, No Plan, Hesitation |
| Contexto | `context` | NY, London, Asia, Post News, High Impact, Range Day, Trend Day |
| Calidad | `quality` | A+, A, B, C, Validated, Experimental |

Helpers: `normalizeTradeTags`, `mergeTradeTags`, `getTagsByGroup`, `getTagMeta`, `getTradeTags`, `buildTagGroupsPayload`, `buildJournalTagFilterOptions`, `tradeHasTag`.

### Dónde se guardan

- Campo principal: `trade.tags: string[]` (ids limpios).
- Denormalizado opcional: `trade.tagGroups: { setup, behavior, context, quality }` (arrays de ids).
- Complementa — **no reemplaza** — `setup`, `mistakeType`, `session`, `quality`, `executionQuality`.
- Opcional: crear/editar sin tags no rompe; trades viejos sin tags abren OK.
- Export JSON/CSV ya incluía `tags` (`importExportUtils`); se preserva.
- Import CSV no requiere tags.

### Form / Journal / Detail

| Superficie | Comportamiento |
|------------|----------------|
| Trade Form Step 2 (Setup) | `TradeTagsPicker` — chips multi-select por grupo |
| Edit trade | Precarga `tags` vía `normalizeTradeArrayFields` |
| Journal | `JournalTagFilters` — chips presentes (+ recomendados si sparse); combina con search + checklist filter + día |
| Journal row | Hasta 4 chips de tag |
| Trade Detail | Bloque “Clasificación / Tags del trade” |

### Analytics futuro (prep only)

- `getTradeTags(trade)` listo para Edge Lab / directivas.
- `tagGroups` en payload para agregaciones futuras.
- **No** se reescribe Analytics Intelligence en este sprint.

### Polish Aurora aplicado (targeted)

- Chips activos del trade form: cyan→violet (no gold).
- `.tradeGuide` / `.resultInput` / `.fileName` scoped al form: Aurora.
- Detail chips / journal tag chips: violet/cyan/magenta por grupo.
- Dorado legacy agresivo en estas superficies reducido; gold queda brand/logo.

### Límites

- No gating / pricing / checkout / PayPal / SW / Risk Firestore / OperationalState / Emotion rules.
- No shell/nav/mobile command sheet / bottom dock.
- No Analytics engines profundos.
- No refactor CSS global ni bloque EOF.

### Archivos

- `src/lib/tradeTags.js` — modelo + helpers
- `src/components/trade/TradeTagsPicker.jsx` — picker + display
- `src/components/trade/TradeForm.jsx` / `tradePayload.js` / `TradeDetailModal.jsx`
- `src/components/journal/JournalTagFilters.jsx` / `JournalActions.jsx` / `JournalTradeRow.jsx`
- `src/main.jsx` — emptyForm `tags:[]` + filtro Journal
- `src/styles.css` — secciones `TAGS / CLASSIFICATION CHIPS` + `AURORA LEGACY POLISH — TARGETED`

### Riesgos restantes

- Filtro de tags opera sobre el día seleccionado (como search); no es un “all-time tag browser”.
- Trades con tags custom legacy (strings libres) se normalizan a slug; labels desconocidos se muestran como id.
- Quick-path Checklist no muestra picker de tags (path corto); se pueden agregar al editar.

---

## Sprint 14A — Landing Repositioning

Reposicionamiento comercial de la landing pública hacia **Decision Intelligence para traders discrecionales**. Sin tocar checkout, PayPal, Auth, Firestore rules, SW, Risk rules, OperationalState, EmotionIntelligence, pipelines de save, shell/mobile ni gating fino Club/Pro.

### Nuevo posicionamiento

> MTC Analytics es Decision Intelligence para traders discrecionales.

Frase estratégica:

> No necesitás otro dashboard lleno de números. Necesitás saber qué repetir, qué cortar y qué corregir antes de volver a tomar riesgo.

Abandona “registrá trades y mirá métricas”. Sostiene: qué edge funciona, qué fuga drena, qué conducta afecta, qué acción operativa tomar, y por qué Pro es un salto de categoría.

### Estructura de landing

1. Hero — Decision Intelligence  
2. Diagnóstico en un minuto (edge / fuga / acción / estado)  
3. Cockpit operativo (demo cards Aurora)  
4. Edge / Fuga / Directiva  
5. Journal + Checklist + Tags  
6. Emotion Intelligence  
7. Risk Lab  
8. Club vs Pro vs Mentoría  
9. Disponible / Próximamente  
10. CTA final  

Fuente UI: `PublicLanding` en `src/main.jsx`. Copy de planes: `src/lib/commercialConfig.js`. Estilos: sección `LANDING — DECISION INTELLIGENCE` en `src/styles.css`.

### Club vs Pro messaging

| Plan | Headline | Rol |
|------|----------|-----|
| **Club** | Ordená tu operativa. | Rutina: journal, checklist, calendario P/L, dashboard, riesgo básico |
| **Pro** | Interpretá tu operativa. | Decision Intelligence: Analytics, Edge Lab, directivas, Emotion Intelligence, Cockpit avanzado |
| **Mentoría** | Acompañamiento humano. | Pro + revisión 1:1, seguimiento, feedback |

Frase: **Club te ayuda a construir evidencia. Pro te ayuda a interpretarla.**

### Disponible vs Próximamente

**Disponible:** Journal, Checklist, Calendario P/L, Risk Lab, Dashboard/Cockpit, Emotion Intelligence, Tags, Export CSV/JSON.

**Próximamente (no vender como activo):** BrokerSync / MT5 Sync, AI Review, Reportes PDF.

### Gating

- **No implementado en este sprint.**  
- Sigue `GATING_TRUTH.commercialComparisonOnly = true`.  
- Nota en landing: planes = comparativa comercial; acceso real = membresía aprobada.

### Demo cards

Reemplazadas demos/video legacy por mock Aurora representativos (estado Precaución, edge FVG NY, fuga Early Entry, acción semanal, señal emocional, riesgo 1/3). Sin claims de IA, MT5 sync ni predicción.

### Pendientes Sprint 14B

- ~~Paywall / Upgrade Experience + Club vs Pro clarity~~ → **hecho en Sprint 14B**
- Screenshots reales del producto (si se prioriza)
- Enforcement funcional de `PLAN_CAPABILITIES` (si se decide)
- Unificación PayPal orders vs subscriptions (deuda Sprint 10)
- Alinear `defaultPlanFeatures` server (Club `analytics:true`) con marketing
- Posible extracción de `PublicLanding` / `AccessGate` a componentes dedicados

---

## Sprint 14B — Paywall / Upgrade Experience

Fecha: 2026-07-10  
Alcance: paywall AccessGate, copy Club/Pro/Mentoría, comparativa corta, `PLAN_CAPABILITIES` preparado, CSS Aurora scoped, docs. **Sin** checkout / PayPal / Auth / rules / SW / pipelines / shell.

### Posicionamiento

> Club registra y ordena. Pro interpreta y decide. Mentoría acompaña y corrige.

Header paywall:

> Elegí tu nivel de inteligencia operativa.

Subtitle:

> Club te ayuda a construir evidencia. Pro convierte esa evidencia en decisiones.

### Club vs Pro vs Mentoría

| Plan | Headline | Best for | CTA |
|------|----------|----------|-----|
| **Club** | Ordená tu operativa. | Registrar, validar y ordenar el proceso diario | Empezar con Club |
| **Pro** | Interpretá tu operativa. | Convertir datos en decisiones (edge, fuga, directivas) | Desbloquear Pro |
| **Mentoría** | Acompañamiento humano. | Pro + revisión 1:1, seguimiento, feedback | Hablar por WhatsApp |

### PLAN_CAPABILITIES

Definido en `src/lib/commercialConfig.js` (club / pro / mentorship).  
**No enforced** en UI en este sprint. Contrato preparado para gating fino posterior.

### Commercial Truth

**Disponible:** Journal, Checklist, Calendario P/L, Risk Lab, Dashboard/Cockpit, Emotion Intelligence (captura Club / insights Pro), Tags, Export CSV/JSON.

**Próximamente (badge):** BrokerSync/MT5, AI Review, Reportes PDF.

### Qué cambió en UX

- AccessGate hero + plan cards alineados a Decision Intelligence (no “Founding Members”).
- Comparativa corta (6 filas) Club / Pro / Mentoría.
- Badges Disponible / Próximamente desde `FEATURE_STATUS_LABEL`.
- `UPGRADE_SURFACE_COPY` listo para superficies Pro (analytics / emotion / risk).
- CSS sección `PAYWALL — UPGRADE EXPERIENCE` (Aurora glass, Pro destacado cyan/violet).

### Qué NO se tocó de checkout

- `startCheckout` payload / endpoints / PayPal provider
- Plan IDs runtime (`basic` / `premium` / mentorship WhatsApp)
- `functions/`, `server/`, env PayPal, Service Worker

### Gating enforcement pendiente

- Sigue `GATING_TRUTH.commercialComparisonOnly = true`
- `capabilitiesPrepared: true` — enforcement funcional = sprint posterior

---

## Sprint 15 — Commercial Experience Rebuild

Fecha: 2026-07-10  
Alcance: rework profundo de las 3 superficies comerciales (Landing, Login/Auth, Paywall/Activation) hacia **Aurora Institutional SaaS**. **Sin** tocar checkout, PayPal, Auth internals, Firestore rules, SW, pipelines de save, engines internos, dashboard interno ni shell/mobile.

### Superficies

| Superficie | Componente (`src/main.jsx`) | Clase raíz |
|-----------|------------------------------|-----------|
| Landing | `PublicLanding` + `LandingDemoCockpit` | `.diLanding.commercialShell` |
| Login/Auth | `Login` | `.authExperience` |
| Paywall/Activation | `AccessGate` | `.activationPaywall` |

### Landing (narrativa)

Hero → Problema (journal común vs MTC) → Sistema MTC (Trade→Checklist→Riesgo→Emoción→Tags→Diagnóstico→Acción) → Diagnóstico → Cockpit → Edge → Journal → Emoción → Risk → Módulos (grid) → Planes → Roadmap honesto → CTA final.

- Nav unificada: **Plataforma / Inteligencia / Planes**.
- Header sticky con `backdrop-filter` + `scroll-margin-top:96px` para no tapar títulos.
- Hero CTAs: **Crear cuenta** / **Ver plataforma**.
- Demo cockpit = Aurora card (sin screenshot viejo).

### Login (dos paneles)

- Left `.authValue`: eyebrow "Acceso a workspace", título, proof cards (Risk Lab / Journal / Cockpit / Emotion).
- Right `.authCard`: Google + email/pass, tabs `.authTabs` (cyan→violet, **sin dorado**), CTA gradiente cyan→violet.
- Errores: copy amable ("No pudimos iniciar sesión…").
- Mobile: card primero, valor debajo, sin overflow.

### Paywall / Activation

- Eyebrow "Activación de workspace", título "Elegí cómo querés usar MTC Analytics."
- Badge de estado: Activación pendiente / Elegí tu plan / Acceso en revisión.
- **Video eliminado** → Aurora demo card estática (sin caja negra).
- Features por plan divididas en **Incluye** / **Próximamente** (sin badge "Disponible" repetido).
- Comparativa compacta + disclaimer roadmap.
- Checkout `startCheckout` intacto; Mentoría → WhatsApp; CTA "Hablar por Mentoría".

### Legacy eliminado de la superficie activa

- "Acceso Founding Members", "Founding Access", "Tarifas de acceso founding".
- Video `mtc-paywall-demo-premium.mp4` (caja negra) fuera del paywall.
- Tabs `.seg` doradas del login → `.authTabs` Aurora.
- Dorado legacy dominante reemplazado por violet/cyan en las 3 superficies.

### CSS

Secciones nuevas scoped en `src/styles.css`: `COMMERCIAL EXPERIENCE — SHARED`, `COMMERCIAL LANDING — PREMIUM REBUILD`, `AUTH EXPERIENCE — PREMIUM LOGIN`, `ACTIVATION PAYWALL — PREMIUM REBUILD`. Prefijos `.commercialHeader`, `.authExperience`, `.activationPaywall`, `.paywallAurora*`, `.diSystem*`, `.diModule*`.

### Qué no se tocó

- PayPal provider / endpoints / plan IDs (`basic`/`premium`/mentorship)
- Firebase Auth internals, Firestore rules, Service Worker
- Save pipelines, engines, dashboard interno, shell/mobile