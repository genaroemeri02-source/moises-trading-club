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