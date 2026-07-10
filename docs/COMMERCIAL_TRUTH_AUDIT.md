# Commercial Truth Audit — Sprint 09

Fecha: 2026-07-09  
Alcance: pricing, planes, paywall, copy comercial, disponibilidad real de features.

## Inconsistencias encontradas

| # | Hallazgo | Severidad | Acción Sprint 09 |
|---|----------|-----------|------------------|
| 1 | Docs/RELEASE/functions con precios **29/49**; código vivo **14.99/24.99** | P0 | Alineado UI + docs a 14.99/24.99; `functions/index.js` legacy documentado |
| 2 | Pro vendía **MT5 Sync** y **Análisis IA operativo** | P0 | Copy → próximamente |
| 3 | Sin `commercialConfig` — precios duplicados en landing/paywall/main | P0 | Creado `src/lib/commercialConfig.js` |
| 4 | Gating Club vs Pro inexistente en frontend | P0 | Documentado; comparativa comercial only |
| 5 | Checkout: frontend `club`/`pro` vs Render `basic`/`premium` | P0 | No tocado provider; deuda documentada |
| 6 | Dos flujos PayPal (subscriptions Vercel vs orders Render) | P0 | No tocado; deuda documentada |
| 7 | Backend Club `analytics: true` vs marketing Pro | P1 | Documentado |
| 8 | SW cache v2 puede servir bundles viejos | P1 | No bump; deuda Sprint 10 |
| 9 | Mentoría hardcodeada USD 250 en paywall | P2 | Ahora desde `PLAN_PRICING.mentorship` |
| 10 | CoachIA se presentaba como “IA-lite” | P1 | Copy honesto: reglas locales |

## Correcciones aplicadas

1. **SSOT** `src/lib/commercialConfig.js` — planes, precios, features, status, helpers de checkout/precio.
2. **Landing + AccessGate** consumen `COMMERCIAL_PLANS` / `ACCESS_PLANS` con badges Disponible / Próximamente.
3. **BrokerSync** page: copy “próximamente”; sin promesa de conexión activa.
4. **CoachIA**: no se vende como IA de datos.
5. **Docs**: ARCHITECTURE Sprint 09, payments-architecture, RELEASE precios.
6. **CSS** scoped: status badges cyan/violet/muted; CTA cyan→violet en pricing/paywall.

## Precios finales

- Club: **USD 14.99**/mes  
- Pro: **USD 24.99**/mes  
- Mentoría: **USD 250**/mes (WhatsApp)

## Qué no se tocó (a propósito)

- Firebase/Auth internals  
- Checkout provider / capture / webhook  
- PayPal plan ID env mapping (solo labels)  
- Journal save, Dashboard cockpit, Analytics engines, Risk calc  
- Shell/nav/mobile  
- `public/sw.js` (solo auditoría)

## Riesgos pendientes

1. Si PayPal Dashboard aún tiene planes a 29/49, el usuario ve 14.99 y paga otro monto → verificar env `PAYPAL_PLAN_ID_*`.
2. Deploy contra Render orders sin alias `club`→`basic` puede 400 `invalid_plan`.
3. Usuarios Club siguen viendo Analytics (sin gate) — marketing Pro es aspiracional hasta Sprint 10/11.
4. SW v2 puede cachear HTML/JS viejo offline.
5. Nested folder `moises-trading-club-v45-commercial-ready/` es duplicado legacy — no es la app activa.
6. `functions/index.js` aún puede decir 29/49 si se usa ese path.

## Gating truth

- **Real:** acceso aprobado vs paywall.  
- **No real:** features “incluidas en Pro” bloqueadas a Club.  
- **Preferencia Sprint 09:** no romper acceso; alinear copy; gating fino → Sprint 10/11.
