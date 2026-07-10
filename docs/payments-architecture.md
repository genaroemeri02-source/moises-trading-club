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

> Sprint 09: la UI y el paywall consumen esta fuente. Docs legacy que citaban 29/49 están obsoletos.

La función `calculatePlanPrice(planId, cycle)` calcula:

- Mensual: precio mensual base.
- Trimestral: `monthly * 3 * 0.8` = 20% de descuento.
- Anual: `(monthly * 3 * 0.8 * 4) * 0.9` = 10% adicional sobre el total trimestral anualizado.

Mentoría queda como precio personalizado y abre WhatsApp con el mensaje exacto requerido.

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
