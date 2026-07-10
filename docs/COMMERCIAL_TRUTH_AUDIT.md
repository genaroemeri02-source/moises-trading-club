# Commercial Truth Audit — Sprint 09 + Runtime Integrity Sprint 10

Fecha: 2026-07-09  
Alcance: pricing, planes, paywall, copy comercial, disponibilidad real de features, plan mapping, SW cache.

## Inconsistencias encontradas (Sprint 09)

| # | Hallazgo | Severidad | Acción |
|---|----------|-----------|--------|
| 1 | Docs/RELEASE/functions con precios **29/49**; código vivo **14.99/24.99** | P0 | Alineado UI + docs a 14.99/24.99 |
| 2 | Pro vendía **MT5 Sync** y **Análisis IA operativo** | P0 | Copy → próximamente |
| 3 | Sin `commercialConfig` — precios duplicados | P0 | Creado `src/lib/commercialConfig.js` |
| 4 | Gating Club vs Pro inexistente en frontend | P0 | Documentado; comparativa comercial only |
| 5 | Checkout: frontend `club`/`pro` vs Render `basic`/`premium` | P0 | **Cerrado Sprint 10** — mapping + normalize |
| 6 | Dos flujos PayPal (subscriptions Vercel vs orders Render) | P0 | Documentado; unificación pendiente |
| 7 | Backend Club `analytics: true` vs marketing Pro | P1 | Documentado |
| 8 | SW cache v2 puede servir bundles viejos | P1 | **Cerrado Sprint 10** — v3 bump |
| 9 | Mentoría hardcodeada USD 250 en paywall | P2 | Desde `PLAN_PRICING.mentorship` |
| 10 | CoachIA se presentaba como “IA-lite” | P1 | Copy honesto: reglas locales |

## Sprint 10 — Runtime Integrity

### Correcciones

1. **`CHECKOUT_PLAN_IDS` / `resolveBackendPlanId` / `checkoutPlanId`** — frontend envía `basic`/`premium` al checkout.
2. **Validación defensiva** en AccessGate: plan desconocido no crea order.
3. **`server/index.js` + `functions/index.js`** — `resolveCheckoutPlanId(club|pro|basic|premium)`; precios 14.99/24.99.
4. **`api/createPayPalOrder.js`** — comentario de warning si Dashboard aún tiene 29/49.
5. **SW** `mtc-cache-v2-system-reading` → `mtc-cache-v3-commercial-truth` (limpia caches viejos en activate).

### Precios finales (runtime)

- Club: **USD 14.99**/mes  
- Pro: **USD 24.99**/mes  
- Mentoría: **USD 250**/mes (WhatsApp)

### Mapping

```
club ↔ basic
pro  ↔ premium
mentorship ↔ mentorship
```

### Qué no se tocó

- Dashboard Cockpit, Journal save, Analytics engines, Risk calc / Firestore
- Firebase/Auth internals, shell/nav/mobile
- Credenciales PayPal / rewrite completo de provider
- Gating fino Club/Pro

### Riesgos restantes

1. PayPal Dashboard plan IDs pueden seguir cobrando 29/49 → verificar `PAYPAL_PLAN_ID_*`.
2. Dos flujos PayPal (orders vs subscriptions) siguen coexistiendo.
3. Usuarios Club siguen viendo Analytics (sin gate) — marketing Pro aspiracional.
4. Nested folder `moises-trading-club-v45-commercial-ready/` es duplicado legacy (29/49) — no es la app activa.
5. Risk → Firestore = Sprint 11.

### Gating truth

- **Real:** acceso aprobado vs paywall.  
- **No real:** features “incluidas en Pro” bloqueadas a Club.  
- Gating fino → deuda posterior (no Sprint 10).
