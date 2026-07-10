# Arquitectura de pagos y membresías — Moisés Trading Club

Esta versión deja el frontend preparado para un paywall premium, pricing real por ciclos, membresías con duración y checkout externo seguro. No se exponen secretos en React.

## Flujo de acceso

1. Usuario crea cuenta o inicia sesión.
2. Si no tiene acceso activo, ve `AccessGate` con planes, preview visual y selector mensual/trimestral/anual.
3. Si `VITE_PAYMENTS_ENABLED=false`, Esencial/Pro muestran placeholder limpio: “Pago online próximamente. Contactá al admin para activar tu acceso.”
4. Si `VITE_PAYMENTS_ENABLED=true`, el frontend llama a `VITE_CHECKOUT_ENDPOINT` con:
   - `planId`
   - `billingCycle`
   - `provider`
   - `amount`
   - `currency`
   - `durationDays`
   - `successUrl`
   - `cancelUrl`
5. El backend crea checkout/order/preference en PayPal, Mercado Pago o Stripe.
6. El proveedor confirma por webhook o capture.
7. Backend con Admin SDK actualiza `users/{uid}` y crea `payments/{paymentId}`.
8. El listener de usuario recibe el nuevo estado y el usuario entra automáticamente al Dashboard.

## Pricing centralizado

Los precios base viven en `src/lib/commercialConfig.js` (`PLAN_PRICING` / `COMMERCIAL_PLANS`):

```js
const PLAN_PRICING = {
  basic: { monthly: 14.99, currency: 'USD' },
  premium: { monthly: 24.99, currency: 'USD' },
  mentorship: { monthly: 250, currency: 'USD' }
};
```

> Sprint 09/10: la UI y el paywall consumen esta fuente. Docs legacy que citaban 29/49 son históricos — no runtime.

La función `calculatePlanPrice(planId, cycle)` calcula:

- Mensual: precio mensual base.
- Trimestral: `monthly * 3 * 0.8` = 20% de descuento.
- Anual: `(monthly * 3 * 0.8 * 4) * 0.9` = 10% adicional sobre el total trimestral anualizado.

Mentoría queda como precio personalizado y abre WhatsApp con el mensaje exacto requerido.

## Plan id mapping (Sprint 10)

| UI / marca | Id interno | Checkout orders (Render/functions) | Subscriptions (Vercel) |
|------------|------------|------------------------------------|------------------------|
| Club | `basic` | `basic` (alias `club`) | `club` / `basic` → env `PAYPAL_PLAN_ID_CLUB_*` |
| Pro | `premium` | `premium` (alias `pro`) | `pro` / `premium` → env `PAYPAL_PLAN_ID_PRO_*` |
| Mentoría | `mentorship` | no PayPal | WhatsApp |

- Frontend: `checkoutPlanId()` / `CHECKOUT_PLAN_IDS` envían **`basic` / `premium`**.
- Backend orders: `resolveCheckoutPlanId()` acepta brand + legacy.
- Plan desconocido → `400 invalid_plan` (no order silenciosa).
- **WARNING:** si los plan IDs de PayPal Dashboard aún cobran 29/49, actualizar env / planes en PayPal. No hardcodear credenciales.

### Env vars esperadas

**Render / Cloud Functions (orders + capture):**

- `PAYPAL_ENV` (`sandbox` | `live`)
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- `APP_URL`
- Opcional: `PLAN_BASIC_MONTHLY`, `PLAN_PREMIUM_MONTHLY` (fallback 14.99 / 24.99)

**Vercel `api/createPayPalOrder.js` (subscriptions):**

