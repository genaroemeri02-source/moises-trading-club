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

---

## Hotfix — Club vs Pro copy clarity (post Sprint 12)

**Frase estratégica:** Club registra y ordena. Pro interpreta y decide.

| Plan | Posicionamiento | Copy clave |
|------|-----------------|------------|
| Club | Captura / control | Journal, checklist y riesgo para construir tu rutina diaria. |
| Pro | Decision Intelligence | Diagnóstico de edge, fugas y conducta sobre tu historial. |

- Eliminado “límites visibles” (se leía como membresía limitada).
- AI / BrokerSync / PDF en Pro = **próximamente**, no activos.
- Fuente: `src/lib/commercialConfig.js` (`COMMERCIAL_PLANS` + feature rows).

---

## Sprint 14A — Landing Repositioning

Fecha: 2026-07-10  
Alcance: landing pública, hero, secciones de producto, demo cards, copy Club/Pro/Mentoría, CSS scoped. **Sin** checkout / PayPal / Auth / rules / SW / gating fino.

### Veredicto

La landing ya **no** vende demos viejas ni journal genérico. Comunica Decision Intelligence: edge, fuga, directiva, estado operativo y cockpit.

### Commercial truth en landing

| Item | Estado en landing |
|------|-------------------|
| AI Review | Badge **Próximamente** (+ fila Pro) |
| BrokerSync / MT5 Sync | Badge **Próximamente** (+ fila Pro) |
| Reportes PDF | Badge **Próximamente** (+ fila Pro) |
| “límites visibles” | No usado; Risk Lab habla de límites **configurables** / control de exposición |
| Club | Ordená tu operativa |
| Pro | Interpretá tu operativa |
| Mentoría | Acompañamiento humano |

### Copy estratégico actualizado

> Club te ayuda a construir evidencia. Pro te ayuda a interpretarla.

### Qué no cambió

- Precios 14.99 / 24.99 / 250  
- Mapping club↔basic / pro↔premium  
- Gating binario AccessGate (sin gate Club/Pro en UI)  
- Feature rows coming-soon para AI / BrokerSync / PDF

---

## Sprint 14B — Paywall / Upgrade Experience

Fecha: 2026-07-10  
Alcance: AccessGate paywall UX/copy, `PLAN_CAPABILITIES`, comparativa, badges, CSS Aurora. **Checkout runtime intacto.**

### Veredicto

El paywall ya no vende “Founding Members” ni features genéricas. Comunica niveles de inteligencia operativa: Club (evidencia), Pro (decisiones), Mentoría (humano).

### Commercial truth en paywall

| Item | Estado |
|------|--------|
| AI Review | Badge **Próximamente** |
| BrokerSync / MT5 | Badge **Próximamente** |
| Reportes PDF | Badge **Próximamente** |
| Club / Pro | Diferenciados (registra vs interpreta) |
| Mentoría | WhatsApp / contacto (no PayPal) |
| Checkout | Intact: `basic`/`premium` + WhatsApp mentorship |

### PLAN_CAPABILITIES

Preparado en `commercialConfig.js`. Enforcement funcional **no** activado.

### Copy estratégico

> Club registra y ordena. Pro interpreta y decide.

> Club te ayuda a construir evidencia. Pro convierte esa evidencia en decisiones.

### Qué no cambió

- PayPal provider / create order / capture  
- Plan IDs de checkout  
- Auth, Firestore rules, SW  
- Gating binario (approved vs paywall)

---

## Sprint 15 — Commercial Experience Rebuild

Fecha: 2026-07-10  
Alcance: Landing + Login + Paywall/Activation rework (Aurora Institutional SaaS). **Checkout intacto.**

### Veredicto

Las 3 superficies comerciales quedan alineadas: Decision Intelligence, sin founding legacy, sin video roto, con Club/Pro/Mentoría claros.

### Commercial truth

| Item | Estado |
|------|--------|
| AI Review | **Próximamente** (Pro) |
| BrokerSync / MT5 | **Próximamente** (Pro) |
| PDF avanzado | **Próximamente** (Pro) |
| Video demo paywall | **Eliminado** → Aurora demo card estática |
| "Founding Members/Access" | **Eliminado** de landing/login/paywall |
| Login dorado legacy | Reemplazado por Aurora (cyan/violet) |
| Checkout | Intact: `basic`/`premium` + Mentoría WhatsApp |

### Prohibiciones respetadas

- No se vende AI Review / BrokerSync / MT5 como activo.
- No hay video demo roto / caja negra.
- No se promete automatización ni "IA operativa" activa.
- No se usa "founding" en superficie visible.

### Qué no cambió

- PayPal provider, endpoints, plan IDs
- Auth internals, Firestore rules, SW
- Pipelines de save, engines, dashboard interno

---

## Sprint 15 — Hotfix (Aurora demo polish + login español)

Fecha: 2026-07-10  
Alcance: demos comerciales, copy login, profundidad Aurora. **Checkout/auth intactos.**

- **Demo landing/paywall**: mini-UI "Lectura operativa" (síntesis + edge/fuga + disciplina + directiva). Vende Decision Intelligence, no una caja de datos.
- **Login 100% español**: Laboratorio de riesgo / Registro operativo / Centro de control / Lectura emocional; microcopys sin inglés ("espacio operativo", "espacio de trabajo").
- **Aurora total**: background/glow/grid/paneles unificados en landing, login y paywall; sin negro plano ni fallback legacy.
- Sin claims de IA/MT5 activos; roadmap sigue honesto.