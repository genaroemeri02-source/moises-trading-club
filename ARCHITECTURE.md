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
| `importExportUtils.js` | Export/import JSON y CSV de trades |
| `sharePngUtils.js` | Render canvas 9:16, normalización para share, descarga/compartir PNG |

## `src/components/dashboard/` — Centro de control

Componentes del tab Dashboard. Datos y cálculos pesados vienen de `main.jsx` + `lib/`.

| Archivo | Rol |
|---------|-----|
| `DashboardHero.jsx` | Cabecera operativa |
| `DashboardKpiStrip.jsx` + `DashboardKpiCard.jsx` | KPIs ejecutivos |
| `TradingCalendarPanel.jsx` | Calendario mensual / heatmap preview |
| `DashboardRightRail.jsx` | Próxima acción, disciplina, riesgo, equity |
| `DashboardAdvancedInsights.jsx` | Score, curva P/L, heatmap sesiones |
| `MtcScoreCard.jsx`, `PnlCumulativeChartCard.jsx`, `OperationalHeatmap.jsx` | Bloques de insights |
| `MtcLightweightLineChart.jsx` | Gráficos lightweight-charts |
| `ResetTicker.jsx` | Countdown rollover NY |
| `dashboardUtils.js` | Curva diaria, heatmap operativo, utilidades locales |

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
| **Dashboard** | Badge / rail de estado operativo (apto / precaución / bloqueado) |
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

Reglas adicionales (sin romper input legacy):

| Señal | Efecto |
|-------|--------|
| `shouldBlockTrading === true` | `blocked` |
| `postLossProtocolRequired === true` | `blocked` |
| `emotionalRisk === "high"` | `blocked` |
| `anxiety >= 7` + `recentLoss` | `blocked` |
| `recoveryImpulse` alto + `recentLoss` | `blocked` |
| `shouldReduceRisk === true` | `caution` |
| `clarity <= 4` | `caution` |

Sin emoción → comportamiento idéntico a Sprint 05 (`emotionalRisk: "unknown"`).

### Consumidores posteriores

| Módulo | Uso previsto |
|--------|----------------|
| **OperationalState** | Gate apto / precaución / bloqueado enriquecido |
| **Dashboard Cockpit** | Badge + patrón emocional dominante (sin rediseño en este sprint) |
| **Analytics Intelligence** | performanceByEmotion + directivas |
| **Risk Lab** | shouldReduceRisk / shouldBlockTrading |
| **Journal Emocional** | primaryPattern + progreso de muestra |

### Limitaciones

- No es diagnóstico clínico ni terapéutico.
- Solo señales operativas de mesa de riesgo/performance.
- Sprint 06 **no** integra UI/CSS/Firebase: capa pura + contrato + wire mínimo a OperationalState.