- `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `APP_URL`
- `PAYPAL_PLAN_ID_CLUB_MONTHLY` / `_QUARTERLY` / `_ANNUAL`
- `PAYPAL_PLAN_ID_PRO_MONTHLY` / `_QUARTERLY` / `_ANNUAL`

**Frontend:**

- `VITE_PAYMENTS_ENABLED`, `VITE_PAYMENT_PROVIDER`
- `VITE_CREATE_PAYPAL_ORDER_URL` o `VITE_CHECKOUT_ENDPOINT`
- `VITE_PAYPAL_CAPTURE_ORDER_ENDPOINT`
- `VITE_PAYMENT_SUCCESS_URL`, `VITE_PAYMENT_CANCEL_URL`

### Service worker / cache

- Versión: `mtc-cache-v3-commercial-truth` (antes `mtc-cache-v2-system-reading`)
- Activate limpia caches viejos; network-first + offline fallback
- Tag runtime: `v45-commercial-truth-runtime`

### Deuda restante

- Unificar flujo orders (Render) vs subscriptions (Vercel)
- Gating fino Club/Pro
- Confirmar montos reales en PayPal Dashboard = 14.99 / 24.99

## Campos protegidos en `users/{uid}`

- `accessStatus`
- `subscriptionStatus`
- `accessSource`
- `plan`
- `billingCycle`
- `paymentProvider`
- `customerId`
- `subscriptionId`
- `startedAt`
- `currentPeriodStart`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `lastPaymentAt`
- `expiredAt`
- `approved`
- `status`
- `role`

El usuario no puede editar estos campos desde frontend. Solo admin o backend autorizado mediante Admin SDK.

## Estados de membresía

`billingCycle`:

- `monthly`
- `quarterly`
- `yearly` o `annual` según backend; el frontend envía `annual`.

`subscriptionStatus`:

- `none`
- `pending`
- `active`
- `past_due`
- `canceled`
- `expired`

`accessStatus`:

- `active`
- `inactive`
- `pending_payment`
- `manual_approved`
- `blocked`

## Activación automática

Cuando el pago se confirma por webhook/capture, el backend debe actualizar:

```js
{
  accessStatus: 'active',
  subscriptionStatus: 'active',
  accessSource: 'payment',
  plan,
  billingCycle,
  paymentProvider,
  customerId,
  subscriptionId,
  startedAt,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd: false,
  lastPaymentAt
}
```

También debe crear un documento en `payments/{paymentId}` con:

```js
{
  uid,
  email,
  provider,
  plan,
  billingCycle,
  amount,
  currency,
  status,
  providerPaymentId,
  createdAt,
  updatedAt
}
```

## Expiración / cancelación automática

Implementar idealmente ambas capas:

1. Cloud Function programada diaria/horaria que busque usuarios con `currentPeriodEnd < now`, `subscriptionStatus == active` y `cancelAtPeriodEnd == true` o sin renovación confirmada. Debe setear:
   - `subscriptionStatus: 'expired'`
   - `accessStatus: 'inactive'`
   - `expiredAt: now`
2. Chequeo defensivo en login/frontend: si detecta `currentPeriodEnd` vencido en una membresía de pago, bloquea acceso y sanea estado.

## Funciones sugeridas

- `createCheckoutSession`
- `createPayPalOrder`
- `capturePayPalOrder`
- `createMercadoPagoPreference`
- `paymentWebhook`
- `activateMembership`
- `updateMembershipStatus`
- `expireMembershipsScheduled`

## Regla de acceso

Tiene acceso si:

- `role === "admin"`
- `role === "moderador"`
- `accessStatus === "manual_approved"`
- `accessStatus === "active"` y `currentPeriodEnd` no venció
- `subscriptionStatus === "active"` y `currentPeriodEnd` no venció
- compatibilidad legacy: `approved === true` o `status === "approved"`, salvo membresía de pago vencida

## No hacer

- No guardar tarjetas en Firestore.
- No poner secretos de Mercado Pago, PayPal o Stripe en `.env` de Vite.
- No activar acceso solo porque el usuario volvió del checkout.
- No confiar en query params del navegador para aprobar pagos.
- No permitir que el usuario edite sus propios campos de acceso/pago.


## Redirección después del checkout

La app incluye rutas preparadas para el retorno de las pasarelas:

- `/payment-success`
- `/payment/approved`
- `/checkout/success`
- `/payment-cancel`
- `/payment-failed`
- `/checkout/cancel`

La URL recomendada para `success_url` es:

```txt
https://www.moisestradingclub.com/payment-success?session_id={CHECKOUT_SESSION_ID}
```

La página `PaymentSuccessPage` puede leer parámetros como `session_id`, `payment_id`, `provider`, `status`, `preference_id`, `token`, `PayerID` y `orderId`.

Importante: esta página no activa acceso por sí sola. Solo consulta el documento `users/{uid}` y muestra éxito si el backend/webhook ya actualizó `accessStatus` o `subscriptionStatus` a `active`. La activación real debe hacerla Cloud Functions/Admin SDK después de confirmar el pago con PayPal, Mercado Pago o Stripe.

## Hotfix de seguridad v43.1

`docs/firestore.rules` ahora contiene `userCreateIsSafe(userId)` para evitar que un usuario autenticado cree `users/{uid}` con `role: admin`, `approved: true`, `accessStatus: active`, `subscriptionStatus: active`, `plan: premium` o fechas de membresía futuras desde el cliente.

El payload inicial seguro para registro normal queda en estado `pending_payment`, `subscriptionStatus: none`, `accessSource: self_signup` y `plan: free`.
