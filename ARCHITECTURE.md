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
